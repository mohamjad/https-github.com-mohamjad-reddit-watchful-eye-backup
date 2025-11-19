# Setting Up Reddit OAuth API Access

Reddit's public JSON endpoints are now blocked or heavily rate-limited. To access Reddit's API, you need to use OAuth2 authentication.

## Step 1: Create a Reddit App

1. Go to https://www.reddit.com/prefs/apps
2. Scroll down and click **"create another app..."** or **"create app"**
3. Fill in the form:
   - **Name**: `Reddit Watchful Eye` (or any name you want)
   - **App type**: Select **"script"**
   - **Description**: `Monitor Reddit for keywords` (optional)
   - **About URL**: Leave blank or add your website
   - **Redirect URI**: `http://localhost` (required but not used for script apps)
4. Click **"create app"**

## Step 2: Get Your Credentials

After creating the app, you'll see:
- **Client ID**: A string under your app name (looks like: `abc123def456ghi789`)
- **Client Secret**: A string labeled "secret" (looks like: `xyz789secret123`)

**Important**: Copy these values immediately - you won't be able to see the secret again!

## Step 3: Set Environment Variables in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf
2. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**
3. Add two new secrets:
   - **Name**: `REDDIT_CLIENT_ID` → **Value**: Your Client ID from Step 2
   - **Name**: `REDDIT_CLIENT_SECRET` → **Value**: Your Client Secret from Step 2
4. Click **Save** for each secret

## Step 4: Deploy Updated Edge Function

1. Copy the updated code from `supabase/functions/scan-reddit/index.ts`
2. Go to: **Edge Functions** → **hyper-endpoint** → **Code** tab
3. Paste the updated code
4. Click **Deploy**

## Step 5: Test

1. Run a scan from your frontend
2. Check the logs - you should see:
   - `Fetching new Reddit OAuth token...`
   - `✅ Reddit OAuth token obtained`
   - `📡 Fetching: https://www.reddit.com/r/popular/new.json?limit=100`
   - `📥 Response status: 200 OK`
   - Posts being fetched and matched!

## Rate Limits

With OAuth authentication, Reddit allows:
- **60 requests per minute** per OAuth token
- The code automatically caches tokens (valid for 1 hour) to minimize requests

## Troubleshooting

### "Reddit OAuth credentials not configured"
- Make sure you set `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` in Supabase Edge Function secrets
- Redeploy the function after adding secrets

### "Failed to get Reddit OAuth token: 401"
- Double-check your Client ID and Client Secret
- Make sure there are no extra spaces when copying
- Verify the app type is set to "script" in Reddit

### Still getting 403 errors
- Wait a few minutes - Reddit may have temporarily blocked your IP
- Try again later
- Make sure you're using the OAuth token (check logs for "Using cached Reddit OAuth token" or "Fetching new Reddit OAuth token")

## Notes

- The OAuth token is cached in memory and reused for up to 1 hour
- Each Edge Function instance has its own cache
- If you see "Attempting request without OAuth...", the OAuth failed and it's falling back (may not work)





