import { useState, forwardRef, useMemo } from 'react';
import { Edit2, Trash2, BookOpen, ChevronDown, ChevronRight, Filter, Star, Clock, Calendar, CheckCircle } from 'lucide-react';
import type { Book, BookStatus, DailyReading, BookEvaluation } from '@/types/library';
import { BookEditDialog } from './BookEditDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface BooksListViewProps {
  books: Book[];
  statuses: BookStatus[];
  readings: DailyReading[];
  evaluations: BookEvaluation[];
  onDeleteBook: (id: string) => void;
  onUpdateBook: (book: Book) => void;
  initialFilter?: 'all' | 'reading' | 'completed';
}

export const BooksListView = forwardRef<HTMLDivElement, BooksListViewProps>(function BooksListView({ books, statuses, readings, evaluations, onDeleteBook, onUpdateBook, initialFilter = 'all' }, ref) {
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  // Inicia DESAGRUPADO por padrão
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'reading' | 'completed'>(initialFilter);
  const [expandedCategories, setExpandedCategories] = useState<Set<string> | null>(null);

  const getBookStatus = (bookId: string) => {
    return statuses.find(s => s.livroId === bookId);
  };

  const getBookEvaluation = (bookId: string) => {
    return evaluations.find(e => e.livroId === bookId);
  };

  const getAverageReadingSpeed = (bookId: string): number | null => {
    const bookReadings = readings.filter(r => r.livroId === bookId && r.tempoGasto > 0);
    if (bookReadings.length === 0) return null;
    const totalPages = bookReadings.reduce((sum, r) => sum + r.quantidadePaginas, 0);
    const totalMinutes = bookReadings.reduce((sum, r) => sum + r.tempoGasto, 0);
    if (totalMinutes === 0) return null;
    return totalPages / totalMinutes;
  };

  const getReadingTimeMinutes = (book: Book, status: BookStatus | undefined): number | null => {
    if (!status) return null;
    const pagesRemaining = book.totalPaginas - status.quantidadeLida;
    if (pagesRemaining <= 0) return null;
    const avgSpeed = getAverageReadingSpeed(book.id);
    const minutesPerPage = avgSpeed ? (1 / avgSpeed) : 2;
    return Math.round(pagesRemaining * minutesPerPage);
  };

  const formatTimeEstimate = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getEstimatedCompletionDate = (book: Book, status: BookStatus | undefined): Date | null => {
    if (!status) return null;
    const pagesRemaining = book.totalPaginas - status.quantidadeLida;
    if (pagesRemaining <= 0) return null;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReadings = readings.filter(r => {
      const readDate = new Date(r.mes + '-' + String(r.dia).padStart(2, '0'));
      return r.livroId === book.id && readDate >= thirtyDaysAgo;
    });

    if (recentReadings.length === 0) {
      const daysNeeded = Math.ceil(pagesRemaining / 10);
      const estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + daysNeeded);
      return estimatedDate;
    }

    const totalPagesRead = recentReadings.reduce((sum, r) => sum + r.quantidadePaginas, 0);
    const uniqueDays = new Set(recentReadings.map(r => `${r.mes}-${r.dia}`)).size;
    const avgPagesPerDay = totalPagesRead / uniqueDays;
    const daysNeeded = Math.ceil(pagesRemaining / avgPagesPerDay);

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysNeeded);
    return estimatedDate;
  };

  const formatCompletionDate = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getStatusInfo = (book: Book, status: BookStatus | undefined): { colorClass: string } => {
    if (!status || status.status === 'Não iniciado') {
      return { colorClass: 'text-muted-foreground' };
    }
    if (status.status === 'Concluido') {
      return { colorClass: 'text-green-600' };
    }
    const percentRead = (status.quantidadeLida / book.totalPaginas) * 100;
    if (percentRead > 50) {
      return { colorClass: 'text-orange-500' };
    }
    return { colorClass: 'text-blue-600' };
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const status = getBookStatus(book.id);
      if (statusFilter === 'all') return true;
      if (statusFilter === 'reading') return status?.status === 'Lendo';
      if (statusFilter === 'completed') return status?.status === 'Concluido';
      return true;
    });
  }, [books, statuses, statusFilter]);

  const booksByCategory = useMemo(() => {
    const grouped: Record<string, Book[]> = {};
    filteredBooks.forEach(book => {
      const category = book.categoria || 'Sem categoria';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(book);
    });
    return grouped;
  }, [filteredBooks]);

  const toggleCategory = (category: string) => {
    if (expandedCategories === null) {
      const allCategories = Object.keys(booksByCategory);
      const newExpanded = new Set(allCategories.filter(c => c !== category));
      setExpandedCategories(newExpanded);
    } else {
      const newExpanded = new Set(expandedCategories);
      if (newExpanded.has(category)) {
        newExpanded.delete(category);
      } else {
        newExpanded.add(category);
      }
      setExpandedCategories(newExpanded);
    }
  };

  const renderBookCard = (book: Book) => {
    const status = getBookStatus(book.id);
    const evaluation = getBookEvaluation(book.id);
    const totalMinutes = getReadingTimeMinutes(book, status);
    const completionDate = getEstimatedCompletionDate(book, status);
    const statusInfo = getStatusInfo(book, status);
    const isCompleted = status?.status === 'Concluido';

    return (
      <HoverCard key={book.id} openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div
            className="card-library overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col cursor-pointer group"
            onClick={() => setEditingBook(book)}
          >
            {/* Capa do Livro */}
            <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 relative">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={`Capa de ${book.livro}`}
                  className="w-full h-full object-contain bg-muted"
                />
              ) : (
                <div className="text-muted-foreground text-xs text-center p-2 flex flex-col items-center justify-center h-full bg-gradient-to-b from-muted to-muted/80">
                  <BookOpen className="w-6 h-6 mb-1 opacity-50" />
                  <span className="text-[10px]">Sem capa</span>
                </div>
              )}

              {/* Overlay com ações no hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingBook(book);
                  }}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                  title="Editar livro"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Tem certeza que deseja remover "${book.livro}"?`)) {
                      onDeleteBook(book.id);
                    }
                  }}
                  className="p-2 rounded-full bg-destructive/80 hover:bg-destructive text-white transition-colors"
                  title="Remover livro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Informações Compactas - Apenas avaliação, tempo e data */}
            <div className="p-2 space-y-1 flex-1 flex flex-col min-h-[60px]">
              {/* Badge de Avaliação */}
              {evaluation && (
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                    <span>{evaluation.notaFinal.toFixed(1)}</span>
                    <Star className="w-2.5 h-2.5 fill-current" />
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-2.5 h-2.5 ${star <= Math.round(evaluation.notaFinal / 2) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Status: Tempo + Data ou Concluído */}
              <div className="mt-auto space-y-0.5">
                {isCompleted ? (
                  <div className="flex items-center gap-1 text-[10px] font-medium text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>Concluído</span>
                  </div>
                ) : (
                  <>
                    {totalMinutes && (
                      <div className={`flex items-center gap-1 text-[10px] font-medium ${statusInfo.colorClass}`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeEstimate(totalMinutes)}</span>
                      </div>
                    )}
                    {completionDate && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatCompletionDate(completionDate)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </HoverCardTrigger>

        {/* Popup com informações completas ao passar o mouse */}
        <HoverCardContent side="right" align="start" className="w-72 p-4">
          <div className="space-y-3">
            {/* Título e Autor */}
            <div>
              <h4 className="font-semibold text-foreground leading-tight">{book.livro}</h4>
              {book.autor && (
                <p className="text-sm text-muted-foreground">{book.autor}</p>
              )}
            </div>

            {/* Avaliação */}
            {evaluation && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded text-sm font-semibold">
                  <span>{evaluation.notaFinal.toFixed(1)}</span>
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= Math.round(evaluation.notaFinal / 2) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Detalhes Técnicos */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {book.ano && (
                <div>
                  <span className="font-medium text-foreground">Ano:</span> {book.ano}
                </div>
              )}
              <div>
                <span className="font-medium text-foreground">Tipo:</span> {book.tipo}
              </div>
              {book.categoria && (
                <div className="col-span-2">
                  <span className="font-medium text-foreground">Categoria:</span> {book.categoria}
                </div>
              )}
              <div>
                <span className="font-medium text-foreground">Páginas:</span> {book.totalPaginas}
              </div>
              {status && (
                <div>
                  <span className="font-medium text-foreground">Lidas:</span> {status.quantidadeLida}
                </div>
              )}
            </div>

            {/* Tempo e Data de Conclusão */}
            {!isCompleted && totalMinutes && (
              <div className="pt-2 border-t space-y-1">
                <div className={`flex items-center gap-2 text-sm font-medium ${statusInfo.colorClass}`}>
                  <Clock className="w-4 h-4" />
                  <span>Tempo restante: {formatTimeEstimate(totalMinutes)}</span>
                </div>
                {completionDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Previsão: {formatCompletionDate(completionDate)}</span>
                  </div>
                )}
              </div>
            )}

            {isCompleted && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Leitura concluída!</span>
                </div>
              </div>
            )}

            {/* Dica */}
            <p className="text-[10px] text-muted-foreground italic">
              Clique para editar este livro
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <div ref={ref} className="space-y-4">
      {/* Título da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">Livros Cadastrados</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter('all')}
            >
              Todos ({books.length})
            </Button>
            <Button
              variant={statusFilter === 'reading' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter('reading')}
            >
              Lendo
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter('completed')}
            >
              Concluídos
            </Button>
          </div>

          <Button
            variant={groupByCategory ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setGroupByCategory(!groupByCategory)}
          >
            <Filter className="w-3 h-3 mr-1" />
            Agrupar
          </Button>
        </div>
      </div>

      {/* Lista de Livros */}
      {filteredBooks.length === 0 ? (
        <div className="card-library p-8 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            {books.length === 0
              ? 'Nenhum livro cadastrado ainda.'
              : 'Nenhum livro encontrado com o filtro selecionado.'}
          </p>
        </div>
      ) : groupByCategory ? (
        <div className="space-y-3">
          {Object.entries(booksByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryBooks]) => {
            const isExpanded = expandedCategories === null || expandedCategories.has(category);

            return (
              <div key={category} className="card-library overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <h3 className="font-semibold text-foreground text-sm">{category}</h3>
                    <Badge variant="secondary" className="text-xs">{categoryBooks.length}</Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-3 pt-0">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
                      {categoryBooks.map(renderBookCard)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
          {filteredBooks.map(renderBookCard)}
        </div>
      )}

      {/* Modal de Edição */}
      <BookEditDialog
        book={editingBook}
        isOpen={!!editingBook}
        onClose={() => setEditingBook(null)}
        onSave={onUpdateBook}
        onDelete={onDeleteBook}
      />
    </div>
  );
});
