-- =============================================================
-- ENHANCED NOTES SYSTEM - Zettelkasten / Obsidian-style
-- =============================================================

-- 1. Create note_folders table for hierarchical organization
CREATE TABLE public.note_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.note_folders(id) ON DELETE CASCADE,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create note_links table for bidirectional linking between notes
CREATE TABLE public.note_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  link_text TEXT, -- The display text used for the link
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_note_id, target_note_id)
);

-- 3. Create external_book_references for books not yet in the system
CREATE TABLE public.external_book_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT,
  book_year INTEGER,
  page_reference TEXT,
  converted_book_id UUID REFERENCES public.books(id) ON DELETE SET NULL, -- When converted to real book
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Add new columns to notes table
ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.note_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'permanent' CHECK (note_type IN ('fleeting', 'permanent', 'literature', 'reference')),
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_html TEXT,
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 5. Enable RLS on new tables
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_book_references ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for note_folders
CREATE POLICY "Users can view own folders" ON public.note_folders
  FOR SELECT USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own folders" ON public.note_folders
  FOR INSERT WITH CHECK ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own folders" ON public.note_folders
  FOR UPDATE USING ((auth.uid() = user_id) AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON public.note_folders
  FOR DELETE USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

-- 7. RLS Policies for note_links
CREATE POLICY "Users can view own note links" ON public.note_links
  FOR SELECT USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own note links" ON public.note_links
  FOR INSERT WITH CHECK ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can delete own note links" ON public.note_links
  FOR DELETE USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

-- 8. RLS Policies for external_book_references
CREATE POLICY "Users can view own external refs" ON public.external_book_references
  FOR SELECT USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own external refs" ON public.external_book_references
  FOR INSERT WITH CHECK ((auth.uid() = user_id) AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own external refs" ON public.external_book_references
  FOR UPDATE USING ((auth.uid() = user_id) AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own external refs" ON public.external_book_references
  FOR DELETE USING ((auth.uid() = user_id) AND is_user_active(auth.uid()));

-- 9. Create indexes for performance
CREATE INDEX idx_notes_folder_id ON public.notes(folder_id);
CREATE INDEX idx_notes_note_type ON public.notes(note_type);
CREATE INDEX idx_notes_is_pinned ON public.notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_notes_archived ON public.notes(archived) WHERE archived = true;
CREATE INDEX idx_notes_content_search ON public.notes USING gin(to_tsvector('portuguese', title || ' ' || content));
CREATE INDEX idx_note_folders_parent ON public.note_folders(parent_id);
CREATE INDEX idx_note_folders_user ON public.note_folders(user_id);
CREATE INDEX idx_note_links_source ON public.note_links(source_note_id);
CREATE INDEX idx_note_links_target ON public.note_links(target_note_id);
CREATE INDEX idx_external_refs_note ON public.external_book_references(note_id);
CREATE INDEX idx_external_refs_converted ON public.external_book_references(converted_book_id) WHERE converted_book_id IS NOT NULL;

-- 10. Trigger for updated_at on note_folders
CREATE TRIGGER update_note_folders_updated_at
  BEFORE UPDATE ON public.note_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Function to get backlinks for a note
CREATE OR REPLACE FUNCTION public.get_note_backlinks(target_note_id UUID)
RETURNS TABLE(
  source_id UUID,
  source_title TEXT,
  link_text TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    nl.source_note_id,
    n.title,
    nl.link_text,
    nl.created_at
  FROM public.note_links nl
  JOIN public.notes n ON n.id = nl.source_note_id
  WHERE nl.target_note_id = $1
    AND nl.user_id = auth.uid()
  ORDER BY nl.created_at DESC;
$$;