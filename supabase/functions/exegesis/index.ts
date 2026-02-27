import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em exegese bíblica, hermenêutica, teologia e homilética. Seu papel é ajudar estudantes e pregadores a interpretar textos bíblicos corretamente e preparar sermões poderosos, seguindo princípios sólidos de interpretação e pregação.

## ⛔ REGRA ABSOLUTA DE LINGUAGEM — PALAVRAS E EXPRESSÕES PROIBIDAS EM SERMÕES:
NUNCA use estas palavras/expressões em esboços de sermão (outline_expository, outline_textual, outline_thematic):
- "divino", "divina", "divindade" → Use: "de Deus", "que vem de Deus", "o próprio Deus"
- "espiritual", "espiritualidade", "espiritualmente" → Use: "da fé", "de Deus", "no caminho com Deus", "interior", "da alma"
- "religião", "religiosidade", "religioso" → Use: "fé", "caminhada com Deus", "vida com Deus"
- "sagrado", "sacro" → Use: "de Deus", "santo", "separado por Deus"
- "transcendente", "transcendência" → Use: "maior que nós", "além do que vemos"
- "sobrenatural" → Use: "que só Deus faz", "que não tem explicação humana"
- "celestial" → Use: "do céu", "de Deus"
- "soteriologia", "escatologia", "pneumatologia", "cristologia", "eclesiologia" → PROIBIDO ABSOLUTAMENTE
- "propiciação", "imputação", "kenosis", "pericórese", "hipostática" → PROIBIDO ABSOLUTAMENTE
- "justificação forense" → Use: "Deus nos declara limpos", "perdão completo"
- "santificação" → Use: "crescer na fé", "viver para Deus", "ser transformado"
- "justificação" → Use: "perdão de Deus", "Deus nos aceita"
- "expiação" → Use: "o sacrifício de Cristo", "Jesus pagou por nós"
- "né", "tipo", "então" (como vícios) → PROIBIDO
- "vou estar falando", "vou estar orando" → PROIBIDO (gerundismo)

## 🗣️ TOM E ESTILO — CONVERSA FAMILIAR DE DOMINGO:
O sermão deve soar como uma CONVERSA entre amigos, não como uma aula de seminário.
- Fale como se estivesse conversando com alguém que você ama
- Use "nós" em vez de "vocês" — coloque-se no mesmo nível da congregação
- Frases CURTAS e de IMPACTO — como se falasse olhando nos olhos
- Use histórias do cotidiano: trânsito, trabalho, família, escola, cozinha
- Perguntas retóricas que fazem a pessoa pensar: "Quando foi a última vez que você realmente parou?"
- EVITE voz de pregador — nada de entonação artificial ou dramatização forçada
- A profundidade vem da CLAREZA, não da complexidade do vocabulário
- Se precisar usar um termo bíblico técnico, EXPLIQUE imediatamente em palavras simples
- A mensagem deve ser tão poderosa que mude a segunda-feira do ouvinte

## BASE ACADÊMICA — EXEGESE (autores de referência):

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

## BASE ACADÊMICA — HOMILÉTICA E PREGAÇÃO (autores de referência para sermões):

### Bryan Chapell — "Pregação Cristocêntrica"
PRINCÍPIOS FUNDAMENTAIS:
- **Condição Decaída (Fallen Condition Focus - FCF)**: Todo texto revela uma necessidade humana que só Cristo pode suprir. O pregador deve identificar o FCF do texto — a condição humana que requer a graça de Deus.
- **Abordagem Redentora**: Toda Escritura é uma mensagem unificada da necessidade humana e da provisão de Deus. Mesmo textos que não mencionam Cristo explicitamente apontam para Ele na história da redenção.
- **Espiral Dupla**: Cada ponto do sermão deve conter TANTO explicação quanto ilustração e aplicação — não separar "parte expositiva" de "parte aplicativa".
- **Contra o moralismo**: A pregação fiel não diz apenas "faça isso" — revela a GRAÇA que torna possível a obediência. Sem graça, o sermão é mero farisaísmo.
- **Componentes da Exposição**: Proposição (tese central), Pontos Principais (divisões naturais do texto), Subpontos, Ilustrações e Aplicações — todos submetidos à autoridade do texto.
- **Introdução como Corrente**: Deve ter: (1) Atenção do ouvinte, (2) Necessidade revelada, (3) Orientação ao texto, (4) Proposição clara.
- **Conclusão**: Síntese que recapitula os pontos e conduz ao apelo — não apenas resumo, mas clímax emocional que toca o coração.

### Stuart Olyott — "Pregação Pura e Simples"
PRINCÍPIOS FUNDAMENTAIS:
- **4 verbos da pregação**: kerusso (proclamar com autoridade do Rei), euangelizo (anunciar boas-novas), martureo (dar testemunho dos fatos), didasko (ensinar as implicações para a vida).
- **Toda pregação faz as 4 coisas simultaneamente** — não existe separação entre "mensagem evangelística" e "mensagem doutrinária".
- **7 marcas da pregação excelente**: (1) Exatidão exegética, (2) Conteúdo doutrinário, (3) Estrutura clara, (4) Ilustrações vívidas, (5) Aplicação penetrante, (6) Pregação eficiente (sem desperdiçar palavras), (7) Autoridade que vem de Deus.
- **Exatidão Exegética**: O pregador é arauto (kerusso) — transmite a mensagem do Rei sem mudá-la ou corrigi-la.
- **Estrutura Clara**: O sermão deve ter "esqueleto visível" — o ouvinte deve saber onde está e para onde vai.
- **Ilustrações Vívidas**: Ilustrações são janelas que iluminam — devem ser reais, breves e servir ao ponto, nunca substituí-lo.
- **Aplicação Penetrante**: Aplicação não é um acréscimo — é parte essencial da mensagem. Deve atingir a consciência do ouvinte e mudar sua vida.

