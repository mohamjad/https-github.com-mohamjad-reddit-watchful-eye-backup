// Deno Edge Function - Reddit Scanner
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SPAM_PATTERNS = [
  /\bi help\s+(?:saas|startups|founders|builders|entrepreneurs|indie hackers|businesses|companies|people|you|.*)\s+(?:with|explain|build|create|develop|turn|convert|get|make|design|deliver)/gi,
  /\bi help\s+(?:saas|startups|founders|builders)\s*[&]\s*(?:saas|startups|founders|builders|.*)\s+(?:with|explain|build|create|develop|turn|convert|get|make|design|deliver)/gi,
  /\bneed a\s+(?:clean|fast|professional|modern|better)\s+\w+\s+(?:that|which)\s+(?:actually|really)\s+(?:converts|works|helps)/gi,
  /🚀\s*need a\s+(?:clean|fast|professional|modern|better)/gi,
  /\b(?:hello|hey|hi)\s+(?:guys|everyone|all|folks|founders|builders)\s*[!.,]?\s*\w+\s+(?:here|here!|here,)\s*[!.,]?\s*(?:if you|we're|we are|we offer|looking for|tired of|i help)/gi,
  /\b(?:i'm|i am|this is|my name is)\s+\w+\s*[!.,]?\s*(?:if you|we're|we are|we offer|looking for|tired of|we've|i help)/gi,
  /\b(?:we're offering|we offer|free.*audit|free.*trial|free.*consultation|limited time|special offer|exclusive deal|free.*video|free.*demo|free.*explainer)\b/gi,
  /\bperfect for\s+(?:landing pages|product hunt|launches|social media|saas|startups|founders)/gi,
  /\bwhat you'll get\s*:?\s*(?:professional|free|clean|fast|modern)/gi,
  /\b(?:here's|here is|this is)\s+what\s+(?:i'm|i am|we're|we are)\s+(?:building|creating|working on|developing)/gi,
  /\b(?:lost in|struggling with|tired of|frustrated with)\s+.*\?\s*(?:here's|here is|this is)\s+what\s+(?:i'm|i am|we're|we are)/gi,
  /\bfrom\s+(?:struggling|broke|zero|nothing)\s+(?:freelancer|founder|entrepreneur|developer)\s+to\s+\$[\d,]+(?:\/month|\/mo|k\/month|k\/mo)\s+(?:agency|business|company)/gi,
  /\b(?:i've|i have|we've|we have)\s+(?:packaged|created|built|developed)\s+(?:my|our)\s+(?:entire|complete|full)\s+(?:system|process|method|framework|solution)/gi,
  /\$\d+[kkm]?(?:\/month|\/mo|\/year|\/yr)\s*(?:agency|business|revenue|income|profit)/gi,
  /\bhow do you\s+.*\?\s*(?:here's|here is|this is)\s+what\s+(?:i'm|i am|we're|we are)/gi,
  /\b(?:i'm.*here|this is.*here|my name is.*here|i'm.*and i|we're.*and we|we've built|we built|we created|we developed|i've built|i built|i created)\s+(?:if you|to help|that helps|designed to|that|which)/gi,
  /\b(?:helps us understand|helps us|contact us|reach out|dm me|message me|let's connect|get in touch|schedule a call|are you interested)/gi,
  /\b(?:dm for|message for|contact for|reach out for|let me know if|feel free to|don't hesitate to|are you interested)\s+(?:more info|details|information|discount|deal|interested)/gi,
  /\b(?:check out|promo|discount|deal|sale|limited time|sign up|subscribe|follow us|visit our|check our|try our|use our)/gi,
  /\b(?:high-converting|optimized for|designed to convert|actually converts)/gi,
  // Outbound/promotional patterns - posts offering services (not asking for help)
  /\bneed help\s+.*\?(?:.*\b(?:we will|we'll|we can|i will|i'll|i can|let's|let us)\s+(?:handle|help|deliver|provide|create|build|make|do|give))/gi,
  /\bneed help\s+.*\?(?:.*\b(?:dm me|contact us|reach out|message me|get in touch|schedule|book|hire))/gi,
  /\bneed help\s+.*\?(?:.*\b(?:offering|services|pricing|package|deal|offer))/gi,
  /\b(?:we will|we'll|we can|we handle|we deliver|we provide|i will|i'll|i can|i handle|i deliver)\s+.*\b(?:entire|full|complete|all of|your)/gi,
  /\b(?:scale|scaling|grow|growing)\s+.*\?(?:.*\b(?:we|i|let's|let us))/gi,
  // Political/opinion posts that just mention keywords without intent
  /\b(?:2020|2024|election|democrat|republican|trump|biden)\b.*\b(?:was|is|be|different|same|better|worse)\b/gi,
];

const PROMOTIONAL_WORDS = [
  'offer', 'free', 'discount', 'deal', 'sale', 'promo', 'limited time',
  'check out', 'visit', 'sign up', 'subscribe', 'contact us', 'reach out',
  'dm me', 'message me', 'let\'s connect', 'schedule a call', 'audit',
  'consultation', 'trial', 'demo', 'we\'re', 'we offer', 'we\'ve built',
  'i help', 'perfect for', 'what you\'ll get', 'are you interested',
  'need a clean', 'need a fast', 'need a professional', 'actually converts',
  'high-converting', 'optimized for', 'designed to convert'
];

const PRODUCT_LAUNCH_SUBREDDITS = new Set([
  "sideproject",
  "sideprojects",
  "alphaandbetausers",
  "producthunt",
  "programmingpromotions",
  "indiebiz",
  "startups",
  "entrepreneur",
]);

const PRODUCT_LAUNCH_PATTERNS = [
  /\bwhat i built\b/i,
  /\bi built\b.+\bplatform\b/i,
  /\bjust launched\b/i,
  /\bsoft launched\b/i,
  /\bproduct hunt\b/i,
  /\bfeedback on (?:my|our)\b/i,
  /\bshow(?:case|ing)\b/i,
  /\bday\s+\d+\b/i,
  /\blaunching\b/i,
];

const DEMAND_PATTERNS = [
  /\bneed(?:ing)?\s+(?:help|a|an|some|advice|recommend)/i,
  /\blooking for\b/i,
  /\banyone know\b/i,
  /\bhow do i\b/i,
  /\bproblem(?:s)?\s+with\b/i,
  /\bissue(?:s)?\s+with\b/i,
  /\bstuck (?:on|with)\b/i,
  /\brecommend\b.*\?/i,
  /\bwhat (?:tool|software).+\?\b/i,
];

const looksLikeLaunchPost = (text: string) =>
  PRODUCT_LAUNCH_PATTERNS.some((pattern) => pattern.test(text));

const hasDemandLanguage = (text: string) =>
  DEMAND_PATTERNS.some((pattern) => pattern.test(text));

const HIGH_INTENT_PATTERNS = [
  /\b(?:need|needs|needed|want|wants|wanted|looking for|searching for|trying to find|seeking|seeks)\b/gi,
  /\b(?:anyone know|does anyone|can someone|where can|what.*recommend|recommendations?|suggestions?)\b/gi,
  /\b(?:problem|issue|broken|doesn't work|not working|frustrated|annoyed|hate|disappointed)\b/gi,
  /\b(?:alternative|alternatives|better than|instead of|replace|replacement|vs\.?|versus)\b/gi,
  /\b(?:urgent|asap|as soon as|quickly|fast|immediately|right now)\b/gi,
  /\b(?:budget|price|cost|affordable|cheap|expensive|worth it|worth the)\b/gi,
  /\b(?:should i|which|what.*best|best.*for|deciding|considering|thinking about)\b/gi,
];

const LOW_INTENT_PATTERNS = [
  /\b(?:bought|purchased|got|have|had|used|tried|tested)\b/gi,
  /\b(?:don't need|don't want|not looking|not interested|avoid|skip)\b/gi,
  /\b(?:check out|promo|discount|deal|sale|limited time)\b/gi,
];

const REQUEST_PATTERNS = [
  /\b(?:need|want|looking for)\s+(?:a|an|the)?\s*[^.!?]{0,30}?\b(?:for|that|which|to)\b/gi,
  /\b(?:recommend|suggest|advice on|help with|opinion on)\b/gi,
  /\b(?:best|top|good|great)\s+[^.!?]{0,30}?\b(?:for|to|at)\b/gi,
];

const cleanHtml = (text: string) => {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const isSpam = (text: string): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  
  for (const pattern of SPAM_PATTERNS) {
    try {
      if (pattern.test(text)) return true;
    } catch (e) {
      continue;
    }
  }
  
  const promotionalCount = PROMOTIONAL_WORDS.filter(word => lowerText.includes(word)).length;
  return promotionalCount >= 2;
};

interface MatchCheckResult {
  matched: boolean;
  hasIntentSignal: boolean;
  intentSignals: number;
}

const matchesKeyword = (text: string, keyword: any): MatchCheckResult => {
  if (!text || !keyword.phrase) {
    return {
      matched: false,
      hasIntentSignal: false,
      intentSignals: 0,
    };
  }
  
  const lowerText = text.toLowerCase();
  const lowerPhrase = keyword.phrase.toLowerCase();
  let score = 0;
  let hasKeywordMatch = false;

  // Check if keyword matches - more flexible matching
  if (keyword.is_regex) {
    try {
      hasKeywordMatch = new RegExp(keyword.phrase, "i").test(text);
    } catch (e) {
      hasKeywordMatch = lowerText.includes(lowerPhrase);
    }
  } else if (lowerPhrase.includes(' ')) {
    const words = lowerPhrase.split(/\s+/).filter(w => w.length > 0);
    const stopwords = ['a', 'an', 'the', 'for', 'to', 'of', 'in', 'on', 'at', 'is', 'are', 'was', 'were'];
    // Filter out stopwords but keep all other words (including short ones like "need", "tool")
    const significantWords = words.filter(w => !stopwords.includes(w));
    
    // First, try exact phrase match (with flexible whitespace/punctuation)
    const escapedPhrase = lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexibleRegex = new RegExp(`\\b${words.join('[\\s\\-_,.;:]+')}\\b`, 'i');
    hasKeywordMatch = flexibleRegex.test(text) || lowerText.includes(lowerPhrase);
    
    // If exact phrase doesn't match, use flexible word matching
    // Match if most significant words appear (doesn't require exact order)
    if (!hasKeywordMatch && significantWords.length > 0) {
      const wordsFound = significantWords.filter(word => {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundaries for exact word matching
        const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        return wordRegex.test(text);
      });
      
      if (significantWords.length >= 3) {
        // For 3+ word keywords: match if at least 2 words OR 60% appear
        const matchRatio = wordsFound.length / significantWords.length;
        hasKeywordMatch = wordsFound.length >= 2 || matchRatio >= 0.6;
      } else if (significantWords.length === 2) {
        // For 2-word keywords: match if both words appear
        hasKeywordMatch = wordsFound.length >= 2;
      } else if (significantWords.length === 1) {
        // For 1-word keywords: match if word appears
        hasKeywordMatch = wordsFound.length >= 1;
      }
    }
  } else {
    const escapedPhrase = lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    hasKeywordMatch = new RegExp(`\\b${escapedPhrase}\\b`, 'i').test(text);
  }

  if (!hasKeywordMatch) {
    return {
      matched: false,
      hasIntentSignal: false,
      intentSignals: 0,
    };
  }
  score += 20;

  // High-intent patterns - boost score significantly if keyword contains intent words
  let highIntentBoost = 0;
  for (const pattern of HIGH_INTENT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      highIntentBoost += matches.length * 15;
      score += matches.length * 15;
    }
  }
  const hasHighIntent = highIntentBoost > 0;
  
  // If keyword itself contains high-intent words (like "need", "looking for"), give bonus
  const keywordHasIntent = HIGH_INTENT_PATTERNS.some(pattern => pattern.test(lowerPhrase));
  if (keywordHasIntent && highIntentBoost > 0) {
    score += 10; // Bonus for keywords that are already high-intent
  }

  // Low-intent patterns - reduce score but don't block matches
  for (const pattern of LOW_INTENT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      score -= Math.min(matches.length * 5, 10); // Reduced penalty (was 10, now 5, max -10)
    }
  }

  // Keyword proximity to intent words - check proximity for any matching keyword words
  // For multi-word keywords, check each significant word's proximity to intent words
  const keywordWords = lowerPhrase.split(/\s+/).filter(w => w.length > 2);
  let proximityBonus = 0;
  for (const keywordWord of keywordWords) {
    const keywordIndex = lowerText.indexOf(keywordWord);
    if (keywordIndex !== -1) {
      const contextStart = Math.max(0, keywordIndex - 50);
      const contextEnd = Math.min(text.length, keywordIndex + keywordWord.length + 50);
      const context = text.substring(contextStart, contextEnd).toLowerCase();
      
      for (const pattern of HIGH_INTENT_PATTERNS) {
        if (pattern.test(context)) {
          proximityBonus += 20;
          break;
        }
      }

      const nearbyText = text.substring(
        Math.max(0, keywordIndex - 100),
        Math.min(text.length, keywordIndex + keywordWord.length + 100)
      );
      if (nearbyText.includes("?")) {
        proximityBonus += 15;
        break;
      }
    }
  }
  score += proximityBonus;

  // Length penalty
  if (text.length < 20) score -= 10;

  // Multiple keyword mentions - count how many times any significant word appears
  if (lowerPhrase.includes(' ')) {
    const words = lowerPhrase.split(/\s+/).filter(w => w.length > 2);
    let totalMentions = 0;
    for (const word of words) {
      const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, 'gi');
      const matches = text.match(wordRegex);
      if (matches) totalMentions += matches.length;
    }
    if (totalMentions > words.length) {
      score += (totalMentions - words.length) * 3; // Bonus for multiple mentions
    }
  } else {
    const keywordRegex = keyword.is_regex
      ? new RegExp(keyword.phrase, "gi")
      : new RegExp(lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const keywordMatchResults = text.match(keywordRegex);
    if (keywordMatchResults && keywordMatchResults.length > 1) {
      score += (keywordMatchResults.length - 1) * 5;
    }
  }

  // Request patterns
  let requestMatch = false;
  for (const pattern of REQUEST_PATTERNS) {
    if (pattern.test(text)) {
      score += 25;
      requestMatch = true;
      break;
    }
  }

  // Require at least one clear intent signal (problem/ask) to avoid generic chatter
  const hasIntentSignal = hasHighIntent || requestMatch || proximityBonus >= 20;
  const intentSignals = [
    hasHighIntent,
    requestMatch,
    proximityBonus >= 20
  ].filter(Boolean).length;
  if (!hasIntentSignal) {
    return {
      matched: false,
      hasIntentSignal: false,
      intentSignals: 0,
    };
  }

  // Ensure keyword matches pass - base score is 20, so should always pass unless heavily penalized
  // Normalize score but ensure minimum is base score (20) minus max penalties (10 for low-intent, 10 for length)
  // So minimum should be 0, but we lower threshold to 5 to catch more matches
  const normalizedScore = Math.max(0, Math.min(100, score));
  return {
    matched: normalizedScore >= 20,
    hasIntentSignal,
    intentSignals,
  };
};

const parseRSS = (rssText: string) => {
  if (!rssText?.length) return [];
  
  const posts: any[] = [];
  const isAtom = rssText.includes('<feed') || rssText.includes('<entry>');
  const entryRegex = isAtom ? /<entry>([\s\S]*?)<\/entry>/g : /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = entryRegex.exec(rssText)) !== null) {
    const itemXml = match[1];
    const titleMatch = isAtom
      ? itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/)
      : itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/);
    const linkMatch = isAtom
      ? itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/) || itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/)
      : itemXml.match(/<link>([\s\S]*?)<\/link>/) || itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    const descMatch = isAtom
      ? itemXml.match(/<content[^>]*type=["']html["'][^>]*>([\s\S]*?)<\/content>/) || itemXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)
      : itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemXml.match(/<description>([\s\S]*?)<\/description>/);
    const authorMatch = isAtom
      ? itemXml.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/)
      : itemXml.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/) || itemXml.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/);
    const dateMatch = isAtom
      ? itemXml.match(/<updated>([\s\S]*?)<\/updated>/) || itemXml.match(/<published>([\s\S]*?)<\/published>/)
      : itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    if (titleMatch && linkMatch) {
      const title = cleanHtml((titleMatch[1] || titleMatch[2] || "").trim().replace(/<!\[CDATA\[(.*?)\]\]>/, '$1'));
      const link = (linkMatch[1] || linkMatch[2] || "").trim();
      const description = descMatch ? cleanHtml((descMatch[1] || descMatch[2] || "").trim()) : "";
      const author = (authorMatch?.[1] || authorMatch?.[2] || "unknown").trim();
      const subredditMatch = link.match(/\/r\/([^\/]+)\//);
      const subreddit = subredditMatch ? subredditMatch[1] : "unknown";
      const postIdMatch = link.match(/\/comments\/([^\/]+)\//);
      const postId = postIdMatch ? postIdMatch[1] : `rss_${Date.now()}_${Math.random()}`;
      const pubDate = dateMatch ? new Date(dateMatch[1]) : new Date();
      const created_utc = Math.floor(pubDate.getTime() / 1000);

      posts.push({ id: postId, title, selftext: description, url: link, author, subreddit, created_utc });
    }
  }
  
  return posts;
};

const createResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
};

serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === "OPTIONS") {
    return new Response("", { 
      status: 200,
      headers: CORS_HEADERS
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createResponse({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const userId = body.userId || user.id;
    const sourceId = body.sourceId;
    const skipRedditRSS = body.skipRedditRSS === true;
    const existingPlatformIds = body.existingPlatformIds || [];

    // Create scan job (returns immediately)
    const { data: job, error: jobError } = await supabaseClient
      .from("scan_jobs")
      .insert({
        user_id: userId,
        status: "pending",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error("Failed to create scan job:", jobError);
      return createResponse({ 
        error: `Failed to create scan job: ${jobError.message}` 
      }, 500);
    }

    // Trigger background worker (fire and forget - don't wait)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const workerUrl = `${supabaseUrl.replace("/rest/v1", "")}/functions/v1/bright-task`;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    fetch(workerUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: job.id,
        userId: userId,
        sourceId: sourceId,
        skipRedditRSS: skipRedditRSS,
        existingPlatformIds: existingPlatformIds,
      }),
    }).catch(err => {
      console.error("Failed to trigger background worker:", err);
      // Update job status to failed if we can't trigger worker
      supabaseClient
        .from("scan_jobs")
        .update({ 
          status: "failed",
          error: `Failed to trigger worker: ${err.message}`,
        })
        .eq("id", job.id)
        .catch(() => {});
    });

    // Return immediately with jobId
    return createResponse({
      jobId: job.id,
      status: "scanning",
      message: "Scan started. Poll /scan-status for updates.",
    });

  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return createResponse({
      error: error.message || "Internal server error",
      details: error.stack || String(error),
    }, 500);
  }
});
