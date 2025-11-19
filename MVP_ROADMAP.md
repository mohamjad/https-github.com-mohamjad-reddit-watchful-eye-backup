# MVP Roadmap: Get to Demo Fast

## Strategy: Ship MVP → Get Traction → Fund Robust Solution

**Timeline: 1-2 weeks to working demo**

---

## Phase 1: MVP (Week 1) ✅

### ✅ Reddit RSS (DONE)
- Basic RSS parsing
- Simple retry logic (2 attempts)
- Browser-like User-Agent
- Works for free tier users
- **Limitation**: ~25 items per feed, no comments

### 🔄 Add Twitter Search (Next)
- Use Twitter API v2 (free tier: 500k tweets/month)
- Basic keyword search
- Simple error handling
- Store matches in same `matches` table

### ✅ Basic Error Handling (DONE)
- Retry on 429/403
- Log errors
- Skip failed sources gracefully

---

## Phase 2: Polish & Launch (Week 2)

### UI Improvements
- Show "Last checked" timestamp
- Display "Items scanned (max 25)" for RSS
- Add Twitter source type in UI
- Better error messages

### Testing
- Test with 5-10 users
- Monitor for rate limits
- Fix critical bugs

### Launch Prep
- Deploy to production
- Write landing page copy
- Set up analytics

---

## Phase 3: Scale (After Traction)

### Only if you have users/traction:
1. **Add Robust Caching** (when you have 50+ users)
   - Supabase KV or Postgres cache table
   - ETag/Last-Modified support
   - Per-feed deduplication

2. **Implement Backoff** (when hitting rate limits)
   - Exponential backoff
   - Per-subreddit rate tracking
   - Queue system

3. **OAuth for Paid Tier** (when users want premium)
   - Better data
   - Comments support
   - Higher limits

---

## Twitter Integration Plan

### Option 1: Twitter API v2 (Recommended for MVP)
- **Free tier**: 500k tweets/month
- **Cost**: Free (enough for MVP)
- **Setup**: OAuth app required
- **Rate limit**: 300 requests/15min

### Option 2: Twitter RSS (If API is too complex)
- Some third-party services provide Twitter RSS
- Less reliable, but no API setup

### Implementation Steps:
1. Create Twitter app at https://developer.twitter.com
2. Get Bearer Token (for v2 API)
3. Add Twitter search function (similar to Reddit)
4. Store in same `matches` table with `platform: 'twitter'`

---

## What to Skip for MVP

❌ Complex caching layer  
❌ Exponential backoff  
❌ Queue system  
❌ Bloom filters  
❌ ETag/Last-Modified  
❌ Per-feed rate tracking  

**Why?** You don't need it until you have users. Premature optimization kills startups.

---

## Success Metrics

- ✅ Reddit RSS working
- ✅ Twitter search working  
- ✅ 5-10 test users
- ✅ No critical bugs
- ✅ Can demo end-to-end

**Then:** Get users → Get feedback → Fund proper infrastructure

---

## When to Add Robust Caching

**Signs you need it:**
- Hitting rate limits regularly
- Users complaining about missed posts
- 50+ active users
- Getting 429 errors frequently

**Until then:** Simple retry logic is fine!





