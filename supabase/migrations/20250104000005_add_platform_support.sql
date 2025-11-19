-- Add platform field to matches table to support multiple platforms (Reddit, Twitter, etc.)
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS platform text CHECK (platform IN ('reddit', 'twitter')) DEFAULT 'reddit';

-- Update existing matches to have 'reddit' platform
UPDATE public.matches
SET platform = 'reddit'
WHERE platform IS NULL;

-- Add platform field to sources table to support Twitter sources
ALTER TABLE public.sources
ADD COLUMN IF NOT EXISTS platform text CHECK (platform IN ('reddit', 'twitter')) DEFAULT 'reddit';

-- Update existing sources to have 'reddit' platform
UPDATE public.sources
SET platform = 'reddit'
WHERE platform IS NULL;

-- Add index for platform queries
CREATE INDEX IF NOT EXISTS idx_matches_platform ON public.matches(platform);
CREATE INDEX IF NOT EXISTS idx_sources_platform ON public.sources(platform);




