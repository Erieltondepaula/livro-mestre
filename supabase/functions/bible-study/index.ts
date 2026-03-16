import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em teologia, hermenêutica e estudo bíblico. Seu papel é analisar materiais de estudo bíblico fornecidos pelo usuário e gerar análises completas e didáticas.

## REGRAS:
- Responda SEMPRE em português brasileiro
- Use linguagem clara e acessível
- Formate em Markdown com títulos e seções claras
- Cite referências bíblicas usando a versão Almeida Corrigida Fiel (ACF)
- Quando citar materiais do usuário, use o formato: 「citação」(Fonte)
- Seja teologicamente preciso e academicamente responsável
- Apresente múltiplas perspectivas quando houver divergência teológica

## FONTES EXTERNAS:
Quando usar informações de sua base de conhecimento (não fornecidas pelo usuário), marque claramente com:
🌐 **Fonte Externa:** [descrição da fonte]
O usuário poderá decidir se aprova, ignora ou adiciona ao estudo.`;

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { content, analysis_type, materials_context, devotionals_context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userPrompt = "";

    const materialsSection = materials_context
      ? `\n\n---\n**📚 MATERIAIS DE REFERÊNCIA DO USUÁRIO:**\n${materials_context}\n---\n`
      : "";

    const devotionalsSection = devotionals_context
      ? `\n\n---\n**📖 DEVOCIONAIS DO USUÁRIO (usar como fonte de análise):**\n${devotionals_context}\n---\n`
      : "";

    switch (analysis_type) {
      case "complete_study":
        userPrompt = `Analise o seguinte material de estudo bíblico e gere uma análise COMPLETA:

**MATERIAL FORNECIDO:**
${content}
${materialsSection}${devotionalsSection}

Gere a análise com as seguintes seções:

## 📝 RESUMO SIMPLIFICADO
Um resumo claro e conciso do material, acessível a qualquer pessoa.

## 📖 EXPLICAÇÃO DIDÁTICA
Explique o conteúdo de forma detalhada e didática, como se estivesse ensinando a alguém que está começando a estudar a Bíblia.

## 🎯 PRINCIPAIS PONTOS DO ESTUDO
Liste os pontos mais importantes extraídos do material, numerados e organizados.

## ❓ PERGUNTAS PARA REFLEXÃO
Gere perguntas relevantes baseadas no conteúdo (mínimo 5 perguntas).

## ✅ RESPOSTAS
Forneça respostas detalhadas e bem fundamentadas para cada pergunta.

## 💡 APLICAÇÕES PRÁTICAS
Como aplicar os ensinamentos na vida cotidiana. Seja específico e prático.

## 🔗 REFERÊNCIAS BÍBLICAS RELACIONADAS
Liste passagens bíblicas que complementam ou aprofundam o estudo, com o texto na ACF.`;
        break;

      case "summary":
        userPrompt = `Faça um RESUMO SIMPLIFICADO do seguinte material:

${content}
${materialsSection}

O resumo deve ser:
- Claro e acessível
- Destacar os pontos principais
- Manter a fidelidade ao conteúdo original
- Incluir referências bíblicas relevantes (ACF)`;
        break;

      case "questions":
        userPrompt = `Com base no seguinte material, gere PERGUNTAS E RESPOSTAS para estudo:

${content}
${materialsSection}

Gere:
1. 10 perguntas de compreensão (verificar entendimento)
2. 5 perguntas de reflexão (aplicação pessoal)
3. 3 perguntas de aprofundamento (para estudo avançado)

Para CADA pergunta, forneça uma resposta detalhada e bem fundamentada com referências bíblicas (ACF).`;
        break;

      case "practical_applications":
        userPrompt = `Com base no seguinte material, extraia APLICAÇÕES PRÁTICAS:

${content}
${materialsSection}

Para cada aplicação:
1. Identifique o princípio bíblico
2. Explique como se aplica hoje
3. Dê um exemplo prático e específico
4. Sugira uma ação concreta que a pessoa pode fazer esta semana
5. Inclua versículo de apoio (ACF)`;
        break;

      case "devotional_generation":
        userPrompt = `Com base no seguinte material e nos devocionais existentes do usuário, gere um NOVO DEVOCIONAL:

**MATERIAL BASE:**
${content}
${materialsSection}${devotionalsSection}

O devocional deve:
1. Identificar temas em comum com os devocionais existentes
2. Comparar conteúdos e reutilizar conceitos relevantes
3. Ter uma estrutura clara: Texto Base → Reflexão → Aplicação → Oração
4. Ser original mas conectado ao acervo do usuário
5. Incluir referências bíblicas na ACF`;
        break;

      default:
        userPrompt = `Analise o seguinte conteúdo de estudo bíblico:\n\n${content}\n${materialsSection}${devotionalsSection}\nForneça uma análise completa com resumo, pontos principais, perguntas e aplicações práticas.`;
    }

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
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("bible-study error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