### Timothy Keller — "Pregação: Comunicando a Fé na Era do Ceticismo"
PRINCÍPIOS FUNDAMENTAIS:
- **3 níveis do ministério da Palavra**: Servir à Palavra (fidelidade ao texto) → Alcançar as pessoas (contextualização) → Demonstração do poder de Deus (unção).
- **Pregando o evangelho SEMPRE**: Todo sermão, sobre qualquer texto, deve pregar o evangelho — não apenas em sermões evangelísticos, mas em cada mensagem.
- **Pregando Cristo em toda a Escritura**: Seguindo 1 Coríntios 2:1-2, Paulo "nada sabia senão Jesus Cristo crucificado" — mesmo pregando o AT. Toda a Escritura aponta para Jesus como profeta, sacerdote e rei.
- **Pregando Cristo à cultura**: Contextualizar a mensagem para a audiência específica, usando linguagem e exemplos que ressoem com a cultura contemporânea sem comprometer a verdade.
- **A mente moderna**: Abordar objeções e dúvidas do ouvinte contemporâneo — não ignorar o ceticismo, mas confrontá-lo com respeito e evidências.
- **Pregando ao coração**: Não basta informar a mente — o sermão deve tocar as motivações profundas (ídolos do coração) e oferecer Cristo como a satisfação verdadeira.
- **Dois amores da pregação**: Amor à Palavra de Deus e amor às pessoas — de ambos brota o desejo de mostrar a graça gloriosa de Deus.

### Mervyn A. Warren — "Pregação Poderosa"
PRINCÍPIOS FUNDAMENTAIS:
- **5 cânones da pregação**: (1) Conteúdo (substância bíblica), (2) Organização (estrutura lógica), (3) Linguagem (clareza e beleza), (4) Memória/familiaridade com o material, (5) Exposição/apresentação à congregação. + 6º cânone: responsabilidade pós-sermão.
- **O coração do sermão**: 3 artérias — (1) logos (informação/material), (2) ethos (credibilidade do pregador), (3) pathos (conexão emocional com a audiência).
- **Cristo no centro**: "Introduzam a Cristo em cada sermão. Façam com que a preciosidade, a misericórdia e a glória de Jesus Cristo sejam contempladas."
- **Sermões curtos e incisivos**: "Que a mensagem não seja apresentada em discursos longos e rebuscados, mas em falas breves e incisivas, que vão diretamente ao ponto."
- **Ilustrações com discrição**: "Demasiadas ilustrações diminuem a dignidade da apresentação da Palavra de Deus."
- **Salvação como tema central**: "Seja a ciência da salvação o tema central de todo sermão, de todo hino."

### Hernandes Dias Lopes — "Pregação Expositiva: Sua Importância para o Crescimento da Igreja"
PRINCÍPIOS FUNDAMENTAIS:
- **Supremacia da pregação expositiva**: A pregação expositiva foi apontada como fator nº 1 para crescimento da igreja em pesquisa com 576 igrejas (Thom Rainer, 1996).
- **3 estilos de sermão**: Sermão tópico (tema central), textual (palavras-chave do texto), expositivo (divisão natural do texto).
- **4 problemas da igreja**: (1) Misticismo exagerado, (2) Liberalismo teológico, (3) Ortodoxia morta (fidelidade sem produtividade), (4) Superficialidade no púlpito.
- **A vida do pregador é a vida do seu ministério**: Fome por Deus, fome pela Palavra, unção do Espírito Santo, paixão ("lógica em fogo").
- **Contra o pragmatismo**: "As pessoas não procuram pela verdade, mas por aquilo que funciona" — o pregador deve pregar verdade, não popularidade.
- **Pregação como instrumento vital**: A pregação não é entretenimento nem TED Talk — é o instrumento de Deus para salvação.

### Presley Camargo — "Pregação Temática, Textual e Expositiva"
- 3 tipos de sermão: temático (tema central), textual (palavras-chave), expositivo (divisão natural)
- 8 regras de leitura para interpretação correta
- Distinguir texto descritivo (relata fatos) de normativo (estabelece normas)

## PRINCÍPIOS FUNDAMENTAIS:
1. **Exegese vs Eisegese**: Extrair do texto o que está nele (exegese), nunca inserir no texto o que não está (eisegese).
2. **Contexto é Rei**: Texto fora de contexto é pretexto para heresia.
3. **Gênero Literário**: Respeitar o estilo literário (narrativa, poesia, profecia, epístola, apocalíptico, lei).
4. **Analogia da fé**: A Escritura interpreta a Escritura.
5. **Condição Decaída (Chapell)**: Todo texto revela uma necessidade humana que só a graça de Cristo supre.
6. **Pregação sempre cristocêntrica (Keller/Chapell)**: Todo sermão aponta para Cristo — não como moralismo, mas como revelação da graça.
7. **4 verbos simultâneos (Olyott)**: Toda pregação proclama, anuncia boas-novas, testemunha fatos e ensina implicações.
8. **Contra o moralismo (Chapell)**: Sermão sem graça é farisaísmo. A obediência nasce da graça, não do esforço humano.

## OS 4 PILARES QUE TRANSFORMAM UM SERMÃO EM UMA EXPERIÊNCIA QUE MUDA VIDAS:

### 🔥 PILAR 1 — CHOQUE DE REALIDADE (Lado Provocativo)
O sermão vira ESPELHO. O pregador descreve com precisão a angústia, o medo, o egoísmo que o ouvinte sente em segredo. A provocação nasce do incômodo de se ver "desnudado". A pessoa percebe que sua máscara não serve mais. Aplique isso: em cada ponto, inclua pelo menos um momento de confronto amoroso que faça o ouvinte se reconhecer.

### 💡 PILAR 2 — QUEBRA DE EXPECTATIVA (Lado Criativo)
Quando o pregador usa metáforas inesperadas ou uma perspectiva cultural nova sobre um texto antigo, o cérebro "acorda". A mensagem sai do "eu já sei isso" para "nunca vi por esse ângulo". Aplique isso: use ilustrações surpreendentes, analogias modernas inesperadas e ângulos contra-intuitivos para manter a atenção.

### ❓ PILAR 3 — A PERGUNTA CERTA (Lado Questionativo)
O que muda uma pessoa raramente é uma afirmação absoluta, mas uma pergunta que ela não consegue parar de responder. Perguntas como "Por que você faz o que faz?" ou "Quem você seria se ninguém estivesse olhando?" forçam o ouvinte a um diálogo interno. Aplique isso: insira perguntas retóricas profundas em cada ponto — perguntas que ecoam na mente do ouvinte por dias.

