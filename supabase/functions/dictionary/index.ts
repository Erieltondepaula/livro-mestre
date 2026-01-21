import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DictionaryRequest {
  word: string;
  context?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, context } = (await req.json()) as DictionaryRequest;

    if (!word) {
      return new Response(
        JSON.stringify({ error: "Palavra é obrigatória" }),
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

    let userPrompt = `Defina a palavra: "${word}"`;

    if (context) {
      systemPrompt += `

Quando fornecido um contexto/frase, também analise:
10. Qual o sentido específico da palavra nesse contexto
11. Sinônimos adequados para o contexto
12. Sentidos que NÃO se aplicam ao contexto
13. Frase reescrita com sinônimo adequado
14. Observação sobre o uso da palavra nesse contexto

Adicione ao JSON:
{
  ...campos anteriores...,
  "analiseContexto": {
    "frase": "a frase original",
    "sentidoIdentificado": "qual definição se aplica",
    "explicacao": "explicação de por que esse sentido se aplica",
    "sentidosNaoAplicaveis": ["sentidos que não se aplicam"],
    "sinonimosAdequados": ["sinônimos que funcionam neste contexto"],
    "fraseReescrita": "frase com sinônimo substituto",
    "observacao": "nota sobre o uso"
  }
}`;
      userPrompt = `Defina a palavra: "${word}"

Contexto/frase para análise: "${context}"`;
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
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data).slice(0, 200));
    
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response:", JSON.stringify(data));
      throw new Error("No response from AI - empty content");
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
    console.error("Error in dictionary function:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar palavra";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
