import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { VocabularyDialog } from '@/components/VocabularyDialog';
import { ReadingHistoryDialog } from '@/components/ReadingHistoryDialog';
import { QuotesListDialog } from '@/components/QuotesListDialog';
import { BookOpen, Clock, Calendar, TrendingUp, Star, Quote, MessageSquare, Book, Pencil } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Book as BookType, BookStatus, DailyReading, BookEvaluation, Quote as QuoteType, VocabularyWord } from '@/types/library';

interface BookMetricsDialogProps {
  book: BookType | null;
  status: BookStatus | null;
  readings: DailyReading[];
  evaluation: BookEvaluation | null;
  quotes: QuoteType[];
  vocabulary: VocabularyWord[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateReading?: (reading: DailyReading) => void;
}

export function BookMetricsDialog({ 
  book, 
  status, 
  readings, 
  evaluation, 
  quotes,
  vocabulary,
  isOpen, 
  onClose,
  onUpdateReading,
}: BookMetricsDialogProps) {
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
  const [isVocabDialogOpen, setIsVocabDialogOpen] = useState(false);
  const [editingReading, setEditingReading] = useState<DailyReading | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBibleBookForQuotes, setSelectedBibleBookForQuotes] = useState<string | null>(null);
  const [isQuotesDialogOpen, setIsQuotesDialogOpen] = useState(false);

  const bookReadings = book ? readings.filter(r => r.livroId === book.id) : [];
  const bookQuotes = book ? quotes.filter(q => q.livroId === book.id) : [];
  const bookVocabulary = book ? vocabulary.filter(v => v.bookId === book.id) : [];

  // Group quotes by Bible book for the button display
  const quotesByBibleBook = useMemo(() => {
    const groups: Record<string, QuoteType[]> = {};
    for (const quote of bookQuotes) {
      const key = quote.bibleBook || 'Outras';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(quote);
    }
    return groups;
  }, [bookQuotes]);

  const quotesForSelectedBibleBook = useMemo(() => {
    if (!selectedBibleBookForQuotes) return [];
    return quotesByBibleBook[selectedBibleBookForQuotes] || [];
  }, [quotesByBibleBook, selectedBibleBookForQuotes]);

  if (!book || !status) return null;

  const handleBibleBookQuotesClick = (bibleBook: string) => {
    setSelectedBibleBookForQuotes(bibleBook);
    setIsQuotesDialogOpen(true);
  };

  const handleWordClick = (word: VocabularyWord) => {
    setSelectedWord(word);
    setIsVocabDialogOpen(true);
  };

  const handleEditReading = (reading: DailyReading) => {
    setEditingReading(reading);
    setIsEditDialogOpen(true);
  };

  const handleSaveReading = (updatedReading: DailyReading) => {
    if (onUpdateReading) {
      onUpdateReading(updatedReading);
    }
    setIsEditDialogOpen(false);
    setEditingReading(null);
  };

  const mapWordToEntry = (word: VocabularyWord) => ({
    id: word.id,
    palavra: word.palavra,
    silabas: word.silabas || null,
    fonetica: word.fonetica || null,
    classe: word.classe || null,
    definicoes: word.definicoes || [],
    sinonimos: word.sinonimos || [],
    antonimos: word.antonimos || [],
    exemplos: word.exemplos || [],
    etimologia: word.etimologia || null,
    observacoes: word.observacoes || null,
    analise_contexto: word.analise_contexto || null,
    created_at: word.createdAt,
    book_id: word.bookId,
    source_type: word.source_type,
    source_details: word.source_details,
  });
  
  const totalPagesRead = bookReadings.length > 0 
    ? Math.max(...bookReadings.map(r => r.paginaFinal)) 
    : status.quantidadeLida;

  const progress = (totalPagesRead / book.totalPaginas) * 100;
  
