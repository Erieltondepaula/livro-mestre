import { useState, useMemo } from 'react';
import { BookOpen, BookCheck, Clock, TrendingUp, Library, Target, Search, Calendar, AlertCircle } from 'lucide-react';
import type { DashboardStats, BookStatus, Book, DailyReading } from '@/types/library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateReadingProjection, formatProjectedDateCompact } from '@/lib/readingProjections';

interface DashboardProps {
  stats: DashboardStats;
  recentStatuses: BookStatus[];
  books: Book[];
  readings: DailyReading[];
  onNavigateToBooks?: (filter?: 'all' | 'reading' | 'completed') => void;
}

type StatusFilter = 'all' | 'Lendo' | 'Concluido' | 'Não iniciado';

export function Dashboard({ stats, recentStatuses, books, readings, onNavigateToBooks }: DashboardProps) {
  // Filtro padrão: "Lendo"
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Lendo');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar statuses
  const filteredStatuses = useMemo(() => {
    let result = [...recentStatuses];
    
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(s => s.livro.toLowerCase().includes(query));
    }
    
    return result;
  }, [recentStatuses, statusFilter, searchQuery]);

  // Contadores
  const statusCounts = useMemo(() => {
    const counts = { all: recentStatuses.length, Lendo: 0, Concluido: 0, 'Não iniciado': 0 };
    for (const s of recentStatuses) {
      if (s.status in counts) {
        counts[s.status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [recentStatuses]);

  // Calcular a percentagem de leitura para cada status
  const getReadPercentage = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    if (!book || book.totalPaginas === 0) return 0;
    return Math.min(100, (status.quantidadeLida / book.totalPaginas) * 100);
  };

  // Obter projeção de conclusão
  const getProjection = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    if (!book) return null;
    return calculateReadingProjection(book, status, readings);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">Dashboard</h2>
          <p className="text-sm md:text-base text-muted-foreground">Visão geral do seu progresso de leitura</p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="card-library-elevated p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">Progresso Total</h3>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {stats.paginasLidas.toLocaleString()} de {stats.totalPaginas.toLocaleString()} páginas
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-3xl md:text-4xl font-display font-bold text-primary">
              {stats.percentualLido.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${Math.min(stats.percentualLido, 100)}%` }}
          />
        </div>
        
        <p className="text-xs md:text-sm text-muted-foreground mt-3 md:mt-4">
          Faltam <span className="font-semibold text-foreground">{stats.paginasFaltantes.toLocaleString()}</span> páginas para completar todos os livros
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
        <button
          onClick={() => onNavigateToBooks?.('all')}
          className="stat-card text-left hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Library className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Livros Cadastrados</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.livrosCadastrados}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigateToBooks?.('reading')}
          className="stat-card text-left hover:ring-2 hover:ring-reading/20 transition-all cursor-pointer"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-reading/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-reading" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Lendo Atualmente</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.livrosLendo}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigateToBooks?.('completed')}
          className="stat-card text-left hover:ring-2 hover:ring-success/20 transition-all cursor-pointer"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <BookCheck className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Concluídos</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.livrosConcluidos}</p>
            </div>
          </div>
        </button>

        <div className="stat-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Dias de Leitura</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.diasLeitura}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Média por Dia</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                {stats.mediaPaginasDia.toFixed(1)} <span className="text-xs sm:text-sm font-normal text-muted-foreground">pág</span>
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total de Páginas</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.totalPaginas.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Status with Filters */}
      <div className="card-library p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-lg md:text-xl font-semibold text-foreground">Status dos Livros</h3>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Campo de Busca */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-32 text-xs"
              />
            </div>

            {/* Filtros de Status */}
            <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
              <Button
                variant={statusFilter === 'Lendo' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter('Lendo')}
              >
                Lendo ({statusCounts.Lendo})
              </Button>
              <Button
                variant={statusFilter === 'Concluido' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter('Concluido')}
              >
                Concluídos ({statusCounts.Concluido})
              </Button>
              <Button
                variant={statusFilter === 'Não iniciado' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter('Não iniciado')}
              >
                Não iniciado ({statusCounts['Não iniciado']})
              </Button>
              <Button
                variant={statusFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter('all')}
              >
                Todos
              </Button>
            </div>
          </div>
        </div>

        {filteredStatuses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm md:text-base">
            {searchQuery.trim() 
              ? `Nenhum livro encontrado para "${searchQuery}"`
              : recentStatuses.length === 0
                ? 'Nenhum livro cadastrado ainda. Comece cadastrando o seu primeiro livro!'
                : `Nenhum livro com status "${statusFilter}".`
            }
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[700px] md:min-w-0 px-4 md:px-0">
              <table className="table-library w-full">
                <thead>
                  <tr>
                    <th className="text-xs md:text-sm">Nº</th>
                    <th className="text-xs md:text-sm">Miniatura</th>
                    <th className="text-xs md:text-sm">Livro</th>
                    <th className="text-xs md:text-sm">Status</th>
                    <th className="text-xs md:text-sm">Lido</th>
                    {statusFilter === 'Lendo' && <th className="text-xs md:text-sm">Previsão</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredStatuses.map((status) => {
                    const book = books.find(b => b.id === status.livroId);
                    const projection = getProjection(status);
                    
                    return (
                      <tr key={status.id}>
                        <td className="font-medium text-sm">{status.numero}</td>
                        <td>
                          <div className="w-8 h-11 sm:w-10 sm:h-14 md:w-12 md:h-16 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                            {book?.coverUrl ? (
                              <img
                                src={book.coverUrl}
                                alt={`Capa de ${status.livro}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[6px] sm:text-[8px] md:text-[10px] text-muted-foreground text-center">Sem capa</span>
                            )}
                          </div>
                        </td>
                        <td className="uppercase font-medium text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{status.livro}</td>
                        <td>
                          <span className={`status-badge text-xs ${
                            status.status === 'Não iniciado' ? 'status-not-started' :
                            status.status === 'Lendo' ? 'status-reading' :
                            'status-completed'
                          }`}>
                            {status.status}
                          </span>
                        </td>
                        <td className="text-sm">{getReadPercentage(status).toFixed(0)}%</td>
                        {statusFilter === 'Lendo' && (
                          <td className="text-xs">
                            {projection?.canShow && projection.estimatedDate ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-primary" />
                                      <span className="font-medium">{formatProjectedDateCompact(projection.estimatedDate)}</span>
                                      {projection.isDelayed && (
                                        <AlertCircle className="w-3 h-3 text-amber-500" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <p>Ritmo: {projection.pagesPerDay} págs/dia</p>
                                      <p>Dias restantes: {projection.daysRemaining}</p>
                                      {projection.isDelayed && (
                                        <p className="text-amber-500">Atrasado em {projection.delayDays} dia(s)</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : projection?.readingDays !== undefined && projection.readingDays < 3 ? (
                              <span className="text-muted-foreground italic">3+ dias necessários</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
