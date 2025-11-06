import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Activity, ExternalLink } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

interface Match {
  id: number;
  title: string | null;
  body: string | null;
  url: string | null;
  subreddit: string | null;
  created_at_utc: string;
}

interface ChartData {
  date: string;
  matches: number;
}

const Dashboard = () => {
  const { toast } = useToast();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [topSubreddits, setTopSubreddits] = useState<{ subreddit: string; count: number }[]>([]);
  const [activityStatus, setActivityStatus] = useState<string>("Calculating...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch matches from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: matches, error } = await supabase
      .from("matches")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("created_at_utc", thirtyDaysAgo.toISOString())
      .order("created_at_utc", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Process data for chart (last 30 days)
    const dailyMatches = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMatches.set(dateStr, 0);
    }

    matches?.forEach(match => {
      const dateStr = new Date(match.created_at_utc).toISOString().split('T')[0];
      dailyMatches.set(dateStr, (dailyMatches.get(dateStr) || 0) + 1);
    });

    const chartArray = Array.from(dailyMatches, ([date, matches]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      matches
    }));

    setChartData(chartArray);
    setTopMatches(matches?.slice(0, 5) || []);

    // Calculate top 3 subreddits
    const subredditCounts = new Map<string, number>();
    matches?.forEach(match => {
      if (match.subreddit) {
        subredditCounts.set(match.subreddit, (subredditCounts.get(match.subreddit) || 0) + 1);
      }
    });
    const sortedSubreddits = Array.from(subredditCounts, ([subreddit, count]) => ({ subreddit, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    setTopSubreddits(sortedSubreddits);

    // Calculate activity status based on recent trends
    const last24h = matches?.filter(m => {
      const matchDate = new Date(m.created_at_utc);
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      return matchDate > oneDayAgo;
    }).length || 0;

    const previous24h = matches?.filter(m => {
      const matchDate = new Date(m.created_at_utc);
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      return matchDate > twoDaysAgo && matchDate <= oneDayAgo;
    }).length || 0;

    let status = "Warm";
    let statusColor = "text-yellow-500";

    if (last24h === 0) {
      status = "Dead";
      statusColor = "text-gray-500";
    } else if (last24h >= 10) {
      status = "Hot";
      statusColor = "text-red-500";
    } else if (last24h > previous24h) {
      status = "Warming";
      statusColor = "text-orange-500";
    } else if (last24h < previous24h && last24h > 3) {
      status = "Cool";
      statusColor = "text-blue-400";
    } else if (last24h < previous24h) {
      status = "Cold";
      statusColor = "text-blue-600";
    }

    setActivityStatus(status);
    setLoading(false);
  };

  const getStatusIcon = () => {
    switch (activityStatus) {
      case "Hot":
      case "Warming":
        return <TrendingUp className="w-8 h-8 text-red-500" />;
      case "Cold":
      case "Cool":
        return <TrendingDown className="w-8 h-8 text-blue-500" />;
      default:
        return <Activity className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your keyword monitoring activity
        </p>
      </div>

      {loading ? (
        <Card className="glass-card p-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Activity Status */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {getStatusIcon()}
                Activity Status
              </CardTitle>
              <CardDescription>Current keyword matching activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">
                {activityStatus}
              </div>
              <p className="text-muted-foreground">
                Based on matches in the last 24 hours vs previous 24 hours
              </p>
            </CardContent>
          </Card>

          {/* 30-Day Match Trend */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Last 30 Days</CardTitle>
              <CardDescription>Keyword matches over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="matches" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorMatches)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top 3 Subreddits */}
          {topSubreddits.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Top 3 Subreddits</CardTitle>
                <CardDescription>Most active subreddits for your keywords</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topSubreddits.map((item, index) => (
                    <div key={item.subreddit} className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium">r/{item.subreddit}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {item.count} matches
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Recent Matches */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Top 5 Recent Matches</CardTitle>
              <CardDescription>Most recent keyword matches</CardDescription>
            </CardHeader>
            <CardContent>
              {topMatches.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No matches yet. Your keywords are being monitored!
                </div>
              ) : (
                <div className="space-y-4">
                  {topMatches.map((match) => (
                    <div 
                      key={match.id} 
                      className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {match.subreddit && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                                r/{match.subreddit}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(match.created_at_utc).toLocaleString()}
                            </span>
                          </div>
                          {match.title && (
                            <h4 className="font-semibold mb-1">{match.title}</h4>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {truncateText(match.body, 150)}
                          </p>
                        </div>
                        {match.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-4"
                            onClick={() => window.open(match.url!, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
