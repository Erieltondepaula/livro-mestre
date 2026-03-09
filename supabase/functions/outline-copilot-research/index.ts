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
          if (m.description) parts.push(`  Desc: ${m.description.substring(0, 100)}`);
          if (m.keywords?.length) parts.push(`  Palavras-chave: ${(m.keywords as string[]).join(", ")}`);
          if (m.bible_references?.length) parts.push(`  Refs: ${(m.bible_references as string[]).join(", ")}`);
          return parts.join("\n");
        }).join("\n\n");
      }
    } catch (e) {
      console.error("Error fetching materials:", e);
    }

    // Also fetch user's previous outlines to check if similar themes were used
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

    const systemPrompt = `Você é um pesquisador teológico especializado que auxilia pregadores na elaboração de sermões em TEMPO REAL. Você CONHECE a estrutura de sermão do pregador e deve fornecer pesquisas CONTEXTUAIS baseadas na seção que ele está escrevendo agora.

${SERMON_STRUCTURE}

IMPORTANTE: 
- Todas as referências bíblicas DEVEM ser da versão ACF (Almeida Corrigida Fiel)
- Você deve ser PROATIVO: baseado no título/tema, pesquise se esse tema já foi pregado por outros pregadores conhecidos e qual foi a abordagem deles
- Identifique a seção atual do sermão e traga recursos ESPECÍFICOS para essa seção

Retorne sugestões em 5 categorias:

1. **FONTES INTERNAS** - Materiais cadastrados do usuário relevantes
2. **REFERÊNCIAS BÍBLICAS** - Versículos ACF que fortaleçam o argumento DESTA seção
3. **FONTES EXTERNAS** - Artigos, vídeos, livros, blogs, pesquisas, comentários bíblicos
4. **DADOS E ILUSTRAÇÕES** - Estatísticas, dados históricos, ilustrações para ESTA seção
5. **PREGAÇÕES SIMILARES** (NOVO) - Se o título ou tema já foi pregado por outros, qual foi a abordagem? Sugira pregações conhecidas sobre o mesmo tema/texto para comparação

FORMATO JSON:
{
  "contextualNote": "Uma nota proativa como: 'Baseado no seu título X e tema Y, encontrei que o Pr. Fulano pregou sobre isso com abordagem Z. Aqui estão recursos para a seção que você está escrevendo agora (Explicação do Ponto 1).'",
  "currentSectionHelp": "Ajuda específica para a seção atual. Ex: 'Para a Explicação, você precisa de pelo menos 5 parágrafos fundamentando no texto base. Aqui estão fontes que podem ajudar.'",
  "internalSources": [
    { "materialTitle": "título", "relevance": "por quê", "suggestedUse": "como usar nesta seção" }
  ],
  "biblicalReferences": [
    { "reference": "Livro Cap:Vers (ACF)", "text": "texto do versículo", "connection": "conexão com esta seção", "type": "paralela|contraste|profecia|tipologia|doutrina" }
  ],
  "externalSources": [
    { "title": "título", "type": "artigo|video|livro|blog|documentario|pesquisa|comentario|pregacao", "description": "descrição", "url": "URL", "relevance": "por que consultar", "preacherName": "nome do pregador se for pregação" }
  ],
  "dataAndIllustrations": [
    { "title": "título", "content": "conteúdo", "source": "fonte", "suggestedPlacement": "onde usar (ex: Ilustração do Ponto 1)" }
  ],
  "similarSermons": [
    { "preacher": "nome do pregador", "title": "título da pregação", "approach": "qual foi a abordagem", "difference": "como diferenciar sua pregação", "url": "link se disponível" }
  ]
}`;

    const userMessage = `CONTEXTO DO SERMÃO:
${contextParts.length > 0 ? contextParts.join("\n") : "Início do sermão."}
${theme ? `\nTEMA CENTRAL: ${theme}` : ""}
${title ? `\nTÍTULO: ${title}` : ""}
${detectedPosition ? `\nSEÇÃO ATUAL DETECTADA: ${detectedPosition.currentSection} (${detectedPosition.guidance || ''})` : ""}

CONTEÚDO COMPLETO SENDO ESCRITO:
${content}

MATERIAIS CADASTRADOS DO USUÁRIO:
${materialsContext || "Nenhum material cadastrado."}

ESBOÇOS ANTERIORES DO USUÁRIO:
${previousOutlinesContext || "Nenhum esboço anterior."}

INSTRUÇÕES PROATIVAS:
1. Identifique materiais internos relevantes PARA A SEÇÃO ATUAL
2. Sugira versículos bíblicos (ACF) que fortaleçam o argumento DESTA seção
3. Pesquise se o título ou tema já foi pregado por pregadores conhecidos (ex: Hernandes Dias Lopes, Augusto Nicodemus, Paul Washer, John Piper, Charles Spurgeon, etc.) - qual foi a abordagem?
4. Traga recursos externos específicos para a seção (se é Ilustração, traga ilustrações; se é Explicação, traga comentários exegéticos)
5. Forneça dados e estatísticas relevantes
6. Escreva uma nota contextual proativa explicando suas descobertas

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
        max_tokens: 4000,
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
