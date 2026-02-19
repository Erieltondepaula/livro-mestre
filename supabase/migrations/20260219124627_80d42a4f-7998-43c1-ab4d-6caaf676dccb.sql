
-- Create exegesis_analyses table
CREATE TABLE public.exegesis_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  passage TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  question TEXT,
  content TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exegesis_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses" ON public.exegesis_analyses FOR SELECT USING (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can insert own analyses" ON public.exegesis_analyses FOR INSERT WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can update own analyses" ON public.exegesis_analyses FOR UPDATE USING (auth.uid() = user_id AND is_user_active(auth.uid())) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON public.exegesis_analyses FOR DELETE USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE TRIGGER update_exegesis_analyses_updated_at BEFORE UPDATE ON public.exegesis_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create exegesis_outlines table
CREATE TABLE public.exegesis_outlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  passage TEXT NOT NULL,
  outline_type TEXT NOT NULL DEFAULT 'expositivo',
  content TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exegesis_outlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outlines" ON public.exegesis_outlines FOR SELECT USING (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can insert own outlines" ON public.exegesis_outlines FOR INSERT WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can update own outlines" ON public.exegesis_outlines FOR UPDATE USING (auth.uid() = user_id AND is_user_active(auth.uid())) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own outlines" ON public.exegesis_outlines FOR DELETE USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE TRIGGER update_exegesis_outlines_updated_at BEFORE UPDATE ON public.exegesis_outlines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create exegesis_materials table
CREATE TABLE public.exegesis_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  material_type TEXT NOT NULL DEFAULT 'pdf',
  url TEXT,
  file_path TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exegesis_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own materials" ON public.exegesis_materials FOR SELECT USING (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can insert own materials" ON public.exegesis_materials FOR INSERT WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can update own materials" ON public.exegesis_materials FOR UPDATE USING (auth.uid() = user_id AND is_user_active(auth.uid())) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own materials" ON public.exegesis_materials FOR DELETE USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- Create storage bucket for exegesis materials
INSERT INTO storage.buckets (id, name, public) VALUES ('exegesis-materials', 'exegesis-materials', false);

CREATE POLICY "Users can upload own exegesis materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exegesis-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own exegesis materials" ON storage.objects FOR SELECT USING (bucket_id = 'exegesis-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own exegesis materials" ON storage.objects FOR DELETE USING (bucket_id = 'exegesis-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
