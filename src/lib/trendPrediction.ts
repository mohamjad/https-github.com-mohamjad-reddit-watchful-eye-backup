/**
 * Trend Prediction System
 * 
 * Uses historical data and multiple signals to predict trends BEFORE they explode.
 * This is a key differentiator - not just showing what's happening now, but
 * predicting what will happen next.
 * 
 * Algorithm:
 * 1. Calculate historical baseline (30-60 day average)
 * 2. Analyze current activity vs baseline
 * 3. Detect acceleration (second derivative - rate of change is increasing)
 * 4. Multi-signal analysis (velocity, asking ratio, problem ratio, co-occurrence)
 * 5. Statistical confidence scoring
 * 6. Only return high-confidence predictions
 */

import { isAskingMatch, isProblemMatch } from "./matchScoring";
import { HistoricalBaseline, getHistoricalBaseline } from "./historicalBaseline";

export interface TrendPrediction {
  keyword: string;
  keywordId: string;
  confidence: number; // 0-100, only show >70
  prediction: "exploding" | "rising" | "emerging" | "declining";
  signals: {
    velocity: number; // Mentions per day (current vs baseline)
    acceleration: number; // Rate of change in velocity
    askingRatio: number; // % of matches that are "asking"
    problemRatio: number; // % of matches that are "problems"
    recentGrowth: number; // % growth in last 7 days vs previous 7 days
    baselineDeviation: number; // How many standard deviations above baseline
  };
  timeline: {
    baseline: number; // Average mentions per day (historical)
    current: number; // Current mentions per day
    predicted: number; // Predicted mentions per day (next 7 days)
  };
  reasons: string[]; // Human-readable reasons for prediction
}

export interface MatchWithClassification {
  id: number;
  title: string | null;
  body: string | null;
  created_at_utc: string;
  keyword_id: string;
  keywords?: {
    phrase: string;
    is_regex: boolean;
  };
  classification?: "asking" | "problems" | "all";
}

/**
 * Calculate historical baseline for a keyword
 * Returns average mentions per day over the baseline period
 */
export const calculateBaseline = (
  matches: MatchWithClassification[],
  baselineDays: number = 60
): {
  baseline: number;
  standardDeviation: number;
  dailyCounts: Map<string, number>;
} => {
  const now = new Date();
  const baselineStart = new Date(now.getTime() - baselineDays * 24 * 60 * 60 * 1000);
  
  // Group matches by day
  const dailyCounts = new Map<string, number>();
  
  matches.forEach(match => {
    const matchDate = new Date(match.created_at_utc);
    if (matchDate < baselineStart) return; // Only include baseline period
    
    const dateStr = matchDate.toISOString().split('T')[0];
    dailyCounts.set(dateStr, (dailyCounts.get(dateStr) || 0) + 1);
  });
  
  // Calculate average and standard deviation
  const counts = Array.from(dailyCounts.values());
  if (counts.length === 0) {
    return { baseline: 0, standardDeviation: 0, dailyCounts };
  }
  
  const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / counts.length;
  const standardDeviation = Math.sqrt(variance);
  
  return { baseline: average, standardDeviation, dailyCounts };
};

/**
 * Calculate velocity (mentions per day) for recent periods
 */
export const calculateVelocity = (
  matches: MatchWithClassification[],
  periodDays: number
): number => {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  const periodMatches = matches.filter(m => {
    const matchDate = new Date(m.created_at_utc);
    return matchDate >= periodStart;
  });
  
  return periodMatches.length / periodDays;
};

/**
 * Calculate acceleration (change in velocity)
 * Positive = accelerating, Negative = decelerating
 */
export const calculateAcceleration = (
  matches: MatchWithClassification[]
): number => {
  // Recent velocity (last 7 days)
  const recentVelocity = calculateVelocity(matches, 7);
  
  // Previous velocity (7-14 days ago)
  const now = new Date();
  const recentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const previousMatches = matches.filter(m => {
    const matchDate = new Date(m.created_at_utc);
    return matchDate >= previousStart && matchDate < recentStart;
  });
  
  const previousVelocity = previousMatches.length / 7;
  
  // Acceleration = change in velocity
  return recentVelocity - previousVelocity;
};

