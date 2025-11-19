# Setting Environment Variables for Edge Functions

## Step-by-Step Guide

### Step 1: Get Your Service Role Key

1. Go to your Supabase Dashboard:
   **https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/settings/api**

2. Scroll down to find **"service_role"** key
   - ⚠️ **IMPORTANT**: This is different from the "anon" key
   - This key has admin privileges - keep it secret!
   - Copy the entire key (it's a long JWT token)

3. Your Project URL is:
   **`https://ehujrrodtrmpftsqktlf.supabase.co`**

### Step 2: Navigate to Your Function

1. Go to Edge Functions:
   **https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/functions**

2. Click on your function: **"hyper-endpoint"** (or whatever name you see)

### Step 3: Open Settings Tab

1. Once you're viewing the function, look for tabs at the top:
   - **Code** (where you edit the function)
   - **Settings** ← Click this one!
   - **Logs** (to see function output)

2. Click on the **"Settings"** tab

### Step 4: Add Environment Variables

In the Settings tab, you'll see a section for **"Environment Variables"** or **"Secrets"**.

Add these **3 environment variables** one by one:

#### Variable 1: SUPABASE_URL
- **Name**: `SUPABASE_URL`
- **Value**: `https://ehujrrodtrmpftsqktlf.supabase.co`
- Click **"Add"** or **"Save"**

#### Variable 2: SUPABASE_SERVICE_ROLE_KEY
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: (paste your service_role key from Step 1)
- Click **"Add"** or **"Save"**

#### Variable 3: CRON_SECRET
- **Name**: `CRON_SECRET`
- **Value**: (any random string, e.g., `my-secret-key-123` or `reddit-scanner-2024`)
- This is used for securing scheduled scans
- Click **"Add"** or **"Save"**

### Step 5: Verify Variables Are Set

After adding all three, you should see them listed in the Settings tab:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `CRON_SECRET`

### Step 6: Test the Function

1. Go back to your app: `http://localhost:8080`
2. Make sure you're logged in
3. Go to **Keywords** page
4. Add a keyword (e.g., "hello")
5. Add a source (e.g., subreddit "technology" or leave blank)
6. Click **"Scan Now"**
7. It should work! 🎉

## Visual Guide

```
Supabase Dashboard
├── Project: ehujrrodtrmpftsqktlf
├── Edge Functions
│   └── hyper-endpoint (your function)
│       ├── Code tab (function code)
│       ├── Settings tab ← GO HERE!
│       │   └── Environment Variables
│       │       ├── SUPABASE_URL = https://ehujrrodtrmpftsqktlf.supabase.co
│       │       ├── SUPABASE_SERVICE_ROLE_KEY = (your service role key)
│       │       └── CRON_SECRET = (random string)
│       └── Logs tab (debugging)
```

## Troubleshooting

### Can't find Settings tab?
- Make sure you've deployed the function first
- The function needs to exist before you can set environment variables

### Variables not saving?
- Make sure you click "Save" or "Add" after each variable
- Some interfaces require clicking a "Save" button at the bottom

### Function still not working?
- Check the **Logs** tab in your function to see error messages
- Verify all 3 variables are set correctly
- Make sure you copied the **service_role** key, not the **anon** key
- Restart your dev server after making changes

### Where to find Service Role Key?
- Go to: Settings → API
- Look for **"service_role"** (not "anon" or "public")
- It's usually at the bottom of the API keys section
- It's a long JWT token starting with `eyJ...`

## Quick Checklist

- [ ] Got service_role key from Settings → API
- [ ] Navigated to Edge Functions → hyper-endpoint
- [ ] Opened Settings tab
- [ ] Added SUPABASE_URL
- [ ] Added SUPABASE_SERVICE_ROLE_KEY
- [ ] Added CRON_SECRET
- [ ] Verified all 3 variables are saved
- [ ] Tested the scan function

## Need Help?

If you're stuck:
1. Check the function **Logs** tab for error messages
2. Make sure you're using the **service_role** key (not anon key)
3. Verify the function slug is correct: `hyper-endpoint`
4. Check browser console for any errors



