-- =====================================================
-- MIGRAÇÃO v1.8 - Correção de Formato de Tempo
-- Data: 2026-01-25
-- =====================================================
-- 
-- PROBLEMA IDENTIFICADO:
-- - Alguns registros têm time_spent em SEGUNDOS (ex: "900")
-- - Alguns registros têm time_spent em HH:MM:SS (ex: "10:30:00")
-- 
-- FORMATO CORRETO:
-- - MM:SS (ex: "15:30" = 15 minutos e 30 segundos)
-- - MM (ex: "15" = 15 minutos)
--
-- =====================================================

-- 1. VERIFICAR registros com formato incorreto
SELECT 
  id,
  time_spent,
  CASE 
    WHEN time_spent ~ '^\d+$' AND CAST(time_spent AS INTEGER) >= 60 THEN 'SEGUNDOS (INCORRETO)'
    WHEN time_spent ~ '^\d+:\d+:\d+$' THEN 'HH:MM:SS (LEGADO)'
    WHEN time_spent ~ '^\d+:\d+$' THEN 'MM:SS (CORRETO)'
    WHEN time_spent ~ '^\d+$' THEN 'MM (CORRETO)'
    ELSE 'OUTRO'
  END as formato
FROM readings
WHERE 
  (time_spent ~ '^\d+$' AND CAST(time_spent AS INTEGER) >= 60)
  OR time_spent ~ '^\d+:\d+:\d+$';

-- =====================================================
-- 2. CORRIGIR registros em SEGUNDOS para MM:SS
-- Exemplo: "900" (900 segundos = 15 minutos) → "15:00"
-- =====================================================
UPDATE readings
SET time_spent = CONCAT(
  FLOOR(CAST(time_spent AS INTEGER) / 60)::TEXT, 
  ':', 
  LPAD((CAST(time_spent AS INTEGER) % 60)::TEXT, 2, '0')
)
WHERE time_spent ~ '^\d+$' AND CAST(time_spent AS INTEGER) >= 60;

-- =====================================================
-- 3. CORRIGIR registros em HH:MM:SS
-- 
-- ⚠️ ATENÇÃO: Antes de executar, verifique se os valores fazem sentido!
-- "10:30:00" = 10 horas e 30 minutos = 630 minutos
-- Isso parece ser um ERRO no cadastro original.
--
-- OPÇÃO A: Se o valor correto era MM:SS (10 min 30 seg):
-- =====================================================
-- UPDATE readings
-- SET time_spent = CONCAT(
--   SPLIT_PART(time_spent, ':', 1),  -- Minutos
--   ':',
--   SPLIT_PART(time_spent, ':', 2)   -- Segundos
-- )
-- WHERE time_spent ~ '^\d+:\d+:\d+$';

-- =====================================================
-- OPÇÃO B: Se o valor era realmente HH:MM:SS (converter para MM:SS):
-- Isso resultará em valores MUITO ALTOS (ex: 630:00)
-- =====================================================
-- UPDATE readings
-- SET time_spent = CONCAT(
--   (SPLIT_PART(time_spent, ':', 1)::INTEGER * 60 + SPLIT_PART(time_spent, ':', 2)::INTEGER)::TEXT,
--   ':',
--   LPAD(SPLIT_PART(time_spent, ':', 3), 2, '0')
-- )
-- WHERE time_spent ~ '^\d+:\d+:\d+$';

-- =====================================================
-- OPÇÃO C: Definir um valor fixo razoável (recomendado se dados incorretos)
-- Exemplo: 10 minutos por sessão de leitura
-- =====================================================
-- UPDATE readings
-- SET time_spent = '10:00'
-- WHERE time_spent ~ '^\d+:\d+:\d+$';

-- =====================================================
-- 4. VERIFICAR após correção
-- =====================================================
-- SELECT id, time_spent FROM readings ORDER BY created_at DESC LIMIT 20;
