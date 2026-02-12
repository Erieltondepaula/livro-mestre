import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BookOpen, Clock, Star, MessageSquare, FileText, GraduationCap, 
  ChevronDown, ChevronRight, Plus, CalendarDays, BookMarked, 
  X, Sparkles, Quote as QuoteIcon, Brain
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Book, DailyReading, BookStatus, BookEvaluation, Quote, VocabularyEntry, Note } from '@/types/library';

interface BookTimelineDialogProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  readings: DailyReading[];
  statuses: BookStatus[];
  evaluations: BookEvaluation[];
  quotes: Quote[];
  vocabulary: VocabularyEntry[];
  notes: Note[];
  onNavigateToNotes?: () => void;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'cadastro' | 'leitura' | 'avaliacao' | 'citacao' | 'vocabulario' | 'nota';
  title: string;
  subtitle?: string;
  details?: string[];
  color: string;
  icon: typeof BookOpen;
  data?: any;
}

const EVENT_CONFIG = {
  cadastro: { color: '#6366f1', icon: BookMarked, label: 'Cadastro' },
  leitura: { color: '#3b82f6', icon: BookOpen, label: 'Leitura' },
  avaliacao: { color: '#f59e0b', icon: Star, label: 'Avaliação' },
  citacao: { color: '#10b981', icon: QuoteIcon, label: 'Citação' },
  vocabulario: { color: '#8b5cf6', icon: Brain, label: 'Vocabulário' },
  nota: { color: '#ec4899', icon: FileText, label: 'Nota' },
};

