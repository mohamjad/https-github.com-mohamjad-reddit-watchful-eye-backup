-- Add automatic scan settings to subscriptions table
-- This allows paid users to enable automatic scans at configured intervals

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS auto_scan_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS scan_interval_minutes integer DEFAULT 30 CHECK (scan_interval_minutes >= 15);

-- Add constraint to prevent free tier users from enabling auto-scans
-- Free users should not have auto_scan_enabled = true
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS check_free_tier_no_auto_scan;

ALTER TABLE public.subscriptions
ADD CONSTRAINT check_free_tier_no_auto_scan 
CHECK (
  (plan = 'free' AND auto_scan_enabled = false) OR 
  (plan = 'pro')
);

-- Update comment: Free tier users should not have auto_scan_enabled = true
-- Only pro users can enable automatic scans
-- Minimum interval is 15 minutes to prevent abuse

-- Create index for efficient querying of users with auto-scans enabled
CREATE INDEX IF NOT EXISTS idx_subscriptions_auto_scan ON public.subscriptions(auto_scan_enabled, plan) 
WHERE auto_scan_enabled = true AND plan = 'pro';

-- Add a function to check if a user should be scanned based on their last scan time and interval
CREATE OR REPLACE FUNCTION public.should_scan_user(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_subscription RECORD;
  last_scan_time timestamptz;
  minutes_since_last_scan integer;
BEGIN
  -- Get user's subscription with auto-scan settings
  SELECT plan, auto_scan_enabled, scan_interval_minutes
  INTO user_subscription
  FROM public.subscriptions
  WHERE user_id = user_uuid;
  
  -- If no subscription or not enabled, don't scan
  IF user_subscription IS NULL OR user_subscription.auto_scan_enabled = false THEN
    RETURN false;
  END IF;
  
  -- Only pro plan users can have auto-scans
  IF user_subscription.plan != 'pro' THEN
    RETURN false;
  END IF;
  
  -- Get the most recent scan time from daily_scans
  SELECT MAX(created_at) INTO last_scan_time
  FROM public.daily_scans
  WHERE user_id = user_uuid;
  
  -- If no previous scan, allow scanning
  IF last_scan_time IS NULL THEN
    RETURN true;
  END IF;
  
  -- Calculate minutes since last scan
  minutes_since_last_scan := EXTRACT(EPOCH FROM (NOW() - last_scan_time)) / 60;
  
  -- Only scan if enough time has passed based on interval
  RETURN minutes_since_last_scan >= user_subscription.scan_interval_minutes;
END;
$$;