/**
 * Calculate asking ratio (% of matches that are "asking")
 */
export const calculateAskingRatio = (
  matches: MatchWithClassification[]
): number => {
  if (matches.length === 0) return 0;
  
  const askingCount = matches.filter(m => {
    const text = `${m.title || ""} ${m.body || ""}`.trim();
    return isAskingMatch(text);
  }).length;
  
  return (askingCount / matches.length) * 100;
};

/**
 * Calculate problem ratio (% of matches that are "problems")
 */
export const calculateProblemRatio = (
  matches: MatchWithClassification[]
): number => {
  if (matches.length === 0) return 0;
  
  const problemCount = matches.filter(m => {
    const text = `${m.title || ""} ${m.body || ""}`.trim();
    return isProblemMatch(text);
  }).length;
  
  return (problemCount / matches.length) * 100;
};

/**
 * Calculate baseline deviation (how many standard deviations above baseline)
 */
export const calculateBaselineDeviation = (
  currentVelocity: number,
  baseline: number,
  standardDeviation: number
): number => {
  if (standardDeviation === 0) return currentVelocity > baseline ? 999 : 0;
  return (currentVelocity - baseline) / standardDeviation;
};

/**
 * Predict trends for a keyword based on historical data
 * Can use either user's historical data OR Reddit's historical data for baseline
 */
