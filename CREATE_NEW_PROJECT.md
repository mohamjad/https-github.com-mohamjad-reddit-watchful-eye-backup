# Create New Supabase Project - Step by Step

## Step 1: Create a New Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in or create an account (free tier works)

2. **Create New Project**
   - Click **"New Project"** button
   - Fill in:
     - **Name**: `reddit-watchful-eye` (or any name you prefer)
     - **Database Password**: Choose a strong password (save this!)
     - **Region**: Choose closest to you
   - Click **"Create new project"**
   - Wait 1-2 minutes for project to initialize

3. **Get Your Project Details**
   - Once created, go to **Settings** → **API**
   - Copy these values:
     - **Project URL** (looks like: `https://xxxxx.supabase.co`)
     - **Project Reference** (the `xxxxx` part)
     - **anon public** key
     - **service_role** key (keep this secret!)

## Step 2: Update Your .env File

Update your `.env` file with the new project details:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

Replace:
- `YOUR_PROJECT_REF` with your actual project reference
- `your-anon-key-here` with your anon public key

## Step 3: Update supabase/config.toml

Update the project_id in `supabase/config.toml`:

```toml
project_id = "YOUR_PROJECT_REF"
```

## Step 4: Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run these migrations in order:

   **First migration** (`20251104023635_cbb5ed00-51a3-440b-a515-9294ef0cb089.sql`):
   - Copy the entire contents of the file
   - Paste into SQL Editor
   - Click **Run**

   **Second migration** (`20250104000000_add_scan_tracking.sql`):
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**

## Step 5: Deploy Edge Functions

After migrations are done, deploy the Edge Functions:

1. Go to **Edge Functions** in your Supabase dashboard
2. Click **"Create a new function"**
3. Name it: `scan-reddit`
4. Copy contents from `supabase/functions/scan-reddit/index.ts`
5. Click **Deploy**
6. Go to **Settings** tab and add:
   - `SUPABASE_URL` = Your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key
   - `CRON_SECRET` = Any random string

## Step 6: Restart Your Dev Server

After updating `.env`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Quick Checklist

- [ ] Created new Supabase project
- [ ] Updated `.env` file with new credentials
- [ ] Updated `supabase/config.toml` with new project_id
- [ ] Ran database migrations
- [ ] Deployed Edge Functions
- [ ] Set Edge Function environment variables
- [ ] Restarted dev server
- [ ] Tested signup/login
- [ ] Tested scanning

## Need Help?

If you get stuck:
- Check Supabase dashboard for project status
- Verify all environment variables are correct
- Check browser console for errors
- Make sure migrations ran successfully




