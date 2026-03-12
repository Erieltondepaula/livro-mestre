
CREATE TABLE public.outline_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outline_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.outline_templates
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own templates" ON public.outline_templates
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own templates" ON public.outline_templates
  FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.outline_templates
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));