export const predictTrend = async (
  keywordId: string,
  keywordPhrase: string,
  allMatches: MatchWithClassification[],
  baselineDays: number = 60,
  useRedditHistorical: boolean = true
): Promise<TrendPrediction | null> => {
  let baseline: number;
  let standardDeviation: number;
  let dailyCounts: Map<string, number>;
  
  // Try to use Reddit's historical data first (works immediately)
  // BUT: Disable for now to avoid blocking Dashboard - can enable later when stable
  if (useRedditHistorical && false) { // Temporarily disabled
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 5000) // 5 second timeout
      );
      
      const historicalBaseline = await Promise.race([
        getHistoricalBaseline(keywordPhrase, 90),
        timeoutPromise
      ]);
      
      if (historicalBaseline && historicalBaseline.baseline > 0) {
        baseline = historicalBaseline.baseline;
        standardDeviation = historicalBaseline.standardDeviation;
        dailyCounts = historicalBaseline.dailyCounts;
        console.log(`✅ Using Reddit historical baseline for "${keywordPhrase}": ${baseline.toFixed(2)} mentions/day`);
      } else {
        // Fallback to user's data if Reddit historical fails or times out
        if (allMatches.length < 10) {
          return null;
        }
        const userBaseline = calculateBaseline(allMatches, baselineDays);
        baseline = userBaseline.baseline;
        standardDeviation = userBaseline.standardDeviation;
        dailyCounts = userBaseline.dailyCounts;
        console.log(`⚠️ Using user's historical baseline for "${keywordPhrase}" (Reddit historical unavailable)`);
      }
    } catch (error) {
      console.error(`Error fetching Reddit historical baseline:`, error);
      // Fallback to user's data
      if (allMatches.length < 10) {
        return null;
      }
      const userBaseline = calculateBaseline(allMatches, baselineDays);
      baseline = userBaseline.baseline;
      standardDeviation = userBaseline.standardDeviation;
      dailyCounts = userBaseline.dailyCounts;
    }
  } else {
    // Use only user's historical data (requires 60 days)
    if (allMatches.length < 10) {
      return null;
    }
    const userBaseline = calculateBaseline(allMatches, baselineDays);
    baseline = userBaseline.baseline;
    standardDeviation = userBaseline.standardDeviation;
    dailyCounts = userBaseline.dailyCounts;
  }
  
  if (baseline === 0) {
    // No historical baseline, can't predict
    return null;
  }
  
  // Get recent matches (last 14 days for analysis)
  const now = new Date();
  const recentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentMatches = allMatches.filter(m => {
    const matchDate = new Date(m.created_at_utc);
    return matchDate >= recentStart;
  });
  
  if (recentMatches.length === 0) {
    return null;
  }
  
  // Calculate signals (use allMatches for velocity/acceleration to get accurate comparisons)
  const currentVelocity = calculateVelocity(allMatches, 14); // Last 14 days velocity
  const acceleration = calculateAcceleration(allMatches); // Compare last 7 days vs previous 7 days
  const askingRatio = calculateAskingRatio(recentMatches); // Use recent matches for ratios
  const problemRatio = calculateProblemRatio(recentMatches); // Use recent matches for ratios
  const baselineDeviation = calculateBaselineDeviation(currentVelocity, baseline, standardDeviation);
  
  // Calculate recent growth (last 7 days vs previous 7 days)
  const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last7DaysMatches = allMatches.filter(m => {
    const matchDate = new Date(m.created_at_utc);
    return matchDate >= last7DaysStart;
  });
  
  const prev7DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const prev7DaysMatches = allMatches.filter(m => {
    const matchDate = new Date(m.created_at_utc);
    return matchDate >= prev7DaysStart && matchDate < last7DaysStart;
  });
  
  const last7DaysCount = last7DaysMatches.length;
  const prev7DaysCount = prev7DaysMatches.length;
  const recentGrowth = prev7DaysCount > 0 
    ? ((last7DaysCount - prev7DaysCount) / prev7DaysCount) * 100
    : (last7DaysCount > 0 ? 100 : 0);
  
  // Classify prediction based on signals
  let prediction: "exploding" | "rising" | "emerging" | "declining" = "stable";
  let confidence = 0;
  const reasons: string[] = [];
  
  // Signal 1: Velocity significantly above baseline (3+ standard deviations)
  if (baselineDeviation >= 3) {
    confidence += 30;
    reasons.push(`Mentions are ${baselineDeviation.toFixed(1)}x above baseline`);
  } else if (baselineDeviation >= 2) {
    confidence += 20;
    reasons.push(`Mentions are ${baselineDeviation.toFixed(1)}x above baseline`);
  } else if (baselineDeviation >= 1) {
    confidence += 10;
    reasons.push(`Mentions are ${baselineDeviation.toFixed(1)}x above baseline`);
  }
  
  // Signal 2: Acceleration (velocity is increasing)
  if (acceleration > baseline * 0.5) {
    confidence += 25;
    reasons.push(`Accelerating growth (${acceleration.toFixed(1)} mentions/day increase)`);
    prediction = "exploding";
  } else if (acceleration > baseline * 0.2) {
    confidence += 15;
    reasons.push(`Moderate acceleration (${acceleration.toFixed(1)} mentions/day increase)`);
    prediction = prediction === "stable" ? "rising" : prediction;
  } else if (acceleration < -baseline * 0.2) {
    confidence += 10;
    reasons.push(`Declining velocity (${acceleration.toFixed(1)} mentions/day decrease)`);
    prediction = "declining";
  }
  
  // Signal 3: High asking ratio (30%+ = strong demand signal)
  if (askingRatio >= 30) {
    confidence += 20;
    reasons.push(`High demand signal (${askingRatio.toFixed(0)}% asking for solutions)`);
    if (prediction === "stable") prediction = "rising";
  } else if (askingRatio >= 20) {
    confidence += 10;
    reasons.push(`Moderate demand signal (${askingRatio.toFixed(0)}% asking for solutions)`);
  }
  
  // Signal 4: High problem ratio (25%+ = opportunity signal)
  if (problemRatio >= 25) {
    confidence += 15;
    reasons.push(`Strong opportunity signal (${problemRatio.toFixed(0)}% complaining about existing solutions)`);
    if (prediction === "stable") prediction = "emerging";
  } else if (problemRatio >= 15) {
    confidence += 8;
    reasons.push(`Opportunity signal (${problemRatio.toFixed(0)}% complaining about existing solutions)`);
  }
  
  // Signal 5: Recent growth (50%+ growth in last 7 days)
  if (recentGrowth >= 50) {
    confidence += 20;
    reasons.push(`Strong recent growth (${recentGrowth.toFixed(0)}% increase in last 7 days)`);
    if (prediction === "stable") prediction = "rising";
  } else if (recentGrowth >= 25) {
    confidence += 10;
    reasons.push(`Moderate recent growth (${recentGrowth.toFixed(0)}% increase in last 7 days)`);
  } else if (recentGrowth <= -25) {
    confidence += 5;
    reasons.push(`Declining activity (${Math.abs(recentGrowth).toFixed(0)}% decrease in last 7 days)`);
    prediction = "declining";
  }
  
  // Signal 6: Consistent growth over multiple periods
  // Check if velocity has been increasing over last 3 weeks
  const week1Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const week2Start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const week3Start = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  
  const week1Matches = allMatches.filter(m => {
    const matchDate = new Date(m.created_at_utc);
    return matchDate >= week1Start;
  });
  const week2Matches = allMatches.filter(m => {
    const matchDate = new Date(m.created_at_utc);
    return matchDate >= week2Start && matchDate < week1Start;
  });
  const week3Matches = allMatches.filter(m => {
    const matchDate = new Date(m.created_at_utc);
    return matchDate >= week3Start && matchDate < week2Start;
  });
  
  const week1Velocity = week1Matches.length / 7;
  const week2Velocity = week2Matches.length / 7;
  const week3Velocity = week3Matches.length / 7;
  
  // Consistent acceleration (each week faster than previous)
  if (week1Velocity > week2Velocity && week2Velocity > week3Velocity && week3Velocity > 0) {
    confidence += 15;
    reasons.push(`Consistent acceleration over 3 weeks`);
    if (prediction !== "exploding") prediction = "exploding";
  } else if (week1Velocity > week2Velocity && week2Velocity > 0) {
    confidence += 8;
    reasons.push(`Sustained growth over 2 weeks`);
    if (prediction === "stable") prediction = "rising";
  }
  
  // Cap confidence at 100
  confidence = Math.min(100, confidence);
  
  // Only return predictions with confidence >= 70
  if (confidence < 70) {
    return null;
  }
  
  // Predict future velocity (simple linear projection with acceleration)
  const predictedVelocity = currentVelocity + (acceleration * 7); // Project 7 days ahead
  const predictedMentions = Math.max(0, predictedVelocity * 7); // Predicted mentions in next 7 days
  
  return {
    keyword: keywordPhrase,
    keywordId,
    confidence: Math.round(confidence),
    prediction: prediction as "exploding" | "rising" | "emerging" | "declining",
    signals: {
      velocity: currentVelocity,
      acceleration,
      askingRatio,
      problemRatio,
      recentGrowth,
      baselineDeviation,
    },
    timeline: {
      baseline,
      current: currentVelocity,
      predicted: predictedVelocity,
    },
    reasons,
  };
};

