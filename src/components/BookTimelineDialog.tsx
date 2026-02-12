import { useState, useMemo, useCallback } from 'react';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BookOpen, Clock, Star, FileText, 
  ChevronDown, ChevronRight, Plus, CalendarDays, BookMarked, 
  Sparkles, Quote as QuoteIcon, Brain, Eye, EyeOff,
  MessageSquare, Filter, ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
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

type EventType = 'cadastro' | 'leitura' | 'avaliacao' | 'citacao' | 'vocabulario' | 'nota';

interface TimelineEvent {
  id: string;
  date: Date;
  type: EventType;
  title: string;
  subtitle?: string;
  details?: string[];
  color: string;
  gradientFrom: string;
  gradientTo: string;
  icon: typeof BookOpen;
  data?: any;
}

const EVENT_CONFIG: Record<EventType, { color: string; gradientFrom: string; gradientTo: string; icon: typeof BookOpen; label: string; emoji: string }> = {
  cadastro:    { color: 'hsl(245, 58%, 51%)', gradientFrom: '#6366f1', gradientTo: '#818cf8', icon: BookMarked,  label: 'Cadastro',    emoji: '📚' },
  leitura:     { color: 'hsl(217, 91%, 60%)', gradientFrom: '#3b82f6', gradientTo: '#60a5fa', icon: BookOpen,    label: 'Leitura',     emoji: '📖' },
  avaliacao:   { color: 'hsl(38, 92%, 50%)',  gradientFrom: '#f59e0b', gradientTo: '#fbbf24', icon: Star,        label: 'Avaliação',   emoji: '⭐' },
  citacao:     { color: 'hsl(160, 84%, 39%)', gradientFrom: '#10b981', gradientTo: '#34d399', icon: QuoteIcon,   label: 'Citação',     emoji: '💬' },
  vocabulario: { color: 'hsl(258, 90%, 66%)', gradientFrom: '#8b5cf6', gradientTo: '#a78bfa', icon: Brain,       label: 'Vocabulário', emoji: '🧠' },
  nota:        { color: 'hsl(330, 81%, 60%)', gradientFrom: '#ec4899', gradientTo: '#f472b6', icon: FileText,    label: 'Nota',        emoji: '📝' },
};

function safeDate(value: any): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? d : null;
}

function formatSafeDate(d: Date | null, fmt: string): string {
  if (!d) return '—';
  try { return format(d, fmt, { locale: ptBR }); } catch { return '—'; }
}

