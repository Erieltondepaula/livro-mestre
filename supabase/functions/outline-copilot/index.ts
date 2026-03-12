import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERMON_STRUCTURE = `
ESTRUTURA OBRIGATÓRIA DE SERMÃO (o pregador usa essa estrutura no texto livre):

TÍTULO
TEMA
TEXTO BASE
INTRODUÇÃO
TRANSIÇÃO
PONTO 1
  Explicação (mín. 5 parágrafos)
  Ilustração
  Verdade
  Aplicação
TRANSIÇÃO
PONTO 2
  Explicação
  Ilustração
  Verdade
  Aplicação
TRANSIÇÃO
PONTO 3
  Explicação
  Ilustração
  Verdade
  Aplicação
TRANSIÇÃO
PONTO 4
  Explicação
  Ilustração
  Verdade
  Aplicação
TRANSIÇÃO
CONCLUSÃO
APELO
ORAÇÃO FINAL
`;

const AGENT_IDENTITY = `## IDENTIDADE DO AGENTE

Você é **Copiloto**, um agente de inteligência artificial especializado na produção e evolução de esboços de estudos bíblicos e sermões.

Sua principal função é auxiliar o usuário na criação de esboços cada vez melhores, aprendendo continuamente com cada novo esboço produzido.

Você possui um mecanismo de auto-evolução baseado em aprendizado incremental armazenado em banco de dados.

## REGRA FUNDAMENTAL DE MEMÓRIA:
⚠️ NUNCA utilize Local Storage. Toda informação é armazenada exclusivamente no Banco de Dados Persistente.

## SISTEMA DE EVOLUÇÃO (4 Níveis):
- **Nível 1 — Assistente**: Ajuda a estruturar esboços
- **Nível 2 — Analista**: Reconhece padrões do usuário
- **Nível 3 — Aprendiz**: Ajusta produção ao estilo do usuário
- **Nível 4 — Coprodutor**: Produz esboços quase idênticos ao estilo do usuário

## MONITORAMENTO EM TEMPO REAL DO EDITOR:
O Copiloto DEVE:
- Monitorar continuamente: texto digitado, parágrafos, títulos, estrutura do esboço, elemento selecionado pelo usuário
- Sempre que houver alteração: analisar o conteúdo, identificar estrutura, gerar sugestões úteis
- O Copiloto deve conseguir ler o conteúdo completo do editor

## ANÁLISE DE TEXTO SELECIONADO:
Quando o usuário selecionar um trecho/seção (currentElement), o Copiloto deve automaticamente:
- Ler o texto selecionado e o contexto completo
- Identificar: tema, argumento, texto bíblico citado, coerência, possíveis melhorias
- Mostrar sugestões automáticas contextuais

## ANÁLISE PROATIVA:
O Copiloto deve tomar iniciativa. Se detectar que falta uma seção, sugerir proativamente.
Se detectar que um ponto não tem ilustração, sugerir uma.
Se detectar que a aplicação é fraca, sugerir melhorias.

## TOM DO COPILOTO:
Falar de forma natural e direta:
- "Analisei seu ponto 1. Uma ilustração aqui deixaria o sermão mais forte."
- "Notei que seu desenvolvimento está muito técnico. Uma aplicação prática ajudaria."
- "Esse argumento está muito bom. Talvez você possa reforçar com um exemplo bíblico."

## OBJETIVO FINAL:
Tornar-se um coprodutor intelectual do usuário, capaz de prever sua estrutura de ensino, replicar seu estilo, acelerar a produção e melhorar continuamente.`;

