
-- Table for storing analyzed outlines (learning system)
CREATE TABLE public.copilot_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tema TEXT,
  titulo TEXT,
  texto_base TEXT,
  introducao TEXT,
  estrutura JSONB DEFAULT '{}',
  aplicacao TEXT,
  conclusao TEXT,
  content_full TEXT,
  outline_id UUID REFERENCES public.exegesis_outlines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for storing user patterns (learning system)
CREATE TABLE public.copilot_user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  padrao_introducao TEXT,
  padrao_titulo TEXT,
  padrao_transicao TEXT,
  padrao_aplicacao TEXT,
  padrao_progressao TEXT,
  palavras_frequentes JSONB DEFAULT '[]',
  expressoes_frequentes JSONB DEFAULT '[]',
  estilo_escrita TEXT,
  copilot_level INTEGER NOT NULL DEFAULT 1,
  total_outlines_analyzed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.copilot_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_user_patterns ENABLE ROW LEVEL SECURITY;

-- Policies for copilot_outlines
CREATE POLICY "Users can view own copilot outlines" ON public.copilot_outlines FOR SELECT TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can insert own copilot outlines" ON public.copilot_outlines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can update own copilot outlines" ON public.copilot_outlines FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid())) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own copilot outlines" ON public.copilot_outlines FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- Policies for copilot_user_patterns
CREATE POLICY "Users can view own patterns" ON public.copilot_user_patterns FOR SELECT TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can insert own patterns" ON public.copilot_user_patterns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));
CREATE POLICY "Users can update own patterns" ON public.copilot_user_patterns FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid())) WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_copilot_user_patterns_updated_at BEFORE UPDATE ON public.copilot_user_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
