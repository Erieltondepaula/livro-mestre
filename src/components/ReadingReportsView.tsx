import { useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { BookOpen, Clock, TrendingUp, Calendar, BarChart3, PieChart as PieChartIcon, Flame, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Book, DailyReading, BookStatus } from '@/types/library';

interface ReadingReportsViewProps {
  books: Book[];
  readings: DailyReading[];
  statuses: BookStatus[];
}

type Period = 'all' | '3m' | '6m' | '1y';
type ChartTab = 'pages' | 'time' | 'books' | 'categories';

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

  const tabs = [
    { id: 'pages' as ChartTab, label: 'Páginas', icon: BarChart3, color: '#6366f1' },
    { id: 'time' as ChartTab, label: 'Tempo', icon: Clock, color: '#f59e0b' },
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
