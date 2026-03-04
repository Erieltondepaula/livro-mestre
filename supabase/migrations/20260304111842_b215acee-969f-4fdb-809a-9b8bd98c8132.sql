
-- 1. Add tags column to quotes table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Create flashcard_reviews table for spaced repetition
CREATE TABLE public.flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vocabulary_id uuid NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
  ease_factor numeric NOT NULL DEFAULT 2.5,
  interval_days integer NOT NULL DEFAULT 1,
  repetitions integer NOT NULL DEFAULT 0,
  next_review_date date NOT NULL DEFAULT CURRENT_DATE,
  last_review_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, vocabulary_id)
);

ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flashcard reviews" ON public.flashcard_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own flashcard reviews" ON public.flashcard_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own flashcard reviews" ON public.flashcard_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcard reviews" ON public.flashcard_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- 3. Create reading_goals table for gamification
CREATE TABLE public.reading_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  daily_page_goal integer NOT NULL DEFAULT 20,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_reading_date date,
  total_badges jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.reading_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own goals" ON public.reading_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own goals" ON public.reading_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

-- 4. Create audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_log
  FOR SELECT TO authenticated USING (is_master_user(auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_flashcard_reviews_next_review ON public.flashcard_reviews(user_id, next_review_date);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_quotes_tags ON public.quotes USING GIN(tags);
