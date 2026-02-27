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

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

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
    // Rate limit by IP as a basic measure
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { passage, question, type, materials_context, analyses_context, structure_config, approach } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");


    let userPrompt = "";
    const materialsSection = materials_context
      ? `\n\n---\n**📚 MATERIAIS DE REFERÊNCIA DO USUÁRIO (BASE DE CONHECIMENTO — FONTE PRIMÁRIA ABSOLUTA):**\n${materials_context}\n---\n**INSTRUÇÃO OBRIGATÓRIA DE USO DOS MATERIAIS:**
1. Os materiais acima são a FONTE PRIMÁRIA do sermão. A IA é apenas complementar.
2. EXTRAIA CITAÇÕES ESPECÍFICAS dos materiais e SEMPRE formate assim: **「citação extraída do material」(Autor, Obra, p.XX)**. Use os marcadores 「」 para toda citação vinda dos materiais. O leitor PRECISA ver de onde veio cada informação.
3. Cada ponto do sermão DEVE referenciar pelo menos um material cadastrado quando disponível, usando o formato 「」(Autor, Obra).
4. Organize hierarquicamente: Dicionários → Comentários → Livros teológicos → Devocionais.
5. NÃO parafraseie vagamente — cite o trecho exato que fundamenta o ponto com os marcadores 「」.
6. Reconheça equivalências semânticas (avivamento = renovação espiritual = despertamento).
7. Se o material não tiver informação relevante para determinado ponto, aí sim complemente com sua base acadêmica.\n`
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

    const totalPoints = structure_config?.pointCount || 4;
    const userTitle = structure_config?.title ? `\n- Título sugerido pelo usuário: "${structure_config.title}" (use como base ou adapte, mas mantenha a essência)` : '';
    const userTheme = structure_config?.theme ? `\n- Tema central definido pelo usuário: "${structure_config.theme}" (REFORCE este tema ao longo de TODO o sermão)` : '';
    const structureSection = structure_config
      ? `\n\n**🔧 ESTRUTURA DEFINIDA PELO USUÁRIO:**${userTitle}${userTheme}\n- Quantidade de pontos: ${structure_config.pointCount}\n${structure_config.points?.map((p: any, i: number) => {
          const pointLabel = p.name ? `("${p.name}")` : '';
          const secs = p.sections ? formatSections(p.sections) : '';
          const isLast = i === structure_config.pointCount - 1;
          return `- Ponto ${i+1} ${pointLabel}${isLast ? ' ⛪ [ÚLTIMO PONTO — CLÍMAX CRISTOCÊNTRICO]' : ''}: ${secs || 'sem seções definidas'}`;
        }).join('\n')}\n- Apelo final: ${structure_config.hasFinalAppeal ? 'Sim' : 'Não'}\n- Cristocentrismo explícito: ${structure_config.isExplicitlyChristocentric ? 'Sim' : 'Não'}\n- Profundidade: ${structure_config.depthLevel}\n**SIGA ESTA ESTRUTURA EXATAMENTE. Cada ponto deve conter APENAS as seções listadas acima, na ordem definida. Use os nomes personalizados dos pontos e seções quando fornecidos. Se o usuário habilitou "Citações", SEMPRE inclua citações dos materiais formatadas como 「citação」(Autor, Obra). Se habilitou "Ilustração", SEMPRE inclua uma ilustração real e relevante.**\n\n**⛪ REGRA DO ÚLTIMO PONTO CRISTOCÊNTRICO:** O ponto ${structure_config.pointCount} (o ÚLTIMO ponto, seja qual for a quantidade) SEMPRE aponta para a CRUZ DE CRISTO — o sacrifício, a redenção, tudo que Ele fez por nós. Se há 1 ponto, ele é o último. Se há 2, o segundo é o último. Se há 3, o terceiro. E assim por diante. O último ponto é SEMPRE o clímax que revela Cristo crucificado como a resposta final.\n`
      : "";

    const depthLevel = structure_config?.depthLevel || 'basico';
    
    const approachInstructions: Record<string, string> = {
      descriptive: `**📌 ABORDAGEM DESCRITIVA (conforme Presley Camargo):**
O sermão foca em explicar O QUE ACONTECEU — como Deus agiu, o que os personagens fizeram. Olha para os FATOS bíblicos, a história, o contexto, e expõe a verdade que está ali. Perguntas guia: O que aconteceu? Como Deus agiu? O que os personagens fizeram? O que isso revela? Ideal para narrativas, salmos históricos, Atos, biografias bíblicas.`,
      normative: `**📌 ABORDAGEM NORMATIVA (conforme Presley Camargo):**
O sermão foca no que é DOUTRINÁRIO, ÉTICO ou APLICÁVEL a todos os tempos. Estabelece o que DEVE ser crido ou vivido hoje. Perguntas guia: O que a Escritura ordena? Por que é normativo? Quais os perigos de desobedecer? Qual a graça para obedecer? Ideal para epístolas, palavras de Jesus, mandamentos, advertências proféticas.`,
      theological: `**📌 ABORDAGEM TEOLÓGICA (conforme Presley Camargo):**
O sermão expõe uma DOUTRINA BÍBLICA profunda, mostrando sua base em VÁRIOS textos. Parte de um tema doutrinário e percorre diversos textos com base canônica. Perguntas guia: Qual a definição bíblica? Qual a fundamentação canônica? Quais as implicações práticas? Como aponta para Cristo? Ideal para estudos doutrinários e conferências teológicas.`,
      descriptive_normative: `**📌 ABORDAGEM DESCRITIVA + NORMATIVA (conforme Presley Camargo):**
O sermão COMBINA a descrição dos fatos bíblicos (o que aconteceu) COM a extração de normas para hoje (o que devemos fazer). Primeiro RELATA, depois PRESCREVE. É a abordagem mais completa para narrativas que contêm princípios éticos. Ideal para textos que narram eventos E contêm mandamentos ou princípios.`,
      theological_doctrinal: `**📌 ABORDAGEM TEOLÓGICA DOUTRINÁRIA:**
O sermão é um ESTUDO DOUTRINÁRIO PROFUNDO com base canônica completa. Percorre o tema desde o AT até o NT, mostrando o desenvolvimento progressivo da doutrina. Usa linguagem teológica precisa, referências aos originais, e debate entre posições teológicas. Ideal para seminários e estudos aprofundados.`,
    };

    const approachSection = approach && approachInstructions[approach]
      ? `\n\n${approachInstructions[approach]}\n**INSTRUÇÃO:** Aplique esta abordagem ao sermão. O tipo de sermão (expositivo/textual/temático) define a ESTRUTURA, e a abordagem define o TRATAMENTO do texto.\n`
      : '';
    
    const depthInstructions: Record<string, string> = {
      basico: `**🎯 NÍVEL DE PROFUNDIDADE: BÁSICO**
REGRA ABSOLUTA DE LINGUAGEM: Use APENAS palavras simples e cotidianas. PROIBIDO usar termos teológicos acadêmicos como "soteriologia", "escatologia", "pneumatologia", "hermenêutica", "exegese", "cristologia", "eclesiologia", "sanctificação", "justificação forense", "propiciação", "imputação", "kenosis", "pericórese", "hipostática".
Em vez de "justificação", diga "perdão de Deus" ou "Deus nos aceita". Em vez de "santificação", diga "viver para Deus" ou "crescer na fé". Em vez de "propiciação", diga "Jesus pagou por nós". Em vez de "expiação", diga "o sacrifício de Cristo".
Frases curtas, diretas, como se falasse com alguém que nunca leu a Bíblia. Mesmo sendo básico, deve ter CLAREZA e PROFUNDIDADE — a simplicidade não reduz o conteúdo, apenas a linguagem. A mensagem deve ser tão poderosa e profunda quanto nos outros níveis, mas acessível a qualquer pessoa.
Ideal para: pregações evangelísticas, cultos abertos, públicos iniciantes.`,

      intermediario: `**🎯 NÍVEL DE PROFUNDIDADE: INTERMEDIÁRIO**
Equilíbrio entre acessibilidade e vocabulário teológico. Pode usar termos como "graça", "redenção", "santificação" desde que explique brevemente o significado. Evite termos altamente técnicos sem contexto. Quando usar um termo mais acadêmico, coloque entre parênteses uma explicação simples. Exemplo: "justificação (o ato de Deus nos declarar justos)".
A linguagem deve ser clara para cristãos com alguma caminhada na fé, mas sem ser inacessível. Profundidade teológica com explicação pastoral.
Ideal para: cultos regulares, estudos bíblicos, cristãos em crescimento.`,

      avancado: `**🎯 NÍVEL DE PROFUNDIDADE: AVANÇADO**
Linguagem teológica plena — termos técnicos, referências a originais (hebraico/grego), conceitos sistemáticos, debate entre posições teológicas. Pode usar livremente: soteriologia, escatologia, pneumatologia, hermenêutica, cristologia, eclesiologia, propiciação, expiação, kenosis, pericórese, união hipostática, etc.
Inclua referências aos originais (hebraico/grego) com transliteração. Discuta nuances interpretativas e posições teológicas diferentes quando relevante.
Ideal para: seminários, conferências teológicas, pregadores experientes, estudos aprofundados.`,
    };

    const pastoralFilter = `\n\n${depthInstructions[depthLevel] || depthInstructions.basico}\n\n**FILTRO DE LINGUAGEM PASTORAL:** O esboço final deve ser claro, proclamável, pastoral e cristocêntrico. A profundidade do conteúdo deve ser mantida independente do nível — o que muda é a LINGUAGEM, não a qualidade da mensagem. Mantenha frases curtas de impacto.\n`;

    const citationRule = `\n\n**REGRA DE CITAÇÕES DOS MATERIAIS:** Quando materiais estiverem disponíveis, EXTRAIA citações diretas e formate SEMPRE assim: **「citação extraída do material」(Autor, Obra, p.XX)**. Use os marcadores 「」 para TODA citação vinda dos materiais. O leitor PRECISA ver de onde veio cada informação. NÃO parafraseie — cite o trecho exato.\n`;

    switch (type) {
      case "full_exegesis":
        userPrompt = `Faça uma exegese completa e detalhada do seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}${citationRule}
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
${materialsSection}${citationRule}
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
${materialsSection}${citationRule}
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
${materialsSection}${citationRule}
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
${materialsSection}${citationRule}
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
${materialsSection}${citationRule}
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
${materialsSection}${citationRule}
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
${materialsSection}${citationRule}
1. Apresente o texto COMPLETO em cada uma das seguintes versões (OBRIGATÓRIO incluir TODAS):
   - **ARC** (Almeida Revista e Corrigida)
   - **ARA** (Almeida Revista e Atualizada)
   - **NVI** (Nova Versão Internacional)
   - **NAA** (Nova Almeida Atualizada)
   - **NVT** (Nova Versão Transformadora)
   - **ACF** (Almeida Corrigida Fiel)
   - **King James 1611** (versão inglesa clássica traduzida para português)
2. Analise as diferenças de tradução entre as versões, destacando palavras-chave que variam
3. Explique POR QUE existem diferenças (tradução formal vs dinâmica, variantes textuais, escolhas do tradutor)
4. Qual tradução captura melhor o sentido original? Justifique com análise do texto em hebraico/grego
5. Variantes textuais relevantes nos manuscritos (se houver)
6. Impacto prático das diferenças na interpretação e pregação
7. Recomendação: qual versão usar para estudo exegético vs. leitura devocional vs. pregação`;
        break;

      case "devotional":
        userPrompt = `Elabore uma reflexão devocional cristocêntrica PROFUNDA e COMPLETA sobre o seguinte texto:

**Passagem:** ${passage}
${materialsSection}${citationRule}

**INSTRUÇÃO ESPECIAL PARA DEVOCIONAL:** Ao consultar os materiais da Base de Conhecimento, PRIORIZE os materiais da categoria "Devocional" (📗). Busque também em Comentários, Livros e Dicionários para enriquecer a reflexão, mas o TOM deve ser devocional — pastoral, íntimo, que toque o coração.

1. **Contexto histórico-cultural breve** — quem escreveu, para quem, em que circunstância
2. **O texto na íntegra** — apresente o texto completo da passagem
3. **O que Deus revela sobre Si mesmo neste texto?** — atributos divinos manifestados
4. **Conexão cristocêntrica** — como este texto aponta para a pessoa e obra de Cristo
5. **Análise devocional versículo a versículo** — reflexão pastoral de cada versículo com linguagem acessível
6. **Lição espiritual para hoje** — princípios permanentes aplicados à vida contemporânea
7. **Aplicação prática concreta** — ações específicas para a semana (não genéricas)
8. **Oração sugerida** — oração completa e pessoal baseada no texto (mínimo 5 frases)
9. **Versículo-chave para memorizar** — o versículo mais impactante da passagem
10. **Hino/Louvor sugerido** — um hino ou cântico que se conecta ao tema

Mantenha a fidelidade exegética mesmo na devoção. Use linguagem íntima e pastoral — como se estivesse conversando com alguém que precisa ouvir essa palavra HOJE. Inclua citações dos materiais quando disponíveis, especialmente dos devocionais.`;
        break;

      case "geographic_historical":
        userPrompt = `Faça uma análise GEOGRÁFICA e HISTÓRICA completa do seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}${citationRule}

## ANÁLISE GEOGRÁFICA E HISTÓRICA COMPLETA

### 1. LOCALIZAÇÃO GEOGRÁFICA
- **Onde acontece?** Identifique TODOS os lugares mencionados no texto
- **Coordenadas aproximadas** e região (Judeia, Samaria, Galileia, etc.)
- **Descrição topográfica**: terreno, clima, vegetação da região
- **Distâncias** entre os lugares mencionados (em km e tempo de viagem da época)
- **Rotas e caminhos**: que estrada/rota seria usada na época

### 2. MAPA GEOGRÁFICO
**INSTRUÇÃO IMPORTANTE:** Em vez de descrever o mapa em texto, forneça TODAS as informações necessárias para gerar uma imagem de mapa:
- Liste TODOS os locais com coordenadas aproximadas (latitude/longitude)
- Trace rotas de deslocamento com pontos de partida e chegada
- Indique montanhas, vales, rios, mares com posição relativa
- Indique cidades, vilas e templos com distâncias
- Formate as informações de mapa dentro de um bloco especial:
\`\`\`MAP_DATA
TITULO: [título do mapa]
REGIAO: [região principal]
PONTOS: [Local1 (lat,lon) | Local2 (lat,lon) | ...]
ROTAS: [De → Para | De → Para | ...]
REFERENCIAS: [rio, montanha, mar, etc.]
\`\`\`

### 3. CONTEXTO HISTÓRICO DETALHADO
- **Período histórico**: ano aproximado, império dominante, governante local
- **Situação política**: quem governava, conflitos, impostos, leis vigentes
- **Situação social**: classes sociais, costumes, vida cotidiana
- **Situação religiosa**: templo, sinagoga, sacerdócio, seitas (fariseus, saduceus, essênios)
- **Eventos históricos contemporâneos**: o que estava acontecendo no mundo naquela época

### 4. ARQUEOLOGIA E EVIDÊNCIAS
- **Descobertas arqueológicas** relacionadas ao local ou período
- **Inscrições e artefatos** que confirmam ou iluminam o texto
- **Manuscritos** relevantes (Qumran, papiros, etc.)

### 5. COSTUMES E CULTURA DA ÉPOCA
- **Vida cotidiana**: alimentação, vestimenta, moradia, trabalho
- **Práticas religiosas**: rituais, festas, sacrifícios
- **Relações sociais**: família, casamento, escravidão, comércio
- **Línguas faladas**: aramaico, grego, hebraico, latim

### 6. SIGNIFICADO GEOGRÁFICO PARA A INTERPRETAÇÃO
- Como a geografia influencia o significado do texto?
- Simbolismo dos lugares mencionados na Bíblia
- Por que o autor menciona esses locais específicos?

### 7. MAPAS DE REFERÊNCIA SUGERIDOS
Liste mapas bíblicos que o estudante deveria consultar:
- 🗺️ Nome do mapa e o que ele mostra
- 📚 Onde encontrar (atlas bíblico, site, recurso online)
- Sugira links de referência para mapas interativos bíblicos quando possível

Seja o mais detalhado possível. O objetivo é que o leitor consiga VISUALIZAR completamente o cenário onde o texto acontece, como se estivesse lá.`;
        break;

      case "outline_expository":
        userPrompt = `Gere um ESBOÇO DE SERMÃO EXPOSITIVO completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${approachSection}${pastoralFilter}

## TIPO DE PREGAÇÃO: EXPOSITIVA
A pregação expositiva expõe o significado de um texto bíblico específico, submetendo as ideias do pregador à autoridade da Escritura. Foca em explicar o contexto histórico, gramatical e literário para aplicá-lo à vida do ouvinte. O texto bíblico fala, e o pregador se submete a ele. As divisões seguem a estrutura natural do texto.

## ESTRUTURA OBRIGATÓRIA DO ESBOÇO:

# **TÍTULO**
(Atraente, fiel ao texto, comunicativo)

## **Tipo:** Expositivo

## **Texto Base:** ${passage}

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO**
(DEIXAR EM BRANCO — o pregador preenche manualmente)

## **INTRODUÇÃO:**
(OBRIGATÓRIO — NÃO PODE FICAR VAZIA. A introdução é o gancho que prende ou perde a congregação nos primeiros 60 segundos. Deve conter: (1) Uma pergunta retórica poderosa ou cenário real que gere identificação imediata — ex: "Quando foi a última vez que você realmente descansou? Não apenas deitou — mas descansou a alma?"; (2) Contextualização breve do texto bíblico — quem está falando, para quem, em que situação; (3) Por que este texto é urgente HOJE para quem está ouvindo. Mínimo de 4 frases.)

## **TRANSIÇÃO:**
(Ponte da introdução para o primeiro ponto)

---

## **1.**
**Texto:** (versículo ou trecho base deste ponto)
**Desenvolvimento:** (explicação exegética do texto — DEVE incluir: palavras-chave no original grego/hebraico com transliteração e significado pastoral, contexto histórico, citações dos materiais com marcadores 「...」(Autor, Obra). Mínimo 5 parágrafos distintos com conectores fluidos entre eles.)
**Aplicação:** (como isso se aplica à vida do ouvinte)
**Citações:** (citações de livros, comentários e materiais da Base de Conhecimento, formatadas como 「citação」(Autor, Obra, p.XX). Se a seção Citações estiver habilitada, SEMPRE inclua pelo menos 2 citações.)
**Referências:** (REFERÊNCIAS CRUZADAS — versículos de OUTROS livros/capítulos da Bíblia que COMPLEMENTAM o ponto, NÃO do texto base sendo estudado. Ex: se o texto é João 3:16, as referências devem ser de Romanos, Efésios, Isaías, etc.)
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
(mínimo 2-3 referências CRUZADAS, SEMPRE com o texto completo do versículo entre aspas. NUNCA repita versículos do texto base.)
**Frase:** (frase de impacto memorável para fixar o ponto — curta, poderosa, repetível)
**Aplicação Prática:** (ação CONCRETÍSSIMA para o ouvinte — não genérica. Ex: "Esta semana, toda vez que a ansiedade bater, pare, respire e diga em voz alta: 'Senhor, eu entrego isso a Ti.' Faça isso por 7 dias.")

## **TRANSIÇÃO:**
(Ponte do ponto 1 para o ponto 2 — expandindo, não mudando de assunto)

## **2.**
**Texto:** (versículo ou trecho base)
**Desenvolvimento:** (explicação exegética)
**Citações:** (citações dos materiais da Base de Conhecimento: 「citação」(Autor, Obra, p.XX))
**Referências:** (REFERÊNCIAS CRUZADAS — versículos de OUTROS livros/capítulos, NÃO do texto base)
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
**Aplicação Prática:** (ação concreta)

## **TRANSIÇÃO:**
(Ponte do ponto 2 para o ponto 3)

## **3.**
**Texto:** (versículo ou trecho base)
**Desenvolvimento:** (explicação exegética)
**Ilustração:** (exemplo concreto, história real ou analogia que ilumine o ponto)
**Citações:** (citações dos materiais: 「citação」(Autor, Obra, p.XX))
**Referências:** (REFERÊNCIAS CRUZADAS — versículos de OUTROS livros/capítulos)
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
**Frase:** (frase de impacto)
**Aplicação Prática:** (ação concreta)

## **TRANSIÇÃO:**
(Ponte do ponto 3 para o ponto 4)

## **4.**
**Texto:** (versículo ou trecho base)
**Desenvolvimento:** (explicação exegética mais confrontativa)
**Ilustração:** (exemplo profundo e pessoal que mostre Cristo como resposta)
**Citações:** (citações dos materiais: 「citação」(Autor, Obra, p.XX))
**Referências:** (REFERÊNCIAS CRUZADAS — versículos de OUTROS livros/capítulos)
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
**Frase:** (frase de impacto máxima)
**Aplicação Prática:** (ação transformadora)

## **TRANSIÇÃO PARA A CONCLUSÃO**

## **Conclusão**
(SÍNTESE do que foi falado ao longo do sermão. Recapitule cada ponto conectando-o diretamente ao TEMA CENTRAL e à vida do ouvinte. REFORCE o título — mencione-o explicitamente. Não é um resumo frio — é a hora de olhar nos olhos da congregação e dizer: "Se o que foi dito hoje faz sentido para você..." A conclusão amarra todos os fios do sermão num único laço, mostrando como cada ponto construiu a mesma verdade central. Retome a palavra-chave central e mostre como ela se aplica ao coração do ouvinte AGORA.)

## **Apelo**
(SEMPRE cristocêntrico, seguindo a lógica de "Refúgio para o Cansado". O apelo é consequência NATURAL do último ponto que revelou a cruz. Identifique dores REAIS e ESPECÍFICAS: solidão, vícios, depressão, pensamentos suicidas, medo, cansaço. Use repetição anafórica conectada ao tema do sermão: "Se está cansado, venha. Se está ferido, venha. Se está confuso, venha." RETOME o tema do sermão em cada frase do apelo. Conecte cada dor ao que Cristo fez na cruz. Use linguagem direta e pessoal: "Se o que eu falei hoje mudou algo em você, venha até o altar e entregue sua vida a Cristo." A última frase ECOA o título do sermão. Ex: Se o título é "Refúgio para o Cansado", o apelo termina com: "O nome desse refúgio é Jesus Cristo." O apelo não é genérico — é o clímax emocional e espiritual máximo que faz a pessoa se levantar.)

---

## REGRAS DE ENGENHARIA DO SERMÃO (OBRIGATÓRIO — VERIFICAÇÃO FINAL ANTES DE ENTREGAR):

⚠️ **REGRA ZERO — BOAS-VINDAS SEMPRE EM BRANCO**: A seção "BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO" deve conter APENAS o texto "(O pregador preenche)" — NUNCA gere conteúdo para ela. O pregador sempre insere manualmente.

⚠️ **REGRA DE ESPAÇAMENTO**: NÃO use linhas em branco excessivas entre seções. Use apenas UMA linha em branco entre seções. O esboço deve ser COMPACTO e FLUIDO, sem espaços vazios grandes.

1. **Estrutura Progressiva Relacional (Escada Espiritual)**: Os pontos formam uma escada espiritual crescente — aproximação → recebimento → aprofundamento → formação. Cada ponto amplia o anterior, não o substitui. É como o sermão "Refúgio para o Cansado": ir → receber → descobrir → aprender. O ouvinte sobe um degrau por ponto.

2. **Transições encadeadas e profundas (MODELO DE EXCELÊNCIA)**: As transições são o MELHOR ASPECTO de um bom sermão. Cada transição deve ser um PARÁGRAFO COMPLETO (mínimo 4-5 frases) que: (a) resume o impacto espiritual do ponto anterior com linguagem pessoal, (b) cria uma ponte teológica mostrando a conexão lógica inevitável, (c) introduz naturalmente o próximo ponto com expectativa. Exemplo de transição modelo: "Quando entendemos que o descanso não é conquistado, mas recebido como um dom de Cristo, precisamos dar um passo a mais. Porque esse descanso não é apenas algo que recebemos de uma vez, ele é algo que vamos descobrindo na caminhada. Jesus não apenas diz 'eu lhes darei descanso', Ele também promete 'vocês encontrarão descanso'. Isso nos mostra que o descanso é vivido, experimentado e descoberto à medida que andamos com Ele."

3. **Padrão interno de cada ponto (PARÁGRAFOS SEPARADOS E FLUIDOS)**: O Desenvolvimento deve ter MÚLTIPLOS PARÁGRAFOS distintos (mínimo 5), cada um com função clara: (1º) Declaração conceitual com citação dos materiais 「...」(Autor, Obra); (2º) Expansão explicativa conectando a citação ao contexto bíblico; (3º) Exegese do original — palavra grega/hebraica com transliteração, significado e impacto pastoral; (4º) Ampliação pastoral com linguagem acessível; (5º) Confronto ou aplicação ao ouvinte. CONECTORES OBRIGATÓRIOS entre parágrafos: "E à medida que...", "Mas isso nos leva a algo ainda mais profundo...", "E perceba que...", "Aqui está o ponto crucial...", "Por isso..."

4. **Curva de Intensidade Crescente com Tom Progressivo**: O sermão começa com tom SERENO e evolui progressivamente até CULMINAR no que Cristo fez na cruz. A intensidade é crescente:
   - 1º ponto → Tom sereno e didático (ensina com ternura, apresenta o tema com cuidado)
   - Pontos intermediários → Tom pastoral crescendo para confrontativo (cada ponto aumenta a intensidade, acolhe, questiona, confronta com amor)
   - ÚLTIMO PONTO (seja qual for o número — se é o 2º, 3º, 4º, 5º, etc.) → ⛪ CLÍMAX CRISTOCÊNTRICO ABSOLUTO: Este ponto aponta SEMPRE para a CRUZ DE CRISTO, o sacrifício, a redenção, tudo que Ele fez por nós. É aqui que o sermão chega ao seu ápice máximo — Cristo crucificado, morto e ressurreto como resposta final para toda necessidade revelada nos pontos anteriores. O tom é confrontativo profundo com amor, revelando a necessidade do ouvinte e mostrando que SÓ CRISTO é a resposta.
   - Conclusão → Síntese pessoal (olha nos olhos)
   - Apelo → Emocionalmente máximo (convida ao altar)
   **IMPORTANTE**: Cristo aparece DESDE O INÍCIO do sermão como fio condutor, mas o clímax — a revelação plena do sacrifício na cruz — é GUARDADO para o último ponto.

5. **Palavra-chave central e REFORÇO DO TEMA**: Trabalhe UMA palavra/conceito central e desenvolva em múltiplas dimensões. O TEMA e o TÍTULO devem ser REFORÇADOS ao longo de TODO o sermão — em CADA ponto, CADA transição, CADA aplicação. Assim como no sermão "Refúgio para o Cansado" que reforça a todo momento o refúgio, o cansaço, o descanso — o seu sermão deve fazer o mesmo com seu tema central. O ouvinte deve sentir o tema ecoando do início ao fim.

6. **Cristocentricidade arquitetônica**: Cristo aparece como início, meio, aprofundamento e formação — fio condutor estrutural, não apenas menção final. Do título ao apelo, o sermão inteiro orbita em torno de Cristo. MAS o clímax — o momento em que o sacrifício na cruz é plenamente revelado — é SEMPRE no ÚLTIMO ponto.

7. **Acessibilidade sem perder profundidade**: Frases curtas de impacto, repetições intencionais, uma ideia por ponto. A linguagem é pastoral no melhor sentido — qualquer pessoa entende, mas ninguém sente que é raso.

8. **Clímax guardado para o ÚLTIMO PONTO**: O clímax do sermão é no ÚLTIMO PONTO, onde Cristo e Sua cruz são plenamente revelados. Não há clímax prematuro. A tensão narrativa é construída ao longo de todos os pontos anteriores, revelando a necessidade do ouvinte, para que no último ponto a CRUZ DE CRISTO surja como a resposta INEVITÁVEL. Os pontos anteriores preparam o terreno; o último ponto planta a cruz.

9. **LÓGICA PROCEDURAL CRISTOCÊNTRICA**: Cada ponto deve progressivamente revelar ao ouvinte sua NECESSIDADE diante de Cristo. Não basta ensinar — o sermão deve GUIAR: "Você precisa disso... porque sem Cristo..." Os pontos anteriores mostram a dor, a carência, a fome espiritual. O ÚLTIMO ponto revela: "E é exatamente por isso que Cristo veio, morreu e ressuscitou." O sermão inteiro é um caminho que leva a pessoa até a cruz e depois ao altar.

10. **ENGAJAMENTO E ENVOLVIMENTO**: O sermão deve ser CATIVANTE e ENVOLVENTE. Use storytelling pastoral — histórias reais, perguntas retóricas ("Você já se sentiu assim?"), diálogo imaginário com a congregação ("Talvez você esteja pensando..."). Crie tensão narrativa. O ouvinte não pode desligar em nenhum momento.

11. **APLICAÇÃO PRÁTICA CONCRETÍSSIMA**: Cada seção de Aplicação Prática deve conter uma ação ESPECÍFICA, REALIZÁVEL e com PRAZO. NÃO aceite: "ore mais" ou "busque a Deus". EXIJA: "Esta semana, ao acordar, antes de pegar o celular, ore 2 minutos dizendo: 'Senhor, eu escolho ir a Ti hoje.' Faça isso por 7 dias e veja o que acontece." Use listas com 👉 para ações diretas quando apropriado.

12. **DESENVOLVIMENTO MÍNIMO DE 800 CARACTERES**: Cada seção de Desenvolvimento deve ter NO MÍNIMO 800 caracteres com 5+ parágrafos. Aprofunde a explicação exegética, traga contexto histórico, explore o significado das palavras originais (grego/hebraico com transliteração), faça conexões com outros textos. O desenvolvimento é o coração do ponto.

13. **EXEGESE DO ORIGINAL OBRIGATÓRIA**: Em CADA ponto, inclua pelo menos UMA palavra-chave no original (grego para NT, hebraico para AT) com: transliteração, significado literal, uso no contexto e impacto pastoral. Ex: "A palavra grega δεῦτε (deute) é um imperativo — Jesus não sugere, Ele ordena com ternura. É um chamado urgente e amoroso."

14. **REFERÊNCIAS BÍBLICAS NO FORMATO 👉**: A seção Referências de cada ponto DEVE seguir EXATAMENTE este formato — cada referência em uma linha separada com o emoji 👉, o nome completo do livro, capítulo e versículo, seguido de dois pontos e o texto COMPLETO do versículo entre aspas. Exemplo:
👉 Salmos 25:9: "Guia os humildes na justiça e lhes ensina o seu caminho."
👉 Provérbios 3:5-6: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas."
👉 Isaías 55:8-9: "Porque os meus pensamentos não são os vossos pensamentos, nem os vossos caminhos os meus caminhos, diz o Senhor."
NÃO cite apenas a referência numérica. SEMPRE inclua o texto completo do versículo entre aspas. Mínimo de 2-3 referências por ponto.

15. **ARCO NARRATIVO FECHADO COM REFORÇO TEMÁTICO**: O título deve ser retomado no apelo final E reforçado ao longo de todo o sermão. O sermão começa e termina no mesmo conceito, formando um círculo completo. Em CADA ponto, CADA transição, o tema é relembrado, ecoado, reforçado — como "Refúgio para o Cansado" que a cada parágrafo traz de volta o refúgio e o cansaço. A última frase do apelo deve ecoar o título.

16. **APELO MODELO "REFÚGIO PARA O CANSADO"**: O apelo deve seguir a mesma lógica do sermão "Refúgio para o Cansado": identificar dores REAIS da congregação (solidão, vícios, depressão, pensamentos suicidas) com coragem e amor. Não seja genérico — seja específico: "Você que tentou aliviar a dor com bebida, com distração, com trabalho excessivo... Jesus não te trouxe aqui para te perder, Ele te trouxe para te encontrar." Use repetição anafórica: "Se está cansado, venha. Se está ferido, venha. Se está confuso, venha." O apelo RETOMA o tema do sermão e CONECTA cada dor ao que Cristo fez na cruz. O apelo não é um acréscimo — é a consequência natural do último ponto que já revelou a cruz.

17. **MATERIAIS COMO ALICERCE**: Quando materiais estiverem disponíveis, eles são a BASE do sermão. Cada ponto deve conter pelo menos uma citação formatada como 「trecho exato extraído do material」(Autor, Obra). A IA complementa, mas NUNCA substitui os materiais. Se há um dicionário bíblico nos materiais, USE-O para definir as palavras-chave. Se há um comentário, USE-O para a exegese.`;

        break;

      case "outline_textual":
        userPrompt = `Gere um ESBOÇO DE SERMÃO TEXTUAL completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${approachSection}${pastoralFilter}

## TIPO DE PREGAÇÃO: TEXTUAL
A pregação textual é baseada em um versículo ou pequeno trecho bíblico (2-3 versículos), onde o tema e os pontos principais são extraídos diretamente do texto. O esqueleto do sermão vem de palavras ou expressões-chave do próprio texto. Foca na aplicação direta de uma única passagem.

## ESTRUTURA OBRIGATÓRIA DO ESBOÇO:

# **TÍTULO**
(Extraído diretamente do texto)

## **Tipo:** Textual

## **Texto Base:** ${passage}

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO**
(DEIXAR EM BRANCO — o pregador preenche manualmente)

## **INTRODUÇÃO:**
(OBRIGATÓRIO — NÃO PODE FICAR VAZIA. Gancho poderoso nos primeiros 60 segundos: pergunta retórica ou cenário real que gere identificação. Contexto breve do texto. Urgência para hoje. Mínimo 4 frases.)

## **TRANSIÇÃO:**

---

## **1.**
**Texto:** (palavra ou expressão-chave extraída do versículo)
**Desenvolvimento:** (exploração exegética dessa expressão)
**Aplicação:** (significado prático)
**Citações:** (citações dos materiais: 「citação」(Autor, Obra, p.XX))
**Referências:** (REFERÊNCIAS CRUZADAS — versículos de OUTROS livros/capítulos, NÃO do texto base)
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
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
(SÍNTESE do que foi falado. Recapitule cada ponto conectando ao TEMA CENTRAL e REFORÇANDO o título. Linguagem pessoal: "Se o que foi dito hoje faz sentido para você..." Amarre todos os fios do sermão mostrando como cada ponto construiu a mesma verdade.)

## **Apelo**
(SEMPRE cristocêntrico, modelo "Refúgio para o Cansado". Consequência natural do último ponto que revelou a cruz. Identifique dores reais, use repetição anafórica conectada ao tema, RETOME o título em cada frase. A última frase ECOA o título. Clímax emocional e espiritual máximo.)

---

Aplique TODAS as 17 regras de engenharia do sermão: escada espiritual, transições modelo de excelência, parágrafos fluidos (mínimo 5), CURVA DE INTENSIDADE com tom sereno no início culminando na CRUZ DE CRISTO no ÚLTIMO PONTO, REFORÇO DO TEMA ao longo de todo o sermão (como "Refúgio para o Cansado"), cristocentricidade arquitetônica, exegese do original obrigatória, referências bíblicas COMPLETAS, aplicações práticas CONCRETÍSSIMAS, DESENVOLVIMENTO MÍNIMO DE 800 CARACTERES, arco narrativo fechado com reforço temático, APELO modelo "Refúgio para o Cansado" com repetição anafórica e dores reais, materiais como alicerce com citações 「...」(Autor, Obra).`;
        break;

      case "outline_thematic":
        userPrompt = `Gere um ESBOÇO DE SERMÃO TEMÁTICO completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${approachSection}${pastoralFilter}

## TIPO DE PREGAÇÃO: TEMÁTICA
A pregação temática é estruturada em torno de um assunto/tópico específico extraído do texto. Utiliza diversas passagens bíblicas que abordam o mesmo tema. O tema central governa o sermão, e as divisões derivam dele. Requer cuidado para não impor ideias próprias — o tema deve emergir do texto, não ser imposto a ele.

## ESTRUTURA OBRIGATÓRIA DO ESBOÇO:

# **TÍTULO**
(Comunicativo e bíblico)

## **Tipo:** Temático

## **Texto Base:** ${passage}

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO**
(DEIXAR EM BRANCO — o pregador preenche manualmente)

## **INTRODUÇÃO:**
(OBRIGATÓRIO — NÃO PODE FICAR VAZIA. Gancho poderoso nos primeiros 60 segundos: pergunta retórica ou cenário real que gere identificação. Contextualização breve. Urgência para hoje. Mínimo 4 frases.)

## **TRANSIÇÃO:**

---

## **1.**
**Texto:** (passagem bíblica que sustenta este aspecto do tema)
**Desenvolvimento:** (explicação do aspecto temático à luz do texto)
**Aplicação:** (como este aspecto se aplica)
**Citações:** (citações dos materiais: 「citação」(Autor, Obra, p.XX))
**Referências:** (REFERÊNCIAS CRUZADAS — versículos de OUTROS livros/capítulos)
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
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
(SÍNTESE do que foi falado. Recapitule cada ponto conectando ao TEMA CENTRAL e REFORÇANDO o título. Linguagem pessoal: "Se o que foi dito hoje faz sentido para você..." Amarre todos os fios mostrando como cada ponto sustenta a mesma verdade central.)

## **Apelo**
(SEMPRE cristocêntrico, modelo "Refúgio para o Cansado". Consequência natural do último ponto que revelou a cruz. Identifique dores reais, use repetição anafórica conectada ao tema, RETOME o título em cada frase. A última frase ECOA o título. Clímax emocional e espiritual máximo.)

---

Aplique TODAS as 17 regras de engenharia do sermão: escada espiritual, transições modelo de excelência, parágrafos fluidos (mínimo 5), CURVA DE INTENSIDADE com tom sereno no início culminando na CRUZ DE CRISTO no ÚLTIMO PONTO, REFORÇO DO TEMA ao longo de todo o sermão (como "Refúgio para o Cansado"), cristocentricidade arquitetônica, exegese do original obrigatória, referências bíblicas COMPLETAS, aplicações práticas CONCRETÍSSIMAS, DESENVOLVIMENTO MÍNIMO DE 800 CARACTERES, arco narrativo fechado com reforço temático, APELO modelo "Refúgio para o Cansado" com repetição anafórica e dores reais, materiais como alicerce com citações 「...」(Autor, Obra). Cada ponto deve usar textos bíblicos diferentes que sustentam o tema central.

**REGRA DE CITAÇÕES AMPLIADA:** As citações no sermão podem vir de QUALQUER fonte relevante:
- **Textos bíblicos:** Versículos que sustentam o ponto (sempre no formato 👉)
- **Materiais da Base de Conhecimento:** Livros, comentários, dicionários → formato 「citação」(Autor, Obra, p.XX)
- **Pensadores e teólogos:** Citações de pregadores, pastores, escritores cristãos (Spurgeon, Lloyd-Jones, Lutero, Calvino, etc.) → formato 「citação」(Autor)
- **Fontes externas:** Vídeos, posts, blogs, vlogs mencionados nos materiais → formato 「citação」(Fonte, Plataforma)
A seção "Citações" de cada ponto deve conter pelo menos uma citação de cada tipo disponível, priorizando os materiais do usuário.`;
        break;

      // outline_descriptive, outline_normative, outline_theological are now handled as "approach" 
      // parameter within the 3 main types (expository, textual, thematic)

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

      case "lessons_applications":
        userPrompt = `Extraia LIÇÕES, APLICAÇÕES e REFLEXÕES do seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}${citationRule}

## ANÁLISE DE LIÇÕES, APLICAÇÕES E REFLEXÕES

### 1. 📖 TEXTO NA ÍNTEGRA
Apresente o texto completo da passagem na versão ACF (Almeida Corrigida Fiel).

### 2. 📝 LIÇÕES DO TEXTO (O que o texto ENSINA?)
Para cada lição identificada:
- **Lição:** (declaração clara e objetiva do ensino)
- **Base textual:** (versículo específico que sustenta a lição)
- **Explicação:** (por que isso é uma lição importante — contexto exegético breve)
- **Referência cruzada:** (outro texto bíblico que confirma essa lição)
Identifique pelo menos 5 lições distintas.

### 3. 🎯 APLICAÇÕES PRÁTICAS (O que FAZER com isso?)
Para cada aplicação:
- **Aplicação:** (ação concreta e específica)
- **Base:** (qual lição sustenta essa aplicação)
- **Como fazer:** (passos práticos — não genéricos)
- **Prazo sugerido:** (esta semana, este mês, hábito diário)
Identifique pelo menos 5 aplicações CONCRETÍSSIMAS.

### 4. 💭 REFLEXÕES PESSOAIS (O que MEDITAR?)
Para cada reflexão:
- **Pergunta para reflexão:** (pergunta profunda e pessoal)
- **Versículo-chave:** (o versículo que provoca a reflexão)
- **Conexão com a vida:** (como isso se conecta à realidade do leitor)
Identifique pelo menos 5 reflexões.

### 5. ⛪ CONEXÃO CRISTOCÊNTRICA
- Como estas lições apontam para Cristo?
- O que a cruz acrescenta ao entendimento destas verdades?

### 6. 📋 RESUMO PARA ESTUDO
- **3 lições essenciais** (as mais importantes do texto)
- **3 ações imediatas** (o que fazer HOJE)
- **1 versículo para memorizar** (o mais impactante)
- **1 oração sugerida** (baseada nas lições do texto)

Seja profundo mas acessível. Cada lição, aplicação e reflexão deve ser fundamentada no texto, não inventada.`;
        break;

      case "generate_map_image":
        // This type generates an image, not streaming text
        break;

      default:
        userPrompt = passage || question || "Ajude-me a entender princípios de exegese bíblica.";
    }

    // Handle map image generation separately
    if (type === "generate_map_image") {
      const mapInfo = question || `Mapa bíblico de ${passage}`;
      const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: `Generate an ULTRA HIGH RESOLUTION, extremely detailed biblical MAP image for the passage "${passage}". 

CRITICAL QUALITY REQUIREMENTS:
- Output the LARGEST possible image resolution (at least 2048x2048 pixels or higher)
- Every label, city name, and text must be SHARP, CRISP, and perfectly LEGIBLE even when zoomed in
- Use THICK, bold font for all city names and labels
- Lines, borders, and route paths must be clean and well-defined

MAP STYLE:
- Ancient cartographic parchment style with warm sepia/brown tones
- Detailed terrain: mountains drawn with hatching, rivers as flowing lines, seas with wave patterns
- Cities marked with ornate diamond/dot markers
- Travel routes shown as bold dashed arrows indicating direction
- Decorative border with ancient biblical illustrations
- Title banner at the top with the passage reference
- Clear legend box showing: cities, routes, maritime paths, land paths, references

MAP DATA:
${mapInfo}

LANGUAGE: All labels, city names, sea names, region names, and legend text must be in PORTUGUESE (Brazilian Portuguese).

Make this the highest quality, most detailed biblical map possible. Ultra high resolution. 4K quality.` }],
          modalities: ["image", "text"],
        }),
      });
      
      if (!imgResponse.ok) {
        return new Response(JSON.stringify({ error: "Erro ao gerar mapa" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const imgData = await imgResponse.json();
      const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      return new Response(JSON.stringify({ image_url: imageUrl || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
