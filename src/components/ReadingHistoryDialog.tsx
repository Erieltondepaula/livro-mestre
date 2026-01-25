import { useState, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBibleBookNames, getChaptersArray, getVersesArray } from "@/data/bibleData";
import type { DailyReading, Book } from "@/types/library";

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

interface ReadingHistoryDialogProps {
  reading: DailyReading | null;
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedReading: DailyReading) => void;
}

export function ReadingHistoryDialog({ reading, book, isOpen, onClose, onSave }: ReadingHistoryDialogProps) {
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [paginaInicial, setPaginaInicial] = useState("");
  const [paginaFinal, setPaginaFinal] = useState("");
  const [tempoGasto, setTempoGasto] = useState("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();

  const [bibleBook, setBibleBook] = useState("");
  const [bibleChapter, setBibleChapter] = useState("");
  const [bibleVerseStart, setBibleVerseStart] = useState("");
  const [bibleVerseEnd, setBibleVerseEnd] = useState("");

  const isBibleCategory = book?.categoria?.toLowerCase() === "bíblia" || book?.categoria?.toLowerCase() === "biblia";

  const bibleBookNames = useMemo(() => getBibleBookNames(), []);
  const bibleChapters = useMemo(() => (bibleBook ? getChaptersArray(bibleBook) : []), [bibleBook]);
  const bibleVerses = useMemo(
    () => (bibleBook && bibleChapter ? getVersesArray(bibleBook, parseInt(bibleChapter)) : []),
    [bibleBook, bibleChapter],
  );

  // Populate form when dialog opens
  useState(() => {
    if (reading && isOpen) {
      setDia(reading.dia.toString());
      setMes(reading.mes);
      setPaginaInicial(reading.paginaInicial.toString());
      setPaginaFinal(reading.paginaFinal.toString());

      const totalSeconds = reading.tempoGasto;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.round(totalSeconds % 60);
      setTempoGasto(seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : minutes.toString());

      setDataInicio(reading.dataInicio);
      setDataFim(reading.dataFim);
      setBibleBook(reading.bibleBook || "");
      setBibleChapter(reading.bibleChapter?.toString() || "");
      setBibleVerseStart(reading.bibleVerseStart?.toString() || "");
      setBibleVerseEnd(reading.bibleVerseEnd?.toString() || "");
    }
  });

  const handleOpenChange = (open: boolean) => {
    if (open && reading) {
      setDia(reading.dia.toString());
      setMes(reading.mes);
      setPaginaInicial(reading.paginaInicial.toString());
      setPaginaFinal(reading.paginaFinal.toString());

      const totalSeconds = reading.tempoGasto;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.round(totalSeconds % 60);
      setTempoGasto(seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : minutes.toString());

      setDataInicio(reading.dataInicio);
      setDataFim(reading.dataFim);
      setBibleBook(reading.bibleBook || "");
      setBibleChapter(reading.bibleChapter?.toString() || "");
      setBibleVerseStart(reading.bibleVerseStart?.toString() || "");
      setBibleVerseEnd(reading.bibleVerseEnd?.toString() || "");
    }
    if (!open) {
      onClose();
    }
  };

  const parseTimeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return (parseInt(timeStr) || 0) * 60;
  };

  const handleSave = () => {
    if (!reading) return;

    const updatedReading: DailyReading = {
      ...reading,
      dia: parseInt(dia),
      mes,
      paginaInicial: parseInt(paginaInicial),
      paginaFinal: parseInt(paginaFinal),
      tempoGasto: parseTimeToSeconds(tempoGasto),
      // CORREÇÃO: Adicionado +1 para incluir a página inicial no total
      quantidadePaginas: parseInt(paginaFinal) - parseInt(paginaInicial) + 1,
      dataInicio,
      dataFim,
      bibleBook: bibleBook || undefined,
      bibleChapter: bibleChapter ? parseInt(bibleChapter) : undefined,
      bibleVerseStart: bibleVerseStart ? parseInt(bibleVerseStart) : undefined,
      bibleVerseEnd: bibleVerseEnd ? parseInt(bibleVerseEnd) : undefined,
    };

    onSave(updatedReading);
    onClose();
  };

  const handleBibleBookChange = (bookName: string) => {
    setBibleBook(bookName);
    setBibleChapter("");
    setBibleVerseStart("");
    setBibleVerseEnd("");
  };

  const handleBibleChapterChange = (chapter: string) => {
    setBibleChapter(chapter);
    setBibleVerseStart("");
    setBibleVerseEnd("");
  };

  const isPeriodMode = dataInicio && dataFim;

  // CORREÇÃO: Cálculo de pluralização para o cabeçalho/exibição
  const diffDias = isPeriodMode ? differenceInDays(dataFim, dataInicio) + 1 : 1;

  if (!reading || !book) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span className="flex items-center gap-2">📖 Editar Leitura - {book.livro}</span>
            {/* CORREÇÃO: Exibição profissional do período e dias */}
            <span className="text-sm font-normal text-muted-foreground">
              {isPeriodMode
                ? `${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")} (${diffDias} ${diffDias === 1 ? "dia" : "dias"})`
                : `${dia} de ${mes} (1 dia)`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isBibleCategory && (
            <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="font-medium text-sm text-primary">Referência Bíblica</h4>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Livro da Bíblia</label>
                <select
                  value={bibleBook}
                  onChange={(e) => handleBibleBookChange(e.target.value)}
                  className="input-library"
                >
                  <option value="">Selecione o livro</option>
                  {bibleBookNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {bibleBook && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Capítulo</label>
                  <select
                    value={bibleChapter}
                    onChange={(e) => handleBibleChapterChange(e.target.value)}
                    className="input-library"
                  >
                    <option value="">Selecione o capítulo</option>
                    {bibleChapters.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {bibleChapter && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Versículo Inicial</label>
                    <select
                      value={bibleVerseStart}
                      onChange={(e) => setBibleVerseStart(e.target.value)}
                      className="input-library"
                    >
                      <option value="">-</option>
                      {bibleVerses.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Versículo Final</label>
                    <select
                      value={bibleVerseEnd}
                      onChange={(e) => setBibleVerseEnd(e.target.value)}
                      className="input-library"
                    >
                      <option value="">-</option>
                      {bibleVerses
                        .filter((v) => !bibleVerseStart || v >= parseInt(bibleVerseStart))
                        .map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {isPeriodMode ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Data Início</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal input-library",
                        !dataInicio && "text-muted-foreground",
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
                <label className="block text-sm font-medium text-foreground mb-2">Data Fim</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal input-library",
                        !dataFim && "text-muted-foreground",
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
                      disabled={(date) => (dataInicio ? date < dataInicio : false)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Dia</label>
                <input
                  type="number"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  className="input-library"
                  min="1"
                  max="31"
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
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Página Final</label>
              <input
                type="number"
                value={paginaFinal}
                onChange={(e) => setPaginaFinal(e.target.value)}
                className="input-library"
                min={paginaInicial || 1}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tempo Gasto (min:seg)</label>
            <input
              type="text"
              value={tempoGasto}
              onChange={(e) => setTempoGasto(e.target.value)}
              className="input-library"
              placeholder="Ex: 42:11 ou 45"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1 btn-library-primary">
              <Save className="w-4 h-4 mr-2" /> Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
