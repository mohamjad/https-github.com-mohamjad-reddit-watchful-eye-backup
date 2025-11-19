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
CREATE POLICY "Users can view own scans" ON public.daily_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scans" ON public.daily_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_scans_user_date ON public.daily_scans(user_id, scan_date DESC);

-- Create function to get remaining scans for a user
CREATE OR REPLACE FUNCTION public.get_remaining_scans(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  scans_today integer;
  max_scans integer;
BEGIN
  -- Get user's plan
  SELECT plan INTO user_plan
  FROM public.subscriptions
  WHERE user_id = user_uuid;
  
  -- If no plan, default to free
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Free tier: 2 scans per day
  IF user_plan = 'free' THEN
    max_scans := 2;
    
    -- Count scans today (in EST timezone)
    SELECT COUNT(*) INTO scans_today
    FROM public.daily_scans
    WHERE user_id = user_uuid
      AND scan_date = CURRENT_DATE AT TIME ZONE 'America/New_York';
    
    RETURN GREATEST(0, max_scans - scans_today);
  ELSE
    -- Paid tiers: unlimited scans
    RETURN 999;
  END IF;
END;
$$;




