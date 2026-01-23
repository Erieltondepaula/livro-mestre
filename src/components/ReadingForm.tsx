import { useState, useMemo } from 'react';
import { BookOpen, Calculator, CalendarIcon, Clock, TrendingUp, Info, Plus, X, Trash2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';

interface BibleEntry {
  id: string;
  bibleBook: string;
  bibleChapter: string;
  bibleVerseStart: string;
  bibleVerseEnd: string;
}

interface ReadingFormProps {
  books: Book[];
  onSubmit: (reading: Omit<DailyReading, 'id' | 'quantidadePaginas'> & { 
    dataInicio?: Date; 
    dataFim?: Date;
    isRetroactive?: boolean;
    bibleBook?: string;
    bibleChapter?: number;
    bibleVerseStart?: number;
    bibleVerseEnd?: number;
    bibleEntries?: BibleEntry[];
  }) => void;
}

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Função para parse MM:SS para SEGUNDOS
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return (minutes * 60) + seconds;
  }
  // Se não tiver ":", assume que são apenas minutos
  return (parseInt(timeStr) || 0) * 60;
}

// Formatar segundos para exibição MM:SS
function formatSecondsToDisplay(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (secs > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}`;
}

export function ReadingForm({ books, onSubmit }: ReadingFormProps) {
  const today = new Date();
  const currentDay = today.getDate().toString();
  const currentMonth = meses[today.getMonth()];

  const [mode, setMode] = useState<'daily' | 'period'>('daily');
  const [livroId, setLivroId] = useState('');
  const [dia, setDia] = useState(currentDay);
  const [mes, setMes] = useState(currentMonth);
  const [paginaInicial, setPaginaInicial] = useState('');
  const [paginaFinal, setPaginaFinal] = useState('');
  const [tempoGasto, setTempoGasto] = useState(''); 
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  
  // Multi-leitura bíblica
  const [bibleEntries, setBibleEntries] = useState<BibleEntry[]>([]);
  const [currentBibleBook, setCurrentBibleBook] = useState('');
  const [currentBibleChapter, setCurrentBibleChapter] = useState('');
  const [currentBibleVerseStart, setCurrentBibleVerseStart] = useState('');
  const [currentBibleVerseEnd, setCurrentBibleVerseEnd] = useState('');

  const selectedBook = books.find(b => b.id === livroId);
  const isBibleCategory = selectedBook?.categoria?.toLowerCase() === 'bíblia' || 
                          selectedBook?.categoria?.toLowerCase() === 'biblia';
  
  const paginasLidas = paginaInicial && paginaFinal 
    ? parseInt(paginaFinal) - parseInt(paginaInicial) 
    : 0;

  const bibleBookNames = useMemo(() => getBibleBookNames(), []);
  const bibleChapters = useMemo(() => 
    currentBibleBook ? getChaptersArray(currentBibleBook) : [], [currentBibleBook]);
  const bibleVerses = useMemo(() => 
    currentBibleBook && currentBibleChapter ? getVersesArray(currentBibleBook, parseInt(currentBibleChapter)) : [], 
    [currentBibleBook, currentBibleChapter]);

  const isPeriodMode = mode === 'period' && dataInicio && dataFim;
  const isBookCompleted = selectedBook && parseInt(paginaFinal) >= selectedBook.totalPaginas;
  
  const diasLeitura = dataInicio && dataFim ? differenceInDays(dataFim, dataInicio) + 1 : 0;
  const paginasPorDia = diasLeitura > 0 && paginasLidas > 0 ? (paginasLidas / diasLeitura).toFixed(1) : 0;
  
  const tempoEmSegundos = parseTimeToSeconds(tempoGasto);
  const tempoMedioPorDiaSegundos = diasLeitura > 0 && tempoEmSegundos ? Math.round(tempoEmSegundos / diasLeitura) : 0;

  const addBibleEntry = () => {
    if (!currentBibleBook || !currentBibleChapter) return;
    
    const newEntry: BibleEntry = {
      id: crypto.randomUUID(),
      bibleBook: currentBibleBook,
      bibleChapter: currentBibleChapter,
      bibleVerseStart: currentBibleVerseStart,
      bibleVerseEnd: currentBibleVerseEnd,
    };
    
    setBibleEntries([...bibleEntries, newEntry]);
    
    // Reset current fields
    setCurrentBibleBook('');
    setCurrentBibleChapter('');
    setCurrentBibleVerseStart('');
    setCurrentBibleVerseEnd('');
  };

  const removeBibleEntry = (id: string) => {
    setBibleEntries(bibleEntries.filter(e => e.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livroId || !paginaInicial || !paginaFinal || !tempoGasto) return;
    
    const book = books.find(b => b.id === livroId);
    if (!book) return;

    // Salvar o valor em SEGUNDOS
    const tempoFinal = parseTimeToSeconds(tempoGasto);

    // Para livros bíblicos com múltiplas entradas, submeter cada uma
    if (isBibleCategory && bibleEntries.length > 0) {
      bibleEntries.forEach((entry, index) => {
        if (mode === 'daily') {
          if (!dia) return;

          onSubmit({
            livroId,
            livroLido: book.livro,
            dia: parseInt(dia),
            mes,
            paginaInicial: parseInt(paginaInicial),
            paginaFinal: parseInt(paginaFinal),
            tempoGasto: index === 0 ? tempoFinal : 0, // Só a primeira entrada tem o tempo
            isRetroactive: false,
            bibleBook: entry.bibleBook,
            bibleChapter: entry.bibleChapter ? parseInt(entry.bibleChapter) : undefined,
            bibleVerseStart: entry.bibleVerseStart ? parseInt(entry.bibleVerseStart) : undefined,
            bibleVerseEnd: entry.bibleVerseEnd ? parseInt(entry.bibleVerseEnd) : undefined,
          });
        } else {
          if (!dataInicio || !dataFim) return;

          onSubmit({
            livroId,
            livroLido: book.livro,
            dia: dataFim.getDate(),
            mes: meses[dataFim.getMonth()],
            paginaInicial: parseInt(paginaInicial),
            paginaFinal: parseInt(paginaFinal),
            tempoGasto: index === 0 ? tempoFinal : 0,
            dataInicio,
            dataFim,
            isRetroactive: !!isBookCompleted,
            bibleBook: entry.bibleBook,
            bibleChapter: entry.bibleChapter ? parseInt(entry.bibleChapter) : undefined,
            bibleVerseStart: entry.bibleVerseStart ? parseInt(entry.bibleVerseStart) : undefined,
            bibleVerseEnd: entry.bibleVerseEnd ? parseInt(entry.bibleVerseEnd) : undefined,
          });
        }
      });
    } else {
      // Submissão normal (livro comum ou bíblia sem entradas múltiplas)
      if (mode === 'daily') {
        if (!dia) return;

        onSubmit({
          livroId,
          livroLido: book.livro,
          dia: parseInt(dia),
          mes,
          paginaInicial: parseInt(paginaInicial),
          paginaFinal: parseInt(paginaFinal),
          tempoGasto: tempoFinal, 
          isRetroactive: false,
          ...(isBibleCategory && currentBibleBook && {
            bibleBook: currentBibleBook,
            bibleChapter: currentBibleChapter ? parseInt(currentBibleChapter) : undefined,
            bibleVerseStart: currentBibleVerseStart ? parseInt(currentBibleVerseStart) : undefined,
            bibleVerseEnd: currentBibleVerseEnd ? parseInt(currentBibleVerseEnd) : undefined,
          }),
        });
      } else {
        if (!dataInicio || !dataFim) return;

        onSubmit({
          livroId,
          livroLido: book.livro,
          dia: dataFim.getDate(),
          mes: meses[dataFim.getMonth()],
          paginaInicial: parseInt(paginaInicial),
          paginaFinal: parseInt(paginaFinal),
          tempoGasto: tempoFinal, 
          dataInicio,
          dataFim,
          isRetroactive: !!isBookCompleted,
          ...(isBibleCategory && currentBibleBook && {
            bibleBook: currentBibleBook,
            bibleChapter: currentBibleChapter ? parseInt(currentBibleChapter) : undefined,
            bibleVerseStart: currentBibleVerseStart ? parseInt(currentBibleVerseStart) : undefined,
            bibleVerseEnd: currentBibleVerseEnd ? parseInt(currentBibleVerseEnd) : undefined,
          }),
        });
      }
    }

    // Reset form
    setPaginaInicial('');
    setPaginaFinal('');
    setTempoGasto('');
    setDataInicio(undefined);
    setDataFim(undefined);
    setBibleEntries([]);
    setCurrentBibleBook('');
    setCurrentBibleChapter('');
    setCurrentBibleVerseStart('');
    setCurrentBibleVerseEnd('');
    setDia('');
  };

  const resetFormOnModeChange = (newMode: 'daily' | 'period') => {
    setMode(newMode);
    if (newMode === 'daily') {
      setDia(currentDay);
      setMes(currentMonth);
    } else {
      setDia('');
    }
    setDataInicio(undefined);
    setDataFim(undefined);
  };

  const handleBookChange = (bookId: string) => {
    setLivroId(bookId);
    setBibleEntries([]);
    setCurrentBibleBook('');
    setCurrentBibleChapter('');
    setCurrentBibleVerseStart('');
    setCurrentBibleVerseEnd('');
  };

  const handleBibleBookChange = (bookName: string) => {
    setCurrentBibleBook(bookName);
    setCurrentBibleChapter('');
    setCurrentBibleVerseStart('');
    setCurrentBibleVerseEnd('');
  };

  const handleBibleChapterChange = (chapter: string) => {
    setCurrentBibleChapter(chapter);
    setCurrentBibleVerseStart('');
    setCurrentBibleVerseEnd('');
  };

  const canAddBibleEntry = currentBibleBook && currentBibleChapter;

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">Registar Leitura</h2>
        <p className="text-sm md:text-base text-muted-foreground">Registre a sua sessão de leitura</p>
      </div>

      <div className="card-library-elevated p-4 md:p-6 lg:p-8 max-w-2xl">
        <Tabs value={mode} onValueChange={(v) => resetFormOnModeChange(v as 'daily' | 'period')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="text-sm">
              📅 Registro Diário
            </TabsTrigger>
            <TabsTrigger value="period" className="text-sm">
              📆 Período de Leitura
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="mt-4">
            <div className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg text-sm">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                Use este modo para registrar <strong>uma sessão de leitura específica</strong> em um dia.
              </span>
            </div>
          </TabsContent>
          
          <TabsContent value="period" className="mt-4">
            <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg text-sm">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                Use este modo para registrar <strong>um período de leitura</strong> com data de início e fim. 
                O sistema calculará automaticamente a quantidade de dias de leitura.
              </span>
            </div>
          </TabsContent>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Livro
            </label>
            <select
              value={livroId}
              onChange={(e) => handleBookChange(e.target.value)}
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

          {isBibleCategory && (
            <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-primary flex items-center gap-2">
                  📖 Leitura Bíblica
                </h4>
                {bibleEntries.length > 0 && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                    {bibleEntries.length} capítulo(s) adicionado(s)
                  </span>
                )}
              </div>
              
              {/* Lista de entradas adicionadas */}
              {bibleEntries.length > 0 && (
                <div className="space-y-2 mb-4">
                  {bibleEntries.map((entry) => (
                    <div 
                      key={entry.id}
                      className="flex items-center justify-between bg-background/80 border border-border rounded-lg px-3 py-2"
                    >
                      <span className="text-sm">
                        {entry.bibleBook} {entry.bibleChapter}
                        {entry.bibleVerseStart && `:${entry.bibleVerseStart}`}
                        {entry.bibleVerseEnd && entry.bibleVerseEnd !== entry.bibleVerseStart && `-${entry.bibleVerseEnd}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBibleEntry(entry.id)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário para adicionar nova entrada */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Livro da Bíblia
                </label>
                <select
                  value={currentBibleBook}
                  onChange={(e) => handleBibleBookChange(e.target.value)}
                  className="input-library"
                >
                  <option value="">Selecione o livro</option>
                  {bibleBookNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {currentBibleBook && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Capítulo
                  </label>
                  <select
                    value={currentBibleChapter}
                    onChange={(e) => handleBibleChapterChange(e.target.value)}
                    className="input-library"
                  >
                    <option value="">Selecione o capítulo</option>
                    {bibleChapters.map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
              )}

              {currentBibleChapter && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Versículo Inicial (opcional)
                    </label>
                    <select
                      value={currentBibleVerseStart}
                      onChange={(e) => setCurrentBibleVerseStart(e.target.value)}
                      className="input-library"
                    >
                      <option value="">-</option>
                      {bibleVerses.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Versículo Final (opcional)
                    </label>
                    <select
                      value={currentBibleVerseEnd}
                      onChange={(e) => setCurrentBibleVerseEnd(e.target.value)}
                      className="input-library"
                    >
                      <option value="">-</option>
                      {bibleVerses
                        .filter(v => !currentBibleVerseStart || v >= parseInt(currentBibleVerseStart))
                        .map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Botão Adicionar */}
              <Button
                type="button"
                variant="outline"
                onClick={addBibleEntry}
                disabled={!canAddBibleEntry}
                className="w-full border-primary/30 hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Capítulo
              </Button>
            </div>
          )}

          {mode === 'daily' && (
            <div className="grid grid-cols-2 gap-4 md:gap-6">
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
                  required
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

          {mode === 'period' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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
          )}

          <div className="grid grid-cols-2 gap-4 md:gap-6">
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
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tempo Gasto (minutos:segundos)
            </label>
            <input
              type="text"
              value={tempoGasto}
              onChange={(e) => setTempoGasto(e.target.value)}
              className="input-library"
              placeholder="Ex: 42:11 ou 45"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Digite no formato MM:SS (ex: 42:11) ou apenas minutos (ex: 45)
            </p>
          </div>

          {isPeriodMode && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/50 rounded-lg">
              <div className="text-center">
                <Calculator className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{paginasLidas}</p>
                <p className="text-xs text-muted-foreground">Páginas Lidas</p>
              </div>
              <div className="text-center">
                <CalendarIcon className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{diasLeitura}</p>
                <p className="text-xs text-muted-foreground">Dias</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{paginasPorDia}</p>
                <p className="text-xs text-muted-foreground">Págs/Dia</p>
              </div>
              <div className="text-center">
                <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{formatSecondsToDisplay(tempoMedioPorDiaSegundos)}</p>
                <p className="text-xs text-muted-foreground">Tempo/Dia</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="btn-library-primary w-full"
            disabled={!livroId || !paginaInicial || !paginaFinal || !tempoGasto || (mode === 'daily' && !dia) || (mode === 'period' && (!dataInicio || !dataFim))}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Registrar Leitura
          </Button>
        </form>
      </div>
    </div>
  );
}
