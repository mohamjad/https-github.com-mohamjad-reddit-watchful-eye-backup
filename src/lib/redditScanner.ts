/**
 * Hybrid scanning: Reddit RSS from browser (user's IP), Twitter from Edge Function (secure keys)
 */

import { supabase } from "@/integrations/supabase/client";
import { fetchRedditRSS, matchesKeyword, type RedditRSSPost } from "./redditRSSClient";

export interface ScanResult {
  message: string;
  matches: number;
  newMatches: number;
}

/**
 * Scan Reddit RSS feeds from browser (uses user's IP, no API keys)
 * Then send results to Edge Function for Twitter
 */
export const scanReddit = async (sourceId?: string): Promise<ScanResult> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  try {
    console.log("🔍 Starting hybrid scan...");
    
    // Step 1: Fetch keywords and sources
    const { data: keywords } = await supabase
      .from("keywords")
      .select("*")
      .eq("user_id", session.user.id);

    if (!keywords || keywords.length === 0) {
      return {
        message: "No keywords found",
        matches: 0,
        newMatches: 0,
      };
    }

    console.log(`📝 Found ${keywords.length} keywords`);

    const sourceQuery = supabase
      .from("sources")
      .select("*")
      .eq("user_id", session.user.id);

    if (sourceId) {
      sourceQuery.eq("id", sourceId);
    }

    const { data: sources } = await sourceQuery;
    const redditSources = sources?.filter(s => !s.platform || s.platform === 'reddit') || [];
    const twitterSources = sources?.filter(s => s.platform === 'twitter') || [];

    // Valid sources: Reddit sources with subreddits (Twitter sources don't need subreddit)
    const validRedditSources = redditSources.filter(s => s.subreddit && s.subreddit.trim());
    
    // If no sources, we'll scan all of Reddit (popular subreddits) in the Edge Function
    // No need to error - Edge Function will handle default subreddits

    console.log(`📡 Reddit sources: ${validRedditSources.length} (with subreddits), Twitter sources: ${twitterSources.length}`);

    // Step 2: Fetch existing matches to avoid duplicates
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("platform_id")
      .eq("user_id", session.user.id);

    const existingIds = new Set(existingMatches?.map(m => m.platform_id) || []);
    console.log(`📊 Found ${existingIds.size} existing matches`);

    // Step 3: Skip browser RSS - always use Edge Function to avoid CORS issues
    // Browser RSS was hitting CORS errors, so we'll use Edge Function for everything
    const redditMatches: any[] = [];
    let redditTotalMatches = 0;
    const browserRSSFailed = true; // Always use Edge Function since CORS blocks browser RSS

    console.log(`📞 Skipping browser RSS (CORS issues), using Edge Function for all Reddit scanning...`);

    // Step 4: Call Edge Function for Reddit RSS + Twitter
    // Edge Function handles everything server-side (no CORS issues)
    // Backfill removed - Reddit's JSON API returns 403 errors, RSS feeds work fine
    let twitterMatches = 0;
    let edgeRedditMatches = 0;

    // Always call Edge Function since browser RSS has CORS issues
    const needsEdgeFunction = true; // Always true now

    if (needsEdgeFunction) {
      console.log("📞 Calling Edge Function for Reddit RSS + Twitter...");
      try {
        // Call scan endpoint (returns immediately with jobId)
        const { data: scanData, error: scanError } = await supabase.functions.invoke("hyper-endpoint", {
          body: {
            userId: session.user.id,
            sourceId,
            skipRedditRSS: false, // Edge Function will handle RSS (no CORS issues)
            existingPlatformIds: Array.from(existingIds), // Share existing IDs
          },
        });

        if (scanError) {
          console.error("❌ Edge Function error:", scanError);
          throw new Error(scanError.message || "Failed to start scan");
        }

        if (!scanData?.jobId) {
          throw new Error("No jobId returned from scan endpoint");
        }

        const jobId = scanData.jobId;
        console.log(`✅ Scan job started: ${jobId}, polling for status...`);

        // Poll for job status every 5 seconds
        let jobCompleted = false;
        let pollAttempts = 0;
        const maxPollAttempts = 300; // 300 * 5s = 25 minutes max (for large scans with many keywords)

        while (!jobCompleted && pollAttempts < maxPollAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          pollAttempts++;

          // Use direct fetch for query params
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Not authenticated");
          
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const statusUrl = `${supabaseUrl}/functions/v1/super-task?jobId=${encodeURIComponent(jobId)}`;
          const statusResponse = await fetch(statusUrl, {
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
              "apikey": supabaseKey || "",
            },
          });
          
          if (!statusResponse.ok) {
            throw new Error(`Failed to check job status: ${statusResponse.status}`);
          }
          
          const jobData = await statusResponse.json();

          if (jobData?.status === "completed") {
            jobCompleted = true;
            const results = jobData.results || {};
            twitterMatches = results.twitterMatches || 0;
            edgeRedditMatches = (results.matches || 0) - twitterMatches;
            console.log(`✅ Scan completed! Found ${edgeRedditMatches} Reddit matches (RSS)`);
            if (twitterMatches > 0) {
              console.log(`✅ Found ${twitterMatches} Twitter matches`);
            }
          } else if (jobData?.status === "failed") {
            throw new Error(jobData.error || "Scan job failed");
          } else {
            console.log(`⏳ Scan in progress... (attempt ${pollAttempts}/${maxPollAttempts})`);
          }
        }

        if (!jobCompleted) {
          throw new Error("Scan job did not complete in time");
        }
      } catch (err) {
        console.error("❌ Error calling Edge Function:", err);
        throw err;
      }
    }

    const totalMatches = redditTotalMatches + edgeRedditMatches + twitterMatches;
    const totalNewMatches = redditMatches.length + edgeRedditMatches + twitterMatches;

    console.log(`🎉 Scan complete! Total: ${totalMatches}, New: ${totalNewMatches}`);

    return {
      message: "Scan completed successfully",
      matches: totalMatches,
      newMatches: totalNewMatches,
    };
  } catch (err: any) {
    console.error("❌ Scan failed:", err);
    throw new Error(err.message || "Failed to scan");
  }
};
