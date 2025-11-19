# Deploy Edge Functions - Quick Guide

The scan functionality requires Supabase Edge Functions to be deployed. Follow these steps:

## Option 1: Deploy via Supabase Dashboard (Easiest - No CLI needed)

### Step 1: Get Your Service Role Key

1. Go to https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/settings/api
2. Copy your **Service Role Key** (not the anon key - keep this secret!)
3. Copy your **Project URL** (should be: `https://ehujrrodtrmpftsqktlf.supabase.co`)

### Step 2: Deploy scan-reddit Function

1. Go to https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/functions
2. Click **"Create a new function"**
3. Name it: `scan-reddit`
4. Copy the entire contents of `supabase/functions/scan-reddit/index.ts` and paste it into the editor
5. Click **"Deploy"**

### Step 3: Set Environment Variables for scan-reddit

1. After deployment, click on the `scan-reddit` function
2. Go to **Settings** tab
3. Add these environment variables:

   - **Name**: `SUPABASE_URL`
     **Value**: `https://ehujrrodtrmpftsqktlf.supabase.co`

   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
     **Value**: (paste your service role key from Step 1)

   - **Name**: `CRON_SECRET`
     **Value**: (generate a random string, e.g., `my-secret-123` or use an online generator)

4. Click **"Save"**

### Step 4: Test the Function

1. Make sure you're logged into your app
2. Go to Keywords page
3. Add a keyword and source
4. Click "Scan Now"
5. It should work now!

## Option 2: Deploy via CLI (Advanced)

### Install Supabase CLI

```bash
npm install -g supabase
```

### Login and Link

```bash
# Login to Supabase
supabase login

# Link your project (your project ref is: ehujrrodtrmpftsqktlf)
supabase link --project-ref ehujrrodtrmpftsqktlf
```

### Deploy Functions

```bash
# Deploy scan-reddit function
supabase functions deploy scan-reddit

# Deploy scheduled-scan function (optional, for automated scans)
supabase functions deploy scheduled-scan
```

### Set Environment Variables via CLI

```bash
# Set environment variables
supabase secrets set SUPABASE_URL=https://ehujrrodtrmpftsqktlf.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
supabase secrets set CRON_SECRET=your-random-secret-here
```

## Troubleshooting

### Error: "Function not found" or "404"
- Make sure the function is deployed and named exactly `scan-reddit`
- Check that environment variables are set correctly

### Error: "Unauthorized" 
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Make sure you're using the Service Role key, not the anon key

### Error: "Failed to scan Reddit"
- Check the function logs in Supabase Dashboard > Edge Functions > scan-reddit > Logs
- Make sure you have keywords and sources configured
- Check browser console for more details

## Quick Test

After deployment, you can test the function directly:

1. Get your anon key from Supabase Dashboard > Settings > API
2. Make sure you're logged into the app (this gives you an auth token)
3. Open browser console and run:

```javascript
// First, make sure you're logged in
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Then test the function
const { data, error } = await supabase.functions.invoke('scan-reddit', {
  body: { userId: session.user.id }
});
console.log('Result:', data, error);
```

## Next Steps

Once the function is deployed:
1. Test it with a common keyword like "hello"
2. Add a source (subreddit or all of Reddit)
3. Click "Scan Now" and check for matches
4. View matches on the Matches page

