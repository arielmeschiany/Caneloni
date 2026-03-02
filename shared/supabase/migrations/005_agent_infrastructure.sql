-- Add agent_capable flag to locations
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS agent_capable boolean DEFAULT false;

-- Agent sessions table
CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('reserve_table','book_hotel','buy_ticket')),
  status text NOT NULL DEFAULT 'initiated',
  conversation_history jsonb DEFAULT '[]'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions"
  ON public.agent_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own sessions"
  ON public.agent_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
