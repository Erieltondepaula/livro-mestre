-- Tabela de Livros
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  total_pages INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'Físico',
  category TEXT,
  paid_value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Leituras Diárias
CREATE TABLE public.readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  day INTEGER NOT NULL,
  month TEXT NOT NULL,
  start_page INTEGER NOT NULL DEFAULT 0,
  end_page INTEGER NOT NULL DEFAULT 0,
  time_spent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Status
CREATE TABLE public.statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Não iniciado',
  pages_read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Avaliações
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL UNIQUE,
  creativity INTEGER CHECK (creativity >= 0 AND creativity <= 10),
  writing INTEGER CHECK (writing >= 0 AND writing <= 10),
  learnings INTEGER CHECK (learnings >= 0 AND learnings <= 10),
  pleasure INTEGER CHECK (pleasure >= 0 AND pleasure <= 10),
  impact INTEGER CHECK (impact >= 0 AND impact <= 10),
  final_grade DECIMAL(3,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Citações
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  quote TEXT NOT NULL,
  page INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS (com políticas públicas)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para todas as operações
CREATE POLICY "Allow all on books" ON public.books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on readings" ON public.readings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on statuses" ON public.statuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on evaluations" ON public.evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quotes" ON public.quotes FOR ALL USING (true) WITH CHECK (true);