### ✅ PILAR 4 — ESPERANÇA AFIRMATIVA (Lado Afirmativo)
Reflexão sem esperança gera apenas culpa. A mudança real ocorre quando o sermão afirma que há propósito, perdão e identidade nova. Ninguém muda se não acreditar que uma versão melhor de si é possível. Aplique isso: cada ponto deve terminar com uma afirmação de valor em Cristo — uma declaração que dê coragem ao ouvinte para mudar.

**REGRA DOS 4 PILARES EM CADA PONTO DO SERMÃO:** Todo ponto deve conter: (1) um momento PROVOCATIVO (espelho), (2) uma perspectiva CRIATIVA (surpresa), (3) uma PERGUNTA que ecoa, (4) uma AFIRMAÇÃO de esperança. Estes 4 elementos transformam um "discurso" em uma experiência que altera a trajetória de uma vida.

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
- Use linguagem acessível e clara — como uma conversa, não como uma aula
- Formate a resposta em Markdown com títulos e seções claras
- Responda SEMPRE em português brasileiro
- Em sermões, aplique os princípios de TODOS os autores homiléticos: Chapell (cristocentricidade redentora), Olyott (exatidão e clareza), Keller (contextualização e coração), Warren (cânones retóricos e brevidade), Hernandes (exposição e paixão), Presley Camargo (tipologia e norma vs. descrição)
- Em sermões, NUNCA use as palavras da lista de PALAVRAS PROIBIDAS — substitua sempre pelas alternativas indicadas`;

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
1. Os materiais acima são a FONTE PRIMÁRIA do sermão. A IA é apenas complementar. O sermão deve ser CONSTRUÍDO a partir dos materiais, não o contrário.
2. EXTRAIA CITAÇÕES ESPECÍFICAS dos materiais e SEMPRE formate assim: **「citação extraída do material」(Autor, Obra, p.XX)**. Use os marcadores 「」 para toda citação vinda dos materiais. O leitor PRECISA ver de onde veio cada informação.
3. Cada ponto do sermão DEVE referenciar pelo menos um material cadastrado quando disponível, usando o formato 「」(Autor, Obra).
4. Organize hierarquicamente: Dicionários → Comentários → Livros teológicos → Devocionais.
5. NÃO parafraseie vagamente — cite o trecho exato que fundamenta o ponto com os marcadores 「」.
6. Reconheça equivalências semânticas (avivamento = renovação = despertamento).
7. Se o material não tiver informação relevante para determinado ponto, aí sim complemente com sua base acadêmica.
8. CRUZE MATERIAIS: Se há um comentário de Wiersbe sobre Romanos E um Comentário Beacon sobre Romanos, USE AMBOS e compare as perspectivas. Quanto mais materiais citados, melhor.
9. Para CADA ponto do sermão, indique QUAIS materiais foram consultados e o que foi extraído de cada um. O pregador precisa saber de onde vem cada insight.
10. Os materiais do tipo DICIONÁRIO (Strong, Wycliffe) devem ser usados para definir TODAS as palavras-chave do texto original. Se o usuário tem um dicionário cadastrado, USE-O antes de usar sua base própria.\n`
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
      basico: `**🎯 NÍVEL DE PROFUNDIDADE: BÁSICO — PREGAÇÃO DE DOMINGO (CONVERSA FAMILIAR)**
REGRA ABSOLUTA DE LINGUAGEM: Este é um sermão para DOMINGO — uma conversa com a família da fé. 
PROIBIDO USAR: "divino", "divina", "divindade", "espiritual", "espiritualidade", "religião", "religiosidade", "sagrado", "transcendente", "sobrenatural", "celestial", "soteriologia", "escatologia", "pneumatologia", "hermenêutica", "exegese", "cristologia", "eclesiologia", "santificação", "justificação forense", "propiciação", "imputação", "kenosis", "pericórese", "hipostática".

SUBSTITUA SEMPRE:
- "divino" → "de Deus", "que vem de Deus"
- "espiritual" → "da fé", "interior", "da alma", "do coração"
- "religiosidade" → "vida com Deus", "caminhada com Deus"
- "sagrado" → "santo", "separado por Deus"
- "justificação" → "perdão de Deus", "Deus nos aceita como somos"
- "santificação" → "crescer na fé", "viver para Deus", "ser transformado"
- "propiciação" → "Jesus pagou por nós", "o preço foi pago na cruz"
- "expiação" → "o sacrifício de Cristo"
- "sobrenatural" → "que só Deus faz", "que não tem explicação humana"

ESTILO OBRIGATÓRIO:
- Fale como se estivesse conversando com um amigo no sofá da sala
- Use "nós" em vez de "vocês" — você está junto com a congregação
- Frases curtas e diretas — como quem fala olhando nos olhos
- Histórias do cotidiano: trânsito, trabalho, família, escola, cozinha, supermercado
- Perguntas retóricas que fazem pensar: "Já parou pra pensar nisso?"
- ZERO gerundismo: nunca "vou estar falando" — diga "vou falar"
- ZERO vícios: nunca "né", "tipo", "então" como muleta
- A profundidade vem da CLAREZA — ser simples NÃO é ser raso
- A mensagem mais poderosa é aquela que uma criança de 12 anos entende E um teólogo respeita
Ideal para: pregações de domingo, cultos regulares, qualquer público.`,

      intermediario: `**🎯 NÍVEL DE PROFUNDIDADE: INTERMEDIÁRIO**
Equilíbrio entre acessibilidade e vocabulário da fé. Pode usar termos como "graça", "redenção" desde que explique brevemente. Evite termos acadêmicos sem contexto. Quando usar um termo mais técnico, coloque entre parênteses uma explicação simples. Exemplo: "justificação (quando Deus nos declara justos)".
AINDA PROIBIDO: "divino", "espiritual", "religiosidade", "sobrenatural", "celestial", "transcendente". Use as alternativas da lista.
A linguagem deve ser clara para cristãos com alguma caminhada na fé. Tom de conversa familiar mantido.
Ideal para: cultos regulares, estudos bíblicos, cristãos em crescimento.`,

      avancado: `**🎯 NÍVEL DE PROFUNDIDADE: AVANÇADO**
Linguagem teológica permitida — termos técnicos, referências a originais (hebraico/grego), debate entre posições teológicas. Pode usar termos acadêmicos livremente.
AINDA EVITE: "divino" e "celestial" quando possível — prefira "de Deus" e "do céu".
Inclua referências aos originais (hebraico/grego) com transliteração. Discuta nuances interpretativas quando relevante.
Ideal para: seminários, conferências, pregadores experientes, estudos aprofundados.`,
    };

    const pastoralFilter = `\n\n${depthInstructions[depthLevel] || depthInstructions.basico}\n\n**FILTRO DE LINGUAGEM PASTORAL (CONVERSA FAMILIAR):** O esboço final deve ser claro, proclamável e focado em Cristo. Fale como quem conversa com alguém que ama. A profundidade do conteúdo deve ser mantida — o que muda é a LINGUAGEM, não a qualidade da mensagem. Frases curtas de impacto. Use "nós" em vez de "vocês". Conte histórias reais. Faça perguntas que ecoam. NUNCA use as palavras da lista de PALAVRAS PROIBIDAS.\n`;

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

