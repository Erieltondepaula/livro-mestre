-- Add Bible-specific columns to readings table
ALTER TABLE public.readings
ADD COLUMN bible_book text,
ADD COLUMN bible_chapter integer,
ADD COLUMN bible_verse_start integer,
ADD COLUMN bible_verse_end integer;