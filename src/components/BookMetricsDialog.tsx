import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { VocabularyDialog } from '@/components/VocabularyDialog';
import { ReadingHistoryDialog } from '@/components/ReadingHistoryDialog';
import { QuotesListDialog } from '@/components/QuotesListDialog';
import { BookOpen, Clock, Calendar, TrendingUp, Star, Quote, MessageSquare, Book, Pencil } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Book as BookType, BookStatus, DailyReading, BookEvaluation, Quote as QuoteType, VocabularyEntry } from '@/types/library';

interface BookMetricsDialogProps {
  book: BookType | null;
  status: BookStatus | null;
  readings: DailyReading[];
  evaluation: BookEvaluation | null;
  quotes: QuoteType[];
  vocabulary: VocabularyEntry[];
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
  const [selectedWord, setSelectedWord] = useState<VocabularyEntry | null>(null);
  const [isVocabDialogOpen, setIsVocabDialogOpen] = useState(false);
  const [editingReading, setEditingReading] = useState<DailyReading | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBibleBookForQuotes, setSelectedBibleBookForQuotes] = useState<string | null>(null);
  const [isQuotesDialogOpen, setIsQuotesDialogOpen] = useState(false);

  const bookReadings = book ? readings.filter(r => r.livroId === book.id) : [];
  const bookQuotes = book ? quotes.filter(q => q.livroId === book.id) : [];
  const bookVocabulary = book ? vocabulary.filter(v => v.book_id === book.id) : [];

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

  const handleWordClick = (word: VocabularyEntry) => {
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

  
  const totalPagesRead = bookReadings.length > 0 
    ? Math.max(...bookReadings.map(r => r.paginaFinal)) 
    : status.quantidadeLida;

  const progress = (totalPagesRead / book.totalPaginas) * 100;
  
  // tempoGasto agora está em MINUTOS (decimal, ex: 10.5 = 10min 30seg)
  // Para leituras bíblicas, agrupa por dia e pega o máximo por dia
  // Para entradas de período, tempoGasto já representa o tempo POR DIA
  const calculateTotalTimeMinutes = () => {
    const isBible = book?.categoria?.toLowerCase() === 'bíblia' || 
                    book?.categoria?.toLowerCase() === 'biblia';
    
    if (isBible) {
      // Agrupar por dia e pegar o tempo máximo por dia
      const timeByDay: Record<string, number> = {};
      for (const reading of bookReadings) {
        const dateKey = `${reading.dia}/${reading.mes}`;
        const currentMax = timeByDay[dateKey] || 0;
        timeByDay[dateKey] = Math.max(currentMax, reading.tempoGasto);
      }
      return Object.values(timeByDay).reduce((sum, time) => sum + time, 0);
    }
    
    // Para livros não-bíblicos, soma o tempo de todas as leituras
    let totalMinutes = 0;
    for (const reading of bookReadings) {
      totalMinutes += reading.tempoGasto;
    }
    return totalMinutes;
  };
  
  const totalTimeMinutes = calculateTotalTimeMinutes();
  
  const calculateReadingDays = () => {
    const isBible = book?.categoria?.toLowerCase() === 'bíblia' || 
                    book?.categoria?.toLowerCase() === 'biblia';
    
    if (isBible) {
      // Conta dias únicos para leituras bíblicas
      const uniqueDays = new Set<string>();
      for (const reading of bookReadings) {
        const dateKey = `${reading.dia}/${reading.mes}`;
        uniqueDays.add(dateKey);
      }
      return uniqueDays.size;
    }
    
    // Para livros não-bíblicos, cada entrada é um dia único
    return bookReadings.length;
  };
  
  const readingDays = calculateReadingDays();
  const avgPagesPerDay = readingDays > 0 ? totalPagesRead / readingDays : 0;
  const pagesPerMinute = totalTimeMinutes > 0 ? totalPagesRead / totalTimeMinutes : 0;

  // Formatar minutos para exibição (ex: "1h 30min" ou "45min")
  const formatTimeFromMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  // Detecta se é uma entrada gerada por período (start_date == end_date e múltiplas entradas para o mesmo livro)
  // Para entradas de período, start_date sempre igual a end_date (cada entrada é 1 dia)
  const isPeriodEntry = (reading: DailyReading, allReadings: DailyReading[]) => {
    if (!reading.dataInicio || !reading.dataFim) return false;
    const startStr = format(new Date(reading.dataInicio), "yyyy-MM-dd");
    const endStr = format(new Date(reading.dataFim), "yyyy-MM-dd");
    // Se start == end E há múltiplas entradas do mesmo livro, é entrada de período
    if (startStr === endStr) {
      const sameBookEntries = allReadings.filter(r => r.livroId === reading.livroId && r.dataInicio && r.dataFim);
      return sameBookEntries.length > 1;
    }
    return false;
  };

  // Calcula a ordem de uma entrada de período dentro do conjunto
  const getPeriodOrder = (reading: DailyReading, allReadings: DailyReading[]) => {
    const sameBookEntries = allReadings
      .filter(r => r.livroId === reading.livroId && r.dataInicio)
      .sort((a, b) => new Date(a.dataInicio!).getTime() - new Date(b.dataInicio!).getTime());
    const index = sameBookEntries.findIndex(r => r.id === reading.id);
    return index + 1;
  };

  const formatReadingDate = (reading: DailyReading) => {
    const isPeriod = isPeriodEntry(reading, bookReadings);
    
    // Para entradas geradas por período, mostrar formato especial com numeração
    if (isPeriod && reading.dataInicio) {
      const ordem = getPeriodOrder(reading, bookReadings);
      const dataFormatada = format(new Date(reading.dataInicio), "dd/MM/yyyy", { locale: ptBR });
      const mesAbrev = format(new Date(reading.dataInicio), "MMM", { locale: ptBR });
      // Capitalizar primeira letra do mês
      const mesCapitalizado = mesAbrev.charAt(0).toUpperCase() + mesAbrev.slice(1);
      return `${dataFormatada} a ${dataFormatada} (${ordem}º ${mesCapitalizado}.)`;
    }
    
    // Para entradas diárias normais (não geradas por período)
    if (reading.dataInicio) {
      const data = new Date(reading.dataInicio);
      const dia = format(data, "d", { locale: ptBR });
      const mesAbrev = format(data, "MMM", { locale: ptBR });
      // Capitalizar primeira letra do mês
      const mesCapitalizado = mesAbrev.charAt(0).toUpperCase() + mesAbrev.slice(1);
      return `${dia} ${mesCapitalizado}.`;
    }
    
    return `${reading.dia} ${reading.mes}`;
  };

  // Formatar minutos para histórico (ex: "10 min" ou "10:30")
  const formatReadingTime = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes % 1) * 60);
    if (secs > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')} min`;
    }
    return `${mins} min`;
  };

  // Helper to parse month name to number for proper date comparison
  const parseMonthToNumber = (monthName: string): number => {
    const months: Record<string, number> = {
      'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3,
      'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
      'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11,
      'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3,
      'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7,
      'set': 8, 'out': 9, 'nov': 10, 'dez': 11,
    };
    return months[monthName.toLowerCase()] ?? 0;
  };

  // Helper to get a sortable timestamp from a reading
  const getReadingTimestamp = (reading: DailyReading): number => {
    // Priority 1: Use dataInicio if available
    if (reading.dataInicio) {
      return new Date(reading.dataInicio).getTime();
    }
    // Priority 2: Parse dia/mes fields
    const currentYear = new Date().getFullYear();
    const monthNum = parseMonthToNumber(reading.mes);
    return new Date(currentYear, monthNum, reading.dia).getTime();
  };

  // Group readings by day for consolidated display
  const groupReadingsByDay = (readings: DailyReading[], isBible: boolean) => {
    if (!isBible) {
      // For non-Bible books, sort by date descending (most recent first)
      const sortedReadings = [...readings].sort((a, b) => {
        const dateA = getReadingTimestamp(a);
        const dateB = getReadingTimestamp(b);
        return dateB - dateA; // Descending order (most recent first)
      });
      return sortedReadings.map(reading => ({
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
      timestamp: number; // Added for sorting
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
      const timestamp = getReadingTimestamp(reading);
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          key: dateKey,
          displayDate: formatReadingDate(reading),
          paginaInicial: reading.paginaInicial,
          paginaFinal: reading.paginaFinal,
          quantidadePaginas: reading.paginaFinal - reading.paginaInicial,
          tempoGasto: reading.tempoGasto,
          timestamp,
          bibleEntries: [],
          readings: [],
        };
      } else {
        // Merge data
        groups[dateKey].paginaInicial = Math.min(groups[dateKey].paginaInicial, reading.paginaInicial);
        groups[dateKey].paginaFinal = Math.max(groups[dateKey].paginaFinal, reading.paginaFinal);
        // Para Bíblia agrupada: quantidade = MAX(paginaFinal) - MIN(paginaInicial)
        groups[dateKey].quantidadePaginas = groups[dateKey].paginaFinal - groups[dateKey].paginaInicial;
        // For time, use the maximum (only one reading per day should have time set)
        groups[dateKey].tempoGasto = Math.max(groups[dateKey].tempoGasto, reading.tempoGasto);
        // Update timestamp if this reading has a more recent one
        groups[dateKey].timestamp = Math.max(groups[dateKey].timestamp, timestamp);
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

    // Sort by timestamp descending (most recent first)
    const sorted = Object.values(groups).sort((a, b) => b.timestamp - a.timestamp);
    
    // Fix Bible start pages: each day's start should be previous day's end
    if (isBible && sorted.length > 1) {
      // Sort ascending by timestamp to calculate incremental pages
      const ascending = [...sorted].reverse();
      for (let i = 0; i < ascending.length; i++) {
        if (i === 0) {
          // First day keeps paginaInicial as is (could be 0 which is correct for day 1)
        } else {
          // Each subsequent day starts where the previous day ended
          ascending[i].paginaInicial = ascending[i - 1].paginaFinal;
          ascending[i].quantidadePaginas = ascending[i].paginaFinal - ascending[i].paginaInicial;
        }
      }
    }
    
    return sorted;
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
              <p className="text-2xl font-bold">{formatTimeFromMinutes(totalTimeMinutes)}</p>
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
              <p className="text-2xl font-bold">{formatTimeFromMinutes(totalTimeMinutes / (readingDays || 1))}</p>
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
          entry={selectedWord}
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