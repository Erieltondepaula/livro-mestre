import { differenceInDays, format, addDays, parseISO, isToday, isYesterday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Book, BookStatus, DailyReading } from '@/types/library';

export interface ReadingProjection {
  estimatedDate: Date | null;
  daysRemaining: number;
  pagesPerDay: number;
  readingDays: number;
  isDelayed: boolean;
  delayDays: number;
  canShow: boolean; // Mostrar apenas se status == "Lendo" e dias_leitura >= 3
}

/**
 * Calcula a projeção de data de conclusão para um livro
 * - Baseada no ritmo real do usuário nos últimos 30 dias
 * - Recalcula automaticamente com base no comportamento de leitura
 * - Suporta atrasos e reposições
 */
export function calculateReadingProjection(
  book: Book,
  status: BookStatus | undefined,
  readings: DailyReading[]
): ReadingProjection {
  const defaultResult: ReadingProjection = {
    estimatedDate: null,
    daysRemaining: 0,
    pagesPerDay: 0,
    readingDays: 0,
    isDelayed: false,
    delayDays: 0,
    canShow: false,
  };

  // Condição 1: Só mostrar para livros "Lendo"
  if (!status || status.status !== 'Lendo') {
    return defaultResult;
  }

  // Obter todas as leituras deste livro
  const bookReadings = readings.filter(r => r.livroId === book.id);
  
  if (bookReadings.length === 0) {
    return defaultResult;
  }

  // Calcular dias únicos de leitura
  const uniqueDays = new Set<string>();
  for (const reading of bookReadings) {
    if (reading.dataInicio) {
      const dateKey = format(new Date(reading.dataInicio), 'yyyy-MM-dd');
      uniqueDays.add(dateKey);
    } else {
      uniqueDays.add(`${reading.dia}/${reading.mes}`);
    }
  }
  
  const readingDays = uniqueDays.size;

  // Condição 2: Só mostrar se tiver 3+ dias de leitura
  if (readingDays < 3) {
    return { ...defaultResult, readingDays };
  }

  // Calcular páginas restantes
  const pagesRemaining = book.totalPaginas - status.quantidadeLida;
  if (pagesRemaining <= 0) {
    return { ...defaultResult, readingDays, canShow: false };
  }

  // Calcular ritmo médio baseado nos últimos 30 dias
  const now = new Date();
  const thirtyDaysAgo = addDays(now, -30);
  
  // Obter leituras dos últimos 30 dias com datas válidas
  const recentReadings = bookReadings.filter(r => {
    if (r.dataInicio) {
      const readDate = new Date(r.dataInicio);
      return readDate >= thirtyDaysAgo && readDate <= now;
    }
    return false;
  });

  // Se não houver leituras recentes com data, usar todas
  const readingsForCalc = recentReadings.length >= 3 ? recentReadings : bookReadings;

  // Para livros da Bíblia com múltiplas entradas por dia, calcular páginas por dia único
  const pagesByDay: Record<string, { maxPage: number; minPage: number }> = {};
  for (const reading of readingsForCalc) {
    let dateKey: string;
    if (reading.dataInicio) {
      dateKey = format(new Date(reading.dataInicio), 'yyyy-MM-dd');
    } else {
      dateKey = `${reading.dia}/${reading.mes}`;
    }
    
    if (!pagesByDay[dateKey]) {
      pagesByDay[dateKey] = { maxPage: reading.paginaFinal, minPage: reading.paginaInicial };
    } else {
      pagesByDay[dateKey].maxPage = Math.max(pagesByDay[dateKey].maxPage, reading.paginaFinal);
      pagesByDay[dateKey].minPage = Math.min(pagesByDay[dateKey].minPage, reading.paginaInicial);
    }
  }

  // Calcular total de páginas lidas no período
  const dayEntries = Object.values(pagesByDay);
  const daysWithReading = dayEntries.length;
  
  if (daysWithReading === 0) {
    return { ...defaultResult, readingDays, canShow: true };
  }

  // Calcular páginas por dia (usando o progresso máximo atingido)
  const totalPagesInPeriod = status.quantidadeLida;
  const avgPagesPerDay = totalPagesInPeriod / daysWithReading;

  if (avgPagesPerDay <= 0) {
    return { ...defaultResult, readingDays, canShow: true, pagesPerDay: 0 };
  }

  // Calcular dias restantes
  const daysRemaining = Math.ceil(pagesRemaining / avgPagesPerDay);

  // Verificar atraso - se não leu ontem nem hoje
  const sortedDates = Object.keys(pagesByDay)
    .filter(k => k.includes('-')) // Apenas datas ISO
    .sort((a, b) => b.localeCompare(a));
  
  let lastReadingDate: Date | null = null;
  if (sortedDates.length > 0) {
    lastReadingDate = parseISO(sortedDates[0]);
  }

  let isDelayed = false;
  let delayDays = 0;
  
  if (lastReadingDate) {
    const today = startOfDay(new Date());
    const daysSinceLastReading = differenceInDays(today, startOfDay(lastReadingDate));
    
    // Se passou mais de 1 dia desde a última leitura, está atrasado
    if (daysSinceLastReading > 1) {
      isDelayed = true;
      delayDays = daysSinceLastReading - 1; // Desconta o dia atual
    }
  }

  // Calcular data estimada considerando atrasos
  const estimatedDate = addDays(new Date(), daysRemaining + delayDays);

  return {
    estimatedDate,
    daysRemaining: daysRemaining + delayDays,
    pagesPerDay: Number(avgPagesPerDay.toFixed(1)),
    readingDays,
    isDelayed,
    delayDays,
    canShow: true,
  };
}

/**
 * Formata a data prevista em formato amigável
 */
export function formatProjectedDate(date: Date): string {
  const day = date.getDate();
  const month = format(date, 'MMMM', { locale: ptBR });
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

/**
 * Formata a data prevista de forma compacta
 */
export function formatProjectedDateCompact(date: Date): string {
  const day = date.getDate();
  const month = format(date, 'MMM', { locale: ptBR }).replace('.', '');
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Determina o status automático baseado nas páginas lidas
 */
export function determineReadingStatus(
  pagesRead: number, 
  totalPages: number
): 'Não iniciado' | 'Lendo' | 'Concluido' {
  if (pagesRead === 0) return 'Não iniciado';
  if (pagesRead >= totalPages) return 'Concluido';
  return 'Lendo';
}
