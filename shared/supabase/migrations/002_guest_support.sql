-- Add guest_name column to locations
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS guest_name text;

-- Allow anonymous (guest) inserts: drop old policy, create new one
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON public.locations;

CREATE POLICY "Authenticated or guest users can insert locations"
  ON public.locations FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = created_by)
    OR
    (auth.uid() IS NULL AND created_by IS NULL)
  );
