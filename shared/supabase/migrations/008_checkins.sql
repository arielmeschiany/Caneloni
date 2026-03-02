-- Create check_ins table for "Been Here" feature
CREATE TABLE IF NOT EXISTS public.check_ins (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  uuid REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name   text,
  visited_at   timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT check_ins_user_or_guest CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL)
);

-- Prevent duplicate check-ins for authenticated users
CREATE UNIQUE INDEX IF NOT EXISTS check_ins_location_user_unique
  ON public.check_ins(location_id, user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Everyone can view check-ins (for count display)
CREATE POLICY "Anyone can view check_ins"
  ON public.check_ins FOR SELECT USING (true);

-- Authenticated users can insert their own check-ins
-- Guests (anon role) can insert guest check-ins
CREATE POLICY "Anyone can insert check_ins"
  ON public.check_ins FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL AND guest_name IS NOT NULL)
  );

-- Authenticated users can delete their own check-ins
CREATE POLICY "Users can delete own check_ins"
  ON public.check_ins FOR DELETE
  USING (auth.uid() = user_id);

-- Guests can delete their own check-ins (by guest_name, trust-client)
CREATE POLICY "Guests can delete own check_ins"
  ON public.check_ins FOR DELETE
  USING (auth.uid() IS NULL AND user_id IS NULL);
