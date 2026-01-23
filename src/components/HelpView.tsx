import { useState } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Library, 
  BookOpen, 
  BookMarked, 
  Star, 
  Quote, 
  Book, 
  HelpCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight,
  MousePointerClick,
  Lightbulb
} from 'lucide-react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Ilustrações dos módulos
import dashboardIllustration from '@/assets/help/dashboard-illustration.png';
import cadastrarIllustration from '@/assets/help/cadastrar-livro-illustration.png';
import livrosIllustration from '@/assets/help/livros-illustration.png';
import leituraIllustration from '@/assets/help/leitura-illustration.png';
import statusIllustration from '@/assets/help/status-illustration.png';
import avaliacaoIllustration from '@/assets/help/avaliacao-illustration.png';
import citacoesIllustration from '@/assets/help/citacoes-illustration.png';
import bibliaIllustration from '@/assets/help/biblia-illustration.png';
import vocabularioIllustration from '@/assets/help/vocabulario-illustration.png';
import dicionarioIllustration from '@/assets/help/dicionario-illustration.png';
import perfilIllustration from '@/assets/help/perfil-illustration.png';
import adminIllustration from '@/assets/help/admin-illustration.png';

// Mapeamento de ilustrações por ID do módulo
const moduleIllustrations: Record<string, string> = {
  dashboard: dashboardIllustration,
  cadastrar: cadastrarIllustration,
  livros: livrosIllustration,
  leitura: leituraIllustration,
  status: statusIllustration,
  avaliacao: avaliacaoIllustration,
  citacoes: citacoesIllustration,
  biblia: bibliaIllustration,
  vocabulario: vocabularioIllustration,
  dicionario: dicionarioIllustration,
  perfil: perfilIllustration,
  admin: adminIllustration
};

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  purpose: string;
  steps: {
    title: string;
    description: string;
    tips?: string[];
  }[];
  troubleshooting?: {
    problem: string;
    solution: string;
  }[];
  relatedModules?: string[];
}

