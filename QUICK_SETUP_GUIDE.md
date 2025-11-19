# Quick Setup Guide - Steps 2 & 3

## 🚀 Step 2: Regenerate TypeScript Types

### Method 1: Supabase Dashboard (Recommended - 2 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/settings/api

2. **Generate Types**
   - Scroll to **"Generate TypeScript types"** section
   - Click **"Generate types"** button
   - Click **"Copy"** to copy all the generated types

3. **Update Types File**
   - Open `src/integrations/supabase/types.ts`
   - Select all (Ctrl+A) and delete
   - Paste the new types
   - Save (Ctrl+S)

4. **Remove Temporary Type Assertions**
   - Open `src/pages/app/Keywords.tsx`
   - Find line 94: Remove `as any` and use `data` directly
   - Find lines 62, 290, 347: Remove `(supabase as any)` and use `supabase` directly

**That's it!** TypeScript should now recognize the new columns.

---

## ⚙️ Step 3: Set Up Scheduled Scans

### Part 1: Deploy scheduled-scan Function (5 minutes)

1. **Go to Edge Functions**
   - https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/functions

2. **Create Function**
   - Click **"Create a new function"**
   - Name: `scheduled-scan`
   - Copy contents from `supabase/functions/scheduled-scan/index.ts`
   - Paste into editor
   - Click **"Deploy"**

### Part 2: Set Environment Variables (3 minutes)

1. **Get Service Role Key**
   - Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/settings/api
   - Copy **Service Role Key** (the secret one)

2. **Set Function Variables**
   - Go to: Functions > scheduled-scan > Settings
   - Add these variables:
     - `SUPABASE_URL`: `https://ehujrrodtrmpftsqktlf.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY`: (paste your service role key)
     - `CRON_SECRET`: `my-secret-12345` (or any random string)
   - Click **"Save"**

### Part 3: Set Up Cron Job (5 minutes)

**Easiest Option: cron-job.org (Free)**

1. **Sign up**: https://cron-job.org/ (free account)

2. **Create Cron Job**
   - Click **"Create cronjob"**
   - **Title**: "Reddit Watchful Eye Scan"
   - **URL**: `https://ehujrrodtrmpftsqktlf.supabase.co/functions/v1/scheduled-scan`
   - **Method**: `POST`
   - **Headers**:
     - `Authorization`: `Bearer my-secret-12345` (use your CRON_SECRET)
     - `Content-Type`: `application/json`
   - **Schedule**: `Every 30 minutes`
   - **Activate**: ✅ Checked
   - Click **"Create cronjob"**

3. **Test It**
   - Click **"Run now"** to test
   - Check Supabase Dashboard > Functions > scheduled-scan > Logs
   - You should see: `🔍 Starting scheduled scan...`

**Done!** Your scheduled scans are now running automatically.

---

## ✅ Verify It's Working

1. **Enable Auto-Scan**
   - Log into your app
   - Go to Keywords page
   - Scroll to "Automatic Scans" section
   - Enable automatic scans (if you're on Basic/Pro plan)
   - Set interval to 30 minutes

2. **Add Test Data**
   - Add a keyword (e.g., "hello")
   - Add a source (any subreddit)

3. **Wait for Scan**
   - Wait 30 minutes (or trigger manually via cron service)
   - Check Matches page - you should see new matches!

4. **Check Logs**
   - Supabase Dashboard > Functions > scheduled-scan > Logs
   - Should show: `✅ Found X new matches for user...`

---

## 🔧 Troubleshooting

**Types not updating?**
- Restart VS Code TypeScript server (Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server")
- Make sure migration was run successfully

**Cron job not working?**
- Check CRON_SECRET matches in both places
- Verify function is deployed
- Check function logs for errors

**No users being scanned?**
- Make sure user has `auto_scan_enabled = true`
- Check user has plan = 'basic' or 'pro'
- Verify user has keywords and sources

---

## 📋 Checklist

- [ ] Step 2: Types regenerated
- [ ] Step 3.1: scheduled-scan function deployed
- [ ] Step 3.2: Environment variables set
- [ ] Step 3.3: Cron job configured
- [ ] Step 3.4: Tested and verified
- [ ] Auto-scan enabled for test user
- [ ] Matches are being created automatically

---

**Need more details?** See `SETUP_AUTO_SCAN.md` for the complete guide.



