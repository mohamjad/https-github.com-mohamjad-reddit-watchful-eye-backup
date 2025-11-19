# Twitter API Setup Guide

Twitter scanning is **already implemented** in the Edge Function! You just need to:

1. **Get a Twitter Bearer Token**
2. **Add it to Supabase Edge Function secrets**
3. **Done!**

## Step 1: Get Twitter Bearer Token

### 1.1 Create Twitter Developer Account
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Sign up for a developer account (if you don't have one)
3. Create a new Project and App

### 1.2 Generate Bearer Token
1. Go to your App's **"Keys and Tokens"** section
2. Under **"Bearer Token"**, click **"Generate"** or **"Regenerate"**
3. Copy the Bearer Token (it looks like: `AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIz...`)

**Note**: Bearer Tokens are **read-only** - they can only search public tweets, not post or access user data. This is perfect for scanning!

## Step 2: Add to Supabase Edge Function

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name**: `TWITTER_BEARER_TOKEN`
   - **Value**: Your Bearer Token (paste it here)
4. Click **Save**

## Step 3: Test It

1. Go to the **Sources** page in your app
2. Click **"Add Source"**
3. Select **"Twitter"** from the platform dropdown
4. Click **"Add Source"** (no subreddit needed for Twitter)
5. Go to **Keywords** page and add some keywords
6. Click **"Scan Now"**
7. Check the Edge Function logs to see Twitter matches!

## How It Works

- **Twitter API v2**: Uses `/2/tweets/search/recent` endpoint
- **Pagination**: Fetches up to 500 tweets per keyword (5 pages × 100 tweets)
- **Rate Limiting**: 2-second delay between pages, handles 429 errors
- **Spam Filtering**: Same spam filters as Reddit
- **Keyword Matching**: Same intelligent matching as Reddit
- **No Limits**: Twitter sources don't have subreddit requirements

## Troubleshooting

### No Twitter matches?
1. Check Edge Function logs for errors
2. Verify `TWITTER_BEARER_TOKEN` is set in Supabase secrets
3. Check if Bearer Token is valid (not expired)
4. Verify Twitter API rate limits (free tier has limits)

### Rate Limit Errors?
- The Edge Function automatically waits 15 minutes if rate limited
- Twitter free tier: 300 requests per 15 minutes
- Each keyword scan = 1-5 requests (depending on pagination)

### Bearer Token Not Working?
- Make sure it's a **Bearer Token**, not an API Key
- Bearer Tokens don't expire (unless regenerated)
- Check Twitter Developer Portal to verify token is active

## Twitter API Limits (Free Tier)

- **Rate Limit**: 300 requests per 15 minutes
- **Tweet Search**: Recent tweets only (last 7 days)
- **Max Results**: 100 tweets per request
- **Pagination**: Up to 5 pages (500 tweets max per keyword)

## Cost

- **Free Tier**: 10,000 tweets per month
- **Paid Tier**: $100/month for 1M tweets/month

For most use cases, the free tier is sufficient!

