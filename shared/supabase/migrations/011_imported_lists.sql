-- ============================================================
-- 011: Imported Lists
-- ============================================================

-- 1. Create imported_lists table
CREATE TABLE IF NOT EXISTS public.imported_lists (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  url          text,
  imported_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name   text,
  location_count integer   NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.imported_lists ENABLE ROW LEVEL SECURITY;

-- Everyone can view lists
CREATE POLICY "Public read imported_lists"
  ON public.imported_lists FOR SELECT USING (true);

-- Authenticated users can insert their own lists
CREATE POLICY "Auth users create imported_lists"
  ON public.imported_lists FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = imported_by);

-- Owners can delete their own lists (admin deletes go via service role)
CREATE POLICY "Owners delete imported_lists"
  ON public.imported_lists FOR DELETE TO authenticated
  USING (auth.uid() = imported_by);

-- 2. Add imported_list_id column to locations
--    ON DELETE CASCADE: deleting a list deletes all its locations (reviews cascade via 004)
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS imported_list_id uuid
    REFERENCES public.imported_lists(id) ON DELETE CASCADE;

-- 3. Recreate locations_with_stats to include imported_list fields
CREATE OR REPLACE VIEW public.locations_with_stats AS
SELECT
  l.*,
  il.name            AS imported_list_name,
  AVG(r.rating)      AS avg_rating,
  COUNT(r.id)::integer AS review_count
FROM public.locations l
LEFT JOIN public.reviews       r  ON r.location_id  = l.id
LEFT JOIN public.imported_lists il ON il.id          = l.imported_list_id
GROUP BY l.id, il.name;
