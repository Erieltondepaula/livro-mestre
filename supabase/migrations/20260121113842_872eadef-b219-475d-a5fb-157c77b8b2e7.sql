-- Create storage bucket for book covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to book covers
CREATE POLICY "Public read access for book covers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'book-covers');

-- Allow public upload to book covers
CREATE POLICY "Public upload access for book covers"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'book-covers');

-- Allow public update to book covers
CREATE POLICY "Public update access for book covers"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'book-covers');

-- Allow public delete for book covers
CREATE POLICY "Public delete access for book covers"
ON storage.objects
FOR DELETE
USING (bucket_id = 'book-covers');

-- Add cover_url column to books table
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS cover_url TEXT;