
# Plano de Melhoria Completa -- Plataforma Exegese Biblica

Este plano abrange todas as 20 melhorias solicitadas, organizadas em fases de implementacao.

---

## Fase 1: Editor de Texto Avancado (Correcoes e Melhorias)

**Problema atual:** Espacamento excessivo, poucas cores, marcador com cor unica, layout desorganizado.

**Solucoes:**

- Adicionar CSS customizado ao editor para controlar espacamento entre blocos (`p`, `h1`-`h3`, `li`, `blockquote`) com margens reduzidas e `line-height` ajustado
- Ampliar paleta de cores de fonte para 16+ cores organizadas em grid, incluindo input HEX personalizado
- Ampliar paleta do marcador de texto (highlight) para multiplas cores com seletor HEX dedicado
- Adicionar controles de tamanho de fonte (dropdown ou botoes +/-)
- Instalar extensao `@tiptap/extension-font-family` para troca de fonte (Serif, Sans, Mono)
- Melhorar visual da toolbar: agrupar secoes com labels, tooltips em cada botao

**Arquivos alterados:**
- `src/components/exegesis/ExegesisRichEditor.tsx` -- refatorar toolbar, adicionar color pickers com HEX, highlight multicolor, font size/family
- `src/index.css` -- adicionar estilos `.ProseMirror` para controle fino de espacamento

---

## Fase 2: Estrutura Editavel Antes de Gerar (Nova Aba)

**Nova funcionalidade:** Aba "Estrutura do Esboco" no fluxo de geracao de esbocos.

**Implementacao:**

- Criar componente `OutlineStructureEditor.tsx` com formulario interativo:
  - Quantidade de pontos (slider 2-6)
  - Para cada ponto: toggle de subtopico, aplicacao, ilustracao, frase de impacto
  - Toggle global: apelo final sim/nao
  - Toggle: cristocentrismo explicito
  - Slider: nivel de profundidade (basico/intermediario/avancado)
- Passar configuracao estrutural como parametro ao edge function `exegesis`
- Atualizar o prompt no edge function para respeitar a estrutura definida pelo usuario

**Arquivos novos:**
- `src/components/exegesis/OutlineStructureEditor.tsx`

**Arquivos alterados:**
- `src/components/exegesis/ExegesisOutlines.tsx` -- integrar editor de estrutura antes do botao "Gerar"
- `supabase/functions/exegesis/index.ts` -- receber `structure_config` e adaptar prompt

---

## Fase 3: Curadoria Inteligente de Analises + Filtro Pastoral

**Integracao Esbocos com Historico de Analises:**

- Ao gerar um esboco, buscar analises anteriores do usuario que contenham a mesma passagem ou temas relacionados
- Enviar resumo das analises relevantes como contexto adicional ao edge function
- Adicionar instrucoes no prompt do edge function para curadoria critica: nao copiar automaticamente, extrair apenas nucleos teologicos coerentes

**Filtro de Linguagem Pastoral:**

- Adicionar instrucoes no system prompt do edge function exigindo linguagem clara, proclamavel, pastoral e cristocentrica
- Orientar substituicao de termos tecnicos por equivalentes acessiveis

**Arquivos alterados:**
- `src/hooks/useExegesis.ts` -- nova funcao `getRelevantAnalysesContext(passage)` que filtra analises por passagem/tema
- `src/components/exegesis/ExegesisOutlines.tsx` -- chamar `getRelevantAnalysesContext` e passar como `analyses_context`
- `supabase/functions/exegesis/index.ts` -- receber `analyses_context`, adicionar regras de curadoria e filtro pastoral no prompt

---

## Fase 4: Classificacao Automatica de Conteudo + Metadados

**Reconhecimento automatico de tipo:**

- Ao colar/importar conteudo na aba Materiais, enviar texto para o edge function `exegesis` com tipo especial `classify_content`
- A IA analisa estrutura, linguagem, presenca de versiculos, tom, e retorna classificacao sugerida (Texto Biblico, Comentario, Livro, Devocional, Dicionario, Pregacao, Documentario, Texto Teologico)
- Exibir sugestao ao usuario com opcao de confirmar ou alterar

**Metadados estruturados:**

