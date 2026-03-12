import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERMON_STRUCTURE = `
O pregador usa esta estrutura no texto livre:
TÍTULO → TEMA → TEXTO BASE → INTRODUÇÃO → TRANSIÇÃO →
PONTO 1 (Explicação, Ilustração, Verdade, Aplicação) → TRANSIÇÃO →
PONTO 2 (Explicação, Ilustração, Verdade, Aplicação) → TRANSIÇÃO →
PONTO 3 (Explicação, Ilustração, Verdade, Aplicação) → TRANSIÇÃO →
PONTO 4 (Explicação, Ilustração, Verdade, Aplicação) → TRANSIÇÃO →
CONCLUSÃO → APELO → ORAÇÃO FINAL
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, currentElement, theme, title, previousElements, detectedPosition } = await req.json();

    if (!content || content.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Conteúdo insuficiente para pesquisa" }),
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

    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // ========== BUSCA INTERNA: Materiais do Usuário ==========
    let materialsContext = "";
    let materialCount = 0;
    try {
      const { data: materials } = await supabase
        .from("exegesis_materials")
        .select("title, description, theme, keywords, bible_references, material_category, author, content_origin")
        .limit(50);

      if (materials && materials.length > 0) {
        materialCount = materials.length;
        materialsContext = materials.map((m: any, idx: number) => {
          const parts = [`${idx + 1}. "${m.title}" [${m.material_category}${m.content_origin ? ` / ${m.content_origin}` : ''}]`];
          if (m.author) parts.push(`   Autor: ${m.author}`);
          if (m.theme) parts.push(`   Tema: ${m.theme}`);
          if (m.description) parts.push(`   Descrição: ${m.description.substring(0, 200)}`);
          if (m.keywords?.length) parts.push(`   Palavras-chave: ${(m.keywords as string[]).join(", ")}`);
          if (m.bible_references?.length) parts.push(`   Referências bíblicas: ${(m.bible_references as string[]).join(", ")}`);
          return parts.join("\n");
        }).join("\n\n");
      }
    } catch (e) {
      console.error("Error fetching materials:", e);
    }

    // ========== BUSCA INTERNA: Esboços anteriores ==========
    let previousOutlinesContext = "";
    let outlineCount = 0;
    try {
      const { data: outlines } = await supabase
        .from("exegesis_outlines")
        .select("passage, outline_type, content, tags, notes")
        .limit(20)
        .order("created_at", { ascending: false });

      if (outlines && outlines.length > 0) {
        outlineCount = outlines.length;
        previousOutlinesContext = outlines.map((o: any, idx: number) => {
          const plainContent = o.content?.replace(/<[^>]+>/g, '').substring(0, 300) || '';
          return `${idx + 1}. Passagem: ${o.passage} | Tipo: ${o.outline_type}${o.tags?.length ? ` | Tags: ${o.tags.join(', ')}` : ''}\n   Preview: ${plainContent}`;
        }).join("\n\n");
      }
    } catch (e) {
      console.error("Error fetching outlines:", e);
    }

    // ========== BUSCA INTERNA: Análises exegéticas anteriores ==========
    let exegesisContext = "";
    try {
      const { data: analyses } = await supabase
        .from("exegesis_analyses")
        .select("passage, analysis_type, content, notes")
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

    // ========== BUSCA INTERNA: Citações salvas ==========
    let quotesContext = "";
    try {
      const { data: quotes } = await supabase
        .from("quotes")
        .select("quote, bible_book, bible_chapter, bible_verse, tags")
        .limit(20)
        .order("created_at", { ascending: false });

      if (quotes && quotes.length > 0) {
        quotesContext = quotes.map((q: any, idx: number) => {
          const ref = q.bible_book ? `${q.bible_book} ${q.bible_chapter || ''}:${q.bible_verse || ''}` : '';
          return `${idx + 1}. "${q.quote.substring(0, 150)}"${ref ? ` — ${ref}` : ''}${q.tags?.length ? ` [${q.tags.join(', ')}]` : ''}`;
        }).join("\n");
      }
    } catch (e) {
      console.error("Error fetching quotes:", e);
    }

    // ========== BUSCA INTERNA: Padrões do usuário ==========
    let userStyleContext = "";
    try {
      const { data: patterns } = await supabase
        .from("copilot_user_patterns")
        .select("*")
        .single();

      if (patterns) {
        const parts: string[] = [];
        parts.push(`Nível do Copiloto: ${patterns.copilot_level} | Esboços analisados: ${patterns.total_outlines_analyzed}`);
        if (patterns.estilo_escrita) parts.push(`Estilo: ${patterns.estilo_escrita}`);
        if (patterns.padrao_introducao) parts.push(`Padrão de introdução: ${patterns.padrao_introducao}`);
        if (patterns.padrao_aplicacao) parts.push(`Padrão de aplicação: ${patterns.padrao_aplicacao}`);
        userStyleContext = parts.join('\n');
      }
    } catch (e) {
      console.error("Error fetching user patterns:", e);
    }

    let contextParts: string[] = [];
    if (previousElements) {
      if (previousElements.title) contextParts.push(`TÍTULO: ${previousElements.title}`);
      if (previousElements.theme) contextParts.push(`TEMA: ${previousElements.theme}`);
      if (previousElements.baseText) contextParts.push(`TEXTO BASE: ${previousElements.baseText}`);
      if (previousElements.introduction) contextParts.push(`INTRODUÇÃO: ${previousElements.introduction}`);
    }

    const systemPrompt = `Você é um pesquisador teológico PhD que auxilia pregadores na elaboração de sermões em TEMPO REAL. Você é PROATIVO e busca ATIVAMENTE informações internas e externas.

