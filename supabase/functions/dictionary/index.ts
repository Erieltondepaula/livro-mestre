import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DictionaryRequest {
  word: string;
  context?: string;
  isBiblical?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { word, context, isBiblical } = (await req.json()) as DictionaryRequest;

    if (!word) {
      return new Response(
        JSON.stringify({ error: "Palavra é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Biblical Hebrew/Greek section for the prompt
    const biblicalSection = isBiblical ? `

IMPORTANTE: Esta palavra tem contexto bíblico. Você DEVE incluir o campo "originalBiblico" na resposta com informações do hebraico e/ou grego bíblico.

Siga o padrão de léxicos como Strong's Concordance, Dicionário Vine e Champlin para fornecer:
- A palavra original em hebraico (se Antigo Testamento) e/ou grego (se Novo Testamento)
- Transliteração
- Número de Strong (se aplicável)
- Significado original na língua bíblica
- Raiz etimológica na língua original
- Usos no texto bíblico com referências
- Variações de tradução em diferentes versões

O campo "originalBiblico" deve ter esta estrutura:
{
  "hebraico": {
    "palavra": "a palavra em caracteres hebraicos",
    "transliteracao": "transliteração latina",
    "strongNumber": "H1234 (número de Strong)",
    "significado": "significado original em hebraico",
    "raiz": "raiz etimológica hebraica",
    "usosBiblicos": ["Gn 1:1 - contexto de uso", "Sl 23:1 - contexto de uso"],
    "observacoes": "notas sobre uso no AT"
  },
  "grego": {
    "palavra": "a palavra em caracteres gregos",
    "transliteracao": "transliteração latina",
    "strongNumber": "G1234 (número de Strong)",
    "significado": "significado original em grego",
    "raiz": "raiz etimológica grega",
    "usosBiblicos": ["Jo 3:16 - contexto de uso", "Rm 8:28 - contexto de uso"],
    "observacoes": "notas sobre uso no NT"
  },
  "notasTeologicas": "observações teológicas sobre o uso e evolução do termo nas Escrituras",
  "variacoesTraducao": ["como aparece na ARA", "como aparece na NVI", "como aparece na ARC"]
}

Se a palavra existe apenas no AT, preencha apenas "hebraico". Se apenas no NT, apenas "grego". Se em ambos, preencha os dois.
Se não encontrar número de Strong específico, use "N/A" mas forneça as demais informações.` : '';

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
}${biblicalSection}`;

    let userPrompt = `Defina a palavra: "${cleanWord}"`;

    if (isBiblical) {
      userPrompt += `\n\nEsta é uma palavra com contexto BÍBLICO. Inclua obrigatoriamente o campo "originalBiblico" com os termos originais em hebraico e/ou grego, seguindo o padrão de léxicos bíblicos como Strong's Concordance.`;
    }

    const cleanContext = context?.trim().slice(0, 1000);
    
    if (cleanContext) {
      systemPrompt += `

IMPORTANTE: O usuário forneceu uma frase/contexto para análise profunda. Você DEVE incluir o campo "analiseContexto" na resposta.

Este módulo de Análise de Contexto complementa o dicionário. O objetivo é aprofundar a compreensão semântica da palavra, unindo léxico, semântica, intenção e aplicação prática, de forma clara tanto para iniciantes quanto para leitores avançados.

REGRAS OBRIGATÓRIAS:
- A análise deve considerar SOMENTE o contexto fornecido
- Não generalizar além da frase analisada
- Linguagem clara, progressiva e precisa
- Profundidade sem complicação desnecessária

O JSON DEVE incluir o campo analiseContexto com esta estrutura EXATA e TODOS os campos preenchidos:
{
  ...campos anteriores do dicionário...,
  "analiseContexto": {
    "frase": "a frase original fornecida pelo usuário (copie exatamente)",
    "palavraChave": "a palavra analisada",
    "classeGramatical": "a classe gramatical da palavra neste contexto (substantivo, adjetivo, verbo, etc.)",
    "sentidoIdentificado": "definição clara, objetiva e contextualizada do sentido usado (sem copiar literalmente o dicionário)",
    "explicacao": "explique COMO a palavra funciona dentro da frase, POR QUE foi usada ali e O QUE ela comunica naquele contexto específico",
    "usoComumVsTecnico": "diferencie, se aplicável, o sentido popular do sentido técnico, histórico ou acadêmico",
    "sinonimosAdequados": ["liste APENAS sinônimos que podem substituir a palavra SEM alterar o sentido da frase"],
    "exemploSimples": "explique o sentido com uma frase curta, concreta e acessível, compreensível por uma criança",
    "observacaoNuance": "indique limites do uso da palavra, o que ela NÃO quer dizer ou possíveis confusões",
    "fraseReescrita": "reescreva a frase original substituindo a palavra por um sinônimo adequado, mantendo o sentido",
    "aplicacaoPratica": "explique por que compreender corretamente essa palavra melhora a leitura, a comunicação ou a interpretação do texto"
  }
}

TODOS os campos de analiseContexto são OBRIGATÓRIOS. Não deixe nenhum campo vazio ou null.`;

      userPrompt = `Defina a palavra: "${cleanWord}"

CONTEXTO/FRASE PARA ANÁLISE OBRIGATÓRIA: "${cleanContext}"

IMPORTANTE: Inclua o campo "analiseContexto" com TODOS os 11 campos preenchidos na resposta. Este é um módulo de análise profunda, não apenas definição.`;

      if (isBiblical) {
        userPrompt += `\n\nEsta é uma palavra com contexto BÍBLICO. Inclua também o campo "originalBiblico" com os termos originais em hebraico e/ou grego.`;
      }
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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione fundos à sua conta Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Erro ao processar requisição");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia do serviço");
    }

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
    console.error("Dictionary error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar palavra" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
