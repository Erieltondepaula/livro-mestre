
CREATE TABLE public.user_sermon_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_sermon_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompt"
ON public.user_sermon_prompts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompt"
ON public.user_sermon_prompts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompt"
ON public.user_sermon_prompts FOR UPDATE
USING (auth.uid() = user_id);