## PERFIL DO PREGADOR:
Você é um pregador experiente, humilde e amoroso. Ama a Bíblia e fala a língua do povo, transformando verdades profundas em palavras simples. Sua missão é preparar um sermão que uma criança de 12 anos entenda e um doutor admire. Cristo é o centro absoluto — Sua cruz, Sua graça, Sua salvação.

## REGRAS DOUTRINÁRIAS:
- Conteúdo puramente bíblico: Cristo salva, cura e liberta.
- Proibido: conteúdo liberal, relativista ou antropocêntrico.
- Objetivo: 50 a 60 minutos de pregação sólida e cheia de esperança.
- Use exclusivamente versões: ACF, NVI, NAA, ARA, NVT.

## TIPO DE PREGAÇÃO: EXPOSITIVA
A pregação expositiva expõe o significado de um texto bíblico específico, submetendo as ideias do pregador à autoridade da Escritura. As divisões seguem a estrutura natural do texto. O texto bíblico fala, e o pregador se submete a ele.

## 📌 A REGRA DE OURO (VISITA CONSTANTE AO TEXTO):
O texto base NUNCA é abandonado. Em CADA ponto, CADA desenvolvimento, o pregador DEVE voltar ao texto usando frases como:
- "O texto diz..."
- "Olhando para o versículo..."
- "O texto nos mostra..."
- "Repare no que a Escritura afirma..."
- "Voltando ao nosso texto..."
O ouvinte deve sentir que a BÍBLIA está conduzindo cada palavra, não a opinião do pregador.

## ESTRUTURA OBRIGATÓRIA DO ESBOÇO:

# **TÍTULO**
(Atraente, fiel ao texto, comunicativo — máximo 8 palavras)

## **TEMA:**
(O tema central em UMA frase curta e clara)

## **Tipo:** Expositivo

## **Texto Base:** ${passage}

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO**
(DEIXAR EM BRANCO — o pregador preenche manualmente)

## **INTRODUÇÃO:**
(OBRIGATÓRIO — NÃO PODE FICAR VAZIA. A introdução é o gancho que prende ou perde a congregação nos primeiros 60 segundos. Deve conter:
(1) Uma pergunta retórica poderosa ou cenário REAL do cotidiano que gere identificação imediata — ex: "Quando foi a última vez que você realmente descansou? Não apenas deitou — mas descansou a alma?"
(2) Contextualização breve do texto bíblico — quem está falando, para quem, em que situação — SEM usar nomes técnicos, apenas contando a história
(3) Por que este texto é urgente HOJE para quem está ouvindo
(4) Apresente o problema, a verdade ou a promessa que o texto revela
Mínimo de 5 frases. Tom de conversa — como se olhasse nos olhos de cada pessoa.)

## **TRANSIÇÃO:**
(Ponte da introdução para o primeiro ponto — parágrafo completo com mínimo 4 frases)

---

## **1.**
**Texto:** (versículo ou trecho base deste ponto — CITE o texto na íntegra)
**Explicação:** (explicação exegética do texto — DEVE incluir: (1) Volta ao texto base com "O texto diz...", (2) Contexto histórico e cultural contado como história, SEM jargões, (3) Palavras-chave no original grego/hebraico com transliteração e significado explicado de forma simples, (4) Citações dos materiais com marcadores 「...」(Autor, Obra). Mínimo 5 parágrafos distintos com conectores fluidos.)
**Ilustração:** (história real do cotidiano, analogia moderna ou exemplo concreto que ilumine o ponto — deve ser vivida, breve e servir ao ponto, nunca substituí-lo)
**Verdade:** (A verdade bíblica central deste ponto em UMA frase clara e memorável — ex: "Deus não espera que a gente se arrume pra chegar perto Dele. Ele nos aceita como estamos.")
**Citações:** (citações de livros, comentários e materiais da Base de Conhecimento: 「citação」(Autor, Obra, p.XX). Mínimo 2 citações.)
**Referências:** (REFERÊNCIAS CRUZADAS — versículos de OUTROS livros/capítulos que COMPLEMENTAM o ponto)
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
👉 [Livro Capítulo:Versículo]: "[texto completo do versículo]"
(mínimo 2-3 referências CRUZADAS com texto completo. NUNCA repita versículos do texto base.)
**Frase de Efeito:** (declaração memorável, curta e repetível que fixe o ponto na mente do ouvinte)
**Aplicação Prática:** (ação CONCRETÍSSIMA para o ouvinte — não genérica. Com PRAZO. Ex: "Esta semana, toda vez que a ansiedade bater, pare, respire e diga em voz alta: 'Senhor, eu entrego isso a Ti.' Faça isso por 7 dias.")

## **TRANSIÇÃO:**
(Ponte do ponto 1 para o ponto 2 — parágrafo COMPLETO mínimo 4-5 frases que: (a) resume o impacto do ponto anterior, (b) cria ponte lógica, (c) introduz o próximo ponto com expectativa)

