-- Add author and year columns to books table
ALTER TABLE public.books
ADD COLUMN author text,
ADD COLUMN year integer;