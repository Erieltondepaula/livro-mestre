CREATE TABLE public.user_sermon_type_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sermon_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  is_customized BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, sermon_type)
);

ALTER TABLE public.user_sermon_type_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sermon type prompts"
  ON public.user_sermon_type_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sermon type prompts"
  ON public.user_sermon_type_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sermon type prompts"
  ON public.user_sermon_type_prompts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sermon type prompts"
  ON public.user_sermon_type_prompts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_sermon_type_prompts_updated_at
  BEFORE UPDATE ON public.user_sermon_type_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_sermon_type_prompts_user_type
  ON public.user_sermon_type_prompts (user_id, sermon_type);