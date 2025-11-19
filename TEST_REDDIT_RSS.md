# Testing Reddit RSS Implementation

## Pre-Test Checklist

### 1. Deploy Updated Edge Function ✅
- [ ] Copy code from `supabase/functions/scan-reddit/index.ts`
- [ ] Go to Supabase Dashboard → Edge Functions → `hyper-endpoint`
- [ ] Paste updated code
- [ ] Click **Deploy**

### 2. Verify You're on Free Tier ✅
- [ ] Go to `/app/billing` in your app
- [ ] Confirm plan shows "Free" (or no subscription = free tier)
- [ ] Free tier = RSS feeds (no OAuth needed!)

### 3. Set Up Test Data ✅
- [ ] Add at least 1 keyword (e.g., "hello" or "test")
- [ ] Optionally add a source (e.g., "programming") OR leave empty (will use r/popular)
- [ ] Go to `/app/keywords` → Add keyword → Click "Scan Now"

---

## Test Steps

### Test 1: Basic RSS Scan (No Sources)
**Goal**: Test default RSS feed (r/popular)

1. **Remove all sources** (if any exist)
   - Go to `/app/sources`
   - Delete any sources

2. **Add a common keyword**
   - Go to `/app/keywords`
   - Add keyword: `hello` (very common word)
   - Click "Add Keyword"

3. **Run scan**
   - Click "Scan Now" button
   - Wait for completion

4. **Check results**
   - ✅ Should see toast: "Scan completed - Found X new matches"
   - ✅ Go to `/app/matches` - should see matches
   - ✅ Check browser console for logs

5. **Check Supabase logs**
   - Go to Supabase Dashboard → Edge Functions → `hyper-endpoint` → Logs
   - Look for:
     - `📰 Using RSS feed (free tier - no rate limits)`
     - `📡 Fetching RSS: https://www.reddit.com/r/popular/.rss`
     - `✅ RSS parsed: X posts found`
     - `Match found! Keyword: "hello"`

---

### Test 2: RSS Scan with Specific Subreddit
**Goal**: Test RSS feed for a specific subreddit

1. **Add a source**
   - Go to `/app/sources`
   - Click "Add New Source"
   - Enter: `programming` (or any subreddit)
   - Click "Add Source"

2. **Run scan**
   - Go to `/app/keywords`
   - Click "Scan Now"

3. **Check results**
   - ✅ Should see matches from r/programming
   - ✅ Check logs show: `📡 Fetching RSS: https://www.reddit.com/r/programming/.rss`

---

### Test 3: Error Handling (Rate Limiting)
**Goal**: Test retry logic

1. **Rapid scans** (if you hit rate limits)
   - Run 3-4 scans quickly
   - Should see retry logic in logs:
     - `RSS rate limited (429), retrying in 1s...`
     - `RSS rate limited (429), retrying in 2s...`

2. **Check graceful failure**
   - If all retries fail, should skip source gracefully
   - Should not crash the function

---

## What to Look For

### ✅ Success Indicators:
- [ ] RSS feed fetched successfully (200 status)
- [ ] Posts parsed from RSS XML
- [ ] Keywords matched against posts
- [ ] Matches inserted into database
- [ ] Matches visible in `/app/matches`
- [ ] Toast shows correct match count

### ⚠️ Warning Signs:
- [ ] 403/429 errors (rate limiting) - retry should handle this
- [ ] 0 matches found - might be normal if keyword is rare
- [ ] RSS parsing errors - check logs for XML parsing issues

### ❌ Failure Indicators:
- [ ] Function crashes/errors
- [ ] No logs appearing
- [ ] "Function not found" error
- [ ] Matches not saving to database

---

## Expected Logs

### Successful Scan:
```
=== SCAN FUNCTION CALLED ===
Found 1 keywords for user [user-id]
Keywords: [ "hello" ]
Scanning 1 source(s): [ "all of Reddit" ]
📰 Using RSS feed (free tier - no rate limits)
📡 Fetching RSS: https://www.reddit.com/r/popular/.rss
✅ RSS parsed: 25 posts found (RSS feeds typically show ~25 most recent items)
Match found! Keyword: "hello" in post: "[post title]..."
Checked 25 RSS posts, found X new matches
=== SCAN SUMMARY ===
Total matches found: X
New matches to insert: X
✅ Successfully inserted X matches
```

### Rate Limited (Should Retry):
```
📡 Fetching RSS: https://www.reddit.com/r/popular/.rss
RSS rate limited (429), retrying in 1s...
📡 Fetching RSS: https://www.reddit.com/r/popular/.rss
✅ RSS parsed: 25 posts found
```

---

## Troubleshooting

### "Function not found" Error
- **Fix**: Deploy the function in Supabase Dashboard
- Go to Edge Functions → `hyper-endpoint` → Deploy

### "0 matches found"
- **Possible causes**:
  - Keyword is too rare (try "hello" or "test")
  - RSS feed didn't return posts
  - Check logs to see if posts were fetched

### RSS Fetch Failed
- **Check**: Is Reddit blocking requests?
- **Fix**: Retry logic should handle this (2 attempts)
- If still failing, check User-Agent header

### Matches Not Appearing
- **Check**: Database insert succeeded?
- **Check**: Go to `/app/matches` - are they there?
- **Check**: Browser console for errors

---

## Next Steps After Testing

If tests pass:
- ✅ RSS implementation is working!
- ✅ Ready to add Twitter search
- ✅ Can handle free tier users

If tests fail:
- Share error logs
- Check specific failure point
- Fix issues before adding Twitter





