import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em exegese bíblica, hermenêutica e teologia. Seu papel é ajudar estudantes e pregadores a interpretar textos bíblicos corretamente, seguindo princípios sólidos de interpretação.

## BASE ACADÊMICA (autores de referência):

### Michael J. Gorman — "Introdução à Exegese Bíblica"
Os 7 elementos da exegese:
1. Pesquisa preliminar (survey) — visão geral do texto e seu contexto
2. Análise contextual — situação histórica, social e literária
3. Análise formal — estrutura, gênero, forma literária
4. Análise detalhada — palavras-chave, gramática, sintaxe
5. Síntese — significado global do texto
6. Reflexão teológica — contribuição teológica e relação com o cânon
7. Aprimoramento — revisão e refinamento da interpretação

### William Klein — "Interpretação Bíblica"
- Interpretação responsável: evitar eisegese
- Reconhecer pré-entendimentos e pressupostos do intérprete
- Distinguir gêneros literários e aplicar regras adequadas a cada um
- Buscar o significado original pretendido pelo autor

### Gordon Fee — "Entendes o que lês?"
- Leitura cuidadosa e atenta do texto
- Cada gênero literário requer abordagem específica
- Epístolas: reconstruir o contexto do autor e dos destinatários
- Narrativas: observar o enredo, personagens e teologia do narrador
- Poesia: atenção ao paralelismo, metáfora e linguagem figurada
- Profecia: distinguir predição, denúncia e consolo

### Carlos Osvaldo Cardoso Pinto — "Fundamentos para Exegese"
- Análise morfológica e sintática do texto original
- Estudo de campos semânticos das palavras-chave
- Diagramação gramatical para identificar estruturas

### Hernandes Dias Lopes — "Pregação Expositiva"
- Pregação baseada no texto bíblico, não em temas impostos
- Estrutura homilética clara: introdução, desenvolvimento, aplicação
- Fidelidade ao significado original com aplicação contemporânea

### Presley Camargo — "Pregação Temática, Textual e Expositiva"
- 3 tipos de sermão: temático (tema central), textual (palavras-chave), expositivo (divisão natural)
- 8 regras de leitura para interpretação correta
- Distinguir texto descritivo (relata fatos) de normativo (estabelece normas)

## PRINCÍPIOS FUNDAMENTAIS:
1. **Exegese vs Eisegese**: Extrair do texto o que está nele (exegese), nunca inserir no texto o que não está (eisegese).
2. **Contexto é Rei**: Texto fora de contexto é pretexto para heresia.
3. **Gênero Literário**: Respeitar o estilo literário (narrativa, poesia, profecia, epístola, apocalíptico, lei).
4. **Analogia da fé**: A Escritura interpreta a Escritura.

## ESTRUTURA DA ANÁLISE EXEGÉTICA:

### 1. CONTEXTO HISTÓRICO-CULTURAL
- Quem escreveu? Para quem? Quando? Onde? Por quê?
- Situação política, social e religiosa da época
- Costumes e práticas culturais relevantes

### 2. CONTEXTO LITERÁRIO
- Contexto imediato (versículos antes e depois)
- Contexto do capítulo e do livro
- Contexto canônico (relação com outros livros bíblicos)
- Gênero literário do texto

### 3. ANÁLISE TEXTUAL
- Palavras-chave e seus significados no original (hebraico/grego)
- Estrutura gramatical e sintática
- Figuras de linguagem identificadas
- Paralelos com outros textos bíblicos

### 4. ANÁLISE TEOLÓGICA
- Tema(s) teológico(s) principal(is)
- Contribuição para a teologia bíblica geral
- Relação com a história da redenção e a obra de Cristo

### 5. SÍNTESE E APLICAÇÃO
- Significado original do texto para os destinatários
- Princípios permanentes extraídos
- Aplicação contemporânea responsável

