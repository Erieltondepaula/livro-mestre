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
  complete_study: `Gere um ESTUDO BÍBLICO COMPLETO, PROFUNDO e ESTRUTURADO seguindo EXATAMENTE esta estrutura:

# 🏷️ TÍTULO DO ESTUDO
(Claro, bíblico, temático — máx 10 palavras)

---

## 📖 PÁGINA 1 — LENDO A PALAVRA

### 📜 Texto Bíblico Principal
- Escreva a passagem COMPLETA (versículos escritos por extenso, versão ACF)
- Não coloque apenas referência — escreva o texto INTEIRO
- Se o material citar outros textos, inclua-os como complemento

### 📋 Contexto Histórico-Cultural
- **Autor:** Quem escreveu e em que circunstâncias
- **Destinatários:** Para quem e qual a situação
- **Época:** Contexto político, social e religioso
- **Propósito:** Por que este texto foi escrito

### ❤️ GUARDE NO CORAÇÃO
> Verdade central do estudo em UMA frase poderosa

---

## 📖 PÁGINA 2 — ESTUDANDO A PALAVRA

### 🎯 Introdução
- Contextualização com a realidade ATUAL do leitor
- Por que este texto é relevante HOJE?
- Qual o problema humano que este texto responde?
- Conexão emocional com o leitor (identificação)

### 🔍 DESCOBRINDO A VERDADE
- Palavras-chave no original (hebraico/grego) com significado prático
- Definições bíblicas fundamentais (não genéricas)
- O que este texto NÃO está dizendo (evitar interpretações erradas)

### 📚 TÓPICOS PRINCIPAIS (mínimo 4 tópicos)
Para CADA tópico (I, II, III, IV):
- **Título claro e bíblico**
- Versículo base ESCRITO POR EXTENSO (ACF)
- Subtópicos desenvolvidos (1, 2, 3…) com:
  - Explicação bíblica PROFUNDA (mínimo 2 parágrafos)
  - Conexão com o original (hebraico/grego quando relevante)
  - Referências cruzadas (mínimo 2 por subtópico, ACF)
  - Ilustração prática do cotidiano
- **Aplicação do tópico:** Como isso muda minha vida ESTA SEMANA?

### 🧠 COMPREENDENDO A VERDADE
- Síntese do que aprendemos (conectando todos os tópicos)
- Como os tópicos se complementam e formam um todo coerente
- Quadro resumo dos pontos principais
- Erros comuns de interpretação a evitar

### 🔥 APLICANDO A VERDADE
Aplicações CONCRETAS e ESPECÍFICAS (não genéricas!) para:
- **Vida Pessoal:** Ação específica para esta semana
- **Família:** Como aplicar no lar, com cônjuge e filhos
- **Igreja:** Como impacta a vida comunitária
- **Trabalho/Sociedade:** Testemunho prático no mundo

### 🪞 AUTOEXAME
- 5 perguntas de reflexão pessoal profundas
- Cada pergunta deve gerar um desconforto santo (confronto amoroso)

### 💭 PENSE NISSO
> Frase de impacto que fica na mente (curta, forte, memorável)

### ❓ PERGUNTAS PARA DISCUSSÃO EM GRUPO
- 5 a 8 perguntas progressivas (da compreensão à aplicação)
- Para cada pergunta, indique o objetivo (compreensão, reflexão ou ação)

---

## 📖 PÁGINA 3 — APLICANDO A VERDADE

### 📅 Plano Devocional da Semana
- **Dia 1-2:** Leitura e meditação no texto base
- **Dia 3-4:** Estudo dos tópicos I e II com reflexão
- **Dia 5-6:** Estudo dos tópicos III e IV com aplicação
- **Dia 7:** Revisão, oração e compromisso de ação

### 🙏 Oração Guiada
- Oração completa baseada no texto (mínimo 8 linhas)
- Personalizada, pastoral, que toque o coração

### 📖 Versículo para Memorizar
- O versículo mais impactante, escrito por extenso (ACF)

---

## 🔗 REFERÊNCIAS BÍBLICAS RELACIONADAS
- Mínimo 8 passagens complementares com texto COMPLETO na ACF
- Organize por: AT (Lei, Profetas, Escritos) e NT (Evangelhos, Epístolas)
- Para cada referência, explique EM UMA FRASE como se conecta ao estudo

## 📚 RECURSOS RECOMENDADOS
- Livros, comentários e materiais para aprofundamento
- Pregações/vídeos sobre o tema`,

  summary: `Faça um RESUMO ESTRUTURADO e SUBSTANCIAL com:
- **Tema Central:** Em uma frase clara
- **Versículo-chave:** Escrito por extenso (ACF)
- **Contexto:** Breve mas preciso (quem, para quem, quando, por quê)
- **5 a 8 Pontos Principais** — Cada ponto com:
  - Título + explicação em 2-3 frases
  - Versículo de apoio (ACF)
  - Aplicação prática em uma frase
- **Conexões Bíblicas:** 3-4 passagens relacionadas com explicação
- **Conclusão Prática:** O que fazer com esse conhecimento HOJE
- **Versículo para Memorizar**
Fidelidade ao conteúdo original. Sem superficialidade.`,

  questions: `Gere PERGUNTAS E RESPOSTAS DETALHADAS para estudo:

## 📋 PERGUNTAS DE COMPREENSÃO (10 perguntas)
Para cada uma: Pergunta + Resposta COMPLETA com referência bíblica ACF

## 🪞 PERGUNTAS DE REFLEXÃO PESSOAL (5 perguntas)
Para cada uma: Pergunta + Direcionamento para autoexame + Versículo relacionado

## 🔬 PERGUNTAS DE APROFUNDAMENTO (5 perguntas)
Para cada uma: Pergunta + Resposta acadêmica com referências ao original + Indicação de material para estudo avançado

## 💬 PERGUNTAS PARA DEBATE EM GRUPO (3 perguntas)
Para cada uma: Pergunta + Possíveis respostas diferentes + Como conduzir a discussão

TOTAL: 23 perguntas com respostas detalhadas. Cada resposta deve ter mínimo 3-4 frases.`,

  practical_applications: `Extraia APLICAÇÕES PRÁTICAS 100% concretas e transformadoras:

Gere no mínimo 8 aplicações, organizadas por área:

### 🏠 VIDA PESSOAL (3 aplicações)
Para cada:
1. **Princípio bíblico** identificado no texto
2. **Por que é relevante hoje** — conexão com desafios reais
3. **Exemplo prático e específico** — situação real do cotidiano
4. **Ação concreta para ESTA SEMANA** — algo mensurável
5. **Versículo de apoio** (ACF, escrito por extenso)

### 👨‍👩‍👧‍👦 FAMÍLIA (2 aplicações)
Mesma estrutura acima, focando em cônjuge, filhos, pais

### ⛪ IGREJA (2 aplicações)
Mesma estrutura, focando em comunidade, servir, discipular

### 🌍 TRABALHO E SOCIEDADE (1 aplicação)
Mesma estrutura, focando em testemunho público

### 📅 PLANO DE AÇÃO SEMANAL
- Dia a dia: O que fazer em cada dia para colocar em prática`,

  devotional_generation: `Gere um DEVOCIONAL COMPLETO e PROFUNDO com esta estrutura:

## 🙏 [Título Inspirador]

### 📖 Texto Base
- Versículo principal ESCRITO POR EXTENSO (ACF)
- Contexto breve: quem escreveu, para quem, por quê

### 🔍 Meditação na Palavra
- O que Deus revela sobre Si mesmo neste texto?
- Explicação versículo a versículo dos pontos-chave
- Conexão com o original (hebraico/grego) quando enriquecedor

### 💡 Reflexão para Hoje
- Como este texto se aplica à minha vida HOJE?
- Conexão com desafios reais do cotidiano
- Perguntas para autoexame (mínimo 3)

### ✍️ Aplicação Prática
- UMA ação concreta e específica para hoje
- Como lembrar desta verdade durante o dia

### 🙏 Oração Guiada
- Oração completa, pessoal e pastoral (mínimo 6 linhas)
- Baseada no texto lido

### 📖 Versículo para Memorizar
- O versículo mais marcante, escrito por extenso

### 🎵 Hino/Louvor Sugerido
- Um hino ou cântico conectado ao tema

Identifique temas em comum com devocionais existentes do usuário e reutilize conceitos relevantes. Cite materiais do acervo quando disponíveis.`,
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
