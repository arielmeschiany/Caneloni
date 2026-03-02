-- ============================================================
-- 009: Complete reviews fix — schema + RLS (idempotent)
-- Run this even if you ran 007 previously; all commands are safe to re-run.
-- ============================================================

-- 1. Schema: make user_id nullable (for guest reviews)
DO $$ BEGIN
  ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL; -- already nullable
END $$;

-- 2. Add guest_name column (idempotent)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS guest_name text;

-- 3. Drop the old table-level unique constraint (NULL != NULL so it doesn't work for guests)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_location_id_user_id_key;

-- 4. Partial unique index: one review per authenticated user per location
--    NULL user_id rows (guests) are excluded from uniqueness enforcement
CREATE UNIQUE INDEX IF NOT EXISTS reviews_location_user_unique
  ON public.reviews(location_id, user_id)
  WHERE user_id IS NOT NULL;

-- 5. Drop ALL existing review policies and recreate cleanly
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;

-- SELECT: everyone (anon + authenticated)
CREATE POLICY "Reviews viewable by everyone"
  ON public.reviews FOR SELECT USING (true);

-- INSERT: authenticated users (user_id = their id) OR guests (user_id IS NULL + guest_name set)
CREATE POLICY "Anyone can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL AND guest_name IS NOT NULL)
  );

-- UPDATE: only the review author
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: only the review author
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Make sure locations SELECT policy allows anon (recreate for safety)
DROP POLICY IF EXISTS "Locations viewable by everyone" ON public.locations;
CREATE POLICY "Locations viewable by everyone"
  ON public.locations FOR SELECT USING (true);
