
CREATE TABLE public.mind_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Mapa Mental',
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x":0,"y":0,"zoom":1}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mind maps" ON public.mind_maps
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own mind maps" ON public.mind_maps
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own mind maps" ON public.mind_maps
  FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mind maps" ON public.mind_maps
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));
