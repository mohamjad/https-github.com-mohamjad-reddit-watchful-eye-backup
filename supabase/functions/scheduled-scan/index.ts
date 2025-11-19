// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
};

serve(async (req) => {
  try {
    // Verify the request is from a scheduled trigger
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${Deno.env.get("CRON_SECRET")}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log("🔍 Starting scheduled scan for users with auto-scan enabled...");

    // Get all users with auto-scan enabled (only pro plan)
    const { data: users, error: usersError } = await supabaseClient
      .from("subscriptions")
      .select("user_id, plan, auto_scan_enabled, scan_interval_minutes")
      .eq("status", "active")
      .eq("auto_scan_enabled", true)
      .eq("plan", "pro");

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log("✅ No users with auto-scan enabled");
      return new Response(
        JSON.stringify({ message: "No users with auto-scan enabled", usersScanned: 0, totalMatches: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📊 Found ${users.length} users with auto-scan enabled`);

    let totalScans = 0;
    let totalMatches = 0;
    let skippedScans = 0;

    // Scan for each user
    for (const user of users) {
      try {
        // Check if enough time has passed since last scan
        const { data: lastScan } = await supabaseClient
          .from("daily_scans")
          .select("created_at")
          .eq("user_id", user.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (lastScan?.created_at) {
          const lastScanTime = new Date(lastScan.created_at);
          const now = new Date();
          const minutesSinceLastScan = (now.getTime() - lastScanTime.getTime()) / (1000 * 60);
          const intervalMinutes = user.scan_interval_minutes || 30;

          if (minutesSinceLastScan < intervalMinutes) {
            const minutesUntilNext = Math.ceil(intervalMinutes - minutesSinceLastScan);
            console.log(
              `⏭️  Skipping user ${user.user_id}: Last scan ${Math.floor(minutesSinceLastScan)} minutes ago, need ${intervalMinutes} minutes (next in ${minutesUntilNext} min)`
            );
            skippedScans++;
            continue;
          }
        }

        console.log(`🔍 Scanning user ${user.user_id} (${user.plan} plan, interval: ${user.scan_interval_minutes || 30} min)...`);

        // Fetch user's keywords
        const { data: keywords } = await supabaseClient
          .from("keywords")
          .select("*")
          .eq("user_id", user.user_id);

        if (!keywords || keywords.length === 0) {
          console.log(`  ⚠️  No keywords found for user ${user.user_id}`);
          continue;
        }

        // Fetch user's sources
        const { data: sources } = await supabaseClient
          .from("sources")
          .select("*")
          .eq("user_id", user.user_id);

        if (!sources || sources.length === 0) {
          console.log(`  ⚠️  No sources found for user ${user.user_id}`);
          continue;
        }

        // Fetch existing matches to avoid duplicates
        const { data: existingMatches } = await supabaseClient
          .from("matches")
          .select("platform_id")
          .eq("user_id", user.user_id);

        const existingIds = new Set(existingMatches?.map((m) => m.platform_id) || []);

        // Call the scan-reddit Edge Function for this user
        // We'll use the service role to invoke it
        const scanFunctionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/scan-reddit`;
        
        // Create an admin client to generate a user token for this user
        // Actually, we need to call it differently - let's invoke it directly with service role
        // But the scan-reddit function expects user auth, so we need a different approach
        
        // For now, let's implement the scanning logic here (similar to scan-reddit)
        // but we'll use the intelligent matching from the client
        
        // Fetch Reddit RSS and Twitter sources separately
        const redditSources = sources.filter((s) => !s.platform || s.platform === "reddit");
        const twitterSources = sources.filter((s) => s.platform === "twitter");

        let newMatches: any[] = [];
        let matchesCount = 0;

        // Scan Reddit RSS feeds (only sources with specific subreddits)
        const validRedditSources = redditSources.filter(s => s.subreddit && s.subreddit.trim());
        
        if (validRedditSources.length === 0) {
          console.log(`  ⚠️  No valid subreddit sources found for user ${user.user_id}`);
          continue;
        }
        
        for (const source of validRedditSources) {
          // Skip sources without subreddits (don't scan all of Reddit)
          const subreddit = source.subreddit?.trim();
          if (!subreddit) {
            console.log(`  ⚠️  Skipping source without subreddit: ${source.id}`);
            continue;
          }
          
          try {
            const rssUrl = `https://www.reddit.com/r/${subreddit}/.rss?limit=25`;
            
            console.log(`  📡 Fetching Reddit RSS: ${rssUrl}`);
            
            const rssResponse = await fetch(rssUrl, {
              headers: {
                "User-Agent": "RedditWatchfulEye/1.0",
              },
            });

            if (!rssResponse.ok) {
              console.log(`  ⚠️  RSS fetch failed: ${rssResponse.status}`);
              continue;
            }

            const rssText = await rssResponse.text();
            
            // Parse RSS XML (simplified - in production use a proper RSS parser)
            const itemMatches = rssText.match(/<item>([\s\S]*?)<\/item>/g) || [];
            
            for (const item of itemMatches) {
              const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
              const linkMatch = item.match(/<link>(.*?)<\/link>/);
              const descriptionMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
              
              if (!titleMatch) continue;
              
              const title = titleMatch[1] || "";
              const description = descriptionMatch ? descriptionMatch[1] : "";
              const link = linkMatch ? linkMatch[1] : "";
              const text = `${title} ${description}`.trim();
              
              // Extract post ID from link
              const postIdMatch = link.match(/\/comments\/([a-z0-9]+)\//);
              if (!postIdMatch) continue;
              
              const platformId = `reddit_post_${postIdMatch[1]}`;
              
              if (existingIds.has(platformId)) continue;
              
              // Check if text matches any keyword (simplified matching)
              for (const keyword of keywords) {
                const lowerText = text.toLowerCase();
                const lowerPhrase = keyword.phrase.toLowerCase();
                
                let matches = false;
                if (keyword.is_regex) {
                  try {
                    const regex = new RegExp(keyword.phrase, "i");
                    matches = regex.test(text);
                  } catch (e) {
                    matches = lowerText.includes(lowerPhrase);
                  }
                } else {
                  // Multi-word keyword matching
                  if (lowerPhrase.includes(" ")) {
                    const words = lowerPhrase.split(/\s+/);
                    const flexibleRegex = new RegExp(
                      `\\b${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\-_,.;:]+")}\\b`,
                      "i"
                    );
                    matches = flexibleRegex.test(text) || lowerText.includes(lowerPhrase);
                  } else {
                    matches = new RegExp(`\\b${lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
                  }
                }
                
                if (matches) {
                  newMatches.push({
                    user_id: user.user_id,
                    keyword_id: keyword.id,
                    platform_id: platformId,
                    title: title,
                    body: description || null,
                    url: link,
                    author: null, // RSS doesn't provide author easily
                    subreddit: subreddit === "all" ? null : subreddit,
                    platform: "reddit",
                    created_at_utc: new Date().toISOString(),
                  });
                  existingIds.add(platformId);
                  matchesCount++;
                  break; // Only count once per post
                }
              }
            }
          } catch (error) {
            console.error(`  ❌ Error scanning Reddit source for user ${user.user_id}:`, error);
            continue;
          }
        }

        // Scan Twitter (if sources exist)
        if (twitterSources.length > 0) {
          const twitterToken = Deno.env.get("TWITTER_BEARER_TOKEN");
          if (twitterToken) {
            for (const keyword of keywords) {
              try {
                const searchUrl = new URL("https://api.twitter.com/2/tweets/search/recent");
                searchUrl.searchParams.set("query", keyword.phrase);
                searchUrl.searchParams.set("max_results", "25");
                searchUrl.searchParams.set("tweet.fields", "created_at,author_id,text");
                searchUrl.searchParams.set("user.fields", "username");

                const twitterResponse = await fetch(searchUrl.toString(), {
                  headers: {
                    Authorization: `Bearer ${twitterToken}`,
                  },
                });

                if (twitterResponse.ok) {
                  const twitterData = await twitterResponse.json();
                  const tweets = twitterData?.data || [];
                  const users = twitterData?.includes?.users || [];

                  for (const tweet of tweets) {
                    const username = users.find((u: any) => u.id === tweet.author_id)?.username || "unknown";
                    const platformId = `twitter_tweet_${tweet.id}`;

                    if (!existingIds.has(platformId)) {
                      newMatches.push({
                        user_id: user.user_id,
                        keyword_id: keyword.id,
                        platform_id: platformId,
                        title: tweet.text.substring(0, 200),
                        body: tweet.text,
                        url: `https://twitter.com/${username}/status/${tweet.id}`,
                        author: username,
                        subreddit: null,
                        platform: "twitter",
                        created_at_utc: tweet.created_at,
                      });
                      existingIds.add(platformId);
                      matchesCount++;
                    }
                  }
                }
              } catch (error) {
                console.error(`  ❌ Error scanning Twitter for keyword ${keyword.phrase}:`, error);
              }
            }
          }
        }

        // Insert new matches
        if (newMatches.length > 0) {
          const { error: insertError } = await supabaseClient.from("matches").insert(newMatches);
          if (insertError) {
            console.error(`  ❌ Error inserting matches for user ${user.user_id}:`, insertError);
          } else {
            console.log(`  ✅ Found ${newMatches.length} new matches for user ${user.user_id}`);
            totalMatches += newMatches.length;
          }
        } else {
          console.log(`  ℹ️  No new matches for user ${user.user_id}`);
        }

        // Track this scan in daily_scans (for interval tracking)
        const today = new Date();
        const estDate = new Date(today.toLocaleString("en-US", { timeZone: "America/New_York" }));
        const todayStr = estDate.toISOString().split("T")[0];

        await supabaseClient.from("daily_scans").upsert(
          {
            user_id: user.user_id,
            scan_date: todayStr,
          },
          {
            onConflict: "user_id,scan_date",
            ignoreDuplicates: false,
          }
        );

        totalScans++;
      } catch (error) {
        console.error(`❌ Error processing user ${user.user_id}:`, error);
        continue;
      }
    }

    console.log(
      `✅ Scheduled scan completed: ${totalScans} users scanned, ${skippedScans} skipped (too soon), ${totalMatches} new matches`
    );

    return new Response(
      JSON.stringify({
        message: "Scheduled scan completed",
        usersScanned: totalScans,
        usersSkipped: skippedScans,
        totalMatches,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in scheduled-scan function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