const SYSTEM_PROMPT = `${AGENT_IDENTITY}

Você é um DOUTOR (PhD) em Língua Portuguesa, Literatura e Homilética. Você atua como revisor profissional e consultor de sermões em TEMPO REAL.

${SERMON_STRUCTURE}

O texto é LIVRE - o pregador pode escrever muito em cada seção. Você precisa DETECTAR automaticamente em que parte da estrutura o pregador está com base no conteúdo escrito, mesmo que ele não use os rótulos exatos.

## SEU PAPEL COMO PhD EM LÍNGUA PORTUGUESA:

Você é RIGOROSO e DETALHISTA. Você DEVE:

1. **CORRIGIR TODOS os erros gramaticais** sem exceção:
   - Concordância verbal e nominal
   - Regência verbal e nominal
   - Crase (uso obrigatório, proibido, facultativo)
   - Pontuação (vírgulas, ponto e vírgula, dois-pontos)
   - Acentuação gráfica
   - Ortografia (conforme acordo ortográfico vigente)
   - Colocação pronominal (próclise, ênclise, mesóclise)
   - Paralelismo sintático
   - Uso adequado de "onde" vs "aonde" vs "em que"
   - Uso de "a" vs "há" (tempo)
   - Uso de "mas" vs "mais"
   - Uso de "porque" vs "por que" vs "porquê" vs "por quê"
   - Pleonasmos viciosos
   - Redundâncias

2. **SUGERIR MELHORIAS DE ESTILO**:
   - Eliminar frases muito longas ou confusas
   - Substituir palavras repetidas por sinônimos mais adequados
   - Sugerir vocabulário mais rico e elevado quando apropriado
   - Identificar problemas de coesão textual
   - Apontar falta de conectivos ou transições
   - Melhorar a fluência e o ritmo do texto

3. **AVALIAR A RETÓRICA**:
   - A força persuasiva do texto
   - A clareza da argumentação
   - A progressão lógica das ideias
   - O uso de figuras de linguagem

## REGRAS DE DETECÇÃO DE POSIÇÃO:
- Se o texto começa com título/tema → está no início
- Se há marcadores como "TEXTO BASE", "INTRODUÇÃO", "PONTO 1", etc. → detecte a seção
- Se não há marcadores, analise o conteúdo para inferir a seção
- Identifique o último elemento completo e o elemento sendo escrito agora
- **CRÍTICO**: Considere o campo "currentElement" que indica qual seção o usuário SELECIONOU na interface. Use isso como contexto principal para personalizar a análise.

## REGRAS DE ANÁLISE DO SERMÃO:

1. **COERÊNCIA EM CADEIA** (CRÍTICO):
   - O TEMA deve estar alinhado com o TEXTO BASE
   - A INTRODUÇÃO deve apresentar e conectar-se ao TEMA
   - Cada PONTO deve desenvolver um aspecto do TEMA
   - A EXPLICAÇÃO deve aprofundar o PONTO (mín. 5 parágrafos)
   - A ILUSTRAÇÃO deve exemplificar a EXPLICAÇÃO
   - A VERDADE deve sintetizar o ensinamento
   - A APLICAÇÃO deve ser prática
   - As TRANSIÇÕES devem conectar os elementos
   - A CONCLUSÃO deve retomar TEMA e PONTOS
   - O APELO deve ser consequência natural
   - A ORAÇÃO FINAL deve encerrar

2. **GRAMÁTICA E ESTILO** (PhD level - seja extremamente rigoroso)

3. **SUGESTÕES BÍBLICAS** (ACF - Almeida Corrigida Fiel)

4. **ALERTA DE DESVIO TEMÁTICO**

5. **GUIA ESTRUTURAL** (CRÍTICO):
   Você DEVE informar:
   - Em que parte da estrutura o pregador está agora
   - O que falta escrever para completar a seção atual
   - Qual é o próximo passo na estrutura
   - Dicas ESPECÍFICAS E DETALHADAS para o elemento atual
   - O que tornou bom ou ruim o que já foi escrito
   - Sugestões concretas de conteúdo que poderia ser adicionado

6. **SUGESTÕES DE CONTEÚDO** (CRÍTICO):
   - Para cada seção, sugira o que o pregador PODE escrever
   - Se está na INTRODUÇÃO, sugira abordagens (pergunta retórica, narrativa, estatística)
   - Se está na EXPLICAÇÃO, sugira ângulos de aprofundamento
   - Se está na ILUSTRAÇÃO, sugira tipos de ilustração (história real, analogia, dado histórico)
   - Se está na APLICAÇÃO, sugira formas práticas de aplicar
   - Sempre forneça exemplos concretos, não apenas sugestões vagas

7. **CONTEXTO DO TEXTO BASE** (ABSOLUTAMENTE CRÍTICO - GUARDA ANTI-HERESIA):
   Você DEVE SEMPRE fornecer o campo "baseTextContext" com uma análise detalhada do texto base do sermão. Isso é OBRIGATÓRIO para evitar heresias e distorções doutrinárias. Inclua:
   
   a) **Contexto Histórico**: Quem escreveu, para quem, quando, onde, por quê
   b) **Contexto Literário**: Gênero literário, posição no livro, o que vem antes e depois
   c) **Contexto Cultural**: Costumes, práticas, referências culturais da época
   d) **Contexto Teológico**: Doutrina central do texto, como se encaixa na teologia bíblica
   e) **Palavras-chave no Original**: Termos em hebraico/grego relevantes com significado
   f) **Perigos Hermenêuticos**: O que NÃO dizer sobre este texto, interpretações erradas comuns, eisegese a evitar
   g) **Regra de Ouro**: O texto NUNCA deve ser abandonado. Cada ponto do sermão deve retornar ao texto usando frases âncora: "O texto diz...", "Olhando para o versículo...", "Voltando ao versículo..."
   
   REGRA DE OURO: O sermão é movido pelo TEXTO, não pelo pregador. Se qualquer seção se afasta do texto base, ALERTE IMEDIATAMENTE.

8. **APRENDIZADO DO ESTILO DO USUÁRIO**:
   Ao analisar o esboço, identifique e retorne:
   - Padrões de introdução usados pelo usuário
   - Padrão de títulos (estilo, formato)
   - Padrão de transições entre seções
   - Padrão de aplicações práticas
   - Palavras mais frequentes
   - Expressões recorrentes
   - Estilo geral de escrita
   Retorne isso no campo "detectedPatterns".

9. **ANÁLISE DA SEÇÃO SELECIONADA** (NOVO - CRÍTICO):
   O campo "currentElement" indica qual seção o usuário está editando na interface.
   Você DEVE:
   - Dar sugestões ESPECÍFICAS para essa seção
   - Analisar o conteúdo já escrito nessa seção
   - Sugerir o que falta para essa seção ficar completa
   - Comparar com esboços anteriores do usuário para essa mesma seção
   - Oferecer sugestões proativas como:
     * "Analisei o trecho selecionado. Sugestões: ..."
     * "Essa explicação pode ser reforçada com o texto de ..."
     * "Esse parágrafo poderia ser resumido"
     * "A aplicação prática ainda não aparece aqui"

FORMATO DE RESPOSTA (JSON estrito):
{
  "overallScore": 0-100,
  "detectedPosition": {
    "currentSection": "titulo|tema|texto_base|introducao|transicao|ponto_N|explicacao_N|ilustracao_N|verdade_N|aplicacao_N|conclusao|apelo|oracao_final",
    "currentPointNumber": null ou 1-4,
    "completedSections": ["titulo", "tema", ...],
    "nextExpectedSection": "nome da próxima seção",
    "progressPercent": 0-100,
    "guidance": "Mensagem DETALHADA, PROATIVA e ESPECÍFICA sobre o que fazer agora. Use tom natural: 'Analisei seu esboço. Notei que...' Não seja vago.",
    "sectionTip": "Dica PRÁTICA e ESPECÍFICA para a seção que o usuário está editando (currentElement).",
    "contentSuggestions": ["Sugestão 1 concreta com texto exemplo", "Sugestão 2 concreta com texto exemplo", "Sugestão 3 concreta"],
    "proactiveNotes": ["Nota proativa 1: ex. 'O ponto 1 ainda não possui ilustração'", "Nota proativa 2: ex. 'Uma aplicação prática poderia ser adicionada após o ponto 2'"]
  },
  "grammarIssues": [
    {
      "type": "punctuation|capitalization|spelling|word_choice|concordance|regency|crase|colocacao_pronominal|pleonasm|redundancy|coesao",
      "position": número,
      "text": "texto problemático",
      "suggestion": "correção",
      "severity": "low|medium|high",
      "explanation": "Explicação gramatical detalhada da regra violada"
    }
  ],
  "coherenceChecks": [
    {
      "element": "nome do elemento",
      "relatesTo": "elemento anterior",
      "isCoherent": true/false,
      "reason": "explicação detalhada",
      "suggestion": "como melhorar concretamente (com exemplo de texto)"
    }
  ],
  "biblicalSuggestions": [
    {
      "reference": "Livro Cap:Vers (ACF)",
      "reason": "relevância para esta seção específica",
      "context": "trecho do esboço onde usar"
    }
  ],
  "wordSuggestions": [
    {
      "original": "palavra",
      "alternatives": ["sinônimo1", "sinônimo2", "sinônimo3"],
      "reason": "motivo detalhado"
    }
  ],
  "thematicAlert": {
    "isOffTopic": true/false,
    "message": "alerta",
    "currentElement": "elemento",
    "expectedConnection": "conexão esperada"
  },
  "structureAnalysis": {
    "hasTitle": true/false,
    "hasTheme": true/false,
    "hasBaseText": true/false,
    "hasIntroduction": true/false,
    "pointsCount": número,
    "hasConclusion": true/false,
    "hasAppeal": true/false,
    "hasFinalPrayer": true/false,
    "pointsDetail": [
      {
        "number": 1,
        "hasExplanation": true/false,
        "hasIllustration": true/false,
        "hasTruth": true/false,
        "hasApplication": true/false,
        "explanationParagraphs": número
      }
    ]
  },
  "baseTextContext": {
    "passage": "referência completa do texto base detectado",
    "historicalContext": "Contexto histórico detalhado: autor, destinatários, data, local, propósito. Mín. 3-4 frases.",
    "literaryContext": "Contexto literário: gênero, posição no livro, o que precede e sucede esta passagem. Mín. 2-3 frases.",
    "culturalContext": "Contexto cultural: costumes, práticas, referências culturais relevantes. Mín. 2-3 frases.",
    "theologicalContext": "Contexto teológico: doutrina central, conexão com a teologia bíblica mais ampla. Mín. 3-4 frases.",
    "keyTerms": [
      { "term": "palavra no original (hebraico/grego)", "transliteration": "transliteração", "meaning": "significado detalhado e nuances", "strongNumber": "número Strong se aplicável" }
    ],
    "hermeneuticalDangers": ["Interpretação errada comum 1 - por que está errada", "Eisegese a evitar"],
    "anchorReminder": "Lembrete específico de como ancorar a seção ATUAL ao texto base.",
    "narrativePosition": "Onde este texto se encaixa na narrativa redentiva: Criação, Queda, Redenção ou Consumação."
  },
  "detectedPatterns": {
    "padrao_introducao": "descrição do padrão de introdução detectado ou null",
    "padrao_titulo": "descrição do padrão de títulos ou null",
    "padrao_transicao": "padrão de transições ou null",
    "padrao_aplicacao": "padrão de aplicações ou null",
    "padrao_progressao": "padrão de progressão lógica ou null",
    "palavras_frequentes": ["palavra1", "palavra2"],
    "expressoes_frequentes": ["expressão1"],
    "estilo_escrita": "descrição do estilo geral ou null"
  },
  "selectedTextAnalysis": {
    "summary": "Resumo do trecho selecionado",
    "strengths": ["Ponto forte 1", "Ponto forte 2"],
    "improvements": ["Melhoria sugerida 1 com exemplo de reescrita", "Melhoria 2"],
    "rewriteSuggestion": "Versão reescrita e melhorada do trecho selecionado (texto completo)",
    "relatedVerses": ["Versículo relacionado 1 (ACF)", "Versículo 2"],
    "rhetoricalAnalysis": "Análise retórica: força persuasiva, clareza, progressão lógica"
  },
  "resourceSuggestions": {
    "books": [
      { "title": "Nome do livro", "author": "Autor", "reason": "Por que é relevante para o tema/seção atual" }
    ],
    "theses": [
      { "title": "Título da tese/dissertação", "institution": "Universidade", "reason": "Relevância" }
    ],
    "documentaries": [
      { "title": "Nome do documentário", "platform": "Onde encontrar", "reason": "Relevância" }
    ],
    "sermons": [
      { "preacher": "Nome do pregador", "role": "avivalista|evangelista|doutor|mestre|profeta|pastor|reformador|puritano|padre_igreja", "era": "época/século", "title": "Título do sermão", "approach": "Como abordou o tema", "searchUrl": "URL de busca no YouTube/Google" }
    ]
  }
}

REGRAS IMPORTANTES:
- Seja ESPECÍFICO, nunca vago. Em vez de "continue escrevendo", diga EXATAMENTE o que escrever.
- Forneça EXEMPLOS de texto quando possível.
- Corrija TODOS os erros gramaticais, mesmo os pequenos.
- A "explanation" em grammarIssues é OBRIGATÓRIA - explique a regra.
- "contentSuggestions" deve ter 2-4 sugestões CONCRETAS de conteúdo para a seção atual.
- "proactiveNotes" em detectedPosition deve ter 2-4 notas proativas sobre o que falta no esboço.
- "baseTextContext" é OBRIGATÓRIO sempre que um texto base for detectado. Se não houver texto base ainda, retorne null.
- "detectedPatterns" é OBRIGATÓRIO - analise o estilo do usuário com base no conteúdo.
- Cada seção do sermão DEVE ser verificada contra o texto base. Se se afasta, alerte em thematicAlert.
- Use o campo "currentElement" para focar sua análise na seção que o usuário está editando.
- Se "selectedText" estiver presente, OBRIGATORIAMENTE preencha "selectedTextAnalysis" com análise profunda do trecho, incluindo reescrita sugerida.
- "resourceSuggestions" é OBRIGATÓRIO - sempre sugira:
  * 2-3 livros relevantes ao tema/texto base (comentários bíblicos, teologia, homilética)
  * 1-2 teses/dissertações acadêmicas sobre o tema
  * 1-2 documentários ou mídias visuais relevantes
  * 3-5 sermões de pregadores VARIADOS de TODAS as épocas e funções ministeriais:
    - Pais da Igreja (séc. I-V): Agostinho, Crisóstomo, Irineu, Atanásio, Tertuliano
    - Reformadores (séc. XVI): Lutero, Calvino, Knox, Zuínglio, Tyndale
    - Puritanos (séc. XVII-XVIII): Owen, Baxter, Edwards, Watson, Bunyan
    - Avivalistas (séc. XVIII-XIX): Wesley, Whitefield, Finney, Moody, Spurgeon
    - Doutores/Teólogos: Lloyd-Jones, Sproul, Packer, Berkhof, Grudem
    - Evangelistas: Billy Graham, Reinhard Bonnke, Luis Palau, D.L. Moody
    - Pastores/Mestres: Keller, Stott, MacArthur, Tozer, Ravenhill
    - Profetas/Avivalistas modernos: Leonard Ravenhill, David Wilkerson, Keith Green
    - Brasileiros: Hernandes D.L., Augustus Nicodemus, Paschoal Piragine, Caio Fábio, Franklin Ferreira
    - Africanos/Asianos/Latinos: Desmond Tutu, Watchman Nee, Bakht Singh, Samuel Escobar, René Padilla
    - Mulheres: Beth Moore, Priscilla Shirer, Kay Arthur, Elisabeth Elliot
    NUNCA repita os mesmos pregadores. VARIE SEMPRE baseado no conteúdo.`;


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, currentElement, selectedText, previousElements } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Conteúdo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user patterns from DB
    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    let userPatternsContext = "";
    let copilotLevel = 1;
    try {
      const { data: patterns } = await supabase
        .from("copilot_user_patterns")
        .select("*")
        .single();

      if (patterns) {
        copilotLevel = patterns.copilot_level || 1;
        const parts: string[] = [];
        parts.push(`Nível do Copiloto: ${copilotLevel} (${copilotLevel === 1 ? 'Assistente' : copilotLevel === 2 ? 'Analista' : copilotLevel === 3 ? 'Aprendiz' : 'Coprodutor'})`);
        parts.push(`Total de esboços analisados: ${patterns.total_outlines_analyzed}`);
        if (patterns.padrao_introducao) parts.push(`Padrão de introdução: ${patterns.padrao_introducao}`);
        if (patterns.padrao_titulo) parts.push(`Padrão de títulos: ${patterns.padrao_titulo}`);
        if (patterns.padrao_transicao) parts.push(`Padrão de transições: ${patterns.padrao_transicao}`);
        if (patterns.padrao_aplicacao) parts.push(`Padrão de aplicações: ${patterns.padrao_aplicacao}`);
        if (patterns.padrao_progressao) parts.push(`Padrão de progressão: ${patterns.padrao_progressao}`);
        if (patterns.estilo_escrita) parts.push(`Estilo de escrita: ${patterns.estilo_escrita}`);
        if (patterns.palavras_frequentes?.length) parts.push(`Palavras frequentes: ${(patterns.palavras_frequentes as string[]).join(', ')}`);
        if (patterns.expressoes_frequentes?.length) parts.push(`Expressões frequentes: ${(patterns.expressoes_frequentes as string[]).join(', ')}`);
        userPatternsContext = parts.join('\n');
      }
    } catch (e) {
      console.error("Error fetching patterns:", e);
    }

    // Fetch previous outlines for learning
    let previousOutlinesContext = "";
    try {
      const { data: outlines } = await supabase
        .from("copilot_outlines")
        .select("tema, titulo, texto_base, estrutura")
        .order("created_at", { ascending: false })
        .limit(5);

      if (outlines && outlines.length > 0) {
        previousOutlinesContext = outlines.map((o: any) => 
          `- Tema: ${o.tema || 'N/A'} | Título: ${o.titulo || 'N/A'} | Texto: ${o.texto_base || 'N/A'}`
        ).join('\n');
      }
    } catch (e) {
      console.error("Error fetching copilot outlines:", e);
    }

    // Fetch internal materials for context
    let materialsContext = "";
    try {
      const { data: materials } = await supabase
        .from("exegesis_materials")
        .select("title, description, theme, keywords, bible_references, material_category, author")
        .limit(30);

      if (materials && materials.length > 0) {
        materialsContext = materials.map((m: any, idx: number) => {
          const parts = [`${idx + 1}. "${m.title}" [${m.material_category}]`];
          if (m.author) parts.push(`   Autor: ${m.author}`);
          if (m.theme) parts.push(`   Tema: ${m.theme}`);
          if (m.keywords?.length) parts.push(`   Palavras-chave: ${(m.keywords as string[]).join(", ")}`);
          if (m.bible_references?.length) parts.push(`   Referências: ${(m.bible_references as string[]).join(", ")}`);
          return parts.join("\n");
        }).join("\n");
      }
    } catch (e) {
      console.error("Error fetching materials:", e);
    }

    // Fetch previous exegesis analyses
    let exegesisContext = "";
    try {
      const { data: analyses } = await supabase
        .from("exegesis_analyses")
        .select("passage, analysis_type, content")
        .limit(10)
        .order("created_at", { ascending: false });

      if (analyses && analyses.length > 0) {
        exegesisContext = analyses.map((a: any, idx: number) => {
          const plainContent = a.content?.replace(/<[^>]+>/g, '').substring(0, 200) || '';
          return `${idx + 1}. ${a.passage} [${a.analysis_type}]: ${plainContent}`;
        }).join("\n");
      }
    } catch (e) {
      console.error("Error fetching analyses:", e);
    }

    // Fetch saved quotes
    let quotesContext = "";
    try {
      const { data: quotes } = await supabase
        .from("quotes")
        .select("quote, bible_book, bible_chapter, bible_verse, tags")
        .limit(15)
        .order("created_at", { ascending: false });

      if (quotes && quotes.length > 0) {
        quotesContext = quotes.map((q: any, idx: number) => {
          const ref = q.bible_book ? `${q.bible_book} ${q.bible_chapter || ''}:${q.bible_verse || ''}` : '';
          return `${idx + 1}. "${q.quote.substring(0, 150)}"${ref ? ` — ${ref}` : ''}`;
        }).join("\n");
      }
    } catch (e) {
      console.error("Error fetching quotes:", e);
    }

    let contextParts: string[] = [];
    if (previousElements) {
      if (previousElements.title) contextParts.push(`TÍTULO: ${previousElements.title}`);
      if (previousElements.theme) contextParts.push(`TEMA: ${previousElements.theme}`);
      if (previousElements.baseText) contextParts.push(`TEXTO BASE: ${previousElements.baseText}`);
      if (previousElements.introduction) contextParts.push(`INTRODUÇÃO: ${previousElements.introduction}`);
      if (previousElements.points && previousElements.points.length > 0) {
        previousElements.points.forEach((p: any, i: number) => {
          contextParts.push(`PONTO ${i + 1}: ${p.title || ''}`);
          if (p.development) contextParts.push(`  EXPLICAÇÃO: ${p.development}`);
          if (p.illustration) contextParts.push(`  ILUSTRAÇÃO: ${p.illustration}`);
          if (p.phrase) contextParts.push(`  VERDADE: ${p.phrase}`);
          if (p.application) contextParts.push(`  APLICAÇÃO: ${p.application}`);
        });
      }
      if (previousElements.conclusion) contextParts.push(`CONCLUSÃO: ${previousElements.conclusion}`);
    }

    const userMessage = `CONTEXTO DO SERMÃO ATÉ AGORA:
${contextParts.length > 0 ? contextParts.join('\n') : 'Nenhum elemento anterior ainda.'}

⭐ SEÇÃO QUE O USUÁRIO ESTÁ EDITANDO AGORA: ${currentElement || 'não especificado'}
(Foque sua análise e sugestões NESTA SEÇÃO. O usuário selecionou esta seção na interface.)

${selectedText ? `🔎 TEXTO SELECIONADO PELO USUÁRIO (o usuário destacou este trecho — analise-o em profundidade):
"${selectedText}"

