# Setting Up Automatic Scans - Step-by-Step Guide

This guide walks you through:
1. ✅ Step 1: Running the Migration (already done)
2. 🔄 Step 2: Regenerating TypeScript Types
3. ⚙️ Step 3: Setting Up Scheduled Scans

---

## Step 2: Regenerate TypeScript Types

After running the migration, you need to regenerate TypeScript types to include the new `auto_scan_enabled` and `scan_interval_minutes` columns.

### Option A: Using Supabase Dashboard (Easiest)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf

2. **Go to API Settings**
   - Click on **Settings** (left sidebar)
   - Click on **API**
   - Scroll down to find **"Generate TypeScript types"** section

3. **Generate Types**
   - Click the **"Generate types"** button
   - Select **"TypeScript"** as the language
   - Copy the generated types

4. **Update Your Types File**
   - Open `src/integrations/supabase/types.ts`
   - Replace the entire file contents with the generated types
   - Save the file

5. **Remove Type Assertions**
   - Open `src/pages/app/Keywords.tsx`
   - Remove the `as any` type assertions we added temporarily:
     - Line 94: Change `const subscriptionData = data as any;` to just use `data` directly
     - Lines 62, 290, 347: Remove `(supabase as any)` and use `supabase` directly

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Make sure you're in the project directory
cd C:\Users\moham\.cursor\reddit-watchful-eye

# Generate types
supabase gen types typescript --project-id ehujrrodtrmpftsqktlf > src/integrations/supabase/types.ts
```

**Note:** You'll need to be logged in to Supabase CLI:
```bash
supabase login
```

### Verify Types Are Updated

After regenerating types, check that `src/integrations/supabase/types.ts` includes:
- `auto_scan_enabled: boolean | null` in the `subscriptions` table Row type
- `scan_interval_minutes: number | null` in the `subscriptions` table Row type

You can verify by searching for "auto_scan_enabled" in the types file.

---

## Step 3: Set Up Scheduled Scans

Scheduled scans will automatically run for users who have enabled automatic scanning. You need to set up a cron job that calls the `scheduled-scan` Edge Function.

### Prerequisites

1. **Deploy the scheduled-scan Edge Function** (if not already deployed)
2. **Set up environment variables** for the function
3. **Configure a cron job** to call the function regularly

---

### Step 3.1: Deploy scheduled-scan Function

#### Option A: Via Supabase Dashboard (Recommended)

1. **Go to Edge Functions**
   - Navigate to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/functions

2. **Create New Function**
   - Click **"Create a new function"**
   - Name it: `scheduled-scan`
   - Copy the entire contents of `supabase/functions/scheduled-scan/index.ts`
   - Paste it into the editor
   - Click **"Deploy"**

#### Option B: Via CLI

```bash
supabase functions deploy scheduled-scan
```

---

### Step 3.2: Set Environment Variables

The `scheduled-scan` function needs these environment variables:

1. **Go to Function Settings**
   - In Supabase Dashboard, click on the `scheduled-scan` function
   - Go to the **Settings** tab

2. **Add Environment Variables**

   | Name | Value | Description |
   |------|-------|-------------|
   | `SUPABASE_URL` | `https://ehujrrodtrmpftsqktlf.supabase.co` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | (your service role key) | Get from Settings > API > Service Role Key |
   | `CRON_SECRET` | (random string) | Secret to secure the endpoint (e.g., `my-secret-12345`) |
   | `TWITTER_BEARER_TOKEN` | (your Twitter token) | Optional - only if you want Twitter scanning |

3. **Get Your Service Role Key**
   - Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/settings/api
   - Copy the **Service Role Key** (keep this secret!)
   - Paste it as the value for `SUPABASE_SERVICE_ROLE_KEY`

4. **Generate CRON_SECRET**
   - Use any random string (e.g., `my-secret-12345`)
   - Or generate one: https://www.random.org/strings/
   - Save this - you'll need it for the cron job

5. **Save Settings**
   - Click **"Save"** after adding all variables

---

### Step 3.3: Set Up Cron Job

You have several options for running the scheduled scan. Choose the one that works best for you:

#### Option A: External Cron Service (Easiest - Free)

**Recommended: cron-job.org (Free)**

1. **Sign up for cron-job.org**
   - Go to: https://cron-job.org/
   - Create a free account

2. **Create a New Cron Job**
   - Click **"Create cronjob"**
   - **Title**: "Reddit Watchful Eye - Scheduled Scan"
   - **Address (URL)**: 
     ```
     https://ehujrrodtrmpftsqktlf.supabase.co/functions/v1/scheduled-scan
     ```
   - **Request method**: `POST`
   - **Request headers**: Click "Add header"
     - **Header 1**:
       - Name: `Authorization`
       - Value: `Bearer YOUR_CRON_SECRET` (replace with your actual CRON_SECRET)
     - **Header 2**:
       - Name: `Content-Type`
       - Value: `application/json`
   - **Schedule**: 
     - Choose how often to run (recommended: every 15-30 minutes)
     - For testing: `Every 15 minutes`
     - For production: `Every 30 minutes` or `Every 1 hour`
   - **Activate**: Check the box to activate immediately
   - Click **"Create cronjob"**

3. **Test the Cron Job**
   - Click **"Run now"** to test it immediately
   - Check the logs to see if it runs successfully
   - Check your Supabase Dashboard > Edge Functions > scheduled-scan > Logs for function logs