${SERMON_STRUCTURE}

## BUSCA INTERNA (OBRIGATÓRIA):
Analise CADA material interno do usuário e indique COMO cada um é relevante. Não ignore nenhum.

## BUSCA EXTERNA — PREGAÇÕES SIMILARES (REGRA CRÍTICA):
⚠️ NUNCA fixe uma lista de pregadores. NUNCA repita sempre os mesmos nomes.
Você DEVE buscar DINAMICAMENTE pregadores que REALMENTE pregaram sobre o texto/tema/passagem do esboço.

### Como encontrar pregações similares:
1. Analise o TEXTO BASE, TEMA e TÍTULO do esboço atual
2. Pense em TODOS os pregadores da história cristã (antigos e modernos, brasileiros e internacionais, de TODAS as denominações e épocas) que já abordaram esse texto ou tema
3. VARIE os resultados a cada pesquisa — não repita os mesmos 3 nomes
4. Inclua pregadores de diferentes épocas: padres da igreja, reformadores, puritanos, avivalistas, contemporâneos
5. Inclua pregadores de diferentes países e tradições: África, Ásia, América Latina, Europa, EUA
6. Pesquise baseado no CONTEÚDO, não em uma lista fixa

### Exemplos de variedade (NÃO use como lista fixa, apenas como inspiração):
- Antigos: Agostinho, João Crisóstomo, Ambrósio, Bernardo de Claraval
- Reformadores: Lutero, Calvino, Knox, Zuínglio, Tyndale
- Puritanos: John Owen, Richard Baxter, Jonathan Edwards, Thomas Watson
- Avivalistas: Wesley, Whitefield, Finney, Moody, Tozer
- Modernos BR: Caio Fábio, Hernandes D.L., Augustus Nicodemus, Ricardo Gondim, Ed René Kivitz, Paschoal Piragine, Cpad autores, Ariovaldo Ramos, Robinson Cavalcanti
- Modernos INT: Lloyd-Jones, Stott, Keller, Piper, Sproul, Washer, Chandler, Platt, Chan, Kempis, Bonhoeffer, Barth
- Africanos/Asianos: Desmond Tutu, Watchman Nee, Bakht Singh, Samuel Escobar
- Mulheres: Beth Moore, Priscilla Shirer, Kay Arthur
- MUITOS OUTROS existem — busque os mais relevantes para o tema

### Fontes externas:
1. Google Acadêmico: artigos teológicos
2. YouTube: pregações filmadas sobre o mesmo texto
3. Wikipedia: contexto histórico, geográfico, cultural
4. Comentários Bíblicos: Matthew Henry, Wiersbe, Spurgeon, MacArthur, etc.
5. Dicionários: Strong, Vine, DITNT, TDNT

### Regras para URLs:
- Vídeos: https://www.youtube.com/results?search_query=TERMOS+SEPARADOS+POR+PLUS
- Pesquisas: https://www.google.com/search?q=TERMOS+SEPARADOS+POR+PLUS
- Wikipedia: https://pt.wikipedia.org/wiki/TERMO
- Bíblia: https://www.bibliaonline.com.br/acf/LIVRO/CAPITULO
- NUNCA invente URLs diretas de vídeo (youtube.com/watch?v=XXX)

