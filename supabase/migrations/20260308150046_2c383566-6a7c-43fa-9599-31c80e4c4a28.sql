
-- Table to track diagnostic prompt history (resolved/dismissed/applied)
CREATE TABLE public.diagnostic_prompt_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt_key text NOT NULL,
  prompt_title text NOT NULL,
  prompt_text text,
  status text NOT NULL DEFAULT 'suggested',
  module text NOT NULL,
  applied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, prompt_key)
);

ALTER TABLE public.diagnostic_prompt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnostic history"
  ON public.diagnostic_prompt_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own diagnostic history"
  ON public.diagnostic_prompt_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own diagnostic history"
  ON public.diagnostic_prompt_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diagnostic history"
  ON public.diagnostic_prompt_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));
