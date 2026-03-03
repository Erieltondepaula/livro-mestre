-- Add tags column to exegesis_outlines for classification
ALTER TABLE public.exegesis_outlines 
ADD COLUMN tags text[] DEFAULT '{}'::text[];

-- Add index for tag search
CREATE INDEX idx_exegesis_outlines_tags ON public.exegesis_outlines USING GIN(tags);