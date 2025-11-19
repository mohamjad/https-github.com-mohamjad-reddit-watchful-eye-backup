// Deno Edge Function - Background Scan Worker
// This function processes scan jobs asynchronously
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
};

// Copy all helper functions from scan-reddit/index.ts
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
  // Self-promotional: "I ran", "I fired", "I built", "I replaced", "I generated"
  /\bi\s+(?:ran|fired|replaced|built|created|developed|launched|started|founded|generated|made|earned|got|achieved)\s+.*\b(?:agency|team|company|business|saas|software|tool|product|service|revenue|mrr|clients|users|customers)/gi,
  // Self-promotional: "I just replaced", "I just built", "I just launched"
  /\bi\s+just\s+(?:replaced|built|launched|created|developed|fired|hired|made|earned|got|achieved)/gi,
  // Self-promotional: Talking about their own results/achievements
  /\b(?:i|we|my|our)\s+(?:generated|made|earned|got|achieved|reached|hit|got to)\s+\$?[\d,]+(?:k|m)?\s*(?:in|of|per|\/)\s*(?:revenue|mrr|month|year|clients|users|customers|impressions|clicks|signups)/gi,
  // Educational/promotional content: "The X Channels", "The X Ways", "X Things You Need"
  /\bthe\s+\d+\s+(?:channels|ways|things|steps|tips|strategies|methods|secrets|hacks|tricks|rules|laws|principles)\s+(?:for|to|of|you|your)/gi,
  // Self-promotional: "Here's what I did", "Here's how I", "This is how I"
  /\b(?:here's|here is|this is)\s+(?:what|how)\s+(?:i|we|my|our)\s+(?:did|built|created|achieved|made|earned|got|replaced|fired|hired)/gi,
  // Self-promotional: Talking about their tool/service/product
  /\b(?:i|we|my|our)\s+(?:used|built|created|developed|launched|made)\s+(?:an?|the)\s+(?:ai|tool|software|saas|product|service|platform|system|app|solution)\s+(?:that|which|to|and)/gi,
  // Self-promotional: Results-focused posts without asking for help
  /\b(?:results?|impressions?|clicks?|signups?|revenue|mrr|clients?|users?|customers?)\s*:?\s*[\d,]+(?:k|m)?/gi,
  // Self-promotional: "Total cost", "Total time", talking about their process
  /\btotal\s+(?:cost|time|hours?|spent|investment)\s*:?\s*[\d$]+/gi,
  // Educational list posts: "X Things", "X Ways", "X Channels"
  /\b\d+\s+(?:things?|ways?|channels?|steps?|tips?|strategies?|methods?|secrets?|hacks?|tricks?|rules?|laws?|principles?)\s+(?:for|to|of|you|your|that|which)/gi,
  // Self-promotional: "I've designed", "I've built", "I've made"
  /\bi'?ve\s+(?:designed|built|made|created|developed|launched|started|founded|worked on|done)\s+\d+/gi,
  // Self-promotional: "Made a X", "Built a X", "Created a X" (without question)
  /\b(?:made|built|created|developed|launched|started|founded)\s+(?:a|an|the)\s+\w+/gi,
  // Self-promotional: "I got tired of X" followed by "I built" (solution, not problem)
  /\b(?:i|i'm|i am)\s+(?:got|getting)\s+tired\s+of.*\b(?:so|and|then|i|i've|i built|i made|i created|i developed)/gi,
  // Self-promotional: Posts starting with "I've" or "I got" without question marks
  /^i'?ve\s+(?:designed|built|made|created|developed|launched|started|founded|worked on|done)/gi,
  /^i\s+got\s+tired\s+of/gi,
  // Self-promotional: "After X, I built Y" pattern
  /\bafter\s+(?:one|too many|.*)\s+(?:i|i've|we|we've)\s+(?:built|created|made|developed|launched)/gi,
  // Self-promotional: "Thought it might be useful to share" (sharing their work)
  /\b(?:thought|think)\s+it\s+(?:might|would)\s+be\s+(?:useful|helpful|interesting)\s+to\s+share/gi,
  // Educational/promotional: Third-person problem descriptions (not asking for help)
  /\b(?:many|most|some|few|a lot of|tons of)\s+\w+\s+(?:chase|struggle|burn|end up|get stuck|are stuck|are|struggling|burning|chasing)/gi,
  // Educational/promotional: "Stuck in the maze", "leaving them exhausted" (describing others' problems)
  /\bstuck\s+in\s+the\s+\w+/gi,
  /\bleaving\s+them\s+(?:exhausted|desperate|frustrated|confused)/gi,
  // Educational/promotional: Problem description followed by promotional content
  /\b(?:hoping for|end up|leaving them|stuck in).*?(?:@\w+|https?:\/\/|check out|visit|sign up|dm|contact)/gi,
  // Educational/promotional: Describing problems in third person without asking
  /\b(?:they|them|their|owners|founders|entrepreneurs|businesses)\s+(?:chase|struggle|burn|end up|get stuck|are stuck|guess|test|leave|exhaust|desperate)/gi,
  // Educational/promotional: Problem statements without questions or "I need"
  /\b(?:many|most|some)\s+\w+\s+(?:chase|struggle|burn|end up|get stuck|are stuck).*?(?!\?)(?!\bi\s+need)(?!\bhow\s+do\s+i)/gi,
];

const PROMOTIONAL_WORDS = [
  'offer', 'free', 'discount', 'deal', 'sale', 'promo', 'limited time',
  'check out', 'visit', 'sign up', 'subscribe', 'contact us', 'reach out',
  'dm me', 'message me', 'let\'s connect', 'schedule a call', 'audit',
  'consultation', 'trial', 'demo', 'we\'re', 'we offer', 'we\'ve built',
  'i help', 'perfect for', 'what you\'ll get', 'are you interested',
  'need a clean', 'need a fast', 'need a professional', 'actually converts',
  'high-converting', 'optimized for', 'designed to convert',
  'i ran', 'i fired', 'i replaced', 'i built', 'i created', 'i generated',
  'i made', 'i earned', 'i got', 'i achieved', 'total cost', 'total time',
  'impressions', 'clicks', 'signups', 'mrr', 'revenue', 'clients', 'users'
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
  // Explicit first-person requests
  /\bi\s+need(?:ing)?\s+(?:help|a|an|some|advice|recommend)/i,
  /\bi'?m\s+looking\s+for/i,
  /\bi\s+want/i,
  /\bi\s+can'?t\s+find/i,
  /\bi\s+don'?t\s+know/i,
  // Questions asking for help
  /\b(?:does|do|can)\s+anyone\s+know/i,
  /\bhow\s+do\s+i/i,
  /\bwhat\s+(?:tool|software|service|solution).+\?/i,
  /\b(?:which|what).+\s+(?:should|can|do|recommend).+\?/i,
  // Explicit problem statements with "I"
  /\bi\s+have\s+a\s+problem/i,
  /\bi'?m\s+having\s+(?:trouble|issues|problems)/i,
  /\bproblem(?:s)?\s+with\b/i,
  /\bissue(?:s)?\s+with\b/i,
  /\bi'?m\s+stuck\s+(?:on|with)/i,
  // Asking for recommendations
  /\brecommend\b.*\?/i,
  /\b(?:any|some)\s+(?:recommendations?|suggestions?|advice)\s*\?/i,
];

