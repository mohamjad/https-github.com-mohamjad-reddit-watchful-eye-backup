import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Crosshair, TrendingUp, Clock, Filter, Search, Key, MessageCircle, HelpCircle, AlertCircle, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isAskingMatch, isProblemMatch, isSpamMatch, MatchClassification } from "@/lib/matchScoring";
import { useSearchParams } from "react-router-dom";

interface Match {
  id: number;
  title: string | null;
  body: string | null;
  url: string | null;
  author: string | null;
  subreddit: string | null;
  platform?: string;
  created_at_utc: string;
  keyword_id: string;
  keywords?: {
    phrase: string;
    is_regex: boolean;
  };
}

const textFromMatch = (match: Match) => `${match.title || ""} ${match.body || ""}`.trim();

const cleanHtml = (text: string | null): string => {
  if (!text) return "";
  // More aggressive HTML cleaning - handle nested tags and all variations
  // First decode any HTML entities that might be encoding the tags
  let cleaned = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Now remove all HTML tags (including nested ones)
  cleaned = cleaned
    .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments first
    .replace(/<script[\s\S]*?<\/script>/gi, "") // Remove script tags
    .replace(/<style[\s\S]*?<\/style>/gi, "") // Remove style tags
    .replace(/<[^>]+>/g, "") // Remove all HTML tags (more aggressive)
    .replace(/&#x[\da-f]+;/gi, (match) => {
      // Decode hex HTML entities (e.g., &#x20; = space)
      const hex = match.replace(/[&#x;]/gi, "");
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/&#\d+;/g, (match) => {
      // Decode numeric HTML entities (e.g., &#32; = space)
      const num = parseInt(match.replace(/[&#;]/g, ""));
      return String.fromCharCode(num);
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
  
  // Multiple passes to catch any remaining HTML-like patterns
  let prevCleaned = "";
  while (cleaned !== prevCleaned) {
    prevCleaned = cleaned;
    cleaned = cleaned.replace(/<[^>]*>/g, "");
  }
  
  return cleaned;
};

const formatTwitterText = (text: string | null): string => {
  if (!text) return "";
  // Clean HTML first (removes HTML tags, decodes entities, normalizes)
  // Run cleaning multiple times to catch nested/escaped HTML
  let cleaned = cleanHtml(text);
  cleaned = cleanHtml(cleaned); // Second pass to catch any remaining HTML
  
  // Split by URLs to avoid formatting inside URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let match;
  
  // Find all URLs and split text around them
  while ((match = urlRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push(cleaned.substring(lastIndex, match.index)); // Text before URL
    }
    parts.push(match[0]); // URL itself
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < cleaned.length) {
    parts.push(cleaned.substring(lastIndex)); // Remaining text
  }
  
  // Format each part
  const formatted = parts.map(part => {
    // If it's a URL (starts with http), wrap it in a link
    if (/^https?:\/\//.test(part)) {
      return `<a href="${part}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline break-all">${part}</a>`;
    }
    // Otherwise, format @mentions and hashtags, then escape HTML
    let formattedPart = part
      .replace(/@(\w+)/g, '<span class="text-blue-400 font-medium">@$1</span>')
      .replace(/#(\w+)/g, '<span class="text-blue-400">#$1</span>')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return formattedPart;
  }).join("");
  
  return formatted;
};

const getIntentMeta = (match: Match) => {
  const text = textFromMatch(match);
  if (isAskingMatch(text)) {
    return {
      type: "asking",
      label: "Asking for solutions",
      color: "bg-green-500/15 text-green-400",
      icon: HelpCircle,
      description: "They’re actively requesting help or recommendations.",
    };
  }
  if (isProblemMatch(text)) {
    return {
      type: "problems",
      label: "Pain point spotted",
      color: "bg-orange-500/15 text-orange-400",
      icon: AlertCircle,
      description: "They’re frustrated with an existing workflow or tool.",
    };
  }
  return null;
};

const Matches = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [keywords, setKeywords] = useState<{ id: string; phrase: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "keyword">("date");
  const [filterKeyword, setFilterKeyword] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<"all" | "reddit" | "twitter" | "tiktok">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showHighIntentOnly, setShowHighIntentOnly] = useState(false);
  
  // Initialize activeTab from URL params, default to "all"
  const tabParam = searchParams.get("tab") as MatchClassification | null;
  const initialTab = (tabParam && ["all", "asking", "problems"].includes(tabParam)) ? tabParam : "all";
  const [activeTab, setActiveTab] = useState<MatchClassification>(initialTab);
  
  // Update URL when tab changes via user interaction
  const handleTabChange = (newTab: MatchClassification) => {
    setActiveTab(newTab);
    if (newTab !== "all") {
      setSearchParams({ tab: newTab }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };
  
  // Sync activeTab with URL params when URL changes (e.g., from external link)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as MatchClassification | null;
    const newTab = (tabFromUrl && ["all", "asking", "problems"].includes(tabFromUrl)) ? tabFromUrl : "all";
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    fetchMatches();
    
    // Listen for matches update event
    const handleMatchesUpdate = () => {
      fetchMatches();
    };
    
    window.addEventListener('matches-updated', handleMatchesUpdate);
    
    return () => {
      window.removeEventListener('matches-updated', handleMatchesUpdate);
    };
  }, []);

  const isHighIntentMatch = (match: Match) => {
    const text = textFromMatch(match);
    return isAskingMatch(text) || isProblemMatch(text);
  };

  const highIntentInsights = useMemo(() => {
    if (!showHighIntentOnly) return null;
    const highIntentList = matches.filter(isHighIntentMatch);
    if (highIntentList.length === 0) {
      return {
        total: 0,
        hotLeads: 0,
        painPosts: 0,
        last24h: 0,
        latestAt: null as string | null,
        topKeywords: [] as { phrase: string; count: number }[],
      };
    }

    let hotLeads = 0;
    let painPosts = 0;
    let last24h = 0;
    let latestAt: string | null = null;
    const keywordMap = new Map<string, number>();
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    highIntentList.forEach(match => {
      const text = textFromMatch(match);
      if (isAskingMatch(text)) {
        hotLeads += 1;
      } else if (isProblemMatch(text)) {
        painPosts += 1;
      }

      const phrase = match.keywords?.phrase || "Unlabeled keyword";
      keywordMap.set(phrase, (keywordMap.get(phrase) || 0) + 1);

      const createdMs = new Date(match.created_at_utc).getTime();
      if (createdMs >= dayAgo) {
        last24h += 1;
      }
      if (!latestAt || createdMs > new Date(latestAt).getTime()) {
        latestAt = match.created_at_utc;
      }
    });

    const topKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([phrase, count]) => ({ phrase, count }));

    return {
      total: highIntentList.length,
      hotLeads,
      painPosts,
      last24h,
      latestAt,
      topKeywords,
    };
  }, [showHighIntentOnly, matches]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Fetch matches with keyword info
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
          *,
          keywords:keyword_id (
            phrase,
            is_regex
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at_utc", { ascending: false })
        .limit(200);

      // Fetch keywords for filter dropdown
      const { data: keywordsData } = await supabase
        .from("keywords")
        .select("id, phrase")
        .eq("user_id", session.user.id);

      if (matchesError) {
        toast({
          title: "Error fetching matches",
          description: matchesError.message,
          variant: "destructive",
        });
      } else {
        // Flatten keyword data
        const flattenedMatches = (matchesData || []).map(match => ({
          ...match,
          keywords: Array.isArray(match.keywords) ? match.keywords[0] : match.keywords,
        }));
        
        setAllMatches(flattenedMatches);
        setKeywords(keywordsData || []);
        // Filters will be applied by useEffect when allMatches changes
      }
    } catch (error: any) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Error fetching matches",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate match counts for each tab (excluding spam)
  const getMatchCounts = (matchesToCount: Match[]) => {
    // Filter out spam first
    const nonSpamMatches = matchesToCount.filter(m => !isSpamMatch(textFromMatch(m)));
    
    const all = nonSpamMatches.length;
    const asking = nonSpamMatches.filter(m => isAskingMatch(textFromMatch(m))).length;
    const problems = nonSpamMatches.filter(m => isProblemMatch(textFromMatch(m))).length;
    
    return { all, asking, problems };
  };

  const applyFilters = (
    matchesToFilter: Match[],
    keywordFilter: string,
    search: string,
    sort: "date" | "keyword",
    tab: MatchClassification,
    highIntentOnly: boolean,
    platformFilter: "all" | "reddit" | "twitter" | "tiktok"
  ) => {
    let filtered = [...matchesToFilter];

    // First, filter out spam/promotional content from all tabs
    filtered = filtered.filter(m => !isSpamMatch(textFromMatch(m)));

    // Filter by platform (Reddit, Twitter, TikTok, or All)
    if (platformFilter === "reddit") {
      filtered = filtered.filter(m => m.platform === "reddit" || !m.platform);
    } else if (platformFilter === "twitter") {
      filtered = filtered.filter(m => m.platform === "twitter");
    } else if (platformFilter === "tiktok") {
      filtered = filtered.filter(m => m.platform === "tiktok");
    }
    // "all" shows all platforms

    // Filter by tab (Asking, Problems, or All)
    if (tab === "asking") {
      filtered = filtered.filter(m => isAskingMatch(textFromMatch(m)));
    } else if (tab === "problems") {
      filtered = filtered.filter(m => isProblemMatch(textFromMatch(m)));
    }
    // "all" tab shows everything (except spam, which is already filtered)

    if (highIntentOnly) {
      filtered = filtered.filter(isHighIntentMatch);
    }

    // Filter by keyword
    if (keywordFilter !== "all") {
      filtered = filtered.filter(m => m.keyword_id === keywordFilter);
    }

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.title?.toLowerCase().includes(query) ||
        m.body?.toLowerCase().includes(query) ||
        m.subreddit?.toLowerCase().includes(query) ||
        m.author?.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sort === "keyword") {
      filtered.sort((a, b) => {
        const aPhrase = a.keywords?.phrase || "";
        const bPhrase = b.keywords?.phrase || "";
        return aPhrase.localeCompare(bPhrase);
      });
    } else {
      filtered.sort((a, b) => 
        new Date(b.created_at_utc).getTime() - new Date(a.created_at_utc).getTime()
      );
    }

    setMatches(filtered);
  };

  useEffect(() => {
    applyFilters(allMatches, filterKeyword, searchQuery, sortBy, activeTab, showHighIntentOnly, filterPlatform);
  }, [filterKeyword, filterPlatform, searchQuery, sortBy, activeTab, showHighIntentOnly, allMatches]);

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "";
    const cleaned = cleanHtml(text);
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + "..." : cleaned;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Crosshair className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Matches</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Find people ready to buy + problems worth solving
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchMatches}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Tabs for Match Classification */}
      {!loading && allMatches.length > 0 && (
        <Card className="glass-card p-4">
          <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as MatchClassification)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Mentions
                <span className="ml-1 px-2 py-0.5 text-xs bg-muted rounded-full">
                  {getMatchCounts(allMatches).all}
                </span>
              </TabsTrigger>
              <TabsTrigger value="asking" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Asking
                <span className="ml-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full font-medium">
                  {getMatchCounts(allMatches).asking}
                </span>
              </TabsTrigger>
              <TabsTrigger value="problems" className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Problems
                <span className="ml-1 px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded-full font-medium">
                  {getMatchCounts(allMatches).problems}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Tab Descriptions */}
          <div className="mt-4 text-sm text-muted-foreground">
            {activeTab === "all" && (
              <p>All keyword mentions from Reddit, Twitter, and TikTok</p>
            )}
            {activeTab === "asking" && (
              <p className="text-green-400">
                💡 <strong>HOT LEADS:</strong> People explicitly asking for solutions - these are your potential customers
              </p>
            )}
            {activeTab === "problems" && (
              <p className="text-orange-400">
                🎯 <strong>OPPORTUNITIES:</strong> People complaining about existing solutions - these are problems worth solving
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Filters and Search */}
      {!loading && allMatches.length > 0 && (
        <Card className="glass-card p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search matches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Platform Filter */}
            <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v as "all" | "reddit" | "twitter" | "tiktok")}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🔴🐦🎵 All</SelectItem>
                <SelectItem value="reddit">🔴 Reddit</SelectItem>
                <SelectItem value="twitter">🐦 Twitter</SelectItem>
                <SelectItem value="tiktok">🎵 TikTok</SelectItem>
              </SelectContent>
            </Select>

            {/* Keyword Filter */}
            <Select value={filterKeyword} onValueChange={setFilterKeyword}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by keyword" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Keywords</SelectItem>
                {keywords.map(k => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.phrase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "keyword")}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="keyword">Sort by Keyword</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
            <Switch
              checked={showHighIntentOnly}
              onCheckedChange={(checked) => setShowHighIntentOnly(checked as boolean)}
              id="high-intent-toggle"
            />
            <div>
              <label htmlFor="high-intent-toggle" className="font-medium text-sm cursor-pointer">
                High Intent Only
              </label>
              <p className="text-xs text-muted-foreground">
                Show only posts where people are explicitly asking for help or complaining about a solution.
              </p>
            </div>
          </div>
        </Card>
      )}

      {showHighIntentOnly && !loading && (
        <Card className="glass-card border border-green-500/30 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <Flame className="w-5 h-5" />
                <h2 className="text-xl font-semibold text-foreground">High Intent Insights</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                You’re looking at buyers who are either asking for help or frustrated with existing tools.
              </p>
            </div>
            {highIntentInsights && highIntentInsights.total > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Total</p>
                  <p className="text-2xl font-semibold">{highIntentInsights.total}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Hot leads</p>
                  <p className="text-xl font-semibold text-green-400">{highIntentInsights.hotLeads}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Pain posts</p>
                  <p className="text-xl font-semibold text-orange-400">{highIntentInsights.painPosts}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Last 24h</p>
                  <p className="text-xl font-semibold">{highIntentInsights.last24h}</p>
                </div>
              </div>
            )}
          </div>
          {highIntentInsights && highIntentInsights.total > 0 ? (
            <>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                  <p className="text-sm text-green-400 font-semibold mb-1">Next actions</p>
                  <p className="text-sm text-muted-foreground">
                    Jump on these matches ASAP—reply with answers, drop a DM, or add them to your outreach pipeline.
                    Use the keyword badges to prioritize the themes with the most demand.
                  </p>
                </div>
                <div className="flex-1 rounded-lg border border-muted bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground font-semibold mb-2">Latest mention</p>
                  <p className="text-lg font-medium">
                    {highIntentInsights.latestAt
                      ? new Date(highIntentInsights.latestAt).toLocaleString()
                      : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep scans running so this feed stays fresh.
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide mb-2">
                  Top keywords surfacing intent
                </p>
                <div className="flex flex-wrap gap-2">
                  {highIntentInsights.topKeywords.length > 0 ? (
                    highIntentInsights.topKeywords.map((keyword) => (
                      <span
                        key={keyword.phrase}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        {keyword.phrase} · {keyword.count}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Keyword signals will show up once you have a few matches.
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No high intent matches yet. Try adding more pain-focused keywords (e.g., “X not working”, “need X alternative”).
            </p>
          )}
        </Card>
      )}

      {!loading && matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card p-4">
            <div className="flex items-center gap-3">
              <Crosshair className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{matches.length}</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "asking" ? "Hot Leads" : activeTab === "problems" ? "Opportunities" : "Total Matches"}
                </p>
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
            {activeTab === "asking" 
              ? "No asking matches found. Keep monitoring - these are your hot leads!" 
              : activeTab === "problems"
              ? "No problem matches found. Keep monitoring - these are your opportunities!"
              : "No matches yet. Your keywords are being monitored!"
            }
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const intentMeta = getIntentMeta(match);
            const IntentIcon = intentMeta?.icon;
            return (
            <Card key={match.id} className="glass-card overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {intentMeta && IntentIcon && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${intentMeta.color}`}>
                          <IntentIcon className="w-3 h-3" />
                          {intentMeta.label}
                        </span>
                      )}
                      {/* Keyword Badge */}
                      {match.keywords && (
                        <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          {match.keywords.phrase}
                          {match.keywords.is_regex && (
                            <span className="text-[10px] opacity-70">(regex)</span>
                          )}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        match.platform === 'twitter' 
                          ? "bg-blue-500/20 text-blue-400"
                          : match.platform === 'tiktok'
                          ? "bg-pink-500/20 text-pink-400"
                          : "bg-primary/20 text-primary"
                      }`}>
                        {match.platform === 'twitter' ? '🐦 Twitter' : match.platform === 'tiktok' ? '🎵 TikTok' : '🔴 Reddit'}
                      </span>
                      {match.subreddit && (
                        <span className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                          r/{match.subreddit}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(match.created_at_utc).toLocaleString()}
                      </span>
                    </div>
                    {match.platform === 'twitter' || match.platform === 'tiktok' ? (
                      <>
                        {/* Twitter/TikTok-specific layout */}
                        {match.body && (
                          <div className="space-y-2">
                            <div 
                              className="text-base leading-relaxed text-foreground"
                              dangerouslySetInnerHTML={{ 
                                __html: expandedMatch === match.id
                                  ? formatTwitterText(match.body)
                                  : formatTwitterText(truncateText(match.body, 280))
                              }}
                            />
                            {match.body.length > 280 && (
                              <Button
                                variant="link"
                                className={`px-0 ${match.platform === 'twitter' ? 'text-blue-400' : 'text-pink-400'}`}
                                onClick={() =>
                                  setExpandedMatch(expandedMatch === match.id ? null : match.id)
                                }
                              >
                                {expandedMatch === match.id ? "Show less" : "Show more"}
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Reddit layout */}
                        {match.title && (
                          <h3 className="text-lg font-semibold mb-2">{cleanHtml(match.title)}</h3>
                        )}
                        <p className="text-muted-foreground">
                          {expandedMatch === match.id
                            ? cleanHtml(match.body)
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
                      </>
                    )}
                  </div>
                  {match.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4 shrink-0"
                      onClick={() => window.open(match.url!, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {match.platform === 'twitter' ? 'View Tweet' : match.platform === 'tiktok' ? 'View Video' : 'Open'}
                    </Button>
                  )}
                </div>
                {match.author && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {match.platform === 'twitter' || match.platform === 'tiktok' ? (
                      <>
                        <span>@{match.author}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{new Date(match.created_at_utc).toLocaleDateString()}</span>
                      </>
                    ) : (
                      <>Posted by u/{match.author}</>
                    )}
                  </div>
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Matches;