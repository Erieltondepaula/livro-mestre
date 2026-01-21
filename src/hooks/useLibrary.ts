import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Book, DailyReading, BookStatus, BookEvaluation, Quote, DashboardStats, VocabularyWord } from '@/types/library';

export function useLibrary() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [readings, setReadings] = useState<DailyReading[]>([]);
  const [statuses, setStatuses] = useState<BookStatus[]>([]);
  const [evaluations, setEvaluations] = useState<BookEvaluation[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
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
        setReadings(readingsData.map(r => ({
          id: r.id,
          dia: r.day,
          mes: r.month,
          livroId: r.book_id,
          livroLido: (r.books as any)?.name || '',
          paginaInicial: r.start_page,
          paginaFinal: r.end_page,
          tempoGasto: parseInt(r.time_spent || '0'),
          quantidadePaginas: r.end_page - r.start_page,
          dataInicio: (r as any).start_date ? new Date((r as any).start_date) : undefined,
          dataFim: (r as any).end_date ? new Date((r as any).end_date) : undefined,
        })));
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
            bookId: v.book_id,
            bookName: (v.books as any)?.name || null,
            pagina,
            source_type: v.source_type || null,
            source_details: sourceDetails || null,
            createdAt: v.created_at,
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

  // Add daily reading (with optional retroactive support)
  const addReading = useCallback(async (reading: Omit<DailyReading, 'id' | 'quantidadePaginas'> & { 
    dataInicio?: Date; 
    dataFim?: Date;
    isRetroactive?: boolean;
  }) => {
    if (!user) return null;

    const quantidadePaginas = reading.paginaFinal - reading.paginaInicial;

    // Formatar datas para o banco
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
        time_spent: reading.tempoGasto.toString(),
        start_date: startDateStr,
        end_date: endDateStr,
        user_id: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding reading:', error);
      return null;
    }

    // Update status
    const { data: bookData } = await supabase
      .from('books')
      .select('total_pages')
      .eq('id', reading.livroId)
      .single();

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
        user_id: user.id,
      })
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
    addEvaluation,
    addQuote,
    deleteBook,
    deleteQuote,
    clearAllData,
    getDashboardStats,
  };
}
