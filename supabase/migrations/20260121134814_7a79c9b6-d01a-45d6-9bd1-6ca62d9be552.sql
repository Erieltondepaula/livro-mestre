-- Add book_id column to vocabulary table to link words to books
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS book_id uuid REFERENCES public.books(id) ON DELETE SET NULL;

-- Add source_type column to track where the word came from
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'outro';

-- Add source_details column for additional source info (author, page, etc.)
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS source_details jsonb DEFAULT '{}'::jsonb;

-- Create index for book_id
CREATE INDEX IF NOT EXISTS idx_vocabulary_book_id ON public.vocabulary(book_id);