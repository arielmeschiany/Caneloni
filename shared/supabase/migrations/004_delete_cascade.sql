-- Reviews cascade when location deleted
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_location_id_fkey,
  ADD CONSTRAINT reviews_location_id_fkey
    FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;
