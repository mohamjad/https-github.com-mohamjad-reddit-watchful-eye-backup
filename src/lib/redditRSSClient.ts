/**
 * Client-side Reddit RSS fetcher
 * Fetches RSS feeds directly from browser (uses user's IP, no API keys needed)
 */

import { matchesKeywordWithScore } from "./matchScoring";

export interface RedditRSSPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  subreddit: string;
  created_utc: number;
}

/**
 * Clean HTML from text
 */
const cleanHtml = (text: string): string => {
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

/**
 * Parse RSS/Atom feed XML
 */
const parseRSSFeed = (rssText: string): RedditRSSPost[] => {
  const posts: RedditRSSPost[] = [];
  const isAtomFeed = rssText.includes('<feed') || rssText.includes('<entry>');
  const entryRegex = isAtomFeed ? /<entry>([\s\S]*?)<\/entry>/g : /<item>([\s\S]*?)<\/item>/g;
  
  let match;
  while ((match = entryRegex.exec(rssText)) !== null) {
    const itemXml = match[1];
    
    let titleMatch, linkMatch, descriptionMatch, pubDateMatch, authorMatch;
    
    if (isAtomFeed) {
      titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      linkMatch = itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/) ||
                 itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/);
      descriptionMatch = itemXml.match(/<content[^>]*type=["']html["'][^>]*>([\s\S]*?)<\/content>/) ||
                        itemXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
      pubDateMatch = itemXml.match(/<updated>([\s\S]*?)<\/updated>/) ||
                    itemXml.match(/<published>([\s\S]*?)<\/published>/);
      authorMatch = itemXml.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/) ||
                   itemXml.match(/<author[^>]*>([\s\S]*?)<\/author>/);
    } else {
      titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/);
      linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/) || 
                 itemXml.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/i) ||
                 itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
      descriptionMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                       itemXml.match(/<description>([\s\S]*?)<\/description>/);
      pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ||
                    itemXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/);
      authorMatch = itemXml.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/) ||
                   itemXml.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/) ||
                   itemXml.match(/<author>([\s\S]*?)<\/author>/);
    }
    
    if (titleMatch && linkMatch) {
      let title = "";
      if (isAtomFeed) {
        title = (titleMatch[1] || "").trim();
        title = title.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1');
      } else {
        title = (titleMatch[1] || titleMatch[2] || "").trim();
      }
      
      let link = "";
      if (isAtomFeed) {
        link = (linkMatch[1] || linkMatch[2] || "").trim();
      } else {
        link = (linkMatch[1] || linkMatch[2] || linkMatch[3] || "").trim();
      }
      
      let description = (descriptionMatch?.[1] || descriptionMatch?.[2] || "").trim();
      if (description) {
        description = cleanHtml(description);
      }
      
      const author = (authorMatch?.[1] || authorMatch?.[2] || "unknown").trim();
      const subredditMatch = link.match(/\/r\/([^\/]+)\//);
      const subreddit = subredditMatch ? subredditMatch[1] : "unknown";
      const postIdMatch = link.match(/\/comments\/([^\/]+)\//);
      const postId = postIdMatch ? postIdMatch[1] : `rss_${Date.now()}_${Math.random()}`;
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();
      const created_utc = Math.floor(pubDate.getTime() / 1000);
      
      posts.push({
        id: postId,
        title: cleanHtml(title),
        selftext: description,
        url: link,
        author: author,
        subreddit: subreddit,
        created_utc: created_utc,
      });
    }
  }
  
  return posts;
};

/**
 * Fetch Reddit RSS feed from browser (uses user's IP)
 */
export const fetchRedditRSS = async (rssUrl: string): Promise<RedditRSSPost[]> => {
  try {
    console.log(`🌐 Browser fetching RSS: ${rssUrl}`);
    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
    }

    const rssText = await response.text();
    console.log(`✅ RSS fetched, length: ${rssText.length} chars`);
    const posts = parseRSSFeed(rssText);
    console.log(`✅ Parsed ${posts.length} posts from RSS`);
    return posts;
  } catch (error) {
    console.error("❌ Error fetching Reddit RSS:", error);
    throw error;
  }
};

/**
 * Match keyword against text with intelligent intent detection
 */
export const matchesKeyword = (text: string, keyword: { phrase: string; is_regex: boolean }): boolean => {
  return matchesKeywordWithScore(text, keyword);
};

