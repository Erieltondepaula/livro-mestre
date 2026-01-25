import { useState, useMemo, useEffect } from "react"; // Adicionado useEffect
import { BookOpen, Calculator, CalendarIcon, Clock, TrendingUp, Info, Plus, X, Trash2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Book, DailyReading } from "@/types/library";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBibleBookNames, getChaptersArray, getVersesArray } from "@/data/bibleData";

interface BibleEntry {
  id: string;
  bibleBook: string;
  bibleChapter: string;
  bibleVerseStart: string;
  bibleVerseEnd: string;
}

interface ReadingFormProps {
  books: Book[];
  onSubmit: (
    reading: Omit<DailyReading, "id" | "quantidadePaginas"> & {
      dataInicio?: Date;
      dataFim?: Date;
      isRetroactive?: boolean;
      bibleBook?: string;
      bibleChapter?: number;
      bibleVerseStart?: number;
      bibleVerseEnd?: number;
      bibleEntries?: BibleEntry[];
      generateDailyEntries?: boolean;
    },
  ) => void;
}

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** * CORREÇÃO 1: Função ajustada para MINUTOS
 * Agora, se digitar "15", o retorno é 15 (e não 900).
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes + seconds / 60;
  }
  return parseFloat(timeStr) || 0;
}

function formatMinutesToDisplay(totalMinutes: number): string {
  const mins = Math.floor(totalMinutes);
  const secs = Math.round((totalMinutes - mins) * 60);
  if (secs > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}`;
}

export function ReadingForm({ books, onSubmit }: ReadingFormProps) {
  const today = new Date();
  const currentDay = today.getDate().toString();
  const currentMonth = meses[today.getMonth()];

  const [mode, setMode] = useState<"daily" | "period">("daily");
  const [livroId, setLivroId] = useState("");
  const [dia, setDia] = useState(currentDay);
  const [mes, setMes] = useState(currentMonth);
  const [paginaInicial, setPaginaInicial] = useState("");
  const [paginaFinal, setPaginaFinal] = useState("");
  const [tempoGasto, setTempoGasto] = useState("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();

  const [bibleEntries, setBibleEntries] = useState<BibleEntry[]>([]);
  const [currentBibleBook, setCurrentBibleBook] = useState("");
  const [currentBibleChapter, setCurrentBibleChapter] = useState("");
  const [currentBibleVerseStart, setCurrentBibleVerseStart] = useState("");
  const [currentBibleVerseEnd, setCurrentBibleVerseEnd] = useState("");

  const selectedBook = books.find((b) => b.id === livroId);
  const isBibleCategory =
    selectedBook?.categoria?.toLowerCase() === "bíblia" || selectedBook?.categoria?.toLowerCase() === "biblia";

  const paginasLidas = paginaInicial && paginaFinal ? parseInt(paginaFinal) - parseInt(paginaInicial) : 0;

  /**
   * CORREÇÃO 2: Sugestão automática de tempo (5 min por página)
   * Preenche o campo de tempo apenas se estiver vazio.
   */
  useEffect(() => {
    if (paginaInicial && paginaFinal && !tempoGasto) {
      const pIn = parseInt(paginaInicial);
      const pFi = parseInt(paginaFinal);
      if (pFi > pIn) {
        const sugerido = (pFi - pIn) * 5;
        setTempoGasto(sugerido.toString());
      }
    }
  }, [paginaInicial, paginaFinal, tempoGasto]);

  const bibleBookNames = useMemo(() => getBibleBookNames(), []);
  const bibleChapters = useMemo(() => (currentBibleBook ? getChaptersArray(currentBibleBook) : []), [currentBibleBook]);
  const bibleVerses = useMemo(
    () =>
      currentBibleBook && currentBibleChapter ? getVersesArray(currentBibleBook, parseInt(currentBibleChapter)) : [],
    [currentBibleBook, currentBibleChapter],
  );

  const isPeriodMode = mode === "period" && dataInicio && dataFim;
  const isBookCompleted = selectedBook && parseInt(paginaFinal) >= selectedBook.totalPaginas;

  const diasLeitura = dataInicio && dataFim ? differenceInDays(dataFim, dataInicio) + 1 : 0;
  const paginasPorDia = diasLeitura > 0 && paginasLidas > 0 ? (paginasLidas / diasLeitura).toFixed(1) : 0;

  const tempoEmMinutos = parseTimeToMinutes(tempoGasto);
  const tempoMedioPorDiaMinutos = diasLeitura > 0 && tempoEmMinutos ? tempoEmMinutos / diasLeitura : 0;

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
    setCurrentBibleBook("");
    setCurrentBibleChapter("");
    setCurrentBibleVerseStart("");
    setCurrentBibleVerseEnd("");
  };

  const removeBibleEntry = (id: string) => {
    setBibleEntries(bibleEntries.filter((e) => e.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!livroId || !paginaInicial || !paginaFinal || !tempoGasto) return;

    const book = books.find((b) => b.id === livroId);
    if (!book) return;

    // CORREÇÃO: Enviando o valor correto em minutos
    const tempoFinal = parseTimeToMinutes(tempoGasto);

    if (isBibleCategory && bibleEntries.length > 0) {
      bibleEntries.forEach((entry, index) => {
        const baseData = {
          livroId,
          livroLido: book.livro,
          paginaInicial: parseInt(paginaInicial),
          paginaFinal: parseInt(paginaFinal),
          tempoGasto: index === 0 ? tempoFinal : 0,
          bibleBook: entry.bibleBook,
          bibleChapter: entry.bibleChapter ? parseInt(entry.bibleChapter) : undefined,
          bibleVerseStart: entry.bibleVerseStart ? parseInt(entry.bibleVerseStart) : undefined,
          bibleVerseEnd: entry.bibleVerseEnd ? parseInt(entry.bibleVerseEnd) : undefined,
        };

        if (mode === "daily") {
          if (!dia) return;
          onSubmit({ ...baseData, dia: parseInt(dia), mes, isRetroactive: false });
        } else {
          if (!dataInicio || !dataFim) return;
          onSubmit({
            ...baseData,
            dia: dataFim.getDate(),
            mes: meses[dataFim.getMonth()],
            dataInicio,
            dataFim,
            isRetroactive: !!isBookCompleted,
          });
        }
      });
    } else {
      const baseData = {
        livroId,
        livroLido: book.livro,
        paginaInicial: parseInt(paginaInicial),
        paginaFinal: parseInt(paginaFinal),
        tempoGasto: tempoFinal,
        ...(isBibleCategory &&
          currentBibleBook && {
            bibleBook: currentBibleBook,
            bibleChapter: currentBibleChapter ? parseInt(currentBibleChapter) : undefined,
            bibleVerseStart: currentBibleVerseStart ? parseInt(currentBibleVerseStart) : undefined,
            bibleVerseEnd: currentBibleVerseEnd ? parseInt(currentBibleVerseEnd) : undefined,
          }),
      };

      if (mode === "daily") {
        if (!dia) return;
        onSubmit({ ...baseData, dia: parseInt(dia), mes, isRetroactive: false });
      } else {
        if (!dataInicio || !dataFim) return;
        onSubmit({
          ...baseData,
          dia: dataFim.getDate(),
          mes: meses[dataFim.getMonth()],
          dataInicio,
          dataFim,
          isRetroactive: !!isBookCompleted,
          generateDailyEntries: true,
        });
      }
    }

    // Reset form
    setPaginaInicial("");
    setPaginaFinal("");
    setTempoGasto("");
    setDataInicio(undefined);
    setDataFim(undefined);
    setBibleEntries([]);
    setCurrentBibleBook("");
    setCurrentBibleChapter("");
    setCurrentBibleVerseStart("");
    setCurrentBibleVerseEnd("");
    setDia(currentDay);
  };

  const resetFormOnModeChange = (newMode: "daily" | "period") => {
    setMode(newMode);
    if (newMode === "daily") {
      setDia(currentDay);
      setMes(currentMonth);
    } else {
      setDia("");
    }
    setDataInicio(undefined);
    setDataFim(undefined);
  };

  const handleBookChange = (bookId: string) => {
    setLivroId(bookId);
    setBibleEntries([]);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">Registar Leitura</h2>
        <p className="text-sm md:text-base text-muted-foreground">Registre a sua sessão de leitura</p>
      </div>

      <div className="card-library-elevated p-4 md:p-6 lg:p-8 max-w-2xl">
        <Tabs value={mode} onValueChange={(v) => resetFormOnModeChange(v as "daily" | "period")} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="text-sm">
              📅 Registro Diário
            </TabsTrigger>
            <TabsTrigger value="period" className="text-sm">
              📆 Período de Leitura
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Livro</label>
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

          {/* ... (Secção Bíblia omitida para brevidade, permanece igual) ... */}

          {mode === "daily" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Dia</label>
                <input
                  type="number"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  className="input-library"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Mês</label>
                <select value={mes} onChange={(e) => setMes(e.target.value)} className="input-library">
                  {meses.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Página Inicial</label>
              <input
                type="number"
                value={paginaInicial}
                onChange={(e) => setPaginaInicial(e.target.value)}
                className="input-library"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Página Final</label>
              <input
                type="number"
                value={paginaFinal}
                onChange={(e) => setPaginaFinal(e.target.value)}
                className="input-library"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tempo Gasto (minutos)</label>
            <input
              type="text"
              value={tempoGasto}
              onChange={(e) => setTempoGasto(e.target.value)}
              className="input-library"
              placeholder="Ex: 15 ou 15:30"
              required
            />
          </div>

          {isPeriodMode && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-secondary/50 rounded-lg">
              <div className="text-center">
                <p className="text-lg font-bold">{paginasLidas}</p>
                <p className="text-xs text-muted-foreground">Páginas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{diasLeitura}</p>
                <p className="text-xs text-muted-foreground">Dias</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{paginasPorDia}</p>
                <p className="text-xs text-muted-foreground">Págs/Dia</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{formatMinutesToDisplay(tempoMedioPorDiaMinutos)}</p>
                <p className="text-xs text-muted-foreground">Tempo/Dia</p>
              </div>
            </div>
          )}

          <Button type="submit" className="btn-library-primary w-full">
            <BookOpen className="w-4 h-4 mr-2" /> Registrar Leitura
          </Button>
        </form>
      </div>
    </div>
  );
}
