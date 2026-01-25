-- =============================================
-- MIGRAÇÃO v1.7 - Vínculo Dinâmico de Palavras a Livros
-- Data: 25 Janeiro 2026
-- =============================================
-- 
-- DESCRIÇÃO:
-- Esta versão adiciona a funcionalidade de vincular/desvincular
-- palavras do vocabulário a livros após terem sido salvas.
--
-- ALTERAÇÕES NO BANCO:
-- ✅ Nenhuma alteração de schema necessária!
-- 
-- Os campos já existentes suportam esta funcionalidade:
-- - vocabulary.book_id: UUID nullable (já permite NULL)
-- - vocabulary.source_type: TEXT com default 'outro'
-- - vocabulary.source_details: JSONB para metadados
--
-- =============================================

-- VERIFICAÇÃO: Confirmar que os campos existem com os tipos corretos
-- Execute este SELECT para verificar:

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'vocabulary' 
  AND column_name IN ('book_id', 'source_type', 'source_details')
ORDER BY column_name;

-- Resultado esperado:
-- book_id       | uuid  | YES | NULL
-- source_type   | text  | YES | 'outro'::text
-- source_details| jsonb | YES | '{}'::jsonb

-- =============================================
-- SE POR ALGUM MOTIVO OS CAMPOS NÃO EXISTIREM,
-- EXECUTE O SCRIPT ABAIXO:
-- =============================================

-- Verificar e adicionar book_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vocabulary' AND column_name = 'book_id'
  ) THEN
    ALTER TABLE public.vocabulary ADD COLUMN book_id UUID;
    ALTER TABLE public.vocabulary 
      ADD CONSTRAINT vocabulary_book_id_fkey 
      FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Verificar e adicionar source_type se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vocabulary' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE public.vocabulary ADD COLUMN source_type TEXT DEFAULT 'outro';
  END IF;
END $$;

-- Verificar e adicionar source_details se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vocabulary' AND column_name = 'source_details'
  ) THEN
    ALTER TABLE public.vocabulary ADD COLUMN source_details JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- =============================================
-- CONSULTAS ÚTEIS
-- =============================================

-- Listar palavras sem livro vinculado:
-- SELECT id, palavra, created_at 
-- FROM vocabulary 
-- WHERE book_id IS NULL 
-- ORDER BY created_at DESC;

-- Listar palavras por livro:
-- SELECT v.palavra, b.name as livro 
-- FROM vocabulary v 
-- LEFT JOIN books b ON v.book_id = b.id 
-- ORDER BY b.name, v.palavra;

-- =============================================
-- FIM DA MIGRAÇÃO v1.7
-- =============================================