**Other Free Cron Services:**
- **EasyCron**: https://www.easycron.com/ (free tier: 1 job)
- **cron-job.org**: https://cron-job.org/ (free tier: unlimited jobs)
- **Uptime Robot**: https://uptimerobot.com/ (free tier: 50 monitors)

#### Option B: GitHub Actions (Free - If you use GitHub)

1. **Create Workflow File**
   - Create `.github/workflows/scheduled-scan.yml` in your repository:

```yaml
name: Scheduled Reddit Scan

on:
  schedule:
    # Run every 30 minutes
    - cron: '*/30 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Scheduled Scan
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            https://ehujrrodtrmpftsqktlf.supabase.co/functions/v1/scheduled-scan
```

2. **Add GitHub Secrets**
   - Go to your GitHub repository
   - Settings > Secrets and variables > Actions
   - Click **"New repository secret"**
   - Name: `CRON_SECRET`
   - Value: (your CRON_SECRET from Step 3.2)
   - Click **"Add secret"**

3. **Commit and Push**
   - Commit the workflow file
   - Push to GitHub
   - The workflow will run automatically on schedule

#### Option C: Vercel Cron Jobs (If deployed on Vercel)

If you're deploying your app on Vercel:

1. **Create `vercel.json`**:
```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "*/30 * * * *"
  }]
}
```

2. **Create API Route** (`api/cron.ts`):
```typescript
export default async function handler(req: any, res: any) {
  const response = await fetch(
    'https://ehujrrodtrmpftsqktlf.supabase.co/functions/v1/scheduled-scan',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  res.status(200).json(data);
}
```

---

### Step 3.4: Test Scheduled Scans

1. **Enable Auto-Scan for a Test User**
   - Log into your app as a Basic or Pro user
   - Go to Keywords page
   - Scroll down to "Automatic Scans" section
   - Enable automatic scans
   - Set interval to 30 minutes (or 15 minutes for testing)

2. **Add Keywords and Sources**
   - Make sure the test user has at least one keyword
   - Make sure the test user has at least one source

3. **Trigger Manual Test**
   - Use your cron service's "Run now" feature, or
   - Manually call the function:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     https://ehujrrodtrmpftsqktlf.supabase.co/functions/v1/scheduled-scan
   ```

4. **Check Logs**
   - Go to Supabase Dashboard > Edge Functions > scheduled-scan > Logs
   - You should see logs like:
     ```
     🔍 Starting scheduled scan for users with auto-scan enabled...
     📊 Found 1 users with auto-scan enabled
     🔍 Scanning user xxx (basic plan, interval: 30 min)...
     ✅ Found 5 new matches for user xxx
     ```

5. **Verify Matches**
   - Go to your app's Matches page
   - You should see new matches appear automatically
   - Check that matches are being created for the test user

---

### Step 3.5: Monitor Scheduled Scans

1. **Check Function Logs Regularly**
   - Supabase Dashboard > Edge Functions > scheduled-scan > Logs
   - Look for errors or warnings
   - Verify that scans are running on schedule

2. **Monitor User Activity**
   - Check that users with auto-scan enabled are being scanned
   - Verify that scan intervals are being respected
   - Check that matches are being created

3. **Set Up Alerts (Optional)**
   - Some cron services allow you to set up email alerts for failed jobs
   - Consider setting up alerts for when the function fails

---

## Troubleshooting

### Issue: Types Not Updating

**Problem**: TypeScript still shows errors after regenerating types.

**Solution**:
1. Restart your TypeScript server (VS Code: Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server")
2. Make sure you copied the entire generated types
3. Check that the migration was run successfully
4. Verify the columns exist in the database:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'subscriptions' 
   AND column_name IN ('auto_scan_enabled', 'scan_interval_minutes');
   ```

### Issue: Scheduled Scan Not Running

**Problem**: Cron job runs but function doesn't execute.

**Solutions**:
1. Check function logs in Supabase Dashboard
2. Verify CRON_SECRET matches in both cron job and function settings
3. Check that the function is deployed and active
4. Verify environment variables are set correctly
5. Check that users have auto-scan enabled

### Issue: No Users Being Scanned

**Problem**: Function runs but finds 0 users.

**Solutions**:
1. Verify users have `auto_scan_enabled = true`
2. Check that users have plan = 'basic' or 'pro'
3. Verify users have keywords and sources
4. Check database:
   ```sql
   SELECT user_id, plan, auto_scan_enabled, scan_interval_minutes
   FROM subscriptions
   WHERE auto_scan_enabled = true
   AND plan IN ('basic', 'pro');
   ```

### Issue: Scans Running Too Frequently

**Problem**: Scans run even when interval hasn't passed.

**Solutions**:
1. Check that `daily_scans` table is being updated
2. Verify scan interval logic in the function
3. Check function logs for interval calculations
4. Make sure `created_at` is being set correctly in `daily_scans`

---

## Next Steps

After completing these steps:

1. ✅ Test with a real user account
2. ✅ Monitor the first few scheduled scans
3. ✅ Verify matches are being created
4. ✅ Set up alerts for failed scans (optional)
5. ✅ Document the cron job schedule for your team

---

## Summary

✅ **Step 2 Complete**: TypeScript types regenerated
✅ **Step 3 Complete**: Scheduled scans configured and running

Your automatic scanning system is now set up! Users with Basic or Pro plans can enable automatic scans, and the system will scan their keywords at the configured intervals automatically.