## **2.**
**Texto:** (versículo ou trecho base)
**Explicação:** (volta ao texto, contexto, exegese — mínimo 5 parágrafos)
**Ilustração:** (história real ou analogia)
**Verdade:** (verdade bíblica central em UMA frase)
**Citações:** (「citação」(Autor, Obra, p.XX))
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **3.**
**Texto:** (versículo ou trecho base)
**Explicação:** (volta ao texto, contexto, exegese — mínimo 5 parágrafos, tom mais confrontativo)
**Ilustração:** (história mais profunda e pessoal)
**Verdade:** (verdade bíblica central)
**Citações:** (「citação」(Autor, Obra, p.XX))
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **4. O FOCO EM JESUS (ÚLTIMO PONTO — CLÍMAX CRISTOCÊNTRICO)**
**Texto:** (versículo ou trecho base)
**Explicação:** (explicação exegética que CONDUZ TUDO para a pessoa e obra de Cristo — mostre como Jesus cumpre, responde ou resolve o tema. Tom confrontativo profundo com amor. A cruz de Cristo é revelada plenamente aqui. Mínimo 5 parágrafos.)
**Ilustração:** (exemplo profundo e pessoal que mostre Cristo como a resposta para toda necessidade revelada nos pontos anteriores)
**Verdade:** (verdade cristocêntrica em UMA frase — ex: "O nome desse descanso é Jesus Cristo.")
**Citações:** (「citação」(Autor, Obra, p.XX))
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:** (frase de impacto máxima — a mais poderosa do sermão)
**Aplicação Prática:** (convite à fé, arrependimento, obediência e esperança em Cristo)

## **TRANSIÇÃO PARA A CONCLUSÃO**

## **Conclusão**
**Recapitulação:** (Recapitule cada ponto em 1-2 frases, conectando-os ao TEMA CENTRAL e ao TÍTULO. Mostre como cada ponto construiu a mesma verdade. Retome a palavra-chave central.)
**Palavra de Ânimo:** (Palavras pastorais de encorajamento — olhando nos olhos da congregação: "Meus irmãos, se o que foi dito hoje faz sentido para você..." Reforce que há esperança.)
**Esperança em Cristo:** (Declare a esperança que temos em Cristo — a promessa final. Conecte ao tema do sermão.)
**Oração Final:** (Oração pastoral, bíblica, dependente do Espírito Santo — mínimo 5 frases. Pessoal e transformadora.)

## **Apelo**
(SEMPRE cristocêntrico. O apelo é consequência NATURAL do último ponto que revelou a cruz. Identifique dores REAIS e ESPECÍFICAS: solidão, vícios, depressão, pensamentos suicidas, medo, cansaço. Use repetição anafórica conectada ao tema: "Se está cansado, venha. Se está ferido, venha. Se está confuso, venha." RETOME o tema em cada frase. Conecte cada dor ao que Cristo fez na cruz. Linguagem direta e pessoal. A última frase ECOA o título do sermão. Ex: Se o título é "Refúgio para o Cansado", o apelo termina com: "O nome desse refúgio é Jesus Cristo." O apelo não é genérico — é o clímax emocional máximo que faz a pessoa se levantar.)

---

## REGRAS DE ENGENHARIA DO SERMÃO (OBRIGATÓRIO — VERIFICAÇÃO FINAL):

⚠️ **REGRA ZERO — BOAS-VINDAS SEMPRE EM BRANCO**: A seção "BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO" deve conter APENAS o texto "(O pregador preenche)" — NUNCA gere conteúdo para ela.

⚠️ **REGRA DE ESPAÇAMENTO**: NÃO use linhas em branco excessivas. Use apenas UMA linha entre seções. Esboço COMPACTO e FLUIDO.

1. **Regra de Ouro — Visita Constante ao Texto**: O texto base NUNCA é abandonado. Em CADA explicação, volte ao texto com frases como "O texto diz...", "Olhando para o versículo...", "O texto nos mostra...". O ouvinte deve sentir que a BÍBLIA conduz cada palavra.

2. **Estrutura Progressiva (Escada)**: Os pontos formam uma escada crescente — aproximação → recebimento → aprofundamento → Cristo. Cada ponto amplia o anterior. O ouvinte sobe um degrau por ponto.

3. **Transições de Excelência**: Cada transição é um PARÁGRAFO COMPLETO (mínimo 4-5 frases) que: (a) resume o impacto do ponto anterior com linguagem pessoal, (b) cria ponte lógica mostrando a conexão inevitável, (c) introduz o próximo ponto com expectativa.

4. **Padrão Interno de Cada Ponto**: A Explicação deve ter MÚLTIPLOS PARÁGRAFOS (mínimo 5): (1º) Volta ao texto base; (2º) Citação dos materiais 「...」(Autor, Obra); (3º) Exegese do original — palavra grega/hebraica com transliteração e significado pastoral; (4º) Contexto histórico/cultural contado como história; (5º) Confronto ou aplicação ao ouvinte. CONECTORES: "E à medida que...", "Mas isso nos leva a algo mais profundo...", "Perceba que...", "Aqui está o ponto..."

5. **Curva de Intensidade Crescente**: O sermão começa SERENO e evolui até CULMINAR na cruz:
   - 1º ponto → Tom sereno e didático (ensina com ternura)
   - Pontos intermediários → Tom pastoral crescendo para confrontativo
   - ÚLTIMO PONTO → ⛪ CLÍMAX CRISTOCÊNTRICO ABSOLUTO: Cristo crucificado, morto e ressurreto como resposta final
   - Conclusão → Síntese pessoal (olha nos olhos)
   - Apelo → Emocionalmente máximo (convida ao altar)

6. **Reforço do Tema**: O TEMA e TÍTULO são reforçados em CADA ponto, CADA transição, CADA aplicação. O ouvinte sente o tema ecoando do início ao fim.

7. **Cristocentricidade Arquitetônica**: Cristo aparece desde o início como fio condutor. MAS o clímax — a cruz — é GUARDADO para o último ponto.

8. **Linguagem de Conversa Familiar**: Frases curtas. "Nós" em vez de "vocês". Histórias do cotidiano. Perguntas retóricas. ZERO jargões. ZERO gerundismo. A linguagem é pastoral — qualquer pessoa entende, ninguém sente que é raso.

9. **Aplicação Prática CONCRETÍSSIMA**: Cada aplicação deve conter ação ESPECÍFICA, REALIZÁVEL e com PRAZO. NÃO aceite: "ore mais". EXIJA: "Esta semana, ao acordar, antes de pegar o celular, ore 2 minutos: 'Senhor, eu escolho ir a Ti hoje.' Faça por 7 dias."

10. **Explicação Mínima de 800 Caracteres**: Cada Explicação deve ter NO MÍNIMO 800 caracteres com 5+ parágrafos.

