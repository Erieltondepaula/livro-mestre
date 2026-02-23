
-- Phase 4: Add metadata columns to exegesis_materials
ALTER TABLE public.exegesis_materials
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS sub_themes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS keywords jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bible_references jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS content_origin text DEFAULT 'texto';

-- Phase 6: Create outline versions table
CREATE TABLE public.exegesis_outline_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outline_id uuid NOT NULL REFERENCES public.exegesis_outlines(id) ON DELETE CASCADE,
  content text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE public.exegesis_outline_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outline versions"
  ON public.exegesis_outline_versions
  FOR SELECT
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own outline versions"
  ON public.exegesis_outline_versions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can delete own outline versions"
  ON public.exegesis_outline_versions
  FOR DELETE
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- Index for fast version lookups
CREATE INDEX idx_outline_versions_outline_id ON public.exegesis_outline_versions(outline_id, version_number DESC);
