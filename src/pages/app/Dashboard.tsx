import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Activity, ExternalLink, Crosshair, ChevronDown, ChevronUp, Rocket, AlertTriangle, Zap, Twitter, MessageSquare, Instagram, Video, Linkedin } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { predictTrendsForAllKeywords } from "@/lib/trendPrediction";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Match {
  id: number;
  title: string | null;
  body: string | null;
  url: string | null;
  subreddit: string | null;
  created_at_utc: string;
  keyword_id: string;
  keywords?: {
    phrase: string;
    is_regex: boolean;
  };
}

interface ChartData {
  date: string;
  dateStr: string; // Original date string (YYYY-MM-DD) for filtering
  matches: number;
}

interface KeywordStats {
  keyword_id: string;
  phrase: string;
  is_regex: boolean;
  match_count: number;
  matches_24h: number;
  matches_7d: number;
  trend_24h: number;
  trend_7d: number;
  trend_percent_24h: number;
  trend_percent_7d: number;
  status: "rising" | "falling" | "stable";
}

interface PainPoint {
  text: string;
  count: number;
  keywords: string[];
  matchIds: number[];
  matches: Match[];
}

interface TrendPrediction {
  keyword: string;
  keywordId: string;
  confidence: number;
  prediction: "exploding" | "rising" | "emerging" | "declining";
  signals: {
    velocity: number;
    acceleration: number;
    askingRatio: number;
    problemRatio: number;
    recentGrowth: number;
    baselineDeviation: number;
  };
  timeline: {
    baseline: number;
    current: number;
    predicted: number;
  };
  reasons: string[];
}

