# Next Steps After Project Setup

## ✅ Configuration Updated!

Your Supabase project configuration has been updated:
- **Project Reference**: `ehujrrodtrmpftsqktlf`
- **Project URL**: `https://ehujrrodtrmpftsqktlf.supabase.co`
- **Environment variables**: Updated in `.env` file
- **Config file**: Updated `supabase/config.toml`

## Step 1: Run Database Migrations

**IMPORTANT**: You need to set up your database tables before the app will work.

1. Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/sql/new

2. **Run First Migration**:
   - Copy the entire contents of `supabase/migrations/20251104023635_cbb5ed00-51a3-440b-a515-9294ef0cb089.sql`
   - Paste into SQL Editor
   - Click **Run** (or press Ctrl+Enter)
   - Wait for success message

3. **Run Second Migration**:
   - Copy the entire contents of `supabase/migrations/20250104000000_add_scan_tracking.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Wait for success message

## Step 2: Deploy Edge Functions

The scan functionality requires Edge Functions to be deployed.

### Quick Method (Dashboard):

1. **Get Service Role Key**:
   - Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/settings/api
   - Copy the **service_role** key (keep this secret!)

2. **Deploy scan-reddit Function**:
   - Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/functions
   - Click **"Create a new function"**
   - Name: `scan-reddit`
   - Copy entire contents of `supabase/functions/scan-reddit/index.ts`
   - Paste into editor
   - Click **Deploy**

3. **Set Environment Variables**:
   - After deployment, click on `scan-reddit` function
   - Go to **Settings** tab
   - Add these:
     - `SUPABASE_URL` = `https://ehujrrodtrmpftsqktlf.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)
     - `CRON_SECRET` = (any random string, e.g., `my-secret-123`)
   - Click **Save**

## Step 3: Restart Dev Server

After updating `.env`, restart your dev server:

```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

## Step 4: Test the App

1. **Sign Up**: Create a new account at `http://localhost:8080/signup`
2. **Add Keyword**: Go to Keywords page, add a test keyword (e.g., "hello")
3. **Add Source**: Go to Sources page, add a subreddit (e.g., "technology") or leave blank for all Reddit
4. **Test Scan**: Click "Scan Now" button
5. **View Matches**: Check Matches page for results

## Troubleshooting

### "Function not found" error:
- Make sure Edge Functions are deployed
- Check function name is exactly `scan-reddit`
- Verify environment variables are set

### Database errors:
- Make sure migrations ran successfully
- Check SQL Editor for any error messages
- Verify tables exist: Go to Table Editor in Supabase Dashboard

### Authentication issues:
- Clear browser cache and localStorage
- Make sure `.env` file has correct values
- Restart dev server after updating `.env`

## Quick Checklist

- [x] Project created
- [x] Configuration files updated
- [ ] Database migrations run
- [ ] Edge Functions deployed
- [ ] Environment variables set for Edge Functions
- [ ] Dev server restarted
- [ ] Test signup/login
- [ ] Test scanning

You're almost there! Just need to run the migrations and deploy the Edge Functions.




