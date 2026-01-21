-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create vocabulary table to store searched words
CREATE TABLE public.vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  palavra TEXT NOT NULL,
  silabas TEXT,
  fonetica TEXT,
  classe TEXT,
  definicoes JSONB NOT NULL DEFAULT '[]',
  sinonimos JSONB DEFAULT '[]',
  antonimos JSONB DEFAULT '[]',
  exemplos JSONB DEFAULT '[]',
  etimologia TEXT,
  observacoes TEXT,
  analise_contexto JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (no auth in this app)
CREATE POLICY "Allow all on vocabulary" 
ON public.vocabulary 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create unique index on palavra to avoid duplicates
CREATE UNIQUE INDEX vocabulary_palavra_unique ON public.vocabulary (LOWER(palavra));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vocabulary_updated_at
BEFORE UPDATE ON public.vocabulary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();