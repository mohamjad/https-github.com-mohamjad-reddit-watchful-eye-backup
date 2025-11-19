# Migration Setup Guide

## Issue: Missing `daily_scans` Table

If you're getting the error:
```
ERROR: 42P01: relation "daily_scans" does not exist
```

This means the migrations haven't been run in order. Here's how to fix it:

## Step 1: Check Which Migrations Have Run

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

2. Run this query to see what tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## Step 2: Run Migrations in Order

Run these migrations **in this exact order**:

### 1. Base Schema (if not already run)
**File**: `supabase/migrations/20251104023635_cbb5ed00-51a3-440b-a515-9294ef0cb089.sql`

This creates:
- `profiles` table
- `subscriptions` table
- `keywords` table
- `sources` table
- `matches` table
- `notification_channels` table

### 2. Scan Tracking
**File**: `supabase/migrations/20250104000000_add_scan_tracking.sql`

This creates:
- `daily_scans` table ⚠️ **This is the one you're missing!**

### 3. Fix Daily Scans RLS
**File**: `supabase/migrations/20250104000002_fix_daily_scans_rls.sql`

Fixes RLS policies for daily_scans.

### 4. Other Migrations (in order)
- `20250104000001_scheduled_scans.sql`
- `20250104000003_cascade_delete_keywords.sql`
- `20250104000004_add_search_type.sql`
- `20250104000005_add_platform_support.sql`
- `20250105000001_add_auto_scan_settings.sql`

### 5. Admin Support (Last)
**File**: `supabase/migrations/20250106000000_add_admin_support.sql`

This creates:
- `is_admin` column on profiles
- Admin RLS policies

## Quick Fix: Create `daily_scans` Table Now

If you just want to create the missing table quickly, run this:

```sql
-- Create daily_scans table for tracking free tier scan limits
CREATE TABLE IF NOT EXISTS public.daily_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  scan_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, scan_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_scans
DROP POLICY IF EXISTS "Users can view own scans" ON public.daily_scans;
CREATE POLICY "Users can view own scans" ON public.daily_scans FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scans" ON public.daily_scans;
CREATE POLICY "Users can insert own scans" ON public.daily_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_scans_user_date ON public.daily_scans(user_id, scan_date DESC);
```

## Verify Tables Exist

After running migrations, verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles',
  'subscriptions',
  'keywords',
  'sources',
  'matches',
  'daily_scans',
  'notification_channels'
)
ORDER BY table_name;
```

You should see all 7 tables listed.

## Then Run Admin Migration

Once `daily_scans` exists, you can safely run:
- `supabase/migrations/20250106000000_add_admin_support.sql`

## Alternative: Run All Migrations at Once

If you want to ensure everything is set up correctly, you can run all migrations in one go:

1. Copy all migration files in order
2. Paste them into SQL Editor (one at a time, or combine them)
3. Run each one

The migrations use `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS`, so they're safe to run multiple times.

---

**After fixing this, the admin dashboard should work!** 🎉












