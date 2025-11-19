# Scaling & Analytics Guide

## Will It Work the Same When Hosted? ✅ **YES**

Your application is already designed to work the same way when hosted because:

### 1. **Supabase Edge Functions (Already Cloud-Based)**
- Your `scan-reddit` and `scheduled-scan` functions run on **Supabase's servers**, not locally
- They work identically whether you call them from localhost or a production URL
- No code changes needed for hosting

### 2. **Database (Already in Cloud)**
- Your database is in Supabase (cloud-hosted PostgreSQL)
- All data (users, matches, keywords) is already in the cloud
- Works the same locally and in production

### 3. **Frontend (Just Needs Deployment)**
- Your React app can be deployed to:
  - **Vercel** (recommended - free, easy)
  - **Netlify** (free tier available)
  - **Cloudflare Pages** (free tier)
  - Any static hosting service
- Just point it to your Supabase project (same URL/keys)

### 4. **What Changes When Hosted?**
- **Nothing functionally** - same code, same behavior
- **Only difference**: Users access via your domain instead of localhost
- **Environment variables**: Make sure production frontend has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## Can You See Active Users? 📊 **NOT YET - But Data Exists**

### Current Situation
You **don't have an admin dashboard yet**, but **all the data exists** in your database:

#### Available Data:
1. **User Profiles** (`profiles` table)
   - `id`, `email`, `created_at`
   - Total users, signup dates

2. **Subscriptions** (`subscriptions` table)
   - `user_id`, `plan` (free/basic/pro), `status` (active/past_due/canceled)
   - `created_at`, `current_period_end`
   - Active users, plan distribution, revenue data

3. **Daily Scans** (`daily_scans` table)
   - `user_id`, `scan_date`, `created_at`
   - Active users (users who scanned today/this week)
   - Scan frequency per user

4. **Matches** (`matches` table)
   - `user_id`, `created_at_utc`, `inserted_at`
   - User engagement, match activity

5. **Keywords & Sources** (`keywords`, `sources` tables)
   - User engagement metrics

### How to View This Data Now (Temporary Solutions)

#### Option 1: Supabase Dashboard (Quick & Easy)
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click **Table Editor** → Browse tables
3. Click **SQL Editor** → Run queries like:

```sql
-- Total users
SELECT COUNT(*) as total_users FROM auth.users;

-- Active users (scanned in last 7 days)
SELECT COUNT(DISTINCT user_id) as active_users_7d
FROM daily_scans
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Users by plan
SELECT plan, COUNT(*) as count
FROM subscriptions
WHERE status = 'active'
GROUP BY plan;

-- Users who scanned today
SELECT COUNT(DISTINCT user_id) as active_today
FROM daily_scans
WHERE scan_date = CURRENT_DATE AT TIME ZONE 'America/New_York';

-- Top active users (by scan count)
SELECT 
  p.email,
  COUNT(ds.id) as scan_count,
  s.plan,
  COUNT(m.id) as total_matches
FROM profiles p
LEFT JOIN daily_scans ds ON p.id = ds.user_id
LEFT JOIN subscriptions s ON p.id = s.user_id
LEFT JOIN matches m ON p.id = m.user_id
GROUP BY p.id, p.email, s.plan
ORDER BY scan_count DESC
LIMIT 20;
```

#### Option 2: Build an Admin Dashboard (Recommended for Production)

You'll want to create an admin page that shows:
- Total users
- Active users (last 7/30 days)
- Users by plan (free/basic/pro)
- Daily/weekly signups
- Scan activity
- Match activity
- Revenue metrics (if using Stripe)

---

## Building an Admin Dashboard

### Step 1: Create Admin Role System

Add admin flag to profiles table:

```sql
-- Add admin column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Make yourself admin (replace with your user ID)
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

### Step 2: Create Admin RLS Policies

```sql
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Similar policies for subscriptions, daily_scans, matches, etc.
```

### Step 3: Create Admin Dashboard Page

Create `src/pages/app/Admin.tsx` with:
- User statistics
- Active users chart
- Plan distribution
- Recent signups
- Scan activity
- Match trends

### Step 4: Add Admin Route

Add to `src/App.tsx`:
```tsx
<Route path="/app/admin" element={<Admin />} />
```

---

## Recommended Analytics to Track

### User Metrics
- ✅ Total users
- ✅ Active users (DAU/WAU/MAU)
- ✅ New signups (daily/weekly)
- ✅ User retention (7-day, 30-day)

### Engagement Metrics
- ✅ Scans per user
- ✅ Matches per user
- ✅ Keywords per user
- ✅ Sources per user

### Business Metrics
- ✅ Free vs Paid users
- ✅ Conversion rate (free → paid)
- ✅ Churn rate
- ✅ MRR (Monthly Recurring Revenue)

### Product Metrics
- ✅ Total matches found
- ✅ Matches per keyword
- ✅ Top subreddits monitored
- ✅ Average response time

---

## Quick Start: View Active Users Right Now

Run these SQL queries in Supabase SQL Editor. **See `ADMIN_SQL_QUERIES.sql` for complete, working queries.**

**Quick Active Users Query (Simple - No CTE):**
```sql
-- Active users in last 7 days
SELECT COUNT(DISTINCT user_id) as active_users_7d
FROM daily_scans
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**Full Dashboard Query (With CTE):**
```sql
-- Active Users Dashboard Query
WITH user_stats AS (
  SELECT 
    p.id,
    p.email,
    p.created_at as signup_date,
    s.plan,
    s.status as subscription_status,
    COUNT(DISTINCT ds.scan_date) as days_scanned,
    MAX(ds.created_at) as last_scan,
    COUNT(DISTINCT k.id) as keyword_count,
    COUNT(DISTINCT src.id) as source_count,
    COUNT(m.id) as total_matches
  FROM profiles p
  LEFT JOIN subscriptions s ON p.id = s.user_id
  LEFT JOIN daily_scans ds ON p.id = ds.user_id
  LEFT JOIN keywords k ON p.id = k.user_id
  LEFT JOIN sources src ON p.id = src.user_id
  LEFT JOIN matches m ON p.id = m.user_id
  GROUP BY p.id, p.email, p.created_at, s.plan, s.status
)
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN last_scan >= NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
  COUNT(CASE WHEN last_scan >= NOW() - INTERVAL '30 days' THEN 1 END) as active_30d,
  COUNT(CASE WHEN plan = 'free' THEN 1 END) as free_users,
  COUNT(CASE WHEN plan = 'pro' THEN 1 END) as pro_users,
  COUNT(CASE WHEN plan = 'basic' THEN 1 END) as basic_users
FROM user_stats;
```

**Note:** If you get a syntax error, make sure you copy the **entire query** including the `WITH` keyword at the beginning. See `ADMIN_SQL_QUERIES.sql` for all working queries.

---

## Deployment Checklist

### Before Going Live:
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Set production environment variables
- [ ] Test Edge Functions in production
- [ ] Set up scheduled scan cron job
- [ ] Create admin dashboard (or use SQL queries)
- [ ] Set up error monitoring (Sentry, LogRocket)
- [ ] Set up analytics (PostHog, Mixpanel, or Google Analytics)
- [ ] Test with real users

### Environment Variables for Production:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

---

## Summary

✅ **Functionality**: Works identically when hosted (Edge Functions are already cloud-based)  
✅ **Data**: All user data exists and is queryable  
❌ **Admin Dashboard**: Not built yet, but easy to add  
✅ **Quick Solution**: Use Supabase SQL Editor to view analytics  
✅ **Long-term**: Build admin dashboard for better UX

Your app is **production-ready** from a functionality standpoint. The only missing piece is the admin analytics dashboard, which you can build or use SQL queries for now.

