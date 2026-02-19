
# Modulo de Exegese Biblica Avancado

## Resumo

Transformar o modulo de exegese atual (que e basicamente um chat simples com IA) em uma ferramenta completa de estudo biblico, com persistencia de dados, biblioteca de materiais de referencia, geracao de esbocos homileticos, e interface organizada em abas para facilitar o uso.

---

## O que muda para voce

Hoje o modulo de exegese e apenas um campo para selecionar passagem e um botao "Analisar" que gera texto via IA sem salvar nada. Com a atualizacao:

- **Suas analises ficam salvas** no banco de dados (nao perdem ao recarregar)
- **Voce pode enviar materiais** (PDFs, links) que a IA usa como referencia complementar
- **Gera esbocos de sermao** automaticamente (expositivo, textual, tematico)
- **Pode colar textos biblicos** direto para analise
- **Comentarios e anotacoes** persistem vinculados a cada analise
- **Tudo organizado** em abas: Analisar | Historico | Esbocos | Materiais

---

## Estrutura da Interface

A tela sera dividida em **4 abas principais**:

1. **Analisar** - Selecao de passagem + tipos de analise (como hoje, mas melhorado)
   - Mesmos 7 modos atuais + 3 novos: Metodo Indutivo, Comparacao de Versoes, Devocional
   - Campo para colar texto biblico direto
   - Opcao de incluir materiais de referencia na analise

2. **Historico** - Todas as analises salvas, com busca e filtros
   - Pesquisar por passagem, tipo, data
   - Editar/excluir anotacoes
   - Copiar e compartilhar

3. **Esbocos** - Geracao automatica de sermoes
   - Esboco Expositivo (divisao natural do texto)
   - Esboco Textual (palavras-chave do texto)
   - Esboco Tematico (tema central)
   - Cada esboco salvo e editavel

4. **Materiais** - Biblioteca de referencia do usuario
   - Upload de PDFs (comentarios, dicionarios, livros)
   - Links do YouTube e artigos
   - Visualizar e gerenciar materiais enviados

---

## Detalhes Tecnicos

### Banco de Dados (3 novas tabelas)

**`exegesis_analyses`** - Armazena cada analise gerada
- id, user_id, passage, analysis_type, question, content, notes, created_at, updated_at

**`exegesis_outlines`** - Esbocos homileticos gerados
- id, user_id, passage, outline_type (expositivo/textual/tematico), content, notes, created_at

**`exegesis_materials`** - Materiais de referencia do usuario
- id, user_id, title, type (pdf/youtube/article), url, file_path, description, created_at

Todas com RLS para que cada usuario veja apenas seus dados.

### Storage

- Novo bucket `exegesis-materials` para armazenar PDFs enviados

### Edge Function (atualizar `exegesis`)

- Aceitar novo parametro `materials_context` com trechos relevantes dos materiais do usuario
- Novos tipos de analise: `inductive_method`, `version_comparison`, `devotional`
- Novos tipos de esboco: `outline_expository`, `outline_textual`, `outline_thematic`
- System prompt enriquecido com os principios dos PDFs enviados (Gorman, Klein, Fee, Hernandes, Presley Camargo, Carlos Osvaldo)

### Frontend

- Refatorar `ExegesisView.tsx` para usar abas (Tabs do Radix)
- Criar componentes:
  - `ExegesisAnalyzer.tsx` - aba de analise (passagem + tipo + streaming)
  - `ExegesisHistory.tsx` - historico salvo com busca
  - `ExegesisOutlines.tsx` - geracao e listagem de esbocos
  - `ExegesisMaterials.tsx` - upload e gestao de materiais
- Criar hook `useExegesis.ts` para CRUD das analises, esbocos e materiais
- Resultados salvos automaticamente no banco apos streaming concluir

### Prompt da IA (enriquecido)

O system prompt sera atualizado para incorporar os principios extraidos dos materiais:
- **Gorman**: 7 elementos da exegese (pesquisa, contexto, forma, analise detalhada, sintese, reflexao, aprimoramento)
- **Klein**: Interpretacao responsavel, distincao generos, pre-entendimentos
- **Fee**: "Entendes o que les" - leitura cuidadosa, generos literarios
- **Carlos Osvaldo**: Fundamentos de sintaxe grega/hebraica para analise textual
- **Hernandes**: Pregacao expositiva, estrutura homiletica
- **Presley Camargo**: 8 regras de leitura, tipos de sermao (descritivo, normativo, tematico, textual, expositivo)

---

## Sequencia de Implementacao

1. Criar tabelas no banco + bucket de storage + politicas RLS
2. Atualizar edge function com novos tipos e prompt enriquecido
3. Criar hook `useExegesis.ts`
4. Refatorar `ExegesisView.tsx` com abas
5. Criar componentes das abas (Analyzer, History, Outlines, Materials)
6. Testar fluxo completo
