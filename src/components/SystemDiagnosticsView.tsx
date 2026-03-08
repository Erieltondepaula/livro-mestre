import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, Copy, 
  Database, RefreshCw, Zap, BookOpen, 
  StickyNote, Quote, Brain, Star, ScrollText, 
  Users, BarChart3, ChevronDown, ChevronRight,
  Clipboard, Lightbulb, Bug, Rocket, Trash2, Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';

type Severity = 'critical' | 'warning' | 'info' | 'ok';

interface DiagnosticCheck {
  id: string;
  module: string;
  title: string;
  description: string;
  severity: Severity;
  details?: string;
  count?: number;
}

interface ImprovementPrompt {
  key: string;
  title: string;
  prompt: string;
  type: 'fix' | 'feature' | 'optimization';
  status: 'new' | 'suggested' | 'applied' | 'dismissed';
}

interface ModuleDiagnostic {
  module: string;
  icon: typeof BookOpen;
  label: string;
  checks: DiagnosticCheck[];
  improvementPrompts: ImprovementPrompt[];
}

const SEVERITY_CONFIG: Record<Severity, { color: string; icon: typeof CheckCircle; label: string }> = {
  critical: { color: 'text-destructive', icon: AlertTriangle, label: 'Crítico' },
  warning: { color: 'text-yellow-500', icon: AlertTriangle, label: 'Atenção' },
  info: { color: 'text-blue-500', icon: Lightbulb, label: 'Info' },
  ok: { color: 'text-green-500', icon: CheckCircle, label: 'OK' },
};

// ============================================================
// PROMPT CATALOG — all possible prompts, versioned with unique keys
// Each module can have multiple "generations" of prompts.
// Once a prompt is applied/dismissed, it won't appear again.
// ============================================================
interface CatalogPrompt {
  key: string;
  module: string;
  title: string;
  prompt: string;
  type: 'fix' | 'feature' | 'optimization';
  /** If true, only shown when the condition function returns true */
  condition?: (ctx: DiagnosticContext) => boolean;
}

interface DiagnosticContext {
  booksCount: number;
  booksWithoutAuthor: number;
  booksWithoutCategory: number;
  booksZeroPages: number;
  booksWithoutCover: number;
  readingsCount: number;
  readingsNoTime: number;
  readingsNoStartDate: number;
  readingsInvalidPages: number;
  booksWithoutStatus: number;
  booksWithoutEval: number;
  completedBooks: number;
  quotesCount: number;
  quotesWithoutPage: number;
  quotesWithoutTags: number;
  vocabCount: number;
  vocabWithoutBook: number;
  flashcardCount: number;
  notesCount: number;
  emptyNotes: number;
  notesWithoutFolder: number;
  exegesisCount: number;
  outlinesCount: number;
  materialsCount: number;
  usersCount: number;
  inactiveUsers: number;
  auditCount: number;
}

