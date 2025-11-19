import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { scanReddit } from "@/lib/redditScanner";

interface Keyword {
  id: string;
  phrase: string;
  is_regex: boolean;
  search_type?: string;
  created_at: string;
}

const Keywords = () => {
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPhrase, setNewPhrase] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [searchType, setSearchType] = useState<"posts">("posts");
  const [plan, setPlan] = useState("free");
  const [keywordLimit, setKeywordLimit] = useState(50); // High limit for paid tier
  const [scansRemaining, setScansRemaining] = useState(999); // Unlimited for paid tier
  const [nextReset, setNextReset] = useState<Date | null>(null);
  const [scanning, setScanning] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [scanIntervalMinutes, setScanIntervalMinutes] = useState(30);
  const [updatingAutoScan, setUpdatingAutoScan] = useState(false);

  useEffect(() => {
    fetchKeywords();
    fetchSubscription();
    calculateNextReset();
  }, []);

  const fetchScansRemaining = async (userPlan?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Use provided plan or current state
    const currentPlan = userPlan || plan || "free";

    // Paid tier: unlimited scans
    if (currentPlan !== "free") {
      setScansRemaining(999); // Unlimited
      return;
    }

    // Free tier: 2 scans per day (for trial users)
    const today = new Date();
    const estDate = new Date(today.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const todayStr = estDate.toISOString().split('T')[0];

    const { count } = await (supabase as any)
      .from("daily_scans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("scan_date", todayStr);

    setScansRemaining(Math.max(0, 2 - (count || 0)));
  };

  const calculateNextReset = () => {
    const now = new Date();
    const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const tomorrow = new Date(est);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setNextReset(tomorrow);
  };

  const fetchSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("subscriptions")
      .select("plan, auto_scan_enabled, scan_interval_minutes")
      .eq("user_id", session.user.id)
      .single();

    if (data) {
      const subscriptionData = data as any; // Type assertion until types are regenerated
      const userPlan = subscriptionData.plan || "free";
      setPlan(userPlan);
      // Paid tier: 50 keywords (effectively unlimited), Free tier: 5 keywords (trial)
      setKeywordLimit(userPlan === "free" ? 5 : 50);
      setAutoScanEnabled(subscriptionData.auto_scan_enabled || false);
      setScanIntervalMinutes(subscriptionData.scan_interval_minutes || 30);
      // Fetch scans remaining after plan is set
      await fetchScansRemaining(userPlan);
    }
  };

  const fetchKeywords = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("keywords")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching keywords",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setKeywords(data || []);
    }
    setLoading(false);
  };

  const handleAddKeyword = async () => {
    if (!newPhrase.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("keywords").insert({
      user_id: session.user.id,
      phrase: newPhrase,
      is_regex: isRegex,
      search_type: searchType,
    });

    if (error) {
      toast({
        title: "Error adding keyword",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Keyword added",
        description: "Your keyword is now being monitored.",
      });
      setNewPhrase("");
      setIsRegex(false);
      setSearchType("posts");
      setDialogOpen(false);
      fetchKeywords();
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    // First, check how many matches will be deleted
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { count } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("keyword_id", id)
        .eq("user_id", session.user.id);
      
      const matchCount = count || 0;
      
      // Delete keyword (matches will be cascade deleted by database)
      const { error } = await supabase.from("keywords").delete().eq("id", id);

      if (error) {
        toast({
          title: "Error deleting keyword",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Keyword deleted",
          description: matchCount > 0 
            ? `${matchCount} associated match${matchCount !== 1 ? 'es' : ''} also deleted`
            : "Keyword deleted successfully",
        });
        fetchKeywords();
        
        // Trigger matches update event to refresh matches page
        window.dispatchEvent(new Event('matches-updated'));
      }
    }
  };

  const handleFullReset = async () => {
    setResetting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      // Count total matches that will be deleted
      const { count: matchCount } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      // Delete ALL matches first (including orphaned ones without keywords)
      const { error: matchesError } = await supabase
        .from("matches")
        .delete()
        .eq("user_id", session.user.id);

      if (matchesError) {
        toast({
          title: "Error deleting matches",
          description: matchesError.message,
          variant: "destructive",
        });
        setResetting(false);
        return;
      }

      // Delete all keywords
      const { error: keywordsError } = await supabase
        .from("keywords")
        .delete()
        .eq("user_id", session.user.id);

      if (keywordsError) {
        toast({
          title: "Error deleting keywords",
          description: keywordsError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Full reset completed",
          description: `All ${keywords.length} keyword${keywords.length !== 1 ? 's' : ''} and ${matchCount || 0} match${(matchCount || 0) !== 1 ? 'es' : ''} deleted`,
        });
        fetchKeywords();
        setResetDialogOpen(false);
        
        // Trigger matches update event to refresh matches page
        window.dispatchEvent(new Event('matches-updated'));
      }
    } catch (error: any) {
      toast({
        title: "Error resetting",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  const handleUpdateAutoScan = async (enabled: boolean, interval?: number) => {
    // Prevent free users from enabling automatic scans
    if (enabled && plan === "free") {
      toast({
        title: "Upgrade Required",
        description: "Automatic scans are only available for paid plans. Subscribe to enable this feature.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingAutoScan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const updateData: any = {
        auto_scan_enabled: enabled,
      };
      
      if (interval !== undefined) {
        updateData.scan_interval_minutes = interval;
      }

      const { error } = await (supabase as any)
        .from("subscriptions")
        .update(updateData)
        .eq("user_id", session.user.id);

      if (error) {
        toast({
          title: "Error updating settings",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setAutoScanEnabled(enabled);
        if (interval !== undefined) {
          setScanIntervalMinutes(interval);
        }
        toast({
          title: enabled ? "Automatic scans enabled" : "Automatic scans disabled",
          description: enabled 
            ? `Scans will run automatically every ${interval || scanIntervalMinutes} minutes.`
            : "Manual scans only.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setUpdatingAutoScan(false);
    }
  };

  const handleManualScan = async () => {
    if (plan === "free" && scansRemaining <= 0) {
      toast({
        title: "Scan limit reached",
        description: `Next scan available at ${nextReset?.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" })} EST`,
        variant: "destructive",
      });
      return;
    }

    // Check if user has any sources (will skip Reddit/Twitter if not available)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: sources } = await supabase
      .from("sources")
      .select("id, subreddit, platform")
      .eq("user_id", session.user.id);
    
    const validRedditSources = sources?.filter(s => 
      (!s.platform || s.platform === 'reddit') && 
      s.subreddit && 
      s.subreddit.trim()
    ) || [];
    
    const validTwitterSources = sources?.filter(s => s.platform === 'twitter') || [];
    const totalValidSources = validRedditSources.length + validTwitterSources.length;
    
    // Only require sources if user has none at all
    if (!sources || sources.length === 0) {
      toast({
        title: "No sources configured",
        description: "Please add at least one source (Reddit subreddit or Twitter) to monitor.",
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = "/app/sources"}
          >
            Add Sources
          </Button>
        ),
      });
      return;
    }

        setScanning(true);
        try {
          // Scan Reddit RSS feeds (recent posts only - last 100 posts per subreddit)
          // JSON API backfill removed - Reddit's JSON API returns 403 errors
          const result = await scanReddit(undefined);
      
      // Track scan for free tier users
      if (plan === "free") {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const today = new Date();
          const estDate = new Date(today.toLocaleString("en-US", { timeZone: "America/New_York" }));
          const todayStr = estDate.toISOString().split('T')[0];
          
          // Use upsert to handle duplicates gracefully
          const { error: scanError } = await (supabase as any)
            .from("daily_scans")
            .upsert({
              user_id: session.user.id,
              scan_date: todayStr,
            }, {
              onConflict: 'user_id,scan_date',
              ignoreDuplicates: false
            });
          
          // Log but don't fail on scan tracking errors
          if (scanError) {
            console.warn("Error tracking scan (non-critical):", scanError.message);
          }
          
          await fetchScansRemaining();
        }
      }

      console.log("Scan result:", JSON.stringify(result, null, 2));
      console.log("Matches found:", result.matches, "New matches:", result.newMatches);
      
      toast({
        title: "Scan completed",
        description: `Found ${result.newMatches || 0} new match${(result.newMatches || 0) !== 1 ? 'es' : ''}`,
      });
      
      // Refresh matches if any were found
      if (result.newMatches > 0) {
        // Small delay to ensure database write completes
        setTimeout(() => {
          // Trigger a refresh by navigating or reloading matches
          window.dispatchEvent(new Event('matches-updated'));
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: "Scan failed",
        description: error.message || "An error occurred while scanning",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Keywords</h1>
          <p className="text-muted-foreground mt-1">
            Manage the keywords you're monitoring
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {plan === "free" && (
            <div className="text-sm text-muted-foreground">
              {scansRemaining} / 2 scans remaining
              <div className="text-xs">Resets at midnight EST</div>
            </div>
          )}
          <Button 
            onClick={handleManualScan} 
            disabled={scanning || (plan === "free" && scansRemaining <= 0)}
            variant="outline"
          >
            <Search className="w-4 h-4 mr-2" />
            {scanning ? "Scanning..." : "Scan Now"}
          </Button>
          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={keywords.length === 0 || resetting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Full Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} and all associated matches. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleFullReset}
                  disabled={resetting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {resetting ? "Resetting..." : "Delete Everything"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Keyword
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Keyword</DialogTitle>
              <DialogDescription>
                Enter a keyword or phrase to monitor on Reddit
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="phrase">Phrase</Label>
                <Input
                  id="phrase"
                  placeholder="e.g., looking for a CRM"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="searchType">Search Type</Label>
                <Select value={searchType} onValueChange={(v) => setSearchType(v as "posts")}>
                  <SelectTrigger id="searchType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posts">Posts Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Comments require Reddit OAuth and are not currently supported
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="regex"
                  checked={isRegex}
                  onCheckedChange={(checked) => setIsRegex(checked as boolean)}
                />
                <Label htmlFor="regex" className="cursor-pointer">
                  Use regex pattern
                </Label>
              </div>
              <Button onClick={handleAddKeyword} className="w-full gradient-primary">
                Add Keyword
              </Button>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="glass-card border border-dashed">
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Keyword Playbook</h2>
            <p className="text-sm text-muted-foreground">
              Craft phrases that trigger “need help” and “this is broken” conversations.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-2">Aim for intent language</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  Combine your topic with qualifiers like{" "}
                  <span className="text-foreground">need</span>,{" "}
                  <span className="text-foreground">looking for</span>,{" "}
                  <span className="text-foreground">problem with</span>,{" "}
                  <span className="text-foreground">alternative to</span>.
                </li>
                <li>
                  Mix in frustration words:{" "}
                  <span className="text-foreground">“Mailchimp keeps failing”</span>,{" "}
                  <span className="text-foreground">“Zapier too expensive”</span>.
                </li>
                <li>
                  Add question starters such as{" "}
                  <span className="text-foreground">“anyone know”</span>,{" "}
                  <span className="text-foreground">“how do you”</span>,{" "}
                  <span className="text-foreground">“recommend”</span>.
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Filter in Matches</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  Use the <span className="text-foreground font-medium">“High Intent”</span> toggle on the Matches page to only see
                  posts where people are clearly asking for help or complaining about a tool.
                </li>
                <li>
                  Keep the toggle off if you want to monitor broader market chatter and top-of-funnel mentions.
                </li>
                <li>
                  Layer multiple variations (e.g. <span className="text-foreground">“need a CRM”</span>,{" "}
                  <span className="text-foreground">“hate my CRM”</span>,{" "}
                  <span className="text-foreground">“CRM alternative”</span>) to cover every angle.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <Card className="glass-card">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {keywords.length} / {keywordLimit >= 50 ? "Unlimited" : keywordLimit} keywords used
            </div>
            {keywords.length >= keywordLimit && plan === "free" && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = "/app/billing"}
              >
                Subscribe Now
              </Button>
            )}
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No keywords yet. Add your first keyword to start monitoring!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phrase</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Search</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">{keyword.phrase}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-secondary text-xs">
                        {keyword.is_regex ? "Regex" : "Exact"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                        Posts
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(keyword.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteKeyword(keyword.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Automatic Scan Settings Card - Only for Basic/Pro users */}
      <Card className="glass-card">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Automatic Scans</h2>
              <p className="text-sm text-muted-foreground">
                {plan === "free" 
                  ? "Enable automatic scans by subscribing to the Pro plan"
                  : "Automatically scan for new matches at regular intervals"
                }
              </p>
            </div>
          </div>
          
          {plan === "free" ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                <Checkbox disabled checked={false} />
                <div className="flex-1">
                  <Label className="text-sm font-medium">Automatic Scans (Subscribe Required)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Free trial includes 2 manual scans per day. Subscribe to enable automatic scans every 30 minutes.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = "/app/billing"}
              >
                Subscribe to Enable Automatic Scans
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoScan"
                  checked={autoScanEnabled}
                  onCheckedChange={(checked) => handleUpdateAutoScan(checked as boolean)}
                  disabled={updatingAutoScan}
                />
                <Label htmlFor="autoScan" className="cursor-pointer flex-1">
                  <div className="font-medium">Enable Automatic Scans</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Automatically scan for new matches without manual intervention
                  </div>
                </Label>
              </div>
              
              {autoScanEnabled && (
                <div className="space-y-2 pl-7">
                  <Label htmlFor="scanInterval">Scan Interval (minutes)</Label>
                  <Select 
                    value={scanIntervalMinutes.toString()} 
                    onValueChange={(v) => handleUpdateAutoScan(true, parseInt(v))}
                    disabled={updatingAutoScan}
                  >
                    <SelectTrigger id="scanInterval" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Scans will run automatically every {scanIntervalMinutes} minutes. You'll still have unlimited manual scans.
                  </p>
                </div>
              )}
              
              {autoScanEnabled && (
                <div className="pl-7 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    ✓ Automatic scans are active
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your keywords will be scanned every {scanIntervalMinutes} minutes. New matches will appear automatically.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Keywords;