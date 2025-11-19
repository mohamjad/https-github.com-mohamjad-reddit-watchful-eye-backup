-- Add search_type column to keywords table
-- Options: 'posts', 'comments', 'both'
-- Default to 'posts' for backward compatibility

ALTER TABLE public.keywords
ADD COLUMN IF NOT EXISTS search_type text CHECK (search_type IN ('posts', 'comments', 'both')) DEFAULT 'posts';

-- Update existing keywords to have 'posts' as default
UPDATE public.keywords
SET search_type = 'posts'
WHERE search_type IS NULL;





