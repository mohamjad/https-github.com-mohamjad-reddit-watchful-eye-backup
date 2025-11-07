import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Crosshair, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Match {
  id: number;
  title: string | null;
  body: string | null;
  url: string | null;
  author: string | null;
  subreddit: string | null;
  created_at_utc: string;
}

const Matches = () => {
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at_utc", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Error fetching matches",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setMatches(data || []);
    }
    setLoading(false);
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Crosshair className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Matches</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Recent keyword matches from Reddit
        </p>
      </div>

      {!loading && matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card p-4">
            <div className="flex items-center gap-3">
              <Crosshair className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{matches.length}</p>
                <p className="text-sm text-muted-foreground">Total Matches</p>
              </div>
            </div>
          </Card>
          <Card className="glass-card p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {matches.filter(m => {
                    const matchDate = new Date(m.created_at_utc);
                    const oneDayAgo = new Date();
                    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
                    return matchDate > oneDayAgo;
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Last 24 Hours</p>
              </div>
            </div>
          </Card>
          <Card className="glass-card p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {matches.length > 0 
                    ? new Date(matches[0].created_at_utc).toLocaleDateString()
                    : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Latest Match</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {loading ? (
        <Card className="glass-card p-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </Card>
      ) : matches.length === 0 ? (
        <Card className="glass-card p-8">
          <div className="text-center text-muted-foreground">
            No matches yet. Your keywords are being monitored!
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Card key={match.id} className="glass-card overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {match.subreddit && (
                        <span className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                          r/{match.subreddit}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(match.created_at_utc).toLocaleString()}
                      </span>
                    </div>
                    {match.title && (
                      <h3 className="text-lg font-semibold mb-2">{match.title}</h3>
                    )}
                    <p className="text-muted-foreground">
                      {expandedMatch === match.id
                        ? match.body
                        : truncateText(match.body, 200)}
                    </p>
                    {match.body && match.body.length > 200 && (
                      <Button
                        variant="link"
                        className="px-0 mt-2"
                        onClick={() =>
                          setExpandedMatch(expandedMatch === match.id ? null : match.id)
                        }
                      >
                        {expandedMatch === match.id ? "Show less" : "Show more"}
                      </Button>
                    )}
                  </div>
                  {match.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      onClick={() => window.open(match.url!, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                  )}
                </div>
                {match.author && (
                  <div className="text-sm text-muted-foreground">
                    Posted by u/{match.author}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;