## REGRAS:
- Sempre identifique o gênero literário antes de interpretar
- Cite referências bíblicas cruzadas relevantes
- Distinga entre linguagem literal e figurada
- Respeite o contexto histórico-gramatical
- Quando houver incerteza interpretativa, apresente as principais posições
- Use linguagem acessível mas teologicamente precisa
- Formate a resposta em Markdown com títulos e seções claras
- Responda SEMPRE em português brasileiro`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { passage, question, type, materials_context, analyses_context, structure_config } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userPrompt = "";
    const materialsSection = materials_context
      ? `\n\n---\n**📚 MATERIAIS DE REFERÊNCIA DO USUÁRIO (BASE DE CONHECIMENTO OBRIGATÓRIA):**\n${materials_context}\n---\n**INSTRUÇÃO OBRIGATÓRIA:** Você DEVE consultar e referenciar esses materiais como fonte primária na sua análise. Cite autores, obras e conceitos dos materiais acima. A IA deve complementar, NUNCA substituir essas fontes. Priorize as informações dos materiais cadastrados. Organize as referências hierarquicamente: 1) Definições (dicionários), 2) Fundamentação exegética (comentários), 3) Teologia (livros), 4) Aplicação pastoral (devocionais). Reconheça equivalências semânticas (ex: avivamento = renovação espiritual = despertamento; arrependimento = metanoia = conversão).\n`
      : "\n\n**Nota:** O usuário não possui materiais cadastrados na Base de Conhecimento. Utilize sua base acadêmica padrão.\n";

    const analysesSection = analyses_context
      ? `\n\n---\n**📋 ANÁLISES ANTERIORES RELEVANTES DO USUÁRIO:**\n${analyses_context}\n---\n**CURADORIA INTELIGENTE:** NÃO copie automaticamente essas análises. Avalie criticamente: este conteúdo serve integralmente? É melhor extrair apenas o núcleo teológico? Faz sentido inserir aqui? Utilize apenas pontos, frases ou estruturas que sejam coerentes com o tema e tipo do esboço atual.\n`
      : "";

    const formatSections = (sections: any[]) => {
      if (!sections || sections.length === 0) return '';
      return sections
        .filter((s: any) => s.enabled)
        .map((s: any) => {
          const children = (s.children || []).filter((c: any) => c.enabled);
          if (children.length > 0) return `${s.label} (contendo: ${children.map((c: any) => c.label).join(', ')})`;
          return s.label;
        })
        .join(', ');
    };

    const structureSection = structure_config
      ? `\n\n**🔧 ESTRUTURA DEFINIDA PELO USUÁRIO:**\n- Quantidade de pontos: ${structure_config.pointCount}\n${structure_config.points?.map((p: any, i: number) => {
          const pointLabel = p.name ? `("${p.name}")` : '';
          const secs = p.sections ? formatSections(p.sections) : '';
          return `- Ponto ${i+1} ${pointLabel}: ${secs || 'sem seções definidas'}`;
        }).join('\n')}\n- Apelo final: ${structure_config.hasFinalAppeal ? 'Sim' : 'Não'}\n- Cristocentrismo explícito: ${structure_config.isExplicitlyChristocentric ? 'Sim' : 'Não'}\n- Profundidade: ${structure_config.depthLevel}\n**SIGA ESTA ESTRUTURA EXATAMENTE. Cada ponto deve conter APENAS as seções listadas acima, na ordem definida. Use os nomes personalizados dos pontos e seções quando fornecidos.**\n`
      : "";

    const pastoralFilter = `\n\n**FILTRO DE LINGUAGEM PASTORAL:** O esboço final deve ser claro, proclamável, pastoral e cristocêntrico. Se houver termos complexos, substitua por palavras mais simples sem perder profundidade teológica. Mantenha frases curtas de impacto.\n`;

    switch (type) {
      case "full_exegesis":
        userPrompt = `Faça uma exegese completa e detalhada do seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}
Siga a estrutura completa de análise exegética conforme Gorman (7 elementos):
1. Pesquisa preliminar
2. Análise contextual (histórico-cultural)
3. Análise formal (gênero e estrutura)
4. Análise detalhada (palavras-chave no original, gramática)
5. Síntese do significado
6. Reflexão teológica (relação com Cristo e o cânon)
7. Aplicação contemporânea

