CREATE TABLE public.book_reading_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  book_name text NOT NULL,
  cycle_number integer NOT NULL DEFAULT 1,
  total_pages integer NOT NULL DEFAULT 0,
  pages_read integer NOT NULL DEFAULT 0,
  readings_count integer NOT NULL DEFAULT 0,
  total_minutes numeric NOT NULL DEFAULT 0,
  first_reading_at date,
  last_reading_at date,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_weekday smallint NOT NULL DEFAULT EXTRACT(DOW FROM now()),
  snapshot jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reading_cycles TO authenticated;
GRANT ALL ON public.book_reading_cycles TO service_role;

ALTER TABLE public.book_reading_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own book reading cycles"
ON public.book_reading_cycles FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_book_reading_cycles_book ON public.book_reading_cycles(user_id, book_id, cycle_number);