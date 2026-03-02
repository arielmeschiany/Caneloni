-- ============================================================
-- 010: Add 'shopping' category
-- ============================================================

-- Drop the old check constraint and recreate with 'shopping' included.
-- The constraint name may vary — drop both common names to be safe.
ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_category_check;
ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_category_fkey;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_category_check
  CHECK (category IN (
    'pizzeria', 'classic_italian', 'beef_meat', 'seafood', 'vineyards',
    'hotels', 'sightseeing', 'views_panoramas', 'beaches', 'walking_trails',
    'mountains', 'home_residential', 'museums_galleries', 'local_markets',
    'pharmacy', 'taxi_station', 'train_station', 'shopping'
  ));
