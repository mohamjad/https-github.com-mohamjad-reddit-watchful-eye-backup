# How to Find Scan Execution Logs

## The Log You Showed

The log you shared is a **"shutdown"** event - that's just the function stopping. We need the **execution logs** that show what happened during the scan.

## How to Find the Right Logs

### Step 1: Filter Logs by Event Type

In the Supabase Logs tab:

1. Look for a **filter** or **search** option
2. Filter by: **"LOG"** or **"INFO"** (not "Shutdown")
3. Or look for logs with timestamps around when you clicked "Scan Now"

### Step 2: Look for These Specific Messages

The logs should contain these messages (from our logging):

- `Found X keywords for user...`
- `Keywords: [...]`
- `Scanning X source(s): [...]`
- `Fetched X posts from...`
- `Checked X posts, found X new matches`
- `=== SCAN SUMMARY ===`

### Step 3: Check the Right Time

- Look for logs with timestamps **right when you clicked "Scan Now"**
- The shutdown log you showed is from `19:17:17`
- Look for logs **before** that time (like `19:17:15` or `19:17:16`)

### Step 4: Check All Log Levels

Make sure you're viewing:
- ✅ **LOG** level (console.log messages)
- ✅ **INFO** level
- ✅ **ERROR** level (if any errors)
- ❌ Not just "Shutdown" events

## What the Logs Should Look Like

You should see something like:

```
[LOG] Found 1 keywords for user abc-123
[LOG] Keywords: ["hello"]
[LOG] Scanning 1 source(s): ["all of Reddit"]
[LOG] Fetched 100 posts from new.json?limit=100
[LOG] Checked 100 posts, found 5 new matches
[LOG] === SCAN SUMMARY ===
[LOG] Total matches found: 5
[LOG] New matches to insert: 5
[LOG] ✅ Successfully inserted 5 matches
```

## If You Don't See Execution Logs

If you only see "shutdown" logs and no execution logs, it might mean:

1. **Function isn't being called** - Check browser console for errors
2. **Logs are filtered out** - Try removing filters
3. **Wrong function** - Make sure you're looking at `hyper-endpoint` logs
4. **Logs haven't loaded** - Refresh the page

## Alternative: Check Browser Console

While scanning, also check your **browser console** (F12):

You should see:
```
Scan result: {
  "message": "Scan completed successfully",
  "matches": X,
  "newMatches": Y
}
```

## Quick Checklist

- [ ] Go to Edge Functions → hyper-endpoint → Logs
- [ ] Remove any filters (or filter by LOG/INFO)
- [ ] Look for logs from when you clicked "Scan Now"
- [ ] Find logs with "Found X keywords" or "Fetched X posts"
- [ ] Copy those logs and share them

The shutdown log is just the function stopping - we need the logs from when it was actually running!





