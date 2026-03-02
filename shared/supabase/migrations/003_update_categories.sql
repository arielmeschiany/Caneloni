-- Migrate old category values to new 17-category system
-- Run this AFTER deploying the new code.
--
-- Old → New mapping:
--   restaurant → classic_italian   (closest food match)
--   market     → local_markets
--   street     → sightseeing       (generic fallback)
--   store      → sightseeing       (generic fallback)
--   boutique   → sightseeing       (generic fallback)

UPDATE public.locations SET category = 'classic_italian' WHERE category = 'restaurant';
UPDATE public.locations SET category = 'local_markets'   WHERE category = 'market';
UPDATE public.locations SET category = 'sightseeing'     WHERE category IN ('street', 'store', 'boutique');
