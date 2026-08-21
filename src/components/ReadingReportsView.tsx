import { useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { BookOpen, Clock, TrendingUp, Calendar, BarChart3, PieChart as PieChartIcon, Flame, Target, History, Gauge, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Book, DailyReading, BookStatus } from '@/types/library';

interface ReadingReportsViewProps {
  books: Book[];
  readings: DailyReading[];
  statuses: BookStatus[];
}

type Period = 'all' | '3m' | '6m' | '1y';
type ChartTab = 'pages' | 'time' | 'speed' | 'books' | 'categories';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const VIBRANT_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#ef4444', '#3b82f6', '#84cc16',
];

const STATUS_COLORS = {
  Lendo: '#3b82f6',
  Concluídos: '#10b981',
  'Não iniciados': '#94a3b8',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">{typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR') : entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export function ReadingReportsView({ books, readings, statuses }: ReadingReportsViewProps) {
  const [period, setPeriod] = useState<Period>('all');
  const [activeTab, setActiveTab] = useState<ChartTab>('pages');
  const [selectedRecoveryId, setSelectedRecoveryId] = useState<'calmo' | 'equilibrado' | 'acelerado' | null>(null);
  const [selectedLastBookId, setSelectedLastBookId] = useState<string | null>(null);

  // Helper: check if a book is Bible category
  const isBibleBook = useCallback((bookId: string) => {
    const book = books.find(b => b.id === bookId);
    const cat = book?.categoria?.toLowerCase();
    return cat === 'bíblia' || cat === 'biblia';
  }, [books]);

  const filteredReadings = useMemo(() => {
    if (period === 'all') return readings;
    const now = new Date();
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
    return readings.filter(r => r.dataInicio ? new Date(r.dataInicio) >= cutoff : true);
  }, [readings, period]);

  // Pre-calculate correct pages per book using same logic as BookMetricsDialog
  // Bible: MAX(end_page), Non-Bible: SUM(quantidadePaginas)
  const correctPagesPerBook = useMemo(() => {
    const map = new Map<string, number>();
    const bookReadingsMap = new Map<string, DailyReading[]>();

    // Group readings by book
    filteredReadings.forEach(r => {
      if (!bookReadingsMap.has(r.livroId)) bookReadingsMap.set(r.livroId, []);
      bookReadingsMap.get(r.livroId)!.push(r);
    });

    bookReadingsMap.forEach((bookReadings, bookId) => {
      if (isBibleBook(bookId)) {
        // Bible: MAX(end_page) is the total pages read
        map.set(bookId, bookReadings.length > 0 ? Math.max(...bookReadings.map(r => r.paginaFinal)) : 0);
      } else {
        // Non-Bible: SUM
        map.set(bookId, bookReadings.reduce((sum, r) => sum + r.quantidadePaginas, 0));
      }
    });
    return map;
  }, [filteredReadings, isBibleBook]);

  // Calculate correct time per book (Bible: group by day, MAX per day)
  const correctTimePerBook = useMemo(() => {
    const map = new Map<string, number>();
    const bookReadingsMap = new Map<string, DailyReading[]>();

    filteredReadings.forEach(r => {
      if (!bookReadingsMap.has(r.livroId)) bookReadingsMap.set(r.livroId, []);
      bookReadingsMap.get(r.livroId)!.push(r);
    });

    bookReadingsMap.forEach((bookReadings, bookId) => {
      if (isBibleBook(bookId)) {
        // Group by day, take MAX time per day
        const timeByDay: Record<string, number> = {};
        for (const reading of bookReadings) {
          const dateKey = reading.dataInicio 
            ? new Date(reading.dataInicio).toISOString().split('T')[0]
            : `${reading.dia}/${reading.mes}`;
          timeByDay[dateKey] = Math.max(timeByDay[dateKey] || 0, reading.tempoGasto);
        }
        map.set(bookId, Object.values(timeByDay).reduce((sum, t) => sum + t, 0));
      } else {
        map.set(bookId, bookReadings.reduce((sum, r) => sum + r.tempoGasto, 0));
      }
    });
    return map;
  }, [filteredReadings, isBibleBook]);

  // Pages per month — correct for Bible (incremental MAX per month)
  const pagesPerMonth = useMemo(() => {
    const monthMap = new Map<string, number>();

    // Group all readings by bookId
    const bookReadingsMap = new Map<string, DailyReading[]>();
    filteredReadings.forEach(r => {
      if (!r.dataInicio) return;
      if (!bookReadingsMap.has(r.livroId)) bookReadingsMap.set(r.livroId, []);
      bookReadingsMap.get(r.livroId)!.push(r);
    });

    bookReadingsMap.forEach((bookReadings, bookId) => {
      if (isBibleBook(bookId)) {
        // For Bible: group readings by month, compute incremental MAX
        const readingsByMonth = new Map<string, DailyReading[]>();
        bookReadings.filter(r => r.dataInicio).forEach(r => {
          const d = new Date(r.dataInicio!);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!readingsByMonth.has(key)) readingsByMonth.set(key, []);
          readingsByMonth.get(key)!.push(r);
        });

        // Sort months chronologically
        const sortedMonths = [...readingsByMonth.keys()].sort();
        let prevMax = 0;
        for (const monthKey of sortedMonths) {
          const monthReadings = readingsByMonth.get(monthKey)!;
          const monthMax = Math.max(...monthReadings.map(r => r.paginaFinal));
          const pagesThisMonth = Math.max(0, monthMax - prevMax);
          monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + pagesThisMonth);
          prevMax = monthMax;
        }
      } else {
        // Non-Bible: sum quantidadePaginas per month
        bookReadings.filter(r => r.dataInicio).forEach(r => {
          const d = new Date(r.dataInicio!);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap.set(key, (monthMap.get(key) || 0) + r.quantidadePaginas);
        });
      }
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, pages]) => {
        const [year, month] = key.split('-');
        return { name: `${MONTHS_PT[parseInt(month) - 1]} ${year.slice(2)}`, pages };
      });
  }, [filteredReadings, isBibleBook]);

  // Time per month — correct for Bible (group by day, MAX per day)
  const timePerMonth = useMemo(() => {
    const monthMap = new Map<string, number>();

    // Group by book first
    const bookReadingsMap = new Map<string, DailyReading[]>();
    filteredReadings.forEach(r => {
      if (!r.dataInicio) return;
      if (!bookReadingsMap.has(r.livroId)) bookReadingsMap.set(r.livroId, []);
      bookReadingsMap.get(r.livroId)!.push(r);
    });

    bookReadingsMap.forEach((bookReadings, bookId) => {
      if (isBibleBook(bookId)) {
        // Group by day, MAX per day, then aggregate to month
        const timeByDay = new Map<string, { month: string; time: number }>();
        bookReadings.filter(r => r.dataInicio).forEach(r => {
          const d = new Date(r.dataInicio!);
          const dayKey = d.toISOString().split('T')[0];
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const existing = timeByDay.get(dayKey);
          if (!existing || r.tempoGasto > existing.time) {
            timeByDay.set(dayKey, { month: monthKey, time: r.tempoGasto });
          }
        });
        timeByDay.forEach(({ month, time }) => {
          monthMap.set(month, (monthMap.get(month) || 0) + time);
        });
      } else {
        bookReadings.filter(r => r.dataInicio).forEach(r => {
          const d = new Date(r.dataInicio!);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap.set(key, (monthMap.get(key) || 0) + r.tempoGasto);
        });
      }
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, minutes]) => {
        const [year, month] = key.split('-');
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return {
          name: `${MONTHS_PT[parseInt(month) - 1]} ${year.slice(2)}`,
          horas: parseFloat((minutes / 60).toFixed(1)),
          label: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
        };
      });
  }, [filteredReadings, isBibleBook]);

  const booksByStatus = useMemo(() => {
    const counts = { 'Lendo': 0, 'Concluido': 0, 'Não iniciado': 0 };
    statuses.forEach(s => {
      if (s.status in counts) counts[s.status as keyof typeof counts]++;
    });
    return [
      { name: 'Lendo', value: counts['Lendo'], color: STATUS_COLORS.Lendo },
      { name: 'Concluídos', value: counts['Concluido'], color: STATUS_COLORS['Concluídos'] },
      { name: 'Não iniciados', value: counts['Não iniciado'], color: STATUS_COLORS['Não iniciados'] },
    ].filter(d => d.value > 0);
  }, [statuses]);

  const booksByCategory = useMemo(() => {
    const map = new Map<string, number>();
    books.forEach(b => {
      const cat = b.categoria || 'Sem categoria';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [books]);

  const summaryStats = useMemo(() => {
    // Total pages: sum of correct per-book totals
    const totalPages = Array.from(correctPagesPerBook.values()).reduce((sum, p) => sum + p, 0);
    
    // Total time: sum of correct per-book totals
    const totalMinutes = Array.from(correctTimePerBook.values()).reduce((sum, t) => sum + t, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = Math.round(totalMinutes % 60);
    const timeFormatted = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

    // Unique reading days (considering Bible grouping)
    const uniqueDays = new Set<string>();
    filteredReadings.forEach(r => {
      if (!r.dataInicio) return;
      uniqueDays.add(new Date(r.dataInicio).toISOString().split('T')[0]);
    });
    const avgPagesPerDay = uniqueDays.size > 0 ? totalPages / uniqueDays.size : 0;

    // Streak
    const sortedDates = [...uniqueDays].sort().reverse();
    let streak = 0;
    if (sortedDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      let checkDate = today;
      for (const date of sortedDates) {
        if (date === checkDate || date === getPreviousDay(checkDate)) {
          streak++;
          checkDate = date;
        } else if (date < checkDate) {
          break;
        }
      }
    }

    const booksCompleted = statuses.filter(s => s.status === 'Concluido').length;
    return { totalPages, timeFormatted, uniqueDays: uniqueDays.size, avgPagesPerDay, booksCompleted, streak };
  }, [filteredReadings, statuses, correctPagesPerBook, correctTimePerBook]);

  const cumulativePages = useMemo(() => {
    if (pagesPerMonth.length === 0) return [];
    let cumulative = 0;
    return pagesPerMonth.map(d => {
      cumulative += d.pages;
      return { name: d.name, total: cumulative };
    });
  }, [pagesPerMonth]);

  const pagesPerBook = useMemo(() => {
    // Use correct per-book totals
    const bookNames = new Map<string, string>();
    filteredReadings.forEach(r => {
      if (!bookNames.has(r.livroId)) bookNames.set(r.livroId, r.livroLido);
    });

    return Array.from(correctPagesPerBook.entries())
      .map(([bookId, pages]) => ({
        name: (bookNames.get(bookId) || 'Desconhecido').length > 18 
          ? (bookNames.get(bookId) || 'Desconhecido').slice(0, 18) + '…' 
          : bookNames.get(bookId) || 'Desconhecido',
        pages,
      }))
      .filter(d => d.pages > 0)
      .sort((a, b) => b.pages - a.pages)
      .slice(0, 8);
  }, [correctPagesPerBook, filteredReadings]);

  // ===== Velocidade de leitura (páginas/hora) =====
  const MOVING_WINDOW = 7;
  const speedOverTime = useMemo(() => {
    // Agrupa por dia: páginas lidas / horas gastas (Bíblia usa MAX por dia)
    const byDay = new Map<string, { pages: number; minutes: number; date: Date }>();
    filteredReadings.forEach(r => {
      const raw = r.dataInicio ? new Date(r.dataInicio) : (r.created_at ? new Date(r.created_at) : null);
      if (!raw || isNaN(raw.getTime())) return;
      const key = raw.toISOString().split('T')[0];
      const entry = byDay.get(key) || { pages: 0, minutes: 0, date: new Date(key) };
      if (isBibleBook(r.livroId)) {
        entry.pages += Math.max(0, r.quantidadePaginas);
        entry.minutes = Math.max(entry.minutes, r.tempoGasto);
      } else {
        entry.pages += Math.max(0, r.quantidadePaginas);
        entry.minutes += r.tempoGasto;
      }
      byDay.set(key, entry);
    });

    const rows = [...byDay.entries()]
      .filter(([, v]) => v.minutes > 0 && v.pages > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, v]) => ({
        key,
        name: v.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        velocidade: Number(((v.pages / v.minutes) * 60).toFixed(1)),
      }));

    // Média móvel de 7 pontos
    return rows.map((row, i) => {
      const window = rows.slice(Math.max(0, i - (MOVING_WINDOW - 1)), i + 1);
      const avg = window.reduce((sum, w) => sum + w.velocidade, 0) / window.length;
      return { ...row, media: Number(avg.toFixed(1)) };
    });
  }, [filteredReadings, isBibleBook]);

  const speedByBook = useMemo(() => {
    const map = new Map<string, { pages: number; minutes: number }>();
    filteredReadings.forEach(r => {
      const entry = map.get(r.livroId) || { pages: 0, minutes: 0 };
      entry.pages += Math.max(0, r.quantidadePaginas);
      entry.minutes += r.tempoGasto;
      map.set(r.livroId, entry);
    });
    return [...map.entries()]
      .filter(([, v]) => v.minutes > 0 && v.pages > 0)
      .map(([bookId, v]) => {
        const book = books.find(b => b.id === bookId);
        return {
          name: (book?.livro || 'Sem título').length > 26 ? (book?.livro || '').slice(0, 26) + '…' : (book?.livro || 'Sem título'),
          velocidade: Number(((v.pages / v.minutes) * 60).toFixed(1)),
          paginas: v.pages,
          horas: Number((v.minutes / 60).toFixed(1)),
        };
      })
      .sort((a, b) => b.velocidade - a.velocidade)
      .slice(0, 12);
  }, [filteredReadings, books]);

  const overallSpeed = useMemo(() => {
    const totals = filteredReadings.reduce(
      (acc, r) => ({ pages: acc.pages + Math.max(0, r.quantidadePaginas), minutes: acc.minutes + r.tempoGasto }),
      { pages: 0, minutes: 0 },
    );
    return totals.minutes > 0 ? Number(((totals.pages / totals.minutes) * 60).toFixed(1)) : 0;
  }, [filteredReadings]);

  const tabs = [
    { id: 'pages' as ChartTab, label: 'Páginas', icon: BarChart3, color: '#6366f1' },
    { id: 'time' as ChartTab, label: 'Tempo', icon: Clock, color: '#f59e0b' },
    { id: 'speed' as ChartTab, label: 'Velocidade', icon: Gauge, color: '#0ea5e9' },
    { id: 'books' as ChartTab, label: 'Livros', icon: BookOpen, color: '#10b981' },
    { id: 'categories' as ChartTab, label: 'Categorias', icon: PieChartIcon, color: '#f43f5e' },
  ];

  const summaryCards = [
    {
      label: 'Páginas lidas',
      value: summaryStats.totalPages.toLocaleString('pt-BR'),
      icon: BookOpen,
      gradient: 'from-indigo-500 to-purple-600',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Tempo total',
      value: summaryStats.timeFormatted,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Dias lendo',
      value: summaryStats.uniqueDays.toString(),
      icon: Calendar,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Média págs/dia',
      value: summaryStats.avgPagesPerDay.toFixed(1),
      icon: TrendingUp,
      gradient: 'from-blue-500 to-cyan-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Sequência',
      value: `${summaryStats.streak} dias`,
      icon: Flame,
      gradient: 'from-rose-500 to-pink-600',
      iconBg: 'bg-rose-100 dark:bg-rose-900/40',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Concluídos',
      value: summaryStats.booksCompleted.toString(),
      icon: Target,
      gradient: 'from-violet-500 to-fuchsia-600',
      iconBg: 'bg-violet-100 dark:bg-violet-900/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
  ];

  // ===== Livros com leitura registrada (para navegação) =====
  const startOfDay = useCallback((x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()), []);
  const readingDate = useCallback((r: DailyReading): Date | null => {
    const d = r.dataInicio ? new Date(r.dataInicio) : (r.created_at ? new Date(r.created_at) : null);
    return d && !isNaN(d.getTime()) ? d : null;
  }, []);

  const booksWithReadings = useMemo(() => {
    const map = new Map<string, { bookId: string; name: string; last: Date }>();
    readings.forEach(r => {
      const d = readingDate(r);
      if (!d) return;
      const book = books.find(b => b.id === r.livroId);
      const name = book?.livro || r.livroLido || 'Livro não identificado';
      const cur = map.get(r.livroId);
      if (!cur || d.getTime() > cur.last.getTime()) map.set(r.livroId, { bookId: r.livroId, name, last: d });
    });
    return Array.from(map.values()).sort((a, b) => b.last.getTime() - a.last.getTime());
  }, [readings, books, readingDate]);

  const activeBookId = selectedLastBookId && booksWithReadings.some(b => b.bookId === selectedLastBookId)
    ? selectedLastBookId
    : booksWithReadings[0]?.bookId ?? null;
  const activeIndex = booksWithReadings.findIndex(b => b.bookId === activeBookId);

  // ===== Última leitura registrada do livro selecionado =====
  const lastReadingInfo = useMemo(() => {
    if (!activeBookId) return null;
    const withDates = readings
      .filter(r => r.livroId === activeBookId)
      .map(r => ({ r, d: readingDate(r) }))
      .filter((x): x is { r: DailyReading; d: Date } => !!x.d);
    if (!withDates.length) return null;
    withDates.sort((a, b) => b.d.getTime() - a.d.getTime());
    const { r, d } = withDates[0];
    const book = books.find(b => b.id === activeBookId);
    const bookName = book?.livro || r.livroLido || 'Livro não identificado';
    const totalPages = book?.totalPaginas || 0;

    const daysSince = Math.max(0, Math.round((startOfDay(new Date()).getTime() - startOfDay(d).getTime()) / 86400000));

    // Página atual real do livro (Bíblia: MAX; demais: SOMA)
    const allOfBook = withDates.map(x => x.r);
    const pagesOfBook = isBibleBook(activeBookId)
      ? Math.max(...allOfBook.map(x => x.paginaFinal))
      : allOfBook.reduce((sum, x) => sum + Math.max(0, x.quantidadePaginas), 0);

    return {
      bookId: activeBookId,
      book,
      bookName,
      page: isBibleBook(activeBookId) ? pagesOfBook : Math.max(r.paginaFinal, pagesOfBook),
      pagesOfBook,
      totalPages,
      date: d,
      dateLabel: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
      daysSince,
      pagesRead: r.quantidadePaginas,
      minutes: r.tempoGasto,
      bibleRef: r.bibleBook
        ? `${r.bibleBook}${r.bibleChapter ? ' ' + r.bibleChapter : ''}${r.bibleVerseStart ? ':' + r.bibleVerseStart : ''}${r.bibleVerseEnd && r.bibleVerseEnd !== r.bibleVerseStart ? '-' + r.bibleVerseEnd : ''}`
        : null,
      allOfBook,
    };
  }, [activeBookId, readings, books, readingDate, startOfDay, isBibleBook]);
  // ===== Livro já concluído? =====
  const isActiveBookCompleted = useMemo(() => {
    if (!lastReadingInfo) return false;
    const st = statuses.find(s => s.livroId === lastReadingInfo.bookId);
    if (st?.status === 'Concluido') return true;
    return !!lastReadingInfo.totalPages && lastReadingInfo.page >= lastReadingInfo.totalPages;
  }, [lastReadingInfo, statuses]);


  // ===== Assistente de recuperação do plano de leitura =====
  const recovery = useMemo(() => {
    if (!lastReadingInfo) return null;
    const { book, daysSince, totalPages, pagesOfBook, allOfBook } = lastReadingInfo;
    const today = startOfDay(new Date());

    // Ritmo base do plano: 4 páginas/capítulos por dia (leitura diária normal).
    // Se o livro tem data prevista de conclusão, o ritmo do plano vem dela.
    const DEFAULT_PACE = 4;
    let planPace = DEFAULT_PACE;
    let planDeadline: Date | null = null;

    const firstDate = allOfBook
      .map(readingDate)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const start = firstDate ? startOfDay(firstDate) : today;
    const elapsedDays = Math.max(1, Math.round((today.getTime() - start.getTime()) / 86400000) + 1);

    if (book?.targetCompletionDate) {
      const target = startOfDay(new Date(book.targetCompletionDate));
      if (!isNaN(target.getTime())) {
        planDeadline = target;
        const planDays = Math.max(1, Math.round((target.getTime() - start.getTime()) / 86400000) + 1);
        if (totalPages > 0) planPace = Math.max(1, Math.round(totalPages / planDays));
      }
    }

    // Atraso = o que deveria ter sido lido até hoje − o que realmente foi lido.
    // Assim, cada novo registro de leitura reduz automaticamente o atraso.
    const expected = totalPages > 0
      ? Math.min(totalPages, elapsedDays * planPace)
      : elapsedDays * planPace;
    let backlogPages = Math.round(expected - pagesOfBook);
    if (totalPages > 0) backlogPages = Math.min(backlogPages, Math.max(0, totalPages - pagesOfBook));
    backlogPages = Math.max(0, backlogPages);

    const backlogDays = Math.ceil(backlogPages / planPace);
    const remainingPages = totalPages > 0 ? Math.max(0, totalPages - pagesOfBook) : null;
    const isBehind = backlogPages > 0;

    // Ritmos sustentáveis: nunca acima de 1,5× o ritmo do plano.
    const mk = (id: 'calmo' | 'equilibrado' | 'acelerado', emoji: string, label: string, factor: number, note: string) => {
      const extra = Math.max(1, Math.round(planPace * factor));
      const days = Math.max(1, Math.ceil(backlogPages / extra));
      const finish = new Date(today.getTime() + days * 86400000);
      return {
        id, emoji, label, note, extra, days, finish,
        perDay: planPace + extra,
        finishLabel: finish.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      };
    };
    const strategies = isBehind
      ? [
          mk('calmo', '🐢', 'Tranquilo', 0.5, `Leitura normal (${planPace}) + pouco extra: mal muda sua rotina.`),
          mk('equilibrado', '👍', 'Equilibrado', 1, 'Recomendado: dobra a leitura do dia e recupera rápido sem cansar.'),
          mk('acelerado', '🔥', 'Acelerado', 1.5, 'Para quem quer ficar em dia o quanto antes.'),
        ]
      : [];

    return { planPace, backlogPages, backlogDays, remainingPages, isBehind, strategies, planDeadline, pagesOfBook, daysSince, elapsedDays };
  }, [lastReadingInfo, startOfDay, readingDate]);

  const selectedStrategy = recovery?.strategies.find(s => s.id === selectedRecoveryId) || null;

  const recoverySchedule = useMemo(() => {
    if (!recovery || !selectedStrategy) return [];
    const today = new Date();
    let remaining = recovery.backlogPages;
    const rows: Array<{ dayLabel: string; dayPages: number; recoveryPages: number; remaining: number }> = [];
    for (let i = 0; i < Math.min(selectedStrategy.days, 14) && remaining > 0; i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const recoveryPages = Math.min(selectedStrategy.extra, remaining);
      remaining -= recoveryPages;
      rows.push({
        dayLabel: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        dayPages: recovery.planPace,
        recoveryPages,
        remaining: Math.max(0, Math.round(remaining)),
      });
    }
    return rows;
  }, [recovery, selectedStrategy]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-500" />
            Relatórios de Leitura
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Análise detalhada do seu progresso literário</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-44 border-2 border-indigo-200 dark:border-indigo-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📅 Todo período</SelectItem>
            <SelectItem value="3m">📊 Últimos 3 meses</SelectItem>
            <SelectItem value="6m">📈 Últimos 6 meses</SelectItem>
            <SelectItem value="1y">🗓️ Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards - Gradient */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl border border-border bg-card p-4 hover:shadow-lg transition-all duration-300 group">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity`} />
            <div className="relative">
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center mb-2`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <p className="text-xl font-bold text-foreground">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Última leitura */}
      {lastReadingInfo && (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-cyan-500 opacity-[0.06]" />
          <div className="relative space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold text-foreground">Sua última leitura</h3>
              {lastReadingInfo.daysSince === 0 ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Hoje</span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {lastReadingInfo.daysSince} {lastReadingInfo.daysSince === 1 ? 'dia' : 'dias'} atrás
                </span>
              )}

              {/* Navegação entre livros */}
              <div className="flex items-center gap-1.5 ml-auto">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Livro anterior"
                  disabled={activeIndex <= 0}
                  onClick={() => {
                    const prev = booksWithReadings[activeIndex - 1];
                    if (prev) { setSelectedLastBookId(prev.bookId); setSelectedRecoveryId(null); }
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Select
                  value={activeBookId ?? undefined}
                  onValueChange={(v) => { setSelectedLastBookId(v); setSelectedRecoveryId(null); }}
                >
                  <SelectTrigger className="h-8 w-52 text-xs">
                    <SelectValue placeholder="Escolher livro" />
                  </SelectTrigger>
                  <SelectContent>
                    {booksWithReadings.map(b => (
                      <SelectItem key={b.bookId} value={b.bookId} className="text-xs">
                        📚 {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Próximo livro"
                  disabled={activeIndex < 0 || activeIndex >= booksWithReadings.length - 1}
                  onClick={() => {
                    const next = booksWithReadings[activeIndex + 1];
                    if (next) { setSelectedLastBookId(next.bookId); setSelectedRecoveryId(null); }
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1">
              Livro {activeIndex + 1} de {booksWithReadings.length} com leitura registrada — navegue para ver a última leitura de cada um.
            </p>


            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-background/70 border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Último livro lido</p>
                <p className="font-semibold text-foreground text-sm truncate" title={lastReadingInfo.bookName}>{lastReadingInfo.bookName}</p>
              </div>
              <div className="rounded-lg bg-background/70 border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Última página</p>
                <p className="font-semibold text-foreground text-sm">
                  {lastReadingInfo.page}{lastReadingInfo.totalPages ? ` de ${lastReadingInfo.totalPages}` : ''}
                </p>
              </div>
              <div className="rounded-lg bg-background/70 border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Último dia</p>
                <p className="font-semibold text-foreground text-sm capitalize">
                  {lastReadingInfo.weekday}, {lastReadingInfo.dateLabel}
                </p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
              <p>
                📖 Sua última leitura foi <span className="font-semibold text-foreground">{lastReadingInfo.bookName}</span>
                {lastReadingInfo.bibleRef ? <> (<span className="font-medium text-foreground">{lastReadingInfo.bibleRef}</span>)</> : null}
                , em <span className="font-semibold text-foreground capitalize">{lastReadingInfo.weekday}</span>, {lastReadingInfo.dateLabel}
                {lastReadingInfo.pagesRead > 0 ? <>, com <span className="font-semibold text-foreground">{lastReadingInfo.pagesRead}</span> página(s) lida(s)</> : null}
                {lastReadingInfo.minutes > 0 ? <> em <span className="font-semibold text-foreground">{Math.floor(lastReadingInfo.minutes)}min</span></> : null}.
              </p>
              <p>
                🔖 Você parou na página <span className="font-semibold text-foreground">{lastReadingInfo.page}</span>
                {lastReadingInfo.totalPages ? <> de <span className="font-semibold text-foreground">{lastReadingInfo.totalPages}</span></> : null}.
              </p>
              <p>
                {lastReadingInfo.daysSince === 0
                  ? '✅ Você já registrou leitura hoje. Continue assim!'
                  : <>⏳ Já tem <span className="font-semibold text-foreground">{lastReadingInfo.daysSince}</span> {lastReadingInfo.daysSince === 1 ? 'dia' : 'dias'} sem registro de leitura desde a última vez.</>}
              </p>
            </div>

            {/* Leitura concluída */}
            {isActiveBookCompleted && (
              <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-200">
                <p className="font-semibold text-base flex items-center gap-2">
                  🎉 Parabéns! Essa leitura já foi concluída.
                </p>
                <p className="text-sm mt-1">
                  Você finalizou <span className="font-semibold">{lastReadingInfo.bookName}</span>
                  {lastReadingInfo.totalPages ? <> — {lastReadingInfo.totalPages} página(s)</> : null}, concluído em{' '}
                  <span className="font-semibold capitalize">{lastReadingInfo.weekday}</span>, {lastReadingInfo.dateLabel}.
                </p>
                <p className="text-xs mt-1 opacity-90">
                  Em “Status dos Livros” você pode clicar neste livro para reiniciar a leitura — o histórico atual fica guardado.
                </p>
              </div>
            )}

            {/* Assistente de recuperação */}
            {!isActiveBookCompleted && recovery && !recovery.isBehind && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                🌱 Tudo em dia! Você está acompanhando o seu plano de leitura normalmente. Continue nesse ritmo de{' '}
                <span className="font-semibold">{recovery.planPace} página(s) por dia</span> — a constância é o que mais importa.
              </div>
            )}

            {!isActiveBookCompleted && recovery?.isBehind && (
              <div className="space-y-3 rounded-lg border border-border bg-background/70 p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Você está aproximadamente {recovery.backlogDays} {recovery.backlogDays === 1 ? 'dia' : 'dias'} atrasado
                    {' '}({recovery.backlogPages} {unit.many} para colocar em dia).
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ritmo do seu plano: {recovery.planPace} {unit.many} por dia (leitura diária normal)
                    {recovery.remainingPages !== null ? ` · faltam ${recovery.remainingPages} ${unit.many} para concluir ${unit.isBible ? 'a leitura' : 'o livro'}` : ''}.
                    Você já leu {recovery.pagesOfBook} {unit.many} em {recovery.elapsedDays} dia(s) de plano.
                    Sem culpa nenhuma — o importante é retomar hoje. Cada leitura registrada diminui esse atraso automaticamente.
                  </p>
                </div>

                <p className="text-sm text-foreground">Você pode recuperar esse atraso de três formas:</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {recovery.strategies.map(st => {
                    const isActive = selectedRecoveryId === st.id;
                    const isRecommended = st.id === 'equilibrado';
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedRecoveryId(isActive ? null : st.id)}
                        className={`text-left rounded-lg border p-3 transition-all hover:shadow-md ${
                          isActive ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-950/30' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{st.emoji}</span>
                          <span className="font-semibold text-sm text-foreground">{st.label}</span>
                          {isRecommended && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              recomendado
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground mt-1.5">{st.perDay} por dia ({recovery.planPace} normal + {st.extra} extra)</p>
                        <p className="text-xs text-muted-foreground">≈ {st.days} {st.days === 1 ? 'dia' : 'dias'} para eliminar o atraso</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{st.note}</p>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  💡 Nossa sugestão: escolha o ritmo equilibrado para recuperar o atraso sem tornar a leitura pesada.
                </p>

                {selectedStrategy && (
                  <div className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 p-3 space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {selectedStrategy.emoji} Plano de recuperação — ritmo {selectedStrategy.label.toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Leia <span className="font-semibold text-foreground">{selectedStrategy.perDay} {unit.many} por dia</span>{' '}
                      ({recovery.planPace} do dia + {selectedStrategy.extra} de recuperação). Previsão de ficar em dia:{' '}
                      <span className="font-semibold text-foreground">{selectedStrategy.finishLabel}</span>.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground text-left">
                            <th className="py-1 pr-3 font-medium">Dia</th>
                            <th className="py-1 pr-3 font-medium">Leitura do dia</th>
                            <th className="py-1 pr-3 font-medium">Recuperação</th>
                            <th className="py-1 font-medium">Atraso restante</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recoverySchedule.map((row, i) => (
                            <tr key={i} className="border-t border-border/60">
                              <td className="py-1 pr-3 capitalize text-foreground">{row.dayLabel}</td>
                              <td className="py-1 pr-3">{row.dayPages} {unit.short}</td>
                              <td className="py-1 pr-3 text-indigo-600 dark:text-indigo-400">+{row.recoveryPages} {unit.short}</td>
                              <td className="py-1">{row.remaining} {unit.short}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {selectedStrategy.days > recoverySchedule.length && (
                      <p className="text-[11px] text-muted-foreground">
                        Mostrando os primeiros {recoverySchedule.length} dias — mantenha esse ritmo até {selectedStrategy.finishLabel}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted/60 p-1.5 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            className={`gap-1.5 whitespace-nowrap rounded-lg transition-all ${
              activeTab === tab.id ? 'shadow-md' : 'hover:bg-background'
            }`}
            style={activeTab === tab.id ? { backgroundColor: tab.color } : {}}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Charts */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              Páginas lidas por mês
            </h3>
            {pagesPerMonth.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pagesPerMonth}>
                    <defs>
                      <linearGradient id="pagesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pages" fill="url(#pagesGradient)" radius={[6, 6, 0, 0]} name="Páginas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState />}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Progresso acumulado
            </h3>
            {cumulativePages.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativePages}>
                    <defs>
                      <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2.5} fill="url(#cumulativeGradient)" name="Total acumulado" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState />}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              Top livros por páginas lidas
            </h3>
            {pagesPerBook.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pagesPerBook} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pages" name="Páginas" radius={[0, 6, 6, 0]}>
                      {pagesPerBook.map((_, index) => (
                        <Cell key={index} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState />}
          </div>
        </div>
      )}

      {activeTab === 'time' && (
        <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            Tempo de leitura por mês
          </h3>
          {timePerMonth.length > 0 ? (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timePerMonth}>
                  <defs>
                    <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="horas" fill="url(#timeGradient)" radius={[6, 6, 0, 0]} name="Horas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState />}
        </div>
      )}

      {activeTab === 'speed' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                Evolução da velocidade de leitura (páginas/hora)
              </h3>
              <span className="text-xs text-muted-foreground">
                Média geral: <span className="font-semibold text-foreground">{overallSpeed} pág/h</span> · média móvel de {MOVING_WINDOW} registros
              </span>
            </div>
            {speedOverTime.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={speedOverTime}>
                    <defs>
                      <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit=" p/h" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="velocidade" stroke="#0ea5e9" strokeWidth={2} fill="url(#speedGradient)" name="Velocidade" />
                    <Line type="monotone" dataKey="media" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name={`Média móvel (${MOVING_WINDOW})`} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState />}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-violet-500" />
              Comparativo de velocidade entre livros
            </h3>
            {speedByBook.length > 0 ? (
              <div style={{ height: Math.max(240, speedByBook.length * 34) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={speedByBook} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit=" p/h" />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="velocidade" radius={[0, 6, 6, 0]} name="Páginas/hora">
                      {speedByBook.map((_, i) => (
                        <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState />}
          </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            Distribuição por status
          </h3>
          {booksByStatus.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
              <div className="w-52 h-52 md:w-64 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={booksByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                    >
                      {booksByStatus.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {booksByStatus.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-2.5">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-foreground font-medium">{item.name}</span>
                    <span className="text-lg font-bold text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyState />}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-500" />
            Livros por categoria
          </h3>
          {booksByCategory.length > 0 ? (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={booksByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Livros" radius={[6, 6, 0, 0]}>
                    {booksByCategory.map((_, index) => (
                      <Cell key={index} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState />}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
        <BarChart3 className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">Sem dados para o período selecionado</p>
    </div>
  );
}

function getPreviousDay(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}