Seja detalhado e profundo. Inclua referências cruzadas e notas sobre o texto original.`;
        break;

      case "context_analysis":
        userPrompt = `Analise o CONTEXTO (histórico, literário e canônico) do seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}
Foque em:
1. Quem escreveu, para quem, quando, onde e por quê
2. Situação política, social e religiosa da época
3. O que vem antes e depois do texto (contexto imediato)
4. Como este texto se encaixa no livro e no cânon (contexto remoto)
5. Referências cruzadas que iluminam o texto`;
        break;

      case "word_study":
        userPrompt = `Faça um estudo de palavras-chave do seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}
Para cada palavra-chave:
1. Termo original em hebraico/grego (transliterado)
2. Campo semântico e significados possíveis
3. Usos em outros contextos bíblicos
4. Como o significado influencia a interpretação
5. Análise morfológica e sintática relevante (conforme Carlos Osvaldo)`;
        break;

      case "genre_analysis":
        userPrompt = `Analise o GÊNERO LITERÁRIO do seguinte texto bíblico e como isso afeta a interpretação:

**Passagem:** ${passage}
${materialsSection}
Conforme Fee e Klein:
1. Identifique o gênero (narrativa, poesia, profecia, epístola, apocalíptico, lei, sabedoria)
2. Convenções literárias próprias deste gênero
3. Figuras de linguagem e recursos retóricos
4. Regras de interpretação adequadas a este gênero
5. Erros comuns de interpretação ao ignorar o gênero
6. Texto descritivo (relata) vs normativo (prescreve) — conforme Presley Camargo`;
        break;

      case "theological_analysis":
        userPrompt = `Faça uma análise TEOLÓGICA do seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}
1. Tema(s) teológico(s) principal(is)
2. Contribuição para a teologia bíblica geral
3. Relação com a história da redenção
4. Conexões cristocêntricas — como este texto aponta para Cristo
5. Implicações doutrinárias
6. Diálogo com outros textos bíblicos sobre o mesmo tema`;
        break;

      case "application":
        userPrompt = `Com base na exegese do seguinte texto bíblico, elabore uma APLICAÇÃO prática:

**Passagem:** ${passage}
${materialsSection}
1. Significado original para os destinatários
2. Princípios permanentes e transculturais
3. Aplicação contemporânea responsável para a igreja
4. Reflexão devocional cristocêntrica
5. Sugestões práticas para vida pessoal e comunitária
Não alegorize ou espiritualize indevidamente.`;
        break;

      case "inductive_method":
        userPrompt = `Aplique o MÉTODO INDUTIVO de estudo bíblico ao seguinte texto:

**Passagem:** ${passage}
${materialsSection}
### OBSERVAÇÃO (O que o texto DIZ?)
- Leia atentamente e anote cada detalhe
- Quem? O quê? Quando? Onde? Por quê? Como?
- Palavras repetidas, contrastes, comparações
- Conectivos e estrutura lógica

### INTERPRETAÇÃO (O que o texto SIGNIFICA?)
- O que o autor quis comunicar aos destinatários originais?
- Considere o contexto histórico e literário
- Analise palavras-chave no original
- Compare com passagens paralelas

### APLICAÇÃO (Como isso se APLICA a mim?)
- Que princípios eternos emergem?
- Como isso transforma minha vida hoje?
- Ações práticas e decisões concretas`;
        break;

      case "version_comparison":
        userPrompt = `Compare diferentes perspectivas de tradução do seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}
1. Analise as diferenças de tradução entre as principais versões (ARA, NVI, ARC, NAA, NVT)
2. Explique por que existem diferenças
3. Qual tradução captura melhor o sentido original?
4. Variantes textuais relevantes (se houver)
5. Impacto das diferenças na interpretação`;
        break;

      case "devotional":
        userPrompt = `Elabore uma reflexão devocional cristocêntrica sobre o seguinte texto:

