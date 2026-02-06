import { useState, useMemo } from 'react';
import { Trash2, Edit2, BarChart3, Search, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import type { BookStatus, Book, DailyReading, BookEvaluation, Quote, VocabularyEntry } from '@/types/library';
import { BookEditDialog } from './BookEditDialog';
import { BookMetricsDialog } from './BookMetricsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateReadingProjection, formatProjectedDateCompact } from '@/lib/readingProjections';

interface StatusViewProps {
  statuses: BookStatus[];
  books: Book[];
  readings: DailyReading[];
  evaluations: BookEvaluation[];
  quotes: Quote[];
  vocabulary: VocabularyEntry[];
  onDeleteBook: (id: string) => void;
  onUpdateBook: (book: Book) => void;
  onUpdateReading?: (reading: DailyReading) => void;
}

type StatusFilter = 'all' | 'Lendo' | 'Concluido' | 'Não iniciado';

export function StatusView({ statuses, books, readings, evaluations, quotes, vocabulary, onDeleteBook, onUpdateBook, onUpdateReading }: StatusViewProps) {
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  // Filtro padrão: "Lendo"
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Lendo');
  const [searchQuery, setSearchQuery] = useState('');

  const getBookProgress = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    if (!book) return 0;
    return (status.quantidadeLida / book.totalPaginas) * 100;
  };

  const getBookTotal = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    return book?.totalPaginas || 0;
  };

  const handleEditClick = (livroId: string) => {
    const book = books.find(b => b.id === livroId);
    if (book) {
      setEditingBook(book);
    }
  };

  const handleViewMetrics = (livroId: string) => {
    const book = books.find(b => b.id === livroId);
    if (book) {
      setViewingBook(book);
    }
  };

  const getBookStatus = (bookId: string) => {
    return statuses.find(s => s.livroId === bookId) || null;
  };

  const getBookEvaluation = (bookId: string) => {
    return evaluations.find(e => e.livroId === bookId) || null;
  };

  // Aplicar filtros
  const filteredStatuses = useMemo(() => {
    let result = [...statuses];

    // Filtro por status
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }

    // Filtro por busca (nome do livro)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(s => s.livro.toLowerCase().includes(query));
    }

    return result;
  }, [statuses, statusFilter, searchQuery]);

  // Contadores por status
  const statusCounts = useMemo(() => {
    const counts = { all: statuses.length, Lendo: 0, Concluido: 0, 'Não iniciado': 0 };
    for (const s of statuses) {
      if (s.status in counts) {
        counts[s.status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [statuses]);

  // Calcular projeção para um livro
  const getProjection = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    if (!book) return null;
    return calculateReadingProjection(book, status, readings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">Status dos Livros</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Clique num livro para visualizar métricas detalhadas</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Filtro por Status */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg flex-shrink-0">
          <Button
            variant={statusFilter === 'Lendo' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setStatusFilter('Lendo')}
          >
            Lendo ({statusCounts.Lendo})
          </Button>
          <Button
            variant={statusFilter === 'Concluido' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setStatusFilter('Concluido')}
          >
            Concluídos ({statusCounts.Concluido})
          </Button>
          <Button
            variant={statusFilter === 'Não iniciado' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setStatusFilter('Não iniciado')}
          >
            Não iniciado ({statusCounts['Não iniciado']})
          </Button>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setStatusFilter('all')}
          >
            Todos ({statusCounts.all})
          </Button>
        </div>

        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar livro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      <div className="card-library p-3 sm:p-4 lg:p-6">
        <div className="overflow-x-auto">
          <table className="table-library">
            <thead>
              <tr>
                <th className="hidden sm:table-cell">Nº</th>
                <th className="hidden md:table-cell">Miniatura</th>
                <th>Livro</th>
                <th className="hidden sm:table-cell">Status</th>
                <th>Progresso</th>
                <th className="hidden lg:table-cell">Quantidade Lida</th>
                {statusFilter === 'Lendo' && <th className="hidden xl:table-cell">Previsão</th>}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredStatuses.map((status) => {
                const progress = getBookProgress(status);
                const total = getBookTotal(status);
                const book = books.find(b => b.id === status.livroId);
                const projection = getProjection(status);
                
                return (
                  <tr 
                    key={status.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleViewMetrics(status.livroId)}
                  >
                    <td className="font-medium hidden sm:table-cell">{status.numero}</td>
                    <td className="hidden md:table-cell">
                      <div className="w-10 h-14 lg:w-12 lg:h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
                        {book?.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={`Capa de ${status.livro}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[8px] lg:text-[10px] text-muted-foreground text-center">Sem capa</span>
                        )}
                      </div>
                    </td>
                    <td className="font-medium">
                      <div className="flex flex-col">
                        <span className="uppercase text-xs sm:text-sm lg:text-base line-clamp-2">{status.livro}</span>
                        {book && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {book.categoria} • {book.tipo}
                          </span>
                        )}
                        {/* Mobile: show status inline */}
                        <span className={`sm:hidden mt-1 text-[10px] px-1.5 py-0.5 rounded-full w-fit ${
                          status.status === 'Não iniciado' ? 'bg-muted text-muted-foreground' :
                          status.status === 'Lendo' ? 'bg-reading/20 text-reading' :
                          'bg-success/20 text-success'
                        }`}>
                          {status.status}
                        </span>
                        {/* Mobile: show projection */}
                        {projection?.canShow && projection.estimatedDate && (
                          <div className="xl:hidden mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatProjectedDateCompact(projection.estimatedDate)}</span>
                            {projection.isDelayed && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="w-3 h-3 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Atrasado em {projection.delayDays} dia(s)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className={`status-badge text-xs lg:text-sm ${
                        status.status === 'Não iniciado' ? 'status-not-started' :
                        status.status === 'Lendo' ? 'status-reading' :
                        'status-completed'
                      }`}>
                        {status.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 min-w-[80px] sm:min-w-[120px] lg:min-w-[150px]">
                        <div className="progress-bar-container flex-1 h-1.5 sm:h-2">
                          <div 
                            className="progress-bar-fill" 
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className="font-medium">{status.quantidadeLida}</span>
                      <span className="text-muted-foreground"> / {total} pág</span>
                    </td>
                    {statusFilter === 'Lendo' && (
                      <td className="hidden xl:table-cell">
                        {projection?.canShow && projection.estimatedDate ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-xs font-medium">
                                      <Calendar className="w-3 h-3 text-primary" />
                                      <span>{formatProjectedDateCompact(projection.estimatedDate)}</span>
                                      {projection.isDelayed && (
                                        <AlertCircle className="w-3 h-3 text-amber-500" />
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      {projection.pagesPerDay} págs/dia • {projection.daysRemaining} dias
                                    </span>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[200px]">
                                <div className="space-y-1 text-xs">
                                  <p className="font-semibold">Projeção de Conclusão</p>
                                  <p>Ritmo: {projection.pagesPerDay} páginas/dia</p>
                                  <p>Dias de leitura: {projection.readingDays}</p>
                                  <p>Dias restantes: {projection.daysRemaining}</p>
                                  {projection.isDelayed && (
                                    <p className="text-amber-500">⚠️ Atrasado em {projection.delayDays} dia(s)</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : projection?.readingDays !== undefined && projection.readingDays < 3 ? (
                          <span className="text-[10px] text-muted-foreground italic">
                            Precisa de 3+ dias de leitura
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-0.5 sm:gap-1">
                        <button
                          onClick={() => handleViewMetrics(status.livroId)}
                          className="p-1.5 sm:p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Ver métricas"
                        >
                          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(status.livroId)}
                          className="p-1.5 sm:p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Editar livro"
                        >
                          <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover "${status.livro}"?`)) {
                              onDeleteBook(status.livroId);
                            }
                          }}
                          className="p-1.5 sm:p-2 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover livro"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStatuses.length === 0 && (
                <tr>
                  <td colSpan={statusFilter === 'Lendo' ? 8 : 7} className="text-center text-muted-foreground py-8">
                    {searchQuery.trim() 
                      ? `Nenhum livro encontrado para "${searchQuery}"`
                      : statusFilter === 'all'
                        ? 'Nenhum livro cadastrado ainda.'
                        : `Nenhum livro com status "${statusFilter}".`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BookEditDialog
        book={editingBook}
        isOpen={!!editingBook}
        onClose={() => setEditingBook(null)}
        onSave={onUpdateBook}
        onDelete={onDeleteBook}
      />

      <BookMetricsDialog
        book={viewingBook}
        status={viewingBook ? getBookStatus(viewingBook.id) : null}
        readings={readings}
        evaluation={viewingBook ? getBookEvaluation(viewingBook.id) : null}
        quotes={quotes}
        vocabulary={vocabulary}
        isOpen={!!viewingBook}
        onClose={() => setViewingBook(null)}
        onUpdateReading={onUpdateReading}
      />
    </div>
  );
}
