# Apify Tweet Scraper Setup (Step 1)

We’ll use Apify’s **Tweet Scraper** actor (pay‑per‑result, ~$0.25 / 1k tweets) so we don’t have to deal with Twitter’s OAuth or rate limits ourselves. Follow these steps once—you only need to set it up again if you rotate credentials.

---

## 1. Create (or sign into) your Apify account

1. Go to [https://console.apify.com](https://console.apify.com) and create an account (GitHub / Google is fine).
2. In the console, open **Account → Integrations** and copy your **API token** (we’ll store it as `APIFY_TOKEN` in Supabase later).

---

## 2. Add the Tweet Scraper actor to your account

1. Visit the actor’s public page: [https://apify.com/bernardo/tweet-scraper](https://apify.com/bernardo/tweet-scraper).
2. Click **“Try actor”** → **“Run”** to clone it into your workspace.
3. In the “Input” tab set a default configuration (you can override via API later):
   - `searchTerms`: leave blank for now (our Edge Function will inject keywords dynamically).
   - `tweetsDesired`: e.g. `200`.
   - `language`: `en`.
   - `includeReplies`: `false` (unless you want Q&A threads).
   - `maxRequestRetries`: `3`.
4. Save the input so we have a baseline template.

> ✅ The actor ID appears in the URL bar or in the **Run** panel (`<username>/<actor-slug>`). Copy it— we’ll store it as `APIFY_TWITTER_ACTOR_ID`.

---

## 3. Create a reusable task (optional but recommended)

Instead of invoking the actor directly each time, create a **Task**:

1. On the actor page → click **“Create task”**.
2. Name it `tweet-scraper-keyword-template`.
3. Leave the default input you saved above.
4. Grab its Task ID (looks like `user~task-name`). We’ll call it `APIFY_TWITTER_TASK_ID`.

Tasks let us override only the fields we care about (keywords, limit) while keeping the rest constant.

---

## 4. Store the credentials for the Edge Function

In the Supabase dashboard → **Project Settings → Functions → Environment Variables**, add:

| Key | Value |
| --- | --- |
| `APIFY_TOKEN` | `<your token from step 1>` |
| `APIFY_TWITTER_TASK_ID` | `<task id from step 3>` |
| _(or)_ `APIFY_TWITTER_ACTOR_ID` | `<actor id from step 2>` (only needed if you skip tasks) |

> ⚠️ Remember to **redeploy** the `hyper-endpoint`/`scan-reddit` function after adding env vars.

---

## 5. Test the actor via curl (optional sanity check)

```bash
curl -X POST \
  "https://api.apify.com/v2/acts/YOUR_USERNAME~tweet-scraper/runs?token=APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "searchTerms": ["need help with ads"],
    "tweetsDesired": 20,
    "language": "en"
  }'
```

Copy the `data.id` from the response, then poll:

```
https://api.apify.com/v2/datasets/<datasetId>/items?token=APIFY_TOKEN
```

You should see JSON objects with `text`, `user`, `timestamp`, etc.— exactly what we’ll ingest into `matches`.

---

✅ **Next step (handled in code):** update the Edge Function to invoke this task per scan, pull dataset results, run our intent filters, and insert rows with `platform: 'twitter'`.

---

## 6. Optimized JSON Configuration for High-Quality Leads

Use this JSON input to filter for **high-quality leads and buzz** (conversational, engaging) while **excluding mainstream noise** (viral posts, corporate spam, news):

```json
{
  "filter:blue_verified": false,
  "filter:consumer_video": false,
  "filter:has_engagement": true,
  "filter:hashtags": false,
  "filter:images": false,
  "filter:links": false,
  "filter:media": false,
  "filter:mentions": false,
  "filter:native_video": false,
  "filter:nativeretweets": false,
  "filter:news": false,
  "filter:pro_video": false,
  "filter:quote": false,
  "filter:replies": false,
  "filter:safe": false,
  "filter:spaces": false,
  "filter:twimg": false,
  "filter:videos": false,
  "filter:vine": false,
  "include:nativeretweets": false,
  "lang": "en",
  "maxItems": 100,
  "min_faves": 1,
  "min_replies": 0,
  "min_retweets": 0,
  "since": "2024-10-01_00:00:00_UTC",
  "until": "2024-12-31_23:59:59_UTC"
}
```

**What this does:**
- ✅ **`filter:replies: false`** - Includes both replies AND top-level tweets (replies often contain questions/complaints, top-level tweets can have buzz)
- ✅ **`filter:has_engagement: true`** - Only posts with some engagement (not dead threads)
- ✅ **`filter:news: false`** - Excludes mainstream news outlets
- ✅ **`filter:blue_verified: false`** - Avoids celebrity/corporate verified accounts (more authentic)
- ✅ **All media filters `false`** - Focuses on text-based conversations (not just image/video posts)
- ✅ **`filter:quote: false`** - Excludes quote tweets (want original thoughts)
- ✅ **`filter:nativeretweets: false`** - Excludes native retweets (want original content)
- ✅ **`min_faves: 1`** - Some engagement but not viral (adjust to 2-3 if too noisy)
- ✅ **`min_retweets: 0`** - Not viral, just conversational buzz
- ✅ **`maxItems: 100`** - Get enough data for our filters to work with

**Adjust as needed:**
- If too many low-quality results: bump `min_faves` to `2-3`
- If too few results: lower `min_faves` to `0`
- Want older data? Extend `since` date back further
- Want replies only? Set `filter:replies: true` (replies often contain questions/complaints)

---

## Results Will Appear in Your Project ✅

The codebase already supports Twitter matches:
- ✅ `matches` table has `platform` field supporting `'reddit'` and `'twitter'`
- ✅ Matches page already displays Twitter matches with 🐦 Twitter badge
- ✅ Edge Function already has infrastructure to handle Twitter sources
- ✅ Same intent filtering logic applies to Twitter matches

Once the Edge Function is updated to call Apify, Twitter matches will flow through the exact same pipeline as Reddit matches—they'll appear in:
- Dashboard charts (grouped by platform)
- Matches page (filterable, searchable, same high-intent toggle)
- Pain points detection (if they match complaint/problem patterns)

