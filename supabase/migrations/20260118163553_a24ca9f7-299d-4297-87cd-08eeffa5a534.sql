-- Tabela de Tipos de Livro
CREATE TABLE public.book_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Categorias
CREATE TABLE public.book_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS com políticas públicas
ALTER TABLE public.book_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on book_types" ON public.book_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on book_categories" ON public.book_categories FOR ALL USING (true) WITH CHECK (true);

-- Inserir tipos padrão
INSERT INTO public.book_types (name) VALUES ('Livro'), ('Ebook');

-- Inserir categorias padrão
INSERT INTO public.book_categories (name) VALUES 
  ('Espiritualidade ou Religioso'),
  ('Ficção'),
  ('Não-Ficção'),
  ('Biografia'),
  ('Autoajuda'),
  ('Negócios'),
  ('Ciência'),
  ('História'),
  ('Romance'),
  ('Fantasia'),
  ('Outro');