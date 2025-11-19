# Scan Optimization Analysis

## Current Limitations

### 1. **Sequential Processing (MAJOR BOTTLENECK)**
- **Current**: Processes keywords one at a time, then subreddits one at a time
- **Impact**: With 18 keywords × 10 subreddits = 180 sequential RSS fetches
- **Time**: If each fetch takes 2 seconds = **6 minutes just for fetching**

### 2. **Redundant RSS Fetches (MAJOR INEFFICIENCY)**
- **Current**: Fetches the same subreddit RSS feed multiple times (once per keyword)
- **Example**: r/marketing RSS is fetched 18 times (once for each keyword)
- **Impact**: Wastes time and bandwidth, increases rate limit risk

### 3. **Low RSS Limit**
- **Current**: 25 posts per subreddit
- **Impact**: Missing potential matches from older posts
- **Trade-off**: Lower limit = faster but less comprehensive

### 4. **Edge Function Timeout**
- **Free tier**: ~60 seconds max execution time
- **Paid tier**: Up to 300 seconds (5 minutes)
- **Impact**: Large scans hit timeout before completion

### 5. **No Parallelization**
- **Current**: All operations are sequential (`await` in loops)
- **Impact**: Not utilizing concurrent processing capabilities

## Optimization Strategies

### Strategy 1: **Fetch Once, Check All Keywords** (RECOMMENDED)
**How it works:**
- Fetch each subreddit RSS feed **once**
- Store all posts in memory
- Check **all keywords** against each post
- Process matches

**Benefits:**
- Reduces RSS fetches from 180 to 10 (18x reduction!)
- Much faster overall scan time
- Same coverage, less API calls

**Implementation:**
```typescript
// Fetch all subreddits first (parallel)
const subredditPosts = await Promise.all(
  subredditsToScan.map(async (sub) => {
    const posts = await fetchRSS(sub);
    return { subreddit: sub, posts };
  })
);

// Then check all keywords against all posts
for (const keyword of keywords) {
  for (const { subreddit, posts } of subredditPosts) {
    // Check keyword against posts
  }
}
```

### Strategy 2: **Parallel Subreddit Fetching**
**How it works:**
- Fetch multiple subreddit RSS feeds simultaneously
- Use `Promise.all()` to parallelize

**Benefits:**
- 10 subreddits fetched in parallel = ~2 seconds instead of 20 seconds
- 10x speedup for RSS fetching phase

### Strategy 3: **Increase RSS Limit with Smart Processing**
**How it works:**
- Increase limit back to 50-100 posts
- But fetch once per subreddit (not per keyword)
- Early exit if no matches found after checking first 25 posts

**Benefits:**
- Better coverage (more posts scanned)
- Still fast because we fetch once

### Strategy 4: **Batch Processing**
**How it works:**
- Process keywords in batches (e.g., 5 at a time)
- Save progress after each batch
- Resume if timeout occurs

**Benefits:**
- Handles large keyword sets
- Can resume interrupted scans

## Recommended Implementation

**Best approach: Combine Strategy 1 + Strategy 2**

1. **Fetch all subreddits in parallel** (Strategy 2)
2. **Check all keywords against fetched posts** (Strategy 1)
3. **Increase RSS limit to 50** (with Strategy 1, this is still fast)

**Expected improvement:**
- Current: 18 keywords × 10 subreddits × 2s = **360 seconds (6 minutes)**
- Optimized: 10 subreddits × 2s (parallel) + processing = **~30-60 seconds**

**Speedup: 6-12x faster!**

## Current Architecture Flow

```
Keyword 1 → Subreddit 1 → Fetch RSS → Process → Save
         → Subreddit 2 → Fetch RSS → Process → Save
         → Subreddit 3 → Fetch RSS → Process → Save
         ...
Keyword 2 → Subreddit 1 → Fetch RSS → Process → Save (REDUNDANT!)
         → Subreddit 2 → Fetch RSS → Process → Save (REDUNDANT!)
         ...
```

## Optimized Architecture Flow

```
Step 1: Fetch all subreddits in parallel
  → Subreddit 1 RSS (parallel)
  → Subreddit 2 RSS (parallel)
  → Subreddit 3 RSS (parallel)
  ...

Step 2: Check all keywords against all posts
  → Keyword 1 vs All Posts
  → Keyword 2 vs All Posts
  → Keyword 3 vs All Posts
  ...

Step 3: Save all matches
```

## Implementation Priority

1. **High Priority**: Strategy 1 (Fetch Once, Check All Keywords)
2. **High Priority**: Strategy 2 (Parallel Fetching)
3. **Medium Priority**: Strategy 3 (Increase RSS Limit)
4. **Low Priority**: Strategy 4 (Batch Processing - only if still timing out)




