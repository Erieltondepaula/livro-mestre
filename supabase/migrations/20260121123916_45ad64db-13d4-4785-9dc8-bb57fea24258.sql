-- Adicionar colunas de data início e data fim na tabela readings
ALTER TABLE public.readings 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- Adicionar coluna de observações na tabela evaluations
ALTER TABLE public.evaluations
ADD COLUMN IF NOT EXISTS observations text;

-- Comentários explicativos
COMMENT ON COLUMN public.readings.start_date IS 'Data de início do período de leitura (para leituras retroativas)';
COMMENT ON COLUMN public.readings.end_date IS 'Data de fim do período de leitura (para leituras retroativas)';
COMMENT ON COLUMN public.evaluations.observations IS 'Observações e notas adicionais sobre o livro';