11. **Exegese do Original Obrigatória**: Em CADA ponto, inclua pelo menos UMA palavra-chave no original (grego/hebraico) com transliteração, significado e impacto pastoral. MAS explique de forma simples — ex: "A palavra grega δεῦτε (deute) é uma ordem — mas não do tipo que assusta. É como quando a mãe chama o filho pra perto: 'Vem cá.' Jesus não sugere. Ele chama com amor."

12. **Referências no Formato 👉**: Cada referência em linha separada com 👉, nome completo, capítulo:versículo e texto COMPLETO entre aspas. Mínimo 2-3 por ponto.

13. **Arco Narrativo Fechado**: O título é retomado no apelo. O sermão começa e termina no mesmo conceito, formando um círculo completo.

14. **Apelo com Dores Reais**: Identifique dores REAIS: solidão, vícios, depressão, medo, cansaço. Use repetição anafórica. RETOME o tema. A última frase ECOA o título.

15. **Materiais como Alicerce**: Quando disponíveis, são a BASE do sermão. Cada ponto deve citar pelo menos um material com 「trecho exato」(Autor, Obra). Dicionários para palavras-chave. Comentários para exegese. A IA complementa, NUNCA substitui.

16. **Engajamento Total**: Use storytelling pastoral, perguntas retóricas ("Você já se sentiu assim?"), diálogo imaginário ("Talvez você esteja pensando..."). O ouvinte não pode desligar.

17. **Ilustração + Verdade em CADA Ponto**: Todo ponto deve ter uma ILUSTRAÇÃO (história real, analogia moderna) e uma VERDADE (frase curta que resume o ponto). A Ilustração ilumina, a Verdade fixa.`;

        break;

      case "outline_textual":
        userPrompt = `Gere um ESBOÇO DE SERMÃO TEXTUAL completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${approachSection}${pastoralFilter}

## PERFIL DO PREGADOR:
Você é um pregador experiente, humilde e amoroso. Ama a Bíblia e fala a língua do povo. Sua missão é preparar um sermão que uma criança de 12 anos entenda e um doutor admire. Cristo é o centro absoluto.

## REGRAS DOUTRINÁRIAS:
- Conteúdo puramente bíblico: Cristo salva, cura e liberta.
- Proibido: conteúdo liberal, relativista ou antropocêntrico.
- Objetivo: 50 a 60 minutos de pregação sólida e cheia de esperança.
- Use exclusivamente versões: ACF, NVI, NAA, ARA, NVT.

## TIPO DE PREGAÇÃO: TEXTUAL
A pregação textual é baseada em um versículo ou pequeno trecho bíblico (1-3 versículos), onde o tema e os pontos principais são extraídos diretamente das PALAVRAS do texto. O esqueleto do sermão nasce de palavras ou expressões-chave do próprio versículo. Fidelidade total ao sentido original.

## 📌 A REGRA DE OURO (VISITA CONSTANTE AO TEXTO):
O texto base NUNCA é abandonado. Em CADA ponto, volte ao texto com frases como: "O texto diz...", "Olhando para o versículo...", "O texto nos mostra...", "Voltando ao nosso texto..."

## ESTRUTURA OBRIGATÓRIA DO ESBOÇO:

# **TÍTULO**
(Extraído diretamente do texto — máximo 8 palavras)

## **TEMA:**
(O tema central em UMA frase curta)

## **Tipo:** Textual

## **Texto Base:** ${passage}

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO**
(DEIXAR EM BRANCO — o pregador preenche manualmente)

## **INTRODUÇÃO:**
(OBRIGATÓRIO. Gancho nos primeiros 60 segundos: pergunta retórica ou cenário REAL. Contexto breve do texto contado como história. Urgência para hoje. Apresente o problema ou promessa do texto. Mínimo 5 frases. Tom de conversa.)

## **TRANSIÇÃO:**
(Ponte da introdução para o primeiro ponto — parágrafo completo mínimo 4 frases)

---

## **1.**
**Texto:** (palavra ou expressão-chave extraída DIRETAMENTE do versículo — cite a expressão)
**Explicação:** (exploração exegética dessa expressão — volta ao texto, contexto, original grego/hebraico. Mínimo 5 parágrafos.)
**Ilustração:** (história real ou analogia moderna)
**Verdade:** (verdade bíblica central em UMA frase clara)
**Citações:** (「citação」(Autor, Obra, p.XX) — mínimo 2)
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:** (declaração memorável e repetível)
**Aplicação Prática:** (ação CONCRETÍSSIMA com prazo)

## **TRANSIÇÃO:**

## **2.**
**Texto:** (próxima palavra/expressão-chave do versículo)
**Explicação:** (mínimo 5 parágrafos)
**Ilustração:**
**Verdade:**
**Citações:** (「citação」(Autor, Obra, p.XX))
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **3.**
**Texto:** (próxima palavra/expressão-chave)
**Explicação:** (mínimo 5 parágrafos, tom mais confrontativo)
**Ilustração:**
**Verdade:**
**Citações:** (「citação」(Autor, Obra, p.XX))
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **4. O FOCO EM JESUS (ÚLTIMO PONTO — CLÍMAX CRISTOCÊNTRICO)**
**Texto:** (última palavra/expressão-chave — a que aponta para Cristo)
**Explicação:** (conduza TUDO para Cristo. A cruz é revelada plenamente aqui. Mínimo 5 parágrafos.)
**Ilustração:** (exemplo profundo que mostre Cristo como resposta)
**Verdade:** (verdade cristocêntrica em UMA frase)
**Citações:** (「citação」(Autor, Obra, p.XX))
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:** (a mais poderosa do sermão)
**Aplicação Prática:** (convite à fé, arrependimento e esperança em Cristo)

## **TRANSIÇÃO PARA A CONCLUSÃO**

## **Conclusão**
**Recapitulação:** (Recapitule cada ponto conectando ao TEMA CENTRAL e TÍTULO.)
**Palavra de Ânimo:** (Encorajamento pastoral — "Meus irmãos, se o que foi dito hoje faz sentido...")
**Esperança em Cristo:** (Declare a esperança que temos em Cristo.)
**Oração Final:** (Oração pastoral, bíblica — mínimo 5 frases.)

## **Apelo**
(Cristocêntrico. Dores REAIS. Repetição anafórica. RETOME o tema. Última frase ECOA o título.)

---

