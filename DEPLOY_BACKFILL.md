# Deploy Historical Backfill Feature

## What Changed

1. **Function Name**: Already correct - calling `"hyper-endpoint"` (deployed function name)
2. **Added Historical Backfill**: Added JSON API backfill in `supabase/functions/scan-reddit/index.ts`
3. **No CORS Issues**: Backfill uses JSON API from server-side (Edge Function), not browser

## Step 1: Deploy Edge Function

**Important**: The code is in `supabase/functions/scan-reddit/index.ts` but the deployed function name is `hyper-endpoint`.

1. Go to: **Supabase Dashboard** → **Edge Functions** → **hyper-endpoint**
2. Click **"Code"** tab
3. Copy the entire contents of `supabase/functions/scan-reddit/index.ts`
4. Paste it into the Edge Function code editor
5. Click **"Deploy"** button
6. Wait for deployment to complete

## Step 2: Test the Scan

1. Go to your app → **Keywords** page
2. Add a keyword (e.g., "startup" or "SaaS")
3. Make sure you have at least one subreddit source added
4. Click **"Scan Now"** button
5. Wait for scan to complete (should take 30-60 seconds with backfill)

## Step 3: Check Logs

1. Go to: **Supabase Dashboard** → **Edge Functions** → **hyper-endpoint** → **Logs**
2. Look for these messages:
   - `📚 Historical backfill requested: 30 days`
   - `📚 Backfilling historical posts for...`
   - `✅ Backfilled X matching historical posts...`
   - Any errors about JSON API

## Step 4: Verify Matches

1. Go to your app → **Matches** page
2. Check if you see matches from different time periods:
   - Recent posts (last 3 days) - from RSS
   - Historical posts (1-2 weeks ago) - from JSON API backfill
3. Check the dates on the matches - they should span the last 30 days

## Troubleshooting

### No Matches Found

**Check:**
1. Are you getting recent matches from RSS? (should see matches from last 3 days)
2. Are you getting historical matches? (should see matches from 1-2 weeks ago)
3. Check the logs for errors

**If you see:**
- `⚠️ JSON API returned 403` → Reddit might be rate limiting
- `⚠️ JSON API returned 404` → Subreddit might not exist
- `Error fetching historical data` → Check network connectivity

### Function Not Found

**If you see:**
- `Function not found: hyper-endpoint` → Make sure the function is deployed
- The function name in Supabase should be `hyper-endpoint` (even though the code folder is `scan-reddit`)

### No Logs Appearing

**Check:**
1. Is the Edge Function actually being called?
2. Check browser console for errors
3. Make sure `backfillDays > 0` is being sent (should be 30)

## What to Look For

### Success Indicators:
✅ Logs show: `📚 Historical backfill requested: 30 days`
✅ Logs show: `✅ Backfilled X matching historical posts...`
✅ Matches page shows posts from different time periods
✅ Dashboard shows trend data with gaps filled

### Failure Indicators:
❌ No logs about backfill
❌ Only recent posts (last 3 days) in matches
❌ Errors about JSON API or function not found
❌ Function not being called at all

## Next Steps

If backfill is working:
1. Check the **Dashboard** → **Trend Predictions** section
2. You should see more accurate trend data with gaps filled
3. Historical data should span the last 30 days, not just recent posts

If backfill is not working:
1. Share the logs from Edge Function
2. Share any errors from browser console
3. Check if the function is being called at all

