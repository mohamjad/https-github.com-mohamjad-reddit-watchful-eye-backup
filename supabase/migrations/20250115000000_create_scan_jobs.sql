-- Create scan_jobs table for async scan processing
CREATE TABLE IF NOT EXISTS scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  results JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_scan_jobs_user_id ON scan_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_started_at ON scan_jobs(started_at DESC);

-- RLS policies
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (idempotent migration)
DROP POLICY IF EXISTS "Users can view their own scan jobs" ON scan_jobs;
DROP POLICY IF EXISTS "Users can create their own scan jobs" ON scan_jobs;
DROP POLICY IF EXISTS "Users can update their own scan jobs" ON scan_jobs;

-- Create policies
CREATE POLICY "Users can view their own scan jobs"
  ON scan_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scan jobs"
  ON scan_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan jobs"
  ON scan_jobs FOR UPDATE
  USING (auth.uid() = user_id);





