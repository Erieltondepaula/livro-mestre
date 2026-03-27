import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, format, differenceInDays } from 'date-fns';
import type { Book, DailyReading, BookStatus, BookEvaluation, Quote, DashboardStats, VocabularyEntry, Note } from '@/types/library';

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
  const recalculateBookStatus = useCallback(async (bookId: string) => {
    const [{ data: bookData }, { data: allBookReadings }] = await Promise.all([
      supabase.from('books').select('id, total_pages, category').eq('id', bookId).single(),
      supabase.from('readings').select('end_page').eq('book_id', bookId),
    ]);

    if (!bookData) return;

    const maxPageRead = allBookReadings && allBookReadings.length > 0
      ? Math.max(...allBookReadings.map(r => r.end_page), 0)
      : 0;

    const correctedPagesRead = Math.min(maxPageRead, bookData.total_pages);
    const newStatus = correctedPagesRead >= bookData.total_pages
      ? 'Concluido'
      : correctedPagesRead > 0
        ? 'Lendo'
        : 'Não iniciado';

    await supabase
      .from('statuses')
      .update({
        pages_read: correctedPagesRead,
        status: newStatus,
      })
      .eq('book_id', bookId);
  };

  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [readings, setReadings] = useState<DailyReading[]>([]);
  const [statuses, setStatuses] = useState<BookStatus[]>([]);
  const [evaluations, setEvaluations] = useState<BookEvaluation[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
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
      setNotes([]);
      setIsLoaded(true);
      return;
    }

    try {
      // Load all data in parallel for better performance
      const [
        { data: booksData },
        { data: statusesData },
        { data: readingsData },
        { data: evaluationsData },
        { data: quotesData },
        { data: vocabularyData },
        { data: notesData },
        { data: noteLinksData },
      ] = await Promise.all([
        supabase.from('books').select('*').order('created_at', { ascending: true }).limit(500),
        supabase.from('statuses').select('*, books(name, total_pages)').order('created_at', { ascending: true }).limit(500),
        supabase.from('readings').select('*, books(name)').order('created_at', { ascending: true }).limit(1000),
        supabase.from('evaluations').select('*, books(name)').order('created_at', { ascending: true }).limit(500),
        supabase.from('quotes').select('*, books(name)').order('created_at', { ascending: false }).limit(1000),
        supabase.from('vocabulary').select('*, books(name)').order('created_at', { ascending: false }).limit(1000),
        supabase.from('notes').select('*, books(name)').order('created_at', { ascending: false }).limit(500),
        supabase.from('note_book_links').select('*, books(name)').limit(1000),
      ]);

      if (booksData) {
        setBooks(booksData.map((b, index) => ({
          id: b.id,
          numero: index + 1,
          livro: b.name,
          autor: b.author || undefined,
          ano: b.year || undefined,
          totalPaginas: b.total_pages,
          tipo: b.type as Book['tipo'],
          categoria: b.category as Book['categoria'],
          valorPago: Number(b.paid_value) || 0,
          coverUrl: b.cover_url || undefined,
          targetCompletionDate: b.target_completion_date || undefined,
          created_at: b.created_at || undefined,
        })));
      }

      // Helper to safely extract joined book name
      const getBookName = (books: unknown): string => {
        if (books && typeof books === 'object' && 'name' in books) return (books as { name: string }).name || '';
        return '';
      };

      if (statusesData) {
        setStatuses(statusesData.map((s, index) => ({
          id: s.id,
          numero: index + 1,
          livroId: s.book_id,
          livro: getBookName(s.books),
          status: s.status as BookStatus['status'],
          quantidadeLida: s.pages_read,
        })));
      }

      if (readingsData) {
        setReadings(readingsData.map(r => {
          let tempoGastoMinutes = 0;
          const timeSpentStr = r.time_spent || '0';
          if (timeSpentStr.includes(':')) {
            const parts = timeSpentStr.split(':').map(Number);
            if (parts.length === 2) {
              const [mins, secs] = parts;
              tempoGastoMinutes = mins + (secs / 60);
            }
          } else {
            tempoGastoMinutes = parseFloat(timeSpentStr) || 0;
          }

          const buildDate = (dateStr: string | null): Date | undefined => {
            if (!dateStr) return undefined;
            const createdAt = r.created_at ? new Date(r.created_at) : null;
            const timePart = createdAt
              ? `T${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}:${String(createdAt.getSeconds()).padStart(2, '0')}`
              : `T${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}:${String(new Date().getSeconds()).padStart(2, '0')}`;
            return new Date(dateStr + timePart);
          };

          return {
            id: r.id,
            dia: r.day,
            mes: r.month,
            livroId: r.book_id,
            livroLido: getBookName(r.books),
            paginaInicial: r.start_page,
            paginaFinal: r.end_page,
            tempoGasto: tempoGastoMinutes,
            quantidadePaginas: r.end_page - r.start_page,
            dataInicio: buildDate(r.start_date),
            dataFim: buildDate(r.end_date),
            created_at: r.created_at || undefined,
            bibleBook: r.bible_book || undefined,
            bibleChapter: r.bible_chapter || undefined,
            bibleVerseStart: r.bible_verse_start || undefined,
            bibleVerseEnd: r.bible_verse_end || undefined,
          };
        }));
      }

      if (evaluationsData) {
        setEvaluations(evaluationsData.map(e => ({
          id: e.id,
          livroId: e.book_id,
          livro: getBookName(e.books),
          criatividade: e.creativity || 0,
          escrita: e.writing || 0,
          aprendizados: e.learnings || 0,
          prazer: e.pleasure || 0,
          impacto: e.impact || 0,
          notaFinal: Number(e.final_grade) || 0,
          observacoes: e.observations || undefined,
        })));
      }

      if (quotesData) {
        setQuotes(quotesData.map(q => ({
          id: q.id,
          citacao: q.quote,
          livroId: q.book_id,
          livro: getBookName(q.books),
          pagina: q.page || 0,
          created_at: q.created_at || undefined,
          tags: Array.isArray(q.tags) ? q.tags : [],
          bibleBook: q.bible_book || undefined,
          bibleChapter: q.bible_chapter || undefined,
          bibleVerse: q.bible_verse || undefined,
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
            bookName: getBookName(v.books),
            pagina,
            source_type: v.source_type || null,
            source_details: sourceDetails || null,
            created_at: v.created_at,
          };
        }));
      }

      // Transform notes
      if (notesData) {
        setNotes(notesData.map(n => {
          // Find linked books for this note
          const links = noteLinksData?.filter(link => link.note_id === n.id) || [];
          const linkedBooks = links.map(link => ({
            id: link.book_id,
            name: getBookName(link.books),
          }));

          return {
            id: n.id,
            title: n.title,
            content: n.content,
            contentHtml: n.content_html || undefined,
            contentJson: (n.content_json && typeof n.content_json === 'object') ? n.content_json as object : null,
            tags: Array.isArray(n.tags) ? n.tags : [],
            noteType: (n.note_type as Note['noteType']) || 'permanent',
            folderId: n.folder_id || null,
            bookId: n.book_id,
            bookName: getBookName(n.books),
            linkedBooks,
            isPinned: n.is_pinned || false,
            archived: n.archived || false,
            wordCount: n.word_count || 0,
            created_at: n.created_at,
            updated_at: n.updated_at,
            lastEditedAt: n.last_edited_at || undefined,
          };
        }));
      }

      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      // Import toast dynamically to avoid circular deps
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar seus dados. Tente recarregar a página.",
          variant: "destructive",
        });
      });
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
        target_completion_date: updatedBook.targetCompletionDate || null,
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
        
        await recalculateBookStatus(reading.livroId);
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

    await recalculateBookStatus(reading.livroId);
    await loadData();
    return newReadingData;
  }, [loadData, recalculateBookStatus, user]);

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

    await recalculateBookStatus(reading.livroId);
    await loadData();
    return reading;
  }, [loadData, recalculateBookStatus, user]);

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
        tags: quote.tags || [],
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

  // Add note
  const addNote = useCallback(async (note: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'linkedBooks'> & { linkedBookIds?: string[] }) => {
    if (!user) return null;

    const { data: newNoteData, error } = await supabase
      .from('notes')
      .insert({
        title: note.title,
        content: note.content,
        tags: note.tags,
        book_id: note.bookId,
        user_id: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return null;
    }

    // Add linked books
    if (note.linkedBookIds && note.linkedBookIds.length > 0) {
      const links = note.linkedBookIds.map(bookId => ({
        note_id: newNoteData.id,
        book_id: bookId,
        user_id: user.id,
      }));

      await supabase.from('note_book_links').insert(links as any);
    }

    await loadData();
    return newNoteData;
  }, [loadData, user]);

  // Update note
  const updateNote = useCallback(async (note: Note & { linkedBookIds?: string[] }) => {
    if (!user) return;

    const { error } = await supabase
      .from('notes')
      .update({
        title: note.title,
        content: note.content,
        tags: note.tags,
        book_id: note.bookId,
      } as any)
      .eq('id', note.id);

    if (error) {
      console.error('Error updating note:', error);
      return;
    }

    // Update linked books - delete existing and re-create
    await supabase.from('note_book_links').delete().eq('note_id', note.id);

    if (note.linkedBookIds && note.linkedBookIds.length > 0) {
      const links = note.linkedBookIds.map(bookId => ({
        note_id: note.id,
        book_id: bookId,
        user_id: user.id,
      }));

      await supabase.from('note_book_links').insert(links as any);
    }

    await loadData();
  }, [loadData, user]);

  // Delete note
  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    await loadData();
  }, [loadData]);

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
    notes,
    isLoaded,
    addBook,
    updateBook,
    addReading,
    updateReading,
    addEvaluation,
    addQuote,
    deleteBook,
    deleteQuote,
    addNote,
    updateNote,
    deleteNote,
    clearAllData,
    getDashboardStats,
  };
}