export function BookTimelineDialog({
  book, isOpen, onClose, readings, statuses, evaluations, quotes, vocabulary, notes, onNavigateToNotes
}: BookTimelineDialogProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleEvent = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isBible = book?.categoria?.toLowerCase().includes('bíblia') || book?.categoria?.toLowerCase().includes('biblia') || book?.tipo === 'Bíblia';

  const timelineEvents = useMemo(() => {
    if (!book) return [];
    const events: TimelineEvent[] = [];

    // 1. Cadastro do livro
    events.push({
      id: `cadastro-${book.id}`,
      date: new Date(), // fallback to now since Book type doesn't have created_at
      type: 'cadastro',
      title: 'Livro cadastrado na biblioteca',
      subtitle: `${book.livro} • ${book.totalPaginas} páginas`,
      details: [
        book.autor ? `Autor: ${book.autor}` : '',
        book.categoria ? `Categoria: ${book.categoria}` : '',
        book.tipo ? `Tipo: ${book.tipo}` : '',
      ].filter(Boolean),
      ...EVENT_CONFIG.cadastro,
    });

    // 2. Leituras
    const bookReadings = readings.filter(r => r.livroId === book.id);
    bookReadings.forEach(r => {
      const date = r.dataInicio || new Date();
      const details: string[] = [];
      
      details.push(`Páginas ${r.paginaInicial} → ${r.paginaFinal} (${r.quantidadePaginas} págs)`);
      
      if (r.tempoGasto > 0) {
        const hours = Math.floor(r.tempoGasto / 60);
        const mins = Math.round(r.tempoGasto % 60);
        details.push(`Tempo: ${hours > 0 ? `${hours}h ` : ''}${mins}m`);
      }
      
      if (isBible && r.bibleBook) {
        details.push(`📖 ${r.bibleBook} ${r.bibleChapter || ''}${r.bibleVerseStart ? `:${r.bibleVerseStart}` : ''}${r.bibleVerseEnd ? `-${r.bibleVerseEnd}` : ''}`);
      }

      events.push({
        id: `leitura-${r.id}`,
        date: new Date(date),
        type: 'leitura',
        title: `Sessão de leitura`,
        subtitle: `${r.quantidadePaginas} páginas lidas`,
        details,
        ...EVENT_CONFIG.leitura,
        data: r,
      });
    });

    // 3. Avaliações
    const bookEvals = evaluations.filter(e => e.livroId === book.id);
    bookEvals.forEach(e => {
      events.push({
        id: `avaliacao-${e.id}`,
        date: new Date(), // evaluation doesn't have created_at in type
        type: 'avaliacao',
        title: `Avaliação: ${e.notaFinal.toFixed(1)}/10`,
        subtitle: `⭐ ${Array(Math.round(e.notaFinal / 2)).fill('★').join('')}`,
        details: [
          `Criatividade: ${e.criatividade}/10`,
          `Escrita: ${e.escrita}/10`,
          `Aprendizados: ${e.aprendizados}/10`,
          `Prazer: ${e.prazer}/10`,
          `Impacto: ${e.impacto}/10`,
          e.observacoes ? `📝 ${e.observacoes}` : '',
        ].filter(Boolean),
        ...EVENT_CONFIG.avaliacao,
        data: e,
      });
    });

    // 4. Citações
    const bookQuotes = quotes.filter(q => q.livroId === book.id);
    bookQuotes.forEach(q => {
      events.push({
        id: `citacao-${q.id}`,
        date: q.created_at ? new Date(q.created_at) : new Date(),
        type: 'citacao',
        title: 'Citação salva',
        subtitle: q.citacao.length > 80 ? q.citacao.slice(0, 80) + '…' : q.citacao,
        details: [
          `"${q.citacao}"`,
          q.pagina ? `Página ${q.pagina}` : '',
          q.bibleBook ? `📖 ${q.bibleBook} ${q.bibleChapter || ''}:${q.bibleVerse || ''}` : '',
        ].filter(Boolean),
        ...EVENT_CONFIG.citacao,
        data: q,
      });
    });

    // 5. Vocabulário
    const bookVocab = vocabulary.filter(v => v.book_id === book.id);
    bookVocab.forEach(v => {
      events.push({
        id: `vocabulario-${v.id}`,
        date: new Date(v.created_at),
        type: 'vocabulario',
        title: `Palavra: "${v.palavra}"`,
        subtitle: v.classe ? `${v.classe}` : undefined,
        details: [
          ...(v.definicoes?.slice(0, 2) || []),
          v.etimologia ? `Etimologia: ${v.etimologia}` : '',
        ].filter(Boolean),
        ...EVENT_CONFIG.vocabulario,
        data: v,
      });
    });

    // 6. Notas vinculadas
    const bookNotes = notes.filter(n => 
      n.bookId === book.id || n.linkedBooks?.some(lb => lb.id === book.id)
    );
    bookNotes.forEach(n => {
      events.push({
        id: `nota-${n.id}`,
        date: new Date(n.created_at),
        type: 'nota',
        title: n.title,
        subtitle: `Tipo: ${n.noteType}${n.tags?.length ? ` • Tags: ${n.tags.join(', ')}` : ''}`,
        details: [
          n.content?.slice(0, 150) || '',
          `${n.wordCount} palavras`,
        ].filter(Boolean),
        ...EVENT_CONFIG.nota,
        data: n,
      });
    });

    // Sort by date descending (newest first)
    events.sort((a, b) => b.date.getTime() - a.date.getTime());
    return events;
  }, [book, readings, evaluations, quotes, vocabulary, notes, isBible]);

  // Group events by month
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    timelineEvents.forEach(event => {
      const d = event.date;
      if (!d || isNaN(d.getTime())) return;
      const key = format(d, 'MMMM yyyy', { locale: ptBR });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    });
    return groups;
  }, [timelineEvents]);

  const status = statuses.find(s => s.livroId === book?.id);
  const progress = book ? Math.min(((status?.quantidadeLida || 0) / book.totalPaginas) * 100, 100) : 0;

  if (!book) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white p-5 pb-6">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold pr-8">{book.livro}</DialogTitle>
          </DialogHeader>
          {book.autor && <p className="text-white/80 text-sm mt-0.5">{book.autor}</p>}
          
          <div className="flex flex-wrap gap-2 mt-3">
            {book.categoria && (
              <Badge className="bg-white/20 text-white border-white/30 text-xs">{book.categoria}</Badge>
            )}
            <Badge className="bg-white/20 text-white border-white/30 text-xs">
              {status?.status === 'Concluido' ? '✅ Concluído' : status?.status === 'Lendo' ? '📖 Lendo' : '📋 Não iniciado'}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>{status?.quantidadeLida || 0} de {book.totalPaginas} págs</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {Object.entries(EVENT_CONFIG).filter(([k]) => k !== 'cadastro').map(([key, config]) => {
              const count = timelineEvents.filter(e => e.type === key).length;
              return (
                <div key={key} className="text-center bg-white/10 rounded-lg py-1.5">
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] text-white/70">{config.label}s</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-4">
            {timelineEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhuma atividade registrada ainda</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 via-purple-300 to-pink-300 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700" />

                {Array.from(groupedEvents.entries()).map(([monthLabel, events]) => (
                  <div key={monthLabel} className="mb-6">
                    <div className="flex items-center gap-3 mb-3 ml-12">
                      <Badge variant="outline" className="text-xs font-semibold capitalize bg-background">
                        📅 {monthLabel}
                      </Badge>
                    </div>

                    {events.map(event => {
                      const isExpanded = expandedEvents.has(event.id);
                      const Icon = event.icon;
                      
                      return (
                        <div key={event.id} className="relative flex gap-3 mb-3 group">
                          {/* Dot */}
                          <div 
                            className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-transform group-hover:scale-110"
                            style={{ backgroundColor: event.color }}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>

                          {/* Card */}
                          <div
                            className={`flex-1 rounded-xl border border-border bg-card p-3 cursor-pointer transition-all hover:shadow-md ${
                              isExpanded ? 'ring-2 shadow-md' : ''
                            }`}
                            style={isExpanded ? { borderColor: event.color, boxShadow: `0 0 0 2px ${event.color}40` } : {}}
                            onClick={() => toggleEvent(event.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: event.color }}>
                                    {EVENT_CONFIG[event.type].label}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {!isNaN(event.date.getTime()) ? format(event.date, "dd MMM yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
                                  </span>
                                </div>
                                <p className="font-medium text-sm text-foreground mt-1 truncate">{event.title}</p>
                                {event.subtitle && !isExpanded && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.subtitle}</p>
                                )}
                              </div>
                              {event.details && event.details.length > 0 && (
                                isExpanded ? 
                                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" /> :
                                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                              )}
                            </div>

                            {/* Expanded content */}
                            {isExpanded && event.details && (
                              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                                {event.details.map((detail, i) => (
                                  <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                                    {detail}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t border-border p-3 flex flex-wrap gap-2 bg-muted/30">
          {onNavigateToNotes && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { onClose(); onNavigateToNotes(); }}>
              <Plus className="w-3.5 h-3.5" />
              Nova Nota
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onClose}>
            <Sparkles className="w-3.5 h-3.5" />
            Mapa Mental
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
