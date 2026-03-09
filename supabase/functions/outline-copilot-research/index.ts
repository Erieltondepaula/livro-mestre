import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, currentElement, theme, title, previousElements } = await req.json();

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

    // Get auth token to query user's materials
    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Fetch user's internal materials for context
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

    // Build context
    let contextParts: string[] = [];
    if (previousElements) {
      if (previousElements.title) contextParts.push(`TÍTULO: ${previousElements.title}`);
      if (previousElements.theme) contextParts.push(`TEMA: ${previousElements.theme}`);
      if (previousElements.baseText) contextParts.push(`TEXTO BASE: ${previousElements.baseText}`);
      if (previousElements.introduction) contextParts.push(`INTRODUÇÃO: ${previousElements.introduction}`);
    }

    const systemPrompt = `Você é um pesquisador teológico especializado que auxilia pregadores na elaboração de sermões. Sua função é buscar e sugerir fontes relevantes que enriqueçam o sermão sendo elaborado.

IMPORTANTE: Todas as referências bíblicas DEVEM ser da versão Almeida Corrigida Fiel (ACF).

Você deve retornar sugestões de pesquisa em 4 categorias:

1. **FONTES INTERNAS** (baseado nos materiais do usuário):
   Analise os materiais cadastrados e identifique quais são relevantes para o conteúdo atual.

2. **REFERÊNCIAS BÍBLICAS CONTEXTUAIS**:
   Versículos, passagens paralelas e textos da ACF que se conectam diretamente com o que está sendo escrito.

3. **FONTES EXTERNAS SUGERIDAS** (pesquisa na web):
   Sugira artigos de Wikipedia, blogs teológicos, livros conhecidos, comentários bíblicos, vídeos, documentários e pesquisas acadêmicas que o pregador deveria consultar. Inclua URLs quando possível.

4. **DADOS E ILUSTRAÇÕES**:
   Estatísticas, dados históricos, arqueológicos ou culturais que poderiam enriquecer o sermão.

FORMATO DE RESPOSTA (JSON estrito):
{
  "internalSources": [
    {
      "materialTitle": "título do material encontrado",
      "relevance": "por que é relevante para o conteúdo atual",
      "suggestedUse": "como usar no sermão"
    }
  ],
  "biblicalReferences": [
    {
      "reference": "Livro Capítulo:Versículo (ACF)",
      "text": "texto do versículo se disponível",
      "connection": "como se conecta ao conteúdo atual",
      "type": "paralela|contraste|profecia|tipologia|doutrina"
    }
  ],
  "externalSources": [
    {
      "title": "título do recurso",
      "type": "artigo|video|livro|blog|documentario|pesquisa|comentario",
      "description": "breve descrição do conteúdo",
      "url": "URL sugerida se aplicável",
      "relevance": "por que consultar este recurso"
    }
  ],
  "dataAndIllustrations": [
    {
      "title": "título do dado/ilustração",
      "content": "o dado, estatística ou ilustração em si",
      "source": "fonte do dado",
      "suggestedPlacement": "onde usar no sermão (ex: introdução, ponto 1, etc)"
    }
  ]
}`;

    const userMessage = `CONTEXTO DO SERMÃO:
${contextParts.length > 0 ? contextParts.join("\n") : "Início do sermão."}
${theme ? `\nTEMA CENTRAL: ${theme}` : ""}
${title ? `\nTÍTULO: ${title}` : ""}

ELEMENTO ATUAL: ${currentElement || "não especificado"}

CONTEÚDO SENDO ESCRITO:
${content}

MATERIAIS DO USUÁRIO CADASTRADOS:
${materialsContext || "Nenhum material cadastrado."}

Com base no conteúdo sendo escrito e no contexto do sermão:
1. Identifique materiais internos relevantes
2. Sugira versículos bíblicos (ACF) que fortaleçam o argumento
3. Recomende fontes externas (artigos Wikipedia, vídeos, livros, blogs teológicos, pesquisas)
4. Forneça dados, estatísticas ou ilustrações úteis

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 3000,
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
        internalSources: [],
        biblicalReferences: [],
        externalSources: [],
        dataAndIllustrations: [],
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
