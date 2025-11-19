# Deploy and Test Your Edge Function

## Step 1: Verify Function is Deployed

Your function should already be deployed (since you can see it in the dashboard). But let's make sure:

1. Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/functions
2. You should see your function: **"hyper-endpoint"** (or "scan-reddit")
3. Make sure it shows as **"Active"** or **"Deployed"**

If it's not deployed yet:
- Click on the function
- Go to **Code** tab
- Make sure the code from `supabase/functions/scan-reddit/index.ts` is there
- Click **"Deploy"** or **"Save"**

## Step 2: Verify Secrets Are Set

1. Go to: **Functions** → **Secrets** (where you just were)
2. Verify you have:
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `CRON_SECRET`

## Step 3: Make Sure Database Migrations Are Run

Before testing, make sure your database tables exist:

1. Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/sql/new
2. Check if you've run the migrations:
   - If not, run `supabase/migrations/20251104023635_cbb5ed00-51a3-440b-a515-9294ef0cb089.sql`
   - Then run `supabase/migrations/20250104000000_add_scan_tracking.sql`

## Step 4: Test from Your App

### Quick Test:

1. **Start/Restart your dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open your app**: http://localhost:8080

3. **Sign up/Login**:
   - Create an account or log in
   - This creates your user profile automatically

4. **Add a Keyword**:
   - Go to **Keywords** page
   - Click **"Add Keyword"**
   - Enter a common keyword like: `hello` or `test`
   - Click **"Add Keyword"**

5. **Add a Source**:
   - Go to **Sources** page
   - Click **"Add Source"**
   - Enter a subreddit like: `technology` (or leave blank for all Reddit)
   - Make sure "Include comments" is checked
   - Click **"Add Source"**

6. **Test the Scan**:
   - Go back to **Keywords** page
   - Click **"Scan Now"** button
   - Wait a few seconds (scanning can take 10-30 seconds)
   - You should see a success message with number of matches found

7. **Check Matches**:
   - Go to **Matches** page
   - You should see any matches that were found

## Step 5: Check Function Logs (If Issues)

If something doesn't work:

1. Go to: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/functions
2. Click on your function: **hyper-endpoint**
3. Click **"Logs"** tab
4. Look for any error messages
5. Try scanning again and watch the logs in real-time

## Troubleshooting

### "Function not found" error:
- Make sure function slug is `hyper-endpoint` (we already updated the code)
- Check function is deployed

### "Unauthorized" error:
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly in Secrets
- Make sure you're logged into the app

### "No keywords found":
- Make sure you added keywords in the Keywords page
- Check database tables exist (run migrations)

### "No sources found":
- Make sure you added sources in the Sources page

### Scan takes too long:
- This is normal - scanning Reddit can take 10-30 seconds
- Check the Logs tab to see progress

## Quick Checklist

- [ ] Function is deployed (shows as Active)
- [ ] All 3 secrets are set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET)
- [ ] Database migrations are run
- [ ] Dev server is running
- [ ] Logged into the app
- [ ] Added at least one keyword
- [ ] Added at least one source
- [ ] Clicked "Scan Now"
- [ ] Checked Matches page for results

## Success Indicators

✅ **Scan completed** toast message appears
✅ Matches appear on Matches page
✅ Dashboard shows match statistics
✅ No errors in browser console
✅ Function logs show successful execution

You're ready to test! 🚀



