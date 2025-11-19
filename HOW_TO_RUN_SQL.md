# How to Run SQL in Supabase - Step by Step Guide

## What is "Running SQL"?

**SQL** (Structured Query Language) is the language used to talk to databases. When we say "run SQL" or "run a migration", we mean executing SQL commands that create tables, modify data, or change database settings.

## Why Do We Need to Run SQL?

Your app needs database tables to store data like:
- Keywords
- Sources  
- Matches
- User profiles
- Scan tracking

These tables don't exist automatically - we need to create them by running SQL commands (migrations).

## How to Run SQL in Supabase

### Step 1: Open SQL Editor

1. Go to your Supabase Dashboard:
   **https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf**

2. Look at the left sidebar menu
3. Click on **"SQL Editor"** (it has a database icon 📊)

### Step 2: Create a New Query

1. Once in SQL Editor, you'll see:
   - Left side: List of your saved queries (if any)
   - Right side: A big text editor where you type SQL
   - Top: A "New query" button

2. Click **"New query"** button (or the editor is already open)

### Step 3: Copy and Paste SQL Code

1. Open the migration file you need to run:
   - `supabase/migrations/20250104000002_fix_daily_scans_rls.sql`
   
2. **Copy ALL the text** from that file (Ctrl+A, then Ctrl+C)

3. **Paste it** into the SQL Editor in Supabase (Ctrl+V)

### Step 4: Run the SQL

1. Look at the bottom right of the SQL Editor
2. You'll see a button that says **"Run"** or **"Execute"**
3. Click it (or press `Ctrl+Enter`)

### Step 5: Check Results

- If successful: You'll see a green success message like "Success. No rows returned"
- If there's an error: You'll see a red error message explaining what went wrong

## Visual Guide

```
Supabase Dashboard
├── SQL Editor ← Click here!
│   ├── New Query button
│   ├── Text editor (paste SQL here)
│   └── Run button (bottom right)
```

## Example: Running the RLS Fix Migration

Here's exactly what to do:

1. **Open the file**: `supabase/migrations/20250104000002_fix_daily_scans_rls.sql`

2. **Copy this code**:
```sql
-- Fix RLS policy for daily_scans to allow upsert operations
DROP POLICY IF EXISTS "Users can insert own scans" ON public.daily_scans;

CREATE POLICY "Users can insert own scans" ON public.daily_scans 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

3. **Go to Supabase**: https://supabase.com/dashboard/project/ehujrrodtrmpftsqktlf/sql/new

4. **Paste the code** into the editor

5. **Click "Run"** (or press Ctrl+Enter)

6. **You should see**: "Success. No rows returned" ✅

## What Each Migration Does

### Migration 1: `20251104023635_cbb5ed00-51a3-440b-a515-9294ef0cb089.sql`
- Creates all the main tables (keywords, sources, matches, profiles, subscriptions)
- Sets up Row Level Security (RLS) policies
- Creates indexes for faster queries

### Migration 2: `20250104000000_add_scan_tracking.sql`
- Creates the `daily_scans` table
- Tracks how many scans free tier users have done
- Creates a function to calculate remaining scans

### Migration 3: `20250104000002_fix_daily_scans_rls.sql` (NEW)
- Fixes the RLS policy to allow upsert operations
- Fixes the 403 error you were seeing

## Quick Checklist

- [ ] Go to Supabase Dashboard
- [ ] Click "SQL Editor" in left sidebar
- [ ] Click "New query"
- [ ] Copy SQL code from migration file
- [ ] Paste into editor
- [ ] Click "Run" button
- [ ] See success message
- [ ] Done! ✅

## Troubleshooting

### "Permission denied" error?
- Make sure you're logged into the correct Supabase account
- Make sure you're in the right project

### "Table already exists" error?
- That's okay! The migration uses `IF NOT EXISTS` so it won't break
- You can still run it safely

### "Policy already exists" error?
- The migration uses `DROP POLICY IF EXISTS` so it's safe to run again
- It will replace the old policy with the new one

## Need Help?

If you get stuck:
1. Take a screenshot of the error message
2. Check which migration file you're trying to run
3. Make sure you copied ALL the code from the file

Running SQL is just like running any other code - you're telling the database what to do!



