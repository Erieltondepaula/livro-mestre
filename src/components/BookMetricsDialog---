import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { VocabularyDialog } from '@/components/VocabularyDialog';
import { BookOpen, Clock, Calendar, TrendingUp, Star, Quote, MessageSquare, Book } from 'lucide-react';
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
}

export function BookMetricsDialog({ 
  book, 
  status, 
  readings, 
  evaluation, 
  quotes,
  vocabulary,
  isOpen, 
  onClose 
}: BookMetricsDialogProps) {
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
  const [isVocabDialogOpen, setIsVocabDialogOpen] = useState(false);

  if (!book || !status) return null;

  const progress = (status.quantidadeLida / book.totalPaginas) * 100;
  const bookReadings = readings.filter(r => r.livroId === book.id);
  const bookQuotes = quotes.filter(q => q.livroId === book.id);
  const bookVocabulary = vocabulary.filter(v => v.bookId === book.id);

  const handleWordClick = (word: VocabularyWord) => {
    setSelectedWord(word);
    setIsVocabDialogOpen(true);
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
  
  // Calcular métricas - páginas lidas vem do status (quantidadeLida = página atual)
  const totalPagesRead = status.quantidadeLida;
  
  // Calcular tempo total corretamente:
  // - Para leituras diárias: soma direta do tempoGasto (em segundos)
  // - Para leituras por período: tempoGasto * dias de leitura
  const calculateTotalTime = () => {
    let totalSeconds = 0;
    
    for (const reading of bookReadings) {
      if (reading.dataInicio && reading.dataFim) {
        // Período: tempo informado é o tempo médio por dia, multiplica pelos dias
        const days = differenceInDays(reading.dataFim, reading.dataInicio) + 1;
        totalSeconds += reading.tempoGasto * days; // tempoGasto já está em segundos
      } else {
        // Leitura diária: soma direta
        totalSeconds += reading.tempoGasto;
      }
    }
    
    return totalSeconds;
  };
  
  const totalTimeSeconds = calculateTotalTime();
  
  // Calcular dias de leitura: considera dataInicio e dataFim se existirem
  const calculateReadingDays = () => {
    let totalDays = 0;
    
    for (const reading of bookReadings) {
      if (reading.dataInicio && reading.dataFim) {
        // Se tem período, calcular a diferença de dias + 1 (inclui ambos os dias)
        totalDays += differenceInDays(reading.dataFim, reading.dataInicio) + 1;
      } else {
        // Se é registro diário, conta como 1 dia
        totalDays += 1;
      }
    }
    
    return totalDays;
  };
  
  const readingDays = calculateReadingDays();
  const avgPagesPerDay = readingDays > 0 ? totalPagesRead / readingDays : 0;
  const avgTimePerDaySeconds = readingDays > 0 ? totalTimeSeconds / readingDays : 0;
  const pagesPerMinute = totalTimeSeconds > 0 ? totalPagesRead / (totalTimeSeconds / 60) : 0;

  // Formatar tempo em segundos para display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    if (mins > 0) {
      return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
    }
    return `${secs}s`;
  };

  // Formatar data de leitura para exibição
  const formatReadingDate = (reading: DailyReading) => {
    if (reading.dataInicio && reading.dataFim) {
      const inicio = format(reading.dataInicio, "dd/MM", { locale: ptBR });
      const fim = format(reading.dataFim, "dd/MM/yyyy", { locale: ptBR });
      const dias = differenceInDays(reading.dataFim, reading.dataInicio) + 1;
      return `${inicio} a ${fim} (${dias} dias)`;
    }
    return `${reading.dia}/${reading.mes}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          {/* Progresso Geral */}
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
              <span>{status.quantidadeLida} páginas lidas</span>
              <span>{book.totalPaginas - status.quantidadeLida} páginas restantes</span>
            </div>
          </div>

          {/* Estatísticas de Leitura */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card-library p-4 text-center">
              <BookOpen className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalPagesRead}</p>
              <p className="text-xs text-muted-foreground">Páginas Lidas</p>
            </div>
            
            <div className="card-library p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{formatTime(totalTimeSeconds)}</p>
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
              <p className="text-2xl font-bold">{formatTime(avgTimePerDaySeconds)}</p>
              <p className="text-xs text-muted-foreground">Tempo/Dia</p>
            </div>
            
            <div className="card-library p-4 text-center">
              <BookOpen className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{pagesPerMinute.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Págs/Min</p>
            </div>
          </div>

          {/* Avaliação */}
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

          {/* Citações */}
          {bookQuotes.length > 0 && (
            <div className="card-library p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                <Quote className="w-4 h-4" />
                Citações ({bookQuotes.length})
              </h3>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {bookQuotes.slice(0, 5).map((quote) => (
                  <div key={quote.id} className="border-l-2 border-primary pl-3">
                    <p className="text-sm italic">"{quote.citacao}"</p>
                    <p className="text-xs text-muted-foreground mt-1">Página {quote.pagina}</p>
                  </div>
                ))}
                {bookQuotes.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{bookQuotes.length - 5} citações
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Vocabulário */}
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
                    {word.pagina && (
                      <p className="text-[10px] text-muted-foreground">Pág. {word.pagina}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de Leituras */}
          {bookReadings.length > 0 && (
            <div className="card-library p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                Histórico de Leituras ({bookReadings.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {[...bookReadings].reverse().map((reading) => (
                  <div key={reading.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm py-2 border-b border-border last:border-0 gap-1">
                    <span className="font-medium">{formatReadingDate(reading)}</span>
                    <span className="text-muted-foreground">
                      Págs {reading.paginaInicial} → {reading.paginaFinal}
                    </span>
                    <span>{reading.quantidadePaginas} págs</span>
                    <span className="text-muted-foreground">{formatTime(reading.tempoGasto)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info do Livro */}
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
              {book.valorPago > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Pago</span>
                  <span className="font-medium">R$ {book.valorPago.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vocabulary Dialog */}
        <VocabularyDialog
          entry={selectedWord ? mapWordToEntry(selectedWord) : null}
          isOpen={isVocabDialogOpen}
          onClose={() => {
            setIsVocabDialogOpen(false);
            setSelectedWord(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