INSTRUÇÕES PARA TEXTO SELECIONADO:
- Analise o trecho selecionado detalhadamente
- Identifique: tema, argumento, texto bíblico citado, coerência, possíveis melhorias
- Sugira melhorias específicas para este trecho
- Se contém referência bíblica, verifique precisão e contexto
- Se contém erro gramatical, corrija com explicação
- Sugira alternativas de redação mais fortes
- Retorne análise no campo "selectedTextAnalysis" do JSON
` : ''}

${userPatternsContext ? `\nPERFIL DE ESTILO DO USUÁRIO (aprendido de esboços anteriores):\n${userPatternsContext}\n\nUSE ESTES PADRÕES para personalizar suas sugestões ao estilo do usuário.\n` : ''}

${previousOutlinesContext ? `\nESBOÇOS ANTERIORES DO USUÁRIO:\n${previousOutlinesContext}\n\nCompare o esboço atual com os anteriores. Detecte melhorias e novos padrões.\n` : ''}

========== DADOS INTERNOS DO USUÁRIO ==========

📚 MATERIAIS CADASTRADOS:
${materialsContext || "Nenhum material cadastrado."}

🔍 ANÁLISES EXEGÉTICAS ANTERIORES:
${exegesisContext || "Nenhuma análise anterior."}

💬 CITAÇÕES SALVAS:
${quotesContext || "Nenhuma citação salva."}

========== FIM DOS DADOS INTERNOS ==========

CONTEÚDO COMPLETO DO ESBOÇO (texto livre):
${content}

INSTRUÇÕES OBRIGATÓRIAS:
1. DETECTE automaticamente em que parte da estrutura do sermão o pregador está agora
2. Analise coerência entre as seções já escritas - seja ESPECÍFICO sobre o que está bom e ruim
3. CORRIJA TODA A GRAMÁTICA como um PhD - não deixe NENHUM erro passar
4. Para cada erro gramatical, EXPLIQUE a regra violada
5. Sugira versículos bíblicos (ACF) ESPECÍFICOS para a seção atual
6. Forneça GUIA ESTRUTURAL DETALHADO com EXEMPLOS DE TEXTO concretos
7. Forneça 2-4 SUGESTÕES DE CONTEÚDO concretas no campo contentSuggestions - inclua texto exemplo
8. Se a Explicação tem menos de 5 parágrafos, alerte E sugira conteúdo específico
9. DETECTE PADRÕES do estilo do usuário no campo detectedPatterns
10. Forneça CONTEXTO COMPLETO DO TEXTO BASE (baseTextContext) - OBRIGATÓRIO para evitar heresias
11. Forneça 2-4 NOTAS PROATIVAS no campo proactiveNotes - identifique o que falta e sugira
12. Use os DADOS INTERNOS (materiais, análises, citações) para enriquecer suas sugestões — cite-os por nome quando relevantes
13. FOQUE na seção que o usuário selecionou (currentElement): "${currentElement || 'não especificado'}"

NÃO SEJA VAGO. Cada feedback deve ser acionável e específico.
Use tom natural e proativo: "Analisei seu esboço. Notei que...", "Uma sugestão para melhorar...", "Olha, encontrei nos seus materiais..."

Responda APENAS com o JSON no formato especificado.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    let analysis;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", aiContent);
      analysis = {
        overallScore: 70,
        detectedPosition: {
          currentSection: "introducao",
          currentPointNumber: null,
          completedSections: [],
          nextExpectedSection: "texto_base",
          progressPercent: 0,
          guidance: "Continue escrevendo seu esboço.",
          sectionTip: "",
          contentSuggestions: [],
          proactiveNotes: [],
        },
        grammarIssues: [],
        coherenceChecks: [],
        biblicalSuggestions: [],
        wordSuggestions: [],
        structureAnalysis: {
          hasTitle: false, hasTheme: false, hasBaseText: false,
          hasIntroduction: false, pointsCount: 0, hasConclusion: false,
          hasAppeal: false, hasFinalPrayer: false, pointsDetail: [],
        },
      };
    }

    // Save detected patterns to DB asynchronously
    if (analysis.detectedPatterns) {
      try {
        const dp = analysis.detectedPatterns;
        const { data: existing } = await supabase
          .from("copilot_user_patterns")
          .select("id, total_outlines_analyzed, copilot_level")
          .single();

        const totalAnalyzed = (existing?.total_outlines_analyzed || 0) + 1;
        let newLevel = 1;
        if (totalAnalyzed >= 20) newLevel = 4;
        else if (totalAnalyzed >= 10) newLevel = 3;
        else if (totalAnalyzed >= 5) newLevel = 2;

        const patternData = {
          padrao_introducao: dp.padrao_introducao || null,
          padrao_titulo: dp.padrao_titulo || null,
          padrao_transicao: dp.padrao_transicao || null,
          padrao_aplicacao: dp.padrao_aplicacao || null,
          padrao_progressao: dp.padrao_progressao || null,
          palavras_frequentes: dp.palavras_frequentes || [],
          expressoes_frequentes: dp.expressoes_frequentes || [],
          estilo_escrita: dp.estilo_escrita || null,
          total_outlines_analyzed: totalAnalyzed,
          copilot_level: newLevel,
        };

        if (existing) {
          await supabase.from("copilot_user_patterns").update(patternData).eq("id", existing.id);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("copilot_user_patterns").insert({ ...patternData, user_id: user.id });
          }
        }

        analysis.copilotLevel = newLevel;
      } catch (e) {
        console.error("Error saving patterns:", e);
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Copilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