## FORMATO DE RESPOSTA (JSON):
{
  "contextualNote": "Nota proativa DETALHADA. Mencione: (1) materiais internos relevantes, (2) pregações similares encontradas, (3) recomendações. Mín. 4-5 frases.",
  "currentSectionHelp": "Ajuda PASSO A PASSO para a seção atual. Mín. 3-4 frases.",
  "internalSources": [
    { "materialTitle": "título exato", "relevance": "por que é relevante", "suggestedUse": "como usar" }
  ],
  "biblicalReferences": [
    { "reference": "Livro Cap:Vers (ACF)", "text": "TEXTO COMPLETO ACF", "connection": "conexão com a seção", "type": "paralela|contraste|profecia|tipologia|doutrina" }
  ],
  "externalSources": [
    { "title": "título", "type": "artigo|video|livro|blog|documentario|pesquisa|comentario|pregacao", "description": "descrição", "url": "URL de busca", "relevance": "como usar", "preacherName": "nome se pregação" }
  ],
  "dataAndIllustrations": [
    { "title": "título", "content": "CONTEÚDO COMPLETO pronto para uso (mín. 4-5 frases)", "source": "fonte", "suggestedPlacement": "onde usar" }
  ],
  "similarSermons": [
    { "preacher": "nome REAL (VARIE! Não repita sempre os mesmos)", "title": "título REAL ou provável", "approach": "abordagem detalhada (3-4 frases)", "difference": "como diferenciar (2-3 frases)", "url": "https://www.youtube.com/results?search_query=NOME+PREGADOR+TEXTO+BIBLICO" }
  ]
}

REGRAS CRÍTICAS:
1. NUNCA retorne listas vazias
2. Sempre 3-5 referências bíblicas COM TEXTO COMPLETO (ACF)
3. Sempre 2-3 fontes externas com links funcionais
4. Sempre 1-2 ilustrações COMPLETAS
5. Sempre 3-5 pregações similares — DE PREGADORES DIFERENTES a cada pesquisa, baseados no conteúdo real
6. ⚠️ NUNCA repita sempre Hernandes + Tim Keller + Paul Washer. Busque DINAMICAMENTE baseado no texto/tema
7. Ilustrações devem ser COMPLETAS (começo, meio, fim)
8. currentSectionHelp deve ser PASSO A PASSO`;

    const userMessage = `CONTEXTO DO SERMÃO:
${contextParts.length > 0 ? contextParts.join("\n") : "Início do sermão."}
${theme ? `\nTEMA CENTRAL: ${theme}` : ""}
${title ? `\nTÍTULO: ${title}` : ""}
${detectedPosition ? `\nSEÇÃO ATUAL DETECTADA: ${detectedPosition.currentSection} (${detectedPosition.guidance || ''})` : ""}

CONTEÚDO COMPLETO SENDO ESCRITO:
${content}

========== DADOS INTERNOS DO USUÁRIO ==========

📚 MATERIAIS CADASTRADOS (${materialCount} materiais — analise CADA UM):
${materialsContext || "Nenhum material cadastrado. Recomende que o usuário cadastre materiais em Exegese → Materiais para pesquisas mais ricas."}

📝 ESBOÇOS ANTERIORES (${outlineCount} esboços):
${previousOutlinesContext || "Nenhum esboço anterior."}

🔍 ANÁLISES EXEGÉTICAS ANTERIORES:
${exegesisContext || "Nenhuma análise anterior."}

💬 CITAÇÕES SALVAS:
${quotesContext || "Nenhuma citação salva."}

🎨 PERFIL DE ESTILO DO USUÁRIO:
${userStyleContext || "Perfil ainda não construído (primeiro esboço)."}

========== FIM DOS DADOS INTERNOS ==========

INSTRUÇÕES PROATIVAS OBRIGATÓRIAS:
1. Analise CADA material interno — para cada um, diga SE e COMO é relevante PARA A SEÇÃO ATUAL
2. Forneça versículos bíblicos ACF COM O TEXTO COMPLETO do versículo (não só a referência)
3. Pesquise se o título/tema já foi pregado por pregadores conhecidos — traga nomes REAIS e links de busca
4. Traga recursos externos com links de BUSCA funcionais (Google/YouTube/Wikipedia)
5. Forneça ilustrações COMPLETAS prontas para uso (histórias com começo-meio-fim, dados com fonte)
6. A nota contextual deve ser DETALHADA e PERSONALIZADA — cite materiais internos pelo nome
7. currentSectionHelp deve dar instruções PASSO A PASSO do que escrever a seguir
8. Se o usuário tem citações salvas relevantes ao tema, sugira onde usá-las
9. Se há análises exegéticas anteriores sobre passagens relacionadas, mencione-as
10. NUNCA retorne resultados vazios — sempre traga pelo menos o mínimo de cada categoria

Responda APENAS com o JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde." }),
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

    let research;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        research = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", aiContent);
      research = {
        contextualNote: "Não foi possível processar a pesquisa neste momento. Continue escrevendo e tente novamente.",
        currentSectionHelp: "",
        internalSources: [],
        biblicalReferences: [],
        externalSources: [],
        dataAndIllustrations: [],
        similarSermons: [],
      };
    }

    return new Response(JSON.stringify(research), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Research error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
