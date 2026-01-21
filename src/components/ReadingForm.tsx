import { useState } from 'react';
import { BookOpen, Calculator, CalendarIcon, Clock, TrendingUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Book, DailyReading } from '@/types/library';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ReadingFormProps {
  books: Book[];
  onSubmit: (reading: Omit<DailyReading, 'id' | 'quantidadePaginas'> & { 
    dataInicio?: Date; 
    dataFim?: Date;
    isRetroactive?: boolean;
  }) => void;
}

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function ReadingForm({ books, onSubmit }: ReadingFormProps) {
  const [livroId, setLivroId] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState(meses[new Date().getMonth()]);
  const [paginaInicial, setPaginaInicial] = useState('');
  const [paginaFinal, setPaginaFinal] = useState('');
  const [tempoGasto, setTempoGasto] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();

  const selectedBook = books.find(b => b.id === livroId);
  const paginasLidas = paginaInicial && paginaFinal 
    ? parseInt(paginaFinal) - parseInt(paginaInicial) 
    : 0;

  // Calcular se é leitura retroativa (livro completo)
  const isRetroactive = dataInicio && dataFim && paginaInicial && paginaFinal;
  const isBookCompleted = selectedBook && parseInt(paginaFinal) >= selectedBook.totalPaginas;
  
  // Calcular estatísticas de leitura retroativa
  const diasLeitura = dataInicio && dataFim ? differenceInDays(dataFim, dataInicio) + 1 : 0;
  const paginasPorDia = diasLeitura > 0 && paginasLidas > 0 ? (paginasLidas / diasLeitura).toFixed(1) : 0;
  const tempoMedioPorDia = diasLeitura > 0 && tempoGasto ? (parseInt(tempoGasto) / diasLeitura).toFixed(0) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livroId || !paginaInicial || !paginaFinal || !tempoGasto) return;
    
    // Se for leitura retroativa, usar data fim para dia/mês
    const finalDia = dataFim ? dataFim.getDate() : parseInt(dia);
    const finalMes = dataFim ? meses[dataFim.getMonth()] : mes;

    if (!isRetroactive && (!dia)) return;

    const book = books.find(b => b.id === livroId);
    if (!book) return;

    onSubmit({
      livroId,
      livroLido: book.livro,
      dia: finalDia,
      mes: finalMes,
      paginaInicial: parseInt(paginaInicial),
      paginaFinal: parseInt(paginaFinal),
      tempoGasto: parseInt(tempoGasto),
      dataInicio,
      dataFim,
      isRetroactive: !!isRetroactive && !!isBookCompleted,
    });

    // Reset form
    setPaginaInicial('');
    setPaginaFinal('');
    setTempoGasto('');
    setDataInicio(undefined);
    setDataFim(undefined);
    setDia('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Registar Leitura</h2>
        <p className="text-muted-foreground">Registre a sua sessão de leitura do dia</p>
      </div>

      <div className="card-library-elevated p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data Início e Data Fim */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Data Início
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal input-library",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : <span>dd/mm/aaaa</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Data Fim
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal input-library",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : <span>dd/mm/aaaa</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    disabled={(date) => dataInicio ? date < dataInicio : false}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Livro
            </label>
            <select
              value={livroId}
              onChange={(e) => setLivroId(e.target.value)}
              className="input-library"
              required
            >
              <option value="">Selecione um livro</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.livro} ({book.totalPaginas} pág)
                </option>
              ))}
            </select>
          </div>

          {/* Dia e Mês - opcional se usar Data Início/Fim */}
          {!isRetroactive && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Dia
                </label>
                <input
                  type="number"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  className="input-library"
                  placeholder="Ex: 15"
                  min="1"
                  max="31"
                  required={!isRetroactive}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mês
                </label>
                <select
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="input-library"
                >
                  {meses.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Página Inicial
              </label>
              <input
                type="number"
                value={paginaInicial}
                onChange={(e) => setPaginaInicial(e.target.value)}
                className="input-library"
                placeholder="Ex: 1"
                min="1"
                max={selectedBook?.totalPaginas}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Página Final
              </label>
              <input
                type="number"
                value={paginaFinal}
                onChange={(e) => setPaginaFinal(e.target.value)}
                className="input-library"
                placeholder="Ex: 30"
                min={paginaInicial || 1}
                max={selectedBook?.totalPaginas}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tempo Gasto (minutos)
            </label>
            <input
              type="number"
              value={tempoGasto}
              onChange={(e) => setTempoGasto(e.target.value)}
              className="input-library"
              placeholder="Ex: 45"
              min="1"
              required
            />
          </div>

          {paginasLidas > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
                <Calculator className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">
                  Páginas lidas nesta sessão: <strong>{paginasLidas}</strong>
                </span>
              </div>

              {/* Estatísticas de leitura retroativa */}
              {isRetroactive && diasLeitura > 0 && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <TrendingUp className="w-4 h-4" />
                    <span>Estatísticas da Leitura</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span>Dias de leitura: <strong>{diasLeitura}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span>Média: <strong>{paginasPorDia} págs/dia</strong></span>
                    </div>
                    {tempoMedioPorDia && Number(tempoMedioPorDia) > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>Tempo médio: <strong>{tempoMedioPorDia} min/dia</strong></span>
                      </div>
                    )}
                    {isBookCompleted && (
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <span>✓ Livro será marcado como <strong>Concluído</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary w-full">
            <BookOpen className="w-5 h-5" />
            {isRetroactive && isBookCompleted ? 'Registar Leitura Concluída' : 'Registar Leitura'}
          </button>
        </form>
      </div>
    </div>
  );
}
