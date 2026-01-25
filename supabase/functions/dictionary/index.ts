import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const allowedOrigins = [
  "https://readwise-notes.lovable.app",
  "https://id-preview--083acb00-7fa0-4d40-932e-1e8abb44986c.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface DictionaryRequest {
  word: string;
  context?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Autenticação necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Usuário não identificado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { word, context } = (await req.json()) as DictionaryRequest;

    if (!word) {
      return new Response(
        JSON.stringify({ error: "Palavra é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate word input
    const cleanWord = word.trim().slice(0, 100);
    if (!cleanWord || cleanWord.length < 1) {
      return new Response(
        JSON.stringify({ error: "Palavra inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let systemPrompt = `Você é um dicionário de língua portuguesa brasileiro especializado. Responda SEMPRE em JSON válido.

Para a palavra solicitada, forneça:
1. A palavra com separação silábica
2. Transcrição fonética (IPA)
3. Classe gramatical (substantivo masculino, verbo, adjetivo, etc.)
4. Lista de definições numeradas (até 5)
5. Sinônimos agrupados por sentido (ex: "Sentido de quantidade exata", "Sentido de imensidão")
6. Antônimos
7. Exemplos de uso em frases (até 3)
8. Etimologia
9. Observações linguísticas (usos coloquiais, regionalismos, formas diferentes)

Formato de resposta JSON:
{
  "palavra": "amor",
  "silabas": "a-mor",
  "fonetica": "/a'moɾ/",
  "classe": "Substantivo masculino",
  "definicoes": [
    "Sentimento de afeto, carinho e dedicação a alguém ou algo.",
    "Afeição profunda entre pessoas.",
    "Inclinação sexual ou desejo."
  ],
  "sinonimos": [
    {"sentido": "Sentido de afeição", "palavras": ["afeto", "carinho", "ternura"]},
    {"sentido": "Sentido de paixão", "palavras": ["paixão", "desejo", "atração"]}
  ],
  "antonimos": ["ódio", "indiferença", "desprezo"],
  "exemplos": [
    "O amor de uma mãe é incondicional.",
    "Eles vivem um grande amor."
  ],
  "etimologia": "Do latim amor, -ōris.",
  "observacoes": "Pode ser usado em diversas formas: romântico, fraternal, platônico, etc."
}`;

    let userPrompt = `Defina a palavra: "${cleanWord}"`;

    // Validate and sanitize context
    const cleanContext = context?.trim().slice(0, 500);
    
    if (cleanContext) {
      systemPrompt += `

IMPORTANTE: O usuário forneceu uma frase/contexto para análise. Você DEVE incluir o campo "analiseContexto" na resposta com TODOS os campos preenchidos.

Quando fornecido um contexto/frase, analise:
1. Qual o sentido específico da palavra nesse contexto
2. Explicação detalhada de por que esse sentido se aplica
3. Quais definições NÃO se aplicam a esse contexto
4. Sinônimos adequados para o contexto específico
5. Frase reescrita substituindo a palavra por sinônimo adequado
6. Observação adicional sobre o uso da palavra nesse contexto

O JSON DEVE incluir o campo analiseContexto com esta estrutura EXATA:
{
  ...campos anteriores...,
  "analiseContexto": {
    "frase": "a frase original fornecida pelo usuário",
    "sentidoIdentificado": "qual definição se aplica neste contexto",
    "explicacao": "explicação detalhada de por que esse sentido se aplica ao contexto",
    "sentidosNaoAplicaveis": ["lista de sentidos/definições que não se aplicam"],
    "sinonimosAdequados": ["lista de sinônimos que funcionam neste contexto específico"],
    "fraseReescrita": "frase original reescrita com um sinônimo adequado substituindo a palavra",
    "observacao": "nota adicional sobre o uso neste contexto"
  }
}

TODOS os campos de analiseContexto são OBRIGATÓRIOS quando um contexto é fornecido. Não deixe nenhum campo vazio.`;

      userPrompt = `Defina a palavra: "${cleanWord}"

CONTEXTO/FRASE PARA ANÁLISE OBRIGATÓRIA: "${cleanContext}"

IMPORTANTE: Inclua o campo "analiseContexto" com TODOS os campos preenchidos na resposta.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error("Erro ao processar requisição");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia do serviço");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonContent = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    const dictionaryResult = JSON.parse(jsonContent);

    return new Response(
      JSON.stringify(dictionaryResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: "Erro ao processar palavra" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
