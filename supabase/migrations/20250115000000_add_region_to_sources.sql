-- Add region field to sources table to support language/region filtering for Twitter
ALTER TABLE public.sources
ADD COLUMN IF NOT EXISTS region text;

-- Add index for region queries
CREATE INDEX IF NOT EXISTS idx_sources_region ON public.sources(region);

