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

    // FORÇA O INTERVALO DE 3 PÁGINAS (Início + 2)
    const pInicial = parseInt(paginaInicial) || 1;
    const pFinalCalculada = pInicial + 2;

    const updatedReading: DailyReading = {
      ...reading,
      dia: parseInt(dia),
      mes,
      paginaInicial: pInicial,
      paginaFinal: pFinalCalculada,
      tempoGasto: parseTimeToSeconds(tempoGasto),
      quantidadePaginas: 3, // Força 3 páginas lidas
      dataInicio,
      dataFim: dataInicio, // Repete a data para o formato dd/mm/aaaa a dd/mm/aaaa
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

  // Pega o número da ordem da leitura para o contador acumulado (Ex: 47 dia)
  const numeroOrdem = reading?.ordem || 1;

  if (!reading || !book) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span className="flex items-center gap-2">📖 Editar Leitura - {book.livro}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {dataInicio
                ? `${format(dataInicio, "dd/MM/yyyy")} a ${format(dataInicio, "dd/MM/yyyy")} (${numeroOrdem} dia)`
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Data da Leitura</label>
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
              <label className="block text-sm font-medium text-foreground mb-2">Duração (Plano)</label>
              <input
                type="text"
                value={`(${numeroOrdem} dia)`}
                readOnly
                className="input-library bg-muted cursor-not-allowed"
              />
            </div>
          </div>

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
              <label className="block text-sm font-medium text-foreground mb-2">Página Final (Auto)</label>
              <input
                type="number"
                value={paginaInicial ? parseInt(paginaInicial) + 2 : ""}
                readOnly
                className="input-library bg-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div className="text-xs font-medium text-primary bg-primary/5 p-2 rounded border border-primary/10">
            Total lido: 3 páginas (padrão solicitado)
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tempo Gasto (min:seg)</label>
            <input
              type="text"
              value={tempoGasto}
              onChange={(e) => setTempoGasto(e.target.value)}
              className="input-library"
              placeholder="Ex: 10:30"
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
