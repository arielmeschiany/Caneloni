-- Make user_id nullable to allow guest reviews
ALTER TABLE public.reviews ALTER COLUMN user_id DROP NOT NULL;

-- Add guest_name column for guest reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS guest_name text;

-- Drop the old unique constraint (covers all rows including NULLs, which don't work correctly)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_location_id_user_id_key;

-- Replace with a partial unique index so auth users can only review once per location,
-- but multiple guests can review the same location
CREATE UNIQUE INDEX IF NOT EXISTS reviews_location_user_unique
  ON public.reviews(location_id, user_id)
  WHERE user_id IS NOT NULL;

-- Update INSERT policy to allow both authenticated and guest inserts
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;

CREATE POLICY "Anyone can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL AND guest_name IS NOT NULL)
  );
