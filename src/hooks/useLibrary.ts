import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, format, differenceInDays } from 'date-fns';
import type { Book, DailyReading, BookStatus, BookEvaluation, Quote, DashboardStats, VocabularyEntry } from '@/types/library';

// Tempo médio de leitura por página (em MINUTOS) por categoria
const READING_TIME_BY_CATEGORY: Record<string, { min: number; max: number }> = {
  'autoajuda': { min: 2.5, max: 3 },
  'bíblia': { min: 3, max: 5 },
  'biblia': { min: 3, max: 5 },
  'biografia': { min: 2, max: 2.5 },
  'ciência': { min: 4, max: 6 },
  'ciencia': { min: 4, max: 6 },
  'espiritualidade': { min: 3, max: 4 },
  'religioso': { min: 3, max: 4 },
  'fantasia': { min: 1.8, max: 2.5 },
  'ficção': { min: 1.5, max: 2 },
  'ficcao': { min: 1.5, max: 2 },
  'finanças': { min: 3, max: 4 },
  'financas': { min: 3, max: 4 },
  'história': { min: 3, max: 5 },
  'historia': { min: 3, max: 5 },
  'não-ficção': { min: 3, max: 4 },
  'nao-ficcao': { min: 3, max: 4 },
  'negócios': { min: 3, max: 4 },
  'negocios': { min: 3, max: 4 },
  'romance': { min: 1.5, max: 2 },
  'outro': { min: 2, max: 4 },
};

// Retorna tempo médio por página em MINUTOS
function getAverageReadingTimePerPage(category: string | undefined): number {
  if (!category) return 2.5; // default 2.5 min
  const normalizedCategory = category.toLowerCase().trim();
  const times = READING_TIME_BY_CATEGORY[normalizedCategory];
  if (times) {
    return (times.min + times.max) / 2;
  }
  return 2.5; // default 2.5 min
}

