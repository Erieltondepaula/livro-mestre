
CREATE TABLE public.user_outline_structures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_outline_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own structure" ON public.user_outline_structures FOR SELECT USING (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can insert own structure" ON public.user_outline_structures FOR INSERT WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can update own structure" ON public.user_outline_structures FOR UPDATE USING (auth.uid() = user_id AND is_user_active(auth.uid())) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_outline_structures_updated_at
  BEFORE UPDATE ON public.user_outline_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
