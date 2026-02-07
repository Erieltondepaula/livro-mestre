-- =============================================
-- MIGRAÇÃO v2.0 - Campo de Data Prevista de Conclusão
-- Data: 2026-02-07
-- =============================================
-- Esta migração adiciona um campo opcional para definir
-- a data prevista de conclusão de um livro manualmente.
-- Útil para planos de leitura devocionais ou metas pessoais.
-- =============================================

-- Adicionar coluna para data prevista de conclusão manual
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS target_completion_date DATE;

-- Comentário para documentação
COMMENT ON COLUMN public.books.target_completion_date IS 'Data prevista de conclusão definida manualmente pelo usuário (opcional)';

-- =============================================
-- EXEMPLO DE USO:
-- Para definir a data de conclusão da Bíblia para 31/12/2026:
-- UPDATE public.books 
-- SET target_completion_date = '2026-12-31'
-- WHERE name = 'BÍBLIA MCCHEYNE​';
-- =============================================