export function useLibrary() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [readings, setReadings] = useState<DailyReading[]>([]);
  const [statuses, setStatuses] = useState<BookStatus[]>([]);
  const [evaluations, setEvaluations] = useState<BookEvaluation[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from database
  const loadData = useCallback(async () => {
    if (!user) {
      setBooks([]);
      setReadings([]);
      setStatuses([]);
      setEvaluations([]);
      setQuotes([]);
      setVocabulary([]);
      setIsLoaded(true);
      return;
    }

    try {
      // Load books
      const { data: booksData } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: true });

      // Load statuses with book info
      const { data: statusesData } = await supabase
        .from('statuses')
        .select('*, books(name, total_pages)')
        .order('created_at', { ascending: true });

      // Load readings with book info
      const { data: readingsData } = await supabase
        .from('readings')
        .select('*, books(name)')
        .order('created_at', { ascending: true });

      // Load evaluations with book info
      const { data: evaluationsData } = await supabase
        .from('evaluations')
        .select('*, books(name)')
        .order('created_at', { ascending: true });

      // Load quotes with book info
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('*, books(name)')
        .order('created_at', { ascending: true });

      // Load vocabulary with book info
      const { data: vocabularyData } = await supabase
        .from('vocabulary')
        .select('*, books(name)')
        .order('created_at', { ascending: false });

      // Transform to app format
      if (booksData) {
        setBooks(booksData.map((b, index) => ({
          id: b.id,
          numero: index + 1,
          livro: b.name,
          autor: (b as any).author || undefined,
          ano: (b as any).year || undefined,
          totalPaginas: b.total_pages,
          tipo: b.type as Book['tipo'],
          categoria: b.category as Book['categoria'],
          valorPago: Number(b.paid_value) || 0,
          coverUrl: (b as any).cover_url || undefined,
        })));
      }

      if (statusesData) {
        setStatuses(statusesData.map((s, index) => ({
          id: s.id,
          numero: index + 1,
          livroId: s.book_id,
          livro: (s.books as any)?.name || '',
          status: s.status as BookStatus['status'],
          quantidadeLida: s.pages_read,
        })));
      }

      if (readingsData) {
        setReadings(readingsData.map(r => {
          // Parse time_spent - formato correto é MM:SS ou apenas MM (minutos)
          // O campo armazena MINUTOS (ex: "10:30" = 10 minutos e 30 segundos)
          // O resultado tempoGasto é TAMBÉM em minutos (decimal)
          let tempoGastoMinutes = 0;
          const timeSpentStr = r.time_spent || '0';
          if (timeSpentStr.includes(':')) {
            const parts = timeSpentStr.split(':').map(Number);
            if (parts.length === 2) {
              // Formato MM:SS (ex: "10:30" = 10 minutos e 30 segundos = 10.5 minutos)
              const [mins, secs] = parts;
              tempoGastoMinutes = mins + (secs / 60);
            }
          } else {
            // Número sem ":" = SEMPRE minutos (ex: "20" = 20 minutos)
            tempoGastoMinutes = parseFloat(timeSpentStr) || 0;
          }

          return {
            id: r.id,
            dia: r.day,
            mes: r.month,
            livroId: r.book_id,
            livroLido: (r.books as any)?.name || '',
            paginaInicial: r.start_page,
            paginaFinal: r.end_page,
            tempoGasto: tempoGastoMinutes, // Em minutos (decimal)
            quantidadePaginas: r.end_page - r.start_page,
            dataInicio: (r as any).start_date ? new Date((r as any).start_date + 'T12:00:00') : undefined,
            dataFim: (r as any).end_date ? new Date((r as any).end_date + 'T12:00:00') : undefined,
            bibleBook: (r as any).bible_book || undefined,
            bibleChapter: (r as any).bible_chapter || undefined,
            bibleVerseStart: (r as any).bible_verse_start || undefined,
            bibleVerseEnd: (r as any).bible_verse_end || undefined,
          };
        }));
      }

      if (evaluationsData) {
        setEvaluations(evaluationsData.map(e => ({
          id: e.id,
          livroId: e.book_id,
          livro: (e.books as any)?.name || '',
          criatividade: e.creativity || 0,
          escrita: e.writing || 0,
          aprendizados: e.learnings || 0,
          prazer: e.pleasure || 0,
          impacto: e.impact || 0,
          notaFinal: Number(e.final_grade) || 0,
          observacoes: (e as any).observations || undefined,
        })));
      }

      if (quotesData) {
        setQuotes(quotesData.map(q => ({
          id: q.id,
          citacao: q.quote,
          livroId: q.book_id,
          livro: (q.books as any)?.name || '',
          pagina: q.page || 0,
          bibleBook: (q as any).bible_book || undefined,
          bibleChapter: (q as any).bible_chapter || undefined,
          bibleVerse: (q as any).bible_verse || undefined,
        })));
      }

      if (vocabularyData) {
        setVocabulary(vocabularyData.map(v => {
          // Parse source_details to get page number
          let pagina: number | null = null;
          const sourceDetails = v.source_details as { bookName?: string; author?: string; page?: number } | null;
          if (sourceDetails && typeof sourceDetails === 'object') {
            pagina = sourceDetails.page || null;
          }
          
          return {
            id: v.id,
            palavra: v.palavra,
            silabas: v.silabas || null,
            fonetica: v.fonetica || null,
            classe: v.classe || null,
            definicoes: Array.isArray(v.definicoes) ? v.definicoes as string[] : [],
            sinonimos: Array.isArray(v.sinonimos) ? v.sinonimos as { sentido: string; palavras: string[] }[] : [],
            antonimos: Array.isArray(v.antonimos) ? v.antonimos as string[] : [],
            exemplos: Array.isArray(v.exemplos) ? v.exemplos as string[] : [],
            etimologia: v.etimologia || null,
            observacoes: v.observacoes || null,
            analise_contexto: v.analise_contexto as { frase: string; sentidoIdentificado: string; explicacao: string; sentidosNaoAplicaveis: string[]; sinonimosAdequados: string[]; fraseReescrita: string; observacao: string } | null,
            book_id: v.book_id,
            bookName: (v.books as any)?.name || null,
            pagina,
            source_type: v.source_type || null,
            source_details: sourceDetails || null,
            created_at: v.created_at,
          };
        }));
      }

      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add book
  const addBook = useCallback(async (book: Omit<Book, 'id' | 'numero'>) => {
    if (!user) return null;

    const { data: newBookData, error } = await supabase
      .from('books')
      .insert({
        name: book.livro,
        author: book.autor,
        year: book.ano,
        total_pages: book.totalPaginas,
        type: book.tipo,
        category: book.categoria,
        paid_value: book.valorPago,
        cover_url: book.coverUrl,
        user_id: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding book:', error);
      return null;
    }

    // Create initial status
    await supabase
      .from('statuses')
      .insert({
        book_id: newBookData.id,
        status: 'Não iniciado',
        pages_read: 0,
        user_id: user.id,
      });

    await loadData();
    return newBookData;
  }, [loadData, user]);

  // Update book
  const updateBook = useCallback(async (updatedBook: Book) => {
    const { error } = await supabase
      .from('books')
      .update({
        name: updatedBook.livro,
        author: updatedBook.autor,
        year: updatedBook.ano,
        total_pages: updatedBook.totalPaginas,
        type: updatedBook.tipo,
        category: updatedBook.categoria,
        paid_value: updatedBook.valorPago,
        cover_url: updatedBook.coverUrl,
      } as any)
      .eq('id', updatedBook.id);

    if (error) {
      console.error('Error updating book:', error);
      return;
    }

    await loadData();
  }, [loadData]);

  // Add daily reading (with optional retroactive support and Bible mode)
  // When period mode is used (dataInicio + dataFim), auto-generate daily entries
  const addReading = useCallback(async (reading: Omit<DailyReading, 'id' | 'quantidadePaginas'> & { 
    dataInicio?: Date; 
    dataFim?: Date;
    isRetroactive?: boolean;
    bibleBook?: string;
    bibleChapter?: number;
    bibleVerseStart?: number;
    bibleVerseEnd?: number;
    generateDailyEntries?: boolean; // Flag to generate daily entries for period
  }) => {
    if (!user) return null;

    const quantidadePaginas = reading.paginaFinal - reading.paginaInicial;

    // Get book info for category-based time calculation
    const { data: bookData } = await supabase
      .from('books')
      .select('total_pages, category')
      .eq('id', reading.livroId)
      .single();

    const isPeriodMode = reading.dataInicio && reading.dataFim;
    
    // If period mode, generate individual daily entries
    if (isPeriodMode && reading.generateDailyEntries !== false) {
      const startDate = new Date(reading.dataInicio!);
      const endDate = new Date(reading.dataFim!);
      // CORREÇÃO: differenceInDays conta dias de diferença, então para incluir ambos os extremos,
      // somamos 1 apenas se as datas forem diferentes
      const daysDiff = differenceInDays(endDate, startDate);
      const totalDays = daysDiff + 1; // Inclui o dia inicial e final
      
      if (totalDays >= 1) {
        // Cálculo correto de páginas por dia
        // Se leu da página 1 até 142, são 142 páginas (incluindo a página 1)
        const totalPagesInPeriod = reading.paginaFinal - reading.paginaInicial + 1;
        const pagesPerDay = totalPagesInPeriod / totalDays;
        
        // Tempo por dia em MINUTOS
        // Se o usuário informou o tempo total, divide pelos dias
        // Se não, calcula baseado na categoria
        let timePerDayMinutes: number;
        if (reading.tempoGasto > 0) {
          // Usuário informou o tempo total - divide pelos dias
          timePerDayMinutes = reading.tempoGasto / totalDays;
        } else {
          // Calcula baseado na categoria (minutos por página * páginas por dia)
          const avgTimePerPage = getAverageReadingTimePerPage(bookData?.category);
          timePerDayMinutes = pagesPerDay * avgTimePerPage;
        }
        
        const meses = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        // Generate entries for each day
        const dailyEntries = [];
        
        for (let i = 0; i < totalDays; i++) {
          const currentDate = addDays(startDate, i);
          const day = currentDate.getDate();
          const month = meses[currentDate.getMonth()];
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          
          // Cálculo correto de páginas por dia
          const startPageForDay = Math.floor(reading.paginaInicial + (pagesPerDay * i));
          const endPageForDay = Math.min(
            Math.floor(reading.paginaInicial + (pagesPerDay * (i + 1)) - 1),
            reading.paginaFinal
          );
          
          // Para o último dia, garantir que termine exatamente na página final
          const finalEndPage = i === totalDays - 1 ? reading.paginaFinal : endPageForDay;
          
          // Converter minutos para formato MM:SS se tiver fração
          const mins = Math.floor(timePerDayMinutes);
          const secs = Math.round((timePerDayMinutes % 1) * 60);
          const timeSpentStr = secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}`;
          
          dailyEntries.push({
            book_id: reading.livroId,
            day: day,
            month: month,
            start_page: startPageForDay,
            end_page: finalEndPage,
            time_spent: timeSpentStr, // Tempo em formato MM ou MM:SS
            start_date: dateStr,
            end_date: dateStr,
            bible_book: reading.bibleBook || null,
            bible_chapter: reading.bibleChapter || null,
            bible_verse_start: reading.bibleVerseStart || null,
            bible_verse_end: reading.bibleVerseEnd || null,
            user_id: user.id,
          });
        }
        
        // Insert all daily entries
        const { error } = await supabase
          .from('readings')
          .insert(dailyEntries as any);
        
        if (error) {
          console.error('Error adding daily readings:', error);
          return null;
        }
        
        // Update status to final page
        const newPagesRead = reading.paginaFinal;
        const newStatus = bookData && newPagesRead >= bookData.total_pages ? 'Concluido' : 'Lendo';
        
        await supabase
          .from('statuses')
          .update({
            pages_read: newPagesRead,
            status: newStatus,
          })
          .eq('book_id', reading.livroId);
        
        await loadData();
        return { id: 'bulk-insert' };
      }
    }
    
    // Single entry (daily mode or single day period)
    const startDateStr = reading.dataInicio ? reading.dataInicio.toISOString().split('T')[0] : null;
    const endDateStr = reading.dataFim ? reading.dataFim.toISOString().split('T')[0] : null;

    const { data: newReadingData, error } = await supabase
      .from('readings')
      .insert({
        book_id: reading.livroId,
        day: reading.dia,
        month: reading.mes,
        start_page: reading.paginaInicial,
        end_page: reading.paginaFinal,
        time_spent: reading.tempoGasto.toString(), // Minutos
        start_date: startDateStr,
        end_date: endDateStr,
        bible_book: reading.bibleBook || null,
        bible_chapter: reading.bibleChapter || null,
        bible_verse_start: reading.bibleVerseStart || null,
        bible_verse_end: reading.bibleVerseEnd || null,
        user_id: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding reading:', error);
      return null;
    }

    // Update status
    // For retroactive readings, set pages directly to paginaFinal
    // For regular readings, accumulate pages
    let newPagesRead: number;
    let newStatus: string;

    if (reading.isRetroactive) {
      // Retroactive: set pages directly to the final page
      newPagesRead = reading.paginaFinal;
      newStatus = bookData && newPagesRead >= bookData.total_pages ? 'Concluido' : 'Lendo';
    } else {
      // Regular: accumulate pages
      const { data: currentStatus } = await supabase
        .from('statuses')
        .select('pages_read')
        .eq('book_id', reading.livroId)
        .maybeSingle();

      newPagesRead = (currentStatus?.pages_read || 0) + quantidadePaginas;
      newStatus = bookData && newPagesRead >= bookData.total_pages ? 'Concluido' : 'Lendo';
    }

    await supabase
      .from('statuses')
      .update({
        pages_read: newPagesRead,
        status: newStatus,
      })
      .eq('book_id', reading.livroId);

    await loadData();
    return newReadingData;
  }, [loadData, user]);

  // Update reading and recalculate status
  const updateReading = useCallback(async (reading: DailyReading) => {
    if (!user) return null;

    const startDateStr = reading.dataInicio ? reading.dataInicio.toISOString().split('T')[0] : null;
    const endDateStr = reading.dataFim ? reading.dataFim.toISOString().split('T')[0] : null;

    const { error } = await supabase
      .from('readings')
      .update({
        day: reading.dia,
        month: reading.mes,
        start_page: reading.paginaInicial,
        end_page: reading.paginaFinal,
        time_spent: reading.tempoGasto.toString(),
        start_date: startDateStr,
        end_date: endDateStr,
        bible_book: reading.bibleBook || null,
        bible_chapter: reading.bibleChapter || null,
        bible_verse_start: reading.bibleVerseStart || null,
        bible_verse_end: reading.bibleVerseEnd || null,
      } as any)
      .eq('id', reading.id);

    if (error) {
      console.error('Error updating reading:', error);
      return null;
    }

    // Recalculate status based on all readings for this book
    // Get all readings for this book and find max page reached
    const { data: allBookReadings } = await supabase
      .from('readings')
      .select('end_page')
      .eq('book_id', reading.livroId);
    
    if (allBookReadings) {
      const maxPageRead = Math.max(...allBookReadings.map(r => r.end_page), 0);
      
      // Get book total pages
      const { data: bookData } = await supabase
        .from('books')
        .select('total_pages')
        .eq('id', reading.livroId)
        .single();
      
      if (bookData) {
        // Ensure we don't exceed total pages
        const correctedPagesRead = Math.min(maxPageRead, bookData.total_pages);
        const newStatus = correctedPagesRead >= bookData.total_pages ? 'Concluido' : 
                         correctedPagesRead > 0 ? 'Lendo' : 'Não iniciado';
        
        await supabase
          .from('statuses')
          .update({
            pages_read: correctedPagesRead,
            status: newStatus,
          })
          .eq('book_id', reading.livroId);
      }
    }

    await loadData();
    return reading;
  }, [loadData, user]);

  // Add evaluation
  const addEvaluation = useCallback(async (evaluation: Omit<BookEvaluation, 'id'>) => {
    if (!user) return;

    // Check if exists
    const { data: existing } = await supabase
      .from('evaluations')
      .select('id')
      .eq('book_id', evaluation.livroId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('evaluations')
        .update({
          creativity: evaluation.criatividade,
          writing: evaluation.escrita,
          learnings: evaluation.aprendizados,
          pleasure: evaluation.prazer,
          impact: evaluation.impacto,
          final_grade: evaluation.notaFinal,
          observations: evaluation.observacoes,
        } as any)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('evaluations')
        .insert({
          book_id: evaluation.livroId,
          creativity: evaluation.criatividade,
          writing: evaluation.escrita,
          learnings: evaluation.aprendizados,
          pleasure: evaluation.prazer,
          impact: evaluation.impacto,
          final_grade: evaluation.notaFinal,
          observations: evaluation.observacoes,
          user_id: user.id,
        } as any);
    }

    await loadData();
  }, [loadData, user]);

  // Add quote
  const addQuote = useCallback(async (quote: Omit<Quote, 'id'>) => {
    if (!user) return null;

    const { data: newQuoteData, error } = await supabase
      .from('quotes')
      .insert({
        book_id: quote.livroId,
        quote: quote.citacao,
        page: quote.pagina,
        bible_book: quote.bibleBook || null,
        bible_chapter: quote.bibleChapter || null,
        bible_verse: quote.bibleVerse || null,
        user_id: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding quote:', error);
      return null;
    }

    await loadData();
    return newQuoteData;
  }, [loadData, user]);

  // Delete functions
  const deleteBook = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting book:', error);
      return;
    }

    await loadData();
  }, [loadData]);

  const deleteQuote = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting quote:', error);
      return;
    }

    await loadData();
  }, [loadData]);

  // Clear all data
  const clearAllData = useCallback(async () => {
    if (!user) return;
    
    // Delete all books (cascade will delete related records)
    await supabase.from('books').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await loadData();
  }, [loadData, user]);

  // Calculate dashboard stats
  const getDashboardStats = useCallback((): DashboardStats => {
    const totalPaginas = books.reduce((sum, book) => sum + book.totalPaginas, 0);
    const paginasLidas = statuses.reduce((sum, status) => sum + status.quantidadeLida, 0);
    const percentualLido = totalPaginas > 0 ? (paginasLidas / totalPaginas) * 100 : 0;
    const paginasFaltantes = totalPaginas - paginasLidas;
    
    const uniqueDays = new Set(readings.map(r => `${r.dia}-${r.mes}`)).size;
    const mediaPaginasDia = uniqueDays > 0 ? paginasLidas / uniqueDays : 0;

    return {
      totalPaginas,
      paginasLidas,
      percentualLido,
      paginasFaltantes,
      diasLeitura: uniqueDays,
      mediaPaginasDia,
      livrosCadastrados: books.length,
      livrosLendo: statuses.filter(s => s.status === 'Lendo').length,
      livrosConcluidos: statuses.filter(s => s.status === 'Concluido').length,
    };
  }, [books, statuses, readings]);

  return {
    books,
    readings,
    statuses,
    evaluations,
    quotes,
    vocabulary,
    isLoaded,
    addBook,
    updateBook,
    addReading,
    updateReading,
    addEvaluation,
    addQuote,
    deleteBook,
    deleteQuote,
    clearAllData,
    getDashboardStats,
  };
}
