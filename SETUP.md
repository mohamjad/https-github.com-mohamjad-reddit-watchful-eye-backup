# Setup Guide

This guide will help you set up and deploy the Reddit Watchful Eye application.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Git installed

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd reddit-watchful-eye

# Install dependencies
npm install
```

## Step 2: Set Up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose a name and database password
   - Select a region close to you
   - Wait for the project to be created (takes 1-2 minutes)

2. **Run Database Migrations**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run each migration file in order from `supabase/migrations/`:
     - `20251104023635_cbb5ed00-51a3-440b-a515-9294ef0cb089.sql`
     - `20250104000000_add_scan_tracking.sql`
     - `20250104000001_scheduled_scans.sql` (just for reference, no tables to create)

3. **Get Your API Keys**
   - Go to Settings > API
   - Copy your:
     - Project URL (looks like: `https://xxxxx.supabase.co`)
     - `anon` public key
     - `service_role` key (keep this secret!)

## Step 3: Configure Environment Variables

1. Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env
```

2. Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

**Important**: The `service_role` key should NOT be in your `.env` file. It will be set in Supabase Edge Functions.

## Step 4: Deploy Supabase Edge Functions

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (You can find your project ref in the Supabase dashboard URL)

4. **Deploy the functions**:
   ```bash
   # Deploy scan-reddit function
   supabase functions deploy scan-reddit

   # Deploy scheduled-scan function
   supabase functions deploy scheduled-scan
   ```

### Option B: Using Supabase Dashboard

1. Go to Edge Functions in your Supabase dashboard
2. Click "Create a new function"
3. Name it `scan-reddit`
4. Copy the contents of `supabase/functions/scan-reddit/index.ts`
5. Set environment variables:
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
   - `CRON_SECRET`: Generate a random string (e.g., use `openssl rand -hex 32`)

6. Repeat for `scheduled-scan` function

## Step 5: Set Up Scheduled Scans (Optional)

To enable automatic hourly scans, choose one method:

### Method 1: External Cron Service (Easiest)

1. Sign up for [cron-job.org](https://cron-job.org) (free)
2. Create a new cron job:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scan`
   - Method: POST
   - Schedule: Every hour
   - Headers:
     - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type: application/json`
   - Body:
     ```json
     {
       "cron_secret": "YOUR_CRON_SECRET"
     }
     ```

### Method 2: GitHub Actions

1. Create `.github/workflows/scheduled-scan.yml`:
   ```yaml
   name: Scheduled Reddit Scan
   on:
     schedule:
       - cron: '0 * * * *'  # Every hour
   jobs:
     scan:
       runs-on: ubuntu-latest
       steps:
         - name: Trigger Scan
           run: |
             curl -X POST \
               -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
               -H "Content-Type: application/json" \
               -d '{"cron_secret": "${{ secrets.CRON_SECRET }}"}' \
               https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scan
   ```

2. Add secrets to your GitHub repository:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`

## Step 6: Run the Application

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

## Step 7: Test the Application

1. **Sign Up**: Create a new account
2. **Add a Keyword**: Go to Keywords page and add a test keyword (e.g., "hello")
3. **Add a Source**: Go to Sources page and add a subreddit (e.g., "technology") or leave blank for all of Reddit
4. **Scan**: Click "Scan Now" button on the Keywords page
5. **View Matches**: Go to Matches page to see results

## Troubleshooting

### Edge Functions Not Working

- Verify functions are deployed: Check Supabase Dashboard > Edge Functions
- Check environment variables are set correctly
- Check function logs in Supabase Dashboard

### No Matches Found

- Verify you have keywords and sources configured
- Try a common keyword like "hello" or "test"
- Check Reddit API is accessible (may be rate-limited)
- Check browser console for errors

### Authentication Issues

- Clear browser cache and localStorage
- Verify `.env` file has correct Supabase credentials
- Check Supabase project is active

### Database Errors

- Verify all migrations have been run
- Check Row Level Security (RLS) policies are enabled
- Verify triggers are created (for auto-creating profiles on signup)

## Next Steps

- Set up email notifications (requires email service like SendGrid or Resend)
- Configure custom domain
- Set up Stripe for paid subscriptions
- Add Slack/webhook integrations

## Support

If you encounter issues, check:
1. Supabase function logs
2. Browser console for errors
3. Network tab for failed API requests
4. Supabase dashboard for database errors