  // Now tempoGasto is in SECONDS
  // For Bible readings, we need to group by day and take max time per day (not sum)
  // For period-generated entries, tempoGasto already represents time PER DAY, so we just sum
  const calculateTotalTimeSeconds = () => {
    const isBible = book?.categoria?.toLowerCase() === 'bíblia' || 
                    book?.categoria?.toLowerCase() === 'biblia';
    
    if (isBible) {
      // Group by day and take max time per day
      const timeByDay: Record<string, number> = {};
      for (const reading of bookReadings) {
        const dateKey = `${reading.dia}/${reading.mes}`;
        const currentMax = timeByDay[dateKey] || 0;
        // Para entradas bíblicas, tempoGasto já é o tempo daquela sessão específica
        timeByDay[dateKey] = Math.max(currentMax, reading.tempoGasto);
      }
      return Object.values(timeByDay).reduce((sum, time) => sum + time, 0);
    }
    
    // For non-Bible books, check if entries are from period generation
    // If entry has start_date == end_date, it's a period-generated entry, tempoGasto is already per-day
    let totalSeconds = 0;
    for (const reading of bookReadings) {
      // Para entradas geradas por período (start_date == end_date), tempoGasto já é o tempo daquele dia
      // Para entradas normais com período, NÃO multiplicar - o tempo já está distribuído
      totalSeconds += reading.tempoGasto;
    }
    return totalSeconds;
  };
  
  const totalTimeSeconds = calculateTotalTimeSeconds();
  
  const calculateReadingDays = () => {
    const isBible = book?.categoria?.toLowerCase() === 'bíblia' || 
                    book?.categoria?.toLowerCase() === 'biblia';
    
    if (isBible) {
      // Count unique days for Bible readings
      const uniqueDays = new Set<string>();
      for (const reading of bookReadings) {
        const dateKey = `${reading.dia}/${reading.mes}`;
        uniqueDays.add(dateKey);
      }
      return uniqueDays.size;
    }
    
    // For non-Bible books, each reading entry is already a unique day
    // (period entries are now split into individual days)
    return bookReadings.length;
  };
  
  const readingDays = calculateReadingDays();
  const avgPagesPerDay = readingDays > 0 ? totalPagesRead / readingDays : 0;
  const pagesPerMinute = totalTimeSeconds > 0 ? totalPagesRead / (totalTimeSeconds / 60) : 0;

  // Format seconds to display (e.g., "9h 16min 11s")
  const formatTimeFromSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    
    if (hours > 0) {
      return secs > 0 ? `${hours}h ${mins}min ${secs}s` : (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`);
    }
    if (secs > 0) {
      return `${mins}min ${secs}s`;
    }
    return `${mins}min`;
  };

  const formatReadingDate = (reading: DailyReading) => {
    // Para entradas geradas por período, start_date == end_date, então mostra apenas a data
    if (reading.dataInicio && reading.dataFim) {
      const inicio = format(new Date(reading.dataInicio), "dd/MM", { locale: ptBR });
      const fim = format(new Date(reading.dataFim), "dd/MM/yyyy", { locale: ptBR });
      const isSameDay = inicio === format(new Date(reading.dataFim), "dd/MM", { locale: ptBR });
      if (isSameDay) {
        return fim;
      }
      const dias = differenceInDays(new Date(reading.dataFim), new Date(reading.dataInicio)) + 1;
      return `${inicio} a ${fim} (${dias} dias)`;
    }
    return `${reading.dia}/${reading.mes}`;
  };

  // Format seconds for reading history display (MM:SS format)
  const formatReadingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (secs > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins} min`;
  };

  // Group readings by day for consolidated display
  const groupReadingsByDay = (readings: DailyReading[], isBible: boolean) => {
    if (!isBible) {
      // For non-Bible books, keep original behavior (no grouping)
      return [...readings].reverse().map(reading => ({
        key: reading.id,
        displayDate: formatReadingDate(reading),
        paginaInicial: reading.paginaInicial,
        paginaFinal: reading.paginaFinal,
        quantidadePaginas: reading.quantidadePaginas,
        tempoGasto: reading.tempoGasto,
        bibleEntries: reading.bibleBook ? [{
          bibleBook: reading.bibleBook,
          bibleChapter: reading.bibleChapter,
          bibleVerseStart: reading.bibleVerseStart,
          bibleVerseEnd: reading.bibleVerseEnd,
        }] : [],
        readings: [reading],
      }));
    }

    // Group by date key (dia/mes)
    const groups: Record<string, {
      key: string;
      displayDate: string;
      paginaInicial: number;
      paginaFinal: number;
      quantidadePaginas: number;
      tempoGasto: number;
      bibleEntries: Array<{
        bibleBook?: string;
        bibleChapter?: number;
        bibleVerseStart?: number;
        bibleVerseEnd?: number;
      }>;
      readings: DailyReading[];
    }> = {};

    for (const reading of readings) {
      const dateKey = `${reading.dia}/${reading.mes}`;
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          key: dateKey,
          displayDate: formatReadingDate(reading),
          paginaInicial: reading.paginaInicial,
          paginaFinal: reading.paginaFinal,
          quantidadePaginas: reading.quantidadePaginas,
          tempoGasto: reading.tempoGasto,
          bibleEntries: [],
          readings: [],
        };
      } else {
        // Merge data
        groups[dateKey].paginaInicial = Math.min(groups[dateKey].paginaInicial, reading.paginaInicial);
        groups[dateKey].paginaFinal = Math.max(groups[dateKey].paginaFinal, reading.paginaFinal);
        groups[dateKey].quantidadePaginas += reading.quantidadePaginas;
        // For time, use the maximum (only one reading per day should have time set)
        groups[dateKey].tempoGasto = Math.max(groups[dateKey].tempoGasto, reading.tempoGasto);
      }

      groups[dateKey].readings.push(reading);

      if (reading.bibleBook) {
        groups[dateKey].bibleEntries.push({
          bibleBook: reading.bibleBook,
          bibleChapter: reading.bibleChapter,
          bibleVerseStart: reading.bibleVerseStart,
          bibleVerseEnd: reading.bibleVerseEnd,
        });
      }
    }

