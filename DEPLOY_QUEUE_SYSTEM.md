# Deploy Queue System Edge Functions

## Step 1: Run Database Migration

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20250115000000_create_scan_jobs.sql`
3. Copy the entire SQL and run it in the SQL Editor
4. Verify: Check that `scan_jobs` table exists in Table Editor

## Step 2: Deploy Edge Functions

### Option A: Via Supabase Dashboard (Recommended - No CLI needed)

#### 1. Update `hyper-endpoint` (Main scan initiator)

1. Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/functions
2. Click on **`hyper-endpoint`** function
3. Replace all code with contents of `supabase/functions/scan-reddit/index.ts`
4. Click **"Deploy"**

#### 2. Update `bright-task` (Background worker)

1. In Functions page, click on **`bright-task`** function
2. Replace all code with contents of `supabase/functions/process-scan/index.ts`
3. Paste into the editor
4. Click **"Deploy"**

#### 3. Update `super-task` (Status polling)

1. In Functions page, click on **`super-task`** function
2. Replace all code with contents of `supabase/functions/scan-status/index.ts`
3. Paste into the editor
4. Click **"Deploy"**

**Note:** Function names in Supabase:
- `hyper-endpoint` = Main scan initiator (creates job, triggers worker)
- `bright-task` = Background worker (does actual scanning)
- `super-task` = Status endpoint (for polling job status)

#### 4. Set Environment Variables (Shared Across All Functions)

**Note:** Supabase Edge Functions share environment variables globally - set them once and all functions can access them.

1. Go to: **Settings** → **Edge Functions** (or click on any function → **Settings** tab)
2. In the **Environment Variables** section, add these variables:

   **Required for queue system:**
   - **Name**: `SUPABASE_URL`
     **Value**: `https://ehujrrodtrmpftsqktlf.supabase.co`

   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
     **Value**: (Get from Settings → API → service_role key)

   - **Name**: `APIFY_TOKEN`
     **Value**: (Your Apify API token)

   - **Name**: `APIFY_TWITTER_ACTOR_ID`
     **Value**: `kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest`

   **Optional (for scheduled scans):**
   - **Name**: `CRON_SECRET`
     **Value**: (Generate a random secret string, e.g., use a password generator or `openssl rand -hex 32`)
     **Note**: This is used by `scheduled-scan` function for cron job authentication. Only needed if you use scheduled/automatic scans.

3. Click **"Save"**

**Which functions use which variables:**
- `hyper-endpoint`: Uses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `bright-task`: Uses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APIFY_TOKEN`, `APIFY_TWITTER_ACTOR_ID`
- `super-task`: Uses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `scheduled-scan`: Uses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (if using scheduled scans)

### Option B: Via Supabase CLI (Faster if you have it)

#### Install CLI (if not installed)

```bash
npm install -g supabase
```

#### Login and Link Project

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref ehujrrodtrmpftsqktlf
```

#### Deploy All Functions

```bash
# Deploy hyper-endpoint (updated - main scan initiator)
supabase functions deploy hyper-endpoint

# Deploy bright-task (updated - background worker)
supabase functions deploy bright-task

# Deploy super-task (updated - status polling)
supabase functions deploy super-task
```

#### Set Environment Variables via CLI

```bash
# Set secrets (shared across all functions)
supabase secrets set SUPABASE_URL=https://ehujrrodtrmpftsqktlf.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
supabase secrets set APIFY_TOKEN=your-apify-token-here
supabase secrets set APIFY_TWITTER_ACTOR_ID=kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest
```

## Step 3: Test the System

1. Go to your app's Keywords page
2. Add a keyword and source
3. Click "Scan Now"
4. You should see:
   - Immediate response (no waiting)
   - Scan processes in background
   - Results appear when complete

## Troubleshooting

### Error: "Function not found"
- Make sure all 3 functions are deployed
- Check function names match exactly: `hyper-endpoint`, `bright-task`, `super-task`

### Error: "Job not found" or "Failed to create scan job"
- Make sure you ran the database migration (Step 1)
- Check that `scan_jobs` table exists

### Error: "Unauthorized" in bright-task
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Make sure you're using the **service_role** key, not the anon key

### Scan never completes
- Check `bright-task` function logs in Dashboard
- Verify `APIFY_TOKEN` is set correctly
- Check that environment variables are saved

### Frontend shows "Scan job did not complete in time"
- Check `bright-task` logs for errors
- Increase `maxPollAttempts` in `src/lib/redditScanner.ts` if needed (currently 120 = 10 minutes)

## Verify Deployment

After deployment, verify all functions exist:

1. Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/functions
2. You should see:
   - ✅ `hyper-endpoint` (main scan initiator)
   - ✅ `bright-task` (background worker)
   - ✅ `super-task` (status polling)

## Next Steps

Once deployed:
1. Test with a simple keyword
2. Monitor logs in Dashboard → Functions → Logs
3. Check `scan_jobs` table to see job status
4. Verify matches are being saved correctly