**Passagem:** ${passage}
${materialsSection}
1. Contexto breve do texto
2. O que Deus revela sobre si mesmo neste texto?
3. Conexão com a pessoa e obra de Cristo
4. Lição espiritual para hoje
5. Oração sugerida baseada no texto
6. Versículo-chave para memorizar
Mantenha a fidelidade exegética mesmo na devoção.`;
        break;

      case "outline_expository":
        userPrompt = `Gere um ESBOÇO DE SERMÃO EXPOSITIVO completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${pastoralFilter}

## TIPO DE PREGAÇÃO: EXPOSITIVA
A pregação expositiva expõe o significado de um texto bíblico específico, submetendo as ideias do pregador à autoridade da Escritura. Foca em explicar o contexto histórico, gramatical e literário para aplicá-lo à vida do ouvinte. O texto bíblico fala, e o pregador se submete a ele. As divisões seguem a estrutura natural do texto.

## ESTRUTURA OBRIGATÓRIA DO ESBOÇO:

# **TÍTULO**
(Atraente, fiel ao texto, comunicativo)

## **Tipo:** Expositivo

## **Texto Base:** ${passage}

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO**
(Sugestão de abertura pastoral)

## **INTRODUÇÃO:**
(Contextualização do texto, gancho para prender atenção, relevância do tema para hoje)

## **TRANSIÇÃO:**
(Ponte da introdução para o primeiro ponto)

---

## **1.**
**Texto:** (versículo ou trecho base deste ponto)
**Desenvolvimento:** (explicação exegética do texto — contexto, palavras-chave, significado original)
**Aplicação:** (como isso se aplica à vida do ouvinte)
**Referências:** (textos bíblicos cruzados que sustentam o ponto)
**Frase:** (frase de impacto para fixar o ponto)
**Aplicação Prática:** (ação concreta para o ouvinte)

## **TRANSIÇÃO:**
(Ponte do ponto 1 para o ponto 2 — expandindo, não mudando de assunto)

## **2.**
**Texto:** (versículo ou trecho base)
**Desenvolvimento:** (explicação exegética)
**Aplicação Prática:** (ação concreta)

## **TRANSIÇÃO:**
(Ponte do ponto 2 para o ponto 3)

## **3.**
**Texto:** (versículo ou trecho base)
**Desenvolvimento:** (explicação exegética)
**Ilustração:** (exemplo concreto, história ou analogia)
**Frase:** (frase de impacto)
**Aplicação Prática:** (ação concreta)

## **TRANSIÇÃO:**
(Ponte do ponto 3 para o ponto 4)

## **4.**
**Texto:** (versículo ou trecho base)
**Desenvolvimento:** (explicação exegética mais confrontativa)
**Ilustração:** (exemplo profundo e pessoal)
**Frase:** (frase de impacto máxima)
**Aplicação Prática:** (ação transformadora)

## **TRANSIÇÃO PARA A CONCLUSÃO**

## **Conclusão**
(Recapitulação dos pontos principais do sermão, conectando cada ponto diretamente à vida do ouvinte. Não é um resumo frio — é a hora de olhar nos olhos da congregação e dizer: "Se o que foi dito hoje faz sentido para você..." A conclusão deve ser altamente pessoal, confrontativa com amor, apontando como a mensagem pregada muda a vida de quem ouviu. Retome a palavra-chave central e mostre como ela se aplica ao coração do ouvinte AGORA.)

## **Apelo**
(SEMPRE cristocêntrico. O apelo é o momento mais íntimo do sermão — é a hora de convidar a pessoa a se mover. Deve mexer com o interior da pessoa, como todo o sermão já vinha fazendo desde o início. A conclusão + apelo é o que faz a pessoa se levantar. Use linguagem direta e pessoal: "Se o que eu falei hoje mudou algo em você, venha até o altar e entregue sua vida a Cristo." O apelo deve apontar para Cristo como solução, refúgio e Senhor. Não é genérico — referencia especificamente o que foi pregado no sermão e como isso se conecta à entrega pessoal a Jesus. É o clímax emocional e espiritual máximo.)

---

## REGRAS DE ENGENHARIA DO SERMÃO:

