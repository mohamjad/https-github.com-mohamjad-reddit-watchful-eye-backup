-- Create a function to call the scheduled scan Edge Function
-- This will be called by pg_cron or an external cron service

-- Note: To set up scheduled scans, you can:
-- 1. Use Supabase's pg_cron extension (if enabled)
-- 2. Use an external cron service (like cron-job.org) to call the Edge Function endpoint
-- 3. Use GitHub Actions scheduled workflows
-- 4. Use a cloud function scheduler (AWS EventBridge, Google Cloud Scheduler, etc.)

-- Example pg_cron setup (requires pg_cron extension to be enabled):
-- SELECT cron.schedule('scan-reddit-hourly', '0 * * * *', $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-scan',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := jsonb_build_object('cron_secret', 'YOUR_CRON_SECRET')
--   ) AS request_id;
-- $$);




