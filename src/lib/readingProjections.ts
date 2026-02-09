import { differenceInDays, format, addDays, parseISO, startOfDay } from 'date-fns';
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
  hasTargetDate: boolean; // Se está usando data alvo manual
  targetDate: Date | null; // Data alvo definida pelo usuário
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
    hasTargetDate: false,
    targetDate: null,
  };

  // Condição 1: Só mostrar para livros "Lendo"
  if (!status || status.status !== 'Lendo') {
    return defaultResult;
  }

  // Verificar se existe data alvo manual
  const hasTargetDate = !!book.targetCompletionDate;
  let targetDate: Date | null = null;
  
  if (hasTargetDate && book.targetCompletionDate) {
    targetDate = parseISO(book.targetCompletionDate);
  }

  // Obter todas as leituras deste livro
  const bookReadings = readings.filter(r => r.livroId === book.id);
  
  if (bookReadings.length === 0) {
    // Se tem data alvo manual mas sem leituras, ainda mostrar a data alvo
    if (hasTargetDate && targetDate) {
      const daysRemaining = differenceInDays(targetDate, new Date());
      const pagesRemaining = book.totalPaginas - (status?.quantidadeLida || 0);
      const pagesPerDay = daysRemaining > 0 ? pagesRemaining / daysRemaining : 0;
      
      return {
        estimatedDate: targetDate,
        daysRemaining: Math.max(0, daysRemaining),
        pagesPerDay: Number(pagesPerDay.toFixed(1)),
        readingDays: 0,
        isDelayed: daysRemaining < 0,
        delayDays: daysRemaining < 0 ? Math.abs(daysRemaining) : 0,
        canShow: true,
        hasTargetDate: true,
        targetDate,
      };
    }
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

  // Se tem data alvo manual, usar ela como referência principal
  if (hasTargetDate && targetDate) {
    const pagesRemaining = book.totalPaginas - status.quantidadeLida;
    const daysUntilTarget = differenceInDays(targetDate, new Date());
    const pagesPerDayNeeded = daysUntilTarget > 0 ? pagesRemaining / daysUntilTarget : 0;
    
    // Verificar se está atrasado baseado na data alvo
    const isDelayed = daysUntilTarget < 0;
    
    return {
      estimatedDate: targetDate,
      daysRemaining: Math.max(0, daysUntilTarget),
      pagesPerDay: Number(pagesPerDayNeeded.toFixed(1)),
      readingDays,
      isDelayed,
      delayDays: isDelayed ? Math.abs(daysUntilTarget) : 0,
      canShow: true,
      hasTargetDate: true,
      targetDate,
    };
  }

  // Calcular a última data de leitura (para verificar atraso)
  // Precisamos inferir a data a partir de dia/mês ou usar dataInicio se disponível
  let lastReadingDate: Date | null = null;
  
  for (const reading of bookReadings) {
    let readDate: Date | null = null;
    
    if (reading.dataInicio) {
      readDate = new Date(reading.dataInicio);
    } else if (reading.dataFim) {
      readDate = new Date(reading.dataFim);
    } else if (reading.dia && reading.mes) {
      // Inferir data a partir de dia/mês - usar o ano do created_at ou ano atual
      const monthMap: Record<string, number> = {
        'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3,
        'Maio': 4, 'Junho': 5, 'Julho': 6, 'Agosto': 7,
        'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
      };
      const monthNum = monthMap[reading.mes];
      if (monthNum !== undefined) {
        const year = new Date().getFullYear();
        readDate = new Date(year, monthNum, reading.dia);
        
        // Se a data inferida está no futuro, usar ano anterior
        if (readDate > new Date()) {
          readDate = new Date(year - 1, monthNum, reading.dia);
        }
      }
    }
    
    if (readDate && (!lastReadingDate || readDate > lastReadingDate)) {
      lastReadingDate = readDate;
    }
  }

  // Verificar atraso - se passou mais de 1 dia desde a última leitura
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

  // Sem data alvo manual: usar cálculo dinâmico baseado no ritmo

  // Encontrar a primeira data de leitura (data de início do livro)
  let firstReadingDate: Date | null = null;
  
  for (const reading of bookReadings) {
    let readDate: Date | null = null;
    
    if (reading.dataInicio) {
      readDate = new Date(reading.dataInicio);
    } else if (reading.dataFim) {
      readDate = new Date(reading.dataFim);
    } else if (reading.dia && reading.mes) {
      const monthMap: Record<string, number> = {
        'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3,
        'Maio': 4, 'Junho': 5, 'Julho': 6, 'Agosto': 7,
        'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
      };
      const monthNum = monthMap[reading.mes];
      if (monthNum !== undefined) {
        const year = new Date().getFullYear();
        readDate = new Date(year, monthNum, reading.dia);
        if (readDate > new Date()) {
          readDate = new Date(year - 1, monthNum, reading.dia);
        }
      }
    }
    
    if (readDate && (!firstReadingDate || readDate < firstReadingDate)) {
      firstReadingDate = readDate;
    }
  }

  // Condição 2: Só mostrar se tiver 3+ dias de leitura
  if (readingDays < 3) {
    // Mesmo sem 3 dias de leitura, mostrar se estiver atrasado
    if (isDelayed) {
      return { 
        ...defaultResult, 
        readingDays, 
        isDelayed, 
        delayDays, 
        canShow: true,
        hasTargetDate: false, 
        targetDate: null 
      };
    }
    return { ...defaultResult, readingDays, hasTargetDate: false, targetDate: null };
  }

  // Calcular páginas restantes
  const pagesRemaining = book.totalPaginas - status.quantidadeLida;
  if (pagesRemaining <= 0) {
    return { ...defaultResult, readingDays, canShow: false, hasTargetDate: false, targetDate: null };
  }

  // NOVO CÁLCULO: Usar intervalo de tempo real entre primeira e última leitura
  // Isso dá uma previsão mais precisa baseada no comportamento real do usuário
  
  let avgPagesPerDay = 0;
  
  if (firstReadingDate && lastReadingDate) {
    const totalDaysElapsed = differenceInDays(startOfDay(lastReadingDate), startOfDay(firstReadingDate)) + 1;
    
    if (totalDaysElapsed > 0) {
      // Ritmo = páginas lidas / dias totais desde o início
      avgPagesPerDay = status.quantidadeLida / totalDaysElapsed;
    }
  }

  // Fallback: se não conseguiu calcular pelo intervalo, usar dias únicos de leitura
  if (avgPagesPerDay <= 0) {
    avgPagesPerDay = status.quantidadeLida / readingDays;
  }

  if (avgPagesPerDay <= 0) {
    return { 
      ...defaultResult, 
      readingDays, 
      canShow: true, 
      pagesPerDay: 0, 
      isDelayed, 
      delayDays, 
      hasTargetDate: false, 
      targetDate: null 
    };
  }

  // Calcular dias restantes baseado no ritmo real
  const daysRemaining = Math.ceil(pagesRemaining / avgPagesPerDay);

  // Calcular data estimada a partir de HOJE (não da última leitura)
  const estimatedDate = addDays(new Date(), daysRemaining);

  return {
    estimatedDate,
    daysRemaining,
    pagesPerDay: Number(avgPagesPerDay.toFixed(1)),
    readingDays,
    isDelayed,
    delayDays,
    canShow: true,
    hasTargetDate: false,
    targetDate: null,
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