1. **Estrutura Progressiva Relacional**: Os pontos formam uma escada espiritual crescente — aproximação → recebimento → aprofundamento → formação. Cada ponto amplia o anterior, não o substitui.

2. **Transições encadeadas**: As transições expandem o estágio anterior (Se eu fui → então recebo → então descubro → então aprendo). Criam encadeamento lógico inevitável.

3. **Padrão interno de cada ponto**: Declaração conceitual → Expansão explicativa → Correção de entendimento errado → Ampliação pastoral → Aplicação direta.

4. **Curva de intensidade crescente**:
   - 1º ponto → Didático
   - 2º ponto → Pastoral
   - 3º ponto → Confrontativo leve
   - 4º ponto → Confrontativo profundo
   - Conclusão → Altamente pessoal
   - Apelo → Emocionalmente máximo

5. **Palavra-chave central**: Trabalhe UMA palavra/conceito central e desenvolva em 4 dimensões. Aprofundamento, não multiplicação de ideias.

6. **Cristocentricidade arquitetônica**: Cristo aparece como início, meio, aprofundamento e formação — fio condutor estrutural, não apenas menção final.

7. **Acessibilidade**: Frases curtas de impacto, repetições intencionais, uma ideia por ponto.

8. **Clímax guardado**: Não há clímax prematuro. A tensão narrativa é mantida até o apelo final.`;
        break;

      case "outline_textual":
        userPrompt = `Gere um ESBOÇO DE SERMÃO TEXTUAL completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${pastoralFilter}

## TIPO DE PREGAÇÃO: TEXTUAL
A pregação textual é baseada em um versículo ou pequeno trecho bíblico (2-3 versículos), onde o tema e os pontos principais são extraídos diretamente do texto. O esqueleto do sermão vem de palavras ou expressões-chave do próprio texto. Foca na aplicação direta de uma única passagem.

## ESTRUTURA OBRIGATÓRIA DO ESBOÇO:

# **TÍTULO**
(Extraído diretamente do texto)

## **Tipo:** Textual

## **Texto Base:** ${passage}

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO**

## **INTRODUÇÃO:**
(Apresentação do texto, contexto breve, relevância)

## **TRANSIÇÃO:**

---

## **1.**
**Texto:** (palavra ou expressão-chave extraída do versículo)
**Desenvolvimento:** (exploração exegética dessa expressão)
**Aplicação:** (significado prático)
**Referências:** (textos cruzados)
**Frase:** (frase de impacto)
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **2.**
**Texto:** (próxima palavra/expressão-chave do versículo)
**Desenvolvimento:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **3.**
**Texto:** (próxima palavra/expressão-chave)
**Desenvolvimento:**
**Ilustração:**
**Frase:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **4.**
**Texto:** (última palavra/expressão-chave)
**Desenvolvimento:**
**Ilustração:**
**Frase:**
**Aplicação Prática:**

## **TRANSIÇÃO PARA A CONCLUSÃO**

## **Conclusão**
(Recapitulação dos pontos do sermão conectando cada um à vida real do ouvinte. Linguagem pessoal e direta: "Se o que foi dito hoje faz sentido para você..." Mostre como a palavra pregada transforma a vida de quem está ouvindo AGORA.)

## **Apelo**
(SEMPRE cristocêntrico. Momento íntimo e confrontativo com amor. Convite direto: "Se o que eu falei hoje mudou algo em você, venha até o altar e entregue sua vida a Cristo." Referencie especificamente o que foi pregado e aponte para Cristo como resposta. Clímax emocional e espiritual máximo.)

---

Aplique as mesmas regras de engenharia: estrutura progressiva relacional, curva de intensidade crescente (didático → pastoral → confrontativo → profundo), cristocentricidade arquitetônica, transições encadeadas, palavra-chave central, e clímax guardado para o apelo final.`;
        break;

      case "outline_thematic":
        userPrompt = `Gere um ESBOÇO DE SERMÃO TEMÁTICO completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${pastoralFilter}