const helpSections: HelpSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Visão geral do seu progresso de leitura com estatísticas e métricas.',
    purpose: 'O Dashboard é sua central de informações. Aqui você encontra um resumo completo das suas leituras, incluindo total de livros, páginas lidas, tempo investido e progresso mensal. É o ponto de partida ideal para acompanhar suas metas de leitura.',
    steps: [
      {
        title: 'Visualizar Estatísticas Gerais',
        description: 'No topo do Dashboard, você encontra cards com: Total de Livros cadastrados, Total de Páginas lidas, Páginas do mês atual, e Taxa de conclusão dos livros.',
        tips: [
          'As estatísticas são atualizadas automaticamente conforme você registra leituras',
          'O card de "Páginas do Mês" mostra seu progresso mensal'
        ]
      },
      {
        title: 'Analisar Gráficos de Progresso',
        description: 'O gráfico de barras mostra suas páginas lidas por mês, permitindo identificar períodos de maior ou menor atividade de leitura.',
        tips: [
          'Passe o mouse sobre as barras para ver valores detalhados',
          'Compare meses diferentes para identificar padrões'
        ]
      },
      {
        title: 'Acompanhar Leituras Recentes',
        description: 'Na seção de leituras recentes, você vê os últimos registros de leitura com data, livro e páginas lidas.',
        tips: [
          'Clique em uma leitura para ver mais detalhes',
          'Use para verificar seu histórico recente'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'As estatísticas não estão atualizando',
        solution: 'Recarregue a página ou verifique se suas leituras foram salvas corretamente no módulo "Registrar Leitura".'
      },
      {
        problem: 'O gráfico está vazio',
        solution: 'Você precisa registrar leituras primeiro. Acesse "Registrar Leitura" para adicionar seus primeiros registros.'
      }
    ],
    relatedModules: ['leitura', 'livros', 'status']
  },
  {
    id: 'cadastrar',
    title: 'Cadastrar Livro',
    icon: PlusCircle,
    description: 'Adicione novos livros à sua biblioteca pessoal.',
    purpose: 'Este módulo permite que você cadastre todos os livros que deseja acompanhar. Cada livro cadastrado pode ter informações detalhadas como autor, número de páginas, categoria e tipo (físico, e-book, audiobook).',
    steps: [
      {
        title: 'Preencher Informações Básicas',
        description: 'Informe o nome do livro (obrigatório), autor e número total de páginas. Esses dados são essenciais para o cálculo de progresso.',
        tips: [
          'O nome do livro deve ser único na sua biblioteca',
          'O número de páginas é usado para calcular seu progresso de leitura'
        ]
      },
      {
        title: 'Selecionar Categoria e Tipo',
        description: 'Escolha a categoria do livro (Ficção, Não-Ficção, Técnico, etc.) e o tipo (Físico, E-book, Audiobook).',
        tips: [
          'Categorias ajudam a organizar e filtrar seus livros',
          'O tipo ajuda a identificar o formato da sua leitura'
        ]
      },
      {
        title: 'Adicionar Capa (Opcional)',
        description: 'Clique na área de upload para adicionar uma imagem de capa do livro. Você pode cortar a imagem para ajustá-la.',
        tips: [
          'Capas tornam sua biblioteca mais visual e organizada',
          'A imagem será redimensionada automaticamente'
        ]
      },
      {
        title: 'Informar Ano e Valor (Opcional)',
        description: 'Adicione o ano de publicação e o valor pago pelo livro para manter um registro completo.',
        tips: [
          'O valor ajuda a calcular seu investimento em livros',
          'O ano ajuda a organizar cronologicamente'
        ]
      },
      {
        title: 'Salvar o Livro',
        description: 'Clique no botão "Cadastrar Livro" para salvar. O livro aparecerá na lista de "Livros Cadastrados".',
        tips: [
          'Após salvar, você pode editar o livro a qualquer momento',
          'O status inicial será "Não iniciado"'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'O livro não foi salvo',
        solution: 'Verifique se todos os campos obrigatórios estão preenchidos (nome e páginas). Verifique também sua conexão com a internet.'
      },
      {
        problem: 'A imagem da capa não carrega',
        solution: 'Certifique-se de que a imagem está em formato JPG, PNG ou WebP e não é muito grande (máximo 5MB).'
      }
    ],
    relatedModules: ['livros', 'leitura']
  },
  {
    id: 'livros',
    title: 'Livros Cadastrados',
    icon: Library,
    description: 'Visualize e gerencie todos os livros da sua biblioteca.',
    purpose: 'Este módulo exibe todos os seus livros em um formato visual inspirado no Kindle. Você pode ver capas, status de leitura, progresso e realizar ações como editar, excluir ou ver métricas detalhadas.',
    steps: [
      {
        title: 'Navegar pela Biblioteca',
        description: 'Os livros são exibidos em cards visuais com capa, título, autor e barra de progresso. Role a página para ver todos os livros.',
        tips: [
          'A barra de progresso mostra quanto você já leu',
          'Badges coloridas indicam o status (Lendo, Concluído, etc.)'
        ]
      },
      {
        title: 'Filtrar e Buscar Livros',
        description: 'Use a barra de busca para encontrar livros por nome ou autor. Use os filtros para ver apenas livros de determinado status ou categoria.',
        tips: [
          'A busca é instantânea enquanto você digita',
          'Combine filtros para refinar sua pesquisa'
        ]
      },
      {
        title: 'Editar um Livro',
        description: 'Clique no ícone de engrenagem ou no livro para abrir o menu de ações. Selecione "Editar" para modificar informações.',
        tips: [
          'Você pode alterar todos os dados do livro, exceto o ID',
          'Alterações são salvas imediatamente'
        ]
      },
      {
        title: 'Ver Métricas do Livro',
        description: 'Clique em "Métricas" para ver estatísticas detalhadas: dias lendo, páginas por dia, tempo estimado para terminar, etc.',
        tips: [
          'As métricas ajudam a entender seu ritmo de leitura',
          'Use para definir metas pessoais'
        ]
      },
      {
        title: 'Excluir um Livro',
        description: 'No menu de ações, selecione "Excluir". Confirme a exclusão. ATENÇÃO: todos os dados relacionados serão perdidos.',
        tips: [
          'A exclusão remove também leituras, status e avaliações',
          'Esta ação não pode ser desfeita'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'Não encontro um livro',
        solution: 'Verifique se há filtros ativos. Limpe os filtros e use a busca pelo nome exato do livro.'
      },
      {
        problem: 'O progresso não está atualizado',
        solution: 'O progresso é calculado com base nas leituras registradas. Verifique se registrou todas as suas leituras no módulo "Registrar Leitura".'
      }
    ],
    relatedModules: ['cadastrar', 'leitura', 'status', 'avaliacao']
  },
  {
    id: 'leitura',
    title: 'Registrar Leitura',
    icon: BookOpen,
    description: 'Registre suas sessões de leitura diárias.',
    purpose: 'Este é o módulo mais importante para acompanhar seu progresso. Cada vez que você lê, registre aqui a página inicial e final. O sistema calcula automaticamente quantas páginas você leu e atualiza o status do livro.',
    steps: [
      {
        title: 'Selecionar o Livro',
        description: 'Escolha o livro que você está lendo no dropdown. Apenas livros cadastrados aparecem na lista.',
        tips: [
          'Se o livro não aparece, cadastre-o primeiro em "Cadastrar Livro"',
          'A última página lida será mostrada como referência'
        ]
      },
      {
        title: 'Informar Páginas Lidas',
        description: 'Preencha a página inicial (onde começou a ler) e a página final (onde parou). O sistema calcula automaticamente o total de páginas lidas.',
        tips: [
          'A página inicial deve ser menor ou igual à final',
          'Para e-books, use a localização ou porcentagem convertida'
        ]
      },
      {
        title: 'Selecionar Data e Mês',
        description: 'O sistema preenche automaticamente o dia e mês atuais, mas você pode alterar para registrar leituras retroativas.',
        tips: [
          'Registros retroativos ajudam a manter o histórico completo',
          'O mês é usado para calcular estatísticas mensais'
        ]
      },
      {
        title: 'Adicionar Tempo de Leitura (Opcional)',
        description: 'Informe quanto tempo você leu. Isso ajuda a calcular sua velocidade de leitura.',
        tips: [
          'Use o formato hh:mm ou apenas minutos',
          'Esse dado melhora as estimativas de tempo para terminar'
        ]
      },
      {
        title: 'Salvar a Leitura',
        description: 'Clique em "Registrar Leitura". O status do livro será atualizado automaticamente com base no progresso.',
        tips: [
          'Se você leu até a última página, o livro será marcado como "Concluído"',
          'Você pode ver o registro no histórico de leituras do livro'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'O status do livro não mudou',
        solution: 'Verifique se o número total de páginas do livro está correto. O status muda para "Lendo" quando há leituras e "Concluído" quando as páginas lidas igualam o total.'
      },
      {
        problem: 'Não consigo selecionar o livro',
        solution: 'Primeiro cadastre o livro no módulo "Cadastrar Livro". Depois ele aparecerá na lista.'
      }
    ],
    relatedModules: ['cadastrar', 'livros', 'status', 'dashboard']
  },
  {
    id: 'status',
    title: 'Status dos Livros',
    icon: BookMarked,
    description: 'Acompanhe o progresso de todos os seus livros.',
    purpose: 'O módulo de Status oferece uma visão consolidada do progresso de todos os seus livros. Veja quais estão em andamento, concluídos ou não iniciados, além de métricas detalhadas de cada um.',
    steps: [
      {
        title: 'Visualizar Lista de Status',
        description: 'A tabela mostra todos os livros com: Nome, Páginas lidas/Total, Porcentagem de progresso e Status atual.',
        tips: [
          'Clique no cabeçalho das colunas para ordenar',
          'A porcentagem é calculada automaticamente'
        ]
      },
      {
        title: 'Filtrar por Status',
        description: 'Use os botões de filtro para ver apenas livros com determinado status: Não iniciado, Lendo, Concluído.',
        tips: [
          'Use "Lendo" para focar nos livros ativos',
          'Use "Concluído" para revisar o que já terminou'
        ]
      },
      {
        title: 'Ver Detalhes do Progresso',
        description: 'Clique em um livro para ver o histórico completo de leituras, com datas e páginas de cada sessão.',
        tips: [
          'O histórico ajuda a identificar padrões de leitura',
          'Você pode editar ou excluir registros antigos'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'O progresso está zerado',
        solution: 'Registre suas leituras no módulo "Registrar Leitura". O progresso é calculado automaticamente.'
      },
      {
        problem: 'O livro aparece como "Não iniciado" mas eu já li',
        solution: 'Verifique se as leituras foram registradas para o livro correto. Use o histórico de leituras para conferir.'
      }
    ],
    relatedModules: ['leitura', 'livros', 'dashboard']
  },
  {
    id: 'avaliacao',
    title: 'Avaliações',
    icon: Star,
    description: 'Avalie os livros que você leu com notas e comentários.',
    purpose: 'Após terminar um livro, registre sua avaliação. Você pode dar notas em diferentes critérios (escrita, impacto, aprendizados, etc.) e escrever observações. Isso ajuda a lembrar sua opinião sobre cada livro.',
    steps: [
      {
        title: 'Selecionar o Livro',
        description: 'Escolha o livro que deseja avaliar no dropdown. Recomendamos avaliar apenas livros já concluídos.',
        tips: [
          'Você pode avaliar um livro a qualquer momento',
          'Se já existe uma avaliação, ela será substituída'
        ]
      },
      {
        title: 'Dar Notas nos Critérios',
        description: 'Avalie o livro em diferentes aspectos: Escrita/Estilo, Impacto Pessoal, Aprendizados, Criatividade e Prazer na Leitura. Use a escala de 1 a 5.',
        tips: [
          'Seja consistente nos critérios entre diferentes livros',
          'A nota final é calculada automaticamente'
        ]
      },
      {
        title: 'Escrever Observações',
        description: 'No campo de texto, escreva suas impressões, pontos positivos, negativos e a quem você recomendaria.',
        tips: [
          'Observações ajudam a lembrar detalhes importantes',
          'Seja específico para facilitar consultas futuras'
        ]
      },
      {
        title: 'Salvar Avaliação',
        description: 'Clique em "Salvar Avaliação". A avaliação ficará vinculada ao livro e pode ser editada depois.',
        tips: [
          'A nota aparecerá no card do livro na biblioteca',
          'Você pode atualizar a avaliação quando quiser'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'Não consigo ver minhas avaliações',
        solution: 'As avaliações aparecem nos cards dos livros (estrelas). Também é possível ver na página de detalhes de cada livro.'
      }
    ],
    relatedModules: ['livros', 'status']
  },
  {
    id: 'citacoes',
    title: 'Citações',
    icon: Quote,
    description: 'Salve trechos e citações marcantes dos livros.',
    purpose: 'Guarde os melhores trechos dos seus livros. Citações podem ser organizadas por livro e página, facilitando consultas futuras. Você também pode adicionar citações bíblicas com referência completa.',
    steps: [
      {
        title: 'Adicionar Nova Citação',
        description: 'Clique em "Nova Citação" e preencha o texto da citação no campo de texto.',
        tips: [
          'Copie o texto exato do livro para manter a fidelidade',
          'Citações longas são permitidas'
        ]
      },
      {
        title: 'Vincular ao Livro',
        description: 'Selecione o livro de onde a citação foi retirada e informe o número da página.',
        tips: [
          'A página ajuda a encontrar a citação novamente',
          'Para e-books, use a localização ou capítulo'
        ]
      },
      {
        title: 'Citação Bíblica (Opcional)',
        description: 'Para citações da Bíblia, marque a opção correspondente e preencha: Livro, Capítulo e Versículo.',
        tips: [
          'Use a referência padrão (ex: João 3:16)',
          'Citações bíblicas são categorizadas separadamente'
        ]
      },
      {
        title: 'Buscar Citações',
        description: 'Use a busca para encontrar citações por texto ou filtre por livro.',
        tips: [
          'A busca procura no texto completo da citação',
          'Use filtros para organizar por livro'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'A citação não foi salva',
        solution: 'Verifique se o campo de texto não está vazio e se um livro foi selecionado.'
      }
    ],
    relatedModules: ['livros', 'biblia']
  },
  {
    id: 'biblia',
    title: 'Progresso Bíblia',
    icon: Book,
    description: 'Acompanhe seu progresso na leitura da Bíblia.',
    purpose: 'Este módulo é dedicado ao acompanhamento da leitura bíblica. Você pode marcar capítulos lidos, visualizar o progresso por livro e acompanhar sua meta de leitura completa da Bíblia.',
    steps: [
      {
        title: 'Selecionar Livro da Bíblia',
        description: 'Escolha o livro bíblico que está lendo (Gênesis, Êxodo, etc.).',
        tips: [
          'Os livros são organizados na ordem canônica',
          'Use a busca para encontrar rapidamente'
        ]
      },
      {
        title: 'Marcar Capítulos Lidos',
        description: 'Selecione os capítulos que você leu. Eles serão marcados como concluídos.',
        tips: [
          'Você pode marcar vários capítulos de uma vez',
          'O progresso é salvo automaticamente'
        ]
      },
      {
        title: 'Visualizar Progresso Geral',
        description: 'O painel mostra quantos capítulos você leu do total (1.189 capítulos na Bíblia).',
        tips: [
          'A barra de progresso mostra a porcentagem total',
          'Veja quais livros ainda não foram lidos'
        ]
      },
      {
        title: 'Registrar Leitura com Versículos',
        description: 'Para registros mais detalhados, informe versículo inicial e final dentro de um capítulo.',
        tips: [
          'Útil para planos de leitura parciais',
          'Versículos são opcionais'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'O progresso não está salvando',
        solution: 'Verifique sua conexão com a internet. Recarregue a página e tente novamente.'
      }
    ],
    relatedModules: ['citacoes', 'leitura']
  },
  {
    id: 'dicionario',
    title: 'Dicionário',
    icon: Book,
    description: 'Salve e consulte palavras e vocabulário dos seus livros.',
    purpose: 'Durante a leitura, você pode encontrar palavras desconhecidas ou interessantes. Este módulo permite salvar essas palavras com definições, sinônimos, antônimos e exemplos de uso. É seu dicionário pessoal de leitura.',
    steps: [
      {
        title: 'Adicionar Nova Palavra',
        description: 'Clique em "Nova Palavra" e digite a palavra que deseja salvar.',
        tips: [
          'Digite a palavra exatamente como encontrou',
          'Você pode adicionar variações (plural, conjugações)'
        ]
      },
      {
        title: 'Buscar Definição',
        description: 'O sistema pode buscar automaticamente a definição da palavra em dicionários online.',
        tips: [
          'A busca automática economiza tempo',
          'Você pode editar a definição encontrada'
        ]
      },
      {
        title: 'Completar Informações',
        description: 'Adicione: classe gramatical, definições, sinônimos, antônimos, exemplos de uso e etimologia.',
        tips: [
          'Quanto mais informações, mais útil será a consulta',
          'Exemplos ajudam a lembrar o contexto'
        ]
      },
      {
        title: 'Vincular ao Livro',
        description: 'Informe em qual livro você encontrou a palavra. Isso cria um contexto de aprendizado.',
        tips: [
          'O vínculo ajuda a lembrar onde aprendeu',
          'Você pode ter a mesma palavra de livros diferentes'
        ]
      },
      {
        title: 'Consultar Vocabulário',
        description: 'Use a busca para encontrar palavras salvas. Filtre por livro ou ordem alfabética.',
        tips: [
          'Revise periodicamente para fixar o aprendizado',
          'Exporte seu vocabulário se necessário'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'A busca automática não encontrou a palavra',
        solution: 'Verifique a ortografia. Algumas palavras técnicas ou regionais podem não estar nos dicionários. Adicione manualmente.'
      }
    ],
    relatedModules: ['livros', 'leitura']
  }
];

interface HelpViewProps {
  initialSection?: string;
}

export function HelpView({ initialSection }: HelpViewProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(initialSection || null);
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const renderSection = (section: HelpSection) => {
    const Icon = section.icon;
    
    const illustration = moduleIllustrations[section.id];
    
    return (
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-1">{section.title}</CardTitle>
              <CardDescription className="text-base">{section.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ilustração do Módulo */}
          {illustration && (
            <div className="rounded-xl overflow-hidden border bg-gradient-to-br from-muted/30 to-muted/10 p-4">
              <img 
                src={illustration} 
                alt={`Ilustração do módulo ${section.title}`}
                className="w-full max-h-48 object-contain rounded-lg"
              />
            </div>
          )}

          {/* O que é e para que serve */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-500" />
              <h4 className="font-semibold text-blue-700 dark:text-blue-400">O que é e para que serve?</h4>
            </div>
            <p className="text-muted-foreground">{section.purpose}</p>
          </div>

          {/* Passo a passo */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MousePointerClick className="w-5 h-5 text-green-500" />
              <h4 className="font-semibold text-green-700 dark:text-green-400">Passo a Passo</h4>
            </div>
            <div className="space-y-3">
              {section.steps.map((step, index) => {
                const stepId = `${section.id}-step-${index}`;
                const isExpanded = expandedSteps.includes(stepId);
                
                return (
                  <div 
                    key={index}
                    className="border rounded-lg overflow-hidden bg-card"
                  >
                    <button
                      onClick={() => toggleStep(stepId)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium flex-1">{step.title}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pl-16">
                        <p className="text-muted-foreground mb-3">{step.description}</p>
                        {step.tips && step.tips.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="w-4 h-4 text-amber-600" />
                              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Dicas</span>
                            </div>
                            <ul className="space-y-1">
                              {step.tips.map((tip, tipIndex) => (
                                <li key={tipIndex} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                                  <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Solução de Problemas */}
          {section.troubleshooting && section.troubleshooting.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <h4 className="font-semibold text-orange-700 dark:text-orange-400">Solução de Problemas</h4>
              </div>
              <div className="space-y-3">
                {section.troubleshooting.map((item, index) => (
                  <div key={index} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-700 dark:text-orange-300 text-xs font-bold">?</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-orange-800 dark:text-orange-300 mb-1">{item.problem}</p>
                        <p className="text-sm text-orange-700 dark:text-orange-400">
                          <span className="font-medium">Solução: </span>{item.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Módulos Relacionados */}
          {section.relatedModules && section.relatedModules.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Módulos relacionados:</p>
              <div className="flex flex-wrap gap-2">
                {section.relatedModules.map(moduleId => {
                  const relatedSection = helpSections.find(s => s.id === moduleId);
                  if (!relatedSection) return null;
                  return (
                    <Badge
                      key={moduleId}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setSelectedSection(moduleId)}
                    >
                      {relatedSection.title}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Central de Ajuda</h2>
          <p className="text-muted-foreground">
            Aprenda a usar cada módulo do sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu lateral de tópicos */}
        <Card className="lg:col-span-1 h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Módulos</CardTitle>
            <CardDescription>Clique para ver instruções</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] lg:h-[calc(100vh-300px)]">
              <div className="p-3 space-y-1">
                {helpSections.map(section => {
                  const Icon = section.icon;
                  const isSelected = selectedSection === section.id;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{section.title}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conteúdo do tópico selecionado */}
        <div className="lg:col-span-3">
          {selectedSection ? (
            renderSection(helpSections.find(s => s.id === selectedSection)!)
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <HelpCircle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Selecione um módulo</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Clique em um dos módulos à esquerda para ver instruções detalhadas de como utilizá-lo, 
                  com passo a passo e soluções para problemas comuns.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Rodapé com versão */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p>Planner de Leituras - Versão 1.4</p>
        <p className="text-xs mt-1">Documentação atualizada em 23/01/2026</p>
      </div>
    </div>
  );
}
