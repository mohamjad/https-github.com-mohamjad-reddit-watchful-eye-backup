-- Fix RLS policy for daily_scans to allow upsert operations
-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own scans" ON public.daily_scans;

-- Create new policy that allows both insert and update (for upsert)
CREATE POLICY "Users can insert own scans" ON public.daily_scans 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



