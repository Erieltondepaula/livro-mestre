-- Add Bible reference fields to quotes table for theological references
ALTER TABLE public.quotes
ADD COLUMN bible_book text,
ADD COLUMN bible_chapter integer,
ADD COLUMN bible_verse integer;