type TimelinePeriod = '24h' | '48h' | '7d' | '30d';

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [timelinePeriod, setTimelinePeriod] = useState<TimelinePeriod>('48h');
  const [showHistoricalWarning, setShowHistoricalWarning] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState<TimelinePeriod | null>(null);
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [topSubreddits, setTopSubreddits] = useState<{ subreddit: string; count: number }[]>([]);
  const [keywordStats, setKeywordStats] = useState<KeywordStats[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [activityStatus, setActivityStatus] = useState<string>("Calculating...");
  const [activityDetails, setActivityDetails] = useState<string>("");
  const [activityStats, setActivityStats] = useState<{ 
    currentPeriod: number; 
    previousPeriod: number;
    avgPeriod: number;
    statusColor: string;
    trendPercent: number;
    trendDirection: "rising" | "falling" | "stable";
    periodLabel: string;
    previousPeriodLabel: string;
    avgLabel: string;
  }>({
    currentPeriod: 0,
    previousPeriod: 0,
    avgPeriod: 0,
    statusColor: "text-yellow-500",
    trendPercent: 0,
    trendDirection: "stable",
    periodLabel: "Last 48h",
    previousPeriodLabel: "Previous 48h",
    avgLabel: "48h avg",
  });
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [expandedPainPoint, setExpandedPainPoint] = useState<number | null>(null);
  const [trendPredictions, setTrendPredictions] = useState<TrendPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [weekMatches, setWeekMatches] = useState<Match[]>([]);
  const [allMatchesForFiltering, setAllMatchesForFiltering] = useState<Match[]>([]);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // Check if user has seen the roadmap before
    const hasSeenRoadmap = localStorage.getItem('hasSeenRoadmap');
    if (!hasSeenRoadmap) {
      // Small delay to ensure dashboard loads first
      setTimeout(() => {
        setShowRoadmap(true);
      }, 500);
    }
  }, [timelinePeriod]); // Re-fetch when timeline period changes

  const handleRoadmapClose = () => {
    setShowRoadmap(false);
    if (dontShowAgain) {
      localStorage.setItem('hasSeenRoadmap', 'true');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
    const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Fetch matches from last 90 days for trend prediction (need more historical data)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: matches, error } = await supabase
      .from("matches")
        .select(`
          *,
          keywords:keyword_id (
            phrase,
            is_regex
          )
        `)
      .eq("user_id", session.user.id)
        .gte("created_at_utc", ninetyDaysAgo.toISOString())
      .order("created_at_utc", { ascending: false });

      // Also fetch total matches (all time)
      const { count: totalCount } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

    if (error) {
        console.error("Error fetching matches:", error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
        // Don't return early - continue with empty matches so Dashboard still renders
        // setLoading(false);
        // return;
    }

    // Process data for chart based on selected timeline period
      // Use UTC dates to avoid timezone issues
      const now = new Date();
      let periodDays = 30;
      let intervalHours = 24; // Default: daily intervals
      
      // Calculate period and interval based on selection
      switch (timelinePeriod) {
        case '24h':
          periodDays = 1;
          intervalHours = 1; // Hourly intervals
          break;
        case '48h':
          periodDays = 2;
          intervalHours = 2; // 2-hour intervals
          break;
        case '7d':
          periodDays = 7;
          intervalHours = 24; // Daily intervals
          break;
        case '30d':
          periodDays = 30;
          intervalHours = 24; // Daily intervals
          break;
      }
      
      const dailyMatches = new Map<string, number>();
      
      // For hourly intervals, round down current time to the nearest interval to ensure alignment
      let startTime = new Date(now);
      if (intervalHours < 24) {
        const currentHour = startTime.getUTCHours();
        const roundedHour = Math.floor(currentHour / intervalHours) * intervalHours;
        startTime.setUTCHours(roundedHour, 0, 0, 0);
      } else {
        startTime.setUTCHours(0, 0, 0, 0);
      }
      
      // Calculate period start - go back periodDays days
      const periodStart = new Date(startTime);
      if (intervalHours < 24) {
        // For hourly intervals, subtract total hours (periodDays * 24)
        periodStart.setUTCHours(periodStart.getUTCHours() - (periodDays * 24));
      } else {
        // For daily intervals, subtract days
        periodStart.setUTCDate(periodStart.getUTCDate() - periodDays);
      }
      
      // Create date/time strings for the period
      // Calculate number of intervals needed (for 48h with 2h intervals = 24 intervals)
      const totalHours = periodDays * 24;
      const intervals = Math.ceil(totalHours / intervalHours);
      
      // Create all interval buckets going backwards from startTime
      // For 48h with 2h intervals: create 24 buckets (48 hours / 2 hours)
      for (let i = 0; i < intervals; i++) {
        const date = new Date(startTime);
        if (intervalHours < 24) {
          // For hourly intervals, subtract hours (handles day boundaries automatically)
          // Calculate hours to subtract
          const hoursToSubtract = i * intervalHours;
          // Subtract hours (JavaScript Date handles day boundaries automatically)
          date.setUTCHours(date.getUTCHours() - hoursToSubtract);
          // Ensure minutes/seconds/milliseconds are 0
          date.setUTCMinutes(0, 0, 0);
          date.setUTCSeconds(0, 0);
          date.setUTCMilliseconds(0);
        } else {
          // For daily intervals, subtract days
          date.setUTCDate(date.getUTCDate() - i);
          date.setUTCHours(0, 0, 0, 0);
        }
        
        // Create a key based on the interval
        let dateStr: string;
        if (intervalHours < 24) {
          // For hourly: "YYYY-MM-DD HH:00"
          // After setUTCHours, the date object has the correct date (handles day boundaries)
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const hour = String(date.getUTCHours()).padStart(2, '0');
          dateStr = `${year}-${month}-${day} ${hour}:00`;
        } else {
          // For daily: "YYYY-MM-DD"
          dateStr = date.toISOString().split('T')[0];
        }
        
        dailyMatches.set(dateStr, 0);
      }

      matches?.forEach(match => {
        // Parse match date - created_at_utc is already in UTC format
        const matchDate = new Date(match.created_at_utc);
        
        // Skip if outside period (use periodStart, not rounded startTime)
        if (matchDate < periodStart) return;
        // Skip if match is in the future (use now, not rounded startTime)
        if (matchDate > now) return;
        
        // Create date key based on interval
        let dateStr: string;
        if (intervalHours < 24) {
          // For hourly intervals, round down to the nearest interval
          // Create a date object with rounded hour to ensure correct day handling
          const roundedDate = new Date(matchDate);
          const currentHour = roundedDate.getUTCHours();
          const roundedHour = Math.floor(currentHour / intervalHours) * intervalHours;
          roundedDate.setUTCHours(roundedHour, 0, 0, 0);
          
          // Use the rounded date to get correct year/month/day (handles day boundaries)
          // After setUTCHours, the date object automatically handles day boundaries
          const year = roundedDate.getUTCFullYear();
          const month = String(roundedDate.getUTCMonth() + 1).padStart(2, '0');
          const day = String(roundedDate.getUTCDate()).padStart(2, '0');
          const hour = String(roundedDate.getUTCHours()).padStart(2, '0');
          dateStr = `${year}-${month}-${day} ${hour}:00`;
        } else {
          // For daily intervals, use date string
          const year = matchDate.getUTCFullYear();
          const month = String(matchDate.getUTCMonth() + 1).padStart(2, '0');
          const day = String(matchDate.getUTCDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
        
        // Only count if the rounded interval exists in our buckets
        // This ensures we only count matches that fall within our intervals
        if (dailyMatches.has(dateStr)) {
          dailyMatches.set(dateStr, (dailyMatches.get(dateStr) || 0) + 1);
        }
      });

      // Format dates for chart - use UTC to avoid month shifting
      // Ensure all dates are included even if they have 0 matches
      const chartArray = Array.from(dailyMatches.entries())
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([dateStr, matches]) => {
          // Parse date string based on format (daily or hourly)
          let formatted: string;
          let displayDate: Date;
          
          if (dateStr.includes(' ')) {
            // Hourly format: "YYYY-MM-DD HH:00"
            const [datePart, timePart] = dateStr.split(' ');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour] = timePart.split(':').map(Number);
            displayDate = new Date(Date.UTC(year, month - 1, day, hour));
            
            // Format based on period
            if (timelinePeriod === '24h') {
              // For 24h, show hour: "2 PM"
              formatted = displayDate.toLocaleTimeString('en-US', { 
                hour: 'numeric',
                timeZone: 'UTC',
                hour12: true
              });
            } else {
              // For 48h, show day and hour: "Nov 12, 2 PM"
              formatted = displayDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                timeZone: 'UTC',
                hour12: true
              });
            }
          } else {
            // Daily format: "YYYY-MM-DD"
            const [year, month, day] = dateStr.split('-').map(Number);
            displayDate = new Date(Date.UTC(year, month - 1, day));
            
            // Format as "Nov 12" using UTC timezone
            formatted = displayDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              timeZone: 'UTC'
            });
          }
          
          return {
            date: formatted,
            dateStr: dateStr, // Keep original date string for filtering
            matches: matches || 0 // Ensure 0 is displayed, not undefined
          };
        })
        .filter(item => item.date); // Filter out any invalid dates

      setChartData(chartArray);
      setTotalMatches(totalCount || 0);
      
      // Flatten keyword data - handle empty matches
      const matchesArray = matches || [];
      const flattenedMatches = matchesArray.map(match => ({
        ...match,
        keywords: Array.isArray(match.keywords) ? match.keywords[0] : match.keywords,
      }));
      
      // Store all matches for filtering (for week view)
      setAllMatchesForFiltering(flattenedMatches);
      
      setTopMatches(flattenedMatches.slice(0, 5));

      // Get current time once for all calculations
      const nowForStats = new Date();

      // Calculate keyword statistics with trend analysis
        const keywordCounts = new Map<string, {
        phrase: string; 
        is_regex: boolean; 
        matches_24h: number;
        matches_prev_24h: number;
        matches_7d: number;
        matches_prev_7d: number;
        all_matches: Match[];
      }>();
      
      flattenedMatches.forEach(match => {
        if (match.keyword_id && match.keywords) {
          const existing = keywordCounts.get(match.keyword_id) || {
            phrase: match.keywords.phrase,
            is_regex: match.keywords.is_regex,
            matches_24h: 0,
            matches_prev_24h: 0,
            matches_7d: 0,
            matches_prev_7d: 0,
            all_matches: [] as Match[],
          };
          existing.all_matches.push(match);
          
          const matchDate = new Date(match.created_at_utc);
          const oneDayAgo = new Date(nowForStats.getTime() - 24 * 60 * 60 * 1000);
          const twoDaysAgo = new Date(nowForStats.getTime() - 48 * 60 * 60 * 1000);
          const sevenDaysAgo = new Date(nowForStats.getTime() - 7 * 24 * 60 * 60 * 1000);
          const fourteenDaysAgo = new Date(nowForStats.getTime() - 14 * 24 * 60 * 60 * 1000);
          
          if (matchDate > oneDayAgo) {
            existing.matches_24h++;
          } else if (matchDate > twoDaysAgo) {
            existing.matches_prev_24h++;
          }
          
          if (matchDate > sevenDaysAgo) {
            existing.matches_7d++;
          } else if (matchDate > fourteenDaysAgo) {
            existing.matches_prev_7d++;
          }
          
          keywordCounts.set(match.keyword_id, existing);
        }
      });
      
      const keywordStatsArray: KeywordStats[] = Array.from(keywordCounts, ([keyword_id, data]) => {
      const trend_24h = data.matches_24h - data.matches_prev_24h;
      const trend_7d = data.matches_7d - data.matches_prev_7d;
      const trend_percent_24h = data.matches_prev_24h > 0 
        ? Math.round((trend_24h / data.matches_prev_24h) * 100)
        : (data.matches_24h > 0 ? 100 : 0);
      const trend_percent_7d = data.matches_prev_7d > 0
        ? Math.round((trend_7d / data.matches_prev_7d) * 100)
        : (data.matches_7d > 0 ? 100 : 0);
      
      let status: "rising" | "falling" | "stable" = "stable";
      if (trend_percent_24h > 10) status = "rising";
      else if (trend_percent_24h < -10) status = "falling";
      
      return {
        keyword_id,
        phrase: data.phrase,
        is_regex: data.is_regex,
        match_count: data.all_matches.length,
        matches_24h: data.matches_24h,
        matches_7d: data.matches_7d,
        trend_24h,
        trend_7d,
        trend_percent_24h,
        trend_percent_7d,
        status,
      };
      }).sort((a, b) => b.match_count - a.match_count);
      
      setKeywordStats(keywordStatsArray);
      
      // Store matches by ID for quick lookup (create outside try block so it's available)
      const matchesById = new Map<number, Match>();
      flattenedMatches.forEach(m => {
        if (m.id) {
          matchesById.set(m.id, m);
        }
      });
      
      console.log(`Created matchesById map with ${matchesById.size} matches from ${flattenedMatches.length} flattened matches`);
      
      // Extract pain points from matches (with improved filtering)
      try {
        const painPointMap = new Map<string, { count: number; keywords: Set<string>; matchIds: Set<number> }>();
        
        // Helper function to aggressively clean text
        const cleanText = (text: string): string => {
          return text
            // Remove HTML tags and comments
            .replace(/<!--[\s\S]*?-->/g, " ")
            .replace(/<[^>]*>/g, " ")
            // Remove HTML entities (both named and numeric)
            .replace(/&[a-z]+;/gi, " ")
            .replace(/&#\d+;/g, " ")
            // Remove URLs
            .replace(/https?:\/\/[^\s]+/g, " ")
            // Remove email addresses
            .replace(/[^\s]+@[^\s]+/g, " ")
            // Remove code-like patterns (format=png, src=, etc.)
            .replace(/[a-z]+=[a-z0-9]+/gi, " ")
            .replace(/[a-z]+:\/\/[^\s]+/gi, " ")
            // Remove file extensions and paths
            .replace(/[a-z]:\\[^\s]+/gi, " ")
            .replace(/\/[^\s]+\.(jpg|png|gif|pdf|zip|exe|js|ts|html|css)/gi, " ")
            // Remove code-like characters
            .replace(/[<>{}[\]\\|`~!@#$%^&*()+=]/g, " ")
            // Remove excessive punctuation
            .replace(/[.,;:]{2,}/g, " ")
            // Normalize whitespace
            .replace(/\s+/g, " ")
            .trim();
        };
        
        // Helper function to validate pain point text
        const isValidPainPoint = (text: string): boolean => {
          // Must have reasonable length
          if (text.length < 20 || text.length > 200) return false;
          
          // Must have at least 3 words
          const words = text.split(/\s+/).filter(w => w.length > 0);
          if (words.length < 3) return false;
          
          // Must not be mostly stop words
          const stopWords = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "this", "that", "these", "those", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "should", "could", "may", "might", "can", "must"];
          const meaningfulWords = words.filter(w => !stopWords.includes(w.toLowerCase()));
          if (meaningfulWords.length < 2) return false;
          
          // Must not contain code-like patterns
          if (text.match(/[a-z]+=[a-z0-9]+/i)) return false; // format=png, src=, etc.
          if (text.match(/<|>|{|}|\[|\]|href|src=|table|tr|td|div|span|class=|id=/i)) return false;
          if (text.match(/[{}[\]\\|]{2,}/)) return false; // Multiple code chars
          
          // Must not be mostly punctuation or numbers
          const letterCount = (text.match(/[a-z]/gi) || []).length;
          if (letterCount < text.length * 0.6) return false; // At least 60% letters
          
          // Must not contain URLs or file paths
          if (text.match(/https?:\/\/|www\.|\.com|\.org|\.net|\.io/i)) return false;
          
          // Must not end with incomplete phrases (common stop words)
          const lastWord = words[words.length - 1].toLowerCase();
          if (["the", "a", "an", "with", "for", "to", "of", "in", "on", "at", "by", "from"].includes(lastWord)) return false;
          
          // Must not start with incomplete phrases
          const firstWord = words[0].toLowerCase();
          if (["that", "this", "very", "much", "some", "any", "all", "each", "every"].includes(firstWord) && words.length < 4) return false;
          
          return true;
        };
        
        flattenedMatches.forEach(match => {
          try {
            // Clean and combine text
            let fullText = `${match.title || ""} ${match.body || ""}`;
            fullText = cleanText(fullText);
            
            // Skip if text is too short or looks like code/HTML
            if (fullText.length < 30) return;
            if (fullText.match(/^[<{[]|table|tr|td|href|src=|format=/i)) return;
            
            const lowerText = fullText.toLowerCase();
            const keywordPhrase = match.keywords?.phrase || "";
            
            // Extract meaningful pain points with better patterns that capture complete thoughts
            const patterns = [
              // Direct needs/wants - capture complete phrases
              {
                regex: /\b(?:need|want|looking for|searching for|trying to find|seeking)\s+(?:a|an|the)?\s+([a-z][^.!?]{20,100}?)(?:[.!?]|\s+(?:that|which|for|to|with|in|on|at|by))\b/gi,
                minLength: 20,
                maxLength: 100,
              },
              // Problems/issues - capture complete problem statements
              {
                regex: /\b(?:problem|issue|bug|broken|doesn't work|not working|frustrated|annoyed|hate|disappointed)\s+(?:with|about|that)\s+([a-z][^.!?]{20,100}?)(?:[.!?]|\s+(?:because|when|if|that|which))\b/gi,
                minLength: 20,
                maxLength: 100,
              },
              // Too expensive/slow/etc - capture complete complaints
              {
                regex: /\b(?:too|very|really)\s+(?:expensive|slow|complicated|hard|difficult|confusing|buggy|unreliable)\s+([a-z][^.!?]{15,80}?)(?:[.!?]|\s+(?:for|to|when|if|that))\b/gi,
                minLength: 15,
                maxLength: 80,
              },
              // Missing features - capture what's missing
              {
                regex: /\b(?:missing|lack|don't have|need|wish.*had)\s+([a-z][^.!?]{20,100}?)(?:[.!?]|\s+(?:that|which|for|to|in|on|at))\b/gi,
                minLength: 20,
                maxLength: 100,
              },
              // Recommendations/alternatives - capture what they're asking for
              {
                regex: /\b(?:recommend|suggest|alternative|better|best)\s+(?:a|an|the)?\s*([a-z][^.!?]{20,100}?)(?:[.!?]|\s+(?:for|to|that|which|in|on|at))\b/gi,
                minLength: 20,
                maxLength: 100,
              },
              // Questions about needs - capture the question
              {
                regex: /\b(?:anyone know|does anyone|can someone|where can|what.*recommend|any.*recommendations?)\s+(?:a|an|the)?\s*([a-z][^.!?]{20,100}?)(?:\?|\.|!|\s+(?:that|which|for|to))\b/gi,
                minLength: 20,
                maxLength: 100,
              },
              // Wish statements
              {
                regex: /\b(?:wish|hope|would love|would like)\s+(?:that|to|a|an|the)?\s*([a-z][^.!?]{20,100}?)(?:[.!?]|\s+(?:had|would|could|should|that|which))\b/gi,
                minLength: 20,
                maxLength: 100,
              },
            ];
            
            for (const { regex, minLength, maxLength } of patterns) {
              try {
                // Create a new regex instance to avoid issues
                const patternRegex = new RegExp(regex.source, regex.flags);
                const patternMatches = Array.from(lowerText.matchAll(patternRegex));
                
                for (const patternMatch of patternMatches) {
                  let painText = (patternMatch[1] || "").trim();
                  
                  if (!painText) continue;
                  
                  // Clean the extracted text
                  painText = cleanText(painText);
                  
                  // Remove common stop words at start and end
                  painText = painText.replace(/^(?:a|an|the|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|may|might|can|must|that|this|very|much|some|any)\s+/i, "");
                  painText = painText.replace(/\s+(?:the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|may|might|can|must|that|this|very|much|some|any|with|for|to|of|in|on|at|by|from)$/i, "");
                  
                  // Skip if too short/long after cleaning
                  if (painText.length < minLength || painText.length > maxLength) continue;
                  
                  // Validate the pain point
                  if (!isValidPainPoint(painText)) continue;
                  
                  // Normalize (remove extra spaces, lowercase)
                  const normalized = painText
                    .replace(/\s+/g, " ")
                    .trim()
                    .toLowerCase();
                  
                  if (normalized.length >= minLength && normalized.length <= maxLength && isValidPainPoint(normalized)) {
                    const existing = painPointMap.get(normalized) || { count: 0, keywords: new Set<string>(), matchIds: new Set<number>() };
                    existing.count++;
                    existing.keywords.add(keywordPhrase);
                    if (match.id) {
                      existing.matchIds.add(match.id);
                    } else {
                      console.warn(`Match has no ID:`, match);
                    }
                    painPointMap.set(normalized, existing);
                  }
                }
              } catch (e) {
                console.warn("Error processing pain point pattern:", e);
              }
            }
          } catch (e) {
            console.warn("Error processing match for pain points:", e);
          }
        });
        
        // Convert to array, filter, and format
        const painPointsArray: PainPoint[] = Array.from(painPointMap, ([text, data]) => {
          // Capitalize first letter and fix sentence structure
          let formatted = text.charAt(0).toUpperCase() + text.slice(1);
          // Ensure it doesn't end with a comma or incomplete word
          formatted = formatted.replace(/,\s*$/, "").trim();
          
          // Get matches that contain this pain point - use the matchesById map for reliable lookup
          const matchIds = Array.from(data.matchIds);
          const matches: Match[] = [];
          matchIds.forEach(id => {
            const match = matchesById.get(id);
            if (match) {
              matches.push(match);
            } else {
              console.warn(`Match ID ${id} (type: ${typeof id}) not found in matchesById map. Map has ${matchesById.size} entries.`);
            }
          });
          
          if (matches.length === 0 && matchIds.length > 0) {
            console.warn(`Pain point "${formatted}" has ${matchIds.length} match IDs but found 0 matches. IDs:`, matchIds);
          }
          
          return {
            text: formatted,
            count: data.count,
            keywords: Array.from(data.keywords),
            matchIds: matchIds,
            matches: matches,
          };
        })
          .filter(p => {
            // Final quality checks
            if (p.count < 2) return false;
            if (p.text.split(/\s+/).length < 3) return false;
            if (!isValidPainPoint(p.text.toLowerCase())) return false;
            
            // Filter out obviously bad pain points
            const badPatterns = [
              /format=/i,
              /src=/i,
              /href=/i,
              /class=/i,
              /id=/i,
              /^that very much/i,
              /^someone hungry, with$/i,
              /^ceo, must be/i,
              /^very much/i,
              /^much format/i,
            ];
            
            if (badPatterns.some(pattern => pattern.test(p.text))) return false;
            
            return true;
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 pain points
        
        setPainPoints(painPointsArray);
      } catch (error) {
        console.error("Error extracting pain points:", error);
        setPainPoints([]); // Set empty array on error
      }

    // Calculate top 3 subreddits
    const subredditCounts = new Map<string, number>();
      flattenedMatches.forEach(match => {
      if (match.subreddit) {
        subredditCounts.set(match.subreddit, (subredditCounts.get(match.subreddit) || 0) + 1);
      }
    });
    const sortedSubreddits = Array.from(subredditCounts, ([subreddit, count]) => ({ subreddit, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    setTopSubreddits(sortedSubreddits);

      // Calculate activity status based on selected timeline period
      let currentPeriod: number;
      let previousPeriod: number;
      let avgPeriod: number;
      let periodLabel: string;
      let previousPeriodLabel: string;
      let avgLabel: string;
      
      // Calculate based on selected period
      if (timelinePeriod === '24h') {
        periodLabel = "Last 24h";
        previousPeriodLabel = "Previous 24h";
        avgLabel = "24h avg";
        
        const oneDayAgo = new Date(nowForStats.getTime() - 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(nowForStats.getTime() - 48 * 60 * 60 * 1000);
        
        currentPeriod = flattenedMatches.filter(m => {
          const matchDate = new Date(m.created_at_utc);
          return matchDate > oneDayAgo;
        }).length;
        
        previousPeriod = flattenedMatches.filter(m => {
          const matchDate = new Date(m.created_at_utc);
          return matchDate > twoDaysAgo && matchDate <= oneDayAgo;
        }).length;
        
        avgPeriod = currentPeriod / 24; // Matches per hour
      } else if (timelinePeriod === '48h') {
        periodLabel = "Last 48h";
        previousPeriodLabel = "Previous 48h";
        avgLabel = "48h avg";
        
        const twoDaysAgo = new Date(nowForStats.getTime() - 48 * 60 * 60 * 1000);
        const fourDaysAgo = new Date(nowForStats.getTime() - 96 * 60 * 60 * 1000);
        
        currentPeriod = flattenedMatches.filter(m => {
          const matchDate = new Date(m.created_at_utc);
          return matchDate > twoDaysAgo;
        }).length;
        
        previousPeriod = flattenedMatches.filter(m => {
          const matchDate = new Date(m.created_at_utc);
          return matchDate > fourDaysAgo && matchDate <= twoDaysAgo;
        }).length;
        
        avgPeriod = currentPeriod / 48; // Matches per hour
      } else if (timelinePeriod === '7d') {
        periodLabel = "Last 7d";
        previousPeriodLabel = "Previous 7d";
        avgLabel = "7d avg";
        
        const sevenDaysAgo = new Date(nowForStats.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(nowForStats.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        currentPeriod = flattenedMatches.filter(m => {
          const matchDate = new Date(m.created_at_utc);
          return matchDate > sevenDaysAgo;
        }).length;
        
        previousPeriod = flattenedMatches.filter(m => {
          const matchDate = new Date(m.created_at_utc);
          return matchDate > fourteenDaysAgo && matchDate <= sevenDaysAgo;
        }).length;
        
        avgPeriod = currentPeriod / 7; // Matches per day
      } else {
        // 30d
        periodLabel = "Last 30d";
        previousPeriodLabel = "Previous 30d";
        avgLabel = "30d avg";
        
        const thirtyDaysAgo = new Date(nowForStats.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(nowForStats.getTime() - 60 * 24 * 60 * 60 * 1000);
        
        currentPeriod = flattenedMatches.filter(m => {
          const matchDate = new Date(m.created_at_utc);
          return matchDate > thirtyDaysAgo;
        }).length;
        
        previousPeriod = flattenedMatches.filter(m => {
          const matchDate = new Date(m.created_at_utc);
          return matchDate > sixtyDaysAgo && matchDate <= thirtyDaysAgo;
        }).length;
        
        avgPeriod = currentPeriod / 30; // Matches per day
      }

      // Calculate trend
      const trend = currentPeriod - previousPeriod;
      const trendPercent = previousPeriod > 0 ? Math.round((trend / previousPeriod) * 100) : (currentPeriod > 0 ? 100 : 0);
      const trendDirection = trendPercent > 10 ? "rising" : trendPercent < -10 ? "falling" : "stable";

      // Determine status based on selected period
      let status = "Moderate";
      let statusColor = "text-yellow-500";
      let details = "";

      if (currentPeriod === 0) {
        if (avgPeriod === 0) {
          status = "Inactive";
          statusColor = "text-gray-500";
          details = `No matches in the last ${timelinePeriod === '24h' ? '24 hours' : timelinePeriod === '48h' ? '48 hours' : timelinePeriod === '7d' ? '7 days' : '30 days'}`;
        } else {
          status = "Quiet";
          statusColor = "text-gray-400";
          details = `No matches in last ${timelinePeriod === '24h' ? '24h' : timelinePeriod === '48h' ? '48h' : timelinePeriod === '7d' ? '7d' : '30d'}, but activity in previous period`;
        }
      } else if (currentPeriod >= avgPeriod * 2 && currentPeriod >= 5) {
        status = "Very Active";
        statusColor = "text-red-500";
        const periodText = timelinePeriod === '24h' ? '24h' : timelinePeriod === '48h' ? '48h' : timelinePeriod === '7d' ? '7d' : '30d';
        details = `${currentPeriod} matches (${trendPercent >= 0 ? '+' : ''}${trendPercent}% vs previous ${periodText}) ${trendDirection === "rising" ? "RISING" : trendDirection === "falling" ? "FALLING" : ""}`;
      } else if (currentPeriod >= avgPeriod * 1.5) {
        status = "Active";
        statusColor = "text-primary";
        const periodText = timelinePeriod === '24h' ? '24h' : timelinePeriod === '48h' ? '48h' : timelinePeriod === '7d' ? '7d' : '30d';
        details = `${currentPeriod} matches (${trendPercent >= 0 ? '+' : ''}${trendPercent}% vs previous ${periodText}) ${trendDirection === "rising" ? "RISING" : trendDirection === "falling" ? "FALLING" : ""}`;
      } else if (currentPeriod >= avgPeriod) {
        status = "Moderate";
        statusColor = "text-yellow-500";
        if (timelinePeriod === '24h' || timelinePeriod === '48h') {
          details = `${currentPeriod} matches (avg: ${avgPeriod.toFixed(1)}/hour)`;
        } else {
          details = `${currentPeriod} matches (avg: ${avgPeriod.toFixed(1)}/day)`;
        }
      } else if (currentPeriod >= avgPeriod * 0.5) {
        status = "Below Average";
        statusColor = "text-blue-400";
        if (timelinePeriod === '24h' || timelinePeriod === '48h') {
          details = `${currentPeriod} matches (avg: ${avgPeriod.toFixed(1)}/hour)`;
        } else {
          details = `${currentPeriod} matches (avg: ${avgPeriod.toFixed(1)}/day)`;
        }
      } else {
        status = "Low Activity";
        statusColor = "text-blue-600";
        if (timelinePeriod === '24h' || timelinePeriod === '48h') {
          details = `${currentPeriod} matches (avg: ${avgPeriod.toFixed(1)}/hour)`;
        } else {
          details = `${currentPeriod} matches (avg: ${avgPeriod.toFixed(1)}/day)`;
        }
      }

      setActivityStatus(status);
      setActivityDetails(details);
      setActivityStats({
        currentPeriod,
        previousPeriod,
        avgPeriod,
        statusColor,
        trendPercent,
        trendDirection,
        periodLabel,
        previousPeriodLabel,
        avgLabel,
      });
      
      // Predict trends in background (don't block Dashboard loading)
      // This runs async so Dashboard loads immediately
      try {
        const { data: keywordsData } = await supabase
          .from("keywords")
          .select("id, phrase, is_regex, created_at")
          .eq("user_id", session.user.id);
        
        // Fetch scan history for trend prediction validation
        // We need to check that keywords have 14 days of data from creation date
        const { data: scanHistory, error: scanHistoryError } = await supabase
          .from("daily_scans")
          .select("scan_date")
          .eq("user_id", session.user.id)
          .order("scan_date", { ascending: true });
        
        // Only predict trends if we have keywords and scan history
        if (keywordsData && keywordsData.length > 0) {
          const matchesForPrediction = flattenedMatches.map(m => ({
            id: m.id,
            title: m.title,
            body: m.body,
            created_at_utc: m.created_at_utc,
            keyword_id: m.keyword_id,
            keywords: m.keywords,
          }));
          
          // Run in background - don't await
          // Pass scan history so we can validate 14-day requirement per keyword
          predictTrendsForAllKeywords(keywordsData, matchesForPrediction, scanHistory || [])
            .then(predictions => {
              setTrendPredictions(predictions);
              console.log(`✅ Generated ${predictions.length} trend predictions`);
            })
            .catch(error => {
              console.error("Error predicting trends (non-blocking):", error);
              // Don't show error to user - just log it
            });
        } else {
          setTrendPredictions([]);
        }
      } catch (error) {
        // Ignore trend prediction errors - don't break Dashboard
        console.error("Error setting up trend prediction (non-blocking):", error);
      }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error loading dashboard",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
    setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (activityStatus) {
      case "Very Active":
      case "Active":
        return <TrendingUp className="w-8 h-8 text-red-500" />;
      case "Low Activity":
      case "Below Average":
      case "Inactive":
        return <TrendingDown className="w-8 h-8 text-blue-500" />;
      default:
        return <Activity className="w-8 h-8 text-yellow-500" />;
    }
  };

  const cleanHtml = (text: string | null): string => {
    if (!text) return "";
    return text
      // Remove HTML comments first (before removing tags)
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove all HTML tags (including <div>, <p>, <strong>, etc.)
      .replace(/<[^>]*>/g, "")
      // Decode numeric HTML entities (e.g., &#32; = space, &#39; = ')
      .replace(/&#\d+;/g, (match) => {
        const num = parseInt(match.replace(/[&#;]/g, ""));
        return String.fromCharCode(num);
      })
      // Decode hexadecimal HTML entities (e.g., &#x27; = ', &#x2F; = /)
      .replace(/&#x[0-9A-Fa-f]+;/g, (match) => {
        const hex = match.replace(/[&#x;]/gi, "");
        const num = parseInt(hex, 16);
        return String.fromCharCode(num);
      })
      // Decode named HTML entities (must be after numeric to avoid double decoding)
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&hellip;/g, "...")
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      // Normalize whitespace (multiple spaces, newlines, tabs -> single space)
      .replace(/\s+/g, " ")
      .trim();
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return "";
    const cleaned = cleanHtml(text);
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + "..." : cleaned;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
            Track trends, validate demand, and catch opportunities in real-time
          </p>
        </div>
        <Button 
          onClick={() => navigate("/app/matches")}
          className="gradient-primary"
        >
          <Crosshair className="w-4 h-4 mr-2" />
          View All Matches
        </Button>
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
              <div className={`text-4xl font-bold mb-2 ${activityStats.statusColor}`}>
                {activityStatus}
              </div>
              <p className="text-muted-foreground mb-2">
                {activityDetails || "Analyzing activity patterns..."}
              </p>
              <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="font-medium">{activityStats.periodLabel}</div>
                    <div className="text-lg font-bold">{activityStats.currentPeriod} matches</div>
                    {activityStats.trendPercent !== 0 && (
                      <div className={`text-xs mt-1 flex items-center gap-1 ${
                        activityStats.trendDirection === "rising" ? "text-red-400" : 
                        activityStats.trendDirection === "falling" ? "text-blue-400" : 
                        "text-muted-foreground"
                      }`}>
                        {activityStats.trendDirection === "rising" ? <TrendingUp className="w-3 h-3" /> : 
                         activityStats.trendDirection === "falling" ? <TrendingDown className="w-3 h-3" /> : null}
                        {activityStats.trendPercent >= 0 ? '+' : ''}{activityStats.trendPercent}% vs {activityStats.previousPeriodLabel.toLowerCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{activityStats.avgLabel}</div>
                    <div className="text-lg font-bold">
                      {timelinePeriod === '24h' || timelinePeriod === '48h' 
                        ? `${activityStats.avgPeriod.toFixed(1)}/hour`
                        : `${activityStats.avgPeriod.toFixed(1)}/day`}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Total</div>
                    <div className="text-lg font-bold">{totalMatches} matches</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Match Trend */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle>
                      {timelinePeriod === '24h' ? 'Last 24 Hours' :
                       timelinePeriod === '48h' ? 'Last 48 Hours' :
                       timelinePeriod === '7d' ? 'Last 7 Days' :
                       'Last 30 Days'}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={timelinePeriod === '24h' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setTimelinePeriod('24h');
                          setSelectedWeek(null);
                          setWeekMatches([]);
                        }}
                      >
                        24h
                      </Button>
                      <Button
                        variant={timelinePeriod === '48h' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setTimelinePeriod('48h');
                          setSelectedWeek(null);
                          setWeekMatches([]);
                        }}
                      >
                        48h
                      </Button>
                      <Button
                        variant={timelinePeriod === '7d' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setPendingPeriod('7d');
                          setShowHistoricalWarning(true);
                        }}
                      >
                        7d
                      </Button>
                      <Button
                        variant={timelinePeriod === '30d' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setPendingPeriod('30d');
                          setShowHistoricalWarning(true);
                        }}
                      >
                        30d
                      </Button>
                    </div>
                  </div>
                  <CardDescription>Keyword matches over time</CardDescription>
                </div>
                <div className="text-right ml-4">
                  <div className="text-3xl font-bold">{totalMatches}</div>
                  <div className="text-sm text-muted-foreground">Total Matches</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={chartData}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload[0]) {
                        const clickedItem = data.activePayload[0].payload;
                        const clickedDate = clickedItem.dateStr;
                        if (!clickedDate) return;
                        
                        let periodStart: Date;
                        let periodEnd: Date;
                        let periodLabel: string;
                        
                        if (timelinePeriod === '24h' || timelinePeriod === '48h') {
                          // For hourly periods, show matches from that hour
                          if (clickedDate.includes(' ')) {
                            const [datePart, timePart] = clickedDate.split(' ');
                            const [year, month, day] = datePart.split('-').map(Number);
                            const [hour] = timePart.split(':').map(Number);
                            periodStart = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
                            periodEnd = new Date(Date.UTC(year, month - 1, day, hour + (timelinePeriod === '24h' ? 1 : 2), 0, 0));
                            
                            const formattedHour = periodStart.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              hour12: true, 
                              timeZone: 'UTC' 
                            });
                            const formattedDate = periodStart.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              timeZone: 'UTC' 
                            });
                            periodLabel = `${formattedDate} at ${formattedHour}`;
                          } else {
                            return; // Should not happen for hourly views
                          }
                        } else if (timelinePeriod === '7d') {
                          // For 7d, show matches from that day
                          const clickedDateObj = new Date(clickedDate + 'T00:00:00Z');
                          periodStart = new Date(clickedDateObj);
                          periodStart.setUTCHours(0, 0, 0, 0);
                          periodEnd = new Date(clickedDateObj);
                          periodEnd.setUTCHours(23, 59, 59, 999);
                          
                          periodLabel = clickedDateObj.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            timeZone: 'UTC' 
                          });
                        } else {
                          // For 30d, show matches from that week
                          const clickedDateObj = new Date(clickedDate + 'T00:00:00Z');
                          periodStart = new Date(clickedDateObj);
                          periodStart.setUTCDate(periodStart.getUTCDate() - periodStart.getUTCDay()); // Start of week (Sunday)
                          periodStart.setUTCHours(0, 0, 0, 0);
                          periodEnd = new Date(periodStart);
                          periodEnd.setUTCDate(periodEnd.getUTCDate() + 6); // End of week (Saturday)
                          periodEnd.setUTCHours(23, 59, 59, 999);
                          
                          periodLabel = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} to ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
                        }
                        
                        // Filter matches for this period
                        const periodMatchesFiltered = allMatchesForFiltering.filter(match => {
                          const matchDate = new Date(match.created_at_utc);
                          return matchDate >= periodStart && matchDate <= periodEnd;
                        });
                        
                        setSelectedWeek(periodLabel);
                        setWeekMatches(periodMatchesFiltered);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
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
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: timelinePeriod === '24h' || timelinePeriod === '48h' ? 10 : 12 }}
                      angle={timelinePeriod === '24h' || timelinePeriod === '48h' ? -90 : -45}
                      textAnchor="end"
                      height={timelinePeriod === '24h' || timelinePeriod === '48h' ? 100 : 80}
                      interval={timelinePeriod === '24h' ? 2 : timelinePeriod === '48h' ? 4 : 0} // Show fewer labels for hourly views
                      tickFormatter={(value) => {
                        // Ensure dates are displayed correctly
                        if (!value) return '';
                        // Value is already formatted from the chart data
                        return value;
                      }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))'
                      }}
                      labelFormatter={() => {
                        if (timelinePeriod === '24h' || timelinePeriod === '48h') {
                          return 'Click to see posts from this hour';
                        } else if (timelinePeriod === '7d') {
                          return 'Click to see posts from this day';
                        } else {
                          return 'Click to see posts from this week';
                        }
                      }}
                      formatter={(value: number) => [`${value} match${value !== 1 ? 'es' : ''}`, 'Matches']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="matches" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorMatches)"
                      strokeWidth={2}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Week Matches (shown when clicking on timeline) */}
          {selectedWeek && weekMatches.length > 0 && (
            <Card className="glass-card border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-primary" />
                    Posts from {selectedWeek}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedWeek(null);
                      setWeekMatches([]);
                    }}
                  >
                    ✕
                  </Button>
                </CardTitle>
                <CardDescription>
                  {weekMatches.length} match{weekMatches.length !== 1 ? 'es' : ''} found
                  {timelinePeriod === '24h' || timelinePeriod === '48h' ? ' in this hour' : 
                   timelinePeriod === '7d' ? ' on this day' : ' in this week'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {weekMatches.slice(0, 20).map((match) => (
                    <div
                      key={match.id}
                      className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                            {cleanHtml(match.title) || 'No title'}
                          </h4>
                          {match.body && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {truncateText(match.body, 150)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {match.subreddit && (
                              <span className="font-medium">r/{match.subreddit}</span>
                            )}
                            <span>•</span>
                            <span>{new Date(match.created_at_utc).toLocaleDateString()}</span>
                            {match.url && (
                              <>
                                <span>•</span>
                                <a
                                  href={match.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  View
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {weekMatches.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing first 20 of {weekMatches.length} matches. View all in Matches page.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trend Predictions */}
          <Card className="glass-card border-2 border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-6 h-6 text-primary" />
                Trend Predictions
              </CardTitle>
              <CardDescription>
                Statistical trend analysis using historical data and multi-signal detection. Only showing high-confidence predictions (70%+).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendPredictions.length > 0 ? (
                <div className="space-y-4">
                  {trendPredictions.map((prediction) => {
                    const getPredictionColor = () => {
                      switch (prediction.prediction) {
                        case "exploding":
                          return "bg-red-500/20 text-red-400 border-red-500/50";
                        case "rising":
                          return "bg-orange-500/20 text-orange-400 border-orange-500/50";
                        case "emerging":
                          return "bg-blue-500/20 text-blue-400 border-blue-500/50";
                        case "declining":
                          return "bg-gray-500/20 text-gray-400 border-gray-500/50";
                        default:
                          return "bg-primary/20 text-primary border-primary/50";
                      }
                    };
                    
                    const getPredictionIcon = () => {
                      switch (prediction.prediction) {
                        case "exploding":
                          return <Rocket className="w-5 h-5" />;
                        case "rising":
                          return <TrendingUp className="w-5 h-5" />;
                        case "emerging":
                          return <Zap className="w-5 h-5" />;
                        case "declining":
                          return <TrendingDown className="w-5 h-5" />;
                        default:
                          return <Activity className="w-5 h-5" />;
                      }
                    };
                    
                    return (
                      <div
                        key={prediction.keywordId}
                        className={`p-5 rounded-lg border-2 ${getPredictionColor()}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getPredictionIcon()}
                            <div>
                              <div className="font-bold text-lg mb-1">{prediction.keyword}</div>
                              <Badge variant="secondary" className="mt-1">
                                {prediction.confidence}% confidence
                              </Badge>
                            </div>
                          </div>
                          <Badge className={`capitalize ${getPredictionColor()}`}>
                            {prediction.prediction}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Baseline</div>
                            <div className="font-semibold">{prediction.timeline.baseline.toFixed(1)}/day</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Current</div>
                            <div className="font-semibold">{prediction.timeline.current.toFixed(1)}/day</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Predicted</div>
                            <div className="font-semibold text-primary">{prediction.timeline.predicted.toFixed(1)}/day</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Growth</div>
                            <div className={`font-semibold ${prediction.signals.recentGrowth > 0 ? "text-green-400" : "text-red-400"}`}>
                              {prediction.signals.recentGrowth >= 0 ? '+' : ''}{prediction.signals.recentGrowth.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="text-sm font-medium">Key Signals:</div>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {prediction.reasons.slice(0, 3).map((reason, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {prediction.signals.askingRatio > 20 && (
                          <div className="mt-3 p-2 rounded bg-blue-500/10 text-blue-400 text-xs">
                            <strong>Strong demand signal:</strong> {prediction.signals.askingRatio.toFixed(0)}% of mentions are people asking for solutions
                          </div>
                        )}
                        
                        {prediction.signals.problemRatio > 15 && (
                          <div className="mt-2 p-2 rounded bg-orange-500/10 text-orange-400 text-xs">
                            <strong>Opportunity signal:</strong> {prediction.signals.problemRatio.toFixed(0)}% of mentions are complaints about existing solutions
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Rocket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">No trend predictions yet</p>
                  <p className="text-sm">
                    Trend predictions require at least 14 days of scans to build accurate baselines.
                    <br />
                    Predictions appear when we detect high-confidence signals (70%+ confidence) based on your scanning history.
                  </p>
                  <div className="mt-4 text-xs space-y-1">
                    <p>How it works:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Requires 14 days of actual scans (not just historical data)</li>
                      <li>Compares your current matches against your historical patterns</li>
                      <li>Detects acceleration, demand signals, and growth patterns</li>
                      <li>Only shows high-confidence predictions (70%+ threshold)</li>
                    </ul>
                    <p className="mt-3 text-muted-foreground">
                      Keep scanning daily to build your baseline and unlock trend predictions!
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Keyword Breakdown with Trends */}
          {keywordStats.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Keyword Performance</CardTitle>
                <CardDescription>Track trends: rising, falling, or stable demand</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {keywordStats.map((stat, index) => (
                    <div key={stat.keyword_id} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {stat.phrase}
                              {stat.is_regex && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                  regex
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {stat.status === "rising" && (
                            <div className="flex items-center gap-1 text-red-400 text-sm font-medium">
                              <TrendingUp className="w-4 h-4" />
                              <span>RISING</span>
                            </div>
                          )}
                          {stat.status === "falling" && (
                            <div className="flex items-center gap-1 text-blue-400 text-sm font-medium">
                              <TrendingDown className="w-4 h-4" />
                              <span>FALLING</span>
                            </div>
                          )}
                          {stat.status === "stable" && (
                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                              <Activity className="w-4 h-4" />
                              <span>STABLE</span>
                            </div>
                          )}
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {stat.match_count} match{stat.match_count !== 1 ? 'es' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground ml-11">
                        <div>
                          <div>Last 24h</div>
                          <div className="font-medium text-foreground">{stat.matches_24h} matches</div>
                          {stat.trend_percent_24h !== 0 && (
                            <div className={`text-xs mt-0.5 ${
                              stat.trend_percent_24h > 0 ? "text-red-400" : "text-blue-400"
                            }`}>
                              {stat.trend_percent_24h >= 0 ? '+' : ''}{stat.trend_percent_24h}% vs yesterday
                            </div>
                          )}
                        </div>
                        <div>
                          <div>Last 7 days</div>
                          <div className="font-medium text-foreground">{stat.matches_7d} matches</div>
                          {stat.trend_percent_7d !== 0 && (
                            <div className={`text-xs mt-0.5 ${
                              stat.trend_percent_7d > 0 ? "text-red-400" : "text-blue-400"
                            }`}>
                              {stat.trend_percent_7d >= 0 ? '+' : ''}{stat.trend_percent_7d}% vs previous week
                            </div>
                          )}
                        </div>
                        <div>
                          <div>All time</div>
                          <div className="font-medium text-foreground">{stat.match_count} total</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pain Points Extraction */}
          {painPoints.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pain Points Detected</CardTitle>
                    <CardDescription>Common complaints and needs extracted from matches</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/app/matches?tab=problems")}
                    className="flex items-center gap-2"
                  >
                    <Crosshair className="w-4 h-4" />
                    View All Complaints
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {painPoints.map((pain, index) => (
                    <Collapsible 
                      key={index} 
                      open={expandedPainPoint === index}
                      onOpenChange={(open) => setExpandedPainPoint(open ? index : null)}
                    >
                      <div className="p-4 rounded-lg border border-border bg-red-500/5 border-red-500/20">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 text-left">
                              <div className="font-medium text-foreground mb-1 flex items-center gap-2">
                                {pain.text}
                                {expandedPainPoint === index ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Mentioned {pain.count} time{pain.count !== 1 ? 's' : ''} across {pain.keywords.length} keyword{pain.keywords.length !== 1 ? 's' : ''} • {pain.matches.length} post{pain.matches.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium ml-3">
                              {pain.count}x
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pain.keywords.slice(0, 3).map((keyword, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                                {keyword}
                              </span>
                            ))}
                            {pain.keywords.length > 3 && (
                              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">
                                +{pain.keywords.length - 3} more
                              </span>
                            )}
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="mt-4">
                          <div className="pt-4 border-t border-border">
                            <div className="text-sm font-medium mb-3 text-muted-foreground">
                              Source Posts ({pain.matches.length}):
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {pain.matches.slice(0, 10).map((match) => (
                                <div 
                                  key={match.id}
                                  className="p-3 rounded-lg border border-border bg-background/50 hover:border-primary/50 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        {match.subreddit && (
                                          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                                            r/{match.subreddit}
                                          </span>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(match.created_at_utc).toLocaleDateString()}
                                        </span>
                                        {match.keywords && (
                                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs">
                                            {match.keywords.phrase}
                                          </span>
                                        )}
                                      </div>
                                      {match.title && (
                                        <h4 className="font-semibold mb-1 text-sm line-clamp-2">
                                          {cleanHtml(match.title)}
                                        </h4>
                                      )}
                                      {match.body && (
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                          {truncateText(match.body, 200)}
                                        </p>
                                      )}
                                    </div>
                                    {match.url && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(match.url!, "_blank");
                                        }}
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {pain.matches.length > 10 && (
                                <div className="text-center text-sm text-muted-foreground pt-2">
                                  ...and {pain.matches.length - 10} more post{pain.matches.length - 10 !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                            <h4 className="font-semibold mb-1">{cleanHtml(match.title)}</h4>
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

      {/* Historical Data Warning Dialog */}
      <AlertDialog open={showHistoricalWarning} onOpenChange={setShowHistoricalWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Historical Data Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                <strong>{pendingPeriod === '7d' ? '7-day' : '30-day'} analysis</strong> works best when you have actual scan data from those periods.
              </p>
              <p>
                Historical data quality may be limited if you haven't been scanning regularly during that time period. For accurate {pendingPeriod === '7d' ? '7-day' : '30-day'} analysis, make sure you've been running scans consistently.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Tip:</strong> Use <strong>24h</strong> or <strong>48h</strong> views for real-time activity monitoring with the most accurate data.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowHistoricalWarning(false);
              setPendingPeriod(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPeriod) {
                  setTimelinePeriod(pendingPeriod);
                  setSelectedWeek(null);
                  setWeekMatches([]);
                }
                setShowHistoricalWarning(false);
                setPendingPeriod(null);
              }}
            >
              Continue Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Roadmap / Coming Soon Dialog */}
      <Dialog open={showRoadmap} onOpenChange={(open) => {
        if (!open) {
          handleRoadmapClose();
        } else {
          setShowRoadmap(open);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Rocket className="w-6 h-6 text-primary" />
              What's Coming Next
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              We're constantly working to expand our platform and add new features. Here's what we're building next:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Coming Soon Features */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Coming Soon</h3>
              
              {/* Twitter Matches */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                  <Twitter className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    Twitter Matches
                    <Badge variant="secondary" className="text-xs">Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track keyword mentions and conversations on Twitter in real-time
                  </p>
                </div>
              </div>

              {/* Reddit Comments */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    Reddit Comments
                    <Badge variant="secondary" className="text-xs">Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Monitor comments in Reddit threads, not just posts, for deeper insights
                  </p>
                </div>
              </div>
            </div>

            {/* Future Features */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">In The Future</h3>
              
              {/* Instagram */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 opacity-75">
                <div className="p-2 rounded-full bg-muted mt-0.5">
                  <Instagram className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2 text-muted-foreground">
                    Instagram
                    <Badge variant="outline" className="text-xs">Future</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track mentions and conversations on Instagram posts and stories
                  </p>
                </div>
              </div>

              {/* TikTok */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 opacity-75">
                <div className="p-2 rounded-full bg-muted mt-0.5">
                  <Video className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2 text-muted-foreground">
                    TikTok
                    <Badge variant="outline" className="text-xs">Future</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Monitor trending topics and keyword mentions on TikTok
                  </p>
                </div>
              </div>

              {/* LinkedIn */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 opacity-75">
                <div className="p-2 rounded-full bg-muted mt-0.5">
                  <Linkedin className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2 text-muted-foreground">
                    LinkedIn
                    <Badge variant="outline" className="text-xs">Future</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track professional conversations and industry discussions on LinkedIn
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <div className="flex items-center gap-2 mr-auto">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              />
              <Label
                htmlFor="dont-show-again"
                className="text-sm font-normal cursor-pointer text-muted-foreground"
              >
                Don't show this again
              </Label>
            </div>
            <Button onClick={handleRoadmapClose} className="w-full sm:w-auto">
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
