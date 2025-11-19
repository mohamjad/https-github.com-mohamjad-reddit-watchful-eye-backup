import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Source {
  id: string;
  subreddit: string | null;
  include_comments: boolean;
  platform?: string;
  region?: string | null;
  created_at: string;
}

const Sources = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSubreddit, setNewSubreddit] = useState("");
  const [includeComments, setIncludeComments] = useState(true);
  const [platform, setPlatform] = useState<"reddit" | "twitter">("reddit");
  const [twitterRegion, setTwitterRegion] = useState<string>("en");

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching sources",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSources(data || []);
    }
    setLoading(false);
  };

  const handleAddSource = async () => {
    // Require subreddit for Reddit sources
    if (platform === 'reddit' && (!newSubreddit || !newSubreddit.trim())) {
      toast({
        title: "Subreddit required",
        description: "Please enter a specific subreddit. Scanning all of Reddit brings too much noise and irrelevant results.",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("sources").insert({
      user_id: session.user.id,
      subreddit: platform === 'twitter' ? null : newSubreddit.trim(),
      include_comments: includeComments,
      platform: platform,
      region: platform === 'twitter' ? twitterRegion : null,
    });

    if (error) {
      toast({
        title: "Error adding source",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Source added",
        description: platform === 'twitter' 
          ? "Now monitoring Twitter" 
          : `Now monitoring r/${newSubreddit.trim()}`,
      });
      setNewSubreddit("");
      setIncludeComments(true);
      setPlatform("reddit");
      setTwitterRegion("en");
      setDialogOpen(false);
      fetchSources();
    }
  };

  const handleDeleteSource = async (id: string) => {
    const { error } = await supabase.from("sources").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting source",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Source deleted",
      });
      fetchSources();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sources</h1>
          <p className="text-muted-foreground mt-1">
            Add platforms and subreddits to monitor for your keywords
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            💡 Tip: For Reddit, add focused subreddits (e.g., r/startups, r/SaaS) to avoid noise. For Twitter, we scan all of Twitter.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Source</DialogTitle>
              <DialogDescription>
                Add a platform or subreddit to monitor
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select 
                  value={platform} 
                  onValueChange={(v) => setPlatform(v as "reddit" | "twitter")}
                >
                  <SelectTrigger id="platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reddit">Reddit</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {platform === 'reddit' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="subreddit">Subreddit (required)</Label>
                    <Input
                      id="subreddit"
                      placeholder="e.g., technology, startup, SaaS"
                      value={newSubreddit}
                      onChange={(e) => setNewSubreddit(e.target.value.replace(/^r\//, ""))}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter without r/ prefix (e.g., "technology"). Required - scanning all of Reddit brings too much noise.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="comments"
                      checked={includeComments}
                      onCheckedChange={(checked) => setIncludeComments(checked as boolean)}
                      disabled
                    />
                    <Label htmlFor="comments" className="cursor-pointer opacity-50">
                      Include comments (Coming soon - requires Reddit OAuth)
                    </Label>
                    <p className="text-xs text-muted-foreground ml-2">
                      Currently scanning posts only. Comment search will be available soon.
                    </p>
                  </div>
                </>
              )}
              {platform === 'twitter' && (
                <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div>
                    <p className="text-sm text-primary font-medium mb-2">
                      🐦 Twitter Source
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We'll scan all of Twitter for your keywords. Make sure you have <code className="text-xs bg-muted px-1 rounded">APIFY_TOKEN</code> set in your Edge Function environment variables.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region / Language</Label>
                    <Select 
                      value={twitterRegion} 
                      onValueChange={setTwitterRegion}
                    >
                      <SelectTrigger id="region">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (Global)</SelectItem>
                        <SelectItem value="en-US">English (United States)</SelectItem>
                        <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
                        <SelectItem value="en-CA">English (Canada)</SelectItem>
                        <SelectItem value="en-AU">English (Australia)</SelectItem>
                        <SelectItem value="es">Spanish (Español)</SelectItem>
                        <SelectItem value="fr">French (Français)</SelectItem>
                        <SelectItem value="de">German (Deutsch)</SelectItem>
                        <SelectItem value="it">Italian (Italiano)</SelectItem>
                        <SelectItem value="pt">Portuguese (Português)</SelectItem>
                        <SelectItem value="ja">Japanese (日本語)</SelectItem>
                        <SelectItem value="zh">Chinese (中文)</SelectItem>
                        <SelectItem value="ko">Korean (한국어)</SelectItem>
                        <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                        <SelectItem value="ar">Arabic (العربية)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Filter tweets by language/region to target specific markets
                    </p>
                  </div>
                </div>
              )}
              <Button 
                onClick={handleAddSource} 
                className="w-full gradient-primary"
              >
                Add Source
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : sources.length === 0 ? (
            <div className="space-y-6">
              <div className="text-center py-4">
                <p className="font-medium mb-2">No sources yet</p>
                <p className="text-sm text-muted-foreground mb-4">Add platforms and subreddits to monitor for your keywords.</p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
                  <p className="text-sm font-medium text-yellow-400 mb-2">💡 Why specific subreddits?</p>
                  <p className="text-xs text-muted-foreground">
                    Scanning all of Reddit brings too much noise from random subreddits. 
                    Adding specific subreddits gives you focused, relevant matches.
                  </p>
                </div>
              </div>
              
              {/* Source Packages */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Quick Start Packages</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Add pre-configured packages of subreddits to get started quickly
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* SaaS/Startups Package */}
                  <Card className="p-4 border-2 hover:border-primary/50 transition-all cursor-pointer"
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;

                      const packageSubreddits = ["startups", "SaaS", "entrepreneur", "indiebiz", "sideproject"];
                      const existingSubreddits = sources.map(s => s.subreddit).filter(Boolean);
                      const toAdd = packageSubreddits.filter(sub => !existingSubreddits.includes(sub));

                      if (toAdd.length === 0) {
                        toast({
                          title: "Already added",
                          description: "You already have all subreddits from this package",
                          variant: "default",
                        });
                        return;
                      }

                      let added = 0;
                      for (const subreddit of toAdd) {
                        const { error } = await supabase.from("sources").insert({
                          user_id: session.user.id,
                          subreddit: subreddit,
                          include_comments: true,
                          platform: "reddit",
                        });
                        if (!error) added++;
                      }

                      if (added > 0) {
                        toast({
                          title: "Package added",
                          description: `Added ${added} subreddit${added !== 1 ? 's' : ''} from SaaS/Startups package`,
                        });
                        fetchSources();
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold mb-1">SaaS & Startups</h4>
                        <p className="text-xs text-muted-foreground">
                          Perfect for SaaS founders and indie hackers
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {["startups", "SaaS", "entrepreneur", "indiebiz", "sideproject"].map(sub => (
                        <Badge key={sub} variant="secondary" className="text-xs">
                          r/{sub}
                        </Badge>
                      ))}
                    </div>
                  </Card>

                  {/* Developer Package */}
                  <Card className="p-4 border-2 hover:border-primary/50 transition-all cursor-pointer"
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;

                      const packageSubreddits = ["webdev", "programming", "learnprogramming", "SideProject", "web_design"];
                      const existingSubreddits = sources.map(s => s.subreddit).filter(Boolean);
                      const toAdd = packageSubreddits.filter(sub => !existingSubreddits.includes(sub));

                      if (toAdd.length === 0) {
                        toast({
                          title: "Already added",
                          description: "You already have all subreddits from this package",
                          variant: "default",
                        });
                        return;
                      }

                      let added = 0;
                      for (const subreddit of toAdd) {
                        const { error } = await supabase.from("sources").insert({
                          user_id: session.user.id,
                          subreddit: subreddit,
                          include_comments: true,
                          platform: "reddit",
                        });
                        if (!error) added++;
                      }

                      if (added > 0) {
                        toast({
                          title: "Package added",
                          description: `Added ${added} subreddit${added !== 1 ? 's' : ''} from Developer package`,
                        });
                        fetchSources();
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold mb-1">Developers</h4>
                        <p className="text-xs text-muted-foreground">
                          For developers building tools and products
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {["webdev", "programming", "learnprogramming", "SideProject", "web_design"].map(sub => (
                        <Badge key={sub} variant="secondary" className="text-xs">
                          r/{sub}
                        </Badge>
                      ))}
                    </div>
                  </Card>

                  {/* Business & Marketing Package */}
                  <Card className="p-4 border-2 hover:border-primary/50 transition-all cursor-pointer"
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;

                      const packageSubreddits = ["marketing", "smallbusiness", "freelance", "EntrepreneurRideAlong", "ecommerce"];
                      const existingSubreddits = sources.map(s => s.subreddit).filter(Boolean);
                      const toAdd = packageSubreddits.filter(sub => !existingSubreddits.includes(sub));

                      if (toAdd.length === 0) {
                        toast({
                          title: "Already added",
                          description: "You already have all subreddits from this package",
                          variant: "default",
                        });
                        return;
                      }

                      let added = 0;
                      for (const subreddit of toAdd) {
                        const { error } = await supabase.from("sources").insert({
                          user_id: session.user.id,
                          subreddit: subreddit,
                          include_comments: true,
                          platform: "reddit",
                        });
                        if (!error) added++;
                      }

                      if (added > 0) {
                        toast({
                          title: "Package added",
                          description: `Added ${added} subreddit${added !== 1 ? 's' : ''} from Business & Marketing package`,
                        });
                        fetchSources();
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold mb-1">Business & Marketing</h4>
                        <p className="text-xs text-muted-foreground">
                          For marketers and business owners
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {["marketing", "smallbusiness", "freelance", "EntrepreneurRideAlong", "ecommerce"].map(sub => (
                        <Badge key={sub} variant="secondary" className="text-xs">
                          r/{sub}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Individual Suggested Subreddits */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Or Add Individual Subreddits</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { name: "startups", category: "Business" },
                    { name: "SaaS", category: "Business" },
                    { name: "entrepreneur", category: "Business" },
                    { name: "indiebiz", category: "Business" },
                    { name: "sideproject", category: "Business" },
                    { name: "webdev", category: "Tech" },
                    { name: "programming", category: "Tech" },
                    { name: "learnprogramming", category: "Tech" },
                    { name: "productivity", category: "Tools" },
                    { name: "marketing", category: "Marketing" },
                    { name: "smallbusiness", category: "Business" },
                    { name: "freelance", category: "Business" },
                  ]
                    .filter(sub => !sources.some(s => s.subreddit === sub.name))
                    .map((subreddit) => (
                    <Button
                      key={subreddit.name}
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-start gap-1 hover:border-primary hover:bg-primary/5"
                      onClick={async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;

                        const { error } = await supabase.from("sources").insert({
                          user_id: session.user.id,
                          subreddit: subreddit.name,
                          include_comments: true,
                          platform: "reddit",
                        });

                        if (error) {
                          toast({
                            title: "Error adding source",
                            description: error.message,
                            variant: "destructive",
                          });
                        } else {
                          toast({
                            title: "Source added",
                            description: `Now monitoring r/${subreddit.name}`,
                          });
                          fetchSources();
                        }
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">r/{subreddit.name}</span>
                        <Plus className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {subreddit.category}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Include Comments</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        source.platform === 'twitter' 
                          ? "bg-blue-500/20 text-blue-400" 
                          : "bg-primary/20 text-primary"
                      }`}>
                        {source.platform === 'twitter' ? 'Twitter' : 'Reddit'}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {source.platform === 'twitter' 
                        ? "All of Twitter" 
                        : source.subreddit ? `r/${source.subreddit}` : <span className="text-muted-foreground italic">No subreddit (inactive)</span>}
                    </TableCell>
                    <TableCell>
                      {source.platform === 'twitter' && source.region ? (
                        <span className="px-2 py-1 rounded-full bg-muted text-xs">
                          {source.region}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        source.include_comments ? "bg-primary/20 text-primary" : "bg-secondary"
                      }`}>
                        {source.include_comments ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(source.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSource(source.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Show packages and suggested subreddits even when user has sources */}
          {sources.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border space-y-8">
              {/* Source Packages */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Quick Start Packages</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Add pre-configured packages of subreddits to get started quickly
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* SaaS/Startups Package */}
                  <Card className="p-4 border-2 hover:border-primary/50 transition-all cursor-pointer"
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;

                      const packageSubreddits = ["startups", "SaaS", "entrepreneur", "indiebiz", "sideproject"];
                      const existingSubreddits = sources.map(s => s.subreddit).filter(Boolean);
                      const toAdd = packageSubreddits.filter(sub => !existingSubreddits.includes(sub));

                      if (toAdd.length === 0) {
                        toast({
                          title: "Already added",
                          description: "You already have all subreddits from this package",
                          variant: "default",
                        });
                        return;
                      }

                      let added = 0;
                      for (const subreddit of toAdd) {
                        const { error } = await supabase.from("sources").insert({
                          user_id: session.user.id,
                          subreddit: subreddit,
                          include_comments: true,
                          platform: "reddit",
                        });
                        if (!error) added++;
                      }

                      if (added > 0) {
                        toast({
                          title: "Package added",
                          description: `Added ${added} subreddit${added !== 1 ? 's' : ''} from SaaS/Startups package`,
                        });
                        fetchSources();
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold mb-1">SaaS & Startups</h4>
                        <p className="text-xs text-muted-foreground">
                          Perfect for SaaS founders and indie hackers
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {["startups", "SaaS", "entrepreneur", "indiebiz", "sideproject"].map(sub => (
                        <Badge key={sub} variant="secondary" className="text-xs">
                          r/{sub}
                        </Badge>
                      ))}
                    </div>
                  </Card>

                  {/* Developer Package */}
                  <Card className="p-4 border-2 hover:border-primary/50 transition-all cursor-pointer"
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;

                      const packageSubreddits = ["webdev", "programming", "learnprogramming", "SideProject", "web_design"];
                      const existingSubreddits = sources.map(s => s.subreddit).filter(Boolean);
                      const toAdd = packageSubreddits.filter(sub => !existingSubreddits.includes(sub));

                      if (toAdd.length === 0) {
                        toast({
                          title: "Already added",
                          description: "You already have all subreddits from this package",
                          variant: "default",
                        });
                        return;
                      }

                      let added = 0;
                      for (const subreddit of toAdd) {
                        const { error } = await supabase.from("sources").insert({
                          user_id: session.user.id,
                          subreddit: subreddit,
                          include_comments: true,
                          platform: "reddit",
                        });
                        if (!error) added++;
                      }

                      if (added > 0) {
                        toast({
                          title: "Package added",
                          description: `Added ${added} subreddit${added !== 1 ? 's' : ''} from Developer package`,
                        });
                        fetchSources();
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold mb-1">Developers</h4>
                        <p className="text-xs text-muted-foreground">
                          For developers building tools and products
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {["webdev", "programming", "learnprogramming", "SideProject", "web_design"].map(sub => (
                        <Badge key={sub} variant="secondary" className="text-xs">
                          r/{sub}
                        </Badge>
                      ))}
                    </div>
                  </Card>

                  {/* Business & Marketing Package */}
                  <Card className="p-4 border-2 hover:border-primary/50 transition-all cursor-pointer"
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;

                      const packageSubreddits = ["marketing", "smallbusiness", "freelance", "EntrepreneurRideAlong", "ecommerce"];
                      const existingSubreddits = sources.map(s => s.subreddit).filter(Boolean);
                      const toAdd = packageSubreddits.filter(sub => !existingSubreddits.includes(sub));

                      if (toAdd.length === 0) {
                        toast({
                          title: "Already added",
                          description: "You already have all subreddits from this package",
                          variant: "default",
                        });
                        return;
                      }

                      let added = 0;
                      for (const subreddit of toAdd) {
                        const { error } = await supabase.from("sources").insert({
                          user_id: session.user.id,
                          subreddit: subreddit,
                          include_comments: true,
                          platform: "reddit",
                        });
                        if (!error) added++;
                      }

                      if (added > 0) {
                        toast({
                          title: "Package added",
                          description: `Added ${added} subreddit${added !== 1 ? 's' : ''} from Business & Marketing package`,
                        });
                        fetchSources();
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold mb-1">Business & Marketing</h4>
                        <p className="text-xs text-muted-foreground">
                          For marketers and business owners
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {["marketing", "smallbusiness", "freelance", "EntrepreneurRideAlong", "ecommerce"].map(sub => (
                        <Badge key={sub} variant="secondary" className="text-xs">
                          r/{sub}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Individual Suggested Subreddits */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Or Add Individual Subreddits</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { name: "startups", category: "Business" },
                    { name: "SaaS", category: "Business" },
                    { name: "entrepreneur", category: "Business" },
                    { name: "indiebiz", category: "Business" },
                    { name: "sideproject", category: "Business" },
                    { name: "webdev", category: "Tech" },
                    { name: "programming", category: "Tech" },
                    { name: "learnprogramming", category: "Tech" },
                    { name: "productivity", category: "Tools" },
                    { name: "marketing", category: "Marketing" },
                    { name: "smallbusiness", category: "Business" },
                    { name: "freelance", category: "Business" },
                  ]
                    .filter(sub => !sources.some(s => s.subreddit === sub.name))
                    .map((subreddit) => (
                      <Button
                        key={subreddit.name}
                        variant="outline"
                        className="h-auto py-3 flex flex-col items-start gap-1 hover:border-primary hover:bg-primary/5"
                        onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session) return;

                          const { error } = await supabase.from("sources").insert({
                            user_id: session.user.id,
                            subreddit: subreddit.name,
                            include_comments: true,
                            platform: "reddit",
                          });

                          if (error) {
                            toast({
                              title: "Error adding source",
                              description: error.message,
                              variant: "destructive",
                            });
                          } else {
                            toast({
                              title: "Source added",
                              description: `Now monitoring r/${subreddit.name}`,
                            });
                            fetchSources();
                          }
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">r/{subreddit.name}</span>
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {subreddit.category}
                        </Badge>
                      </Button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Sources;