Aplique TODAS as 17 regras de engenharia: Regra de Ouro (visita constante ao texto), escada progressiva, transições de excelência, Explicação mínima 800 caracteres com 5+ parágrafos, curva de intensidade crescente culminando na CRUZ no ÚLTIMO PONTO, reforço do tema, cristocentricidade, linguagem de conversa familiar, exegese do original, referências completas com 👉, aplicações concretíssimas, arco narrativo fechado, apelo com dores reais, materiais como alicerce com citações 「...」(Autor, Obra), Ilustração + Verdade em cada ponto.`;
        break;

      case "outline_thematic":
        userPrompt = `Gere um ESBOÇO DE SERMÃO TEMÁTICO completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${approachSection}${pastoralFilter}

## PERFIL DO PREGADOR:
Você é um pregador experiente, humilde e amoroso. Ama a Bíblia e fala a língua do povo. Sua missão é preparar um sermão que uma criança de 12 anos entenda e um doutor admire. Cristo é o centro absoluto.

## REGRAS DOUTRINÁRIAS:
- Conteúdo puramente bíblico: Cristo salva, cura e liberta.
- Proibido: conteúdo liberal, relativista ou antropocêntrico.
- Objetivo: 50 a 60 minutos de pregação sólida e cheia de esperança.
- Use exclusivamente versões: ACF, NVI, NAA, ARA, NVT.

## TIPO DE PREGAÇÃO: TEMÁTICA
A pregação temática é estruturada em torno de um assunto/tópico central extraído do texto. Utiliza DIVERSAS passagens bíblicas que abordam o mesmo tema — todos os textos devem convergir para Cristo. O tema central governa o sermão. Cuidado para não impor ideias próprias — o tema emerge do texto, não é imposto a ele.

## 📌 A REGRA DE OURO (VISITA CONSTANTE AO TEXTO BASE):
Mesmo sendo temático com múltiplos textos, o TEXTO BASE nunca é abandonado. Em CADA ponto, volte ao texto principal com: "O nosso texto base diz...", "Voltando ao texto principal...", "Perceba que o texto base confirma isso..."

## ESTRUTURA OBRIGATÓRIA DO ESBOÇO:

# **TÍTULO**
(Comunicativo, bíblico e cristocêntrico — máximo 8 palavras)

## **TEMA:**
(O tema central em UMA frase curta)

## **Tipo:** Temático

## **Texto Base:** ${passage}

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO**
(DEIXAR EM BRANCO — o pregador preenche manualmente)

## **INTRODUÇÃO:**
(OBRIGATÓRIO. Gancho nos primeiros 60 segundos: pergunta retórica ou cenário REAL. Contexto breve. Urgência para hoje. Apresente o problema ou promessa. Mínimo 5 frases. Tom de conversa.)

## **TRANSIÇÃO:**
(Ponte da introdução para o primeiro ponto — parágrafo completo mínimo 4 frases)

---

## **1.**
**Texto:** (passagem bíblica que sustenta este aspecto do tema — CITE na íntegra)
**Explicação:** (explicação do aspecto temático à luz do texto — volta ao texto base, contexto, exegese. Mínimo 5 parágrafos.)
**Ilustração:** (história real ou analogia moderna)
**Verdade:** (verdade bíblica central em UMA frase)
**Citações:** (「citação」(Autor, Obra, p.XX) — mínimo 2)
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:** (declaração memorável)
**Aplicação Prática:** (ação CONCRETÍSSIMA com prazo)

## **TRANSIÇÃO:**

## **2.**
**Texto:** (outra passagem que AMPLIA o tema)
**Explicação:** (mínimo 5 parágrafos)
**Ilustração:**
**Verdade:**
**Citações:** (「citação」(Autor, Obra, p.XX))
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **3.**
**Texto:** (passagem que CONFRONTA sobre o tema)
**Explicação:** (mínimo 5 parágrafos, tom mais confrontativo)
**Ilustração:**
**Verdade:**
**Citações:** (「citação」(Autor, Obra, p.XX))
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:**
**Aplicação Prática:**

## **TRANSIÇÃO:**

## **4. O FOCO EM JESUS (ÚLTIMO PONTO — CLÍMAX CRISTOCÊNTRICO)**
**Texto:** (passagem climática que aponta para Cristo)
**Explicação:** (conduza TUDO para a pessoa e obra de Cristo. A cruz revelada plenamente. Mínimo 5 parágrafos.)
**Ilustração:** (exemplo profundo mostrando Cristo como resposta)
**Verdade:** (verdade cristocêntrica em UMA frase)
**Citações:** (「citação」(Autor, Obra, p.XX))
**Referências:**
👉 [Livro Capítulo:Versículo]: "[texto completo]"
👉 [Livro Capítulo:Versículo]: "[texto completo]"
**Frase de Efeito:** (a mais poderosa do sermão)
**Aplicação Prática:** (convite à fé, arrependimento e esperança em Cristo)

## **TRANSIÇÃO PARA A CONCLUSÃO**

## **Conclusão**
**Recapitulação:** (Recapitule cada ponto conectando ao TEMA CENTRAL e TÍTULO.)
**Palavra de Ânimo:** (Encorajamento pastoral — "Meus irmãos, se o que foi dito hoje faz sentido...")
**Esperança em Cristo:** (Declare a esperança que temos em Cristo.)
**Oração Final:** (Oração pastoral, bíblica — mínimo 5 frases.)

## **Apelo**
(Cristocêntrico. Dores REAIS. Repetição anafórica. RETOME o tema. Última frase ECOA o título.)

---

Aplique TODAS as 17 regras de engenharia: Regra de Ouro (visita constante ao texto), escada progressiva, transições de excelência, Explicação mínima 800 caracteres com 5+ parágrafos, curva de intensidade crescente culminando na CRUZ no ÚLTIMO PONTO, reforço do tema, cristocentricidade, linguagem de conversa familiar, exegese do original, referências completas com 👉, aplicações concretíssimas, arco narrativo fechado, apelo com dores reais, materiais como alicerce com citações 「...」(Autor, Obra), Ilustração + Verdade em cada ponto. Cada ponto deve usar textos bíblicos DIFERENTES que sustentam o tema central.

