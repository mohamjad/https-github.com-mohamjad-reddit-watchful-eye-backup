/**
 * Historical Baseline Fetcher
 * 
 * Fetches historical Reddit data to build baseline immediately
 * Instead of waiting 60 days for user data, we use Reddit's historical posts
 * 
 * Uses Reddit search API/RSS to fetch posts from last 60-90 days
 */

import { fetchRedditRSS, RedditRSSPost } from "./redditRSSClient";

export interface HistoricalBaseline {
  keyword: string;
  dailyCounts: Map<string, number>; // date -> count
  baseline: number; // average per day
  standardDeviation: number;
  totalPosts: number;
  dateRange: { start: string; end: string };
}

/**
 * Fetch historical Reddit posts for a keyword
 * Uses Reddit search with time filters
 */
export const fetchHistoricalRedditData = async (
  keyword: string,
  days: number = 90
): Promise<RedditRSSPost[]> => {
  const allPosts: RedditRSSPost[] = [];
  
  // Reddit search RSS supports time filters: t=all, t=year, t=month, t=week, t=day
  // For 90 days, we'll use t=all and filter by date, or use multiple searches
  
  // Strategy: Search Reddit with keyword, get all-time results, then filter by date
  const searchQuery = encodeURIComponent(keyword);
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  // Reddit search RSS - get recent posts (up to 100 per request)
  // We'll need to paginate or use multiple time ranges
  const timeRanges = [
    { param: 't=all', label: 'all-time' }, // Get all, then filter
  ];
  
  try {
    // Use Reddit search RSS - this gives us posts matching the keyword
    const rssUrl = `https://www.reddit.com/search/.rss?q=${searchQuery}&sort=new&limit=100&t=all`;
    
    console.log(`📊 Fetching historical baseline for "${keyword}" from Reddit...`);
    const posts = await fetchRedditRSS(rssUrl);
    
    // Filter posts by date (only keep posts from last N days)
    const filteredPosts = posts.filter(post => {
      const postDate = new Date(post.created_utc * 1000);
      return postDate >= cutoffDate;
    });
    
    console.log(`✅ Found ${filteredPosts.length} historical posts for "${keyword}" (last ${days} days)`);
    
    // If we got 100 posts and they're all recent, we might be missing older data
    // For now, this is a good start - we can enhance with pagination later
    return filteredPosts;
  } catch (error) {
    console.error(`❌ Error fetching historical data for "${keyword}":`, error);
    return [];
  }
};

/**
 * Build historical baseline from Reddit posts
 */
export const buildHistoricalBaseline = (
  posts: RedditRSSPost[],
  keyword: string
): HistoricalBaseline => {
  const dailyCounts = new Map<string, number>();
  
  // Group posts by day
  posts.forEach(post => {
    const postDate = new Date(post.created_utc * 1000);
    const dateStr = postDate.toISOString().split('T')[0];
    dailyCounts.set(dateStr, (dailyCounts.get(dateStr) || 0) + 1);
  });
  
  // Calculate baseline (average per day)
  const counts = Array.from(dailyCounts.values());
  const totalPosts = posts.length;
  const daysWithData = dailyCounts.size;
  
  // Average mentions per day (only counting days with data)
  const baseline = daysWithData > 0 ? totalPosts / daysWithData : 0;
  
  // Calculate standard deviation
  const variance = counts.length > 0
    ? counts.reduce((sum, count) => sum + Math.pow(count - baseline, 2), 0) / counts.length
    : 0;
  const standardDeviation = Math.sqrt(variance);
  
  // Get date range
  const dates = Array.from(dailyCounts.keys()).sort();
  const dateRange = {
    start: dates[0] || new Date().toISOString().split('T')[0],
    end: dates[dates.length - 1] || new Date().toISOString().split('T')[0],
  };
  
  return {
    keyword,
    dailyCounts,
    baseline,
    standardDeviation,
    totalPosts,
    dateRange,
  };
};

/**
 * Fetch and build historical baseline for a keyword
 */
export const getHistoricalBaseline = async (
  keyword: string,
  days: number = 90
): Promise<HistoricalBaseline | null> => {
  try {
    const posts = await fetchHistoricalRedditData(keyword, days);
    
    if (posts.length < 10) {
      console.warn(`⚠️ Not enough historical data for "${keyword}" (${posts.length} posts)`);
      return null;
    }
    
    return buildHistoricalBaseline(posts, keyword);
  } catch (error) {
    console.error(`❌ Error building historical baseline for "${keyword}":`, error);
    return null;
  }
};


