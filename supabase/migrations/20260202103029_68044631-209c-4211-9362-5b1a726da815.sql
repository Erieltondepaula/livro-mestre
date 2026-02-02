-- Tabela de notas inspirada no sistema Zettelkasten
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para vincular notas a múltiplos livros (referências cruzadas)
CREATE TABLE public.note_book_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(note_id, book_id)
);

-- Índices para melhor performance
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_book_id ON public.notes(book_id);
CREATE INDEX idx_notes_tags ON public.notes USING GIN(tags);
CREATE INDEX idx_note_book_links_note_id ON public.note_book_links(note_id);
CREATE INDEX idx_note_book_links_book_id ON public.note_book_links(book_id);

-- Habilitar RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_book_links ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notes
CREATE POLICY "Users can view own notes"
ON public.notes FOR SELECT
USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own notes"
ON public.notes FOR INSERT
WITH CHECK ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own notes"
ON public.notes FOR UPDATE
USING ((auth.uid() = user_id) AND is_user_active(auth.uid()))
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
ON public.notes FOR DELETE
USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

-- Políticas RLS para note_book_links
CREATE POLICY "Users can view own note links"
ON public.note_book_links FOR SELECT
USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own note links"
ON public.note_book_links FOR INSERT
WITH CHECK ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can delete own note links"
ON public.note_book_links FOR DELETE
USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();