import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, Copy, 
  Database, RefreshCw, Shield, Zap, BookOpen, 
  StickyNote, Quote, Brain, Star, ScrollText, 
  Users, BarChart3, ChevronDown, ChevronRight,
  Clipboard, Lightbulb, Bug, Rocket
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

interface ModuleDiagnostic {
  module: string;
  icon: typeof BookOpen;
  label: string;
  checks: DiagnosticCheck[];
  improvementPrompts: { title: string; prompt: string; type: 'fix' | 'feature' | 'optimization' }[];
}

const SEVERITY_CONFIG: Record<Severity, { color: string; icon: typeof CheckCircle; label: string }> = {
  critical: { color: 'text-destructive', icon: AlertTriangle, label: 'Crítico' },
  warning: { color: 'text-yellow-500', icon: AlertTriangle, label: 'Atenção' },
  info: { color: 'text-blue-500', icon: Lightbulb, label: 'Info' },
  ok: { color: 'text-green-500', icon: CheckCircle, label: 'OK' },
};

export function SystemDiagnosticsView() {
  const { isMaster } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [diagnostics, setDiagnostics] = useState<ModuleDiagnostic[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

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

  const runDiagnostics = async () => {
    setIsRunning(true);
    const modules: ModuleDiagnostic[] = [];

    try {
      // ========== 1. LIVROS ==========
      const { data: books, count: booksCount } = await supabase.from('books').select('*', { count: 'exact' });
      const booksWithoutAuthor = books?.filter(b => !b.author) || [];
      const booksWithoutCategory = books?.filter(b => !b.category) || [];
      const booksWithoutCover = books?.filter(b => !b.cover_url) || [];
      const booksZeroPages = books?.filter(b => b.total_pages === 0) || [];

      modules.push({
        module: 'books',
        icon: BookOpen,
        label: 'Minha Biblioteca',
        checks: [
          { id: 'books-total', module: 'books', title: `${booksCount || 0} livros cadastrados`, description: 'Total de livros no sistema', severity: 'ok' },
          { id: 'books-no-author', module: 'books', title: 'Livros sem autor', description: `${booksWithoutAuthor.length} livros não possuem autor definido`, severity: booksWithoutAuthor.length > 0 ? 'warning' : 'ok', count: booksWithoutAuthor.length, details: booksWithoutAuthor.slice(0, 5).map(b => b.name).join(', ') },
          { id: 'books-no-category', module: 'books', title: 'Livros sem categoria', description: `${booksWithoutCategory.length} livros sem categoria`, severity: booksWithoutCategory.length > 0 ? 'info' : 'ok', count: booksWithoutCategory.length },
          { id: 'books-no-cover', module: 'books', title: 'Livros sem capa', description: `${booksWithoutCover.length} livros sem imagem de capa`, severity: booksWithoutCover.length > 3 ? 'info' : 'ok', count: booksWithoutCover.length },
          { id: 'books-zero-pages', module: 'books', title: 'Livros com 0 páginas', description: `${booksZeroPages.length} livros com total de páginas = 0`, severity: booksZeroPages.length > 0 ? 'critical' : 'ok', count: booksZeroPages.length, details: booksZeroPages.slice(0, 5).map(b => b.name).join(', ') },
        ],
        improvementPrompts: [
          { title: 'Completar dados de livros', type: 'fix', prompt: 'Verifique todos os livros cadastrados e identifique aqueles sem autor, sem categoria ou sem capa. Crie um fluxo para preencher esses dados em lote, sugerindo autores e categorias com base no nome do livro.' },
          { title: 'Busca avançada de livros', type: 'feature', prompt: 'Adicione busca avançada na biblioteca com filtros por: autor, categoria, tipo, ano, faixa de páginas, nota de avaliação e status de leitura. Inclua ordenação por múltiplos critérios.' },
          { title: 'Importação em lote', type: 'feature', prompt: 'Crie funcionalidade de importação em lote de livros via CSV/Excel com mapeamento automático de colunas e validação de dados antes da importação.' },
        ],
      });

      // ========== 2. LEITURAS ==========
      const { data: readings, count: readingsCount } = await supabase.from('readings').select('*', { count: 'exact' });
      const readingsNoTime = readings?.filter(r => !r.time_spent || r.time_spent === '0' || r.time_spent === '0:00') || [];
      const readingsNoStartDate = readings?.filter(r => !r.start_date) || [];
      const readingsInvalidPages = readings?.filter(r => r.end_page <= r.start_page) || [];

      modules.push({
        module: 'readings',
        icon: BookOpen,
        label: 'Planner de Leituras',
        checks: [
          { id: 'readings-total', module: 'readings', title: `${readingsCount || 0} registros de leitura`, description: 'Total de sessões registradas', severity: 'ok' },
          { id: 'readings-no-time', module: 'readings', title: 'Leituras sem tempo', description: `${readingsNoTime.length} leituras sem tempo registrado`, severity: readingsNoTime.length > 5 ? 'warning' : 'ok', count: readingsNoTime.length },
          { id: 'readings-no-date', module: 'readings', title: 'Leituras sem data início', description: `${readingsNoStartDate.length} leituras sem data de início`, severity: readingsNoStartDate.length > 0 ? 'warning' : 'ok', count: readingsNoStartDate.length },
          { id: 'readings-invalid-pages', module: 'readings', title: 'Páginas inválidas', description: `${readingsInvalidPages.length} leituras onde página final ≤ página inicial`, severity: readingsInvalidPages.length > 0 ? 'critical' : 'ok', count: readingsInvalidPages.length },
        ],
        improvementPrompts: [
          { title: 'Corrigir leituras sem tempo', type: 'fix', prompt: 'Identifique todas as leituras que não possuem tempo registrado (time_spent nulo ou "0:00") e sugira uma forma de estimar o tempo baseado na quantidade de páginas lidas e na velocidade média do usuário.' },
          { title: 'Lembretes de leitura', type: 'feature', prompt: 'Implemente um sistema de lembretes de leitura com notificações push (PWA) que lembre o usuário de ler diariamente. Inclua configuração de horário preferido e frequência.' },
          { title: 'Meta diária de leitura', type: 'feature', prompt: 'Crie um sistema de metas diárias de leitura com: meta de páginas por dia, streak de dias consecutivos, badges de conquista e gráfico de consistência.' },
        ],
      });

      // ========== 3. STATUS ==========
      const { data: statusData } = await supabase.from('statuses').select('*');
      const booksWithoutStatus = (books || []).filter(b => !statusData?.find(s => s.book_id === b.id));

      modules.push({
        module: 'statuses',
        icon: BarChart3,
        label: 'Status dos Livros',
        checks: [
          { id: 'status-orphan', module: 'statuses', title: 'Livros sem status', description: `${booksWithoutStatus.length} livros não possuem registro de status`, severity: booksWithoutStatus.length > 0 ? 'warning' : 'ok', count: booksWithoutStatus.length, details: booksWithoutStatus.slice(0, 5).map(b => b.name).join(', ') },
        ],
        improvementPrompts: [
          { title: 'Criar status automático', type: 'fix', prompt: 'Crie um mecanismo automático que gere o registro de status para todos os livros que ainda não possuem, definindo o status como "Não iniciado" e pages_read como 0.' },
          { title: 'Dashboard de progresso', type: 'feature', prompt: 'Melhore o dashboard de status com: gráfico de velocidade de leitura ao longo do tempo, previsão de conclusão baseada no ritmo atual, e comparativo mensal de produtividade.' },
        ],
      });

      // ========== 4. AVALIAÇÕES ==========
      const { data: evals } = await supabase.from('evaluations').select('*');
      const completedBooks = statusData?.filter(s => s.status === 'Concluído') || [];
      const booksWithoutEval = completedBooks.filter(s => !evals?.find(e => e.book_id === s.book_id));

      modules.push({
        module: 'evaluations',
        icon: Star,
        label: 'Avaliações',
        checks: [
          { id: 'eval-total', module: 'evaluations', title: `${evals?.length || 0} avaliações`, description: 'Total de livros avaliados', severity: 'ok' },
          { id: 'eval-missing', module: 'evaluations', title: 'Livros concluídos sem avaliação', description: `${booksWithoutEval.length} livros finalizados ainda não foram avaliados`, severity: booksWithoutEval.length > 0 ? 'info' : 'ok', count: booksWithoutEval.length },
        ],
        improvementPrompts: [
          { title: 'Lembrete de avaliação', type: 'feature', prompt: 'Adicione um lembrete automático para avaliar livros que foram concluídos mas ainda não possuem avaliação. Mostre um banner sutil no dashboard com a lista de livros pendentes de avaliação.' },
        ],
      });

      // ========== 5. CITAÇÕES ==========
      const { data: quotesData } = await supabase.from('quotes').select('*');
      const quotesWithoutPage = quotesData?.filter(q => !q.page && !q.bible_book) || [];

      modules.push({
        module: 'quotes',
        icon: Quote,
        label: 'Citações',
        checks: [
          { id: 'quotes-total', module: 'quotes', title: `${quotesData?.length || 0} citações salvas`, description: 'Total de citações', severity: 'ok' },
          { id: 'quotes-no-page', module: 'quotes', title: 'Citações sem referência', description: `${quotesWithoutPage.length} citações sem página ou referência bíblica`, severity: quotesWithoutPage.length > 3 ? 'info' : 'ok', count: quotesWithoutPage.length },
        ],
        improvementPrompts: [
          { title: 'Exportar citações', type: 'feature', prompt: 'Crie funcionalidade de exportação de citações em formato PDF estilizado, com opções de filtro por livro, com layout para impressão tipo cartão de citação.' },
          { title: 'Tags em citações', type: 'feature', prompt: 'Adicione sistema de tags/categorias para citações, permitindo classificar por tema (motivação, sabedoria, fé, etc.) e filtrar/buscar por tags.' },
        ],
      });

      // ========== 6. VOCABULÁRIO ==========
      const { data: vocabData } = await supabase.from('vocabulary').select('id, palavra, book_id, definicoes', { count: 'exact' });
      const vocabWithoutBook = vocabData?.filter(v => !v.book_id) || [];

      modules.push({
        module: 'vocabulary',
        icon: Brain,
        label: 'Dicionário / Vocabulário',
        checks: [
          { id: 'vocab-total', module: 'vocabulary', title: `${vocabData?.length || 0} palavras salvas`, description: 'Total de vocabulário', severity: 'ok' },
          { id: 'vocab-no-book', module: 'vocabulary', title: 'Palavras sem livro vinculado', description: `${vocabWithoutBook.length} palavras não estão associadas a nenhum livro`, severity: vocabWithoutBook.length > 0 ? 'info' : 'ok', count: vocabWithoutBook.length },
        ],
        improvementPrompts: [
          { title: 'Flashcards de vocabulário', type: 'feature', prompt: 'Crie um módulo de flashcards para revisar o vocabulário salvo usando repetição espaçada (Spaced Repetition). Inclua: cartão com palavra na frente e definição no verso, botões de "Fácil/Médio/Difícil", e estatísticas de revisão.' },
          { title: 'Quiz de vocabulário', type: 'feature', prompt: 'Implemente um quiz interativo de vocabulário onde o sistema apresenta definições e o usuário deve selecionar a palavra correta entre opções. Inclua pontuação e histórico de acertos.' },
        ],
      });

      // ========== 7. NOTAS ==========
      const { data: notesData } = await supabase.from('notes').select('id, title, content, word_count, folder_id, book_id');
      const emptyNotes = notesData?.filter(n => !n.content || n.content.trim().length < 10) || [];
      const notesWithoutFolder = notesData?.filter(n => !n.folder_id) || [];

      modules.push({
        module: 'notes',
        icon: StickyNote,
        label: 'Notas',
        checks: [
          { id: 'notes-total', module: 'notes', title: `${notesData?.length || 0} notas`, description: 'Total de notas criadas', severity: 'ok' },
          { id: 'notes-empty', module: 'notes', title: 'Notas vazias/curtas', description: `${emptyNotes.length} notas com menos de 10 caracteres`, severity: emptyNotes.length > 0 ? 'warning' : 'ok', count: emptyNotes.length },
          { id: 'notes-no-folder', module: 'notes', title: 'Notas sem pasta', description: `${notesWithoutFolder.length} notas não organizadas em pastas`, severity: notesWithoutFolder.length > 10 ? 'info' : 'ok', count: notesWithoutFolder.length },
        ],
        improvementPrompts: [
          { title: 'Organização automática', type: 'optimization', prompt: 'Crie um assistente que analise notas sem pasta e sugira automaticamente a pasta mais adequada com base no conteúdo, título e tags da nota. O usuário aprova ou rejeita a sugestão.' },
          { title: 'Templates de notas', type: 'feature', prompt: 'Adicione templates prontos para notas: Resumo de Capítulo, Reflexão Devocional, Análise de Personagem Bíblico, Estudo Temático, Lista de Aplicações Práticas.' },
        ],
      });

      // ========== 8. EXEGESE ==========
      const { data: exegesisData } = await supabase.from('exegesis_analyses').select('id, analysis_type, passage');
      const { data: outlinesData } = await supabase.from('exegesis_outlines').select('id, outline_type, passage');

      modules.push({
        module: 'exegesis',
        icon: ScrollText,
        label: 'Exegese Bíblica',
        checks: [
          { id: 'exegesis-analyses', module: 'exegesis', title: `${exegesisData?.length || 0} análises exegéticas`, description: 'Total de análises realizadas', severity: 'ok' },
          { id: 'exegesis-outlines', module: 'exegesis', title: `${outlinesData?.length || 0} esboços gerados`, description: 'Total de esboços de sermão', severity: 'ok' },
        ],
        improvementPrompts: [
          { title: 'Melhorar Exegese Completa', type: 'optimization', prompt: 'Analise o módulo de Exegese Completa e melhore a lógica de interpretação: adicione análise morfológica mais detalhada do texto original (hebraico/grego), inclua variantes textuais significativas, e amplie a seção de teologia bíblica conectando o texto com a narrativa redentiva de toda a Escritura.' },
          { title: 'Biblioteca de esboços', type: 'feature', prompt: 'Crie uma biblioteca de esboços com: busca por passagem ou tema, tags classificatórias (evangelístico, devocional, doutrinário, ocasional), filtro por tipo de esboço, e opção de duplicar/adaptar esboços existentes.' },
          { title: 'Exportar esboço para PPTX', type: 'feature', prompt: 'Melhore a exportação de esboços para PowerPoint: crie slides automáticos com o título do sermão, cada ponto principal em um slide separado, referências bíblicas destacadas, e um slide final com aplicações práticas.' },
        ],
      });

      // ========== 9. USUÁRIOS ==========
      const { data: profilesData } = await supabase.from('profiles').select('id, user_id, display_name, is_active, is_master, created_at');
      const inactiveUsers = profilesData?.filter(p => !p.is_active) || [];

      modules.push({
        module: 'users',
        icon: Users,
        label: 'Gerenciamento de Usuários',
        checks: [
          { id: 'users-total', module: 'users', title: `${profilesData?.length || 0} usuários registrados`, description: 'Total de contas no sistema', severity: 'ok' },
          { id: 'users-inactive', module: 'users', title: 'Usuários inativos', description: `${inactiveUsers.length} contas desativadas`, severity: inactiveUsers.length > 0 ? 'info' : 'ok', count: inactiveUsers.length },
        ],
        improvementPrompts: [
          { title: 'Log de ações do mestre', type: 'feature', prompt: 'Crie uma tabela de log de ações administrativas (audit_log) que registre: quem fez a ação, o que foi feito, quando, e dados antes/depois da alteração. Mostre o histórico no painel de administração.' },
          { title: 'Controle granular de módulos', type: 'optimization', prompt: 'Melhore o controle de permissões: adicione perfis pré-definidos (Leitor Básico, Leitor Avançado, Pregador, Administrador) com conjuntos de permissões padrão que podem ser personalizados por usuário.' },
        ],
      });

    } catch (error) {
      console.error('Erro ao executar diagnóstico:', error);
      toast({ title: "Erro no diagnóstico", description: "Não foi possível completar todas as verificações.", variant: "destructive" });
    }

    setDiagnostics(modules);
    setLastRun(new Date());
    setIsRunning(false);
  };

  const summary = {
    critical: diagnostics.flatMap(m => m.checks).filter(c => c.severity === 'critical').length,
    warning: diagnostics.flatMap(m => m.checks).filter(c => c.severity === 'warning').length,
    info: diagnostics.flatMap(m => m.checks).filter(c => c.severity === 'info').length,
    ok: diagnostics.flatMap(m => m.checks).filter(c => c.severity === 'ok').length,
  };

  const totalPrompts = diagnostics.reduce((sum, m) => sum + m.improvementPrompts.length, 0);

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
            Análise completa de todos os módulos com sugestões de melhoria
          </p>
        </div>
        <Button onClick={runDiagnostics} disabled={isRunning} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Analisando...' : 'Executar Diagnóstico'}
        </Button>
      </div>

      {lastRun && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Última execução: {lastRun.toLocaleString('pt-BR')}
        </p>
      )}

      {/* Summary Cards */}
      {diagnostics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        </div>
      )}

      {/* Module-by-Module Results */}
      {diagnostics.length > 0 && (
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
                          <Badge variant="secondary" className="text-xs">
                            {mod.improvementPrompts.length} prompts
                          </Badge>
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

                      <Separator />

                      {/* Improvement Prompts */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Rocket className="w-3 h-3" /> Prompts de Melhoria
                        </p>
                        {mod.improvementPrompts.map((ip, idx) => {
                          const promptId = `${mod.module}-${idx}`;
                          const isPromptExpanded = expandedPrompts.has(promptId);
                          const typeConfig = {
                            fix: { icon: Bug, label: 'Correção', badgeVariant: 'destructive' as const },
                            feature: { icon: Zap, label: 'Novo recurso', badgeVariant: 'default' as const },
                            optimization: { icon: Lightbulb, label: 'Otimização', badgeVariant: 'secondary' as const },
                          };
                          const tc = typeConfig[ip.type];
                          const TypeIcon = tc.icon;

                          return (
                            <div key={promptId} className="border rounded-lg overflow-hidden">
                              <button
                                onClick={() => togglePrompt(promptId)}
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
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 text-xs"
                                    onClick={() => copyPrompt(ip.prompt)}
                                  >
                                    <Copy className="w-3 h-3" />
                                    Copiar Prompt
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* All Prompts Summary */}
      {diagnostics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-primary" />
              Resumo de Prompts ({totalPrompts})
            </CardTitle>
            <CardDescription>Todos os prompts prontos para copiar e colar no chat do Lovable</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {diagnostics.flatMap(mod => 
                mod.improvementPrompts.map((ip, idx) => (
                  <Button
                    key={`${mod.module}-${idx}`}
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
    </div>
  );
}