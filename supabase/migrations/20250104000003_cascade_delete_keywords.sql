-- Change matches.keyword_id foreign key to CASCADE delete
-- When a keyword is deleted, all associated matches will also be deleted

-- First, drop the existing foreign key constraint
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_keyword_id_fkey;

-- Recreate the foreign key with CASCADE delete
ALTER TABLE public.matches
  ADD CONSTRAINT matches_keyword_id_fkey
  FOREIGN KEY (keyword_id)
  REFERENCES public.keywords(id)
  ON DELETE CASCADE;

-- Note: This will automatically delete all matches when their associated keyword is deleted