export function BookTimelineDialog({
  book, isOpen, onClose, readings, statuses, evaluations, quotes, vocabulary, notes, onNavigateToNotes
}: BookTimelineDialogProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<EventType | 'all'>('all');
  const [showAllOfType, setShowAllOfType] = useState<EventType | null>(null);
  const isMobile = useIsMobile();

  const toggleEvent = useCallback((id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const isBible = book?.categoria?.toLowerCase().includes('bíblia') || book?.categoria?.toLowerCase().includes('biblia') || book?.tipo === 'Bíblia';

  const timelineEvents = useMemo(() => {
    if (!book) return [];
    const events: TimelineEvent[] = [];

    // 1. Cadastro — use created_at if available (raw data might have it)
    const cadastroDate = safeDate((book as any).created_at) || new Date();
    events.push({
      id: `cadastro-${book.id}`,
      date: cadastroDate,
      type: 'cadastro',
      title: 'Livro cadastrado na biblioteca',
      subtitle: `${book.livro} • ${book.totalPaginas} páginas`,
      details: [
        book.autor ? `✍️ Autor: ${book.autor}` : '',
        book.categoria ? `📂 Categoria: ${book.categoria}` : '',
        book.tipo ? `📘 Tipo: ${book.tipo}` : '',
        book.ano ? `📅 Ano: ${book.ano}` : '',
        book.valorPago ? `💰 Valor: R$ ${book.valorPago.toFixed(2)}` : '',
      ].filter(Boolean),
      ...EVENT_CONFIG.cadastro,
    });

    // 2. Leituras
    const bookReadings = readings.filter(r => r.livroId === book.id);
    bookReadings.forEach(r => {
      const date = safeDate(r.dataInicio) || safeDate(r.dataFim) || new Date();
      const pagesRead = r.quantidadePaginas || (r.paginaFinal - r.paginaInicial);
      const details: string[] = [];
      
      details.push(`📄 Páginas ${r.paginaInicial} → ${r.paginaFinal} (${pagesRead} págs)`);
      
      if (r.tempoGasto > 0) {
        const hours = Math.floor(r.tempoGasto / 60);
        const mins = Math.round(r.tempoGasto % 60);
        details.push(`⏱️ Tempo: ${hours > 0 ? `${hours}h ` : ''}${mins}min`);
      }
      
      if (isBible && r.bibleBook) {
        details.push(`📖 ${r.bibleBook} ${r.bibleChapter || ''}${r.bibleVerseStart ? `:${r.bibleVerseStart}` : ''}${r.bibleVerseEnd ? `-${r.bibleVerseEnd}` : ''}`);
      }

      if (r.dataFim && r.dataInicio) {
        const startD = safeDate(r.dataInicio);
        const endD = safeDate(r.dataFim);
        if (startD && endD) {
          details.push(`📅 Período: ${formatSafeDate(startD, 'dd/MM/yyyy')} → ${formatSafeDate(endD, 'dd/MM/yyyy')}`);
        }
      }

      events.push({
        id: `leitura-${r.id}`,
        date: date!,
        type: 'leitura',
        title: isBible && r.bibleBook ? `${r.bibleBook} ${r.bibleChapter || ''}` : `Sessão de leitura`,
        subtitle: `${pagesRead} páginas lidas${r.tempoGasto > 0 ? ` • ${Math.round(r.tempoGasto)}min` : ''}`,
        details,
        ...EVENT_CONFIG.leitura,
        data: r,
      });
    });

    // 3. Avaliações
    const bookEvals = evaluations.filter(e => e.livroId === book.id);
    bookEvals.forEach(e => {
      const stars = Math.round(e.notaFinal / 2);
      events.push({
        id: `avaliacao-${e.id}`,
        date: safeDate((e as any).created_at) || new Date(),
        type: 'avaliacao',
        title: `Nota ${e.notaFinal.toFixed(1)}/10 — ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`,
        subtitle: e.observacoes ? e.observacoes.slice(0, 100) : undefined,
        details: [
          `🎨 Criatividade: ${e.criatividade}/10`,
          `✍️ Escrita: ${e.escrita}/10`,
          `📚 Aprendizados: ${e.aprendizados}/10`,
          `😊 Prazer: ${e.prazer}/10`,
          `💥 Impacto: ${e.impacto}/10`,
          e.observacoes ? `📝 ${e.observacoes}` : '',
        ].filter(Boolean),
        ...EVENT_CONFIG.avaliacao,
        data: e,
      });
    });

    // 4. Citações
    const bookQuotes = quotes.filter(q => q.livroId === book.id);
    bookQuotes.forEach(q => {
      const bibleRef = q.bibleBook ? `${q.bibleBook} ${q.bibleChapter || ''}:${q.bibleVerse || ''}` : '';
      events.push({
        id: `citacao-${q.id}`,
        date: safeDate(q.created_at) || new Date(),
        type: 'citacao',
        title: bibleRef || (q.pagina ? `Citação — pág. ${q.pagina}` : 'Citação salva'),
        subtitle: q.citacao.length > 100 ? q.citacao.slice(0, 100) + '…' : q.citacao,
        details: [
          `"${q.citacao}"`,
          q.pagina ? `📄 Página ${q.pagina}` : '',
          bibleRef ? `📖 ${bibleRef}` : '',
        ].filter(Boolean),
        ...EVENT_CONFIG.citacao,
        data: q,
      });
    });

    // 5. Vocabulário
    const bookVocab = vocabulary.filter(v => v.book_id === book.id);
    bookVocab.forEach(v => {
      const defs = Array.isArray(v.definicoes) ? v.definicoes : [];
      events.push({
        id: `vocabulario-${v.id}`,
        date: safeDate(v.created_at) || new Date(),
        type: 'vocabulario',
        title: `"${v.palavra}"`,
        subtitle: v.classe ? `${v.classe}${v.fonetica ? ` • ${v.fonetica}` : ''}` : (defs[0] || undefined),
        details: [
          v.classe ? `📗 Classe: ${v.classe}` : '',
          v.fonetica ? `🔊 Fonética: ${v.fonetica}` : '',
          ...defs.slice(0, 3).map((d, i) => `${i + 1}. ${typeof d === 'string' ? d : JSON.stringify(d)}`),
          v.etimologia ? `📜 Etimologia: ${v.etimologia}` : '',
          v.source_details?.page ? `📄 Página: ${v.source_details.page}` : '',
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
      const typeLabels: Record<string, string> = { fleeting: 'Efêmera', permanent: 'Permanente', literature: 'Literatura', reference: 'Referência' };
      events.push({
        id: `nota-${n.id}`,
        date: safeDate(n.created_at) || new Date(),
        type: 'nota',
        title: n.title,
        subtitle: `${typeLabels[n.noteType] || n.noteType}${n.tags?.length ? ` • ${n.tags.join(', ')}` : ''}`,
        details: [
          `📝 Tipo: ${typeLabels[n.noteType] || n.noteType}`,
          n.tags?.length ? `🏷️ Tags: ${n.tags.join(', ')}` : '',
          `📊 ${n.wordCount} palavras`,
          n.content ? (n.content.length > 200 ? n.content.slice(0, 200) + '…' : n.content) : '',
        ].filter(Boolean),
        ...EVENT_CONFIG.nota,
        data: n,
      });
    });

    events.sort((a, b) => b.date.getTime() - a.date.getTime());
    return events;
  }, [book, readings, evaluations, quotes, vocabulary, notes, isBible]);

  // Counts per type
  const typeCounts = useMemo(() => {
    const counts: Record<EventType, number> = { cadastro: 0, leitura: 0, avaliacao: 0, citacao: 0, vocabulario: 0, nota: 0 };
    timelineEvents.forEach(e => { counts[e.type]++; });
    return counts;
  }, [timelineEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return timelineEvents;
    return timelineEvents.filter(e => e.type === activeFilter);
  }, [timelineEvents, activeFilter]);

  // Group events by month
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    filteredEvents.forEach(event => {
      const d = event.date;
      if (!d || !isValid(d)) return;
      const key = format(d, 'MMMM yyyy', { locale: ptBR });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    });
    return groups;
  }, [filteredEvents]);

  const status = statuses.find(s => s.livroId === book?.id);
  const progress = book ? Math.min(((status?.quantidadeLida || 0) / book.totalPaginas) * 100, 100) : 0;

  // Items to show in "show all" overlay
  const showAllItems = useMemo(() => {
    if (!showAllOfType) return [];
    return timelineEvents.filter(e => e.type === showAllOfType);
  }, [showAllOfType, timelineEvents]);

  if (!book) return null;

  const statCards: { type: EventType; label: string; emoji: string }[] = [
    { type: 'leitura', label: 'Leituras', emoji: '📖' },
    { type: 'avaliacao', label: 'Avaliações', emoji: '⭐' },
    { type: 'citacao', label: 'Citações', emoji: '💬' },
    { type: 'vocabulario', label: 'Vocabulários', emoji: '🧠' },
    { type: 'nota', label: 'Notas', emoji: '📝' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => { onClose(); setActiveFilter('all'); setShowAllOfType(null); setExpandedEvents(new Set()); }}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-2xl'} max-h-[92vh] p-0 overflow-hidden`}>
        
        {/* ===== SHOW ALL OVERLAY ===== */}
        {showAllOfType && (
          <div className="absolute inset-0 z-20 bg-background flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: EVENT_CONFIG[showAllOfType].gradientFrom + '40' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowAllOfType(null)} className="gap-1">
                <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-lg">{EVENT_CONFIG[showAllOfType].emoji}</span>
                <h3 className="font-bold text-base">{EVENT_CONFIG[showAllOfType].label}s ({showAllItems.length})</h3>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {showAllItems.map(event => (
                  <div key={event.id} className="rounded-xl border p-3 space-y-2" style={{ borderColor: event.gradientFrom + '30' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{event.title}</p>
                        {event.subtitle && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{event.subtitle}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatSafeDate(event.date, "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    {event.details && (
                      <div className="space-y-1 pt-2 border-t" style={{ borderColor: event.gradientFrom + '20' }}>
                        {event.details.map((detail, i) => (
                          <p key={i} className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{detail}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {showAllItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ===== HEADER ===== */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-4 pb-5">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold pr-8 leading-tight">{book.livro}</DialogTitle>
          </DialogHeader>
          {book.autor && <p className="text-white/80 text-sm mt-0.5">{book.autor}</p>}
          
          <div className="flex flex-wrap gap-1.5 mt-2">
            {book.categoria && (
              <Badge className="bg-white/20 text-white border-white/30 text-[10px]">{book.categoria}</Badge>
            )}
            {isBible && <Badge className="bg-amber-400/30 text-white border-amber-300/30 text-[10px]">📖 Bíblia</Badge>}
            <Badge className="bg-white/20 text-white border-white/30 text-[10px]">
              {status?.status === 'Concluido' ? '✅ Concluído' : status?.status === 'Lendo' ? '📖 Lendo' : '📋 Não iniciado'}
            </Badge>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-white/70 mb-1">
              <span>{status?.quantidadeLida || 0} de {book.totalPaginas} págs</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-white/90 to-white rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Interactive stat cards */}
          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {statCards.map(({ type, label, emoji }) => {
              const count = typeCounts[type];
              const isActive = activeFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => count > 0 ? setShowAllOfType(type) : undefined}
                  className={`text-center rounded-lg py-1.5 px-1 transition-all ${
                    count > 0 
                      ? 'bg-white/15 hover:bg-white/25 cursor-pointer active:scale-95' 
                      : 'bg-white/5 opacity-50 cursor-default'
                  } ${isActive ? 'ring-2 ring-white/50' : ''}`}
                >
                  <p className="text-base font-bold leading-tight">{count}</p>
                  <p className="text-[9px] text-white/70 leading-tight">{label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== FILTER CHIPS ===== */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b overflow-x-auto no-scrollbar">
          <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <button
            onClick={() => setActiveFilter('all')}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex-shrink-0 ${
              activeFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border hover:bg-muted'
            }`}
          >
            Todos ({timelineEvents.length})
          </button>
          {statCards.map(({ type, label, emoji }) => {
            const count = typeCounts[type];
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(activeFilter === type ? 'all' : type)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex-shrink-0 whitespace-nowrap ${
                  activeFilter === type
                    ? 'text-white border-transparent'
                    : 'bg-muted/50 border-border hover:bg-muted'
                }`}
                style={activeFilter === type ? { backgroundColor: EVENT_CONFIG[type].gradientFrom } : {}}
              >
                {emoji} {label} ({count})
              </button>
            );
          })}
        </div>

        {/* ===== TIMELINE ===== */}
        <ScrollArea className="flex-1 max-h-[45vh]">
          <div className="p-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-10">
                <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">
                  {activeFilter === 'all' ? 'Nenhuma atividade registrada' : `Nenhum registro de ${EVENT_CONFIG[activeFilter as EventType]?.label || ''}`}
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical gradient line */}
                <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-400 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600 rounded-full" />

                {Array.from(groupedEvents.entries()).map(([monthLabel, events]) => (
                  <div key={monthLabel} className="mb-5">
                    {/* Month header */}
                    <div className="flex items-center gap-2 mb-2.5 ml-10">
                      <Badge variant="outline" className="text-[10px] font-bold capitalize bg-background shadow-sm">
                        📅 {monthLabel}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{events.length} registro{events.length !== 1 ? 's' : ''}</span>
                    </div>

                    {events.map(event => {
                      const isExpanded = expandedEvents.has(event.id);
                      const Icon = event.icon;
                      
                      return (
                        <div key={event.id} className="relative flex gap-2.5 mb-2.5 group">
                          {/* Colored dot */}
                          <div 
                            className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl"
                            style={{ background: `linear-gradient(135deg, ${event.gradientFrom}, ${event.gradientTo})` }}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>

                          {/* Card */}
                          <div
                            className={`flex-1 rounded-xl border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${
                              isExpanded ? 'shadow-lg' : ''
                            }`}
                            style={{
                              borderColor: isExpanded ? event.gradientFrom + '60' : undefined,
                              boxShadow: isExpanded ? `0 4px 20px ${event.gradientFrom}20` : undefined,
                            }}
                            onClick={() => toggleEvent(event.id)}
                          >
                            {/* Color accent bar */}
                            <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${event.gradientFrom}, ${event.gradientTo})` }} />
                            
                            <div className="p-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span 
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                                      style={{ background: `linear-gradient(135deg, ${event.gradientFrom}, ${event.gradientTo})` }}
                                    >
                                      {EVENT_CONFIG[event.type].label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatSafeDate(event.date, "dd MMM yyyy 'às' HH:mm")}
                                    </span>
                                  </div>
                                  <p className="font-semibold text-sm text-foreground mt-1 leading-tight">{event.title}</p>
                                  {event.subtitle && !isExpanded && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.subtitle}</p>
                                  )}
                                </div>
                                {event.details && event.details.length > 0 && (
                                  <div className="flex-shrink-0 mt-1 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>

                              {/* Expanded content */}
                              {isExpanded && event.details && (
                                <div className="mt-2.5 pt-2.5 border-t space-y-1.5" style={{ borderColor: event.gradientFrom + '20' }}>
                                  {event.details.map((detail, i) => (
                                    <p key={i} className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                      {detail}
                                    </p>
                                  ))}
                                  
                                  {/* Contextual action */}
                                  {event.type === 'citacao' && (
                                    <div className="pt-2">
                                      <Badge variant="outline" className="text-[10px] cursor-default">
                                        💬 Citação completa acima
                                      </Badge>
                                    </div>
                                  )}
                                  {event.type === 'vocabulario' && event.data && (
                                    <div className="pt-2 flex flex-wrap gap-1">
                                      {(event.data.sinonimos || []).slice(0, 3).map((sg: any, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-[10px]">
                                          {typeof sg === 'object' ? sg.sentido || sg.palavras?.[0] : sg}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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

        {/* ===== FOOTER ACTIONS ===== */}
        <div className="border-t p-3 flex flex-wrap gap-2 bg-muted/30">
          {onNavigateToNotes && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { onClose(); onNavigateToNotes(); }}>
              <Plus className="w-3.5 h-3.5" />
              Nova Nota
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-muted-foreground" disabled>
            <Sparkles className="w-3.5 h-3.5" />
            Mapa Mental (em breve)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
