-- Add TikTok platform support to matches and sources tables

-- Drop existing CHECK constraint on matches.platform
ALTER TABLE public.matches
DROP CONSTRAINT IF EXISTS matches_platform_check;

-- Add new CHECK constraint including 'tiktok'
ALTER TABLE public.matches
ADD CONSTRAINT matches_platform_check 
CHECK (platform IN ('reddit', 'twitter', 'tiktok'));

-- Drop existing CHECK constraint on sources.platform
ALTER TABLE public.sources
DROP CONSTRAINT IF EXISTS sources_platform_check;

-- Add new CHECK constraint including 'tiktok'
ALTER TABLE public.sources
ADD CONSTRAINT sources_platform_check 
CHECK (platform IN ('reddit', 'twitter', 'tiktok'));