## TIPO DE PREGAÇÃO: TEMÁTICA
A pregação temática é estruturada em torno de um assunto/tópico específico extraído do texto. Utiliza diversas passagens bíblicas que abordam o mesmo tema. O tema central governa o sermão, e as divisões derivam dele. Requer cuidado para não impor ideias próprias — o tema deve emergir do texto, não ser imposto a ele.

## ESTRUTURA OBRIGATÓRIA DO ESBOÇO:

# **TÍTULO**
(Comunicativo e bíblico)

## **Tipo:** Temático

## **Texto Base:** ${passage}

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO**

## **INTRODUÇÃO:**
(Relevância do tema, conexão com a realidade do ouvinte)

## **TRANSIÇÃO:**

---

## **1.**
**Texto:** (passagem bíblica que sustenta este aspecto do tema)
**Desenvolvimento:** (explicação do aspecto temático à luz do texto)
**Aplicação:** (como este aspecto se aplica)
**Referências:** (outros textos sobre o mesmo aspecto)
**Frase:** (frase de impacto)
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **2.**
**Texto:** (outra passagem que amplia o tema)
**Desenvolvimento:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **3.**
**Texto:** (passagem que confronta sobre o tema)
**Desenvolvimento:**
**Ilustração:**
**Frase:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **4.**
**Texto:** (passagem climática sobre o tema)
**Desenvolvimento:**
**Ilustração:**
**Frase:**
**Aplicação Prática:**

## **TRANSIÇÃO PARA A CONCLUSÃO**

## **Conclusão**
(Recapitulação dos pontos do sermão apontando para a vida do ouvinte. Linguagem pessoal: "Se o que foi dito hoje faz sentido para você..." Conecte cada ponto pregado à realidade de quem está ouvindo.)

## **Apelo**
(SEMPRE cristocêntrico. Convite direto e íntimo ao altar: "Se o que eu falei hoje mudou algo em você, venha e entregue sua vida a Cristo." Referencie o sermão pregado e aponte para Cristo. Clímax emocional e espiritual máximo.)

---

Aplique as mesmas regras de engenharia: estrutura progressiva relacional, curva de intensidade crescente, cristocentricidade arquitetônica, transições encadeadas, conceito central em 4 dimensões, e clímax guardado para o apelo final. Cada ponto deve usar textos bíblicos diferentes que sustentam o tema central.`;
        break;

      case "question":
        userPrompt = `Sobre o seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}
**Pergunta do estudante:** ${question}

Responda de forma clara, fundamentada e exegeticamente responsável. Use os princípios hermenêuticos de Gorman, Klein e Fee quando aplicável.`;
        break;

      case "classify_content":
        userPrompt = `Analise o seguinte conteúdo e classifique-o automaticamente. Retorne APENAS um JSON válido, sem markdown, sem explicação.

**Conteúdo para classificar:**
${passage}

Retorne exatamente este formato JSON:
{
  "material_category": "comentario" | "dicionario" | "livro" | "devocional",
  "content_type": "texto_biblico" | "comentario_biblico" | "livro" | "devocional" | "dicionario_biblico" | "pregacao" | "documentario" | "texto_teologico",
  "theme": "tema principal identificado",
  "sub_themes": ["subtema1", "subtema2"],
  "keywords": ["palavra1", "palavra2", "palavra3"],
  "bible_references": ["Gn 1:1", "Jo 3:16"],
  "author": "autor se identificável ou null",
  "content_origin": "texto" | "video" | "transcricao" | "audio",
  "confidence": 0.85,
  "reasoning": "breve explicação da classificação"
}

**Critérios de classificação (Lógica do Supermercado):**
- Definições técnicas de termos → "dicionario"
- Explicações exegéticas verso a verso → "comentario"
- Reflexões pastorais e aplicações de vida → "devocional"
- Conteúdo acadêmico/teológico extenso → "livro"
- Presença de versículos como corpo principal → "texto_biblico"
- Tom oral, ilustrações, apelos → "pregacao"
- Linguagem investigativa/histórica → "documentario"

