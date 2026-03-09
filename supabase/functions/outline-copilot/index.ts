import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SermonElement {
  type: 'titulo' | 'tema' | 'texto_base' | 'introducao' | 'ponto' | 'desenvolvimento' | 'ilustracao' | 'frase_efeito' | 'aplicacao' | 'conclusao' | 'apelo' | 'outro';
  content: string;
  position: number;
}

interface CoherenceCheck {
  element: string;
  relatesTo: string;
  isCoherent: boolean;
  reason?: string;
  suggestion?: string;
}

interface CopilotAnalysis {
  overallScore: number;
  grammarIssues: {
    type: 'punctuation' | 'capitalization' | 'spelling' | 'word_choice';
    position: number;
    text: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  coherenceChecks: CoherenceCheck[];
  biblicalSuggestions: {
    reference: string;
    reason: string;
    context: string;
  }[];
  wordSuggestions: {
    original: string;
    alternatives: string[];
    reason: string;
  }[];
  thematicAlert?: {
    isOffTopic: boolean;
    message: string;
    currentElement: string;
    expectedConnection: string;
  };
  structureAnalysis: {
    hasTitle: boolean;
    hasTheme: boolean;
    hasBaseText: boolean;
    hasIntroduction: boolean;
    pointsCount: number;
    hasConclusion: boolean;
    hasAppeal: boolean;
  };
}

const SYSTEM_PROMPT = `Você é um assistente especializado em homilética e redação de sermões. Sua função é analisar esboços de sermões em tempo real e fornecer feedback detalhado.

REGRAS DE ANÁLISE:

1. **COERÊNCIA EM CADEIA** (CRÍTICO):
   - O TEMA deve estar alinhado com o TEXTO BASE
   - A INTRODUÇÃO deve apresentar e conectar-se ao TEMA
   - Cada PONTO deve desenvolver um aspecto do TEMA e conectar-se à INTRODUÇÃO
   - O DESENVOLVIMENTO de cada ponto deve aprofundar especificamente aquele PONTO
   - A ILUSTRAÇÃO deve exemplificar o DESENVOLVIMENTO do ponto atual
   - A FRASE DE EFEITO deve sintetizar o DESENVOLVIMENTO
   - A APLICAÇÃO deve ser prática e derivar do que foi ensinado
   - A CONCLUSÃO deve retomar o TEMA e os PONTOS principais
   - O APELO deve ser consequência natural de tudo que foi dito

2. **GRAMÁTICA E ESTILO**:
   - Verificar pontuação (vírgulas, pontos, dois-pontos)
   - Verificar maiúsculas no início de frases
   - Identificar palavras repetitivas e sugerir sinônimos
   - Verificar concordância verbal e nominal

3. **SUGESTÕES BÍBLICAS**:
   - Baseado no conteúdo escrito, sugerir versículos da ACF (Almeida Corrigida Fiel)
   - Priorizar textos que reforcem o argumento atual
   - Considerar o contexto teológico

4. **ALERTA DE DESVIO TEMÁTICO**:
   - Se o conteúdo atual não se conecta logicamente ao que veio antes, ALERTAR IMEDIATAMENTE
   - Explicar qual era a conexão esperada
   - Sugerir como retornar ao tema

FORMATO DE RESPOSTA (JSON estrito):
{
  "overallScore": 0-100,
  "grammarIssues": [
    {
      "type": "punctuation|capitalization|spelling|word_choice",
      "position": número_aproximado_de_caracteres,
      "text": "texto problemático",
      "suggestion": "correção sugerida",
      "severity": "low|medium|high"
    }
  ],
  "coherenceChecks": [
    {
      "element": "nome do elemento atual",
      "relatesTo": "nome do elemento anterior",
      "isCoherent": true/false,
      "reason": "explicação",
      "suggestion": "como melhorar se não coerente"
    }
  ],
  "biblicalSuggestions": [
    {
      "reference": "Livro Capítulo:Versículo (ACF)",
      "reason": "por que esse versículo é relevante",
      "context": "o trecho do esboço que motivou a sugestão"
    }
  ],
  "wordSuggestions": [
    {
      "original": "palavra atual",
      "alternatives": ["sinônimo1", "sinônimo2"],
      "reason": "por que considerar a troca"
    }
  ],
  "thematicAlert": {
    "isOffTopic": true/false,
    "message": "Mensagem de alerta se fugiu do tema",
    "currentElement": "elemento que fugiu",
    "expectedConnection": "qual era a conexão esperada"
  },
  "structureAnalysis": {
    "hasTitle": true/false,
    "hasTheme": true/false,
    "hasBaseText": true/false,
    "hasIntroduction": true/false,
    "pointsCount": número,
    "hasConclusion": true/false,
    "hasAppeal": true/false
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

    // Build context from previous elements
    let contextParts: string[] = [];
    if (previousElements) {
      if (previousElements.title) contextParts.push(`TÍTULO: ${previousElements.title}`);
      if (previousElements.theme) contextParts.push(`TEMA: ${previousElements.theme}`);
      if (previousElements.baseText) contextParts.push(`TEXTO BASE: ${previousElements.baseText}`);
      if (previousElements.introduction) contextParts.push(`INTRODUÇÃO: ${previousElements.introduction}`);
      if (previousElements.points && previousElements.points.length > 0) {
        previousElements.points.forEach((p: any, i: number) => {
          contextParts.push(`PONTO ${i + 1}: ${p.title || ''}`);
          if (p.development) contextParts.push(`  DESENVOLVIMENTO: ${p.development}`);
          if (p.illustration) contextParts.push(`  ILUSTRAÇÃO: ${p.illustration}`);
          if (p.phrase) contextParts.push(`  FRASE DE EFEITO: ${p.phrase}`);
          if (p.application) contextParts.push(`  APLICAÇÃO: ${p.application}`);
        });
      }
      if (previousElements.conclusion) contextParts.push(`CONCLUSÃO: ${previousElements.conclusion}`);
    }

    const userMessage = `CONTEXTO DO SERMÃO ATÉ AGORA:
${contextParts.length > 0 ? contextParts.join('\n') : 'Nenhum elemento anterior ainda.'}

ELEMENTO ATUAL SENDO EDITADO: ${currentElement || 'não especificado'}

CONTEÚDO PARA ANÁLISE:
${content}

Analise este conteúdo seguindo todas as regras. Verifique especialmente:
1. Se este elemento mantém coerência com os anteriores
2. Problemas gramaticais e de pontuação
3. Sugestões de versículos bíblicos relevantes (ACF)
4. Palavras que poderiam ser melhoradas
5. Se está fugindo do tema central

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
        max_tokens: 2000,
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

    // Try to parse JSON from response
    let analysis: CopilotAnalysis;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", aiContent);
      // Return a default structure if parsing fails
      analysis = {
        overallScore: 70,
        grammarIssues: [],
        coherenceChecks: [],
        biblicalSuggestions: [],
        wordSuggestions: [],
        structureAnalysis: {
          hasTitle: false,
          hasTheme: false,
          hasBaseText: false,
          hasIntroduction: false,
          pointsCount: 0,
          hasConclusion: false,
          hasAppeal: false,
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
