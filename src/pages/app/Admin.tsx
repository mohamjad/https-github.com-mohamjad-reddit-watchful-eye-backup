import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Activity, TrendingUp, DollarSign, Zap, Calendar, BarChart3, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface UserStats {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  new_users_today: number;
  new_users_7d: number;
  new_users_30d: number;
  free_users: number;
  basic_users: number;
  pro_users: number;
}

interface ActiveUser {
  email: string;
  plan: string;
  signup_date: string;
  last_scan: string | null;
  days_scanned: number;
  keyword_count: number;
  source_count: number;
  total_matches: number;
  activity_status: string;
}

interface DailySignups {
  date: string;
  count: number;
}

interface PlanDistribution {
  plan: string;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [dailySignups, setDailySignups] = useState<DailySignups[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [scanActivity, setScanActivity] = useState<{ date: string; scans: number }[]>([]);
  const [matchActivity, setMatchActivity] = useState<{ date: string; matches: number }[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Check if user is admin
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (error || !profile?.is_admin) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/app");
        return;
      }

      setIsAdmin(true);
      fetchAdminData();
    } catch (error: any) {
      console.error("Error checking admin access:", error);
      toast({
        title: "Error",
        description: "Failed to verify admin access.",
        variant: "destructive",
      });
      navigate("/app");
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch user statistics
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');
      
      if (statsError) {
        // Fallback: Use direct queries if RPC doesn't exist
        await fetchStatsDirectly();
      } else {
        setUserStats(statsData);
      }

      // Fetch active users
      await fetchActiveUsers();

      // Fetch daily signups
      await fetchDailySignups();

      // Fetch plan distribution
      await fetchPlanDistribution();

      // Fetch scan activity
      await fetchScanActivity();

      // Fetch match activity
      await fetchMatchActivity();

    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch admin data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsDirectly = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Active users (scanned in last 7/30 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: scans7d } = await supabase
        .from("daily_scans")
        .select("user_id")
        .gte("created_at", sevenDaysAgo.toISOString());

      const { data: scans30d } = await supabase
        .from("daily_scans")
        .select("user_id")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const active7d = new Set(scans7d?.map(s => s.user_id) || []).size;
      const active30d = new Set(scans30d?.map(s => s.user_id) || []).size;

      // New users
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysAgoStart = new Date(sevenDaysAgo);
      sevenDaysAgoStart.setHours(0, 0, 0, 0);
      const thirtyDaysAgoStart = new Date(thirtyDaysAgo);
      thirtyDaysAgoStart.setHours(0, 0, 0, 0);

      const { count: newToday } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      const { count: new7d } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoStart.toISOString());

