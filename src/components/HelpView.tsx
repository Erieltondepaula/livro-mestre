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
  Lightbulb,
  User,
  Settings,
  ImageIcon,
  ZoomIn,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';

// Screenshots reais dos módulos
import screenshotDashboard1 from '@/assets/help/screenshot-dashboard-1.png';
import screenshotDashboard2 from '@/assets/help/screenshot-dashboard-2.png';
import screenshotDashboard3 from '@/assets/help/screenshot-dashboard-3.png';
import screenshotCadastrar from '@/assets/help/screenshot-cadastrar.png';
import screenshotLivros from '@/assets/help/screenshot-livros.png';
import screenshotLeitura from '@/assets/help/screenshot-leitura.png';
import screenshotStatus from '@/assets/help/screenshot-status.png';
import screenshotMetricasHeader from '@/assets/help/screenshot-metricas-header.png';
import screenshotMetricasProgresso from '@/assets/help/screenshot-metricas-progresso.png';
import screenshotMetricasCitacoes from '@/assets/help/screenshot-metricas-citacoes.png';

// Interface para imagem contextual
interface StepImage {
  src: string;
  caption: string;
}

// Interface para passos com imagens contextuais
interface HelpStep {
  title: string;
  description: string;
  image?: StepImage;
  tips?: string[];
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  purpose: string;
  purposeImage?: StepImage;
  steps: HelpStep[];
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
    purposeImage: {
      src: screenshotDashboard1,
      caption: 'Acesse o Dashboard pelo menu lateral. A seta vermelha indica o título do módulo e o menu de navegação.'
    },
    steps: [
      {
        title: 'Visualizar Estatísticas Gerais',
        description: 'No topo do Dashboard, você encontra cards com: Total de Livros cadastrados, Livros em Leitura, Concluídos, Dias de Leitura, Média por Dia e Total de Páginas.',
        image: {
          src: screenshotDashboard2,
          caption: 'Cards de estatísticas mostram seus números de leitura de forma visual e organizada.'
        },
        tips: [
          'As estatísticas são atualizadas automaticamente conforme você registra leituras',
          'O card de "Páginas do Mês" mostra seu progresso mensal'
        ]
      },
      {
        title: 'Acompanhar Status dos Livros',
        description: 'Na tabela de Status dos Livros, você vê cada livro com sua miniatura, nome, status atual (Lendo/Concluído) e porcentagem de progresso.',
        image: {
          src: screenshotDashboard3,
          caption: 'A tabela mostra todos seus livros com status colorido e porcentagem de leitura.'
        },
        tips: [
          'Badges verdes indicam "Concluído", azuis indicam "Lendo"',
          'A porcentagem é calculada automaticamente com base nas páginas lidas'
        ]
      },
      {
        title: 'Analisar Gráficos de Progresso',
        description: 'O gráfico de barras mostra suas páginas lidas por mês, permitindo identificar períodos de maior ou menor atividade de leitura.',
        tips: [
          'Passe o mouse sobre as barras para ver valores detalhados',
          'Compare meses diferentes para identificar padrões'
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
    purposeImage: {
      src: screenshotCadastrar,
      caption: 'Formulário de cadastro com todos os campos disponíveis. A seta vermelha indica o menu ativo e os campos de preenchimento.'
    },
    steps: [
      {
        title: 'Adicionar Capa do Livro (Opcional)',
        description: 'Clique na área "Clique para adicionar capa" para fazer upload de uma imagem. Você pode cortar a imagem para ajustá-la.',
        image: {
          src: screenshotCadastrar,
          caption: 'A área de capa fica à esquerda. Clique para adicionar uma imagem do livro.'
        },
        tips: [
          'Capas tornam sua biblioteca mais visual e organizada',
          'A imagem será redimensionada automaticamente'
        ]
      },
      {
        title: 'Preencher Informações Básicas',
        description: 'Informe o Nome do Livro (obrigatório) e o Autor. Esses dados são essenciais para identificar o livro na biblioteca.',
        tips: [
          'O nome do livro deve ser único na sua biblioteca',
          'O autor é opcional, mas ajuda na organização'
        ]
      },
      {
        title: 'Informar Ano, Páginas e Tipo',
        description: 'Adicione o Ano de publicação, Total de Páginas (obrigatório para cálculo de progresso) e selecione o Tipo (Livro, E-book, Audiobook).',
        tips: [
          'O número de páginas é usado para calcular seu progresso de leitura',
          'Use o botão + para adicionar novos tipos'
        ]
      },
      {
        title: 'Selecionar Categoria e Valor',
        description: 'Escolha a Categoria do livro (Ficção, Finanças, Bíblia, etc.) e opcionalmente informe o Valor Pago.',
        tips: [
          'Categorias ajudam a organizar e filtrar seus livros',
          'Use o botão de engrenagem para gerenciar categorias'
        ]
      },
      {
        title: 'Salvar o Livro',
        description: 'Clique no botão "Cadastrar Livro" para salvar. O livro aparecerá imediatamente na lista de "Livros Cadastrados".',
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
    purposeImage: {
      src: screenshotLivros,
      caption: 'Biblioteca visual com cards de livros. Cada card mostra capa, título, autor, detalhes e tempo estimado para finalizar.'
    },
    steps: [
      {
        title: 'Navegar pela Biblioteca',
        description: 'Os livros são exibidos em cards visuais com capa, título, autor, ano, tipo, categoria e tempo estimado para finalizar.',
        image: {
          src: screenshotLivros,
          caption: 'Cards mostram informações completas: capa, título, autor, categoria e tempo restante de leitura.'
        },
        tips: [
          'O texto "Finalizar: Xh Xmin" mostra quanto tempo falta para terminar o livro',
          '"Livro concluído" aparece quando você termina a leitura'
        ]
      },
      {
        title: 'Editar um Livro',
        description: 'Clique no ícone de lápis (✏️) no canto inferior direito do card para editar as informações do livro.',
        tips: [
          'Você pode alterar todos os dados do livro, exceto o ID',
          'Alterações são salvas imediatamente'
        ]
      },
      {
        title: 'Excluir um Livro',
        description: 'Clique no ícone de lixeira (🗑️) no canto inferior direito do card. Confirme a exclusão. ATENÇÃO: todos os dados relacionados serão perdidos.',
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
    purposeImage: {
      src: screenshotLeitura,
      caption: 'Formulário de registro de leitura com opções de Registro Diário ou Período de Leitura.'
    },
    steps: [
      {
        title: 'Escolher Modo de Registro',
        description: 'Selecione entre "Registro Diário" (uma sessão específica em um dia) ou "Período de Leitura" (leituras ao longo de vários dias).',
        image: {
          src: screenshotLeitura,
          caption: 'As abas no topo permitem alternar entre Registro Diário e Período de Leitura.'
        },
        tips: [
          'Use "Registro Diário" para registrar leituras pontuais',
          'Use "Período de Leitura" quando leu em vários dias consecutivos'
        ]
      },
      {
        title: 'Selecionar o Livro',
        description: 'Escolha o livro que você está lendo no dropdown "Livro". Apenas livros cadastrados aparecem na lista.',
        tips: [
          'Se o livro não aparece, cadastre-o primeiro em "Cadastrar Livro"',
          'A última página lida será mostrada como referência'
        ]
      },
      {
        title: 'Informar Dia e Mês',
        description: 'O sistema preenche automaticamente o dia e mês atuais, mas você pode alterar para registrar leituras retroativas.',
        tips: [
          'Registros retroativos ajudam a manter o histórico completo',
          'O mês é usado para calcular estatísticas mensais'
        ]
      },
      {
        title: 'Informar Páginas Lidas',
        description: 'Preencha a Página Inicial (onde começou) e a Página Final (onde parou). O sistema calcula automaticamente o total de páginas lidas.',
        tips: [
          'A página inicial deve ser menor ou igual à final',
          'Para e-books, use a localização ou porcentagem convertida'
        ]
      },
      {
        title: 'Adicionar Tempo Gasto (Opcional)',
        description: 'Informe quanto tempo você leu no formato minutos:segundos (ex: 42:11 ou apenas 45). Isso ajuda a calcular sua velocidade de leitura.',
        tips: [
          'Esse dado melhora as estimativas de tempo para terminar',
          'Você pode digitar apenas os minutos se preferir'
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
    purposeImage: {
      src: screenshotStatus,
      caption: 'Tabela completa com status, progresso e ações para cada livro.'
    },
    steps: [
      {
        title: 'Visualizar Lista de Status',
        description: 'A tabela mostra todos os livros com: Número, Miniatura, Nome (com categoria e tipo), Status, barra de Progresso, Quantidade Lida e Ações.',
        image: {
          src: screenshotStatus,
          caption: 'Cada linha mostra o progresso visual com barra colorida e porcentagem.'
        },
        tips: [
          'Clique no cabeçalho das colunas para ordenar',
          'A porcentagem é calculada automaticamente'
        ]
      },
      {
        title: 'Abrir Métricas Detalhadas',
        description: 'Clique no ícone de gráfico (📊) na coluna Ações para abrir o modal de métricas do livro.',
        image: {
          src: screenshotMetricasHeader,
          caption: 'O modal mostra a capa do livro, autor e categorias.'
        },
        tips: [
          'O modal mostra estatísticas completas do livro',
          'Você pode ver citações e vocabulário relacionados'
        ]
      },
      {
        title: 'Analisar Progresso de Leitura',
        description: 'Dentro do modal de métricas, veja: páginas lidas, tempo total, dias de leitura, médias por dia e velocidade de leitura.',
        image: {
          src: screenshotMetricasProgresso,
          caption: 'Cards mostram páginas lidas, tempo total, dias de leitura e médias calculadas.'
        },
        tips: [
          'O status "Lendo" aparece quando há leituras em andamento',
          'A barra de progresso mostra visualmente quanto falta'
        ]
      },
      {
        title: 'Ver Citações e Vocabulário',
        description: 'Na parte inferior do modal, veja as citações salvas e palavras pesquisadas vinculadas ao livro.',
        image: {
          src: screenshotMetricasCitacoes,
          caption: 'Botões clicáveis mostram citações por livro bíblico e palavras pesquisadas.'
        },
        tips: [
          'Clique nos botões para ver detalhes das citações',
          'Palavras pesquisadas mostram a classe gramatical'
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
    description: 'Consulte definições de palavras encontradas durante a leitura.',
    purpose: 'Durante a leitura, você pode encontrar palavras desconhecidas ou interessantes. Este módulo permite consultar definições, sinônimos, antônimos e exemplos de uso.',
    steps: [
      {
        title: 'Buscar Palavra',
        description: 'Digite a palavra que deseja consultar no campo de busca.',
        tips: [
          'Digite a palavra exatamente como encontrou',
          'A busca aceita palavras em português'
        ]
      },
      {
        title: 'Ver Definição',
        description: 'O sistema busca automaticamente a definição da palavra em dicionários online.',
        tips: [
          'A busca automática economiza tempo',
          'Definições incluem classe gramatical e exemplos'
        ]
      },
      {
        title: 'Salvar no Vocabulário',
        description: 'Após consultar, você pode salvar a palavra no seu vocabulário pessoal vinculando a um livro.',
        tips: [
          'Palavras salvas ficam disponíveis no módulo Vocabulário',
          'Vincule ao livro onde encontrou a palavra'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'A busca não encontrou a palavra',
        solution: 'Verifique a ortografia. Algumas palavras técnicas ou regionais podem não estar nos dicionários.'
      }
    ],
    relatedModules: ['livros', 'leitura']
  },
  {
    id: 'perfil',
    title: 'Perfil',
    icon: User,
    description: 'Gerencie suas informações pessoais e configurações.',
    purpose: 'No módulo de Perfil, você pode atualizar seu nome de exibição, foto de perfil e outras configurações pessoais.',
    steps: [
      {
        title: 'Acessar Perfil',
        description: 'Clique no seu nome ou avatar no canto inferior esquerdo do menu para acessar o perfil.',
        tips: [
          'Seu email é exibido junto ao nome',
          'A foto de perfil aparece em vários lugares do sistema'
        ]
      },
      {
        title: 'Atualizar Nome de Exibição',
        description: 'Altere o nome que aparece no sistema. Este não precisa ser seu nome real.',
        tips: [
          'O nome aparece no menu lateral e em outras áreas',
          'Alterações são salvas automaticamente'
        ]
      },
      {
        title: 'Alterar Foto de Perfil',
        description: 'Faça upload de uma nova foto clicando na imagem do perfil.',
        tips: [
          'Use uma imagem quadrada para melhor resultado',
          'A imagem será redimensionada automaticamente'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'A foto não foi salva',
        solution: 'Verifique se a imagem está em formato JPG, PNG ou WebP e não é muito grande.'
      }
    ],
    relatedModules: []
  },
  {
    id: 'admin',
    title: 'Administração',
    icon: Settings,
    description: 'Gerencie usuários e configurações do sistema (apenas administradores).',
    purpose: 'O painel de Administração permite gerenciar usuários, permissões e configurações globais do sistema. Apenas usuários com role de Administrador ou Master têm acesso.',
    steps: [
      {
        title: 'Acessar Painel Admin',
        description: 'Clique em "Administração" no menu lateral. Esta opção só aparece para administradores.',
        tips: [
          'Se não vê esta opção, você não tem permissão de administrador',
          'Contate o Master para solicitar acesso'
        ]
      },
      {
        title: 'Gerenciar Usuários',
        description: 'Veja a lista de todos os usuários, altere roles (Admin/User) e ative/desative contas.',
        tips: [
          'Usuários desativados não podem acessar o sistema',
          'O usuário Master não pode ser modificado'
        ]
      },
      {
        title: 'Configurar Permissões',
        description: 'Defina quais módulos cada usuário pode acessar.',
        tips: [
          'Permissões são aplicadas imediatamente',
          'O Master tem acesso a todos os módulos'
        ]
      },
      {
        title: 'Excluir Usuário (Apenas Master)',
        description: 'Remova permanentemente um usuário e todos os seus dados do sistema.',
        tips: [
          'Esta ação não pode ser desfeita',
          'Todos os livros, leituras e citações serão excluídos'
        ]
      }
    ],
    troubleshooting: [
      {
        problem: 'Não consigo acessar o painel Admin',
        solution: 'Você precisa ter role de Administrador ou Master. Contate o administrador do sistema.'
      }
    ],
    relatedModules: ['perfil']
  }
];

interface HelpViewProps {
  initialSection?: string;
}

export function HelpView({ initialSection }: HelpViewProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(initialSection || null);
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<StepImage | null>(null);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const openLightbox = (image: StepImage) => {
    setLightboxImage(image);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  // Componente para renderizar imagem com placeholder
  const ImageWithPlaceholder = ({ image, stepNumber }: { image?: StepImage; stepNumber?: number }) => {
    if (image?.src) {
      return (
        <div 
          className="my-4 rounded-xl overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-muted/30 to-muted/10 cursor-pointer group transition-all hover:border-primary/40 hover:shadow-lg"
          onClick={() => openLightbox(image)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && openLightbox(image)}
        >
          <div className="relative">
            <img 
              src={image.src} 
              alt={image.caption}
              className="w-full object-contain transition-transform group-hover:scale-[1.01]"
            />
            {/* Overlay com ícone de zoom */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
                <ZoomIn className="w-6 h-6" />
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <span className="italic">{image.caption}</span>
            </p>
            <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-3 h-3" />
              Clique para ampliar
            </span>
          </div>
        </div>
      );
    }

    // Placeholder para imagens não disponíveis
    return (
      <div className="my-4 rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
        <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          📷 Imagem do Passo {stepNumber} será adicionada em breve
        </p>
      </div>
    );
  };

  const renderSection = (section: HelpSection) => {
    const Icon = section.icon;
    
    return (
      <Card className="border-l-4 border-l-primary animate-fade-in">
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
          {/* O que é e para que serve */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-primary">O que é e para que serve?</h4>
            </div>
            <p className="text-muted-foreground mb-3">{section.purpose}</p>
            
            {/* Imagem contextual do propósito */}
            {section.purposeImage && (
              <ImageWithPlaceholder image={section.purposeImage} />
            )}
          </div>

          {/* Passo a passo */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MousePointerClick className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-primary">Passo a Passo</h4>
            </div>
            <div className="space-y-3">
              {section.steps.map((step, index) => {
                const stepId = `${section.id}-step-${index}`;
                const isExpanded = expandedSteps.includes(stepId);
                
                return (
                  <div 
                    key={index}
                    className="border rounded-lg overflow-hidden bg-card transition-all duration-200"
                  >
                    <button
                      onClick={() => toggleStep(stepId)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium flex-1">{step.title}</span>
                      {step.image && (
                        <Badge variant="outline" className="mr-2 text-xs">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          Com imagem
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pl-16 animate-fade-in">
                        <p className="text-muted-foreground mb-3">{step.description}</p>
                        
                        {/* Imagem contextual do passo */}
                        {step.image && (
                          <ImageWithPlaceholder image={step.image} stepNumber={index + 1} />
                        )}
                        
                        {step.tips && step.tips.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
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
                <AlertCircle className="w-5 h-5 text-destructive" />
                <h4 className="font-semibold text-destructive">Solução de Problemas</h4>
              </div>
              <div className="space-y-3">
                {section.troubleshooting.map((item, index) => (
                  <div key={index} className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-destructive text-xs font-bold">?</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-destructive mb-1">{item.problem}</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-primary">Solução: </span>{item.solution}
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
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
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
            Aprenda a usar cada módulo do sistema com guias visuais
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
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground shadow-md' 
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
                  Clique em um dos módulos à esquerda para ver instruções detalhadas com 
                  <strong> imagens passo a passo</strong> de como utilizá-lo.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Rodapé com versão */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p>Planner de Leituras - Versão 1.5</p>
        <p className="text-xs mt-1">Documentação atualizada em 23/01/2026</p>
      </div>

      {/* Lightbox Dialog para ampliar imagens */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-background/95 backdrop-blur-sm border-primary/20">
          <DialogTitle className="sr-only">
            {lightboxImage?.caption || 'Visualização da imagem'}
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 z-50 rounded-full bg-background/80 p-2 hover:bg-background transition-colors shadow-lg border">
            <X className="w-5 h-5" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
          {lightboxImage && (
            <div className="flex flex-col max-h-[95vh]">
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                <img 
                  src={lightboxImage.src} 
                  alt={lightboxImage.caption}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
              </div>
              <div className="p-4 bg-muted/50 border-t">
                <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="italic">{lightboxImage.caption}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