/**
 * Predict trends for all keywords
 * Returns only high-confidence predictions (confidence >= 70)
 * 
 * Requirements:
 * - Keyword must have been tracked for at least 14 days since creation
 * - At least 10 out of 14 days must have scan data (good coverage)
 * - Uses Reddit historical data for baseline (works immediately, no 60-day wait)
 */
export const predictTrendsForAllKeywords = async (
  keywords: Array<{ id: string; phrase: string; is_regex: boolean; created_at?: string }>,
  allMatches: MatchWithClassification[],
  dailyScans?: Array<{ scan_date: string }>
): Promise<TrendPrediction[]> => {
  const predictions: TrendPrediction[] = [];
  const now = new Date();
  
  // Create a set of scan dates for quick lookup
  const scanDates = new Set<string>();
  if (dailyScans) {
    dailyScans.forEach(scan => {
      scanDates.add(scan.scan_date);
    });
  }
  
  // Group matches by keyword
  const matchesByKeyword = new Map<string, MatchWithClassification[]>();
  
  allMatches.forEach(match => {
    if (match.keyword_id) {
      const existing = matchesByKeyword.get(match.keyword_id) || [];
      existing.push(match);
      matchesByKeyword.set(match.keyword_id, existing);
    }
  });
  
  // Filter keywords that meet the 14-day requirement
  const eligibleKeywords = keywords.filter(keyword => {
    if (!keyword.created_at) {
      // If no created_at, skip (shouldn't happen, but be safe)
      console.log(`⚠️ Keyword "${keyword.phrase}" has no created_at, skipping`);
      return false;
    }
    
    const keywordCreatedAt = new Date(keyword.created_at);
    const daysSinceCreation = Math.floor((now.getTime() - keywordCreatedAt.getTime()) / (24 * 60 * 60 * 1000));
    
    // Must be at least 14 days since keyword creation
    if (daysSinceCreation < 14) {
      console.log(`⏳ Keyword "${keyword.phrase}" created ${daysSinceCreation} days ago (needs 14)`);
      return false;
    }
    
    // Check data coverage: need at least 10 out of 14 days with scans
    // Calculate the 14-day window from keyword creation
    const fourteenDaysAgo = new Date(keywordCreatedAt);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() + 14); // 14 days after creation
    
    // Count how many days in the 14-day window have scans
    let daysWithScans = 0;
    const requiredDays = 10; // Need at least 10 days with data
    
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(keywordCreatedAt);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (scanDates.has(dateStr)) {
        daysWithScans++;
      }
    }
    
    if (daysWithScans < requiredDays) {
      console.log(`⏳ Keyword "${keyword.phrase}" has ${daysWithScans} days with scans (needs ${requiredDays})`);
      return false;
    }
    
    console.log(`✅ Keyword "${keyword.phrase}" eligible: ${daysSinceCreation} days old, ${daysWithScans}/14 days with scans`);
    return true;
  });
  
  if (eligibleKeywords.length === 0) {
    console.log(`⏳ No keywords meet the 14-day requirement with good data coverage`);
    return [];
  }
  
  // Predict trends for each eligible keyword (use Promise.allSettled to handle failures gracefully)
  const predictionPromises = eligibleKeywords.map(async (keyword) => {
    try {
      // Skip regex keywords for historical baseline (too complex to search Reddit)
      if (keyword.is_regex) {
        const keywordMatches = matchesByKeyword.get(keyword.id) || [];
        if (keywordMatches.length < 10) return null;
        
        // For regex, use only user's data (no Reddit historical)
        return await predictTrend(
          keyword.id,
          keyword.phrase,
          keywordMatches,
          60,
          false // Don't use Reddit historical for regex
        );
      }
      
      const keywordMatches = matchesByKeyword.get(keyword.id) || [];
      
      // Filter matches to only include those from the 14-day window after keyword creation
      const keywordCreatedAt = new Date(keyword.created_at!);
      const fourteenDaysAfterCreation = new Date(keywordCreatedAt);
      fourteenDaysAfterCreation.setDate(fourteenDaysAfterCreation.getDate() + 14);
      
      // Get matches from the 14-day window after keyword creation
      const windowMatches = keywordMatches.filter(m => {
        const matchDate = new Date(m.created_at_utc);
        return matchDate >= keywordCreatedAt && matchDate <= fourteenDaysAfterCreation;
      });
      
      // Also get recent matches (last 14 days) for comparison
      const recentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const recentMatches = keywordMatches.filter(m => {
        const matchDate = new Date(m.created_at_utc);
        return matchDate >= recentStart;
      });
      
      // Need at least 1 recent match to compare against baseline
      if (recentMatches.length === 0) {
        console.log(`⏳ Keyword "${keyword.phrase}" has no recent matches`);
        return null;
      }
      
      // Use all matches for baseline calculation, but ensure we have data from the 14-day window
      return await predictTrend(
        keyword.id,
        keyword.phrase,
        keywordMatches, // Use all matches for baseline
        60,
        true // Use Reddit historical baseline
      );
    } catch (error) {
      // Log error but don't break - continue with other keywords
      console.error(`Error predicting trend for keyword "${keyword.phrase}":`, error);
      return null;
    }
  });
  
  // Wait for all predictions (even if some fail)
  const results = await Promise.allSettled(predictionPromises);
  
  // Filter out nulls and failures
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      predictions.push(result.value);
    }
  });
  
  // Sort by confidence (highest first)
  return predictions.sort((a, b) => b.confidence - a.confidence);
};