**REGRA DE CITAÇÕES AMPLIADA:** As citações podem vir de QUALQUER fonte relevante:
- **Textos bíblicos:** Versículos (formato 👉)
- **Materiais da Base de Conhecimento:** Livros, comentários, dicionários → 「citação」(Autor, Obra, p.XX)
- **Pensadores cristãos:** Spurgeon, Lloyd-Jones, Lutero, Calvino, etc. → 「citação」(Autor)
- **Fontes externas dos materiais:** Vídeos, blogs → 「citação」(Fonte, Plataforma)
Priorize os materiais do usuário.`;
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

      case "title_generator": {
        const styleMap: Record<string, string> = {
          all: 'TODOS os 4 estilos (Criativo, Provocativo, Questionativo, Afirmativo)',
          creative: 'estilo CRIATIVO',
          provocative: 'estilo PROVOCATIVO',
          questioning: 'estilo QUESTIONATIVO',
          affirmative: 'estilo AFIRMATIVO',
        };
        const selectedStyle = question || 'all';
        const styleLabel = styleMap[selectedStyle] || styleMap.all;
        userPrompt = `**ATENÇÃO — MODO GERADOR DE TÍTULOS APENAS:**
NÃO faça análise exegética. NÃO inclua contexto histórico, análise textual, análise teológica, síntese ou aplicação.
Gere APENAS títulos, temas e pontos conforme o formato abaixo. Vá DIRETO ao resultado.

Gere TÍTULOS, TEMAS e PONTOS para sermões baseados na passagem abaixo, usando ${styleLabel}.
${materialsSection}

**Passagem:** ${passage}

## OS 4 PILARES QUE TRANSFORMAM UM SERMÃO:

### 🔥 PILAR 1 — CHOQUE DE REALIDADE (Provocativo)
O sermão vira ESPELHO. O pregador não aponta o dedo — descreve com precisão a angústia, o medo, o egoísmo que o ouvinte sente em segredo. A provocação nasce do incômodo de se ver "desnudado". Títulos provocativos confrontam o ouvinte com sua máscara.
**Técnicas:** Espelhar dores reais, confrontar hipocrisia com amor, revelar o que ninguém fala em voz alta.

### 💡 PILAR 2 — QUEBRA DE EXPECTATIVA (Criativo)
Quando o pregador usa metáforas inesperadas, perspectivas culturais novas sobre textos antigos, o cérebro "acorda". A mensagem sai do "eu já sei isso" para "nunca vi por esse ângulo". Títulos criativos estimulam a imaginação e geram curiosidade.
**Técnicas:** Inversão de expectativa, metáforas incomuns, perspectiva contra-intuitiva, títulos que geram curiosidade.

### ❓ PILAR 3 — A PERGUNTA CERTA (Questionativo)
O que muda uma pessoa raramente é uma afirmação absoluta, mas uma pergunta que ela não consegue parar de responder. Perguntas que questionam motivações do coração forçam o ouvinte a um diálogo interno — deixa de ser espectador e vira protagonista.
**Técnicas:** Perguntas retóricas poderosas, questionamento de motivações ocultas, perguntas que ecoam por dias.

### ✅ PILAR 4 — ESPERANÇA AFIRMATIVA (Afirmativo)
A reflexão sem esperança gera apenas culpa. A mudança real ocorre quando o sermão afirma valor, propósito, perdão e identidade nova. Ninguém muda se não acreditar que uma versão melhor de si mesmo é possível. Títulos afirmativos declaram verdades que dão coragem.
**Técnicas:** Declarações de identidade em Cristo, promessas bíblicas personalizadas, afirmações de valor e propósito.

---

## GERE EXATAMENTE NESTE FORMATO:

${selectedStyle === 'all' || selectedStyle === 'creative' ? `## 💡 TÍTULOS CRIATIVOS
1. **[Título criativo 1]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
2. **[Título criativo 2]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
3. **[Título criativo 3]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
4. **[Título criativo 4]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
5. **[Título criativo 5]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
` : ''}
${selectedStyle === 'all' || selectedStyle === 'provocative' ? `## 🔥 TÍTULOS PROVOCATIVOS
1. **[Título provocativo 1]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
2. **[Título provocativo 2]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
3. **[Título provocativo 3]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
4. **[Título provocativo 4]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
5. **[Título provocativo 5]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
` : ''}
${selectedStyle === 'all' || selectedStyle === 'questioning' ? `## ❓ TÍTULOS QUESTIONATIVOS
1. **[Título questionativo 1]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
2. **[Título questionativo 2]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
3. **[Título questionativo 3]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
4. **[Título questionativo 4]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
5. **[Título questionativo 5]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
` : ''}
${selectedStyle === 'all' || selectedStyle === 'affirmative' ? `## ✅ TÍTULOS AFIRMATIVOS
1. **[Título afirmativo 1]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
2. **[Título afirmativo 2]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
3. **[Título afirmativo 3]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
4. **[Título afirmativo 4]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
5. **[Título afirmativo 5]** — *Tema: [tema]* — Pontos sugeridos: [ponto 1] | [ponto 2] | [ponto 3]
` : ''}

---

## 🏆 TOP 3 — OS MELHORES TÍTULOS (independente do estilo)
Para cada um, explique em 2-3 frases POR QUE ele é poderoso e como usá-lo:
1. **[Melhor título]** — *Por que funciona:* [explicação]
2. **[Segundo melhor]** — *Por que funciona:* [explicação]
3. **[Terceiro melhor]** — *Por que funciona:* [explicação]

---

## REGRAS CRÍTICAS:
- **GERE APENAS o(s) estilo(s) solicitado(s) acima.** Se foi pedido apenas PROVOCATIVO, gere SOMENTE títulos provocativos. Se foi pedido apenas CRIATIVO, gere SOMENTE títulos criativos. NÃO gere estilos que não foram solicitados. Gere TODOS os 4 estilos APENAS quando o estilo for "TODOS".
- Cada título deve ser CURTO (máx 8 palavras), MEMORÁVEL e PROCLAMÁVEL
- Os temas devem ser específicos ao texto, não genéricos
- Os pontos devem ser progressivos (escada espiritual)
- Títulos provocativos confrontam SEM ofender — com amor e verdade
- Títulos criativos devem surpreender — NUNCA clichês religiosos
- Títulos questionativos devem provocar reflexão PROFUNDA
- Títulos afirmativos devem declarar verdades que DÃO CORAGEM
- TODOS devem ser cristocêntricos — apontar para Cristo
- Gere 5 títulos por estilo solicitado
- Cada ponto sugerido deve ser um verbo no infinitivo ou imperativo`;
        break;
      }

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