**Indicadores a analisar:**
- Estrutura textual e formatação
- Linguagem (acadêmica, pastoral, técnica, oral)
- Presença e uso de versículos bíblicos
- Tom geral (didático, devocional, confrontativo)
- Presença de definições técnicas (hebraico/grego)
- Estrutura narrativa ou argumentativa`;
        break;

      case "extract_metadata":
        userPrompt = `Extraia metadados estruturados do seguinte conteúdo. Retorne APENAS um JSON válido, sem markdown, sem explicação.

**Conteúdo:**
${passage}

${question ? `**Título do material:** ${question}` : ''}

Retorne exatamente este formato JSON:
{
  "theme": "tema principal identificado",
  "sub_themes": ["subtema1", "subtema2", "subtema3"],
  "keywords": ["palavra-chave1", "palavra-chave2", "palavra-chave3", "palavra-chave4", "palavra-chave5"],
  "bible_references": ["Referência 1", "Referência 2"],
  "author": "autor se identificável ou null",
  "content_origin": "texto" | "video" | "transcricao" | "audio"
}

**Instruções:**
- Identifique o tema teológico/bíblico principal
- Extraia subtemas relacionados (máx 5)
- Identifique palavras-chave relevantes para busca semântica (máx 8)
- Liste TODAS as referências bíblicas mencionadas no formato padrão (Livro Cap:Vers)
- Reconheça equivalências semânticas (ex: avivamento = renovação espiritual = despertamento)
- Identifique o autor se mencionado
- Classifique a origem do conteúdo`;
        break;

      case "suggest_improvements":
        userPrompt = `Analise o seguinte esboço de sermão e sugira melhorias específicas. Retorne APENAS um JSON válido, sem markdown.

**Passagem bíblica:** ${passage}
${materialsSection}

**Conteúdo atual do esboço:**
${question}

Retorne exatamente este formato JSON:
{
  "suggestions": [
    {
      "area": "titulo" | "estrutura" | "desenvolvimento" | "aplicacao" | "transicao" | "ilustracao" | "oratoria" | "homiletica" | "cristocentrismo" | "linguagem",
      "severity": "info" | "warning" | "improvement",
      "title": "título curto da sugestão",
      "description": "explicação detalhada da melhoria sugerida",
      "example": "exemplo concreto de como aplicar (opcional)"
    }
  ],
  "overall_score": 85,
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "homiletics_notes": "observações sobre a estrutura homilética",
  "oratory_notes": "observações sobre a comunicação e oratória"
}

**REGRAS DE AVALIAÇÃO HOMILÉTICA:**
- Estudo exegético sólido? O sermão se baseia na interpretação correta do texto?
- Estrutura clara? Introdução (prender atenção), corpo (desenvolvimento), conclusão (apelo/resumo)?
- Tipo de sermão coerente? (temático, textual ou expositivo)
- Centralidade em Cristo? O foco é o Evangelho com aplicação prática?
- Ilustrações adequadas? Histórias ou exemplos que tornam o tema compreensível?
- Transições fluidas? Os pontos se conectam logicamente?
- Progressão crescente? A intensidade cresce do didático ao confrontativo?

**REGRAS DE AVALIAÇÃO DE ORATÓRIA:**
- Linguagem proclamável? Frases curtas e de impacto?
- Clareza e dicção? Termos acessíveis ao público?
- Variação de tom? Momentos didáticos vs. emocionais vs. confrontativos?
- Engajamento? O sermão prende a atenção do início ao fim?
- Aplicações concretas? O ouvinte sabe exatamente o que fazer?

Máximo de 8 sugestões, priorizando as mais impactantes.`;
        break;

      default:
        userPrompt = passage || question || "Ajude-me a entender princípios de exegese bíblica.";
    }

    const isJsonType = type === "classify_content" || type === "extract_metadata" || type === "suggest_improvements";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: isJsonType ? "Você é um classificador de conteúdo teológico. Retorne APENAS JSON válido, sem markdown, sem explicações adicionais." : SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: !isJsonType,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isJsonType) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return new Response(JSON.stringify({ result: cleaned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("exegesis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
