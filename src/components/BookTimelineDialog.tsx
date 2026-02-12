import { useState, useMemo, useCallback } from 'react';
import { format, isValid, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BookOpen, Clock, Star, FileText, 
  ChevronDown, ChevronRight, Plus, CalendarDays, BookMarked, 
  Sparkles, Quote as QuoteIcon, Brain, Eye,
  MessageSquare, Filter, ExternalLink, Network, X, Minus
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
  bibleRefs?: { book: string; chapter?: number; verseStart?: number; verseEnd?: number }[];
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

// Build a date from day + month string (e.g., 12, "Fevereiro") when start_date is null
const MONTH_MAP: Record<string, number> = {
  'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
  'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
  'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11,
};
function dateFromDayMonth(dia: number, mes: string): Date {
  const monthIdx = MONTH_MAP[mes.toLowerCase().trim()] ?? 0;
  const year = new Date().getFullYear();
  return new Date(year, monthIdx, dia, 12, 0, 0);
}

function formatSafeDate(d: Date | null, fmt: string): string {
  if (!d) return '—';
  try { return format(d, fmt, { locale: ptBR }); } catch { return '—'; }
}

// ========== MIND MAP COMPONENT ==========
function MindMapView({ book, readings, quotes, vocabulary, notes, evaluations, isBible, onNavigateToNotes, onClose }: {
  book: Book;
  readings: DailyReading[];
  quotes: Quote[];
  vocabulary: VocabularyEntry[];
  notes: Note[];
  evaluations: BookEvaluation[];
  isBible: boolean;
  onNavigateToNotes?: () => void;
  onClose: () => void;
}) {
  const bookReadings = readings.filter(r => r.livroId === book.id);
  const bookQuotes = quotes.filter(q => q.livroId === book.id);
  const bookVocab = vocabulary.filter(v => v.book_id === book.id);
  const bookNotes = notes.filter(n => n.bookId === book.id || n.linkedBooks?.some(lb => lb.id === book.id));
  const bookEvals = evaluations.filter(e => e.livroId === book.id);

  // For Bible: group unique bible books
  const bibleBooks = useMemo(() => {
    if (!isBible) return [];
    const map = new Map<string, { chapters: Set<number>; count: number }>();
    bookReadings.forEach(r => {
      if (r.bibleBook) {
        if (!map.has(r.bibleBook)) map.set(r.bibleBook, { chapters: new Set(), count: 0 });
        const entry = map.get(r.bibleBook)!;
        if (r.bibleChapter) entry.chapters.add(r.bibleChapter);
        entry.count++;
      }
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, chapters: data.chapters.size, readings: data.count }));
  }, [bookReadings, isBible]);

  const totalPages = bookReadings.reduce((sum, r) => sum + (r.quantidadePaginas || (r.paginaFinal - r.paginaInicial)), 0);
  const totalTime = bookReadings.reduce((sum, r) => sum + (r.tempoGasto || 0), 0);
  const hours = Math.floor(totalTime / 60);
  const mins = Math.round(totalTime % 60);

  const branches = [
    { label: '📖 Leituras', count: bookReadings.length, color: '#3b82f6', items: [`${totalPages} páginas`, `${hours > 0 ? `${hours}h ` : ''}${mins}min`] },
    { label: '⭐ Avaliações', count: bookEvals.length, color: '#f59e0b', items: bookEvals.map(e => `Nota ${e.notaFinal.toFixed(1)}/10`) },
    { label: '💬 Citações', count: bookQuotes.length, color: '#10b981', items: bookQuotes.slice(0, 5).map(q => `"${q.citacao.slice(0, 40)}${q.citacao.length > 40 ? '…' : ''}"`) },
    { label: '🧠 Vocabulário', count: bookVocab.length, color: '#8b5cf6', items: bookVocab.slice(0, 8).map(v => v.palavra) },
    { label: '📝 Notas', count: bookNotes.length, color: '#ec4899', items: bookNotes.slice(0, 5).map(n => n.title) },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Center node */}
      <div className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white rounded-2xl px-5 py-3 shadow-lg">
          <p className="font-bold text-sm">{book.livro}</p>
          <p className="text-[10px] text-white/70">{book.autor}</p>
        </div>
      </div>

      {/* Branches */}
      <div className="space-y-3">
        {branches.map((branch, idx) => (
          <div key={idx} className="rounded-xl border overflow-hidden" style={{ borderColor: branch.color + '40' }}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: branch.color + '10' }}>
              <div className="w-3 h-3 rounded-full" style={{ background: branch.color }} />
              <span className="font-semibold text-xs">{branch.label}</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">{branch.count}</Badge>
            </div>
            {branch.items.length > 0 && (
              <div className="px-3 py-2 flex flex-wrap gap-1.5">
                {branch.items.map((item, i) => (
                  <span key={i} className="text-[11px] bg-muted/60 rounded-lg px-2 py-0.5 text-muted-foreground">{item}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bible books map */}
      {isBible && bibleBooks.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold text-muted-foreground mb-2">📖 Livros Bíblicos Lidos</h4>
          <div className="flex flex-wrap gap-1.5">
            {bibleBooks.map((bb, i) => (
              <Badge key={i} variant="outline" className="text-[10px] gap-1" style={{ borderColor: '#3b82f6' + '60' }}>
                {bb.name} <span className="text-muted-foreground">({bb.chapters} caps)</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Action: create note from mind map */}
      {onNavigateToNotes && (
        <div className="pt-4 border-t">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs w-full" onClick={() => { onClose(); onNavigateToNotes(); }}>
            <Plus className="w-3.5 h-3.5" />
            Criar Nova Nota sobre este livro
          </Button>
        </div>
      )}
    </div>
  );
}

// ========== MAIN COMPONENT ==========
export function BookTimelineDialog({
  book, isOpen, onClose, readings, statuses, evaluations, quotes, vocabulary, notes, onNavigateToNotes
}: BookTimelineDialogProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<EventType | 'all'>('all');
  const [showAllOfType, setShowAllOfType] = useState<EventType | null>(null);
  const [showMindMap, setShowMindMap] = useState(false);
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

    // 1. Cadastro
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

    // 2. Leituras — GROUP by same day for Bible
    const bookReadings = readings.filter(r => r.livroId === book.id);
    
    if (isBible) {
      // Group readings by day
      const dayGroups = new Map<string, DailyReading[]>();
      bookReadings.forEach(r => {
        // Use day+month as grouping key so readings on the same day are always grouped
        const key = `${r.dia}-${r.mes}`;
        if (!dayGroups.has(key)) dayGroups.set(key, []);
        dayGroups.get(key)!.push(r);
      });

      dayGroups.forEach((group, key) => {
        const firstReading = group[0];
        const date = safeDate(firstReading.dataInicio) || safeDate(firstReading.dataFim) || dateFromDayMonth(firstReading.dia, firstReading.mes);
        const totalPages = group.reduce((sum, r) => sum + (r.quantidadePaginas || (r.paginaFinal - r.paginaInicial)), 0);
        const totalTime = group.reduce((sum, r) => sum + (r.tempoGasto || 0), 0);
        const startPage = Math.min(...group.map(r => r.paginaInicial));
        const endPage = Math.max(...group.map(r => r.paginaFinal));

        const bibleRefs: TimelineEvent['bibleRefs'] = [];
        const details: string[] = [];

        details.push(`📄 Páginas ${startPage} → ${endPage} (${totalPages}p)`);

        if (totalTime > 0) {
          const hours = Math.floor(totalTime / 60);
          const mins = Math.round(totalTime % 60);
          const secs = Math.round((totalTime % 1) * 60);
          details.push(`⏱️ Tempo: ${hours > 0 ? `${hours}h ` : ''}${mins}:${secs.toString().padStart(2, '0')} min`);
        }

        group.forEach(r => {
          if (r.bibleBook) {
            const ref = {
              book: r.bibleBook,
              chapter: r.bibleChapter,
              verseStart: r.bibleVerseStart,
              verseEnd: r.bibleVerseEnd,
            };
            bibleRefs.push(ref);
            const refStr = `${r.bibleBook} ${r.bibleChapter || ''}${r.bibleVerseStart ? `:${r.bibleVerseStart}` : ''}${r.bibleVerseEnd ? `-${r.bibleVerseEnd}` : ''}`;
            details.push(`📖 ${refStr}`);
          }
        });

        const refSummary = bibleRefs.map(ref => 
          `${ref.book} ${ref.chapter || ''}${ref.verseStart ? `:${ref.verseStart}` : ''}${ref.verseEnd ? `-${ref.verseEnd}` : ''}`
        );

        events.push({
          id: `leitura-group-${key}`,
          date: date!,
          type: 'leitura',
          title: `Sessão de leitura`,
          subtitle: `${startPage} → ${endPage}  ${totalPages}p  ${totalTime > 0 ? `${Math.floor(totalTime)}:${Math.round((totalTime % 1) * 60).toString().padStart(2, '0')} min` : ''}`,
          details,
          bibleRefs,
          ...EVENT_CONFIG.leitura,
          data: group,
        });
      });
    } else {
      // Non-Bible: one event per reading
      bookReadings.forEach(r => {
        const date = safeDate(r.dataInicio) || safeDate(r.dataFim) || dateFromDayMonth(r.dia, r.mes);
        const pagesRead = r.quantidadePaginas || (r.paginaFinal - r.paginaInicial);
        const details: string[] = [];
        details.push(`📄 Páginas ${r.paginaInicial} → ${r.paginaFinal} (${pagesRead} págs)`);
        if (r.tempoGasto > 0) {
          const mins = Math.floor(r.tempoGasto);
          const secs = Math.round((r.tempoGasto % 1) * 60);
          details.push(`⏱️ Tempo: ${mins}:${secs.toString().padStart(2, '0')} min`);
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
          title: `Sessão de leitura`,
          subtitle: `${pagesRead} páginas lidas${r.tempoGasto > 0 ? ` • ${Math.round(r.tempoGasto)}min` : ''}`,
          details,
          ...EVENT_CONFIG.leitura,
          data: r,
        });
      });
    }

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

    // 5. Vocabulário — show ALL info
    const bookVocab = vocabulary.filter(v => v.book_id === book.id);
    bookVocab.forEach(v => {
      const defs = Array.isArray(v.definicoes) ? v.definicoes : [];
      const sinonimos = Array.isArray(v.sinonimos) ? v.sinonimos : [];
      const antonimos = Array.isArray(v.antonimos) ? v.antonimos : [];
      const exemplos = Array.isArray(v.exemplos) ? v.exemplos : [];
      const analise = v.analise_contexto;

      const details: string[] = [
        v.silabas ? `📏 Sílabas: ${v.silabas}` : '',
        v.classe ? `📗 Classe: ${v.classe}` : '',
        v.fonetica ? `🔊 Fonética: ${v.fonetica}` : '',
        ...defs.map((d, i) => `${i + 1}. ${typeof d === 'string' ? d : JSON.stringify(d)}`),
        v.etimologia ? `📜 Etimologia: ${v.etimologia}` : '',
        v.source_details?.page ? `📄 Página: ${v.source_details.page}` : '',
        v.observacoes ? `📝 ${v.observacoes}` : '',
      ].filter(Boolean);

      if (sinonimos.length > 0) {
        details.push(`🔄 Sinônimos:`);
        sinonimos.forEach(sg => {
          if (typeof sg === 'object' && sg.sentido) {
            details.push(`  • ${sg.sentido}: ${sg.palavras?.join(', ') || ''}`);
          } else {
            details.push(`  • ${typeof sg === 'string' ? sg : JSON.stringify(sg)}`);
          }
        });
      }
      if (antonimos.length > 0) {
        details.push(`↔️ Antônimos: ${antonimos.join(', ')}`);
      }
      if (exemplos.length > 0) {
        details.push(`💡 Exemplos:`);
        exemplos.slice(0, 3).forEach(ex => details.push(`  "${typeof ex === 'string' ? ex : JSON.stringify(ex)}"`));
      }
      if (analise) {
        details.push(`🔍 Análise de Contexto:`);
        if (analise.frase) details.push(`  Frase: "${analise.frase}"`);
        if (analise.sentidoIdentificado) details.push(`  Sentido: ${analise.sentidoIdentificado}`);
        if (analise.explicacao) details.push(`  ${analise.explicacao}`);
      }

      events.push({
        id: `vocabulario-${v.id}`,
        date: safeDate(v.created_at) || new Date(),
        type: 'vocabulario',
        title: `"${v.palavra}"`,
        subtitle: v.classe ? `${v.classe}${v.fonetica ? ` • ${v.fonetica}` : ''}` : (defs[0] || undefined),
        details,
        ...EVENT_CONFIG.vocabulario,
        data: v,
      });
    });

    // 6. Notas
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

    // Descending: most recent first (like reading history)
    // Cadastro is ALWAYS last (oldest logically) regardless of its actual date
    events.sort((a, b) => {
      if (a.type === 'cadastro') return 1;  // push cadastro to end (bottom)
      if (b.type === 'cadastro') return -1;
      return b.date.getTime() - a.date.getTime();
    });
    return events;
  }, [book, readings, evaluations, quotes, vocabulary, notes, isBible]);

  const typeCounts = useMemo(() => {
    const counts: Record<EventType, number> = { cadastro: 0, leitura: 0, avaliacao: 0, citacao: 0, vocabulario: 0, nota: 0 };
    timelineEvents.forEach(e => { counts[e.type]++; });
    return counts;
  }, [timelineEvents]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return timelineEvents;
    return timelineEvents.filter(e => e.type === activeFilter);
  }, [timelineEvents, activeFilter]);

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
    <Dialog open={isOpen} onOpenChange={() => { onClose(); setActiveFilter('all'); setShowAllOfType(null); setExpandedEvents(new Set()); setShowMindMap(false); }}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-2xl'} max-h-[92vh] p-0 overflow-hidden`}>
        
        {/* ===== SHOW ALL OVERLAY ===== */}
        {showAllOfType && !showMindMap && (
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
                    {/* Bible reference badges */}
                    {event.bibleRefs && event.bibleRefs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {event.bibleRefs.map((ref, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {ref.book} {ref.chapter || ''}{ref.verseStart ? `:${ref.verseStart}` : ''}{ref.verseEnd ? `-${ref.verseEnd}` : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
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

        {/* ===== MIND MAP OVERLAY ===== */}
        {showMindMap && (
          <div className="absolute inset-0 z-20 bg-background flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b">
              <Button variant="ghost" size="sm" onClick={() => setShowMindMap(false)} className="gap-1">
                <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
              </Button>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h3 className="font-bold text-base">Mapa Mental</h3>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <MindMapView 
                book={book} 
                readings={readings} 
                quotes={quotes} 
                vocabulary={vocabulary} 
                notes={notes}
                evaluations={evaluations}
                isBible={isBible}
                onNavigateToNotes={onNavigateToNotes}
                onClose={onClose}
              />
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
              return (
                <button
                  key={type}
                  onClick={() => count > 0 ? setShowAllOfType(type) : undefined}
                  className={`text-center rounded-lg py-1.5 px-1 transition-all ${
                    count > 0 
                      ? 'bg-white/15 hover:bg-white/25 cursor-pointer active:scale-95' 
                      : 'bg-white/5 opacity-50 cursor-default'
                  }`}
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
                <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-400 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600 rounded-full" />

                {Array.from(groupedEvents.entries()).map(([monthLabel, events]) => (
                  <div key={monthLabel} className="mb-5">
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
                          <div 
                            className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl"
                            style={{ background: `linear-gradient(135deg, ${event.gradientFrom}, ${event.gradientTo})` }}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>

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
                                  
                                  {/* Bible reference badges - always visible for reading events */}
                                  {event.bibleRefs && event.bibleRefs.length > 0 && !isExpanded && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {event.bibleRefs.map((ref, i) => (
                                        <Badge key={i} variant="secondary" className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                          {ref.book} {ref.chapter || ''}{ref.verseStart ? `:${ref.verseStart}` : ''}{ref.verseEnd ? `-${ref.verseEnd}` : ''}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {event.details && event.details.length > 0 && (
                                  <div className="flex-shrink-0 mt-1 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>

                              {isExpanded && event.details && (
                                <div className="mt-2.5 pt-2.5 border-t space-y-1.5" style={{ borderColor: event.gradientFrom + '20' }}>
                                  {/* Bible refs expanded with bigger badges */}
                                  {event.bibleRefs && event.bibleRefs.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {event.bibleRefs.map((ref, i) => (
                                        <Badge key={i} className="text-[11px] bg-blue-500 text-white border-blue-400">
                                          📖 {ref.book} {ref.chapter || ''}{ref.verseStart ? `:${ref.verseStart}` : ''}{ref.verseEnd ? `-${ref.verseEnd}` : ''}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {event.details.filter(d => !d.startsWith('📖')).map((detail, i) => (
                                    <p key={i} className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                      {detail}
                                    </p>
                                  ))}
                                  
                                  {event.type === 'citacao' && (
                                    <div className="pt-2">
                                      <Badge variant="outline" className="text-[10px] cursor-default">
                                        💬 Citação completa acima
                                      </Badge>
                                    </div>
                                  )}
                                  {event.type === 'vocabulario' && event.data && (
                                    <div className="pt-2 flex flex-wrap gap-1">
                                      {(event.data.sinonimos || []).slice(0, 5).map((sg: any, i: number) => (
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
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-1.5 text-xs"
            onClick={() => setShowMindMap(true)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Mapa Mental
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
