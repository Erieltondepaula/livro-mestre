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

    // Fetch user's internal materials
    let materialsContext = "";
    try {
      const { data: materials } = await supabase
        .from("exegesis_materials")
        .select("title, description, theme, keywords, bible_references, material_category, author")
        .limit(50);

      if (materials && materials.length > 0) {
        materialsContext = materials.map((m: any) => {
          const parts = [`- "${m.title}" (${m.material_category})`];
          if (m.author) parts.push(`  Autor: ${m.author}`);
          if (m.theme) parts.push(`  Tema: ${m.theme}`);
          if (m.description) parts.push(`  Desc: ${m.description.substring(0, 150)}`);
          if (m.keywords?.length) parts.push(`  Palavras-chave: ${(m.keywords as string[]).join(", ")}`);
          if (m.bible_references?.length) parts.push(`  Refs: ${(m.bible_references as string[]).join(", ")}`);
          return parts.join("\n");
        }).join("\n\n");
      }
    } catch (e) {
      console.error("Error fetching materials:", e);
    }

    // Also fetch user's previous outlines
    let previousOutlinesContext = "";
    try {
      const { data: outlines } = await supabase
        .from("exegesis_outlines")
        .select("passage, outline_type, content, tags")
        .limit(20)
        .order("created_at", { ascending: false });

      if (outlines && outlines.length > 0) {
        previousOutlinesContext = outlines.map((o: any) => {
          const plainContent = o.content?.replace(/<[^>]+>/g, '').substring(0, 200) || '';
          return `- Passagem: ${o.passage} | Tipo: ${o.outline_type} | Preview: ${plainContent}`;
        }).join("\n");
      }
    } catch (e) {
      console.error("Error fetching outlines:", e);
    }

    let contextParts: string[] = [];
    if (previousElements) {
      if (previousElements.title) contextParts.push(`TÍTULO: ${previousElements.title}`);
      if (previousElements.theme) contextParts.push(`TEMA: ${previousElements.theme}`);
      if (previousElements.baseText) contextParts.push(`TEXTO BASE: ${previousElements.baseText}`);
      if (previousElements.introduction) contextParts.push(`INTRODUÇÃO: ${previousElements.introduction}`);
    }

    const systemPrompt = `Você é um pesquisador teológico PhD que auxilia pregadores na elaboração de sermões em TEMPO REAL. Você CONHECE a estrutura de sermão do pregador e deve fornecer pesquisas ESPECÍFICAS e ACIONÁVEIS.

${SERMON_STRUCTURE}

## REGRAS FUNDAMENTAIS:

1. **NUNCA invente URLs**. Se você não tem certeza de uma URL real, NÃO inclua o campo "url". Em vez disso, forneça um link de pesquisa no Google no formato: https://www.google.com/search?q=TERMO+DE+BUSCA
2. **Seja ESPECÍFICO**: Em vez de "pesquise sobre o tema", diga EXATAMENTE o que pesquisar e por quê
3. **Use fontes REAIS**: Cite pregadores REAIS, livros REAIS, comentários bíblicos REAIS
4. **Referências bíblicas COMPLETAS**: Sempre inclua o TEXTO do versículo (ACF), não apenas a referência
5. **Materiais internos**: Analise CADA material do usuário e indique COMO usá-lo nesta seção específica
6. **Pregações similares**: Para CADA pregação similar, forneça um link de pesquisa Google funcional

## FONTES DE PESQUISA QUE VOCÊ DEVE CONSIDERAR:

- **Google**: Pesquisas teológicas, artigos acadêmicos
- **YouTube**: Pregações filmadas de pastores conhecidos
- **Wikipedia**: Contexto histórico, geográfico, cultural
- **Comentários Bíblicos**: Matthew Henry, John MacArthur, Warren Wiersbe, F.B. Meyer, Charles Spurgeon
- **Pregadores brasileiros**: Hernandes Dias Lopes, Augustus Nicodemus, Caio Fábio, Ariovaldo Ramos
- **Pregadores internacionais**: John Piper, Tim Keller, Charles Spurgeon, Paul Washer, Martyn Lloyd-Jones
- **Livros teológicos**: Referências acadêmicas e devocionais

Retorne sugestões em 5 categorias:

1. **FONTES INTERNAS** - Materiais cadastrados do usuário relevantes para a seção ATUAL
2. **REFERÊNCIAS BÍBLICAS** - Versículos ACF COM o texto completo do versículo
3. **FONTES EXTERNAS** - Artigos, vídeos, livros, blogs com links de pesquisa Google funcionais
4. **DADOS E ILUSTRAÇÕES** - Estatísticas, dados históricos, ilustrações PRONTAS para uso
5. **PREGAÇÕES SIMILARES** - Pregações REAIS de pregadores REAIS sobre o mesmo tema/texto

FORMATO JSON:
{
  "contextualNote": "Uma nota proativa DETALHADA. Ex: 'O seu título [X] sobre [Y] foi abordado pelo Pr. Hernandes Dias Lopes na série Z. Ele focou em [aspecto]. Para a seção atual (Explicação do Ponto 1), recomendo consultar o comentário de Matthew Henry sobre [passagem] e o material [título] da sua biblioteca. Abaixo estão recursos específicos.'",
  "currentSectionHelp": "Ajuda ESPECÍFICA E DETALHADA para a seção atual. Ex: 'Na Explicação, você precisa aprofundar [conceito específico]. Sugestões: (1) Explique o contexto histórico de [cidade/época], (2) Analise a palavra [X] no grego/hebraico, (3) Compare com [passagem paralela], (4) Cite [autor] que desenvolveu esta ideia, (5) Aplique a [contexto contemporâneo].'",
  "internalSources": [
    { "materialTitle": "título exato do material", "relevance": "explicação detalhada de por que é relevante para ESTA seção", "suggestedUse": "instrução ESPECÍFICA de como usar. Ex: 'Use a citação da página X para fundamentar o argumento sobre Y na Explicação do Ponto 2'" }
  ],
  "biblicalReferences": [
    { "reference": "Livro Cap:Vers (ACF)", "text": "TEXTO COMPLETO do versículo na ACF", "connection": "como este versículo se conecta com ESTA seção específica do sermão", "type": "paralela|contraste|profecia|tipologia|doutrina" }
  ],
  "externalSources": [
    { "title": "título específico", "type": "artigo|video|livro|blog|documentario|pesquisa|comentario|pregacao", "description": "descrição detalhada do conteúdo e por que é útil", "url": "https://www.google.com/search?q=TERMOS+DE+BUSCA+RELEVANTES OU https://www.youtube.com/results?search_query=TERMOS", "relevance": "como usar este recurso NESTA seção", "preacherName": "nome se for pregação" }
  ],
  "dataAndIllustrations": [
    { "title": "título da ilustração", "content": "CONTEÚDO COMPLETO da ilustração, pronto para uso no sermão (mín. 3-4 frases)", "source": "fonte verificável", "suggestedPlacement": "exatamente onde usar (ex: Ilustração do Ponto 2, após a explicação sobre perdão)" }
  ],
  "similarSermons": [
    { "preacher": "nome REAL do pregador", "title": "título REAL da pregação", "approach": "descrição detalhada da abordagem (3-4 frases)", "difference": "sugestão ESPECÍFICA de como diferenciar (2-3 frases)", "url": "https://www.youtube.com/results?search_query=NOME+PREGADOR+TITULO+PREGACAO OU https://www.google.com/search?q=TERMOS" }
  ]
}

REGRAS CRÍTICAS PARA URLs:
- Para vídeos do YouTube: use https://www.youtube.com/results?search_query=TERMOS+SEPARADOS+POR+PLUS
- Para pesquisas gerais: use https://www.google.com/search?q=TERMOS+SEPARADOS+POR+PLUS
- Para Wikipedia: use https://pt.wikipedia.org/wiki/TERMO
- NUNCA invente um URL direto de vídeo (ex: youtube.com/watch?v=XXXX)
- NUNCA invente URLs de sites que você não tem certeza que existem`;

    const userMessage = `CONTEXTO DO SERMÃO:
${contextParts.length > 0 ? contextParts.join("\n") : "Início do sermão."}
${theme ? `\nTEMA CENTRAL: ${theme}` : ""}
${title ? `\nTÍTULO: ${title}` : ""}
${detectedPosition ? `\nSEÇÃO ATUAL DETECTADA: ${detectedPosition.currentSection} (${detectedPosition.guidance || ''})` : ""}

CONTEÚDO COMPLETO SENDO ESCRITO:
${content}

MATERIAIS CADASTRADOS DO USUÁRIO (ANALISE CADA UM):
${materialsContext || "Nenhum material cadastrado. Recomende que o usuário cadastre materiais em Exegese → Materiais."}

ESBOÇOS ANTERIORES DO USUÁRIO:
${previousOutlinesContext || "Nenhum esboço anterior."}

INSTRUÇÕES PROATIVAS OBRIGATÓRIAS:
1. Analise CADA material interno e indique SE e COMO é relevante para a seção ATUAL
2. Forneça versículos bíblicos ACF COM O TEXTO COMPLETO (não só a referência)
3. Pesquise se o título ou tema já foi pregado por pregadores conhecidos - forneça links de busca no YouTube/Google
4. Traga recursos externos com links de BUSCA funcionais (Google/YouTube), NUNCA URLs inventadas
5. Forneça ilustrações PRONTAS PARA USO (com conteúdo completo, não apenas descrições)
6. A nota contextual deve ser DETALHADA e PERSONALIZADA baseada no conteúdo escrito
7. currentSectionHelp deve dar instruções PASSO A PASSO do que escrever

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
        max_tokens: 6000,
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
        contextualNote: "",
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
