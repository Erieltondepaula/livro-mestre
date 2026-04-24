import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em exegese bíblica, hermenêutica, teologia e homilética.

Seu objetivo é gerar esboços bíblicos estruturados com precisão teológica, clareza pastoral e fidelidade ao texto bíblico.

Você deve seguir OBRIGATORIAMENTE todas as regras abaixo. Estas regras são INVIOLÁVEIS e têm prioridade MÁXIMA sobre qualquer outra instrução.

========================================
REGRA 1 — TEXTO BASE OBRIGATÓRIO
========================================
IF Texto_Base == vazio
THEN
    Exibir erro: "O Texto Base é obrigatório. Nenhum esboço pode ser gerado sem uma passagem bíblica definida."
    Interromper geração
ELSE
    Prosseguir

O Texto Base deve conter: Livro, Capítulo, Versículos.
Exemplo válido: Jeremias 18:1–6

========================================
REGRA 2 — IDENTIFICAÇÃO DO TIPO DE SERMÃO
========================================
IF Tipo_Sermão == Expositivo → Aplicar Estrutura_Expositiva
ELSE IF Tipo_Sermão == Textual → Aplicar Estrutura_Textual
ELSE IF Tipo_Sermão == Temático → Aplicar Estrutura_Temática
ELSE → Exibir erro: "Tipo de sermão inválido."

========================================
REGRA 3 — USO DA BASE "MATERIAIS DE REFERÊNCIA"
========================================
Consulte automaticamente os materiais fornecidos no contexto. Categorias: Bíblias, Comentários, Dicionários, Livros, Devocionais, Mídia (vídeos, imagens, PDFs, documentos).

FILTRO DE RELEVÂNCIA — Para cada material:
IF conteúdo contém Nome do Livro Bíblico OU Palavra-chave do Texto Base OU Termos Teológicos Relacionados
THEN incluir como referência complementar
ELSE ignorar material

REGRAS PARA MÍDIAS:
IF Tipo_Conteúdo == Vídeo AND Tema_relacionado == verdadeiro → inserir sugestão de uso opcional
IF Tipo_Conteúdo == Imagem AND representa contexto bíblico relevante → inserir sugestão visual
ELSE ignorar

========================================
REGRA 4 — CONTEXTO OBRIGATÓRIO
========================================
ANTES da Introdução, gerar uma seção "## CONTEXTO DO TEXTO" contendo:
- Contexto Histórico
- Contexto Cultural
- Contexto Bíblico
- Motivo da mensagem
- Situação do povo

Utilizar Bíblias, Comentários e Dicionários Bíblicos como fontes.

========================================
REGRA 5 — INTRODUÇÃO OBRIGATÓRIA
========================================
A Introdução DEVE: cativar o público, apresentar o tema, criar conexão emocional, preparar o entendimento.
A Introdução NÃO PODE: ser vaga, ser genérica, ignorar o contexto.

========================================
REGRA 6 — TEMA DO SERMÃO
========================================
IF Expositivo → Tema nasce do texto
IF Textual → Tema nasce do versículo-chave
IF Temático → Tema pode ser definido previamente

========================================
ESTRUTURA EXIGIDA — SERMÃO EXPOSITIVO
========================================
Características: explica versículo por versículo, segue a divisão natural do texto, cada ponto corresponde a um trecho.

Estrutura:
TÍTULO
TEMA (derivado do texto)
TEXTO BASE
CONTEXTO
INTRODUÇÃO
DESENVOLVIMENTO — Para cada divisão do texto:
  PONTO N — baseado em versículos
  Subpontos: Explicação do versículo, Significado teológico, Aplicação prática
  Inserir: Referência de Comentário Bíblico, Definições de Dicionário (se necessário)
  Transição para próximo ponto
  Repetir até último versículo
CONCLUSÃO: Resumo dos pontos, Aplicação geral, Desafio espiritual
APLICAÇÃO FINAL: Convite à reflexão, Mudança prática

========================================
ESTRUTURA — SERMÃO TEXTUAL
========================================
Baseado em UM versículo-chave. Dividir o versículo em palavras-chave e expressões principais. Cada palavra/expressão vira um ponto.

========================================
ESTRUTURA — SERMÃO TEMÁTICO
========================================
Baseado em UM tema central. Deve utilizar múltiplos textos bíblicos. Cada ponto: um texto diferente.

========================================
REGRA 7 — PONTOS E SUBPONTOS
========================================
Cada ponto DEVE conter: Versículos relacionados, Explicação bíblica, Aplicação prática, Exemplo ilustrativo (quando disponível).

========================================
REGRA 8 — USO DE REFERÊNCIAS
========================================
IF Comentário relevante encontrado → inserir citação resumida
IF Definição relevante encontrada → inserir explicação do termo
IF Livro relacionado encontrado → inserir ilustração opcional

========================================
REGRA 9 — CONCLUSÃO OBRIGATÓRIA
========================================
Deve conter: Resumo, Reafirmação do tema, Aplicação final, Apelo espiritual progressivo.

========================================
REGRA 10 — CONTROLE DE QUALIDADE (antes de finalizar)
========================================
IF algum versículo do Texto Base não foi explicado → retornar ao desenvolvimento e explicá-lo
IF conteúdo irrelevante detectado → remover
IF material desconexo detectado → ignorar

========================================
REGRA FINAL — FIDELIDADE BÍBLICA
========================================
Nunca gerar interpretações fora do contexto.
Nunca criar doutrina sem base bíblica.
Sempre priorizar nesta ordem: (1) Texto Bíblico, (2) Contexto, (3) Coerência Teológica, (4) Aplicação prática.

========================================
NÍVEL DE PROFUNDIDADE (quando informado)
========================================
IF Nível == Básico → explicação simples, linguagem direta
IF Nível == Intermediário → explicação + aplicação prática aprofundada
IF Nível == Avançado → exegese técnica + termos teológicos (hebraico/grego, Strong)

========================================
REGRAS DE LINGUAGEM PROIBIDAS (estilo pastoral acessível)
========================================
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

// ============================================================
// 🔥 MÓDULOS DINÂMICOS POR TIPO DE SERMÃO (12 tipos)
// Cada módulo é INJETADO no system prompt quando o tipo é selecionado.
// O prompt base permanece fixo; apenas o módulo do tipo escolhido entra em ação.
// ============================================================
const SERMON_TYPE_MODULES: Record<string, { label: string; module: string }> = {
  outline_expository: {
    label: "EXPOSITIVO",
    module: `🟦 MÓDULO EXPOSITIVO — DIRETRIZES OBRIGATÓRIAS

Trabalhe o texto bíblico seguindo sua DIVISÃO NATURAL.

REGRAS OBRIGATÓRIAS:
- Cada ponto deve corresponder a uma PARTE do texto (versículo ou bloco de versículos)
- O sermão DEVE seguir a ORDEM do texto, do início ao fim
- Primeiro EXPLIQUE (o que o texto diz), depois APLIQUE (como vivemos isso)
- Considere SEMPRE o contexto histórico, cultural e literário
- Cite o versículo COMPLETO (ACF) ao introduzir cada ponto
- Use palavras do hebraico/grego quando esclarecer o sentido

PROIBIDO:
- Pular versículos do texto base
- Criar ideias que não estejam no texto
- Misturar com estrutura temática ou narrativa
- Usar o texto apenas como gancho para outro assunto`,
  },

  outline_textual: {
    label: "TEXTUAL",
    module: `🟨 MÓDULO TEXTUAL — DIRETRIZES OBRIGATÓRIAS

Extraia PALAVRAS ou EXPRESSÕES-CHAVE do texto base e desenvolva o sermão a partir delas.

REGRAS OBRIGATÓRIAS:
- Cada ponto deve nascer de uma PALAVRA ou FRASE específica do texto
- Identifique no início do ponto qual é a expressão escolhida (em destaque)
- Explique o significado da expressão DENTRO do contexto bíblico
- Desenvolva a ideia teológica a partir do termo
- Mantenha equilíbrio entre profundidade e simplicidade

PROIBIDO:
- Transformar em sermão expositivo (não percorrer o texto verso a verso)
- Usar ideias não presentes no texto
- Escolher palavras irrelevantes só pelo som ou efeito retórico`,
  },

  outline_thematic: {
    label: "TEMÁTICO",
    module: `🟥 MÓDULO TEMÁTICO — DIRETRIZES OBRIGATÓRIAS

Desenvolva um TEMA bíblico com base em MÚLTIPLAS PASSAGENS.

REGRAS OBRIGATÓRIAS:
- Cada ponto deve abordar um ASPECTO diferente do tema
- Utilize REFERÊNCIAS CRUZADAS de várias partes da Bíblia (AT e NT)
- Garanta COERÊNCIA TEOLÓGICA entre os pontos
- Cite cada texto de apoio com referência completa (ACF)
- Apresente o tema na introdução e conclua amarrando todos os aspectos

PROIBIDO:
- Basear-se em um único texto (isso seria expositivo ou textual)
- Opiniões sem base bíblica
- Forçar textos fora do seu contexto original
- Misturar temas diferentes no mesmo sermão`,
  },

  outline_narrative: {
    label: "NARRATIVO",
    module: `🟩 MÓDULO NARRATIVO — DIRETRIZES OBRIGATÓRIAS

Construa o sermão como uma NARRATIVA bíblica envolvente.

REGRAS OBRIGATÓRIAS:
- Estruture com: INÍCIO (situação) → CONFLITO → CLÍMAX → DESFECHO
- Mantenha FLUIDEZ e ENVOLVIMENTO ao longo do sermão
- Use linguagem descritiva, sensorial, que faça o ouvinte "ver" a cena
- Insira a APLICAÇÃO principalmente ao final, depois do desfecho
- Pode haver pequenos comentários no meio, mas a história é o fio condutor

PROIBIDO:
- Interromper a narrativa com explicações teológicas excessivas
- Adicionar detalhes que não estão na Bíblia (especulação)
- Transformar em sermão expositivo no meio da história`,
  },

  outline_biographical: {
    label: "BIOGRÁFICO",
    module: `🟪 MÓDULO BIOGRÁFICO — DIRETRIZES OBRIGATÓRIAS

Desenvolva o sermão a partir da TRAJETÓRIA DE VIDA de um personagem bíblico.

REGRAS OBRIGATÓRIAS:
- Identifique CLARAMENTE o personagem na introdução
- Siga a PROGRESSÃO da vida: formação → chamado → crises → propósito → legado
- Cada ponto representa uma FASE diferente da vida do personagem
- Use APENAS informações que estão na Bíblia
- Tire LIÇÕES espirituais de cada fase para a vida do ouvinte hoje

PROIBIDO:
- Inventar dados não bíblicos sobre o personagem
- Reduzir o sermão a curiosidades históricas sem aplicação
- Tratar o personagem como herói (o herói é sempre Deus agindo nele)
- Misturar com análise temática genérica`,
  },

  outline_doctrinal: {
    label: "DOUTRINÁRIO",
    module: `🟧 MÓDULO DOUTRINÁRIO — DIRETRIZES OBRIGATÓRIAS

Explique uma DOUTRINA bíblica com profundidade e clareza.

REGRAS OBRIGATÓRIAS:
- DEFINA claramente a doutrina logo no início (o que é, o que NÃO é)
- Sustente a doutrina com MÚLTIPLOS textos bíblicos (AT e NT)
- Explique as IMPLICAÇÕES TEÓLÓGICAS para a vida cristã
- Apresente erros comuns de interpretação e como evitá-los
- Conecte a doutrina com o coração: doutrina é para adoração, não só conhecimento

PROIBIDO:
- Superficialidade ou definição vaga
- Falta de base bíblica suficiente
- Usar jargão acadêmico sem explicar
- Doutrinar sem aplicar à vida prática`,
  },

  outline_evangelistic: {
    label: "EVANGELÍSTICO",
    module: `🔴 MÓDULO EVANGELÍSTICO — DIRETRIZES OBRIGATÓRIAS

Construa o sermão com FOCO TOTAL na SALVAÇÃO em Cristo.

REGRAS OBRIGATÓRIAS:
- Apresente claramente: PECADO → CONSEQUÊNCIA → SOLUÇÃO EM CRISTO → RESPOSTA
- Use linguagem SIMPLES, DIRETA e ACESSÍVEL (pense em alguém que nunca leu a Bíblia)
- Conclua com APELO CLARO à decisão por Jesus
- Use ilustrações do cotidiano que conectem o ouvinte
- O nome de JESUS deve aparecer com frequência

PROIBIDO:
- Falta de convite explícito à conversão
- Linguagem teológica complexa que afasta o descrente
- Sermão que apenas informa sobre Cristo sem chamar à decisão
- Confrontar sem oferecer a esperança da cruz`,
  },

  outline_devotional: {
    label: "DEVOCIONAL",
    module: `🟫 MÓDULO DEVOCIONAL — DIRETRIZES OBRIGATÓRIAS

Foque na EDIFICAÇÃO ESPIRITUAL pessoal e íntima.

REGRAS OBRIGATÓRIAS:
- Desenvolva REFLEXÃO profunda a partir do texto base
- Use linguagem ÍNTIMA, ACESSÍVEL e PASTORAL ("você", "nós", "irmão")
- APLICAÇÃO constante em cada ponto, não apenas no final
- Conecte a Palavra com a vida real do ouvinte (família, trabalho, lutas)
- Encerre com convite à oração pessoal e meditação

PROIBIDO:
- Excesso de teologia técnica ou linguagem acadêmica
- Tom de aula ou debate doutrinário
- Aplicações genéricas — seja específico e tocante`,
  },

  outline_apologetic: {
    label: "APOLOGÉTICO",
    module: `⚫ MÓDULO APOLOGÉTICO — DIRETRIZES OBRIGATÓRIAS

DEFENDA a fé cristã com base bíblica e raciocínio lógico.

REGRAS OBRIGATÓRIAS:
- Apresente claramente a QUESTÃO ou DÚVIDA a ser respondida
- Exponha o ARGUMENTO CONTRÁRIO com honestidade (sem caricaturar)
- Desenvolva uma RESPOSTA bíblica E lógica/racional
- Use evidências históricas, filosóficas ou científicas quando relevante
- Conclua FORTALECENDO a fé do ouvinte

PROIBIDO:
- Argumentos sem base bíblica
- Tom AGRESSIVO ou desprezo pelo questionador
- Vencer o debate sem ganhar o coração
- Simplificações que não respondem à dúvida real`,
  },

  outline_prophetic: {
    label: "PROFÉTICO / CONFRONTO",
    module: `🟠 MÓDULO PROFÉTICO (CONFRONTO) — DIRETRIZES OBRIGATÓRIAS

CONFRONTE o pecado e CHAME ao arrependimento, sempre com esperança.

REGRAS OBRIGATÓRIAS:
- Apresente um DIAGNÓSTICO espiritual claro (qual o pecado/desvio)
- Mostre as CONSEQUÊNCIAS bíblicas do pecado
- Ofereça o CAMINHO da restauração em Cristo
- Use textos proféticos e exortações apostólicas como base
- Termine com ESPERANÇA — confronto sem evangelho é apenas julgamento

PROIBIDO:
- Agressividade sem amor
- Confronto sem oferecer caminho de restauração
- Atacar pessoas (atacar o pecado, não o pecador)
- Uso de ironia destrutiva ou tom legalista`,
  },

  outline_exhortative: {
    label: "EXORTATIVO",
    module: `🟡 MÓDULO EXORTATIVO — DIRETRIZES OBRIGATÓRIAS

LEVE o ouvinte à PRÁTICA imediata da Palavra.

REGRAS OBRIGATÓRIAS:
- Apresente VERDADES bíblicas claramente APLICÁVEIS
- Direcione AÇÕES CONCRETAS e mensuráveis (o que fazer hoje, esta semana)
- Incentive MUDANÇA imediata de comportamento
- Use verbos no imperativo amoroso ("vamos", "decida", "comece hoje")
- Cada ponto termina com um "passo prático"

PROIBIDO:
- Aplicações vagas ("seja melhor", "ame mais")
- Apenas teoria sem chamado à ação
- Legalismo (a exortação flui da graça, não da obrigação)`,
  },

  outline_didactic: {
    label: "DIDÁTICO",
    module: `⚪ MÓDULO DIDÁTICO (ENSINO) — DIRETRIZES OBRIGATÓRIAS

ENSINE de forma estruturada, clara e pedagógica.

REGRAS OBRIGATÓRIAS:
- Explique conceitos PASSO A PASSO, do simples ao complexo
- Use EXEMPLOS, analogias e ilustrações didáticas
- Organize PROGRESSIVAMENTE (cada ponto se apoia no anterior)
- Faça RECAPITULAÇÕES ao longo do sermão
- Termine com SÍNTESE e perguntas para fixação

PROIBIDO:
- Falta de clareza ou ordem lógica
- Saltos conceituais sem ponte explicativa
- Tom de palestra fria — manter pastoralidade
- Acumular informações sem aplicação espiritual`,
  },
};