const PROMPT_CATALOG: CatalogPrompt[] = [
  // ===== BOOKS: Generation 1 =====
  { key: 'books-fix-author-v1', module: 'books', type: 'fix', title: 'Completar dados de livros sem autor', prompt: 'Há livros sem autor cadastrado. Identifique-os e preencha automaticamente usando busca online pelo título do livro.', condition: ctx => ctx.booksWithoutAuthor > 0 },
  { key: 'books-fix-zeropages-v1', module: 'books', type: 'fix', title: 'Corrigir livros com 0 páginas', prompt: 'Existem livros com total de páginas = 0. Liste-os e busque o número correto de páginas online.', condition: ctx => ctx.booksZeroPages > 0 },
  { key: 'books-feat-csv-import-v1', module: 'books', type: 'feature', title: 'Importação em lote via CSV', prompt: 'Crie funcionalidade de importação em lote de livros via arquivo CSV com mapeamento de colunas, preview dos dados e validação antes de inserir.' },
  // ===== BOOKS: Generation 2 =====
  { key: 'books-feat-isbn-lookup-v2', module: 'books', type: 'feature', title: 'Busca automática por ISBN', prompt: 'Adicione campo ISBN no cadastro de livros. Ao digitar o ISBN, busque automaticamente título, autor, capa e número de páginas via API Open Library.' },
  { key: 'books-feat-reading-list-v2', module: 'books', type: 'feature', title: 'Lista de desejos / Próximas leituras', prompt: 'Crie uma lista de "Próximas Leituras" separada da biblioteca ativa, com priorização drag-and-drop e motivo para ler cada livro.' },
  { key: 'books-opt-duplicate-check-v2', module: 'books', type: 'optimization', title: 'Detector de livros duplicados', prompt: 'Implemente verificação de duplicatas no cadastro: compare por título (fuzzy match) e autor. Mostre alerta antes de cadastrar.' },
  // ===== BOOKS: Generation 3 =====
  { key: 'books-feat-goodreads-sync-v3', module: 'books', type: 'feature', title: 'Sincronização com Goodreads', prompt: 'Permita que o usuário importe sua estante do Goodreads via CSV exportado, mapeando livros, avaliações e status de leitura.' },
  { key: 'books-feat-book-series-v3', module: 'books', type: 'feature', title: 'Suporte a séries/coleções de livros', prompt: 'Adicione campo "série" e "volume" nos livros para agrupar coleções. Mostre progresso por série na biblioteca.' },

  // ===== READINGS: Generation 1 =====
  { key: 'readings-fix-notime-v1', module: 'readings', type: 'fix', title: 'Estimar tempo de leituras sem registro', prompt: 'Existem leituras sem tempo registrado. Estime automaticamente baseado em páginas lidas × velocidade média por categoria do livro.', condition: ctx => ctx.readingsNoTime > 0 },
  { key: 'readings-fix-invalidpages-v1', module: 'readings', type: 'fix', title: 'Corrigir leituras com páginas inválidas', prompt: 'Existem leituras onde página final ≤ página inicial. Liste e corrija invertendo os valores ou solicitando confirmação.', condition: ctx => ctx.readingsInvalidPages > 0 },
  { key: 'readings-feat-notifications-v1', module: 'readings', type: 'feature', title: 'Notificações PWA de leitura', prompt: 'Implemente notificações push (PWA) com lembretes diários de leitura, horário configurável pelo usuário e frequência personalizável.' },
  // ===== READINGS: Generation 2 =====
  { key: 'readings-feat-speed-graph-v2', module: 'readings', type: 'feature', title: 'Gráfico de velocidade de leitura', prompt: 'Crie gráfico de evolução da velocidade de leitura (páginas/hora) ao longo do tempo, com média móvel e comparativo entre livros.' },
  { key: 'readings-feat-timer-v2', module: 'readings', type: 'feature', title: 'Cronômetro integrado de leitura', prompt: 'Adicione cronômetro embutido na tela de registrar leitura. Ao iniciar, conte o tempo automaticamente. Ao parar, preencha o campo de tempo.' },
  { key: 'readings-feat-audio-sessions-v2', module: 'readings', type: 'feature', title: 'Suporte a audiobooks', prompt: 'Adicione modo "audiobook" nas leituras com campos de duração em horas:minutos, velocidade de reprodução e capítulo em vez de página.' },
  // ===== READINGS: Generation 3 =====
  { key: 'readings-feat-weekly-digest-v3', module: 'readings', type: 'feature', title: 'Resumo semanal por email', prompt: 'Gere relatório semanal automático: páginas lidas, tempo investido, livros progredidos, streak mantido. Envie por email configurável.' },
  { key: 'readings-opt-heatmap-v3', module: 'readings', type: 'optimization', title: 'Heatmap de leitura estilo GitHub', prompt: 'Crie visualização tipo heatmap (estilo GitHub contributions) mostrando dias com leitura, intensidade por páginas lidas.' },

  // ===== STATUS: Generation 1 =====
  { key: 'status-fix-orphan-v1', module: 'statuses', type: 'fix', title: 'Criar status para livros órfãos', prompt: 'Existem livros sem registro de status. Crie automaticamente com status="Não iniciado" e pages_read=0.', condition: ctx => ctx.booksWithoutStatus > 0 },
  { key: 'status-feat-monthly-compare-v1', module: 'statuses', type: 'feature', title: 'Comparativo mensal de produtividade', prompt: 'Crie dashboard comparativo mensal: páginas lidas, livros concluídos, tempo investido — mês atual vs anterior com gráficos de barras.' },
  // ===== STATUS: Generation 2 =====
  { key: 'status-feat-annual-report-v2', module: 'statuses', type: 'feature', title: 'Relatório anual (Year in Review)', prompt: 'Gere relatório anual tipo "Spotify Wrapped": total de livros, autor mais lido, categoria favorita, maior streak, citação favorita. Design visual atraente.' },
  { key: 'status-feat-goals-v2', module: 'statuses', type: 'feature', title: 'Metas de leitura por período', prompt: 'Permita definir metas: X livros/mês, Y páginas/semana. Mostre progresso visual com barra e projeção se vai atingir.' },

  // ===== EVALUATIONS: Generation 1 =====
  { key: 'eval-feat-reminder-v1', module: 'evaluations', type: 'fix', title: 'Banner de avaliação pendente', prompt: 'Existem livros concluídos sem avaliação. Mostre banner discreto no dashboard lembrando de avaliar.', condition: ctx => ctx.booksWithoutEval > 0 },
  // ===== EVALUATIONS: Generation 2 =====
  { key: 'eval-feat-radar-chart-v2', module: 'evaluations', type: 'feature', title: 'Gráfico radar de avaliações', prompt: 'Crie gráfico radar (aranha) para cada avaliação mostrando criatividade, escrita, aprendizados, prazer e impacto. Permita comparar dois livros.' },
  { key: 'eval-feat-recommend-v2', module: 'evaluations', type: 'feature', title: 'Recomendações baseadas em avaliações', prompt: 'Com base nos livros melhor avaliados (padrão de categorias e notas altas), sugira próximas leituras similares.' },

  // ===== QUOTES: Generation 1 =====
  { key: 'quotes-opt-autotag-v1', module: 'quotes', type: 'optimization', title: 'Classificar citações sem tags com IA', prompt: 'Existem citações sem tags temáticas. Use IA para analisar o texto e sugerir tags automaticamente.', condition: ctx => ctx.quotesWithoutTags > 5 },
  { key: 'quotes-feat-pdf-export-v1', module: 'quotes', type: 'feature', title: 'Exportar citações em PDF estilizado', prompt: 'Crie exportação de citações selecionadas em PDF com layout tipo cartão elegante, fonte serifada e referência do livro.' },
  // ===== QUOTES: Generation 2 =====
  { key: 'quotes-feat-daily-v2', module: 'quotes', type: 'feature', title: 'Citação do dia no dashboard', prompt: 'Mostre uma citação aleatória no topo do dashboard, diferente a cada dia. Permita favoritar e compartilhar como imagem.' },
  { key: 'quotes-feat-social-card-v2', module: 'quotes', type: 'feature', title: 'Gerar cards para redes sociais', prompt: 'Crie gerador de imagem/card bonito com a citação, nome do livro e autor. Formatos para Instagram (1:1), Stories (9:16) e Twitter.' },

  // ===== VOCABULARY: Generation 1 =====
  { key: 'vocab-feat-anki-export-v1', module: 'vocabulary', type: 'feature', title: 'Exportar vocabulário para Anki', prompt: 'Crie exportação do vocabulário para formato compatível com Anki (CSV com campos: frente=palavra, verso=definição+exemplos) para estudo offline.' },
  // ===== VOCABULARY: Generation 2 =====
  { key: 'vocab-feat-context-sentences-v2', module: 'vocabulary', type: 'feature', title: 'Frases de contexto com IA', prompt: 'Para cada palavra do vocabulário, gere 3 frases de exemplo usando IA, mostrando diferentes usos e contextos da palavra.' },
  { key: 'vocab-feat-word-family-v2', module: 'vocabulary', type: 'feature', title: 'Famílias de palavras', prompt: 'Agrupe palavras por família (mesmo radical), ex: "ler", "leitura", "leitor". Mostre mapa visual de conexões.' },
  { key: 'vocab-opt-spaced-stats-v2', module: 'vocabulary', type: 'optimization', title: 'Dashboard de flashcards', prompt: 'Crie painel de estatísticas dos flashcards: taxa de acerto, palavras mais difíceis, previsão de revisões pendentes, progresso semanal.' },

  // ===== NOTES: Generation 1 =====
  { key: 'notes-fix-empty-v1', module: 'notes', type: 'fix', title: 'Limpar notas vazias', prompt: 'Existem notas com menos de 10 caracteres. Liste-as e ofereça opção de exclusão em lote ou preenchimento.', condition: ctx => ctx.emptyNotes > 0 },
  { key: 'notes-opt-autofolders-v1', module: 'notes', type: 'optimization', title: 'Organizar notas sem pasta com IA', prompt: 'Existem notas sem pasta. Analise o conteúdo com IA e sugira pasta apropriada para cada uma.', condition: ctx => ctx.notesWithoutFolder > 5 },
  // ===== NOTES: Generation 2 =====
  { key: 'notes-feat-graph-view-v2', module: 'notes', type: 'feature', title: 'Visualização em grafo de notas', prompt: 'Crie visualização tipo grafo (estilo Obsidian) mostrando conexões entre notas, livros e tags. Use força-direcionada para layout.' },
  { key: 'notes-feat-daily-note-v2', module: 'notes', type: 'feature', title: 'Nota diária automática', prompt: 'Crie template de "nota diária" que abre automaticamente ao abrir o app, com seções: reflexão, leitura do dia, versículo, tarefas.' },
  { key: 'notes-feat-ai-summary-v2', module: 'notes', type: 'feature', title: 'Resumo de notas por livro com IA', prompt: 'Gere resumo automático de todas as notas de um livro, organizando por temas e gerando visão geral dos aprendizados.' },

  // ===== EXEGESIS: Generation 1 =====
  { key: 'exegesis-feat-heresy-detector-v1', module: 'exegesis', type: 'feature', title: 'Detector de heresias interpretativas', prompt: 'Implemente sistema que detecte eisegese (leitura de ideias no texto), texto fora de contexto, e doutrina baseada em verso único. Mostre alertas com explicação.' },
  { key: 'exegesis-feat-seminary-mode-v1', module: 'exegesis', type: 'feature', title: 'Modo Professor de Seminário', prompt: 'Crie modo avançado de exegese: debate entre 3+ posições teológicas (reformada, pentecostal, católica), com citações de 5+ comentaristas e avaliação crítica fundamentada.' },
  // ===== EXEGESIS: Generation 2 =====
  { key: 'exegesis-feat-parallel-v2', module: 'exegesis', type: 'feature', title: 'Comparação de traduções em paralelo', prompt: 'Mostre o mesmo versículo em 4+ traduções lado a lado (ACF, NVI, ARA, NVT) com destaques nas diferenças de tradução.' },
  { key: 'exegesis-feat-word-study-v2', module: 'exegesis', type: 'feature', title: 'Estudo de palavras originais', prompt: 'Para cada palavra-chave do texto, mostre: termo original (hebraico/grego), transliteração, número Strong, todas as ocorrências na Bíblia e campo semântico.' },
  { key: 'exegesis-feat-devotional-v2', module: 'exegesis', type: 'feature', title: 'Gerador de devocional', prompt: 'A partir de uma passagem analisada, gere devocional completo: introdução, contexto, aplicação prática, oração, com tom pastoral e linguagem acessível.' },

  // ===== USERS: Generation 1 =====
  { key: 'users-feat-activity-report-v1', module: 'users', type: 'feature', title: 'Relatório de atividade por usuário', prompt: 'Crie relatório visual de atividade: livros lidos, notas criadas, análises feitas, último acesso — com gráfico temporal por usuário.' },
  // ===== USERS: Generation 2 =====
  { key: 'users-feat-onboarding-v2', module: 'users', type: 'feature', title: 'Tutorial interativo (onboarding)', prompt: 'Crie onboarding para novos usuários: tour guiado pelos módulos com tooltips animados, exemplo de cadastro e dicas de uso.' },
  { key: 'users-feat-data-export-v2', module: 'users', type: 'feature', title: 'Exportação completa de dados', prompt: 'Permita que o usuário exporte TODOS os seus dados (livros, leituras, notas, citações, vocabulário) em JSON e CSV para backup pessoal.' },

  // ===== SYSTEM: Cross-module =====
  { key: 'system-feat-dark-reader-v1', module: 'system', type: 'feature', title: 'Modo leitura noturna', prompt: 'Crie modo "leitura noturna" com cores sépia/âmbar, redução de brilho, e fonte serifada maior para conforto visual prolongado.' },
  { key: 'system-opt-offline-v1', module: 'system', type: 'optimization', title: 'Modo offline (PWA)', prompt: 'Implemente cache offline com service worker para que o app funcione sem internet. Sincronize quando voltar online.' },
  { key: 'system-feat-shortcuts-v2', module: 'system', type: 'feature', title: 'Atalhos de teclado', prompt: 'Adicione atalhos de teclado: Ctrl+N (nova nota), Ctrl+B (novo livro), Ctrl+L (nova leitura), Ctrl+/ (busca global). Mostre cheatsheet com ?.' },
  { key: 'system-feat-global-search-v2', module: 'system', type: 'feature', title: 'Busca global unificada', prompt: 'Crie busca global (Ctrl+K) que pesquise em livros, notas, citações, vocabulário e análises simultaneamente, com preview inline.' },
];