- Adicionar colunas na tabela `exegesis_materials`: `theme`, `sub_themes` (jsonb), `keywords` (jsonb), `bible_references` (jsonb), `author`, `content_origin` (texto/video/transcricao)
- Ao salvar material, extrair metadados automaticamente via IA
- Permitir edicao manual dos metadados

**Arquivos novos:**
- Migracao SQL para novas colunas em `exegesis_materials`

**Arquivos alterados:**
- `supabase/functions/exegesis/index.ts` -- novo tipo `classify_content` e `extract_metadata`
- `src/hooks/useExegesis.ts` -- funcoes `classifyContent()` e `extractMetadata()`
- `src/components/exegesis/ExegesisMaterials.tsx` -- formulario de metadados, classificacao automatica

---

## Fase 5: Busca Tematica Inteligente + Inteligencia Semantica

**Busca tematica por categoria:**

- Ao gerar esboco, o edge function recebe titulo e pontos principais
- Sistema busca em TODOS os materiais por tema, filtrando por categoria
- Resultados organizados hierarquicamente: 1) Definicao (dicionario), 2) Fundamentacao exegetica (comentario), 3) Teologica (livros), 4) Aplicacao pastoral (devocionais), 5) Ilustracoes (pregacoes)

**Equivalencias semanticas:**

- Adicionar no system prompt um bloco de instrucoes para reconhecer variacoes de termos teologicos (avivamento = renovacao espiritual = despertamento; arrependimento = metanoia = conversao)
- O edge function deve buscar por sinonimos e termos relacionados

**Arquivos alterados:**
- `supabase/functions/exegesis/index.ts` -- instrucoes de busca tematica hierarquica e equivalencias semanticas no prompt
- `src/hooks/useExegesis.ts` -- `getMaterialsContext()` refatorado para incluir metadados (tema, keywords, referencias)

---

## Fase 6: Versionamento de Esbocos

**Historico de versoes:**

- Criar tabela `exegesis_outline_versions` com colunas: `id`, `outline_id`, `content`, `version_number`, `created_at`, `user_id`
- Ao salvar edicao de esboco, criar nova versao automaticamente
- Interface para listar versoes, comparar (diff visual), restaurar versao anterior

**Arquivos novos:**
- Migracao SQL para tabela `exegesis_outline_versions` com RLS
- `src/components/exegesis/OutlineVersionHistory.tsx` -- componente de historico/comparacao

**Arquivos alterados:**
- `src/hooks/useExegesis.ts` -- funcoes `fetchOutlineVersions()`, `restoreVersion()`
- `src/components/exegesis/ExegesisOutlines.tsx` -- botao "Versoes" no toolbar de cada esboco

---

## Fase 7: Exportacao Profissional

**Melhorias na exportacao existente:**

- PDF: preservar cores, highlights, tamanhos de fonte, estrutura de topicos
- Word (.doc): incluir estilos inline para cores e formatacao
- Markdown: converter HTML formatado para MD preservando estrutura
- TXT: manter indentacao e organizacao

**Arquivos alterados:**
- `src/components/exegesis/ExegesisOutlines.tsx` -- refatorar funcoes `exportAsPdf`, `exportAsDocx`, `exportAsMd`, `exportAsTxt` para preservar formatacao completa

---

## Resumo Tecnico

| Fase | Arquivos Novos | Arquivos Alterados | Migracoes SQL |
|------|---------------|-------------------|---------------|
| 1 | 0 | 2 | 0 |
| 2 | 1 | 2 | 0 |
| 3 | 0 | 3 | 0 |
| 4 | 1 migracao | 3 | 1 |
| 5 | 0 | 2 | 0 |
| 6 | 1 componente + 1 migracao | 2 | 1 |
| 7 | 0 | 1 | 0 |

**Total:** 2 novas migracoes, 2 novos componentes, ~8 arquivos alterados, 1 edge function atualizado significativamente.

A implementacao seguira esta ordem pois cada fase constroi sobre a anterior. A Fase 1 (editor) e a mais visivel e resolve problemas imediatos de usabilidade. As Fases 4-5 (classificacao + busca semantica) sao as mais complexas e transformam a plataforma em um verdadeiro curador teologico inteligente.
