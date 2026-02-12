import { useState, forwardRef, useMemo } from 'react';
import { Edit2, Trash2, BookOpen, ChevronDown, ChevronRight, Filter, Star, Clock, Calendar, CheckCircle, AlertCircle, Search, History } from 'lucide-react';
import type { Book, BookStatus, DailyReading, BookEvaluation, Quote, VocabularyEntry, Note } from '@/types/library';
import { BookEditDialog } from './BookEditDialog';
import { BookTimelineDialog } from './BookTimelineDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateReadingProjection, formatProjectedDateCompact } from '@/lib/readingProjections';
import { useIsMobile } from '@/hooks/use-mobile';

interface BooksListViewProps {
  books: Book[];
  statuses: BookStatus[];
  readings: DailyReading[];
  evaluations: BookEvaluation[];
  quotes?: Quote[];
  vocabulary?: VocabularyEntry[];
  notes?: Note[];
  onDeleteBook: (id: string) => void;
  onUpdateBook: (book: Book) => void;
  initialFilter?: 'all' | 'reading' | 'completed';
  onNavigateToNotes?: () => void;
}

export const BooksListView = forwardRef<HTMLDivElement, BooksListViewProps>(function BooksListView({ books, statuses, readings, evaluations, quotes = [], vocabulary = [], notes = [], onDeleteBook, onUpdateBook, initialFilter = 'all', onNavigateToNotes }, ref) {
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [mobileInfoBook, setMobileInfoBook] = useState<Book | null>(null);
  const [timelineBook, setTimelineBook] = useState<Book | null>(null);
  const isMobile = useIsMobile();
  // Inicia DESAGRUPADO por padrão
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'reading' | 'completed'>(initialFilter);
  const [expandedCategories, setExpandedCategories] = useState<Set<string> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getBookStatus = (bookId: string) => {
    return statuses.find(s => s.livroId === bookId);
  };

  const getBookEvaluation = (bookId: string) => {
    return evaluations.find(e => e.livroId === bookId);
  };

  const getReadingProjection = (book: Book, status: BookStatus | undefined) => {
    return calculateReadingProjection(book, status, readings);
  };

  const getReadingTimeMinutes = (book: Book, status: BookStatus | undefined): number | null => {
    if (!status) return null;
    const pagesRemaining = book.totalPaginas - status.quantidadeLida;
    if (pagesRemaining <= 0) return null;
    
    // Usar projeção dinâmica
    const projection = getReadingProjection(book, status);
    if (projection.canShow && projection.pagesPerDay > 0) {
      // Calcular minutos baseado no ritmo real
      const daysRemaining = projection.daysRemaining;
      // Estimar 30 min/dia como média
      return daysRemaining * 30;
    }
    
    // Fallback para livros sem histórico suficiente
    return Math.round(pagesRemaining * 2);
  };

  const formatTimeEstimate = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatCompletionDate = (date: Date): string => {
    return formatProjectedDateCompact(date);
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
    let result = books;
    
    // Filtro por status
    if (statusFilter !== 'all') {
      result = result.filter(book => {
        const status = getBookStatus(book.id);
        if (statusFilter === 'reading') return status?.status === 'Lendo';
        if (statusFilter === 'completed') return status?.status === 'Concluido';
        return true;
      });
    }
    
    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(book => book.livro.toLowerCase().includes(query));
    }
    
    return result;
  }, [books, statuses, statusFilter, searchQuery]);

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
    const projection = getReadingProjection(book, status);
    const totalMinutes = getReadingTimeMinutes(book, status);
    const statusInfo = getStatusInfo(book, status);
    const isCompleted = status?.status === 'Concluido';

    return (
      <HoverCard key={book.id} openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div
            className="card-library overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col cursor-pointer group"
            onClick={() => isMobile ? setMobileInfoBook(book) : setEditingBook(book)}
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
                    {projection.canShow && projection.estimatedDate && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatCompletionDate(projection.estimatedDate)}</span>
                        {projection.isDelayed && (
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                        )}
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
            {!isCompleted && projection.canShow && (
              <div className="pt-2 border-t space-y-1">
                {totalMinutes && (
                  <div className={`flex items-center gap-2 text-sm font-medium ${statusInfo.colorClass}`}>
                    <Clock className="w-4 h-4" />
                    <span>Tempo restante: {formatTimeEstimate(totalMinutes)}</span>
                  </div>
                )}
                {projection.estimatedDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Previsão: {formatCompletionDate(projection.estimatedDate)}</span>
                    {projection.isDelayed && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Atrasado em {projection.delayDays} dia(s)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Ritmo: {projection.pagesPerDay} págs/dia • {projection.daysRemaining} dias restantes
                </p>
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

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs h-7" onClick={(e) => { e.stopPropagation(); setTimelineBook(book); }}>
                <History className="w-3 h-3" /> Timeline
              </Button>
            </div>

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

        <div className="flex flex-wrap gap-2 items-center">
          {/* Campo de Busca */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-7 w-32 text-xs"
            />
          </div>

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

      {/* Mobile Info Dialog */}
      {mobileInfoBook && (() => {
        const s = getBookStatus(mobileInfoBook.id);
        const ev = getBookEvaluation(mobileInfoBook.id);
        const proj = getReadingProjection(mobileInfoBook, s);
        const tm = getReadingTimeMinutes(mobileInfoBook, s);
        const si = getStatusInfo(mobileInfoBook, s);
        const completed = s?.status === 'Concluido';
        return (
          <Dialog open={!!mobileInfoBook} onOpenChange={() => setMobileInfoBook(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base leading-tight">{mobileInfoBook.livro}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {mobileInfoBook.autor && <p className="text-sm text-muted-foreground">{mobileInfoBook.autor}</p>}
                {ev && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{ev.notaFinal.toFixed(1)}</span>
                    <div className="flex">{[1,2,3,4,5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= Math.round(ev.notaFinal / 2) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                    ))}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {mobileInfoBook.ano && <div><span className="font-medium text-foreground">Ano:</span> {mobileInfoBook.ano}</div>}
                  <div><span className="font-medium text-foreground">Tipo:</span> {mobileInfoBook.tipo}</div>
                  {mobileInfoBook.categoria && <div className="col-span-2"><span className="font-medium text-foreground">Categoria:</span> {mobileInfoBook.categoria}</div>}
                  <div><span className="font-medium text-foreground">Páginas:</span> {mobileInfoBook.totalPaginas}</div>
                  {s && <div><span className="font-medium text-foreground">Lidas:</span> {s.quantidadeLida}</div>}
                </div>
                {!completed && proj.canShow && (
                  <div className="pt-2 border-t space-y-1">
                    {tm && <div className={`flex items-center gap-2 text-sm font-medium ${si.colorClass}`}><Clock className="w-4 h-4" /><span>Tempo restante: {formatTimeEstimate(tm)}</span></div>}
                    {proj.estimatedDate && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4" /><span>Previsão: {formatCompletionDate(proj.estimatedDate)}</span></div>}
                    <p className="text-[10px] text-muted-foreground">Ritmo: {proj.pagesPerDay} págs/dia • {proj.daysRemaining} dias restantes</p>
                  </div>
                )}
                {completed && <div className="flex items-center gap-2 text-sm font-medium text-green-600 pt-2 border-t"><CheckCircle className="w-4 h-4" /><span>Leitura concluída!</span></div>}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1 gap-1.5" onClick={() => { setMobileInfoBook(null); setEditingBook(mobileInfoBook); }}>
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => { setMobileInfoBook(null); setTimelineBook(mobileInfoBook); }}>
                    <History className="w-3.5 h-3.5" /> Timeline
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Timeline Dialog */}
      <BookTimelineDialog
        book={timelineBook}
        isOpen={!!timelineBook}
        onClose={() => setTimelineBook(null)}
        readings={readings}
        statuses={statuses}
        evaluations={evaluations}
        quotes={quotes}
        vocabulary={vocabulary}
        notes={notes}
        onNavigateToNotes={onNavigateToNotes}
      />
    </div>
  );
});
