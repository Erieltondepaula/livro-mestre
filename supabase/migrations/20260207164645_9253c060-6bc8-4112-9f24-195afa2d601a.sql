-- Adicionar coluna para data prevista de conclusão manual
-- Esta coluna permite que o usuário defina uma data alvo para finalizar o livro
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS target_completion_date DATE;

-- Comentário para documentação
COMMENT ON COLUMN public.books.target_completion_date IS 'Data prevista de conclusão definida manualmente pelo usuário (opcional)';