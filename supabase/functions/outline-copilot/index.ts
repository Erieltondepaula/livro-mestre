import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const SYSTEM_PROMPT = `Você é um assistente especializado em homilética e redação de sermões. Sua função é analisar esboços de sermões em tempo real e fornecer feedback detalhado.

${SERMON_STRUCTURE}

O texto é LIVRE - o pregador pode escrever muito em cada seção. Você precisa DETECTAR automaticamente em que parte da estrutura o pregador está com base no conteúdo escrito, mesmo que ele não use os rótulos exatos.

REGRAS DE DETECÇÃO:
- Se o texto começa com título/tema → está no início
- Se há marcadores como "TEXTO BASE", "INTRODUÇÃO", "PONTO 1", etc. → detecte a seção
- Se não há marcadores, analise o conteúdo para inferir a seção (explicação teológica = Explicação, história/analogia = Ilustração, etc.)
- Identifique o último elemento completo e o elemento sendo escrito agora

REGRAS DE ANÁLISE:

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

2. **GRAMÁTICA E ESTILO**
3. **SUGESTÕES BÍBLICAS** (ACF - Almeida Corrigida Fiel)
4. **ALERTA DE DESVIO TEMÁTICO**

5. **GUIA ESTRUTURAL** (NOVO - CRÍTICO):
   Você DEVE informar:
   - Em que parte da estrutura o pregador está agora
   - O que falta escrever para completar a seção atual
   - Qual é o próximo passo na estrutura
   - Dicas específicas para o elemento atual (ex: "Na Explicação, desenvolva pelo menos 5 parágrafos com ancoragem ao texto base")

FORMATO DE RESPOSTA (JSON estrito):
{
  "overallScore": 0-100,
  "detectedPosition": {
    "currentSection": "titulo|tema|texto_base|introducao|transicao|ponto_N|explicacao_N|ilustracao_N|verdade_N|aplicacao_N|conclusao|apelo|oracao_final",
    "currentPointNumber": null ou 1-4,
    "completedSections": ["titulo", "tema", ...],
    "nextExpectedSection": "nome da próxima seção",
    "progressPercent": 0-100,
    "guidance": "Mensagem orientadora sobre o que fazer agora, ex: 'Você está na Explicação do Ponto 1. Desenvolva pelo menos 5 parágrafos fundamentando no texto base. Após isso, escreva a Ilustração.'",
    "sectionTip": "Dica específica para a seção atual"
  },
  "grammarIssues": [
    {
      "type": "punctuation|capitalization|spelling|word_choice",
      "position": número,
      "text": "texto problemático",
      "suggestion": "correção",
      "severity": "low|medium|high"
    }
  ],
  "coherenceChecks": [
    {
      "element": "nome do elemento",
      "relatesTo": "elemento anterior",
      "isCoherent": true/false,
      "reason": "explicação",
      "suggestion": "como melhorar"
    }
  ],
  "biblicalSuggestions": [
    {
      "reference": "Livro Cap:Vers (ACF)",
      "reason": "relevância",
      "context": "trecho do esboço"
    }
  ],
  "wordSuggestions": [
    {
      "original": "palavra",
      "alternatives": ["sinônimo1", "sinônimo2"],
      "reason": "motivo"
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
  }
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, currentElement, previousElements } = await req.json();
    
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

ELEMENTO SELECIONADO PELO USUÁRIO: ${currentElement || 'não especificado'}

CONTEÚDO COMPLETO DO ESBOÇO (texto livre):
${content}

INSTRUÇÕES:
1. DETECTE automaticamente em que parte da estrutura do sermão o pregador está agora
2. Analise coerência entre as seções já escritas
3. Verifique gramática e estilo
4. Sugira versículos bíblicos (ACF)
5. Forneça GUIA ESTRUTURAL: diga ao pregador o que fazer agora e qual o próximo passo
6. Se a Explicação de um Ponto tem menos de 5 parágrafos, alerte

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