export function SystemDiagnosticsView() {
  const { user, isMaster } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [diagnostics, setDiagnostics] = useState<ModuleDiagnostic[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set());

  if (!isMaster) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso restrito ao usuário mestre.</p>
      </div>
    );
  }

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePrompt = (id: string) => {
    setExpandedPrompts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({ title: "Prompt copiado!", description: "Cole no chat do Lovable para executar." });
  };

  const markAsApplied = async (promptKey: string, title: string, prompt: string, module: string) => {
    if (!user) return;
    await supabase.from('diagnostic_prompt_history' as any).upsert({
      user_id: user.id,
      prompt_key: promptKey,
      prompt_title: title,
      prompt_text: prompt,
      module,
      status: 'applied',
      applied_at: new Date().toISOString(),
    } as any, { onConflict: 'user_id,prompt_key' });
    setAppliedKeys(prev => new Set([...prev, promptKey]));
    toast({ title: "✅ Marcado como aplicado", description: "Este prompt não aparecerá novamente." });
  };

  const dismissPrompt = async (promptKey: string, title: string, module: string) => {
    if (!user) return;
    await supabase.from('diagnostic_prompt_history' as any).upsert({
      user_id: user.id,
      prompt_key: promptKey,
      prompt_title: title,
      prompt_text: '',
      module,
      status: 'dismissed',
    } as any, { onConflict: 'user_id,prompt_key' });
    setAppliedKeys(prev => new Set([...prev, promptKey]));
    toast({ title: "Prompt descartado", description: "Não aparecerá novamente." });
  };

  const runDiagnostics = async () => {
    if (!user) return;
    setIsRunning(true);

    try {
      // 1. Load all data in parallel
      const [
        { data: books, count: booksCount },
        { data: readings, count: readingsCount },
        { data: statusData },
        { data: evals },
        { data: quotesData },
        { data: vocabData },
        { data: flashcardData },
        { data: notesData },
        { data: exegesisData },
        { data: outlinesData },
        { data: materialsData },
        { data: profilesData },
        { data: auditData },
        { data: historyData },
      ] = await Promise.all([
        supabase.from('books').select('*', { count: 'exact' }).limit(500),
        supabase.from('readings').select('*', { count: 'exact' }).limit(1000),
        supabase.from('statuses').select('*').limit(500),
        supabase.from('evaluations').select('*').limit(500),
        supabase.from('quotes').select('*').limit(1000),
        supabase.from('vocabulary').select('id, palavra, book_id, definicoes').limit(1000),
        supabase.from('flashcard_reviews').select('id').limit(1000),
        supabase.from('notes').select('id, title, content, word_count, folder_id, book_id').limit(500),
        supabase.from('exegesis_analyses').select('id, analysis_type, passage').limit(500),
        supabase.from('exegesis_outlines').select('id, outline_type, passage').limit(500),
        supabase.from('exegesis_materials').select('id').limit(500),
        supabase.from('profiles').select('id, user_id, display_name, is_active, is_master, created_at').limit(100),
        supabase.from('audit_log').select('id').limit(1000),
        supabase.from('diagnostic_prompt_history' as any).select('prompt_key, status').limit(500),
      ]);

      // 2. Build resolved keys set
      const resolvedKeys = new Set<string>();
      if (historyData) {
        for (const h of historyData as any[]) {
          if (h.status === 'applied' || h.status === 'dismissed') {
            resolvedKeys.add(h.prompt_key);
          }
        }
      }
      setAppliedKeys(resolvedKeys);

      // 3. Build diagnostic context
      const completedBooks = statusData?.filter(s => s.status === 'Concluído' || s.status === 'Concluido') || [];
      const ctx: DiagnosticContext = {
        booksCount: booksCount || 0,
        booksWithoutAuthor: books?.filter(b => !b.author).length || 0,
        booksWithoutCategory: books?.filter(b => !b.category).length || 0,
        booksZeroPages: books?.filter(b => b.total_pages === 0).length || 0,
        booksWithoutCover: books?.filter(b => !b.cover_url).length || 0,
        readingsCount: readingsCount || 0,
        readingsNoTime: readings?.filter(r => !r.time_spent || r.time_spent === '0' || r.time_spent === '0:00').length || 0,
        readingsNoStartDate: readings?.filter(r => !r.start_date).length || 0,
        readingsInvalidPages: readings?.filter(r => r.end_page <= r.start_page).length || 0,
        booksWithoutStatus: (books || []).filter(b => !statusData?.find(s => s.book_id === b.id)).length,
        booksWithoutEval: completedBooks.filter(s => !evals?.find(e => e.book_id === s.book_id)).length,
        completedBooks: completedBooks.length,
        quotesCount: quotesData?.length || 0,
        quotesWithoutPage: quotesData?.filter(q => !q.page && !q.bible_book).length || 0,
        quotesWithoutTags: quotesData?.filter(q => !q.tags || q.tags.length === 0).length || 0,
        vocabCount: vocabData?.length || 0,
        vocabWithoutBook: vocabData?.filter(v => !v.book_id).length || 0,
        flashcardCount: flashcardData?.length || 0,
        notesCount: notesData?.length || 0,
        emptyNotes: notesData?.filter(n => !n.content || n.content.trim().length < 10).length || 0,
        notesWithoutFolder: notesData?.filter(n => !n.folder_id).length || 0,
        exegesisCount: exegesisData?.length || 0,
        outlinesCount: outlinesData?.length || 0,
        materialsCount: materialsData?.length || 0,
        usersCount: profilesData?.length || 0,
        inactiveUsers: profilesData?.filter(p => !p.is_active).length || 0,
        auditCount: auditData?.length || 0,
      };

      // 4. Build module checks
      const booksWithoutAuthorList = books?.filter(b => !b.author) || [];
      const booksZeroPagesList = books?.filter(b => b.total_pages === 0) || [];
      const booksWithoutStatusList = (books || []).filter(b => !statusData?.find(s => s.book_id === b.id));
      const readingsInvalidPagesList = readings?.filter(r => r.end_page <= r.start_page) || [];

      const moduleConfigs: { module: string; icon: typeof BookOpen; label: string; checks: DiagnosticCheck[] }[] = [
        {
          module: 'books', icon: BookOpen, label: 'Minha Biblioteca',
          checks: [
            { id: 'books-total', module: 'books', title: `${ctx.booksCount} livros cadastrados`, description: 'Total de livros no sistema', severity: 'ok' },
            { id: 'books-no-author', module: 'books', title: 'Livros sem autor', description: `${ctx.booksWithoutAuthor} livros sem autor`, severity: ctx.booksWithoutAuthor > 0 ? 'warning' : 'ok', count: ctx.booksWithoutAuthor, details: booksWithoutAuthorList.slice(0, 5).map(b => b.name).join(', ') },
            { id: 'books-no-category', module: 'books', title: 'Livros sem categoria', description: `${ctx.booksWithoutCategory} livros sem categoria`, severity: ctx.booksWithoutCategory > 0 ? 'info' : 'ok', count: ctx.booksWithoutCategory },
            { id: 'books-no-cover', module: 'books', title: 'Livros sem capa', description: `${ctx.booksWithoutCover} livros sem imagem de capa`, severity: ctx.booksWithoutCover > 3 ? 'info' : 'ok', count: ctx.booksWithoutCover },
            { id: 'books-zero-pages', module: 'books', title: 'Livros com 0 páginas', description: `${ctx.booksZeroPages} livros com total de páginas = 0`, severity: ctx.booksZeroPages > 0 ? 'critical' : 'ok', count: ctx.booksZeroPages, details: booksZeroPagesList.slice(0, 5).map(b => b.name).join(', ') },
          ],
        },
        {
          module: 'readings', icon: BookOpen, label: 'Planner de Leituras',
          checks: [
            { id: 'readings-total', module: 'readings', title: `${ctx.readingsCount} registros de leitura`, description: 'Total de sessões registradas', severity: 'ok' },
            { id: 'readings-no-time', module: 'readings', title: 'Leituras sem tempo', description: `${ctx.readingsNoTime} leituras sem tempo registrado`, severity: ctx.readingsNoTime > 5 ? 'warning' : 'ok', count: ctx.readingsNoTime },
            { id: 'readings-no-date', module: 'readings', title: 'Leituras sem data início', description: `${ctx.readingsNoStartDate} leituras sem data de início`, severity: ctx.readingsNoStartDate > 0 ? 'warning' : 'ok', count: ctx.readingsNoStartDate },
            { id: 'readings-invalid-pages', module: 'readings', title: 'Páginas inválidas', description: `${ctx.readingsInvalidPages} leituras onde página final ≤ página inicial`, severity: ctx.readingsInvalidPages > 0 ? 'critical' : 'ok', count: ctx.readingsInvalidPages, details: readingsInvalidPagesList.slice(0, 3).map(r => `ID: ${r.id.slice(0, 8)}`).join(', ') },
          ],
        },
        {
          module: 'statuses', icon: BarChart3, label: 'Status dos Livros',
          checks: [
            { id: 'status-orphan', module: 'statuses', title: 'Livros sem status', description: `${ctx.booksWithoutStatus} livros sem registro de status`, severity: ctx.booksWithoutStatus > 0 ? 'warning' : 'ok', count: ctx.booksWithoutStatus, details: booksWithoutStatusList.slice(0, 5).map(b => b.name).join(', ') },
          ],
        },
        {
          module: 'evaluations', icon: Star, label: 'Avaliações',
          checks: [
            { id: 'eval-total', module: 'evaluations', title: `${evals?.length || 0} avaliações`, description: 'Total de livros avaliados', severity: 'ok' },
            { id: 'eval-missing', module: 'evaluations', title: 'Concluídos sem avaliação', description: `${ctx.booksWithoutEval} livros finalizados sem avaliação`, severity: ctx.booksWithoutEval > 0 ? 'info' : 'ok', count: ctx.booksWithoutEval },
          ],
        },
        {
          module: 'quotes', icon: Quote, label: 'Citações',
          checks: [
            { id: 'quotes-total', module: 'quotes', title: `${ctx.quotesCount} citações salvas`, description: 'Total de citações', severity: 'ok' },
            { id: 'quotes-no-page', module: 'quotes', title: 'Citações sem referência', description: `${ctx.quotesWithoutPage} sem página ou referência bíblica`, severity: ctx.quotesWithoutPage > 3 ? 'info' : 'ok', count: ctx.quotesWithoutPage },
            { id: 'quotes-no-tags', module: 'quotes', title: 'Citações sem tags', description: `${ctx.quotesWithoutTags} citações sem tags temáticas`, severity: ctx.quotesWithoutTags > 5 ? 'info' : 'ok', count: ctx.quotesWithoutTags },
          ],
        },
        {
          module: 'vocabulary', icon: Brain, label: 'Dicionário / Vocabulário',
          checks: [
            { id: 'vocab-total', module: 'vocabulary', title: `${ctx.vocabCount} palavras salvas`, description: 'Total de vocabulário', severity: 'ok' },
            { id: 'vocab-no-book', module: 'vocabulary', title: 'Palavras sem livro vinculado', description: `${ctx.vocabWithoutBook} palavras não associadas`, severity: ctx.vocabWithoutBook > 0 ? 'info' : 'ok', count: ctx.vocabWithoutBook },
            { id: 'vocab-flashcards', module: 'vocabulary', title: `${ctx.flashcardCount} flashcards ativos`, description: 'Cards no sistema de repetição espaçada', severity: 'ok' },
          ],
        },
        {
          module: 'notes', icon: StickyNote, label: 'Notas',
          checks: [
            { id: 'notes-total', module: 'notes', title: `${ctx.notesCount} notas`, description: 'Total de notas criadas', severity: 'ok' },
            { id: 'notes-empty', module: 'notes', title: 'Notas vazias/curtas', description: `${ctx.emptyNotes} notas com menos de 10 caracteres`, severity: ctx.emptyNotes > 0 ? 'warning' : 'ok', count: ctx.emptyNotes },
            { id: 'notes-no-folder', module: 'notes', title: 'Notas sem pasta', description: `${ctx.notesWithoutFolder} notas não organizadas`, severity: ctx.notesWithoutFolder > 10 ? 'info' : 'ok', count: ctx.notesWithoutFolder },
          ],
        },
        {
          module: 'exegesis', icon: ScrollText, label: 'Exegese Bíblica',
          checks: [
            { id: 'exegesis-analyses', module: 'exegesis', title: `${ctx.exegesisCount} análises`, description: 'Total de análises exegéticas', severity: 'ok' },
            { id: 'exegesis-outlines', module: 'exegesis', title: `${ctx.outlinesCount} esboços`, description: 'Total de esboços gerados', severity: 'ok' },
            { id: 'exegesis-materials', module: 'exegesis', title: `${ctx.materialsCount} materiais`, description: 'Fontes de referência', severity: 'ok' },
          ],
        },
        {
          module: 'users', icon: Users, label: 'Gerenciamento de Usuários',
          checks: [
            { id: 'users-total', module: 'users', title: `${ctx.usersCount} usuários registrados`, description: 'Total de contas', severity: 'ok' },
            { id: 'users-inactive', module: 'users', title: 'Usuários inativos', description: `${ctx.inactiveUsers} contas desativadas`, severity: ctx.inactiveUsers > 0 ? 'info' : 'ok', count: ctx.inactiveUsers },
            { id: 'users-audit', module: 'users', title: `${ctx.auditCount} registros de auditoria`, description: 'Ações no audit_log', severity: 'ok' },
          ],
        },
      ];

      // 5. Filter prompts: only show ones not yet resolved/applied/dismissed
      const modules: ModuleDiagnostic[] = moduleConfigs.map(mc => {
        const modulePrompts = PROMPT_CATALOG
          .filter(p => p.module === mc.module)
          .filter(p => !resolvedKeys.has(p.key)) // Skip already applied/dismissed
          .filter(p => !p.condition || p.condition(ctx)) // Check condition
          .slice(0, 5) // Max 5 new prompts per module
          .map(p => ({
            key: p.key,
            title: p.title,
            prompt: p.prompt,
            type: p.type,
            status: 'new' as const,
          }));

        return { ...mc, improvementPrompts: modulePrompts };
      });

      // Add system-wide prompts as separate module
      const systemPrompts = PROMPT_CATALOG
        .filter(p => p.module === 'system')
        .filter(p => !resolvedKeys.has(p.key))
        .filter(p => !p.condition || p.condition(ctx))
        .slice(0, 5)
        .map(p => ({
          key: p.key,
          title: p.title,
          prompt: p.prompt,
          type: p.type,
          status: 'new' as const,
        }));

      if (systemPrompts.length > 0) {
        modules.push({
          module: 'system', icon: Zap, label: 'Sistema Geral',
          checks: [
            { id: 'system-health', module: 'system', title: 'Sistema operacional', description: 'Todas as verificações cruzadas passaram', severity: 'ok' },
          ],
          improvementPrompts: systemPrompts,
        });
      }

      setDiagnostics(modules);
      setLastRun(new Date());

      // Auto-expand modules with issues
      const toExpand = new Set<string>();
      for (const m of modules) {
        if (m.checks.some(c => c.severity === 'critical' || c.severity === 'warning')) {
          toExpand.add(m.module);
        }
      }
      setExpandedModules(toExpand);

    } catch (error) {
      console.error('Erro ao executar diagnóstico:', error);
      toast({ title: "Erro no diagnóstico", description: "Não foi possível completar todas as verificações.", variant: "destructive" });
    }

    setIsRunning(false);
  };

  const summary = {
    critical: diagnostics.flatMap(m => m.checks).filter(c => c.severity === 'critical').length,
    warning: diagnostics.flatMap(m => m.checks).filter(c => c.severity === 'warning').length,
    info: diagnostics.flatMap(m => m.checks).filter(c => c.severity === 'info').length,
    ok: diagnostics.flatMap(m => m.checks).filter(c => c.severity === 'ok').length,
  };

  const totalNewPrompts = diagnostics.reduce((sum, m) => sum + m.improvementPrompts.length, 0);
  const totalApplied = appliedKeys.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Diagnóstico do Sistema
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Análise procedural — verifica o que já foi aplicado e sugere apenas melhorias novas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalApplied > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              {totalApplied} aplicados
            </Badge>
          )}
          <Button onClick={runDiagnostics} disabled={isRunning} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Analisando...' : 'Executar Diagnóstico'}
          </Button>
        </div>
      </div>

      {lastRun && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Última execução: {lastRun.toLocaleString('pt-BR')}
        </p>
      )}

      {/* Loading skeleton */}
      {isRunning && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-5 w-40" />
                  <div className="flex-1" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      {diagnostics.length > 0 && !isRunning && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="border-destructive/30">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-1" />
              <p className="text-2xl font-bold text-destructive">{summary.critical}</p>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-yellow-500">{summary.warning}</p>
              <p className="text-xs text-muted-foreground">Alertas</p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30">
            <CardContent className="p-4 text-center">
              <Lightbulb className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-500">{summary.info}</p>
              <p className="text-xs text-muted-foreground">Sugestões</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-500">{summary.ok}</p>
              <p className="text-xs text-muted-foreground">OK</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-4 text-center">
              <Rocket className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{totalNewPrompts}</p>
              <p className="text-xs text-muted-foreground">Novos Prompts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Module-by-Module Results */}
      {diagnostics.length > 0 && !isRunning && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5" />
            Relatório por Módulo
          </h3>

          {diagnostics.map(mod => {
            const Icon = mod.icon;
            const isExpanded = expandedModules.has(mod.module);
            const worstSeverity = mod.checks.reduce((worst, c) => {
              const order: Severity[] = ['critical', 'warning', 'info', 'ok'];
              return order.indexOf(c.severity) < order.indexOf(worst) ? c.severity : worst;
            }, 'ok' as Severity);
            const SeverityIcon = SEVERITY_CONFIG[worstSeverity].icon;
            const newPromptCount = mod.improvementPrompts.length;

            return (
              <Card key={mod.module} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleModule(mod.module)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <Icon className="w-5 h-5 text-primary" />
                          <CardTitle className="text-base">{mod.label}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <SeverityIcon className={`w-4 h-4 ${SEVERITY_CONFIG[worstSeverity].color}`} />
                          <Badge variant="outline" className="text-xs">
                            {mod.checks.length} verificações
                          </Badge>
                          {newPromptCount > 0 && (
                            <Badge className="text-xs gap-1 bg-primary">
                              <Zap className="w-3 h-3" />
                              {newPromptCount} novos
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Checks */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verificações</p>
                        {mod.checks.map(check => {
                          const CheckIcon = SEVERITY_CONFIG[check.severity].icon;
                          return (
                            <div key={check.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                              <CheckIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${SEVERITY_CONFIG[check.severity].color}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{check.title}</p>
                                <p className="text-xs text-muted-foreground">{check.description}</p>
                                {check.details && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">📋 {check.details}</p>
                                )}
                              </div>
                              <Badge variant={check.severity === 'ok' ? 'secondary' : 'outline'} className="text-[10px] flex-shrink-0">
                                {SEVERITY_CONFIG[check.severity].label}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>

                      {mod.improvementPrompts.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <Rocket className="w-3 h-3" /> Prompts de Melhoria (Novos)
                            </p>
                            {mod.improvementPrompts.map(ip => {
                              const isPromptExpanded = expandedPrompts.has(ip.key);
                              const isJustApplied = appliedKeys.has(ip.key);
                              const typeConfig = {
                                fix: { icon: Bug, label: 'Correção', badgeVariant: 'destructive' as const },
                                feature: { icon: Zap, label: 'Novo recurso', badgeVariant: 'default' as const },
                                optimization: { icon: Lightbulb, label: 'Otimização', badgeVariant: 'secondary' as const },
                              };
                              const tc = typeConfig[ip.type];
                              const TypeIcon = tc.icon;

                              if (isJustApplied) return null;

                              return (
                                <div key={ip.key} className="border rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => togglePrompt(ip.key)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                                  >
                                    {isPromptExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium flex-1">{ip.title}</span>
                                    <Badge variant={tc.badgeVariant} className="text-[10px]">{tc.label}</Badge>
                                  </button>
                                  {isPromptExpanded && (
                                    <div className="px-3 pb-3 space-y-2">
                                      <div className="bg-muted/50 rounded-lg p-3 text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap">
                                        {ip.prompt}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1.5 text-xs"
                                          onClick={() => copyPrompt(ip.prompt)}
                                        >
                                          <Copy className="w-3 h-3" />
                                          Copiar Prompt
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1.5 text-xs text-green-600"
                                          onClick={() => markAsApplied(ip.key, ip.title, ip.prompt, mod.module)}
                                        >
                                          <Check className="w-3 h-3" />
                                          Já Aplicado
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="gap-1.5 text-xs text-muted-foreground"
                                          onClick={() => dismissPrompt(ip.key, ip.title, mod.module)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Descartar
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Copy All */}
      {diagnostics.length > 0 && !isRunning && totalNewPrompts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-primary" />
              Copiar Prompts Rápidos ({totalNewPrompts} novos)
            </CardTitle>
            <CardDescription>Clique para copiar e colar no chat do Lovable</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {diagnostics.flatMap(mod => 
                mod.improvementPrompts
                  .filter(ip => !appliedKeys.has(ip.key))
                  .map(ip => (
                    <Button
                      key={ip.key}
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2 text-xs h-auto py-2 text-left"
                      onClick={() => copyPrompt(ip.prompt)}
                    >
                      <Copy className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{mod.label}: {ip.title}</span>
                    </Button>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {diagnostics.length === 0 && !isRunning && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum diagnóstico executado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em "Executar Diagnóstico" para analisar todos os módulos do sistema
            </p>
            <Button onClick={runDiagnostics} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Executar Diagnóstico
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All done state */}
      {diagnostics.length > 0 && !isRunning && totalNewPrompts === 0 && (
        <Card className="border-green-500/30">
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-green-600 dark:text-green-400">Todos os prompts foram aplicados!</h3>
            <p className="text-sm text-muted-foreground">
              Todos os {totalApplied} prompts disponíveis foram aplicados ou descartados. Novas sugestões serão adicionadas em futuras atualizações.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
