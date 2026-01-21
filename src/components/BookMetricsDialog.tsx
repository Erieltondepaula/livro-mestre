import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, Calendar, TrendingUp, Star, Quote } from 'lucide-react';
import type { Book, BookStatus, DailyReading, BookEvaluation, Quote as QuoteType } from '@/types/library';

interface BookMetricsDialogProps {
  book: Book | null;
  status: BookStatus | null;
  readings: DailyReading[];
  evaluation: BookEvaluation | null;
  quotes: QuoteType[];
  isOpen: boolean;
  onClose: () => void;
}

export function BookMetricsDialog({ 
  book, 
  status, 
  readings, 
  evaluation, 
  quotes,
  isOpen, 
  onClose 
}: BookMetricsDialogProps) {
  if (!book || !status) return null;

  const progress = (status.quantidadeLida / book.totalPaginas) * 100;
  const bookReadings = readings.filter(r => r.livroId === book.id);
  const bookQuotes = quotes.filter(q => q.livroId === book.id);
  
  // Calcular métricas
  const totalPagesRead = status.quantidadeLida;
  const totalTimeSpent = bookReadings.reduce((sum, r) => sum + r.tempoGasto, 0);
  const readingDays = bookReadings.length;
  const avgPagesPerDay = readingDays > 0 ? totalPagesRead / readingDays : 0;
  const avgTimePerDay = readingDays > 0 ? totalTimeSpent / readingDays : 0;
  const pagesPerMinute = totalTimeSpent > 0 ? totalPagesRead / totalTimeSpent : 0;

  // Formatar tempo
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
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
              <p className="text-2xl font-bold">{formatTime(totalTimeSpent)}</p>
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
              <p className="text-2xl font-bold">{formatTime(avgTimePerDay)}</p>
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

          {/* Histórico de Leituras */}
          {bookReadings.length > 0 && (
            <div className="card-library p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                Últimas Leituras
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {bookReadings.slice(-5).reverse().map((reading) => (
                  <div key={reading.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                    <span>{reading.dia}/{reading.mes}</span>
                    <span className="text-muted-foreground">
                      Págs {reading.paginaInicial} → {reading.paginaFinal}
                    </span>
                    <span>{reading.quantidadePaginas} págs</span>
                    <span className="text-muted-foreground">{reading.tempoGasto}min</span>
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
      </DialogContent>
    </Dialog>
  );
}
