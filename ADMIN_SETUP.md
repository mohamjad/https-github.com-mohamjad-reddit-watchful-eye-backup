# Admin Dashboard Setup Guide

## Overview

The admin dashboard allows you to view:
- Total users and active users
- User signups over time
- Plan distribution (free/basic/pro)
- Scan activity
- Match activity
- Detailed user list with engagement metrics

## Step 1: Run the Migration

First, you need to run the migration to add admin support:

1. **Go to Supabase SQL Editor**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

2. **Run the migration**
   - Copy the contents of `supabase/migrations/20250106000000_add_admin_support.sql`
   - Paste it into the SQL Editor
   - Click "Run"

This will:
- Add `is_admin` column to `profiles` table
- Create admin RLS policies
- Create helper function to check admin status

## Step 2: Make Yourself an Admin

After running the migration, make yourself an admin:

### Option A: Using SQL Editor (Recommended)

1. **Get your user ID**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/users
   - Find your user account
   - Copy your User UID

2. **Run this SQL query**
   ```sql
   -- Replace 'YOUR_USER_ID' with your actual user ID
   UPDATE public.profiles 
   SET is_admin = true 
   WHERE id = 'YOUR_USER_ID';
   ```

### Option B: Using Your Email

If you know your email, you can use:

```sql
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

### Option C: Make First User Admin

To automatically make the first user admin:

```sql
UPDATE public.profiles 
SET is_admin = true 
WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);
```

## Step 3: Verify Admin Access

1. **Refresh your app** (or log out and log back in)
2. **Check the sidebar** - You should see an "Admin" link with a shield icon
3. **Click "Admin"** - You should see the admin dashboard

If you don't see the Admin link:
- Make sure you refreshed the page
- Check that `is_admin = true` in the database
- Check browser console for any errors

## Step 4: Test the Dashboard

The admin dashboard shows:

### Stats Cards
- **Total Users**: All registered users
- **Active Users (7d)**: Users who scanned in last 7 days
- **New Users Today**: Signups today
- **Pro Users**: Number of pro plan subscribers

### Charts
- **Daily Signups**: Line chart of new user registrations
- **Plan Distribution**: Pie chart of free/basic/pro users
- **Scan Activity**: Bar chart of daily scans
- **Match Activity**: Bar chart of daily matches found

### Active Users Table
- Email addresses
- Plan type
- Signup date
- Last scan date
- Days scanned
- Keyword count
- Source count
- Total matches
- Activity status

## Troubleshooting

### "Access Denied" Error

If you see "Access Denied" when clicking Admin:

1. **Check RLS policies**
   ```sql
   -- Verify admin policies exist
   SELECT * FROM pg_policies 
   WHERE tablename = 'profiles' 
   AND policyname LIKE '%admin%';
   ```

2. **Verify your admin status**
   ```sql
   SELECT id, email, is_admin 
   FROM public.profiles 
   WHERE email = 'your-email@example.com';
   ```

3. **Check if policies are enabled**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'profiles';
   ```

### Admin Link Not Showing

1. **Clear browser cache** and refresh
2. **Check browser console** for errors
3. **Verify admin check query**:
   ```sql
   SELECT is_admin FROM public.profiles WHERE id = 'YOUR_USER_ID';
   ```

### No Data Showing

If charts/tables are empty:
- This is normal if you have no users yet
- The dashboard will populate as users sign up and use the app
- Check that you have data in:
  - `profiles` table (users)
  - `daily_scans` table (activity)
  - `matches` table (engagement)

## Security Notes

⚠️ **Important Security Considerations:**

1. **Admin access is powerful** - Admins can see all user data
2. **Only grant admin to trusted users**
3. **Monitor admin activity** - Consider adding audit logs
4. **RLS policies protect data** - Even admins must go through RLS (but policies allow them to see all data)

## Making Additional Admins

To make other users admins:

```sql
-- By email
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'admin@example.com';

-- By user ID
UPDATE public.profiles 
SET is_admin = true 
WHERE id = 'user-uuid-here';

-- Remove admin access
UPDATE public.profiles 
SET is_admin = false 
WHERE email = 'user@example.com';
```

## Next Steps

Once the admin dashboard is working, you can:

1. **Monitor user growth** - Track signups and active users
2. **Identify power users** - See who uses the app most
3. **Track engagement** - Monitor scan and match activity
4. **Plan distribution** - See free vs paid breakdown
5. **Export data** - Use SQL queries to export user data for analysis

## SQL Queries for Advanced Analytics

Here are some useful queries you can run in Supabase SQL Editor:

```sql
-- User retention (7-day)
SELECT 
  COUNT(DISTINCT user_id) as active_users,
  COUNT(DISTINCT CASE WHEN last_scan >= NOW() - INTERVAL '7 days' THEN user_id END) as active_7d
FROM daily_scans;

-- Top 10 most active users
SELECT 
  p.email,
  COUNT(DISTINCT ds.scan_date) as days_scanned,
  COUNT(m.id) as total_matches,
  s.plan
FROM profiles p
LEFT JOIN daily_scans ds ON p.id = ds.user_id
LEFT JOIN matches m ON p.id = m.user_id
LEFT JOIN subscriptions s ON p.id = s.user_id
GROUP BY p.id, p.email, s.plan
ORDER BY days_scanned DESC, total_matches DESC
LIMIT 10;

-- Conversion rate (free to paid)
SELECT 
  COUNT(CASE WHEN plan = 'free' THEN 1 END) as free_users,
  COUNT(CASE WHEN plan IN ('basic', 'pro') THEN 1 END) as paid_users,
  ROUND(100.0 * COUNT(CASE WHEN plan IN ('basic', 'pro') THEN 1 END) / COUNT(*), 2) as conversion_rate
FROM subscriptions
WHERE status = 'active';
```

---

✅ **You're all set!** The admin dashboard is now ready to use.












