
CREATE TABLE public.user_thematic_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'personalizado',
  title TEXT NOT NULL,
  description TEXT,
  key_verses TEXT[] DEFAULT '{}',
  subtopics TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_thematic_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topics" ON public.user_thematic_topics FOR SELECT TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can insert own topics" ON public.user_thematic_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can update own topics" ON public.user_thematic_topics FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid())) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.user_thematic_topics FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()));
