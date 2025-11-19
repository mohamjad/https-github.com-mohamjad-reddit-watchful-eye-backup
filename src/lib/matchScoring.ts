/**
 * Intelligent keyword matching with intent detection and relevance scoring
 * Prioritizes matches where users are asking for, needing, or looking for something
 */

export interface MatchScore {
  score: number;
  matched: boolean;
  reasons: string[];
}

/**
 * High-intent patterns that indicate someone wants/needs something
 */
const HIGH_INTENT_PATTERNS = [
  // Direct requests
  /\b(?:need|needs|needed|want|wants|wanted|looking for|searching for|trying to find|seeking|seeks)\b/gi,
  // Questions
  /\b(?:anyone know|does anyone|can someone|where can|what.*recommend|recommendations?|suggestions?)\b/gi,
  // Problem statements
  /\b(?:problem|issue|broken|doesn't work|not working|frustrated|annoyed|hate|disappointed)\b/gi,
  // Comparison/alternative requests
  /\b(?:alternative|alternatives|better than|instead of|replace|replacement|vs\.?|versus)\b/gi,
  // Urgency indicators
  /\b(?:urgent|asap|as soon as|quickly|fast|immediately|right now)\b/gi,
  // Budget/price mentions (indicates buying intent)
  /\b(?:budget|price|cost|affordable|cheap|expensive|worth it|worth the)\b/gi,
  // Decision-making language
  /\b(?:should i|which|what.*best|best.*for|deciding|considering|thinking about)\b/gi,
];

/**
 * Low-intent patterns that indicate casual mentions (reduce score)
 */
const LOW_INTENT_PATTERNS = [
  // Past tense (already done)
  /\b(?:bought|purchased|got|have|had|used|tried|tested)\b/gi,
  // Negative context (not interested)
  /\b(?:don't need|don't want|not looking|not interested|avoid|skip)\b/gi,
  // Spam indicators
  /\b(?:check out|promo|discount|deal|sale|limited time)\b/gi,
];

/**
 * Asking patterns - people explicitly asking for solutions
 * These are HOT LEADS - ready to buy
 */
export const ASKING_PATTERNS = [
  // Direct requests
  /\b(?:I need|I'm looking for|looking for|searching for|trying to find|seeking|seeks)\b/gi,
  // Questions asking for recommendations
  /\b(?:anyone know|does anyone|can someone|where can|what.*recommend|recommendations?|suggestions?)\b/gi,
  // Decision-making questions
  /\b(?:what's the best|which.*best|best.*for|should i|which tool|which.*recommend)\b/gi,
  // Alternative/comparison requests
  /\b(?:alternative|alternatives|better than|instead of|replace|replacement|vs\.?|versus)\b/gi,
  // Help requests
  /\b(?:help me find|where can I|how do I find|can someone recommend|suggestions for|advice on)\b/gi,
  // Usage questions
  /\b(?:does anyone use|what do you use|which.*use|anyone.*use)\b/gi,
  // Budget/price mentions (buying intent)
  /\b(?:budget|price|cost|affordable|cheap|worth it|worth the)\b/gi,
];

/**
 * Problem patterns - people complaining about existing solutions
 * These are PRODUCT OPPORTUNITIES - what to build
 */
export const PROBLEM_PATTERNS = [
  // Negative emotions
  /\b(?:sucks|terrible|awful|hate|frustrated|annoyed|disappointed|worst)\b/gi,
  // Missing features
  /\b(?:missing|doesn't have|doesn't support|lacking|need.*but|wish.*had|wish.*would)\b/gi,
  // Complaints about functionality
  /\b(?:broken|doesn't work|not working|issue|problem|bug|glitch)\b/gi,
  // Why questions (complaints)
  /\b(?:why can't|why doesn't|why isn't|why.*so|why.*not)\b/gi,
  // Quality complaints
  /\b(?:slow|expensive|complicated|clunky|buggy|unreliable|overpriced)\b/gi,
  // Improvement requests
  /\b(?:needs to|should have|would be better if|needs.*feature|should.*support)\b/gi,
  // Comparison complaints
  /\b(?:not as good as|worse than|inferior to|prefer.*over)\b/gi,
];

/**
 * Spam/Promotional patterns - filter out promotional content, ads, and noise
 * These should be EXCLUDED from all tabs (Asking, Problems, Mentions)
 */
export const SPAM_PATTERNS = [
  // Promotional greetings with name: "Hey guys, [Name] here! If you're looking for..."
  /\b(?:hello|hey|hi)\s+(?:guys|everyone|all|folks|founders|builders)\s*[!.,]?\s*\w+\s+(?:here|here!|here,)\s*[!.,]?\s*(?:if you|we're|we are|we offer|looking for|tired of|i help)/gi,
  // Self-introduction followed by offer: "I'm [Name]! If you're looking for..." or "My name is [Name], if you..."
  /\b(?:i'm|i am|this is|my name is)\s+\w+\s*[!.,]?\s*(?:if you|we're|we are|we offer|looking for|tired of|we've|i help)/gi,
  // "I help [target audience]" pattern - common self-promotion (catch various forms)
  /\bi help\s+(?:saas|startups|founders|builders|entrepreneurs|indie hackers|businesses|companies|people|you|.*)\s+(?:with|explain|build|create|develop|turn|convert|get|make|design|deliver|turn.*into)/gi,
  // "I help SaaS & startups" pattern (with ampersand)
  /\bi help\s+(?:saas|startups|founders|builders)\s*[&]\s*(?:saas|startups|founders|builders|.*)\s+(?:with|explain|build|create|develop|turn|convert|get|make|design|deliver)/gi,
  // "Need a clean, fast X that actually converts?" - promotional question pattern
  /\bneed a\s+(?:clean|fast|professional|modern|better)\s+\w+\s+(?:that|which)\s+(?:actually|really)\s+(?:converts|works|helps)/gi,
  // "🚀 Need a clean, fast X" - promotional with emoji
  /🚀\s*need a\s+(?:clean|fast|professional|modern|better)/gi,
  // Promotional offers
  /\b(?:we're offering|we offer|free.*audit|free.*trial|free.*consultation|limited time|special offer|exclusive deal|free.*video|free.*demo)\b/gi,
  // "If you're looking for X or if you're tired of Y" pattern (common in spam)
  /\bif you're (?:looking for|tired of|using)\s+\w+\s+or if you're/gi,
  // Spam indicators
  /\b(?:check out|promo|discount|deal|sale|limited time|sign up|subscribe|follow us|visit our|check our|try our|use our)\b/gi,
  // Self-promotion patterns
  /\b(?:i'm.*here|this is.*here|my name is.*here|i'm.*and i|we're.*and we|we've built|we built|we created|we developed|i've built|i built|i created)\s+(?:if you|to help|that helps|designed to|that|which)/gi,
  // Marketing phrases
  /\b(?:helps us understand|helps us|contact us|reach out|dm me|message me|let's connect|get in touch|schedule a call|are you interested)\b/gi,
  // Generic promotional openings
  /^(?:hello|hey|hi)\s+(?:guys|everyone|all|folks|founders|builders)\s*[!.,]?\s*\w+\s+(?:here|here!|here,)\s*/gi,
  // URL patterns (often spam)
  /\b(?:visit|check|try|use|sign up|subscribe)\s+(?:our|my|the)\s+(?:website|site|app|tool|service|product)\b/gi,
  // Call-to-action spam
  /\b(?:dm for|message for|contact for|reach out for|let me know if|feel free to|don't hesitate to|are you interested)\s+(?:more info|details|information|discount|deal|interested)\b/gi,
  // "Perfect for [use case]" - promotional pattern
  /\bperfect for\s+(?:landing pages|product hunt|launches|social media|saas|startups|founders)\b/gi,
  // "What you'll get" - promotional pattern
  /\bwhat you'll get\s*:?\s*(?:professional|free|clean|fast|modern)/gi,
  // "Here's what I'm building" - promotional announcement pattern
  /\b(?:here's|here is|this is)\s+what\s+(?:i'm|i am|we're|we are)\s+(?:building|creating|working on|developing)/gi,
  // "Lost in [problem]? Here's what I'm building" - promotional question pattern
  /\b(?:lost in|struggling with|tired of|frustrated with)\s+.*\?\s*(?:here's|here is|this is)\s+what\s+(?:i'm|i am|we're|we are)/gi,
  // Success story spam - "From X to $Y/month - I've packaged my system"
  /\bfrom\s+(?:struggling|broke|zero|nothing)\s+(?:freelancer|founder|entrepreneur|developer)\s+to\s+\$[\d,]+(?:\/month|\/mo|k\/month|k\/mo)\s+(?:agency|business|company)/gi,
  // "I've packaged my system" - promotional pattern
  /\b(?:i've|i have|we've|we have)\s+(?:packaged|created|built|developed)\s+(?:my|our)\s+(?:entire|complete|full)\s+(?:system|process|method|framework|solution)/gi,
  // Revenue/success claims in title - "$X/month", "$XK/month", "from X to $Y"
  /\$\d+[kkm]?(?:\/month|\/mo|\/year|\/yr)\s*(?:agency|business|revenue|income|profit)/gi,
  // "How do you [problem]? Here's what I'm building" - promotional question
  /\bhow do you\s+.*\?\s*(?:here's|here is|this is)\s+what\s+(?:i'm|i am|we're|we are)/gi,
];

/**
 * Noise patterns - low-quality content that should be filtered
 */
export const NOISE_PATTERNS = [
  // Very short posts (likely spam or incomplete)
  /^.{0,20}$/,
  // Generic greetings without substance
  /^(?:hello|hey|hi)\s+(?:guys|everyone|all)\s*[!.,]?\s*$/i,
  // Only URLs (no actual content)
  /^https?:\/\/\S+$/i,
  // Repetitive characters
  /(.)\1{10,}/,
  // Excessive punctuation
  /[!?]{5,}/,
];

/**
 * Context patterns that boost relevance when near keyword
 */
const CONTEXT_BOOSTERS = [
  // Proximity to intent words (within 10 words)
  {
    pattern: /\b(?:need|want|looking for|searching for)\s+(?:a|an|the)?\s*[^.!?]{0,50}?/gi,
    boost: 15,
  },
  // Question marks near keyword
  {
    pattern: /\?/g,
    boost: 10,
  },
  // Title case (often indicates importance)
  {
    pattern: /^[A-Z][a-z]+/,
    boost: 5,
  },
];

/**
 * Calculate match score based on intent and context
 */
export const scoreMatch = (
  text: string,
  keyword: { phrase: string; is_regex: boolean }
): MatchScore => {
  if (!text || !keyword.phrase) {
    return { score: 0, matched: false, reasons: [] };
  }

  const lowerText = text.toLowerCase();
  const lowerPhrase = keyword.phrase.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Step 1: Check if keyword matches at all
  let hasKeywordMatch = false;
  if (keyword.is_regex) {
    try {
      const regex = new RegExp(keyword.phrase, "i");
      hasKeywordMatch = regex.test(text);
    } catch (e) {
      hasKeywordMatch = lowerText.includes(lowerPhrase);
    }
  } else {
    // For multi-word keywords, use flexible matching to handle punctuation/whitespace variations
    // This allows "cpa tracker" to match "cpa-tracker", "cpa, tracker", "cpa  tracker", etc.
    if (lowerPhrase.includes(' ')) {
      // Escape special regex characters in the phrase
      const escapedPhrase = lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Create a regex that matches the phrase with flexible whitespace/punctuation between words
      // \b ensures word boundaries, \s+ matches any whitespace, [\s\-_,.;:]+ matches punctuation
      const words = escapedPhrase.split(/\s+/);
      const flexibleRegex = new RegExp(
        `\\b${words.join('[\\s\\-_,.;:]+')}\\b`,
        'i'
      );
      hasKeywordMatch = flexibleRegex.test(text);
      
      // Fallback: also try exact match for common case
      if (!hasKeywordMatch) {
        hasKeywordMatch = lowerText.includes(lowerPhrase);
      }
    } else {
      // Single-word keyword: use word boundaries for exact word match
      const escapedPhrase = lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      hasKeywordMatch = new RegExp(`\\b${escapedPhrase}\\b`, 'i').test(text);
    }
  }

  if (!hasKeywordMatch) {
    return { score: 0, matched: false, reasons: [] };
  }

  // Base score for matching keyword
  score += 20;
  reasons.push("Keyword found");

  // Step 2: Check for high-intent patterns
  let highIntentCount = 0;
  for (const pattern of HIGH_INTENT_PATTERNS) {
    // Create a new regex instance to avoid global flag issues
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(regex);
    if (matches) {
      highIntentCount += matches.length;
      score += matches.length * 15;
    }
  }

  if (highIntentCount > 0) {
    reasons.push(`${highIntentCount} high-intent signal(s)`);
  }

  // Step 3: Check for low-intent patterns (reduce score)
  let lowIntentCount = 0;
  for (const pattern of LOW_INTENT_PATTERNS) {
    // Create a new regex instance to avoid global flag issues
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(regex);
    if (matches) {
      lowIntentCount += matches.length;
      score -= matches.length * 10;
    }
  }

  if (lowIntentCount > 0) {
    reasons.push(`${lowIntentCount} low-intent signal(s)`);
  }

  // Step 4: Check keyword proximity to intent words
  const keywordIndex = lowerText.indexOf(lowerPhrase);
  if (keywordIndex !== -1) {
    // Check 50 characters before and after keyword
    const contextStart = Math.max(0, keywordIndex - 50);
    const contextEnd = Math.min(text.length, keywordIndex + lowerPhrase.length + 50);
    const context = text.substring(contextStart, contextEnd).toLowerCase();

    // Check if intent words are near keyword
    for (const intentPattern of HIGH_INTENT_PATTERNS) {
      // Create a new regex instance to avoid global flag issues
      const pattern = new RegExp(intentPattern.source, intentPattern.flags);
      if (pattern.test(context)) {
        score += 20;
        reasons.push("Intent word near keyword");
        break;
      }
    }

    // Check for question marks near keyword
    const nearbyText = text.substring(
      Math.max(0, keywordIndex - 100),
      Math.min(text.length, keywordIndex + lowerPhrase.length + 100)
    );
    if (nearbyText.includes("?")) {
      score += 15;
      reasons.push("Question mark near keyword");
    }
  }

  // Step 5: Title boost (if keyword is in title)
  // This is handled separately when title is available

  // Step 6: Length penalty (very short posts might be spam)
  if (text.length < 20) {
    score -= 10;
    reasons.push("Very short text");
  }

  // Step 7: Multiple keyword mentions (indicates importance)
  const keywordRegex = keyword.is_regex
    ? new RegExp(keyword.phrase, "gi")
    : new RegExp(lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const keywordMatches = text.match(keywordRegex);
  if (keywordMatches && keywordMatches.length > 1) {
    score += (keywordMatches.length - 1) * 5;
    reasons.push(`Keyword mentioned ${keywordMatches.length} times`);
  }

  // Step 8: Check for specific request patterns
  const requestPatterns = [
    /\b(?:need|want|looking for)\s+(?:a|an|the)?\s*[^.!?]{0,30}?\b(?:for|that|which|to)\b/gi,
    /\b(?:recommend|suggest|advice on|help with|opinion on)\b/gi,
    /\b(?:best|top|good|great)\s+[^.!?]{0,30}?\b(?:for|to|at)\b/gi,
  ];

  for (const pattern of requestPatterns) {
    // Create a new regex instance to avoid global flag issues
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(text)) {
      score += 25;
      reasons.push("Request pattern detected");
      break;
    }
  }

  // Normalize score (0-100 scale)
  const normalizedScore = Math.min(100, Math.max(0, score));

  // Only match if score is above threshold (30 points)
  const matched = normalizedScore >= 30;

  return {
    score: normalizedScore,
    matched,
    reasons,
  };
};

/**
 * Enhanced matching function that uses scoring
 */
export const matchesKeywordWithScore = (
  text: string,
  keyword: { phrase: string; is_regex: boolean }
): boolean => {
  try {
    const result = scoreMatch(text, keyword);
    return result.matched;
  } catch (error) {
    // Fallback to simple matching if scoring fails
    console.warn("Error in intelligent matching, falling back to simple match:", error);
    if (!text || !keyword.phrase) return false;
    const lowerText = text.toLowerCase();
    const lowerPhrase = keyword.phrase.toLowerCase();
    
    if (keyword.is_regex) {
      try {
        const regex = new RegExp(keyword.phrase, "i");
        return regex.test(text);
      } catch (e) {
        return lowerText.includes(lowerPhrase);
      }
    } else {
      return lowerText.includes(lowerPhrase);
    }
  }
};

/**
 * Get match score for ranking/sorting
 */
export const getMatchScore = (
  text: string,
  keyword: { phrase: string; is_regex: boolean }
): number => {
  const result = scoreMatch(text, keyword);
  return result.score;
};

/**
 * Match classification types
 */
export type MatchClassification = "asking" | "problems" | "all";

/**
 * Classify a match as "asking", "problems", or "all"
 * - "asking": People explicitly asking for solutions (HOT LEADS)
 * - "problems": People complaining about existing solutions (OPPORTUNITIES)
 * - "all": Everything else (general mentions)
 * 
 * Note: Spam/promotional content is excluded from all classifications
 */
export const classifyMatch = (text: string): MatchClassification => {
  if (!text) return "all";
  
  // Exclude spam/promotional content
  if (isSpamMatch(text)) {
    return "all"; // Spam goes to "all" but can be filtered out in UI
  }
  
  const lowerText = text.toLowerCase();
  let askingScore = 0;
  let problemScore = 0;
  
  // Check for asking patterns
  for (const pattern of ASKING_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = lowerText.match(regex);
    if (matches) {
      askingScore += matches.length;
    }
  }
  
  // Check for problem patterns
  for (const pattern of PROBLEM_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = lowerText.match(regex);
    if (matches) {
      problemScore += matches.length;
    }
  }
  
  // Classify based on scores (asking takes priority if both exist)
  if (askingScore >= 2) {
    return "asking";
  } else if (problemScore >= 2) {
    return "problems";
  } else if (askingScore >= 1) {
    return "asking";
  } else if (problemScore >= 1) {
    return "problems";
  }
  
  return "all";
};

/**
 * Check if text is spam/promotional content
 * Returns true if text contains spam patterns
 */
export const isSpamMatch = (text: string): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  const fullText = text; // Keep original for some patterns that need case-sensitive matching
  
  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(fullText)) {
      return true;
    }
  }
  
  // Check noise patterns
  for (const pattern of NOISE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(fullText)) {
      return true;
    }
  }
  
      // Check for excessive promotional language density
      const promotionalWords = [
        'offer', 'free', 'discount', 'deal', 'sale', 'promo', 'limited time',
        'check out', 'visit', 'sign up', 'subscribe', 'contact us', 'reach out',
        'dm me', 'message me', 'let\'s connect', 'schedule a call', 'audit',
        'consultation', 'trial', 'demo', 'we\'re', 'we offer', 'we\'ve built',
        'i help', 'perfect for', 'what you\'ll get', 'are you interested',
        'need a clean', 'need a fast', 'need a professional', 'actually converts',
        'high-converting', 'optimized for', 'designed to convert'
      ];
      
      const promotionalCount = promotionalWords.filter(word => 
        lowerText.includes(word)
      ).length;
      
      // If text contains 2+ promotional words/phrases, it's likely spam (lowered from 3)
      if (promotionalCount >= 2) {
        return true;
      }
  
  // Check for self-promotional structure: "Hello [name] here! If you're looking for..."
  const selfPromoPattern = /^(?:hello|hey|hi)\s+(?:guys|everyone|all)\s*[!.,]?\s*\w+\s+(?:here|here!|here,)\s*[!.,]?\s*(?:if you|we're|we are|we offer|looking for)/gi;
  if (selfPromoPattern.test(fullText)) {
    return true;
  }
  
  return false;
};

/**
 * Check if text matches asking patterns (looser threshold for UI filtering)
 * Excludes spam/promotional content
 */
export const isAskingMatch = (text: string): boolean => {
  if (!text) return false;
  
  // Exclude spam first
  if (isSpamMatch(text)) {
    return false;
  }
  
  const lowerText = text.toLowerCase();
  
  for (const pattern of ASKING_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(lowerText)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if text matches problem patterns (looser threshold for UI filtering)
 * Excludes spam/promotional content
 */
export const isProblemMatch = (text: string): boolean => {
  if (!text) return false;
  
  // Exclude spam first
  if (isSpamMatch(text)) {
    return false;
  }
  
  const lowerText = text.toLowerCase();
  
  for (const pattern of PROBLEM_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(lowerText)) {
      return true;
    }
  }
  
  return false;
};