const looksLikeLaunchPost = (text: string) =>
  PRODUCT_LAUNCH_PATTERNS.some((pattern) => pattern.test(text));

const hasDemandLanguage = (text: string) =>
  DEMAND_PATTERNS.some((pattern) => pattern.test(text));

// Clean HTML tags and entities from text (for Twitter)
const cleanHtmlFromTweet = (text: string): string => {
  if (!text) return "";
  // More aggressive HTML cleaning - handle nested tags and all variations
  let cleaned = text
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
  
  // Final pass to catch any remaining HTML-like patterns
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  
  return cleaned;
};

// Simple keyword matching for Twitter (without strict intent requirements)
const matchesKeywordSimple = (text: string, keyword: any): boolean => {
  const lowerText = text.toLowerCase();
  const lowerPhrase = keyword.phrase.toLowerCase();

  if (keyword.is_regex) {
    try {
      return new RegExp(keyword.phrase, "i").test(text);
    } catch (e) {
      return lowerText.includes(lowerPhrase);
    }
  } else if (lowerPhrase.includes(' ')) {
    const words = lowerPhrase.split(/\s+/).filter(w => w.length > 0);
    const stopwords = ['a', 'an', 'the', 'for', 'to', 'of', 'in', 'on', 'at', 'is', 'are', 'was', 'were'];
    const significantWords = words.filter(w => !stopwords.includes(w));
    
    const escapedPhrase = lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexibleRegex = new RegExp(`\\b${words.join('[\\s\\-_,.;:]+')}\\b`, 'i');
    let hasMatch = flexibleRegex.test(text) || lowerText.includes(lowerPhrase);
    
    if (!hasMatch && significantWords.length > 0) {
      const wordsFound = significantWords.filter(word => {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        return wordRegex.test(text);
      });
      
      if (significantWords.length >= 3) {
        const matchRatio = wordsFound.length / significantWords.length;
        hasMatch = wordsFound.length >= 2 || matchRatio >= 0.6;
      } else if (significantWords.length === 2) {
        hasMatch = wordsFound.length >= 2;
      } else if (significantWords.length === 1) {
        hasMatch = wordsFound.length >= 1;
      }
    }
    
    return hasMatch;
  } else {
    const escapedPhrase = lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escapedPhrase}\\b`, 'i').test(text);
  }
};

const HIGH_INTENT_PATTERNS = [
  // First-person requests only (not third-person descriptions)
  /\b(?:i\s+need|i'?m\s+looking\s+for|i\s+want|i\s+can'?t|i\s+don'?t\s+know|i\s+have\s+a|i'?m\s+having)\b/gi,
  /\b(?:anyone know|does anyone|can someone|where can|how do i|what.*should i|which.*should i)\b/gi,
  /\b(?:i'?m\s+stuck|i\s+have\s+a\s+problem|i'?m\s+having\s+trouble|my\s+problem|my\s+issue)\b/gi,
  /\b(?:recommendations?|suggestions?|advice)\s*\?/gi,
  // Explicit problem statements with "I" or "my"
  /\b(?:my\s+.*\s+(?:is|are|doesn'?t|won'?t|can'?t)\s+(?:broken|not working|broken|failing))\b/gi,
  /\b(?:i'?m\s+(?:frustrated|annoyed|stuck|confused|lost|desperate))\b/gi,
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
    const significantWords = words.filter(w => !stopwords.includes(w));
    
    const escapedPhrase = lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexibleRegex = new RegExp(`\\b${words.join('[\\s\\-_,.;:]+')}\\b`, 'i');
    hasKeywordMatch = flexibleRegex.test(text) || lowerText.includes(lowerPhrase);
    
    if (!hasKeywordMatch && significantWords.length > 0) {
      const wordsFound = significantWords.filter(word => {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        return wordRegex.test(text);
      });
      
      if (significantWords.length >= 3) {
        const matchRatio = wordsFound.length / significantWords.length;
        hasKeywordMatch = wordsFound.length >= 2 || matchRatio >= 0.6;
      } else if (significantWords.length === 2) {
        hasKeywordMatch = wordsFound.length >= 2;
      } else if (significantWords.length === 1) {
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

  let highIntentBoost = 0;
  for (const pattern of HIGH_INTENT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      highIntentBoost += matches.length * 15;
      score += matches.length * 15;
    }
  }
  const hasHighIntent = highIntentBoost > 0;
  
  const keywordHasIntent = HIGH_INTENT_PATTERNS.some(pattern => pattern.test(lowerPhrase));
  if (keywordHasIntent && highIntentBoost > 0) {
    score += 10;
  }

  for (const pattern of LOW_INTENT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      score -= Math.min(matches.length * 5, 10);
    }
  }

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

  if (text.length < 20) score -= 10;

  if (lowerPhrase.includes(' ')) {
    const words = lowerPhrase.split(/\s+/).filter(w => w.length > 2);
    let totalMentions = 0;
    for (const word of words) {
      const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, 'gi');
      const matches = text.match(wordRegex);
      if (matches) totalMentions += matches.length;
    }
    if (totalMentions > words.length) {
      score += (totalMentions - words.length) * 3;
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

  let requestMatch = false;
  for (const pattern of REQUEST_PATTERNS) {
    if (pattern.test(text)) {
      score += 25;
      requestMatch = true;
      break;
    }
  }

  const hasIntentSignal = hasHighIntent || requestMatch || proximityBonus >= 20;
  const intentSignals = [
    hasHighIntent,
    requestMatch,
    proximityBonus >= 20
  ].filter(Boolean).length;
  
  // ULTRA-STRICT FILTERING: Only match posts that are EXPLICITLY asking for help or complaining
  // Filter out ALL self-promotional, educational, and generic content
  if (!hasIntentSignal) {
    // Without clear intent signals, REJECT immediately (no exceptions)
    return {
      matched: false,
      hasIntentSignal: false,
      intentSignals: 0,
    };
  }
  
  // Even with intent, require strong signals (questions or explicit problems)
  // Must have at least 2 intent signals OR a question mark with intent language
  const hasQuestion = text.includes("?");
  const strongIntent = intentSignals >= 2 || (hasQuestion && intentSignals >= 1);
  
  if (!strongIntent) {
    return {
      matched: false,
      hasIntentSignal: false,
      intentSignals: 0,
    };
  }

  // Require minimum score even with strong intent
  if (score < 35) {
    return {
      matched: false,
      hasIntentSignal: false,
      intentSignals: 0,
    };
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  return {
    matched: normalizedScore >= 35, // Consistent threshold - only strong intent matches
    hasIntentSignal: true,
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Extract jobId early so it's available in catch block
  let jobId: string | undefined;
  let body: any = {};
  try {
    body = await req.json().catch(() => ({}));
    jobId = body.jobId;
  } catch {
    // If we can't parse body, jobId stays undefined
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify service role key (internal call only)
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!authHeader || !authHeader.includes(serviceRoleKey)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { userId, sourceId, skipRedditRSS, existingPlatformIds } = body;
    jobId = body.jobId || jobId;

    if (!jobId || !userId) {
      return createResponse({ error: "Missing jobId or userId" }, 400);
    }

    // Update job status to 'running'
    await supabaseClient
      .from("scan_jobs")
      .update({ status: "running" })
      .eq("id", jobId)
      .eq("user_id", userId);

    console.log(`🔍 Starting scan job ${jobId} for user ${userId}`);

    // Fetch keywords
    const { data: keywords, error: keywordsError } = await supabaseClient
      .from("keywords")
      .select("*")
      .eq("user_id", userId);

    if (keywordsError || !keywords || keywords.length === 0) {
      await supabaseClient
        .from("scan_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          results: { matches: 0, newMatches: 0, message: "No keywords found" },
        })
        .eq("id", jobId);
      return createResponse({ message: "No keywords found", matches: 0, newMatches: 0 });
    }

    // Fetch sources
    const sourceQuery = supabaseClient.from("sources").select("*").eq("user_id", userId);
    if (sourceId) sourceQuery.eq("id", sourceId);
    const { data: sources, error: sourcesError } = await sourceQuery;
    
    if (sourcesError) {
      throw new Error(`Error fetching sources: ${sourcesError.message}`);
    }

    const redditSources = (sources?.filter(s => (!s.platform || s.platform === 'reddit') && s.subreddit?.trim()) || []);
    const twitterSources = sources?.filter(s => s.platform === 'twitter') || [];
    const tiktokSources = sources?.filter(s => s.platform === 'tiktok') || [];
    
    // If no Reddit sources, use popular subreddits to scan all of Reddit
    const defaultSubreddits = [
      'all', 'popular', 'AskReddit', 'technology', 'programming', 'webdev', 
      'startups', 'entrepreneur', 'business', 'marketing', 'SaaS', 'indiebiz',
      'sideproject', 'productivity', 'smallbusiness', 'freelance', 'consulting'
    ];
    
    const subredditsToScan = redditSources.length > 0 
      ? redditSources.map(s => s.subreddit!.trim())
      : defaultSubreddits;
    
    console.log(`Found ${keywords.length} keywords, ${redditSources.length} Reddit sources (${subredditsToScan.length} subreddits to scan), ${twitterSources.length} Twitter sources, ${tiktokSources.length} TikTok sources`);

    // Get existing matches
    let existingIds: Set<string>;
    if (skipRedditRSS && existingPlatformIds && existingPlatformIds.length > 0) {
      existingIds = new Set(existingPlatformIds);
      console.log(`Using ${existingIds.size} existing platform IDs from browser`);
    } else {
      const { data: existingMatches } = await supabaseClient
        .from("matches")
        .select("platform_id")
        .eq("user_id", userId);
      existingIds = new Set(existingMatches?.map(m => m.platform_id) || []);
      console.log(`Found ${existingIds.size} existing matches from database`);
    }

    const newMatches: any[] = [];
    let totalMatches = 0;

    // Scan Reddit posts - OPTIMIZED: Fetch once per subreddit, check all keywords
    console.log(`Scanning ${keywords.length} keywords across ${subredditsToScan.length} subreddits`);
    if (!skipRedditRSS) {
      // STEP 1: Fetch all subreddit RSS feeds in parallel (much faster!)
      console.log(`🚀 Fetching RSS feeds for ${subredditsToScan.length} subreddits in parallel...`);
      const subredditPosts = await Promise.all(
        subredditsToScan.map(async (sub) => {
          if (!sub || !sub.trim()) {
            return { subreddit: sub, posts: [], error: 'Invalid subreddit' };
          }

          try {
            const subredditPath = (sub === 'all' || sub === 'popular') ? sub : `r/${sub}`;
            // Increased limit back to 50 since we're fetching once (not per keyword)
            const rssUrl = `https://www.reddit.com/${subredditPath}/new/.rss?limit=50`;
            
            const rssResponse = await fetch(rssUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/rss+xml, application/xml, text/xml, */*",
              },
            });

            if (rssResponse.ok) {
              const rssText = await rssResponse.text();
              const posts = parseRSS(rssText);
              console.log(`✅ RSS fetch for r/${sub}: Found ${posts.length} posts`);
              return { subreddit: sub, posts, error: null };
            } else {
              console.error(`❌ RSS fetch failed for r/${sub}: ${rssResponse.status}`);
              return { subreddit: sub, posts: [], error: `${rssResponse.status} ${rssResponse.statusText}` };
            }
          } catch (err: any) {
            console.error(`❌ Error fetching RSS for r/${sub}:`, err.message);
            return { subreddit: sub, posts: [], error: err.message };
          }
        })
      );

      console.log(`✅ Finished fetching ${subredditPosts.length} subreddit feeds`);

      // STEP 2: Check all keywords against all fetched posts
      console.log(`🔍 Checking ${keywords.length} keywords against all posts...`);
      for (const keyword of keywords) {
        console.log(`Processing keyword: "${keyword.phrase}" (regex: ${keyword.is_regex})`);
        
        for (const { subreddit, posts, error } of subredditPosts) {
          if (error || !posts || posts.length === 0) {
            continue;
          }

          const sub = subreddit.replace('r/', '');
          let spamFiltered = 0;
          let keywordFiltered = 0;
          let alreadyExists = 0;
          let newMatchesForKeyword = 0;

          for (const post of posts) {
            const postText = `${post.title} ${post.selftext}`.trim();
            
            if (isSpam(postText)) {
              spamFiltered++;
              continue;
            }

            const matchCheck = matchesKeyword(postText, keyword);
            
            // ULTRA-STRICT: Only match if it passed the strict filtering (hasIntentSignal = true)
            if (!matchCheck.matched || !matchCheck.hasIntentSignal) {
              keywordFiltered++;
              continue;
            }

            // Additional spam check for Reddit-specific patterns
            const subredditName = (post.subreddit || sub || "").toLowerCase();
            const launchySubreddit = PRODUCT_LAUNCH_SUBREDDITS.has(subredditName);
            const launchyText = looksLikeLaunchPost(postText);
            
            // Reject launch posts even if they have intent (they're promotional)
            if (launchySubreddit || launchyText) {
              keywordFiltered++;
              continue;
            }

            // Require strong intent signals (questions or explicit problems)
            const hasQuestion = postText.includes("?");
            const demandSignal = hasDemandLanguage(postText);
            const strongIntent = hasQuestion || demandSignal || matchCheck.intentSignals >= 2;

            if (!strongIntent) {
              keywordFiltered++;
              continue;
            }

            const platformId = `reddit_post_${post.id}`;
            if (!existingIds.has(platformId)) {
              newMatches.push({
                user_id: userId,
                keyword_id: keyword.id,
                platform_id: platformId,
                platform: 'reddit',
                title: post.title,
                body: post.selftext || null,
                url: post.url,
                author: post.author,
                subreddit: post.subreddit,
                created_at_utc: new Date(post.created_utc * 1000).toISOString(),
              });
              existingIds.add(platformId);
              totalMatches++;
              newMatchesForKeyword++;
            } else {
              alreadyExists++;
            }
          }

          console.log(`📊 r/${sub} stats for "${keyword.phrase}": ${posts.length} posts, ${spamFiltered} spam, ${keywordFiltered} no match, ${newMatchesForKeyword} new, ${alreadyExists} existing`);
        }
      }
    } else {
      console.log("⏭️ Skipping Reddit RSS (handled by browser)");
    }

    // Scan Twitter tweets
    let twitterMatches = 0;
    const apifyToken = Deno.env.get("APIFY_TOKEN");
    const apifyActorId = Deno.env.get("APIFY_TWITTER_ACTOR_ID") || "kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest";
    
    if (twitterSources.length > 0 && keywords.length > 0 && apifyToken) {
      console.log(`🐦 Scanning Twitter for ${keywords.length} keywords...`);
      
      // Group keywords by source region to optimize API calls
      const keywordsByRegion = new Map<string, {keyword: any, source: any}[]>();
      
      for (const keyword of keywords) {
        for (const source of twitterSources) {
          const region = source.region || "en";
          if (!keywordsByRegion.has(region)) {
            keywordsByRegion.set(region, []);
          }
          keywordsByRegion.get(region)!.push({ keyword, source });
        }
      }

      for (const [region, keywordSources] of keywordsByRegion.entries()) {
        const langCode = region.split("-")[0] || "en";
        
        // OPTIMIZATION: Combine all keywords for this region into a single search
        // This reduces API calls from N keywords to 1 call per region
        const allKeywords = keywordSources.map(ks => ks.keyword);
        const searchTerms = allKeywords.map(k => k.phrase);
        
        console.log(`🐦 Processing ${allKeywords.length} Twitter keywords together for region: ${region}`);
        console.log(`   Keywords: ${searchTerms.join(", ")}`);
        
        try {
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const sinceDate = sevenDaysAgo.toISOString().replace(/[:.]/g, '-').split('.')[0] + '_UTC';
          const untilDate = now.toISOString().replace(/[:.]/g, '-').split('.')[0] + '_UTC';
          
          // Use OR logic: search for all keywords at once
          // Apify will return tweets matching ANY of the keywords
          const apifyInput = {
            "searchTerms": searchTerms,
              "filter:blue_verified": false,
              "filter:consumer_video": false,
              "filter:has_engagement": true,
              "filter:hashtags": false,
              "filter:images": false,
              "filter:links": false,
              "filter:media": false,
              "filter:mentions": false,
              "filter:native_video": false,
              "filter:nativeretweets": false,
              "filter:news": false,
              "filter:pro_video": false,
              "filter:quote": false,
              "filter:replies": false,
              "filter:safe": false,
              "filter:spaces": false,
              "filter:twimg": false,
              "filter:videos": false,
              "filter:vine": false,
              "include:nativeretweets": false,
              "lang": langCode,
              "min_faves": 3,
              "min_replies": 1,
              "min_retweets": 0,
              "since": sinceDate,
              "until": untilDate,
              "maxItems": 100,
            };

            const runUrl = `https://api.apify.com/v2/acts/${apifyActorId}/runs?token=${apifyToken}`;
            console.log(`🔍 Calling Apify actor: ${apifyActorId}`);
            
            const runResponse = await fetch(runUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(apifyInput),
            });

            if (!runResponse.ok) {
              const errorText = await runResponse.text();
              console.error(`❌ Apify run failed: ${runResponse.status} ${runResponse.statusText}`);
              console.error(`Error: ${errorText.substring(0, 200)}`);
              continue;
            }

            const runData = await runResponse.json();
            const runId = runData.data?.id;
            const defaultDatasetId = runData.data?.defaultDatasetId;
            
            console.log(`📋 Apify run response:`, JSON.stringify({
              runId,
              defaultDatasetId,
              status: runData.data?.status,
            }));
            
            if (!runId) {
              console.error(`❌ No run ID in Apify response:`, JSON.stringify(runData));
              continue;
            }

            console.log(`✅ Apify run started: ${runId}, defaultDatasetId: ${defaultDatasetId}`);

            // Poll for completion (max 2 minutes)
            let completed = false;
            let attempts = 0;
            const maxAttempts = 40; // 40 * 3s = 2 minutes max

            while (!completed && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              attempts++;

              const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`;
              const statusResponse = await fetch(statusUrl);
              
              if (!statusResponse.ok) {
                console.error(`❌ Failed to check Apify run status: ${statusResponse.status}`);
                break;
              }

              const statusData = await statusResponse.json();
              const status = statusData.data?.status;

              if (status === "SUCCEEDED") {
                completed = true;
                console.log(`✅ Apify run completed successfully`);
              } else if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
                console.error(`❌ Apify run ${status}:`, statusData.data?.statusMessage || "");
                break;
              } else {
                console.log(`⏳ Apify run status: ${status} (attempt ${attempts}/${maxAttempts})`);
              }
            }

            if (!completed) {
              console.error(`❌ Apify run did not complete in time for region ${region}`);
              continue;
            }

            // Get the dataset ID from the run status (it might be updated)
            const finalStatusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`;
            const finalStatusResponse = await fetch(finalStatusUrl);
            let datasetId = runData.data?.defaultDatasetId;
            
            if (finalStatusResponse.ok) {
              const finalStatusData = await finalStatusResponse.json();
              datasetId = finalStatusData.data?.defaultDatasetId || datasetId;
              console.log(`📋 Final run status - datasetId: ${datasetId}, itemCount: ${finalStatusData.data?.stats?.itemsCount || 'unknown'}`);
            }

            if (!datasetId) {
              console.error(`❌ No dataset ID found for run ${runId}`);
              continue;
            }

            // Get dataset items
            const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=100`;
            console.log(`🔍 Fetching dataset from: ${datasetUrl.replace(apifyToken, 'TOKEN')}`);
            const datasetResponse = await fetch(datasetUrl);

            if (!datasetResponse.ok) {
              const errorText = await datasetResponse.text();
              console.error(`❌ Failed to fetch Apify dataset: ${datasetResponse.status} ${datasetResponse.statusText}`);
              console.error(`Error response: ${errorText.substring(0, 500)}`);
              continue;
            }

            const tweets = await datasetResponse.json();
            console.log(`✅ Fetched ${Array.isArray(tweets) ? tweets.length : 'N/A'} tweets from Apify`);
            console.log(`📋 Response type: ${Array.isArray(tweets) ? 'array' : typeof tweets}`);
            
            if (!Array.isArray(tweets)) {
              console.error(`❌ Expected array but got:`, typeof tweets);
              console.error(`Response sample:`, JSON.stringify(tweets).substring(0, 500));
              continue;
            }
            
            if (tweets.length > 0) {
              console.log(`📝 Sample tweet structure:`, Object.keys(tweets[0]));
              console.log(`📝 Sample tweet (first 500 chars):`, JSON.stringify(tweets[0]).substring(0, 500));
            } else {
              console.warn(`⚠️ No tweets returned from Apify dataset ${datasetId}`);
            }

            let spamFiltered = 0;
            let keywordFiltered = 0;
            let alreadyExists = 0;
            let totalNewMatches = 0;
            let keywordMatchButNoIntent = 0;

            // Process each tweet and match it against ALL keywords
            let processedCount = 0;
            for (const tweet of tweets) {
              processedCount++;
              
              // Try multiple possible field names for tweet text (Apify uses 'text' field)
              const tweetTextRaw = tweet.text || tweet.full_text || tweet.tweetText || tweet.content || tweet.body || "";
              // Clean HTML tags from Apify response
              const cleanedText = cleanHtmlFromTweet(tweetTextRaw);
              // Apify structure might not have nested user object, check for author fields directly
              const userName = tweet.user?.name || tweet.user?.username || tweet.user?.screen_name || tweet.author?.name || tweet.author?.username || tweet.authorName || "";
              const tweetText = `${cleanedText} ${userName}`.trim();
              
              // Log first few tweets for debugging
              if (processedCount <= 3) {
                console.log(`🔍 Tweet #${processedCount} structure:`, {
                  hasText: !!tweetTextRaw,
                  textLength: tweetTextRaw.length,
                  textPreview: tweetTextRaw.substring(0, 100),
                  allKeys: Object.keys(tweet),
                  userKeys: tweet.user ? Object.keys(tweet.user) : 'no user',
                });
              }
              
              if (!tweetText || tweetText.length < 5) {
                spamFiltered++;
                if (processedCount <= 3) {
                  console.log(`⚠️ Skipping tweet #${processedCount} - empty or too short. Raw text: "${tweetTextRaw}", Full keys:`, Object.keys(tweet));
                }
                continue;
              }
              
              if (isSpam(tweetText)) {
                spamFiltered++;
                continue;
              }

              // Try multiple possible field names for engagement metrics (Apify uses camelCase)
              const likes = tweet.likeCount || tweet.likes || tweet.favorite_count || tweet.like_count || tweet.favorites || 0;
              const replies = tweet.replyCount || tweet.replies || tweet.reply_count || 0;
              const retweets = tweet.retweetCount || tweet.retweets || tweet.retweet_count || 0;
              
              // Log engagement for first few tweets
              if (processedCount <= 3) {
                console.log(`📊 Tweet #${processedCount} engagement:`, { likes, replies, retweets });
              }
              
              // Basic engagement filter (less strict)
              if (likes < 2 && replies < 1 && retweets < 1) {
                spamFiltered++;
                if (processedCount <= 3) {
                  console.log(`⚠️ Tweet #${processedCount} filtered - low engagement: likes=${likes}, replies=${replies}, retweets=${retweets}`);
                }
                continue;
              }

              // Check which keyword(s) this tweet matches (Twitter uses simpler matching)
              let matchedKeyword: any = null;
              let bestIntentScore = 0;
              let keywordMatches: string[] = [];

              for (const keyword of allKeywords) {
                // First check if keyword matches (simple check, no strict intent required)
                const simpleMatch = matchesKeywordSimple(tweetText, keyword);
                if (simpleMatch) {
                  keywordMatches.push(keyword.phrase);
                  
                  // Then check for intent signals separately (more lenient for Twitter)
                  const matchCheck = matchesKeyword(tweetText, keyword);
                  const hasQuestion = tweetText.includes("?");
                  const demandSignal = hasDemandLanguage(tweetText);
                  
                  // Calculate intent score (Twitter is more lenient)
                  let intentScore = 0;
                  if (matchCheck.hasIntentSignal) intentScore += 30;
                  if (hasQuestion) intentScore += 20;
                  if (demandSignal) intentScore += 20;
                  if (matchCheck.intentSignals) intentScore += matchCheck.intentSignals * 10;
                  
                  // Log first match for debugging
                  if (processedCount <= 3 && !matchedKeyword) {
                    console.log(`🔍 Keyword "${keyword.phrase}" matched!`, {
                      simpleMatch,
                      hasIntentSignal: matchCheck.hasIntentSignal,
                      intentSignals: matchCheck.intentSignals,
                      hasQuestion,
                      demandSignal,
                      intentScore,
                    });
                  }
                  
                  // Accept if keyword matches AND has any intent indicator
                  if (intentScore > bestIntentScore) {
                    bestIntentScore = intentScore;
                    matchedKeyword = keyword;
                  }
                }
              }

              // Log if no keywords matched
              if (processedCount <= 3 && keywordMatches.length === 0) {
                console.log(`⚠️ Tweet #${processedCount} matched NO keywords. Text: "${tweetText.substring(0, 150)}"`);
                console.log(`   Searching for keywords:`, allKeywords.map(k => k.phrase));
              }

              // For Twitter: STRICT - Must have keyword match AND explicit first-person intent
              if (!matchedKeyword) {
                keywordFiltered++;
                continue;
              }
              
              // STRICT FILTERING: Reject if no clear first-person intent signal
              // Must have: question mark OR first-person demand language OR explicit "I need help"
              const hasQuestion = tweetText.includes("?");
              const hasFirstPersonDemand = /\b(?:i\s+need|i'?m\s+looking|i\s+want|i\s+can'?t|i\s+don'?t\s+know|i\s+have\s+a|i'?m\s+having|my\s+problem|my\s+issue)\b/i.test(tweetText);
              const hasExplicitHelpRequest = /\b(?:help|recommend|suggest|advice)\b.*\?/i.test(tweetText);
              
              // Reject third-person problem descriptions (educational/promotional content)
              const isThirdPersonProblem = /\b(?:many|most|some|they|them|their|owners|founders|entrepreneurs|businesses)\s+(?:chase|struggle|burn|end up|get stuck|are stuck|guess|test|leave|exhaust|desperate)/i.test(tweetText);
              
              if (isThirdPersonProblem && !hasQuestion && !hasFirstPersonDemand) {
                keywordMatchButNoIntent++;
                keywordFiltered++;
                if (processedCount <= 5) {
                  console.log(`⚠️ Tweet filtered - third-person problem description (promotional): ${tweetText.substring(0, 100)}`);
                }
                continue;
              }
              
              // Must have at least one: question mark OR first-person demand OR explicit help request
              if (!hasQuestion && !hasFirstPersonDemand && !hasExplicitHelpRequest) {
                keywordMatchButNoIntent++;
                keywordFiltered++;
                if (processedCount <= 5) {
                  console.log(`⚠️ Tweet matched keyword "${matchedKeyword.phrase}" but no first-person intent: ${tweetText.substring(0, 100)}`);
                }
                continue;
              }

              // Filter out pure mentions without context
              const isJustMention = /^@\w+/.test(tweetText.trim()) && !tweetText.includes("?") && !hasFirstPersonDemand;
              if (isJustMention) {
                keywordFiltered++;
                continue;
              }

              // Try multiple possible field names for tweet ID
              const tweetId = tweet.id || tweet.id_str || tweet.tweetId || tweet.url?.split('/').pop() || `tweet_${Date.now()}_${Math.random()}`;
              const platformId = `twitter_tweet_${tweetId}`;
              
              if (!existingIds.has(platformId)) {
                // Apify uses camelCase for fields
                const username = tweet.user?.username || tweet.user?.screen_name || tweet.author?.username || tweet.author?.screen_name || tweet.authorName || "unknown";
                // Try to get URL from tweet (Apify has 'twitterUrl' or 'url') or construct it
                const tweetUrl = tweet.twitterUrl || tweet.url || tweet.permalink || `https://twitter.com/${username}/status/${tweetId}`;
                
                let createdAt = new Date();
                if (tweet.created_at) {
                  const parsed = new Date(tweet.created_at);
                  if (!isNaN(parsed.getTime())) {
                    createdAt = parsed;
                  }
                } else if (tweet.timestamp) {
                  const parsed = new Date(tweet.timestamp * 1000);
                  if (!isNaN(parsed.getTime())) {
                    createdAt = parsed;
                  }
                }

                // Ensure both title and body are cleaned (double-check)
                const finalCleanedText = cleanHtmlFromTweet(tweetText);
                const finalTitle = cleanHtmlFromTweet(finalCleanedText.substring(0, 200));
                
                console.log(`✅ Saving Twitter match: "${finalCleanedText.substring(0, 80)}..." (keyword: "${matchedKeyword.phrase}", intent score: ${bestIntentScore})`);
                newMatches.push({
                  user_id: userId,
                  keyword_id: matchedKeyword.id,
                  platform_id: platformId,
                  platform: 'twitter',
                  title: finalTitle || null,
                  body: finalCleanedText || null,
                  url: tweetUrl,
                  author: username,
                  subreddit: null,
                  created_at_utc: createdAt.toISOString(),
                });
                existingIds.add(platformId);
                totalMatches++;
                twitterMatches++;
                totalNewMatches++;
              } else {
                alreadyExists++;
              }
            }

            console.log(`📊 Twitter stats for region ${region}: ${tweets.length} tweets, ${spamFiltered} spam/low engagement, ${keywordMatchButNoIntent} keyword match but no intent, ${keywordFiltered - keywordMatchButNoIntent} no keyword match, ${totalNewMatches} new matches, ${alreadyExists} existing`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (err) {
          console.error(`Error scanning Twitter for region ${region}:`, err);
        }
      }
    }
    
    if (twitterSources.length > 0 && !apifyToken) {
      console.log("⚠️ Twitter sources found but APIFY_TOKEN not set. Skipping Twitter scanning.");
    }
    
    if (twitterSources.length > 0 && keywords.length === 0) {
      console.log("⚠️ Twitter sources found but no keywords. Skipping Twitter scanning.");
    }

    // Scan TikTok videos
    let tiktokMatches = 0;
    const apifyTiktokActorId = Deno.env.get("APIFY_TIKTOK_ACTOR_ID") || "scraptik~tiktok-api";
    
    if (tiktokSources.length > 0 && keywords.length > 0 && apifyToken) {
      console.log(`🎵 Scanning TikTok for ${keywords.length} keywords...`);
      
      // Group keywords by source region (similar to Twitter)
      const tiktokKeywordsByRegion = new Map<string, {keyword: any, source: any}[]>();
      
      for (const keyword of keywords) {
        for (const source of tiktokSources) {
          const region = source.region || "en";
          if (!tiktokKeywordsByRegion.has(region)) {
            tiktokKeywordsByRegion.set(region, []);
          }
          tiktokKeywordsByRegion.get(region)!.push({ keyword, source });
        }
      }

      // If no region-specific sources, create a default "en" group
      if (tiktokKeywordsByRegion.size === 0 && keywords.length > 0) {
        tiktokKeywordsByRegion.set("en", keywords.map(k => ({ keyword: k, source: { region: "en" } })));
      }

      for (const [region, keywordSources] of tiktokKeywordsByRegion.entries()) {
        const allKeywords = keywordSources.map(ks => ks.keyword);
        const searchTerms = allKeywords.map(k => k.phrase);
        
        console.log(`🎵 Processing ${allKeywords.length} TikTok keywords together for region: ${region}`);
        console.log(`   Keywords: ${searchTerms.join(", ")}`);
        
        try {
          // TikTok Apify actor input - using searchPosts_keyword for keyword search
          const tiktokApifyInput = {
            "searchPosts_useFilters": false,
            "searchPosts_keyword": searchTerms.join(" OR "), // Combine keywords with OR
            "searchPosts_count": 50, // Max results per search
            "searchPosts_offset": 0,
            "searchPosts_publishTime": 0, // 0 = any time, can filter by timestamp if needed
            "searchPosts_sortType": 0, // 0 = relevance, 1 = time
          };

          const runUrl = `https://api.apify.com/v2/acts/${apifyTiktokActorId}/runs?token=${apifyToken}`;
          console.log(`🔍 Calling Apify TikTok actor: ${apifyTiktokActorId}`);
          
          const runResponse = await fetch(runUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tiktokApifyInput),
          });

          if (!runResponse.ok) {
            const errorText = await runResponse.text();
            console.error(`❌ Apify TikTok run failed: ${runResponse.status} ${runResponse.statusText}`);
            console.error(`Error: ${errorText.substring(0, 200)}`);
            continue;
          }

          const runData = await runResponse.json();
          const runId = runData.data?.id;
          const defaultDatasetId = runData.data?.defaultDatasetId;
          
          console.log(`📋 Apify TikTok run response:`, JSON.stringify({
            runId,
            defaultDatasetId,
            status: runData.data?.status,
          }));
          
          if (!runId) {
            console.error(`❌ No run ID in Apify TikTok response:`, JSON.stringify(runData));
            continue;
          }

          console.log(`✅ Apify TikTok run started: ${runId}, defaultDatasetId: ${defaultDatasetId}`);

          // Poll for completion (max 3 minutes for TikTok)
          let completed = false;
          let attempts = 0;
          const maxAttempts = 60; // 60 * 3s = 3 minutes max

          while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            attempts++;

            const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`;
            const statusResponse = await fetch(statusUrl);
            
            if (!statusResponse.ok) {
              console.error(`❌ Failed to check Apify TikTok run status: ${statusResponse.status}`);
              break;
            }

            const statusData = await statusResponse.json();
            const status = statusData.data?.status;

            if (status === "SUCCEEDED") {
              completed = true;
              console.log(`✅ Apify TikTok run completed successfully`);
            } else if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
              console.error(`❌ Apify TikTok run ${status}:`, statusData.data?.statusMessage || "");
              break;
            } else {
              console.log(`⏳ Apify TikTok run status: ${status} (attempt ${attempts}/${maxAttempts})`);
            }
          }

          if (!completed) {
            console.error(`❌ Apify TikTok run did not complete in time for region ${region}`);
            continue;
          }

          // Get the dataset ID from the run status
          const finalStatusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`;
          const finalStatusResponse = await fetch(finalStatusUrl);
          let datasetId = runData.data?.defaultDatasetId;
          
          if (finalStatusResponse.ok) {
            const finalStatusData = await finalStatusResponse.json();
            datasetId = finalStatusData.data?.defaultDatasetId || datasetId;
            console.log(`📋 Final TikTok run status - datasetId: ${datasetId}, itemCount: ${finalStatusData.data?.stats?.itemsCount || 'unknown'}`);
          }

          if (!datasetId) {
            console.error(`❌ No dataset ID found for TikTok run ${runId}`);
            continue;
          }

          // Get dataset items
          const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=100`;
          console.log(`🔍 Fetching TikTok dataset from: ${datasetUrl.replace(apifyToken, 'TOKEN')}`);
          const datasetResponse = await fetch(datasetUrl);

          if (!datasetResponse.ok) {
            const errorText = await datasetResponse.text();
            console.error(`❌ Failed to fetch Apify TikTok dataset: ${datasetResponse.status} ${datasetResponse.statusText}`);
            console.error(`Error response: ${errorText.substring(0, 500)}`);
            continue;
          }

          const tiktokVideos = await datasetResponse.json();
          console.log(`✅ Fetched ${Array.isArray(tiktokVideos) ? tiktokVideos.length : 'N/A'} TikTok videos from Apify`);
          
          if (!Array.isArray(tiktokVideos)) {
            console.error(`❌ Expected array but got:`, typeof tiktokVideos);
            console.error(`Response sample:`, JSON.stringify(tiktokVideos).substring(0, 500));
            continue;
          }
          
          if (tiktokVideos.length > 0) {
            console.log(`📝 Sample TikTok video structure:`, Object.keys(tiktokVideos[0]));
          } else {
            console.warn(`⚠️ No TikTok videos returned from Apify dataset ${datasetId}`);
          }

          let spamFiltered = 0;
          let keywordFiltered = 0;
          let alreadyExists = 0;
          let totalNewMatches = 0;
          let keywordMatchButNoIntent = 0;

          // Process each TikTok video and match it against ALL keywords
          let processedCount = 0;
          for (const video of tiktokVideos) {
            processedCount++;
            
            // Extract video text (description/caption)
            const videoTextRaw = video.desc || video.description || video.caption || video.text || video.content || "";
            const cleanedText = cleanHtmlFromTweet(videoTextRaw);
            const authorName = video.author?.nickname || video.author?.uniqueId || video.author?.name || video.nickname || video.username || "";
            const videoText = `${cleanedText} ${authorName}`.trim();
            
            // Log first few videos for debugging
            if (processedCount <= 3) {
              console.log(`🔍 TikTok video #${processedCount} structure:`, {
                hasDesc: !!videoTextRaw,
                textLength: videoTextRaw.length,
                textPreview: videoTextRaw.substring(0, 100),
                allKeys: Object.keys(video),
              });
            }
            
            if (!videoText || videoText.length < 5) {
              spamFiltered++;
              continue;
            }
            
            if (isSpam(videoText)) {
              spamFiltered++;
              continue;
            }

            // Check engagement metrics (likes, comments, shares)
            const likes = video.stats?.diggCount || video.stats?.likeCount || video.likeCount || video.likes || 0;
            const comments = video.stats?.commentCount || video.commentCount || video.comments || 0;
            const shares = video.stats?.shareCount || video.shareCount || video.shares || 0;
            
            // Basic engagement filter (TikTok videos need some engagement)
            if (likes < 5 && comments < 1 && shares < 1) {
              spamFiltered++;
              if (processedCount <= 3) {
                console.log(`⚠️ TikTok video #${processedCount} filtered - low engagement: likes=${likes}, comments=${comments}, shares=${shares}`);
              }
              continue;
            }

            // Check which keyword(s) this video matches
            let matchedKeyword: any = null;
            let bestIntentScore = 0;

            for (const keyword of allKeywords) {
              const simpleMatch = matchesKeywordSimple(videoText, keyword);
              if (simpleMatch) {
                const matchCheck = matchesKeyword(videoText, keyword);
                const hasQuestion = videoText.includes("?");
                const demandSignal = hasDemandLanguage(videoText);
                
                let intentScore = 0;
                if (matchCheck.hasIntentSignal) intentScore += 30;
                if (hasQuestion) intentScore += 20;
                if (demandSignal) intentScore += 20;
                if (matchCheck.intentSignals) intentScore += matchCheck.intentSignals * 10;
                
                if (intentScore > bestIntentScore) {
                  bestIntentScore = intentScore;
                  matchedKeyword = keyword;
                }
              }
            }

            // Must have keyword match AND explicit first-person intent
            if (!matchedKeyword) {
              keywordFiltered++;
              continue;
            }
            
            // STRICT FILTERING: Require first-person intent
            const hasQuestion = videoText.includes("?");
            const hasFirstPersonDemand = /\b(?:i\s+need|i'?m\s+looking|i\s+want|i\s+can'?t|i\s+don'?t\s+know|i\s+have\s+a|i'?m\s+having|my\s+problem|my\s+issue)\b/i.test(videoText);
            const hasExplicitHelpRequest = /\b(?:help|recommend|suggest|advice)\b.*\?/i.test(videoText);
            
            // Reject third-person problem descriptions
            const isThirdPersonProblem = /\b(?:many|most|some|they|them|their|owners|founders|entrepreneurs|businesses)\s+(?:chase|struggle|burn|end up|get stuck|are stuck|guess|test|leave|exhaust|desperate)/i.test(videoText);
            
            if (isThirdPersonProblem && !hasQuestion && !hasFirstPersonDemand) {
              keywordMatchButNoIntent++;
              keywordFiltered++;
              continue;
            }
            
            // Must have at least one: question mark OR first-person demand OR explicit help request
            if (!hasQuestion && !hasFirstPersonDemand && !hasExplicitHelpRequest) {
              keywordMatchButNoIntent++;
              keywordFiltered++;
              continue;
            }

            // Extract video ID and create platform ID
            const videoId = video.awemeId || video.id || video.videoId || `tiktok_${Date.now()}_${Math.random()}`;
            const platformId = `tiktok_video_${videoId}`;
            
            if (!existingIds.has(platformId)) {
              const username = video.author?.uniqueId || video.author?.nickname || video.nickname || video.username || "unknown";
              // Construct TikTok URL
              const videoUrl = video.shareUrl || video.url || `https://www.tiktok.com/@${username}/video/${videoId}`;
              
              let createdAt = new Date();
              if (video.createTime) {
                const parsed = new Date(video.createTime * 1000);
                if (!isNaN(parsed.getTime())) {
                  createdAt = parsed;
                }
              } else if (video.createdAt) {
                const parsed = new Date(video.createdAt);
                if (!isNaN(parsed.getTime())) {
                  createdAt = parsed;
                }
              }

              const finalCleanedText = cleanHtmlFromTweet(videoText);
              const finalTitle = cleanHtmlFromTweet(finalCleanedText.substring(0, 200));
              
              console.log(`✅ Saving TikTok match: "${finalCleanedText.substring(0, 80)}..." (keyword: "${matchedKeyword.phrase}", intent score: ${bestIntentScore})`);
              newMatches.push({
                user_id: userId,
                keyword_id: matchedKeyword.id,
                platform_id: platformId,
                platform: 'tiktok',
                title: finalTitle || null,
                body: finalCleanedText || null,
                url: videoUrl,
                author: username,
                subreddit: null,
                created_at_utc: createdAt.toISOString(),
              });
              existingIds.add(platformId);
              totalMatches++;
              tiktokMatches++;
              totalNewMatches++;
            } else {
              alreadyExists++;
            }
          }

          console.log(`📊 TikTok stats for region ${region}: ${tiktokVideos.length} videos, ${spamFiltered} spam/low engagement, ${keywordMatchButNoIntent} keyword match but no intent, ${keywordFiltered - keywordMatchButNoIntent} no keyword match, ${totalNewMatches} new matches, ${alreadyExists} existing`);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (err) {
          console.error(`Error scanning TikTok for region ${region}:`, err);
        }
      }
    }
    
    if (tiktokSources.length > 0 && !apifyToken) {
      console.log("⚠️ TikTok sources found but APIFY_TOKEN not set. Skipping TikTok scanning.");
    }
    
    if (tiktokSources.length > 0 && keywords.length === 0) {
      console.log("⚠️ TikTok sources found but no keywords. Skipping TikTok scanning.");
    }

    // Save matches
    console.log(`Total matches found: ${totalMatches}, New matches: ${newMatches.length}`);
    if (newMatches.length > 0) {
      console.log(`Inserting ${newMatches.length} matches...`);
      const { error: insertError } = await supabaseClient.from("matches").insert(newMatches);
      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Error inserting matches: ${insertError.message}`);
      }
      console.log("✅ Matches inserted successfully");
    } else {
      console.log("⚠️ No new matches to insert");
    }

    const results = {
      message: "Scan completed successfully",
      matches: totalMatches,
      newMatches: newMatches.length,
      twitterMatches: twitterMatches,
      tiktokMatches: tiktokMatches,
      backfillMatches: 0,
    };

    // Update job status to 'completed'
    await supabaseClient
      .from("scan_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        results: results,
      })
      .eq("id", jobId);

    console.log(`✅ Scan job ${jobId} completed successfully`);
    return createResponse(results);

  } catch (error: any) {
    console.error("Process Scan Error:", error);
    
    // Update job status to 'failed'
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      
      // jobId was already extracted at the start of the function
      if (jobId) {
        await supabaseClient
          .from("scan_jobs")
          .update({
            status: "failed",
            error: error.message || "Internal server error",
          })
          .eq("id", jobId);
      }
    } catch (updateError) {
      console.error("Failed to update job status:", updateError);
    }
    
    return createResponse({
      error: error.message || "Internal server error",
      details: error.stack || String(error),
    }, 500);
  }
});





