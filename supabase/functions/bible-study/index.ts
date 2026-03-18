import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um Especialista em Hermenêutica, Exegese Bíblica e Educação Cristã (EBD).
Sua função é transformar conteúdos brutos em estudos bíblicos estruturados, profundos, organizados e aplicáveis, com fidelidade absoluta às Escrituras.

## 🧠 CONEXÃO COM BASE DE CONHECIMENTO
Antes de gerar qualquer resposta, UTILIZE obrigatoriamente os materiais de referência fornecidos (Exegese Bíblica >> Materiais) para:
- Garantir precisão doutrinária
- Aprofundar a exegese
- Evitar interpretações superficiais

## 📥 PROCESSAMENTO DE ENTRADA (MULTIFORMATO)
Você deve interpretar conteúdos vindos de:
- 📄 Documentos (texto extraído de PDF, Word, TXT)
- 🖼️ Imagens (OCR + INTERPRETAÇÃO — se receber descrição de imagem, extraia todo texto e interprete o contexto visual)
- 🎧 Áudio/Vídeo (transcrição fornecida)

### 🖼️ REGRA PARA IMAGENS
Ao receber descrição de imagem:
- Extrair TODO o texto visível (OCR)
- Descrever o conteúdo visual (gráfico, pessoas, cenário)
- Contexto (página de livro, anotação, slide)
- Transformar em conteúdo utilizável no estudo

## 🔹 FONTES EXTERNAS
Quando usar informações de sua base de conhecimento geral (não fornecidas pelo usuário), marque claramente com:
🌐 **Fonte Externa:** [descrição da fonte]
O usuário poderá decidir se aprova, ignora ou adiciona ao estudo.

## 📤 REGRAS DE SAÍDA
- Formato: Markdown estruturado
- Usar: #, ##, ###, negrito, listas, blocos de citação
- Sempre incluir referências bíblicas (Almeida Corrigida Fiel - ACF)
- Clareza visual e organização por seções
- Usar emojis nos títulos das seções para facilitar navegação

## 💬 SISTEMA DE COMENTÁRIOS
Inserir blocos de comentário editáveis nas seções principais:
\`\`\`
[COMENTÁRIO]
Digite aqui sua anotação...
\`\`\`

## ⚠️ REGRAS CRÍTICAS
- Sempre ter título claro e bíblico
- Sempre ter estrutura organizada
- Nunca gerar conteúdo solto sem estrutura
- Sempre interpretar imagens corretamente quando fornecidas
- Fidelidade bíblica total
- Clareza + profundidade
- Aplicação prática
- Formação espiritual`;

const STUDY_PROMPTS: Record<string, string> = {
  complete_study: `Gere um ESTUDO BÍBLICO COMPLETO seguindo EXATAMENTE esta estrutura:

# 🏷️ TÍTULO DO ESTUDO
Claro, bíblico e temático

## 📖 PÁGINA 1 — LENDO A PALAVRA
- Texto bíblico principal (com referência completa ACF)
- Versículos formatados
- Texto complementar (se houver)

### ❤️ GUARDE NO CORAÇÃO
Verdade central do estudo

## 📖 PÁGINA 2 — ESTUDANDO A PALAVRA
### Introdução
Contexto bíblico e explicação acessível + teológica

### 🔍 DESCOBRINDO A VERDADE
Definições e explicações centrais

### 📚 TÓPICOS PRINCIPAIS
Para cada tópico (I, II, III, IV...):
- Subtópicos (1, 2, 3…)
- Explicação bíblica
- Referências ACF

### 🧠 COMPREENDENDO A VERDADE
Consolidação do ensino

### 🔥 APLICANDO A VERDADE
Aplicações práticas para:
- Vida Pessoal
- Família
- Igreja
- Trabalho/Sociedade

### 💭 PENSE NISSO
Frase de impacto

### ❓ PERGUNTAS PARA DISCUSSÃO
3 a 5 perguntas para estudo em grupo

## 🔗 REFERÊNCIAS BÍBLICAS RELACIONADAS
Passagens que complementam o estudo, com texto na ACF.`,

  summary: `Faça um RESUMO SIMPLIFICADO com:
- Tópicos objetivos e claros
- Pontos principais destacados
- Fidelidade ao conteúdo original
- Referências bíblicas relevantes (ACF)
- Conclusão sintética`,

  questions: `Gere PERGUNTAS E RESPOSTAS para estudo:
1. 10 perguntas de compreensão (verificar entendimento)
2. 5 perguntas de reflexão (aplicação pessoal)
3. 3 perguntas de aprofundamento (para estudo avançado)
Para CADA pergunta, forneça resposta detalhada com referências bíblicas (ACF).`,

  practical_applications: `Extraia APLICAÇÕES PRÁTICAS 100% concretas:
Para cada aplicação:
1. Identifique o princípio bíblico
2. Explique como se aplica hoje
3. Dê exemplo prático e específico
4. Sugira ação concreta para esta semana
5. Inclua versículo de apoio (ACF)`,

  devotional_generation: `Gere um NOVO DEVOCIONAL com esta estrutura:
1. Texto Base (versículo principal ACF)
2. Reflexão (conectada ao material e devocionais existentes)
3. Aplicação (prática e pessoal)
4. Oração (inspirativa e conectada ao tema)
Identifique temas em comum com devocionais existentes e reutilize conceitos relevantes.`,
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { content, analysis_type, user_id } = await req.json();
    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: "Conteúdo não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch materials from DB if user_id provided
    let materialsContext = "";
    let devotionalsContext = "";
    if (user_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, supabaseKey);

        const { data: materials } = await sb
          .from("exegesis_materials")
          .select("title, description, theme, author, material_category, content_origin")
          .eq("user_id", user_id)
          .limit(50);

        if (materials?.length) {
          materialsContext = "\n\n---\n**📚 BASE DE CONHECIMENTO DO USUÁRIO (Exegese Bíblica >> Materiais):**\nUse estes materiais como referência obrigatória para embasar a análise:\n" +
            materials.map(m => `- [${m.material_category}] "${m.title}"${m.author ? ` por ${m.author}` : ""}${m.theme ? ` | Tema: ${m.theme}` : ""}${m.description ? ` — ${m.description.substring(0, 300)}` : ""}`).join("\n") +
            "\n---\n";

          devotionalsContext = materials
            .filter(m => m.material_category === "devocional")
            .map(m => `- "${m.title}"${m.author ? ` (${m.author})` : ""}${m.theme ? ` [Tema: ${m.theme}]` : ""}${m.description ? `: ${m.description.substring(0, 200)}` : ""}`)
            .join("\n");
          if (devotionalsContext) {
            devotionalsContext = "\n\n---\n**📖 DEVOCIONAIS EXISTENTES DO USUÁRIO:**\n" + devotionalsContext + "\n---\n";
          }
        }
      } catch (e) {
        console.error("Error fetching materials:", e);
      }
    }

    const promptTemplate = STUDY_PROMPTS[analysis_type] || STUDY_PROMPTS.complete_study;

    const userPrompt = `Analise o seguinte material e ${promptTemplate}

**MATERIAL FORNECIDO PELO USUÁRIO:**
${content}
${materialsContext}${analysis_type === "devotional_generation" ? devotionalsContext : ""}`;

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
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("bible-study error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
