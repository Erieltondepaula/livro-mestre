import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart } from 'recharts';
import { BookOpen, Clock, TrendingUp, Calendar, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
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
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c43',
  '#a05195',
];

export function ReadingReportsView({ books, readings, statuses }: ReadingReportsViewProps) {
  const [period, setPeriod] = useState<Period>('all');
  const [activeTab, setActiveTab] = useState<ChartTab>('pages');

  // Filter readings by period
  const filteredReadings = useMemo(() => {
    if (period === 'all') return readings;
    const now = new Date();
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
    return readings.filter(r => {
      if (r.dataInicio) return new Date(r.dataInicio) >= cutoff;
      return true;
    });
  }, [readings, period]);

  // Pages per month
  const pagesPerMonth = useMemo(() => {
    const map = new Map<string, number>();
    filteredReadings.forEach(r => {
      if (!r.dataInicio) return;
      const d = new Date(r.dataInicio);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + r.quantidadePaginas);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, pages]) => {
        const [year, month] = key.split('-');
        return { name: `${MONTHS_PT[parseInt(month) - 1]} ${year.slice(2)}`, pages };
      });
  }, [filteredReadings]);

  // Reading time per month (in hours)
  const timePerMonth = useMemo(() => {
    const map = new Map<string, number>();
    filteredReadings.forEach(r => {
      if (!r.dataInicio) return;
      const d = new Date(r.dataInicio);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + r.tempoGasto);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, minutes]) => {
        const [year, month] = key.split('-');
        return { name: `${MONTHS_PT[parseInt(month) - 1]} ${year.slice(2)}`, horas: parseFloat((minutes / 60).toFixed(1)) };
      });
  }, [filteredReadings]);

  // Books by status
  const booksByStatus = useMemo(() => {
    const counts = { 'Lendo': 0, 'Concluido': 0, 'Não iniciado': 0 };
    statuses.forEach(s => {
      if (s.status in counts) counts[s.status as keyof typeof counts]++;
    });
    return [
      { name: 'Lendo', value: counts['Lendo'], color: 'hsl(var(--chart-2))' },
      { name: 'Concluídos', value: counts['Concluido'], color: 'hsl(var(--chart-3))' },
      { name: 'Não iniciados', value: counts['Não iniciado'], color: 'hsl(var(--muted-foreground))' },
    ].filter(d => d.value > 0);
  }, [statuses]);

  // Books by category
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

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalPages = filteredReadings.reduce((sum, r) => sum + r.quantidadePaginas, 0);
    const totalMinutes = filteredReadings.reduce((sum, r) => sum + r.tempoGasto, 0);
    const totalHours = totalMinutes / 60;
    const uniqueDays = new Set(filteredReadings.filter(r => r.dataInicio).map(r => new Date(r.dataInicio!).toISOString().split('T')[0])).size;
    const avgPagesPerDay = uniqueDays > 0 ? totalPages / uniqueDays : 0;
    const booksCompleted = statuses.filter(s => s.status === 'Concluido').length;
    return { totalPages, totalHours, uniqueDays, avgPagesPerDay, booksCompleted };
  }, [filteredReadings, statuses]);

  // Cumulative pages over time
  const cumulativePages = useMemo(() => {
    if (pagesPerMonth.length === 0) return [];
    let cumulative = 0;
    return pagesPerMonth.map(d => {
      cumulative += d.pages;
      return { name: d.name, total: cumulative };
    });
  }, [pagesPerMonth]);

  // Pages per book (top 10)
  const pagesPerBook = useMemo(() => {
    const map = new Map<string, number>();
    filteredReadings.forEach(r => {
      map.set(r.livroLido, (map.get(r.livroLido) || 0) + r.quantidadePaginas);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, pages]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, pages }));
  }, [filteredReadings]);

  const tabs = [
    { id: 'pages' as ChartTab, label: 'Páginas', icon: BarChart3 },
    { id: 'time' as ChartTab, label: 'Tempo', icon: Clock },
    { id: 'books' as ChartTab, label: 'Livros', icon: BookOpen },
    { id: 'categories' as ChartTab, label: 'Categorias', icon: PieChartIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Relatórios de Leitura</h2>
          <p className="text-sm text-muted-foreground">Análise detalhada do seu progresso</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="1y">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-primary">{summaryStats.totalPages.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Páginas lidas</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-primary">{summaryStats.totalHours.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Horas lendo</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-primary">{summaryStats.uniqueDays}</p>
          <p className="text-xs text-muted-foreground">Dias de leitura</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-primary">{summaryStats.avgPagesPerDay.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Média págs/dia</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-primary">{summaryStats.booksCompleted}</p>
          <p className="text-xs text-muted-foreground">Livros concluídos</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            className="gap-1.5 whitespace-nowrap"
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
          {/* Pages per month bar chart */}
          <div className="card-library p-4 md:p-6">
            <h3 className="font-semibold text-foreground mb-4">Páginas lidas por mês</h3>
            {pagesPerMonth.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pagesPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="pages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Páginas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">Sem dados de leitura para o período selecionado</p>
            )}
          </div>

          {/* Cumulative pages area chart */}
          <div className="card-library p-4 md:p-6">
            <h3 className="font-semibold text-foreground mb-4">Progresso acumulado</h3>
            {cumulativePages.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativePages}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Total acumulado" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">Sem dados</p>
            )}
          </div>

          {/* Top books by pages */}
          <div className="card-library p-4 md:p-6">
            <h3 className="font-semibold text-foreground mb-4">Top 10 livros por páginas lidas</h3>
            {pagesPerBook.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pagesPerBook} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="pages" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Páginas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">Sem dados</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'time' && (
        <div className="card-library p-4 md:p-6">
          <h3 className="font-semibold text-foreground mb-4">Tempo de leitura por mês (horas)</h3>
          {timePerMonth.length > 0 ? (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timePerMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="horas" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Horas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">Sem dados de tempo para o período selecionado</p>
          )}
        </div>
      )}

      {activeTab === 'books' && (
        <div className="card-library p-4 md:p-6">
          <h3 className="font-semibold text-foreground mb-4">Distribuição por status</h3>
          {booksByStatus.length > 0 ? (
            <div className="h-64 md:h-80 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="w-48 h-48 md:w-64 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={booksByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {booksByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {booksByStatus.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-foreground">{item.name}: <strong>{item.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">Nenhum livro cadastrado</p>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="card-library p-4 md:p-6">
          <h3 className="font-semibold text-foreground mb-4">Livros por categoria</h3>
          {booksByCategory.length > 0 ? (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={booksByCategory}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Livros" radius={[4, 4, 0, 0]}>
                    {booksByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">Nenhum livro com categoria</p>
          )}
        </div>
      )}
    </div>
  );
}