    // Sort by date descending
    return Object.values(groups).sort((a, b) => {
      const [dayA, monthA] = a.key.split('/');
      const [dayB, monthB] = b.key.split('/');
      if (monthA !== monthB) return monthB.localeCompare(monthA);
      return parseInt(dayB) - parseInt(dayA);
    });
  };

  const isBibleCategory = book.categoria?.toLowerCase() === 'bíblia' || 
                          book.categoria?.toLowerCase() === 'biblia';

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-4">
            {book.coverUrl && (
              <img 
                src={book.coverUrl} 
                alt={book.livro}
                className="w-16 h-24 object-cover rounded shadow-md"
              />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold uppercase">{book.livro}</h2>
              {book.autor && <p className="text-sm text-muted-foreground">{book.autor}</p>}
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-muted rounded">{book.categoria}</span>
                <span className="text-xs px-2 py-1 bg-muted rounded">{book.tipo}</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="card-library p-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
              Progresso de Leitura
            </h3>
            <div className="flex items-center justify-between mb-2">
              <span className={`status-badge ${
                status.status === 'Não iniciado' ? 'status-not-started' :
                status.status === 'Lendo' ? 'status-reading' :
                'status-completed'
              }`}>
                {status.status}
              </span>
              <span className="text-2xl font-bold">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-3 mb-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{totalPagesRead} páginas lidas</span>
              <span>{book.totalPaginas - totalPagesRead} páginas restantes</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card-library p-4 text-center">
              <BookOpen className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalPagesRead}</p>
              <p className="text-xs text-muted-foreground">Páginas Lidas</p>
            </div>
            
            <div className="card-library p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{formatTimeFromSeconds(totalTimeSeconds)}</p>
              <p className="text-xs text-muted-foreground">Tempo Total</p>
            </div>
            
            <div className="card-library p-4 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{readingDays}</p>
              <p className="text-xs text-muted-foreground">Dias de Leitura</p>
            </div>
            
            <div className="card-library p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{avgPagesPerDay.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Págs/Dia</p>
            </div>
            
            <div className="card-library p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{formatTimeFromSeconds(totalTimeSeconds / (readingDays || 1))}</p>
              <p className="text-xs text-muted-foreground">Tempo/Dia</p>
            </div>
            
            <div className="card-library p-4 text-center">
              <BookOpen className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{pagesPerMinute.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Págs/Min</p>
            </div>
          </div>

          {evaluation && (
            <div className="card-library p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4" />
                Avaliação
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Criatividade', value: evaluation.criatividade },
                  { label: 'Escrita', value: evaluation.escrita },
                  { label: 'Aprendizados', value: evaluation.aprendizados },
                  { label: 'Prazer', value: evaluation.prazer },
                  { label: 'Impacto', value: evaluation.impacto },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <span className="font-bold text-primary">{item.value}/10</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="font-semibold">Nota Final</span>
                <span className="text-2xl font-bold text-primary">{evaluation.notaFinal.toFixed(1)}</span>
              </div>
              {evaluation.observacoes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Observações:
                  </p>
                  <p className="text-sm text-foreground italic">"{evaluation.observacoes}"</p>
                </div>
              )}
            </div>
          )}

          {bookQuotes.length > 0 && (
            <div className="card-library p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                <Quote className="w-4 h-4" />
                Citações ({bookQuotes.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(quotesByBibleBook).map(([bibleBook, quotesGroup]) => (
                  <button
                    key={bibleBook}
                    onClick={() => handleBibleBookQuotesClick(bibleBook)}
                    className="px-3 py-1.5 bg-muted/50 rounded-lg border border-border hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer text-left"
                  >
                    <p className="text-sm font-medium">{bibleBook}</p>
                    <p className="text-[10px] text-muted-foreground">{quotesGroup.length} citação(ões)</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {bookVocabulary.length > 0 && (
            <div className="card-library p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                <Book className="w-4 h-4" />
                Palavras Pesquisadas ({bookVocabulary.length})
              </h3>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {bookVocabulary.map((word) => (
                  <button
                    key={word.id}
                    onClick={() => handleWordClick(word)}
                    className="px-3 py-1.5 bg-muted/50 rounded-lg border border-border hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer text-left"
                  >
                    <p className="text-sm font-medium">{word.palavra}</p>
                    {word.classe && (
                      <p className="text-[10px] text-muted-foreground">{word.classe}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {bookReadings.length > 0 && (
            <div className="card-library p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                Histórico de Leituras ({groupReadingsByDay(bookReadings, isBibleCategory).length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {groupReadingsByDay(bookReadings, isBibleCategory).map((group) => (
                  <div 
                    key={group.key} 
                    className="flex flex-col text-sm py-2 border-b border-border last:border-0 gap-1 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium whitespace-nowrap">{group.displayDate}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="whitespace-nowrap text-xs">
                          {group.paginaInicial} → {group.paginaFinal}
                        </span>
                        <span className="whitespace-nowrap text-xs">{group.quantidadePaginas}p</span>
                        <span className="whitespace-nowrap text-xs">{formatReadingTime(group.tempoGasto)}</span>
                        {onUpdateReading && (
                          <button
                            onClick={() => handleEditReading(group.readings[0])}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary/80"
                            title="Editar leitura"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {isBibleCategory && group.bibleEntries.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {group.bibleEntries.map((entry, idx) => (
                          <span key={idx} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {entry.bibleBook} {entry.bibleChapter}
                            {entry.bibleVerseStart && `:${entry.bibleVerseStart}`}
                            {entry.bibleVerseEnd && entry.bibleVerseEnd !== entry.bibleVerseStart && `-${entry.bibleVerseEnd}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-library p-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
              Informações do Livro
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de Páginas</span>
                <span className="font-medium">{book.totalPaginas}</span>
              </div>
              {book.ano && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ano</span>
                  <span className="font-medium">{book.ano}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <VocabularyDialog
          entry={selectedWord ? mapWordToEntry(selectedWord) : null}
          isOpen={isVocabDialogOpen}
          onClose={() => {
            setIsVocabDialogOpen(false);
            setSelectedWord(null);
          }}
        />

        <ReadingHistoryDialog
          reading={editingReading}
          book={book}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingReading(null);
          }}
          onSave={handleSaveReading}
        />

        <QuotesListDialog
          isOpen={isQuotesDialogOpen}
          onClose={() => {
            setIsQuotesDialogOpen(false);
            setSelectedBibleBookForQuotes(null);
          }}
          title={selectedBibleBookForQuotes || ''}
          quotes={quotesForSelectedBibleBook}
        />
      </DialogContent>
    </Dialog>
  );
}