      const { count: new30d } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgoStart.toISOString());

      // Users by plan
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("status", "active");

      const planCounts = subscriptions?.reduce((acc: any, sub: any) => {
        acc[sub.plan] = (acc[sub.plan] || 0) + 1;
        return acc;
      }, {}) || {};

      setUserStats({
        total_users: totalUsers || 0,
        active_users_7d: active7d,
        active_users_30d: active30d,
        new_users_today: newToday || 0,
        new_users_7d: new7d || 0,
        new_users_30d: new30d || 0,
        free_users: planCounts.free || 0,
        basic_users: planCounts.basic || 0,
        pro_users: planCounts.pro || 0,
      });
    } catch (error) {
      console.error("Error fetching stats directly:", error);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      // Get user stats with activity
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          created_at,
          subscriptions!inner(plan, status),
          daily_scans(created_at, scan_date),
          keywords(id),
          sources(id),
          matches(id)
        `)
        .eq("subscriptions.status", "active")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const now = new Date();
      const users: ActiveUser[] = (data || []).map((user: any) => {
        const lastScan = user.daily_scans?.[0]?.created_at;
        const daysScanned = new Set(user.daily_scans?.map((s: any) => s.scan_date) || []).size;
        
        let activityStatus = "Inactive";
        if (lastScan) {
          const lastScanDate = new Date(lastScan);
          const daysSince = (now.getTime() - lastScanDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < 1) activityStatus = "Active Today";
          else if (daysSince < 7) activityStatus = "Active This Week";
          else if (daysSince < 30) activityStatus = "Active This Month";
        }

        return {
          email: user.email,
          plan: user.subscriptions?.[0]?.plan || "free",
          signup_date: new Date(user.created_at).toLocaleDateString(),
          last_scan: lastScan ? new Date(lastScan).toLocaleDateString() : null,
          days_scanned: daysScanned,
          keyword_count: user.keywords?.length || 0,
          source_count: user.sources?.length || 0,
          total_matches: user.matches?.length || 0,
          activity_status: activityStatus,
        };
      });

      // Sort by last scan (most recent first)
      users.sort((a, b) => {
        if (!a.last_scan && !b.last_scan) return 0;
        if (!a.last_scan) return 1;
        if (!b.last_scan) return -1;
        return new Date(b.last_scan).getTime() - new Date(a.last_scan).getTime();
      });

      setActiveUsers(users);
    } catch (error) {
      console.error("Error fetching active users:", error);
    }
  };

  const fetchDailySignups = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date
      const signupsByDate = new Map<string, number>();
      data?.forEach((profile) => {
        const date = new Date(profile.created_at).toISOString().split("T")[0];
        signupsByDate.set(date, (signupsByDate.get(date) || 0) + 1);
      });

      const signups: DailySignups[] = Array.from(signupsByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailySignups(signups);
    } catch (error) {
      console.error("Error fetching daily signups:", error);
    }
  };

  const fetchPlanDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("status", "active");

      if (error) throw error;

      const distribution = new Map<string, number>();
      data?.forEach((sub) => {
        distribution.set(sub.plan, (distribution.get(sub.plan) || 0) + 1);
      });

      const planDist: PlanDistribution[] = Array.from(distribution.entries())
        .map(([plan, count]) => ({ plan, count }));

      setPlanDistribution(planDist);
    } catch (error) {
      console.error("Error fetching plan distribution:", error);
    }
  };

  const fetchScanActivity = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("daily_scans")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date
      const scansByDate = new Map<string, number>();
      data?.forEach((scan) => {
        const date = new Date(scan.created_at).toISOString().split("T")[0];
        scansByDate.set(date, (scansByDate.get(date) || 0) + 1);
      });

      const activity = Array.from(scansByDate.entries())
        .map(([date, scans]) => ({ date, scans }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setScanActivity(activity);
    } catch (error) {
      console.error("Error fetching scan activity:", error);
    }
  };

  const fetchMatchActivity = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("matches")
        .select("inserted_at")
        .gte("inserted_at", thirtyDaysAgo.toISOString())
        .order("inserted_at", { ascending: true });

      if (error) throw error;

      // Group by date
      const matchesByDate = new Map<string, number>();
      data?.forEach((match) => {
        const date = new Date(match.inserted_at).toISOString().split("T")[0];
        matchesByDate.set(date, (matchesByDate.get(date) || 0) + 1);
      });

      const activity = Array.from(matchesByDate.entries())
        .map(([date, matches]) => ({ date, matches }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setMatchActivity(activity);
    } catch (error) {
      console.error("Error fetching match activity:", error);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Monitor users, activity, and platform health</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userStats?.new_users_7d || 0} new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.active_users_7d || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userStats?.active_users_30d || 0} active in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.new_users_today || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userStats?.new_users_30d || 0} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.pro_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userStats?.free_users || 0} free, {userStats?.basic_users || 0} basic
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Signups (Last 30 Days)</CardTitle>
            <CardDescription>New user registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailySignups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Users by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scan Activity (Last 30 Days)</CardTitle>
            <CardDescription>Number of scans performed daily</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scanActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="scans" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Match Activity (Last 30 Days)</CardTitle>
            <CardDescription>New matches found daily</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={matchActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="matches" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Active Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Users</CardTitle>
          <CardDescription>Top 50 users by activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Signup Date</TableHead>
                  <TableHead>Last Scan</TableHead>
                  <TableHead>Days Scanned</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  activeUsers.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.plan === 'pro' ? 'default' : 'secondary'}>
                          {user.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.signup_date}</TableCell>
                      <TableCell>{user.last_scan || 'Never'}</TableCell>
                      <TableCell>{user.days_scanned}</TableCell>
                      <TableCell>{user.keyword_count}</TableCell>
                      <TableCell>{user.source_count}</TableCell>
                      <TableCell>{user.total_matches}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            user.activity_status === 'Active Today' ? 'default' :
                            user.activity_status === 'Active This Week' ? 'secondary' :
                            'outline'
                          }
                        >
                          {user.activity_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;












