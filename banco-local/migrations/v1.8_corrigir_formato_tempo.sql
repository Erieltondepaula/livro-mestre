-- =====================================================
-- MIGRAÇÃO v1.8 - Correção de Formato de Tempo
-- Data: 2026-01-25
-- Status: EXECUTADA ✅
-- =====================================================
-- 
-- PROBLEMA CORRIGIDO:
-- - Registros com formato HH:MM:SS (ex: "10:30:00") → corrigidos para MM:SS
-- - Registros com segundos diretos (ex: "900") → corrigidos para MM:SS
-- 
-- FORMATO CORRETO:
-- - MM:SS (ex: "15:30" = 15 minutos e 30 segundos)
-- - MM (ex: "15" = 15 minutos)
--
-- =====================================================

-- 1. Corrigir registros HH:MM:SS para MM:SS (remover terceira parte)
UPDATE readings
SET time_spent = CONCAT(
  SPLIT_PART(time_spent, ':', 1),
  ':',
  SPLIT_PART(time_spent, ':', 2)
)
WHERE time_spent ~ '^\d+:\d+:\d+$';

-- 2. Corrigir registros em SEGUNDOS para MM:SS
-- Exemplo: "900" (900 segundos = 15 minutos) → "15:00"
UPDATE readings
SET time_spent = CONCAT(
  FLOOR(CAST(time_spent AS INTEGER) / 60)::TEXT, 
  ':', 
  LPAD((CAST(time_spent AS INTEGER) % 60)::TEXT, 2, '0')
)
WHERE time_spent ~ '^\d+$' AND CAST(time_spent AS INTEGER) >= 60;

-- 3. Verificar após correção
SELECT DISTINCT time_spent, 
  CASE 
    WHEN time_spent ~ '^\d+:\d+$' THEN 'MM:SS ✅'
    WHEN time_spent ~ '^\d+$' THEN 'MM ✅'
    ELSE 'Outro'
  END as formato
FROM readings 
ORDER BY time_spent;
