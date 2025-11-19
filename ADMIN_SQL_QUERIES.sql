-- ============================================
-- Admin Dashboard SQL Queries
-- Run these in Supabase SQL Editor
-- ============================================

-- ============================================
-- Query 1: Active Users Summary
-- ============================================
-- This query shows total users, active users, and plan distribution
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

-- ============================================
-- Query 2: Detailed Active Users List
-- ============================================
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
  email,
  plan,
  days_scanned,
  last_scan,
  keyword_count,
  source_count,
  total_matches,
  CASE 
    WHEN last_scan >= NOW() - INTERVAL '1 day' THEN 'Active Today'
    WHEN last_scan >= NOW() - INTERVAL '7 days' THEN 'Active This Week'
    WHEN last_scan >= NOW() - INTERVAL '30 days' THEN 'Active This Month'
    ELSE 'Inactive'
  END as activity_status
FROM user_stats
ORDER BY last_scan DESC NULLS LAST
LIMIT 50;

-- ============================================
-- Query 3: Simple Active Users Count (No CTE)
-- ============================================
-- If the CTE queries don't work, use this simpler version:
SELECT 
  COUNT(DISTINCT user_id) as active_users_7d
FROM daily_scans
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ============================================
-- Query 4: Total Users Count
-- ============================================
SELECT COUNT(*) as total_users FROM profiles;

-- ============================================
-- Query 5: Users by Plan
-- ============================================
SELECT 
  plan, 
  COUNT(*) as count
FROM subscriptions
WHERE status = 'active'
GROUP BY plan;

-- ============================================
-- Query 6: New Users Today
-- ============================================
SELECT COUNT(*) as new_users_today
FROM profiles
WHERE created_at >= CURRENT_DATE;

-- ============================================
-- Query 7: New Users This Week
-- ============================================
SELECT COUNT(*) as new_users_7d
FROM profiles
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ============================================
-- Query 8: Active Users (Last 7 Days)
-- ============================================
SELECT COUNT(DISTINCT user_id) as active_users_7d
FROM daily_scans
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ============================================
-- Query 9: Active Users (Last 30 Days)
-- ============================================
SELECT COUNT(DISTINCT user_id) as active_users_30d
FROM daily_scans
WHERE created_at >= NOW() - INTERVAL '30 days';

-- ============================================
-- Query 10: Daily Signups (Last 30 Days)
-- ============================================
SELECT 
  DATE(created_at) as date,
  COUNT(*) as signups
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;

-- ============================================
-- Query 11: Scan Activity (Last 30 Days)
-- ============================================
SELECT 
  DATE(created_at) as date,
  COUNT(*) as scans
FROM daily_scans
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;

-- ============================================
-- Query 12: Match Activity (Last 30 Days)
-- ============================================
SELECT 
  DATE(inserted_at) as date,
  COUNT(*) as matches
FROM matches
WHERE inserted_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(inserted_at)
ORDER BY date ASC;

-- ============================================
-- Query 13: Top 10 Most Active Users
-- ============================================
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