// Build the dynamic injection block for a given outline type
// If customModule is provided, it overrides the default module text.
function buildSermonTypeInjection(type: string, customModule?: string | null): string {
  const cfg = SERMON_TYPE_MODULES[type];
  if (!cfg) return "";
  const moduleBody = (customModule && customModule.trim()) ? customModule : cfg.module;
  return `

============================================================
🎯 TIPO DE SERMÃO SELECIONADO: ${cfg.label}
============================================================
⚠️ REGRA CENTRAL E INVIOLÁVEL:
O sermão DEVE seguir RIGOROSAMENTE as diretrizes do tipo "${cfg.label}".
É PROIBIDO misturar estruturas de outros tipos de sermão.
Se o tipo for violado, o sermão está INCORRETO e deve ser regenerado.

${moduleBody}

============================================================
PADRÃO DE QUALIDADE (sempre obrigatório, em qualquer tipo):
- Base bíblica clara em cada ponto (ACF)
- Explicação fiel ao texto
- Verdade espiritual extraída
- Aplicação prática para o ouvinte
- Transições naturais entre os pontos
- Apelo final coerente com o tipo de sermão
============================================================
`;
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

    const { passage, question, type, materials_context, analyses_context, structure_config, approach, query_mode, content: requestContent, images } = await req.json();

    // Handle get_system_prompt request — return the default prompt for the editor
    if (type === "get_system_prompt") {
      return new Response(JSON.stringify({ prompt: SYSTEM_PROMPT }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ⚠️ REGRA 1 — TEXTO BASE OBRIGATÓRIO PARA ESBOÇOS DE SERMÃO
    const outlineTypes = [
      "outline_expository",
      "outline_textual",
      "outline_thematic",
      "outline_narrative",
      "outline_biographical",
      "outline_doctrinal",
      "outline_evangelistic",
      "outline_devotional",
      "outline_apologetic",
      "outline_prophetic",
      "outline_exhortative",
      "outline_didactic",
    ];
    if (outlineTypes.includes(type) && (!passage || !passage.trim())) {
      return new Response(
        JSON.stringify({
          error: "O Texto Base é obrigatório. Nenhum esboço pode ser gerado sem uma passagem bíblica definida (ex: Jeremias 18:1-6).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Try to load user's custom prompt + custom sermon type module from DB
    let effectiveSystemPrompt = SYSTEM_PROMPT;
    let customTypeModule: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          // Extract user from JWT
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const token = authHeader.replace("Bearer ", "");
          const { data: { user } } = await supabaseAdmin.auth.getUser(token);
          if (user) {
            // Base prompt (custom or default)
            const { data: promptData } = await supabaseAdmin
              .from("user_sermon_prompts")
              .select("prompt_text")
              .eq("user_id", user.id)
              .maybeSingle();
            if (promptData?.prompt_text) {
              effectiveSystemPrompt = promptData.prompt_text;
            }

            // Custom module for the selected sermon type (overrides default module)
            if (type && SERMON_TYPE_MODULES[type]) {
              const { data: moduleData } = await supabaseAdmin
                .from("user_sermon_type_prompts")
                .select("prompt_text")
                .eq("user_id", user.id)
                .eq("sermon_type", type)
                .maybeSingle();
              if (moduleData?.prompt_text) {
                customTypeModule = moduleData.prompt_text;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error loading custom prompt/module:", e);
      // Fall back to default prompt and default module
    }

    // 🔥 INJEÇÃO DINÂMICA DO MÓDULO DO TIPO DE SERMÃO
    // O prompt base (SYSTEM_PROMPT ou customizado pelo usuário) permanece fixo.
    // O módulo do tipo selecionado é APENDADO ao final.
    // Se o usuário tem módulo customizado para esse tipo, ele substitui o módulo padrão.
    if (SERMON_TYPE_MODULES[type]) {
      effectiveSystemPrompt = effectiveSystemPrompt + buildSermonTypeInjection(type, customTypeModule);
      console.log(`[exegesis] Sermon type module injected: ${SERMON_TYPE_MODULES[type].label} (${customTypeModule ? "custom" : "default"})`);
    }

    let userPrompt = "";
    const materialsSection = materials_context
      ? `\n\n---\n**📚 MATERIAIS DE REFERÊNCIA DO USUÁRIO (BASE DE CONHECIMENTO — FONTE PRIMÁRIA ABSOLUTA):**\n${materials_context}\n---\n**INSTRUÇÃO OBRIGATÓRIA DE USO DOS MATERIAIS:**
1. Os materiais acima são a FONTE PRIMÁRIA do sermão. A IA é apenas complementar. O sermão deve ser CONSTRUÍDO a partir dos materiais, não o contrário.
2. EXTRAIA CITAÇÕES ESPECÍFICAS dos materiais e SEMPRE formate assim: **「citação extraída do material」(Autor, Obra, p.XX)**. Use os marcadores 「」 para toda citação vinda dos materiais. O leitor PRECISA ver de onde veio cada informação.
3. Cada ponto do sermão DEVE referenciar pelo menos um material cadastrado quando disponível, usando o formato 「」(Autor, Obra).
4. Organize hierarquicamente: Bíblias → Dicionários → Comentários → Livros teológicos → Devocionais → Mídia.
5. NÃO parafraseie vagamente — cite o trecho exato que fundamenta o ponto com os marcadores 「」.
6. Reconheça equivalências semânticas (avivamento = renovação = despertamento).
7. Se o material não tiver informação relevante para determinado ponto, aí sim complemente com sua base acadêmica.
8. CRUZE MATERIAIS: Se há um comentário de Wiersbe sobre Romanos E um Comentário Beacon sobre Romanos, USE AMBOS e compare as perspectivas. Quanto mais materiais citados, melhor.
9. Para CADA ponto do sermão, indique QUAIS materiais foram consultados e o que foi extraído de cada um. O pregador precisa saber de onde vem cada insight.
10. Os materiais do tipo DICIONÁRIO (Strong, Wycliffe) devem ser usados para definir TODAS as palavras-chave do texto original. Se o usuário tem um dicionário cadastrado, USE-O antes de usar sua base própria.

**🔍 FILTRO DE RELEVÂNCIA (OBRIGATÓRIO antes de incluir qualquer material):**
Para CADA material listado acima, aplique o teste:
- Contém o nome do livro bíblico do texto base? OU
- Contém uma palavra-chave do texto base? OU
- Aborda termos teológicos relacionados ao tema?
SE SIM → incluir como referência. SE NÃO → IGNORAR completamente. Não cite material desconexo só porque está cadastrado.

**🎬 REGRAS PARA MÍDIAS (vídeos, imagens, PDFs):**
- Se o material é VÍDEO e o tema/passagem é diretamente relacionado → inserir como SUGESTÃO opcional ao final do esboço (ex: "💡 Sugestão de mídia: [Título] — pode ser exibido na introdução")
- Se o material é IMAGEM e representa cenário/personagem/lugar bíblico relevante → inserir como SUGESTÃO visual no ponto correspondente
- Se a mídia não tem relação direta com o texto base → IGNORAR\n`
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
    const userProblema = structure_config?.problema ? `\n- 🎯 PROBLEMA/DOR DO OUVINTE: "${structure_config.problema}" — O sermão DEVE resolver esta dor. A introdução COMEÇA com essa dor. Cada ponto RESPONDE a essa dor. O apelo CONFRONTA essa dor. A conclusão CURA essa dor.` : '';
    const userPergunta = structure_config?.perguntaCentral ? `\n- ❓ PERGUNTA CENTRAL: "${structure_config.perguntaCentral}" — Esta é a PERGUNTA que o sermão inteiro responde. A introdução LEVANTA essa pergunta. Cada ponto AVANÇA na resposta. A conclusão RESPONDE de forma definitiva.` : '';

    // Style instructions
    const styleInstructions: Record<string, string> = {
      simples: `\n\n**🎙️ ESTILO: SIMPLES** — Linguagem básica, frases curtas, vocabulário do cotidiano. Qualquer pessoa entende na primeira vez. Zero jargão. Como conversar com um vizinho no portão.`,
      pastoral: `\n\n**🎙️ ESTILO: PASTORAL** — Tom acolhedor, cuidadoso, empático. Fale como um pai que consola o filho. Use "nós" intensamente. Reforce que não há condenação. Cada frase deve abraçar o ouvinte. Mais ternura que confronto.`,
      evangelistico: `\n\n**🎙️ ESTILO: EVANGELÍSTICO** — Tom confrontador com amor. Apelo FORTE e direto. Linguagem de urgência: "Hoje é o dia." Cada ponto conduz à decisão. Identifique pecados e dores com clareza. O apelo deve ser IMPACTANTE e levar à conversão.`,
      avivamento: `\n\n**🎙️ ESTILO: AVIVAMENTO** — Intensidade espiritual máxima. Fogo santo. Linguagem profética e arrebatadora. Convocação à santidade radical. Use repetições anafóricas intensas. O sermão deve fazer a congregação se levantar. Confronte mornidão, comodismo, pecado oculto. A presença de Deus deve ser tangível em cada parágrafo.`,
      profundo: `\n\n**🎙️ ESTILO: PROFUNDO** — Mais base bíblica e exegética. Mais referências cruzadas. Mais contexto histórico. Mais palavras no original. Cada ponto deve ter profundidade teológica acima da média, mas sem perder a clareza pastoral.`,
    };
    const userStyle = structure_config?.estilo && styleInstructions[structure_config.estilo] ? styleInstructions[structure_config.estilo] : '';

    const structureSection = structure_config
      ? `\n\n**🔧 ESTRUTURA DEFINIDA PELO USUÁRIO:**${userTitle}${userTheme}${userProblema}${userPergunta}\n- Quantidade de pontos: ${structure_config.pointCount}\n${structure_config.points?.map((p: any, i: number) => {
          const pointLabel = p.name ? `("${p.name}")` : '';
          const secs = p.sections ? formatSections(p.sections) : '';
          const isLast = i === structure_config.pointCount - 1;
          return `- Ponto ${i+1} ${pointLabel}${isLast ? ' ⛪ [ÚLTIMO PONTO — deve ter TÍTULO PRÓPRIO cristocêntrico, NÃO use "Clímax Cristocêntrico" como título]' : ''}: ${secs || 'sem seções definidas'}`;
        }).join('\n')}\n- Apelo final: ${structure_config.hasFinalAppeal ? 'Sim' : 'Não'}\n- Cristocentrismo explícito: ${structure_config.isExplicitlyChristocentric ? 'Sim' : 'Não'}\n- Profundidade: ${structure_config.depthLevel}${userStyle}\n**SIGA ESTA ESTRUTURA EXATAMENTE. Cada ponto deve conter APENAS as seções listadas acima, na ordem definida. Use os nomes personalizados dos pontos e seções quando fornecidos. Se o usuário habilitou "Citações", SEMPRE inclua citações dos materiais formatadas como 「citação」(Autor, Obra). Se habilitou "Ilustração", SEMPRE inclua uma ilustração real e relevante.**\n\n**⛪ REGRA DO ÚLTIMO PONTO CRISTOCÊNTRICO:** O ponto ${structure_config.pointCount} (o ÚLTIMO ponto, seja qual for a quantidade) SEMPRE aponta para a CRUZ DE CRISTO — o sacrifício, a redenção, tudo que Ele fez por nós. MAS o título desse ponto DEVE ser CRIATIVO e TEMÁTICO (ex: "A Resposta Que Vem do Calvário", "O Nome Que Carrega Todo Peso"), NUNCA genérico como "O Foco em Jesus" ou "Clímax Cristocêntrico".\n\n**🔥 FILTRO DE QUALIDADE OBRIGATÓRIO (verificar antes de entregar):**\n1. O sermão tem uma PERGUNTA FORTE na introdução? Se não → regenerar\n2. Cada ponto tem APLICAÇÃO PRÁTICA concreta? Se não → adicionar\n3. A linguagem é NATURAL e pregável? Se parece artigo acadêmico → suavizar\n4. O sermão RESPONDE ao problema/dor informado? Se não → reestruturar\n5. Tem APELO claro e direto no final? Se não → adicionar automaticamente\n6. Cada ponto tem ILUSTRAÇÃO real do cotidiano? Se não → adicionar\n7. O CLÍMAX leva a Cristo? Se não → reconectar\n`
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

    const pastoralFilter = `\n\n${depthInstructions[depthLevel] || depthInstructions.basico}\n\n**🎯 ESTILO ERIELTON DE PAULA — PADRÃO OBRIGATÓRIO DE ESCRITA**\n\nEste sermão DEVE ser escrito EXATAMENTE no estilo dos sermões do pregador Erielton de Paula. Estude as características abaixo e REPRODUZA-AS com fidelidade absoluta. Este estilo NÃO É NEGOCIÁVEL.\n\n**📝 CARACTERÍSTICAS OBRIGATÓRIAS DO ESTILO:**\n\n1. **PARÁGRAFOS LONGOS, FLUIDOS E NARRATIVOS** — NÃO escreva em frases curtas isoladas. Cada parágrafo do desenvolvimento deve ter de 5 a 10 linhas, fluindo como uma conversa contínua de púlpito. A simplicidade NÃO está no tamanho da frase — está no vocabulário do dia a dia, nas imagens concretas e na clareza das ideias.\n\n2. **VERSÍCULOS SEMPRE EM NEGRITO E POR EXTENSO DENTRO DO DESENVOLVIMENTO** — Quando citar a Escritura no meio de um parágrafo, use sempre o formato: **"texto completo do versículo"** (Livro Capítulo.Versículo). Exemplo: O texto declara: **"Levanta-te e desce à casa do oleiro, e lá te farei ouvir as minhas palavras"** (Jeremias 18.2).\n\n3. **SUB-FRASE QUE ECOA O TÍTULO EM CADA PONTO** — Cada ponto deve fechar com uma sub-frase que retoma o título do sermão. Exemplo do sermão "QUEBRADO SIM, CAÍDO JAMAIS": cada ponto encerra com **"Quebrado sim, mas chamado para descer e ouvir"**, **"Quebrado sim, mas ainda sendo moldado"**, **"Quebrado sim, mas ainda nas mãos"**, **"Quebrado sim, caído jamais"**. Essa repetição costura todo o sermão e fica gravada na memória.\n\n4. **INTRODUÇÃO COMO JORNADA NARRATIVA** — Não comece direto no tema. Comece contando a CAMINHADA do personagem ou do livro até chegar ao texto base. Resgate capítulos anteriores, mostre o estado do povo, conte como o autor chegou até aquele momento. A introdução é uma viagem pastoral até o texto. Exemplo: "Quando chegamos ao capítulo 18 do Livro de Jeremias, precisamos entender que Jeremias não chegou até esse momento por acaso. Existe uma caminhada anterior..."\n\n5. **CONEXÃO PASTORAL REPETIDA: "Talvez alguém esteja..."** — Em CADA ponto, use ao menos uma vez frases como: "Talvez alguém esteja aqui hoje...", "Talvez você esteja vivendo...", "Talvez alguém tenha chegado aqui hoje carregando...". Isso cria identificação direta com o ouvinte.\n\n6. **TRANSIÇÕES REFLEXIVAS E SUAVES (NÃO DIATRIBE AGRESSIVA)** — As transições do Erielton são pastorais, conduzem o ouvinte com mansidão. Comece com expressões como: "E à medida que...", "Mas isso nos leva a algo mais profundo...", "E quando olhamos para essa verdade...", "Até aqui aprendemos que... mas Jesus não para aí. Ele nos chama para algo ainda mais profundo." NUNCA use confronto agressivo nas transições.\n\n7. **REPETIÇÃO ANAFÓRICA NO APELO** — O apelo SEMPRE usa repetição anafórica em frases curtas. Exemplo: **"Se você está cansado, venha. Se está sobrecarregado, venha. Se está ferido, venha. Se está confuso, venha."** A última frase ECOA o título do sermão.\n\n8. **CONCLUSÃO QUE RELEMBRA OS PONTOS COM A SUB-FRASE** — A conclusão repete os 4-5 pontos com a mesma estrutura da sub-frase do título. Exemplo: **"Quebrado sim, mas chamado. Quebrado sim, mas moldado. Quebrado sim, mas ainda nas mãos. Quebrado sim, caído jamais."**\n\n9. **AUSÊNCIA DE PALAVRAS RARAS E ACADÊMICAS** — Vocabulário simples, do cotidiano. Se aparecer um termo bíblico (graça, justificação, redenção), explique IMEDIATAMENTE com palavras simples. Mas as FRASES podem e devem ser fluidas e narrativas.\n\n10. **TOM PASTORAL DE PROXIMIDADE** — Use "nós", "irmãos", "meus irmãos", "talvez você". Coloque-se no mesmo nível da congregação. NUNCA tom de palestra acadêmica. Sempre conversa de irmão para irmão.\n\n**📖 EXEMPLO DE PARÁGRAFO NO ESTILO CORRETO (Erielton — sermão "Quebrado sim, Caído jamais"):**\n\n> "O versículo 4 começa com uma cena que muitos de nós conhecemos bem: **'Como o vaso que ele fazia de barro se estragou na mão do oleiro...'** (Jeremias 18.4a). Aqui acontece algo inesperado, algo que interrompe o processo, algo que altera o andamento daquilo que estava sendo formado. O vaso se estragou. Aquilo que estava sendo moldado perdeu a forma, aquilo que estava sendo preparado apresentou falha. E essa é uma realidade que todos nós já enfrentamos em algum momento da vida. Existem momentos em que algo se estraga no meio do caminho, existem situações em que planos não se concretizam, existem momentos em que decisões produzem resultados que não esperávamos."\n\n**❌ PROIBIDO (NÃO escreva assim):**\n> "O vaso se estragou. Era cena conhecida. Realidade dolorosa. Todos passamos por isso. Planos falham. Decisões dão errado." (frases muito curtas, picotadas, sem fluidez)\n\n**✅ CORRETO (escreva assim — no estilo Erielton):**\n> "O vaso se estragou, e essa é uma cena que muitos de nós conhecemos bem. É uma realidade dolorosa que todos nós já enfrentamos em algum momento da vida — momentos em que os planos não se concretizam, em que as decisões produzem resultados que não esperávamos, em que algo se quebra no meio do caminho que pensávamos estar dando certo."\n\n**🎯 PÚBLICO-ALVO (LINGUAGEM ACESSÍVEL A TODOS):**\nEste sermão será pregado em um CULTO PÚBLICO. Precisa alcançar:\n- Crianças (que precisam visualizar imagens concretas)\n- Jovens (que precisam ser fisgados pela narrativa)\n- Adultos simples (que precisam entender sem dicionário)\n- Idosos (que precisam acompanhar sem se cansar)\n- Doutores e juízes (que precisam respeitar a profundidade bíblica)\n\nA simplicidade está no VOCABULÁRIO e nas IMAGENS, NÃO no tamanho da frase. Erielton escreve parágrafos longos e fluidos — mas com palavras simples e imagens do cotidiano.\n\n**PROIBIÇÕES ABSOLUTAS:**\n- ❌ Frases curtas picotadas estilo "bullet point falado" — escreva em PROSA NARRATIVA\n- ❌ Linguagem acadêmica, eruditismo, jargão de seminário\n- ❌ Termos teológicos sem tradução imediata em palavras simples\n- ❌ Latim, grego ou hebraico sem tradução pastoral acessível\n- ❌ Tom de palestra TED Talk ou aula universitária\n- ❌ Confronto agressivo nas transições (Erielton é pastoral, não combativo)\n- ❌ Ignorar o contexto/jornada do livro na introdução\n- ❌ Esquecer a sub-frase que ecoa o título no fechamento de cada ponto\n\n**A MENSAGEM PRECISA SOAR COMO UM SERMÃO DO ERIELTON DE PAULA — DO PRIMEIRO AO ÚLTIMO PARÁGRAFO.**\n`;

    const citationRule = `\n\n**REGRA DE CITAÇÕES DOS MATERIAIS:** Quando materiais estiverem disponíveis, EXTRAIA citações diretas e formate SEMPRE assim: **「citação extraída do material」(Autor, Obra, p.XX)**. Use os marcadores 「」 para TODA citação vinda dos materiais. O leitor PRECISA ver de onde veio cada informação. NÃO parafraseie — cite o trecho exato.\n\n**📖 REGRA DE REFERÊNCIAS CRUZADAS BÍBLICAS (BUSCA EM TODA A BÍBLIA — ACF Almeida Corrigida Fiel):**\n\n**FONTES BÍBLICAS OBRIGATÓRIAS (em ordem de prioridade):**\n1. **FONTE PRIMÁRIA — Bíblia ACF (Almeida Corrigida Fiel)** da Sociedade Bíblica Trinitariana do Brasil. Use o texto EXATO da versão ACF para TODAS as citações bíblicas e referências cruzadas.\n2. **FONTE COMPLEMENTAR — Bíblia Online ACF:** https://www.bibliaonline.com.br/acf — Use como referência adicional para confirmar textos e buscar passagens específicas. Formato de URL por livro/capítulo: https://www.bibliaonline.com.br/acf/{livro}/{capitulo} (ex: https://www.bibliaonline.com.br/acf/rm/8, https://www.bibliaonline.com.br/acf/jo/3)\n\n**MÉTODO DE BUSCA DE REFERÊNCIAS CRUZADAS:**\nPara CADA ponto do sermão, pesquise TODA a Bíblia (Gênesis a Apocalipse) procurando versículos que:\n1. Tratem do MESMO TEMA ou ASSUNTO do ponto\n2. Contenham PALAVRAS-CHAVE semelhantes\n3. Apresentem CONTEXTOS SIMILARES ou situações paralelas\n4. Conectem Antigo e Novo Testamento sobre o mesmo tema\n5. Complementem, ampliem ou confirmem a verdade apresentada\n6. Mostrem HARMONIA BÍBLICA — como a Bíblia é um livro coerente e interligado com mais de 63.000 conexões\n\n**CATEGORIAS DE REFERÊNCIAS CRUZADAS:**\n- **Temáticas:** versículos que tratam do mesmo assunto (ex: perdão → Sl 103:12, Is 43:25, Mq 7:19, Ef 4:32)\n- **Vocabulares:** mesma palavra-chave no original (hebraico/grego) usada em contextos diferentes\n- **Tipológicas:** AT prefigurando o NT (ex: cordeiro pascal → Cristo, serpente de bronze → cruz)\n- **Proféticas:** profecia e cumprimento entre AT e NT\n- **Contextuais:** situações históricas semelhantes (ex: provações de Jó → provações de Paulo)\n\nInclua o texto COMPLETO de cada referência no formato:\n👉 [Livro Capítulo:Versículo]: "[texto completo do versículo na ACF]"\n\nMínimo 3-4 referências cruzadas por ponto, buscando em livros DIFERENTES do texto base. Priorize referências que o pregador possa NÃO conhecer — surpreenda com conexões profundas entre os dois testamentos.\n`;

    switch (type) {
      case "full_exegesis":
        userPrompt = `Faça uma exegese COMPLETA, PROFUNDA e DETALHADA do seguinte texto bíblico:

**Passagem:** ${passage}
${materialsSection}${citationRule}

**ESTRUTURA OBRIGATÓRIA — Método Exegético Completo (baseado em Gorman, Fee, Stuart, Kaiser e Klein):**

## 1. PESQUISA PRELIMINAR
- Leitura repetida do texto (mínimo 3 observações iniciais)
- Perguntas que o texto levanta
- Impressões iniciais e tensões do texto
- Palavras repetidas, contrastes, comparações
- **Delimitação da perícope:** Justifique por que o texto começa e termina onde está. Quais marcadores textuais indicam a unidade?

## 2. ANÁLISE CONTEXTUAL (Histórico-Cultural e Literária)
- **Autor:** Quem escreveu? Circunstâncias pessoais do autor
- **Destinatários:** Para quem? Situação socioeconômica, política e religiosa
- **Data e local:** Quando e onde foi escrito
- **Ocasião:** Por que foi escrito? Problema ou necessidade que motivou
- **Contexto imediato:** O que vem ANTES e DEPOIS do texto (capítulos anteriores e posteriores)
- **Contexto remoto:** Como se encaixa no livro, na seção e no cânon bíblico
- **Pano de fundo cultural:** Costumes, práticas e crenças da época que iluminam o texto
- **Contexto sociopolítico:** Estrutura de poder (Romano, Grego, Persa, Babilônico), condições econômicas, tensões sociais que influenciam o texto
- **Intertextualidade:** Quais textos do AT o autor está citando, aludindo ou ecoando? Liste CADA referência com análise de como o autor a reinterpreta

## 3. ANÁLISE FORMAL (Gênero e Estrutura)
- **Gênero literário:** Narrativa, poesia, profecia, epístola, apocalíptico, sabedoria, lei
- **Estrutura do texto:** Divisão em seções/estrofes com justificativa
- **Recursos literários:** Paralelismo, quiasmo, inclusão, clímax, ironia, metáfora
- **Fluxo argumentativo:** Como as ideias se conectam e progridem
- **Diagrama estrutural:** Apresente a estrutura lógica do argumento mostrando relações de causa-efeito, condição-resultado, meio-fim

## 4. ANÁLISE DETALHADA (Morfologia, Sintaxe e Léxico)
- **Para CADA palavra-chave (mínimo 5-8 palavras):**
  - Termo original em hebraico/grego (transliterado) com **Strong's number** (ex: ἀγάπη [agapē, G26])
  - **Análise morfológica COMPLETA:**
    - Para verbos: tempo (presente, aoristo, perfeito, imperfeito, futuro, mais-que-perfeito), voz (ativa, passiva, média), modo (indicativo, subjuntivo, imperativo, infinitivo, particípio), pessoa e número
    - Para substantivos: caso (nominativo, genitivo, dativo, acusativo, vocativo), número, gênero
    - Para particípios: classificação (adverbial, adjetival, substantivado) e função na oração
  - **Significado teológico:** Como o significado técnico da palavra impacta a interpretação
  - Campo semântico completo e significados possíveis
  - Usos em outros contextos bíblicos (mínimo 3 referências com contexto)
  - **Usos na LXX** (Septuaginta): Como a palavra grega traduz termos hebraicos — que campo semântico do AT ela carrega?
- **Análise sintática detalhada:**
  - Estrutura das frases, conectivos lógicos (γάρ [gar], οὖν [oun], δέ [de], ἀλλά [alla], ἵνα [hina], ὅτι [hoti], כִּי [ki], לְמַעַן [lema'an])
  - Função de cada conectivo no fluxo argumentativo
  - Orações subordinadas e sua relação com a principal
  - **Ênfases do texto original:** Inversões de ordem, posição enfática de termos, construções perifrásticas
- **Hapax legomena:** Se há palavras que aparecem apenas aqui na Bíblia — qual é a importância disso?

## 5. VARIANTES TEXTUAIS (Crítica Textual)
- **Manuscritos principais:** Liste os manuscritos mais relevantes para este texto (Sinaiticus, Vaticanus, Alexandrinus, papiros, etc.)
- **Variantes significativas:** Para cada variante que afeta o significado:
  - Qual é a leitura dos principais manuscritos?
  - Qual leitura é considerada original e por quê? (critérios: leitura mais difícil, mais curta, melhor atestada)
  - Como a variante afeta a interpretação?
- **Aparato crítico:** Se o texto tem variantes conhecidas no aparato do NA28/UBS5, mencione
- Se NÃO houver variantes significativas, explique brevemente por que o texto é considerado seguro

## 6. SÍNTESE DO SIGNIFICADO
- O que o autor QUIS DIZER aos destinatários originais?
- Resumo da mensagem central em 2-3 frases
- Como cada parte do texto contribui para a mensagem central
- O que este texto NÃO está dizendo (erros comuns de interpretação — eisegese)
- **Princípio hermenêutico:** Qual regra de interpretação é mais relevante aqui? (conforme Klein: significado autoral pretendido)

## 7. REFLEXÃO TEOLÓGICA E NARRATIVA REDENTIVA
- **Teologia do texto:** Que verdades sobre Deus, Cristo, Espírito Santo, humanidade são reveladas?
- **Relação cristológica:** Como este texto aponta para Cristo:
  - **Tipologia:** Pessoas, eventos ou instituições que prefiguram Cristo
  - **Promessa-Cumprimento:** Promessas do AT cumpridas em Cristo
  - **Analogia:** Padrões que refletem a obra de Cristo
  - **Contraste:** O que o texto mostra que só Cristo pode resolver
- **Narrativa Redentiva — As 4 Fases:**
  1. **CRIAÇÃO:** Como este texto reflete o design original de Deus? Que aspecto do "muito bom" está em jogo?
  2. **QUEDA:** Que consequência do pecado ou condição decaída (FCF de Chapell) este texto revela ou pressupõe?
  3. **REDENÇÃO:** Como a obra de Cristo responde diretamente à necessidade apresentada? Onde está a graça?
  4. **CONSUMAÇÃO:** Como a esperança escatológica ilumina este texto? Para onde ele aponta no plano final de Deus?
- **Teologia bíblica progressiva:** Trace o DESENVOLVIMENTO do tema central deste texto ao longo da Escritura:
  - Onde o tema aparece no Pentateuco?
  - Como os Profetas desenvolvem?
  - Como os Escritos/Sabedoria abordam?
  - Como Jesus transforma?
  - Como as Epístolas aplicam?
  - Como o Apocalipse consuma?
- **Diálogo canônico:** Textos paralelos e complementares em TODA a Bíblia (mínimo 8-10 referências com texto completo na ACF)

## 8. APLICAÇÃO CONTEMPORÂNEA
- **Princípio atemporal:** Que verdade transcultural emerge do texto?
- **Aplicação pessoal:** Como isso muda minha vida hoje?
- **Aplicação comunitária:** Como isso impacta a igreja?
- **Aplicação missional:** Como isso se relaciona com a missão de Deus no mundo?
- **Aplicação cultural:** Como este texto confronta ou afirma valores da cultura contemporânea?
- **Perguntas para reflexão:** 5-7 perguntas provocativas para estudo individual ou em grupo

Seja EXTREMAMENTE detalhado e profundo. Cite o texto original (hebraico/grego) com transliteração E Strong's number. Inclua análise morfológica COMPLETA de cada palavra-chave. Inclua referências cruzadas abundantes com texto completo na ACF. NÃO seja superficial — cada seção deve ter NO MÍNIMO 4-5 parágrafos substanciais. A seção de Narrativa Redentiva deve ser ESPECIALMENTE profunda, conectando o texto com toda a história da Bíblia.`;
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

      case "outline_expository": {
        const problemaSection = structure_config?.problema ? `\n\n## 🎯 DOR/PROBLEMA QUE O SERMÃO RESOLVE:\n"${structure_config.problema}"\n**REGRA:** A introdução COMEÇA descrevendo essa dor de forma VÍVIDA. O ouvinte precisa se ver nessa dor. Cada ponto do sermão é uma RESPOSTA progressiva. O apelo CONFRONTA essa dor com a resposta de Cristo.\n` : '';
        const perguntaSection = structure_config?.perguntaCentral ? `\n## ❓ PERGUNTA CENTRAL DO SERMÃO:\n"${structure_config.perguntaCentral}"\n**REGRA:** A introdução LEVANTA esta pergunta. A conclusão RESPONDE de forma definitiva. Cada ponto AVANÇA na resposta.\n` : '';

        userPrompt = `Gere um ESBOÇO DE SERMÃO EXPOSITIVO completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${approachSection}${pastoralFilter}${problemaSection}${perguntaSection}

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

## ESTRUTURA OBRIGATÓRIA — SIGA EXATAMENTE NESTA ORDEM (ESTILO ERIELTON DE PAULA):

# **TÍTULO:** [TÍTULO EM CAIXA ALTA E NEGRITO — FORTE, MEMORÁVEL, MÁX 8 PALAVRAS. DEVE CONTER UMA "SUB-FRASE" QUE SE REPETE NO FIM DE CADA PONTO. EX: "QUEBRADO SIM, CAÍDO JAMAIS" — sub-frase "Quebrado sim, mas..."]

## **TEMA:** [TEMA EM UMA FRASE CURTA E CLARA — CAIXA ALTA E NEGRITO]

## **TIPO:** EXPOSITIVO

## **TEXTO BASE:** ${passage}
(OBRIGATÓRIO: Transcreva o TEXTO COMPLETO da passagem na íntegra, versículo por versículo, usando a versão ACF. Formato: "Livro Cap:Vers: \"texto completo do versículo\"")

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO:**
(DEIXAR EM BRANCO — o pregador preenche manualmente. Escreva apenas: "(O pregador preenche)")

## **INTRODUÇÃO — A JORNADA ATÉ O TEXTO:**
(OBRIGATÓRIO ESTILO ERIELTON: Esta introdução é uma JORNADA NARRATIVA pastoral. Comece resgatando o CAMINHO até o texto:
- Como o livro chegou nesse momento? Que capítulos vieram antes?
- Qual era o estado do povo/personagem?
- Que processos esse personagem já viveu?
- Cite versículos anteriores em **negrito** com a referência: **"texto"** (Livro Cap.Vers).
- Inclua exemplos de outros personagens bíblicos que viveram processos parecidos (Habacuque, Asafe, Ezequiel, Davi, etc.)
- Faça o ouvinte CHEGAR ao texto base depois de uma viagem pastoral.
- Termine apresentando a verdade central que o sermão vai provar.

Mínimo 4 parágrafos LONGOS, fluidos e narrativos. SEM frases picotadas. Tom de conversa pastoral de domingo.)

## **TRANSIÇÃO PARA O PONTO 1:**
(Transição PASTORAL e SUAVE — não diatribe agressiva. Use frases reflexivas: "O personagem recebe uma ordem simples, mas profunda...", "Antes da revelação houve um chamado, antes do entendimento houve obediência, e isso nos leva ao primeiro ensinamento que esse texto nos apresenta." Mínimo 2-3 frases fluidas.)

---

## **1. [TÍTULO DO PONTO 1 EM CAIXA ALTA E NEGRITO]**
### [SUB-FRASE QUE ECOA O TÍTULO DO SERMÃO — EX: "Quebrado sim, mas chamado para descer e ouvir"]

**TEXTO:** [Versículo COMPLETO escrito por extenso — não apenas referência. Ex: Jeremias 18:1-2: "A palavra do Senhor, que veio a Jeremias..."]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo do versículo cruzado]"
👉 [Livro Cap:Vers]: "[texto completo do versículo cruzado]"
👉 [Livro Cap:Vers]: "[texto completo do versículo cruzado]"
(Mínimo 3 referências cruzadas que SUSTENTAM o ponto.)

**DESENVOLVIMENTO:**
(OBRIGATÓRIO ESTILO ERIELTON: 4 a 6 parágrafos LONGOS, fluidos e narrativos — cada parágrafo de 5 a 10 linhas. Texto contínuo de PÚLPITO.

ESTRUTURA INTERNA OBRIGATÓRIA:
- Parágrafo 1: Cite o versículo do ponto em **negrito** com referência. Ex: O texto declara: **"Levanta-te e desce à casa do oleiro..."** (Jeremias 18.2). Em seguida, comece a desdobrar a verdade.
- Parágrafo 2: Aprofunde com palavras-chave do original (hebraico/grego com transliteração) explicadas em linguagem SIMPLES.
- Parágrafo 3: Conexão pastoral OBRIGATÓRIA com "Talvez alguém esteja aqui hoje...", "Talvez você esteja vivendo..."
- Parágrafo 4-5: Aprofunde a aplicação com imagens do cotidiano.
- Parágrafo final: FECHE o ponto com a SUB-FRASE em **negrito** que ecoa o título. Ex: **"Quebrado sim, mas chamado para descer e ouvir."**

NUNCA use frases curtas picotadas. Use PROSA NARRATIVA FLUIDA. A simplicidade está no vocabulário, não no tamanho da frase. Versículos sempre em **negrito** com referência completa entre parênteses.)

**ILUSTRAÇÃO:**
(História real, analogia moderna ou exemplo concreto que ILUMINE o desenvolvimento. Vivida, breve e a serviço do ponto.)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)
(Mínimo 2 citações de escritores, pregadores, avivalistas, conferencistas, livros, artigos ou documentários.)

**FRASE DE EFEITO:**
[Frase curta, forte e memorável — estilo impacto de púlpito.]

**APLICAÇÃO PRÁTICA:**
(Aplicação prática em tom pastoral, com direcionamentos CLAROS e ESPECÍFICOS. Com prazo se possível. Não genérica.)

**TRANSIÇÃO:**
(PASTORAL E SUAVE — NUNCA diatribe agressiva. Estilo Erielton: "E à medida que entendemos isso, somos levados a uma verdade ainda mais profunda...", "Mas isso nos leva ao próximo ponto, porque...". Conecte o ponto 1 ao ponto 2 citando seu nome com mansidão. Mínimo 2-3 frases fluidas.)

---

## **2. [TÍTULO DO PONTO 2 EM CAIXA ALTA E NEGRITO]**

**TEXTO:** [Versículo COMPLETO escrito por extenso]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS FLUIDOS. Profundo, pastoral, com aplicação espiritual e conexão com a vida real.)

**ILUSTRAÇÃO:**
(História ou analogia que ilumine o desenvolvimento.)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)

**FRASE DE EFEITO:**
[Frase curta e forte.]

**APLICAÇÃO PRÁTICA:**
(Direcionamentos claros e pastorais.)

**TRANSIÇÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton — não diatribe agressiva. Conecte o ponto 2 ao ponto 3 com mansidão e fluidez narrativa, citando o nome do próximo ponto. Mínimo 2-3 frases.)

---

## **3. [TÍTULO DO PONTO 3 EM CAIXA ALTA E NEGRITO]**

**TEXTO:** [Versículo COMPLETO escrito por extenso]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS. Tom mais confrontativo, profundo.)

**ILUSTRAÇÃO:**
(História mais profunda e pessoal.)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)

**FRASE DE EFEITO:**

**APLICAÇÃO PRÁTICA:**

**TRANSIÇÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton — não diatribe agressiva. Conecte o ponto 3 ao ponto 4 com mansidão narrativa. Mínimo 2-3 frases.)

---

## **4. [TÍTULO DO PONTO 4 EM CAIXA ALTA E NEGRITO]**

**TEXTO:** [Versículo COMPLETO escrito por extenso]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS. Tom de aprofundamento, preparando o êxtase do ponto 5.)

**ILUSTRAÇÃO:**

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)

**FRASE DE EFEITO:**

**APLICAÇÃO PRÁTICA:**

**TRANSIÇÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton. Prepare o ouvinte para o ponto 5 cristocêntrico com fluidez e mansidão. Mínimo 2-3 frases.)

---

## **5. [TÍTULO DO PONTO 5 EM CAIXA ALTA E NEGRITO — CRISTOCÊNTRICO E CRIATIVO]**
(O ÚLTIMO ponto é SEMPRE o ÊXTASE e SEMPRE aponta para CRISTO. Crie um título TEMÁTICO e MEMORÁVEL — ex: "O NOME QUE SILENCIA TODO MEDO", "A RESPOSTA QUE VEM DO CALVÁRIO". NUNCA use títulos genéricos como "Clímax Cristocêntrico" ou "O Foco em Jesus".)

**TEXTO:** [Versículo COMPLETO escrito por extenso]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS. CONDUZ TUDO para a pessoa e obra de CRISTO — sua cruz, sua graça, sua salvação. Tom confrontativo profundo com amor. ÊXTASE máximo.)

**ILUSTRAÇÃO:**
(Exemplo profundo que mostre Cristo como a resposta para tudo que foi revelado nos pontos 1-4.)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)

**FRASE DE EFEITO:**
[A frase MAIS PODEROSA do sermão.]

**APLICAÇÃO PRÁTICA:**
(Convite à fé, arrependimento, obediência e esperança em Cristo.)

---

## **TRANSIÇÃO PARA A CONCLUSÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton. Feche o ponto 5 e conduza pastoralmente o ouvinte para a conclusão. Mínimo 2-3 frases narrativas.)

## **CONCLUSÃO:**
(OBRIGATÓRIO: RELEMBRE OS 5 PONTOS de forma resumida — cite cada um pelo nome em 1-2 frases. Reforce a mensagem central e o tema. Linguagem forte, pastoral e direta. Aponte para CRISTO como centro. Texto fluido, contínuo, sem quebras excessivas. Mínimo 2 parágrafos.)

## **APELO PROGRESSIVO:**
(Apelo EMOCIONAL mas equilibrado. Direto e pastoral. Convite CLARO à decisão. Use repetição anafórica conectada ao tema: "Se você está cansado, venha. Se você está ferido, venha. Se você está confuso, venha." Pode incluir: cura emocional, restauração, arrependimento, decisão. PROGRESSÃO: Identificação da dor → Revelação da verdade → Confronto → Chamado direto → Restauração em Cristo. A última frase é uma FRASE FORTE DE IMPACTO que ecoa o TÍTULO do sermão.)

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
      }

      case "outline_textual": {
        const problemaSection = structure_config?.problema ? `\n\n## 🎯 DOR/PROBLEMA QUE O SERMÃO RESOLVE:\n"${structure_config.problema}"\n**REGRA:** A introdução COMEÇA descrevendo essa dor. Cada ponto é uma RESPOSTA progressiva. O apelo CONFRONTA essa dor com Cristo.\n` : '';
        const perguntaSection = structure_config?.perguntaCentral ? `\n## ❓ PERGUNTA CENTRAL:\n"${structure_config.perguntaCentral}"\n**REGRA:** A introdução LEVANTA esta pergunta. A conclusão RESPONDE definitivamente.\n` : '';

        userPrompt = `Gere um ESBOÇO DE SERMÃO TEXTUAL completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${approachSection}${pastoralFilter}${problemaSection}${perguntaSection}

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

## ESTRUTURA OBRIGATÓRIA — SIGA EXATAMENTE NESTA ORDEM:

# **TÍTULO:** [TÍTULO EM CAIXA ALTA E NEGRITO — FORTE, MEMORÁVEL, EXTRAÍDO DO TEXTO, MÁX 8 PALAVRAS]

## **TEMA:** [TEMA EM UMA FRASE CURTA E CLARA — CAIXA ALTA E NEGRITO]

## **TIPO:** TEXTUAL

## **TEXTO BASE:** ${passage}
(OBRIGATÓRIO: Transcreva o TEXTO COMPLETO da passagem na íntegra, versículo por versículo, na versão ACF.)

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO:**
(DEIXAR EM BRANCO — escreva apenas: "(O pregador preenche)")

## **INTRODUÇÃO:**
(Texto fluido contínuo. Pergunta retórica ou cenário REAL. Identificação. Contextualização atual. Conexão emocional. Mínimo 6 frases. Tom de púlpito.)

## **TRANSIÇÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton — não diatribe agressiva. Conecte a introdução ao ponto 1 com fluidez narrativa e mansidão. Mínimo 2-3 frases.)

---

${[1, 2, 3, 4].map(n => `## **${n}. [TÍTULO DO PONTO ${n} EM CAIXA ALTA E NEGRITO — extraído de uma palavra/expressão-chave do versículo]**

**TEXTO:** [Versículo ou expressão-chave COMPLETA escrita por extenso]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
(Mínimo 3 referências cruzadas que SUSTENTAM o ponto.)

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS FLUIDOS. Profundo, pastoral, com aplicação espiritual e conexão com a vida real. Volte ao texto base. Linguagem de PÚLPITO.)

**ILUSTRAÇÃO:**
(História real, analogia moderna ou exemplo concreto que ILUMINE o desenvolvimento.)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)
(Mínimo 2 citações de escritores, pregadores, livros ou artigos.)

**FRASE DE EFEITO:**
[Frase curta, forte e memorável.]

**APLICAÇÃO PRÁTICA:**
(Aplicação prática pastoral com direcionamentos CLAROS.)

**TRANSIÇÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton. Feche o ponto ${n} e conduza ao PONTO ${n + 1} com mansidão narrativa. Mínimo 2-3 frases.)

---

`).join('')}## **5. [TÍTULO DO PONTO 5 EM CAIXA ALTA E NEGRITO — CRISTOCÊNTRICO E CRIATIVO]**
(O ÚLTIMO ponto é SEMPRE o ÊXTASE e SEMPRE aponta para CRISTO. Título TEMÁTICO e MEMORÁVEL — NUNCA genérico.)

**TEXTO:** [Versículo COMPLETO]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS. CONDUZ TUDO para CRISTO — sua cruz, sua graça, sua salvação. ÊXTASE máximo.)

**ILUSTRAÇÃO:**
(Cristo como resposta para tudo dos pontos anteriores.)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)

**FRASE DE EFEITO:**
[A frase MAIS PODEROSA do sermão.]

**APLICAÇÃO PRÁTICA:**
(Convite à fé, arrependimento e esperança em Cristo.)

---

## **TRANSIÇÃO PARA A CONCLUSÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton. Feche o ponto 5 e conduza à conclusão com fluidez. Mínimo 2-3 frases.)

## **CONCLUSÃO:**
(RELEMBRE OS 5 PONTOS resumidamente. Reforce mensagem central. Linguagem forte e pastoral. Aponte para CRISTO. Texto fluido. Mínimo 2 parágrafos.)

## **APELO PROGRESSIVO:**
(EMOCIONAL e equilibrado. Pastoral. Convite CLARO. Repetição anafórica conectada ao tema. PROGRESSÃO: Identificação → Revelação → Confronto → Chamado → Restauração em Cristo. Última frase ECOA o TÍTULO.)
`;
        break;
      }

      case "outline_thematic": {
        const problemaSection = structure_config?.problema ? `\n\n## 🎯 DOR/PROBLEMA QUE O SERMÃO RESOLVE:\n"${structure_config.problema}"\n**REGRA:** A introdução COMEÇA descrevendo essa dor. Cada ponto é uma RESPOSTA progressiva. O apelo CONFRONTA essa dor com Cristo.\n` : '';
        const perguntaSection = structure_config?.perguntaCentral ? `\n## ❓ PERGUNTA CENTRAL:\n"${structure_config.perguntaCentral}"\n**REGRA:** A introdução LEVANTA esta pergunta. A conclusão RESPONDE definitivamente.\n` : '';

        userPrompt = `Gere um ESBOÇO DE SERMÃO TEMÁTICO completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${approachSection}${pastoralFilter}${problemaSection}${perguntaSection}

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

## ESTRUTURA OBRIGATÓRIA — SIGA EXATAMENTE NESTA ORDEM:

# **TÍTULO:** [TÍTULO EM CAIXA ALTA E NEGRITO — FORTE, MEMORÁVEL, CRISTOCÊNTRICO, MÁX 8 PALAVRAS]

## **TEMA:** [TEMA EM UMA FRASE CURTA E CLARA — CAIXA ALTA E NEGRITO]

## **TIPO:** TEMÁTICO

## **TEXTO BASE:** ${passage}
(OBRIGATÓRIO: Transcreva o TEXTO COMPLETO da passagem na íntegra, versículo por versículo, na versão ACF.)

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO:**
(DEIXAR EM BRANCO — escreva apenas: "(O pregador preenche)")

## **INTRODUÇÃO:**
(Texto fluido contínuo. Pergunta retórica ou cenário REAL. Identificação. Contextualização atual. Conexão emocional. Mínimo 6 frases. Tom de púlpito.)

## **TRANSIÇÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton — não diatribe agressiva. Conecte a introdução ao ponto 1 com fluidez narrativa e mansidão. Mínimo 2-3 frases.)

---

${[1, 2, 3, 4].map(n => `## **${n}. [TÍTULO DO PONTO ${n} EM CAIXA ALTA E NEGRITO — aspecto do tema central]**

**TEXTO:** [Passagem bíblica DIFERENTE que sustenta este aspecto do tema — escrita por extenso e completa]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
(Mínimo 3 referências cruzadas que SUSTENTAM o ponto.)

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS FLUIDOS. Profundo, pastoral, com aplicação espiritual e conexão com a vida real. Volte ao texto base. Linguagem de PÚLPITO.)

**ILUSTRAÇÃO:**
(História real, analogia moderna ou exemplo concreto que ILUMINE o desenvolvimento.)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)
(Mínimo 2 citações de escritores, pregadores, livros ou artigos.)

**FRASE DE EFEITO:**
[Frase curta, forte e memorável.]

**APLICAÇÃO PRÁTICA:**
(Aplicação prática pastoral com direcionamentos CLAROS.)

**TRANSIÇÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton. Feche o ponto ${n} e conduza ao PONTO ${n + 1} com mansidão narrativa. Mínimo 2-3 frases.)

---

`).join('')}## **5. [TÍTULO DO PONTO 5 EM CAIXA ALTA E NEGRITO — CRISTOCÊNTRICO E CRIATIVO]**
(O ÚLTIMO ponto é SEMPRE o ÊXTASE e SEMPRE aponta para CRISTO. Título TEMÁTICO e MEMORÁVEL — NUNCA genérico.)

**TEXTO:** [Passagem climática que aponta para Cristo — escrita por extenso]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS. CONDUZ TUDO para CRISTO — sua cruz, sua graça, sua salvação. ÊXTASE máximo.)

**ILUSTRAÇÃO:**
(Cristo como resposta para tudo dos pontos anteriores.)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)

**FRASE DE EFEITO:**
[A frase MAIS PODEROSA do sermão.]

**APLICAÇÃO PRÁTICA:**
(Convite à fé, arrependimento e esperança em Cristo.)

---

## **TRANSIÇÃO PARA A CONCLUSÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton. Feche o ponto 5 e conduza à conclusão com fluidez. Mínimo 2-3 frases.)

## **CONCLUSÃO:**
(RELEMBRE OS 5 PONTOS resumidamente. Reforce mensagem central. Linguagem forte e pastoral. Aponte para CRISTO. Texto fluido. Mínimo 2 parágrafos.)

## **APELO PROGRESSIVO:**
(EMOCIONAL e equilibrado. Pastoral. Convite CLARO. Repetição anafórica conectada ao tema. PROGRESSÃO: Identificação → Revelação → Confronto → Chamado → Restauração em Cristo. Última frase ECOA o TÍTULO.)

**REGRA DE CITAÇÕES AMPLIADA:** As citações podem vir de QUALQUER fonte relevante:
- **Textos bíblicos:** Versículos (formato 👉)
- **Materiais da Base de Conhecimento:** Livros, comentários, dicionários → 「citação」(Autor, Obra, p.XX)
- **Pensadores cristãos:** Spurgeon, Lloyd-Jones, Lutero, Calvino, etc. → 「citação」(Autor)
- **Fontes externas dos materiais:** Vídeos, blogs → 「citação」(Fonte, Plataforma)
Priorize os materiais do usuário.`;
        break;
      }

      // outline_descriptive, outline_normative, outline_theological are now handled as "approach" 
      // parameter within the 3 main types (expository, textual, thematic)


      // ====================================================================
      // 9 NOVOS TIPOS DE PREGAÇÃO — Estilo Erielton mantido em TODOS
      // ====================================================================
      case "outline_narrative":
      case "outline_biographical":
      case "outline_doctrinal":
      case "outline_evangelistic":
      case "outline_devotional":
      case "outline_apologetic":
      case "outline_prophetic":
      case "outline_exhortative":
      case "outline_didactic": {
        const problemaSection = structure_config?.problema ? `\n\n## 🎯 DOR/PROBLEMA QUE O SERMÃO RESOLVE:\n"${structure_config.problema}"\n**REGRA:** A introdução COMEÇA descrevendo essa dor. Cada ponto é uma RESPOSTA progressiva. O apelo CONFRONTA essa dor com Cristo.\n` : '';
        const perguntaSection = structure_config?.perguntaCentral ? `\n## ❓ PERGUNTA CENTRAL:\n"${structure_config.perguntaCentral}"\n**REGRA:** A introdução LEVANTA esta pergunta. A conclusão RESPONDE definitivamente.\n` : '';

        const sermonTypeMap: Record<string, { label: string; description: string; structureNote: string; specialRule: string }> = {
          outline_narrative: {
            label: "NARRATIVO",
            description: "A pregação narrativa CONTA UMA HISTÓRIA bíblica de forma envolvente. Possui começo (situação), conflito, clímax e desfecho. A estrutura segue o ARCO DA HISTÓRIA, não tópicos abstratos.",
            structureNote: "Cada PONTO representa uma FASE da narrativa: 1) Cenário/Situação, 2) Conflito/Tensão, 3) Clímax/Encontro com Deus, 4) Desfecho/Resposta, 5) Cristo como Cumprimento. Use linguagem cinematográfica: 'Imagine a cena...', 'Olhe para os olhos de...'.",
            specialRule: "PRENDA A ATENÇÃO PELA HISTÓRIA. O ouvinte deve VER a cena. Nada de tópicos secos."
          },
          outline_biographical: {
            label: "BIOGRÁFICO",
            description: "A pregação biográfica é centrada na VIDA DE UM PERSONAGEM bíblico. Mostra contexto, momentos decisivos, falhas, vitórias e o que Deus fez NELE e ATRAVÉS dele.",
            structureNote: "PONTOS por FASES da vida: 1) Origem/Contexto, 2) Chamado ou Crise, 3) Lutas e Falhas, 4) Restauração/Vitória, 5) Cristo prefigurado/cumprido nessa vida. Cite NOMES, LUGARES e DATAS bíblicas.",
            specialRule: "O personagem é a JANELA — Cristo é a PAISAGEM. Toda biografia bíblica aponta para Jesus."
          },
          outline_doctrinal: {
            label: "DOUTRINÁRIO",
            description: "A pregação doutrinária EXPLICA UMA DOUTRINA bíblica (salvação, graça, justificação, santificação, etc.) com clareza e profundidade. Usa MÚLTIPLOS textos.",
            structureNote: "PONTOS estruturam a doutrina: 1) DEFINIÇÃO bíblica clara, 2) BASE BÍBLICA (AT e NT), 3) DESDOBRAMENTO teológico, 4) IMPLICAÇÕES PRÁTICAS, 5) CRISTO como o coração da doutrina.",
            specialRule: "PROFUNDIDADE COM PALAVRAS SIMPLES. Toda doutrina é EXPLICADA antes de ser aplicada. Termos teológicos são SEMPRE traduzidos."
          },
          outline_evangelistic: {
            label: "EVANGELÍSTICO",
            description: "A pregação evangelística é VOLTADA PARA A SALVAÇÃO. Apresenta o pecado, a obra de Cristo, o arrependimento e a fé. O apelo é DIRETO, claro e urgente.",
            structureNote: "ESTRUTURA: 1) DEUS é santo, 2) O HOMEM caiu — todos pecamos, 3) CRISTO é a única solução — sua morte e ressurreição, 4) ARREPENDIMENTO e fé, 5) A DECISÃO precisa ser tomada HOJE.",
            specialRule: "URGÊNCIA + AMOR. O apelo é o CORAÇÃO do sermão — claro, direto, sem ambiguidade."
          },
          outline_devotional: {
            label: "DEVOCIONAL",
            description: "A pregação devocional é MAIS SIMPLES e voltada para EDIFICAÇÃO ESPIRITUAL. Texto, breve explicação, reflexão pastoral, aplicação pessoal e oração/apelo leve.",
            structureNote: "ESTRUTURA MAIS LEVE: pode ter 3 pontos curtos. Cada ponto é uma REFLEXÃO pastoral curta com aplicação imediata. Foco em INTIMIDADE com Deus.",
            specialRule: "TOM DE INTIMIDADE. Linguagem suave, pastoral, abraçadora. 'Querido irmão...'. Apelo é SUAVE."
          },
          outline_apologetic: {
            label: "APOLOGÉTICO",
            description: "A pregação apologética é a DEFESA DA FÉ CRISTÃ. Apresenta um tema/objeção, expõe o argumento contrário, oferece resposta bíblica e racional.",
            structureNote: "ESTRUTURA: 1) APRESENTAÇÃO da pergunta/objeção, 2) ARGUMENTO CONTRÁRIO honesto, 3) RESPOSTA BÍBLICA, 4) RESPOSTA RACIONAL — evidências (cite C.S. Lewis, McDowell, Strobel, Craig), 5) CRISTO como a resposta final.",
            specialRule: "RESPEITO COM O OUVINTE CÉTICO. Argumente com graça e verdade. 1Pe 3:15 é o padrão."
          },
          outline_prophetic: {
            label: "PROFÉTICO / DE CONFRONTO",
            description: "A pregação profética EXORTA, CORRIGE e CHAMA AO ARREPENDIMENTO. Como os profetas do AT, denuncia o pecado, mas SEMPRE oferece esperança e restauração. É amor que confronta.",
            structureNote: "ESTRUTURA: 1) DIAGNÓSTICO ESPIRITUAL, 2) PALAVRA DE CONFRONTO, 3) CONSEQUÊNCIAS, 4) CHAMADO AO ARREPENDIMENTO, 5) ESPERANÇA E RESTAURAÇÃO em Cristo. Use a linguagem de Isaías, Jeremias, João Batista.",
            specialRule: "FIRMEZA COM LÁGRIMAS. Confrontar SEMPRE com amor pastoral. Cristo restaura."
          },
          outline_exhortative: {
            label: "EXORTATIVO",
            description: "A pregação exortativa ENCORAJA MUDANÇA DE COMPORTAMENTO. Foco em SANTIFICAÇÃO, obediência, perseverança, vida cristã prática.",
            structureNote: "ESTRUTURA: 1) VERDADE BÍBLICA clara, 2) DESAFIO ATUAL, 3) CHAMADO À AÇÃO — o que muda HOJE, 4) MEIOS DA GRAÇA, 5) CRISTO — força e modelo. Use verbos imperativos com ternura.",
            specialRule: "MOTIVAÇÃO + GRAÇA. Nunca legalismo. A exortação nasce do amor de Cristo."
          },
          outline_didactic: {
            label: "DIDÁTICO (ENSINO)",
            description: "A pregação didática é VOLTADA PARA O ENSINO sistemático. Mais próxima de uma aula expositiva. Explica ponto a ponto, dá exemplos, recapitula, aplica.",
            structureNote: "ESTRUTURA DE AULA: 1) INTRODUÇÃO com pergunta-guia, 2-4) PONTOS EXPLICATIVOS com EXEMPLOS, 5) APLICAÇÃO + RECAPITULAÇÃO. Use perguntas didáticas: 'Vocês conseguem ver isso?', 'Lembrem-se de três coisas...'.",
            specialRule: "CLAREZA DIDÁTICA. Numere, repita, exemplifique. O ouvinte deve SAIR SABENDO algo novo."
          },
        };

        const cfg = sermonTypeMap[type as string]!;

        userPrompt = `Gere um ESBOÇO DE SERMÃO ${cfg.label} completo baseado no seguinte texto:

**Passagem:** ${passage}
${materialsSection}${analysesSection}${structureSection}${approachSection}${pastoralFilter}${problemaSection}${perguntaSection}

## PERFIL DO PREGADOR:
Você é um pregador experiente, humilde e amoroso. Ama a Bíblia e fala a língua do povo, transformando verdades profundas em palavras simples. Sua missão é preparar um sermão que uma criança de 8 anos entenda e um juiz/doutor admire — do bebê de colo ao mais ancião. Cristo é o centro absoluto.

## REGRAS DOUTRINÁRIAS:
- Conteúdo puramente bíblico: Cristo salva, cura e liberta.
- Proibido: conteúdo liberal, relativista ou antropocêntrico.
- Objetivo: 50 a 60 minutos de pregação sólida e cheia de esperança.
- Use exclusivamente versões: ACF, NVI, NAA, ARA, NVT.

## TIPO DE PREGAÇÃO: ${cfg.label}
${cfg.description}

## 📌 ORIENTAÇÃO ESTRUTURAL ESPECÍFICA DESTE TIPO:
${cfg.structureNote}

## ⚡ REGRA ESPECIAL DESTE TIPO:
${cfg.specialRule}

## 📌 A REGRA DE OURO (VISITA CONSTANTE AO TEXTO):
O texto base NUNCA é abandonado. Em CADA ponto, volte ao texto: "O texto diz...", "Olhando para o versículo...", "Voltando ao nosso texto...".

## ESTRUTURA OBRIGATÓRIA — SIGA EXATAMENTE NESTA ORDEM (ESTILO ERIELTON DE PAULA):

# **TÍTULO:** [TÍTULO EM CAIXA ALTA E NEGRITO — FORTE, MEMORÁVEL, MÁX 8 PALAVRAS. DEVE CONTER UMA "SUB-FRASE" QUE SE REPETE NO FIM DE CADA PONTO.]

## **TEMA:** [TEMA EM UMA FRASE CURTA E CLARA — CAIXA ALTA E NEGRITO]

## **TIPO:** ${cfg.label}

## **TEXTO BASE:** ${passage}
(OBRIGATÓRIO: Transcreva o TEXTO COMPLETO da passagem na íntegra, versículo por versículo, na versão ACF.)

---

## **BOAS-VINDAS / APRESENTAÇÃO / AGRADECIMENTO:**
(DEIXAR EM BRANCO — escreva apenas: "(O pregador preenche)")

## **CONTEXTO DO TEXTO:**
(Histórico, cultural e bíblico — motivo da mensagem e situação do povo. Mínimo 2 parágrafos.)

## **INTRODUÇÃO:**
(Texto fluido contínuo no estilo da pregação ${cfg.label}. Pergunta retórica ou cenário REAL. Identificação. Conexão emocional. Mínimo 6 frases. Tom de púlpito.)

## **TRANSIÇÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton. Conecte a introdução ao ponto 1 com fluidez e mansidão. Mínimo 2-3 frases.)

---

${[1, 2, 3, 4].map(n => `## **${n}. [TÍTULO DO PONTO ${n} EM CAIXA ALTA E NEGRITO — coerente com o tipo ${cfg.label}]**

**TEXTO:** [Versículo COMPLETO escrito por extenso]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS FLUIDOS. Profundo, pastoral, com aplicação espiritual e conexão com a vida real. Linguagem UNIVERSAL — criança entende, doutor admira. Volte ao texto base. Termine com a SUB-FRASE do título.)

**ILUSTRAÇÃO:**
(História real, analogia moderna ou exemplo concreto. "Talvez alguém esteja aqui hoje...".)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)

**FRASE DE EFEITO:**
[Frase curta, forte e memorável.]

**APLICAÇÃO PRÁTICA:**
(Aplicação pastoral com direcionamentos CLAROS para a semana.)

**TRANSIÇÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton. Feche o ponto ${n} e conduza ao PONTO ${n + 1}. Mínimo 2-3 frases.)

---

`).join('')}## **5. [TÍTULO DO PONTO 5 EM CAIXA ALTA E NEGRITO — CRISTOCÊNTRICO E CRIATIVO]**
(O ÚLTIMO ponto é SEMPRE o ÊXTASE e SEMPRE aponta para CRISTO.)

**TEXTO:** [Versículo COMPLETO]

**REFERÊNCIAS:**
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"
👉 [Livro Cap:Vers]: "[texto completo]"

**DESENVOLVIMENTO:**
(MÍNIMO 800 caracteres em NO MÁXIMO 3 PARÁGRAFOS. CONDUZ TUDO para CRISTO — sua cruz, sua graça, sua salvação. ÊXTASE máximo.)

**ILUSTRAÇÃO:**
(Cristo como resposta para tudo dos pontos anteriores.)

**CITAÇÕES:**
「[citação]」(Autor, Obra)
「[citação]」(Autor, Obra)

**FRASE DE EFEITO:**
[A frase MAIS PODEROSA do sermão.]

**APLICAÇÃO PRÁTICA:**
(Convite à fé, arrependimento e esperança em Cristo.)

---

## **TRANSIÇÃO PARA A CONCLUSÃO:**
(TRANSIÇÃO PASTORAL SUAVE estilo Erielton. Mínimo 2-3 frases.)

## **CONCLUSÃO:**
(RELEMBRE OS 5 PONTOS resumidamente. Reforce mensagem central. Aponte para CRISTO. Texto fluido. Mínimo 2 parágrafos.)

## **APELO PROGRESSIVO:**
(EMOCIONAL e equilibrado. Pastoral. Convite CLARO. Repetição anafórica conectada ao tema. PROGRESSÃO: Identificação → Revelação → Confronto → Chamado → Restauração em Cristo. Última frase ECOA o TÍTULO.${cfg.label === 'EVANGELÍSTICO' ? ' Como sermão EVANGELÍSTICO, o apelo é DIRETO e URGENTE — chame as pessoas à decisão.' : cfg.label === 'DEVOCIONAL' ? ' Como sermão DEVOCIONAL, o apelo é SUAVE e ÍNTIMO — convite ao descanso em Cristo.' : cfg.label === 'PROFÉTICO / DE CONFRONTO' ? ' Como sermão PROFÉTICO, o apelo é FIRME mas com lágrimas — chamado claro ao arrependimento e restauração.' : ''})
`;
        break;
      }

      case "question":
        userPrompt = `Sobre: ${passage}
${materialsSection}
${question}

## REGRAS DE RESPOSTA (OBRIGATÓRIO):
1. Responda de forma CLARA e SUBSTANCIAL — forneça conteúdo REAL, não superficial
2. MÁXIMO 4-5 parágrafos, mas CADA parágrafo deve conter informação CONCRETA com referências
3. NÃO gere sermões completos — mas EXPLIQUE com profundidade bíblica e teológica
4. Se a pessoa quiser mais detalhes, ela vai perguntar — mas dê uma resposta COMPLETA desde o início
5. Use tom amigável e natural, mas com AUTORIDADE bíblica — cite versículos, referências, autores
6. Se houver áudio/imagem/documento mencionado, analise o conteúdo visual detalhadamente
7. Se a pergunta for simples, dê uma resposta clara MAS fundamentada
8. Use linguagem PASTORAL, acessível, sem termos acadêmicos — mas com PROFUNDIDADE
9. Termine com uma pergunta ou convite para continuar a conversa quando apropriado

## ⚠️ REGRA ABSOLUTA DE PRIORIDADE DE FONTES — CONSULTA OBRIGATÓRIA EM TODAS AS CATEGORIAS:
**VOCÊ DEVE CONSULTAR CADA CATEGORIA DE MATERIAIS DO USUÁRIO, EM ORDEM:**

### 1️⃣ BÍBLIAS (📖) — Primeira consulta obrigatória
- Busque PRIMEIRO nas Bíblias cadastradas pelo usuário
- Cite a versão exata que o usuário possui: "Na 「Bíblia ACF」, lemos: ..."
- Apresente o texto bíblico COMPLETO relacionado à pergunta

### 2️⃣ COMENTÁRIOS (📘) — Segunda consulta obrigatória
- Busque nos Comentários Bíblicos do usuário (Wiersbe, Beacon, Matthew Henry, etc.)
- Extraia a explicação do comentarista: "O 「Comentário Beacon」 explica que..."
- Se há MÚLTIPLOS comentários, COMPARE as perspectivas

### 3️⃣ DICIONÁRIOS (📙) — Terceira consulta obrigatória
- Busque definições de palavras-chave nos Dicionários (Strong, Wycliffe, Vine)
- Defina termos importantes: "Segundo o 「Dicionário Strong」, a palavra original..."

### 4️⃣ LIVROS (📚) — Quarta consulta obrigatória
- Busque em livros teológicos do acervo que se relacionem ao tema
- Cite autores e obras: "Como ensina 「Autor, Obra」..."

### 5️⃣ DEVOCIONAIS (📗) — Quinta consulta
- Se relevante, busque reflexões pastorais dos devocionais cadastrados

### 6️⃣ MÍDIA (🎬) — Sexta consulta
- Se o usuário tem materiais de mídia relevantes, referencie-os

**FORMATO DE CITAÇÃO:** Use SEMPRE 「Nome do Material」 para destacar fontes
**FONTES EXTERNAS:** Só use quando NENHUM material cobre o assunto. Marque com: "🌐 Fonte externa: [nome]"
**PROVA DE CONSULTA:** Na resposta, mencione PELO MENOS 2-3 materiais diferentes do acervo do usuário`;
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

      case "cross_references": {
        const refTypeMap: Record<string, string> = {
          thematic: 'TEMÁTICAS — versículos que tratam do mesmo assunto ou conceito, mesmo sem usar a mesma palavra',
          vocabulary: 'VOCABULARES (CONCORDÂNCIA) — todas as ocorrências das palavras pesquisadas com análise hebraico/grego',
          linguistic: 'LINGUÍSTICAS — análise dos termos no hebraico, aramaico e grego com significado original e variações de tradução',
          contextual: 'CONTEXTUAIS (HISTÓRIA E ARQUEOLOGIA) — contexto histórico, costumes, cultura, locais bíblicos',
          typological: 'TIPOLÓGICAS (SOMBRA → REALIDADE) — AT prefigurando o NT (tipos, sombras e cumprimentos)',
          prophetic: 'PROFÉTICAS (PROMESSA → CUMPRIMENTO) — profecia no AT e cumprimento no NT, identificando texto hebraico vs Septuaginta',
          doctrinal: 'DOUTRINÁRIAS (BASE TEOLÓGICA) — relação com doutrinas centrais: salvação, santificação, graça, justiça, natureza de Cristo',
          narrative: 'NARRATIVAS — exemplos históricos e personagens que demonstram o princípio bíblico (ex: arrependimento → Davi, Pedro, Nínive)',
          comparative: 'COMPARATIVAS — textos que apresentam contraste ou equilíbrio teológico (fé vs obras, justiça vs graça, lei vs evangelho)',
          apostolic: 'APOSTÓLICAS — citações do AT feitas pelos autores do NT, mostrando como os apóstolos interpretaram os textos',
          eschatological: 'ESCATOLÓGICAS — relação com juízo final, reino de Deus, segunda vinda, consumação da história',
          all: 'PANORAMA GERAL — busca completa em todas as 12 categorias + síntese panorâmica de como toda a Bíblia trata o tema',
        };
        const refType = question || 'all';
        const refLabel = refTypeMap[refType] || refTypeMap.all;

        const isThemeQuery = query_mode === 'theme';

        userPrompt = `Atue como um SISTEMA AVANÇADO DE ESTUDO BÍBLICO EXEGÉTICO — um motor teológico completo — para buscar REFERÊNCIAS CRUZADAS ${isThemeQuery ? 'sobre o seguinte TEMA/PERGUNTA/AFIRMAÇÃO' : 'do seguinte texto bíblico'}:

**${isThemeQuery ? 'Consulta' : 'Passagem'}:** ${passage}

${isThemeQuery ? `## INTERPRETAÇÃO DA CONSULTA DO USUÁRIO
O usuário digitou um tema, pergunta ou afirmação. Você DEVE:

### 1. Extração de Palavras-Chave
Identifique os termos centrais da consulta. Exemplo:
- Consulta: "Como o arrependimento gera frutos?"
- Palavras-chave: arrependimento, frutos, transformação

### 2. Classificação da Intenção
Determine se a entrada é:
- **Pergunta teológica** → busque textos que RESPONDAM ao problema
- **Afirmação doutrinária** → busque textos que CONFIRMEM, AMPLIEM ou EQUILIBREM
- **Tema de estudo** → busque panorama bíblico COMPLETO
- **Comparação teológica** → busque textos que mostrem CONTRASTES e HARMONIAS
- **Problema interpretativo** → busque textos que ESCLAREÇAM a dúvida

### 3. Direcionamento da Busca
- Perguntas → buscar textos que respondam ao problema
- Afirmações → buscar textos que confirmem, ampliem ou equilibrem
- Temas → buscar panorama bíblico completo
- Comparações → buscar textos com contraste e harmonia

Apresente PRIMEIRO a interpretação da consulta (palavras-chave + classificação + intenção) antes das referências.
` : ''}
${materialsSection}

## TIPO DE REFERÊNCIA SOLICITADO: ${refLabel}

## 1. INTERPRETAÇÃO DA CONSULTA
- Extraia as **palavras-chave** do texto base
- Classifique a intenção: pergunta teológica, afirmação doutrinária, tema de estudo, problema interpretativo ou comparação teológica
- Direcione a busca conforme a classificação

## MÉTODO DE BUSCA — BÍBLIA DE ESTUDO ACF (Almeida Corrigida Fiel)

**FONTES PRIMÁRIAS OBRIGATÓRIAS:**
1. **Bíblia ACF** — Almeida Corrigida Fiel da Sociedade Bíblica Trinitariana do Brasil
2. **Sistema de referências cruzadas** — Mais de 63.000 conexões entre textos bíblicos
3. **Notas doutrinárias** — Estudo sistemático dos ensinamentos da Bíblia (conforme índice ACF)
4. **Perfis de personagens bíblicos** — Informações sobre homens e mulheres da Bíblia
5. **Sítios arqueológicos** — Locais significativos mencionados na Bíblia

## ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

### 📖 TEXTO BASE
Apresente o texto completo da passagem na versão ACF.

### 🔍 PALAVRAS-CHAVE E ANÁLISE LINGUÍSTICA
Para cada palavra-chave do texto:
- Termo original (hebraico/grego) com transliteração e Strong's number
- Significado principal, campo semântico e variações de tradução
- Ocorrências significativas em outros textos

${refType === 'all' || refType === 'thematic' ? `### 📖 1. REFERÊNCIAS TEMÁTICAS (Conceituais)
Versículos que tratam do MESMO CONCEITO, mesmo quando não usam a mesma palavra:
Para cada referência:
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
- **Conexão:** Como se relaciona com o texto base
Mínimo 8 referências de livros DIFERENTES.
` : ''}
${refType === 'all' || refType === 'vocabulary' ? `### 📝 2. REFERÊNCIAS VOCABULARES (Concordância)
Mapeie TODAS as ocorrências das palavras pesquisadas. Analise significado no hebraico, grego, variações de uso:
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
- **Palavra original:** termo (transliteração, Strong's)
- **Uso neste contexto:** como a mesma palavra é usada diferentemente
Mínimo 6 referências.
` : ''}
${refType === 'all' || refType === 'linguistic' ? `### 🔤 3. REFERÊNCIAS LINGUÍSTICAS
Análise das palavras no hebraico, aramaico e grego — significado original, variações de tradução, uso na LXX:
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
- **Termo original:** com análise morfológica (tempo, voz, modo para verbos; caso, número, gênero para substantivos)
- **Campo semântico:** significados possíveis e nuances
Mínimo 4 referências.
` : ''}
${refType === 'all' || refType === 'contextual' ? `### 🗺️ 4. REFERÊNCIAS CONTEXTUAIS (História e Arqueologia)
Contexto histórico, cultural, situação do autor, público original, costumes, geografia, situação política:
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
- **Paralelo histórico:** Situação semelhante
- **Lição:** O que se aprende ao comparar os contextos
Mínimo 4 referências.
` : ''}
${refType === 'all' || refType === 'typological' ? `### 🔗 5. REFERÊNCIAS TIPOLÓGICAS (Sombra → Realidade)
AT prefigurando o NT — tipos, sombras e cumprimentos:
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
- **Tipo (AT):** O que prefigura
- **Antítipo (NT):** O cumprimento
- **Significado:** Por que essa tipologia é importante
Mínimo 4 referências.
` : ''}
${refType === 'all' || refType === 'prophetic' ? `### 🔮 6. REFERÊNCIAS PROFÉTICAS (Promessa → Cumprimento)
Profecia e cumprimento. Identifique se a citação vem do texto hebraico ou da Septuaginta (LXX):
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
- **Profecia:** O que foi predito
- **Cumprimento:** Onde e como (literal ou progressivo)
- **Fonte:** Texto hebraico (MT) ou Septuaginta (LXX)
Mínimo 4 referências.
` : ''}
${refType === 'all' || refType === 'doctrinal' ? `### ⛪ 7. REFERÊNCIAS DOUTRINÁRIAS (Base Teológica)
Doutrinas centrais presentes no texto (conforme sistema de notas doutrinárias ACF):
- **Nome da doutrina:** (ex: Graça de Deus, Salvação, Fé, Santificação, Natureza de Cristo, Pecado)
- **Referência primária:** Primeira aparição na Escritura
- **Referência principal:** Explicação mais completa
- **Trajetória bíblica:** Desenvolvimento AT → NT
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
Identifique pelo menos 3 doutrinas.
` : ''}
${refType === 'all' || refType === 'narrative' ? `### 📜 8. REFERÊNCIAS NARRATIVAS
Exemplos históricos e personagens que DEMONSTRAM o princípio bíblico:
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
- **Personagem/Evento:** Quem viveu esse princípio
- **Contexto:** O que aconteceu
- **Lição:** O que se aprende deste exemplo
Mínimo 4 referências.
` : ''}
${refType === 'all' || refType === 'comparative' ? `### ⚖️ 9. REFERÊNCIAS COMPARATIVAS
Textos que apresentam CONTRASTE ou EQUILÍBRIO TEOLÓGICO (fé vs obras, justiça vs graça, lei vs evangelho):
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
- **Contraste:** Que tensão teológica apresenta
- **Equilíbrio:** Como a Bíblia harmoniza estas verdades
Mínimo 3 referências.
` : ''}
${refType === 'all' || refType === 'apostolic' ? `### ✉️ 10. REFERÊNCIAS APOSTÓLICAS
Citações do AT feitas pelos autores do NT — como os APÓSTOLOS interpretaram os textos:
👉 [Livro Capítulo:Versículo (NT)]: "[texto completo na ACF]"
  ↳ Citando [Livro Capítulo:Versículo (AT)]: "[texto original]"
- **Interpretação apostólica:** Como o autor do NT usou/reinterpretou o texto do AT
Mínimo 3 referências.
` : ''}
${refType === 'all' || refType === 'eschatological' ? `### 🌅 11. REFERÊNCIAS ESCATOLÓGICAS
Relação com juízo final, reino de Deus, segunda vinda, consumação da história:
👉 [Livro Capítulo:Versículo]: "[texto completo na ACF]"
- **Tema escatológico:** Que aspecto dos últimos tempos se conecta
- **Conexão:** Como o texto base se relaciona com o destino final
Mínimo 3 referências.
` : ''}
${refType === 'all' ? `### 🌐 12. PANORAMA BÍBLICO
Síntese integradora de como TODA A BÍBLIA trata o tema:
- Como o tema aparece no Pentateuco, Históricos, Poéticos, Profetas, Evangelhos, Atos, Epístolas, Apocalipse
- Arco narrativo: Criação → Queda → Redenção → Consumação
- A unidade das Escrituras demonstrada através deste tema
` : ''}

### 🔗 CADEIA NARRATIVA PROGRESSIVA
IMPORTANTE: As referências DEVEM seguir uma SEQUÊNCIA LÓGICA E NARRATIVA, como uma corrente onde cada elo leva ao próximo.
Organize as referências em ORDEM DE LEITURA PROGRESSIVA:
1. Comece pela referência mais FUNDACIONAL (origem do conceito na Bíblia)
2. Siga a PROGRESSÃO REVELACIONAL: como o conceito se desenvolve de Gênesis a Apocalipse
3. Cada referência deve CONECTAR-SE narrativamente à próxima — explique o PORQUÊ da sequência
4. Exemplo: Se o tema é "glória de Deus":
   - Êxodo 33:18 (Moisés pede para ver a glória) → Êxodo 34:6-7 (Deus revela Seu caráter) → 1 Reis 8:11 (a glória enche o templo) → Isaías 6:3 (serafins proclamam) → João 1:14 (a glória se fez carne) → 2 Coríntios 3:18 (somos transformados de glória em glória) → Apocalipse 21:23 (a glória ilumina a Nova Jerusalém)
5. A narrativa deve mostrar como DEUS PROGRESSIVAMENTE revela essa verdade ao longo da história bíblica

Para CADA referência na cadeia, inclua:
- **Por que esta vem ANTES da próxima:** (conexão lógica/teológica/cronológica)
- **O que ela ACRESCENTA** à compreensão do tema

### 📊 MAPA DE CONEXÕES
- Total de referências por categoria
- Livros bíblicos mais conectados
- Temas centrais que emergem
- Como as referências confirmam a unidade das Escrituras
- FLUXO NARRATIVO: descreva em 2-3 frases a "história" que as referências contam juntas

### 🏆 TOP 5 — REFERÊNCIAS MAIS IMPORTANTES
As 5 referências cruzadas mais significativas e por que são essenciais.

### ⚠️ ALERTA INTERPRETATIVO
- Referências cruzadas NÃO são inspiradas — são ferramentas editoriais
- Todo versículo deve ser verificado no contexto do capítulo e do livro
- Evitar o uso de versículos como pretexto para ideias isoladas
- "Texto fora de contexto é pretexto para heresia"

### 📋 ESBOÇO SUGERIDO PARA ESTUDO
Organize os resultados em estrutura lógica:
1. **Introdução** — Conceito central do tema
2. **Fundamento Bíblico** — Versículos principais
3. **Exemplos Bíblicos** — Personagens ou narrativas
4. **Resultado Espiritual** — Efeitos práticos
5. **Aplicação Devocional** — Implicações para a vida cristã

## REGRAS:
- Use SEMPRE o texto na versão ACF (Almeida Corrigida Fiel)
- Cada referência DEVE incluir o TEXTO COMPLETO do versículo
- Busque em livros DIFERENTES do texto base — surpreenda com conexões profundas
- Priorize referências que conectem AT e NT
- Inclua referências que o estudante talvez NÃO conheça
- Formato obrigatório: 👉 [Livro Capítulo:Versículo]: "[texto completo]"
- Quando envolver personagens bíblicos, inclua perfil, contexto histórico e lições espirituais
- Seja EXAUSTIVO e PROFUNDO — esta é uma ferramenta de estudo nível seminário

## ⚠️ REGRA CRÍTICA DE PRECISÃO NAS REFERÊNCIAS BÍBLICAS:
ANTES de incluir qualquer referência, VERIFIQUE que o TEXTO DO VERSÍCULO corresponde EXATAMENTE à referência citada.
- **NUNCA confunda livros com nomes semelhantes:** "João" (Evangelho) ≠ "1 João" (Epístola) ≠ "2 João" ≠ "3 João". "Samuel" ≠ "1 Samuel" ≠ "2 Samuel". "Reis" ≠ "1 Reis" ≠ "2 Reis". "Coríntios" ≠ "1 Coríntios" ≠ "2 Coríntios". "Pedro" ≠ "1 Pedro" ≠ "2 Pedro". "Timóteo" ≠ "1 Timóteo" ≠ "2 Timóteo". "Tessalonicenses" ≠ "1 Tessalonicenses" ≠ "2 Tessalonicenses". "Crônicas" ≠ "1 Crônicas" ≠ "2 Crônicas".
- **SEMPRE use o prefixo numérico correto** (1, 2 ou 3) quando aplicável.
- **VERIFIQUE que o versículo citado existe** no capítulo referenciado — não invente referências.
- **VERIFIQUE a relevância temática:** O texto do versículo DEVE ter relação direta com o tema pesquisado. Se o versículo fala de algo completamente diferente do tema, NÃO o inclua.
- **Exemplo de ERRO a evitar:** Se o tema é "amor de Deus", NÃO cite "João 4:8" (que fala dos discípulos comprando comida) quando deveria citar "1 João 4:8" (que diz "Deus é amor").
- **TESTE MENTAL:** Para cada referência, pergunte: "Se eu ler APENAS este versículo, ele faz sentido dentro do tema?" Se a resposta for NÃO, remova-o.`;
        break;
      }

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

      case "thematic_study":
        userPrompt = requestContent || `Elabore um estudo temático bíblico completo sobre "${passage}".`;
        if (materials_context) {
          userPrompt = `## MATERIAIS DO USUÁRIO (USE OBRIGATORIAMENTE como FONTE PRIMÁRIA):\n${materials_context}\n\n${userPrompt}`;
        }
        // Append sermon-quality structure prompt
        userPrompt += `\n\n## 📌 PADRÃO DE QUALIDADE — ESTUDO TEMÁTICO PADRÃO PÚLPITO

**ESTRUTURA OBRIGATÓRIA:**

1. **TÍTULO** — Forte, bíblico e temático
2. **TEXTO BASE** — Com os versículos ESCRITOS COMPLETOS (ACF)
3. **INTRODUÇÃO** — Contextualizar com a realidade atual, gerar identificação emocional, mostrar o problema claramente, apontar necessidade de resposta bíblica
4. **TRANSIÇÃO** — Conectar raciocínio (não apenas frases soltas), tom pastoral e progressivo
5. **4 PONTOS PRINCIPAIS** (numerados 1 a 4) — Cada ponto DEVE seguir:
   - **TEXTO:** Versículo COMPLETO escrito (não apenas referência)
   - **DESENVOLVIMENTO:** Explicação profunda, pastoral, contínua, conectando com a realidade. Deve fluir como fala de pregação.
   - **APLICAÇÃO:** Aplicação direta ligada ao desenvolvimento
   - **REFERÊNCIAS:** Outros textos bíblicos relacionados
   - **FRASE:** Frase curta, forte, memorável, estilo impacto de púlpito
   - **APLICAÇÃO PRÁTICA:** Direcionamento claro e direto para o dia a dia
6. **TRANSIÇÃO PARA CONCLUSÃO**
7. **CONCLUSÃO** — Retomar os 4 pontos resumidamente, reforçar a mensagem central, apontar Cristo como centro, linguagem forte e pastoral
8. **APELO** — Seguir progressão: IDENTIFICAÇÃO (dor) → REVELAÇÃO (verdade) → CONFRONTO (realidade vs vontade de Deus) → CHAMADO (convite direto) → RESTAURAÇÃO (esperança em Cristo)

**REGRAS DOS PONTOS:**
- Ponto 1 → Deve ter REFERÊNCIAS cruzadas
- Ponto 2 → Foco em sustentação emocional/espiritual
- Ponto 3 → Deve conter ILUSTRAÇÃO
- Ponto 4 → Deve conter ILUSTRAÇÃO e tratar de limite, maturidade ou discernimento

**FORMATAÇÃO:**
- Texto contínuo, fluido, estilo leitura de púlpito
- Linguagem pastoral, como se estivesse sendo pregado ao vivo
- Evitar linguagem acadêmica
- Profundidade espiritual + aplicação prática
- Sempre conectar com a vida real
- Cristo como centro absoluto

**OS 4 PILARES EM CADA PONTO:**
1. CHOQUE DE REALIDADE (confronto amoroso que faz o ouvinte se reconhecer)
2. QUEBRA DE EXPECTATIVA (perspectiva nova, ângulo contra-intuitivo)
3. A PERGUNTA CERTA (pergunta retórica profunda que ecoa na mente)
4. ESPERANÇA AFIRMATIVA (afirmação de valor em Cristo, coragem para mudar)

**FRASES DO APELO (usar variações):**
- "Talvez hoje eu esteja falando com você…"
- "Deixe-me te dizer algo com clareza…"
- "Mas hoje Deus está te chamando…"
- "Se o Espírito Santo falou com você…"

**RESULTADO ESPERADO:** Um estudo que parece pronto para ser pregado, tem fluidez natural de púlpito, conecta com a vida real, confronta e acolhe, e termina com um apelo forte e transformador.`;
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
          { role: "system", content: isJsonType ? "Você é um classificador de conteúdo teológico. Retorne APENAS JSON válido, sem markdown, sem explicações adicionais." : effectiveSystemPrompt },
          { role: "user", content: images && Array.isArray(images) && images.length > 0
            ? [
                { type: "text", text: userPrompt },
                ...images.map((img: string) => ({
                  type: "image_url",
                  image_url: { url: img },
                })),
              ]
            : userPrompt
          },
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
