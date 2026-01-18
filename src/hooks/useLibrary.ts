import { useState, useEffect, useCallback } from 'react';
import type { Book, DailyReading, BookStatus, BookEvaluation, Quote, DashboardStats } from '@/types/library';

const STORAGE_KEYS = {
  books: 'library_books',
  readings: 'library_readings',
  status: 'library_status',
  evaluations: 'library_evaluations',
  quotes: 'library_quotes',
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// Dados importados do Excel - Planner de Leituras 2023
const initialBooks: Book[] = [
  {
    id: 'book1',
    numero: 1,
    livro: 'CARTAS DE UM DIABO A SEU APRENDIZ',
    totalPaginas: 208,
    tipo: 'Livro',
    categoria: 'Ficção',
    valorPago: 24.99,
  },
  {
    id: 'book2',
    numero: 2,
    livro: 'JESUS É________',
    totalPaginas: 204,
    tipo: 'Livro',
    categoria: 'Espiritualidade ou Religioso',
    valorPago: 45.59,
  },
  {
    id: 'book3',
    numero: 3,
    livro: 'O EVANGELHO MALTRAPILHO',
    totalPaginas: 222,
    tipo: 'Livro',
    categoria: 'Espiritualidade ou Religioso',
    valorPago: 35.05,
  },
  {
    id: 'book4',
    numero: 4,
    livro: 'ANTIGO TESTAMENTO',
    totalPaginas: 1270,
    tipo: 'Livro',
    categoria: 'Espiritualidade ou Religioso',
    valorPago: 0,
  },
  {
    id: 'book5',
    numero: 5,
    livro: 'NOVO TESTAMENTO',
    totalPaginas: 456,
    tipo: 'Livro',
    categoria: 'Espiritualidade ou Religioso',
    valorPago: 0,
  },
  {
    id: 'book6',
    numero: 6,
    livro: 'HEROIS DA FÉ',
    totalPaginas: 203,
    tipo: 'Ebook',
    categoria: 'Espiritualidade ou Religioso',
    valorPago: 0,
  },
  {
    id: 'book7',
    numero: 7,
    livro: 'LIVRO FAÇA FORTUNA COM AÇÕES - DÉCIO BAZIN',
    totalPaginas: 256,
    tipo: 'Ebook',
    categoria: 'Autoajuda',
    valorPago: 0,
  },
  {
    id: 'book8',
    numero: 8,
    livro: 'AVIVAMENTO RESPONSÁVEL',
    totalPaginas: 136,
    tipo: 'Livro',
    categoria: 'Espiritualidade ou Religioso',
    valorPago: 34.90,
  },
  {
    id: 'book9',
    numero: 9,
    livro: 'BOM DIA ESPÍRITO SANTO',
    totalPaginas: 244,
    tipo: 'Livro',
    categoria: 'Espiritualidade ou Religioso',
    valorPago: 0,
  },
  {
    id: 'book10',
    numero: 10,
    livro: 'CINCO SEGREDOS DA RIQUEZA QUE 96% DAS PESSOAS NÃO SABEM - CRAIG HILL',
    totalPaginas: 142,
    tipo: 'Livro',
    categoria: 'Autoajuda',
    valorPago: 46.20,
  },
  {
    id: 'book11',
    numero: 11,
    livro: 'CASAMENTO LIVRE DE CONFLITOS FINANCEIROS - CHUK BENTLEY E ANN BENTLEY',
    totalPaginas: 169,
    tipo: 'Livro',
    categoria: 'Autoajuda',
    valorPago: 0,
  },
];

const initialStatus: BookStatus[] = [
  { id: 'status1', numero: 1, livroId: 'book1', livro: 'CARTAS DE UM DIABO A SEU APRENDIZ', status: 'Não iniciado', quantidadeLida: 0 },
  { id: 'status2', numero: 2, livroId: 'book2', livro: 'JESUS É________', status: 'Não iniciado', quantidadeLida: 0 },
  { id: 'status3', numero: 3, livroId: 'book3', livro: 'O EVANGELHO MALTRAPILHO', status: 'Não iniciado', quantidadeLida: 0 },
  { id: 'status4', numero: 4, livroId: 'book4', livro: 'ANTIGO TESTAMENTO', status: 'Não iniciado', quantidadeLida: 0 },
  { id: 'status5', numero: 5, livroId: 'book5', livro: 'NOVO TESTAMENTO', status: 'Não iniciado', quantidadeLida: 0 },
  { id: 'status6', numero: 6, livroId: 'book6', livro: 'HEROIS DA FÉ', status: 'Não iniciado', quantidadeLida: 0 },
  { id: 'status7', numero: 7, livroId: 'book7', livro: 'LIVRO FAÇA FORTUNA COM AÇÕES - DÉCIO BAZIN', status: 'Não iniciado', quantidadeLida: 0 },
  { id: 'status8', numero: 8, livroId: 'book8', livro: 'AVIVAMENTO RESPONSÁVEL', status: 'Não iniciado', quantidadeLida: 0 },
  { id: 'status9', numero: 9, livroId: 'book9', livro: 'BOM DIA ESPÍRITO SANTO', status: 'Não iniciado', quantidadeLida: 0 },
  { id: 'status10', numero: 10, livroId: 'book10', livro: 'CINCO SEGREDOS DA RIQUEZA QUE 96% DAS PESSOAS NÃO SABEM - CRAIG HILL', status: 'Concluido', quantidadeLida: 142 },
  { id: 'status11', numero: 11, livroId: 'book11', livro: 'CASAMENTO LIVRE DE CONFLITOS FINANCEIROS - CHUK BENTLEY E ANN BENTLEY', status: 'Não iniciado', quantidadeLida: 0 },
];

const initialEvaluations: BookEvaluation[] = [
  {
    id: 'eval1',
    livroId: 'book8',
    livro: 'AVIVAMENTO RESPONSÁVEL',
    criatividade: 5,
    escrita: 10,
    aprendizados: 10,
    prazer: 10,
    impacto: 10,
    notaFinal: 9.0,
  },
];

const initialQuotes: Quote[] = [
  {
    id: 'quote1',
    citacao: 'Deus não trabalha com desperdício; Para que Ele vai dar se não tem ninguém para comer? Para que Ele vai dar se ninguém quer reter? Para que Ele vai dar unção se ninguém quer pregar? E para que Ele vai dar o avivamento se ninguém quer ir?',
    livroId: 'book8',
    livro: 'AVIVAMENTO RESPONSÁVEL',
    pagina: 15,
  },
  {
    id: 'quote2',
    citacao: 'Deus não faz nada apenas por fazer, Ele faz para o Homem entrar na sua responsabilidade (precisamos exercer nossa responsabilidade para com o criador)',
    livroId: 'book8',
    livro: 'AVIVAMENTO RESPONSÁVEL',
    pagina: 15,
  },
  {
    id: 'quote3',
    citacao: 'VOCÊ PRECISA REAGIR ÀQUILO QUE VOCÊ RECEBEU DO CÉU',
    livroId: 'book8',
    livro: 'AVIVAMENTO RESPONSÁVEL',
    pagina: 15,
  },
  {
    id: 'quote4',
    citacao: 'A coisa mais extraordinária é você largar a sua vida para viver a grandeza de Deus!',
    livroId: 'book8',
    livro: 'AVIVAMENTO RESPONSÁVEL',
    pagina: 15,
  },
  {
    id: 'quote5',
    citacao: 'Ele fez o mais difícil. Ele deixou a grandeza Dele para viver a nossa pequenez, e tudo que ele pede é que eu e você deixemos nossa pequenez para viver a grandeza Dele',
    livroId: 'book8',
    livro: 'AVIVAMENTO RESPONSÁVEL',
    pagina: 15,
  },
];

export function useLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [readings, setReadings] = useState<DailyReading[]>([]);
  const [statuses, setStatuses] = useState<BookStatus[]>([]);
  const [evaluations, setEvaluations] = useState<BookEvaluation[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const loadedBooks = localStorage.getItem(STORAGE_KEYS.books);
    const loadedReadings = localStorage.getItem(STORAGE_KEYS.readings);
    const loadedStatus = localStorage.getItem(STORAGE_KEYS.status);
    const loadedEvaluations = localStorage.getItem(STORAGE_KEYS.evaluations);
    const loadedQuotes = localStorage.getItem(STORAGE_KEYS.quotes);

    setBooks(loadedBooks ? JSON.parse(loadedBooks) : initialBooks);
    setReadings(loadedReadings ? JSON.parse(loadedReadings) : []);
    setStatuses(loadedStatus ? JSON.parse(loadedStatus) : initialStatus);
    setEvaluations(loadedEvaluations ? JSON.parse(loadedEvaluations) : initialEvaluations);
    setQuotes(loadedQuotes ? JSON.parse(loadedQuotes) : initialQuotes);
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(books));
  }, [books, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.readings, JSON.stringify(readings));
  }, [readings, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.status, JSON.stringify(statuses));
  }, [statuses, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.evaluations, JSON.stringify(evaluations));
  }, [evaluations, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.quotes, JSON.stringify(quotes));
  }, [quotes, isLoaded]);

  // Add book
  const addBook = useCallback((book: Omit<Book, 'id' | 'numero'>) => {
    const newBook: Book = {
      ...book,
      id: generateId(),
      numero: books.length + 1,
    };
    setBooks(prev => [...prev, newBook]);

    // Create initial status
    const newStatus: BookStatus = {
      id: generateId(),
      numero: newBook.numero,
      livroId: newBook.id,
      livro: newBook.livro,
      status: 'Não iniciado',
      quantidadeLida: 0,
    };
    setStatuses(prev => [...prev, newStatus]);

    return newBook;
  }, [books.length]);

  // Update book
  const updateBook = useCallback((updatedBook: Book) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    
    // Update status with new book name
    setStatuses(prev => prev.map(s => 
      s.livroId === updatedBook.id 
        ? { ...s, livro: updatedBook.livro }
        : s
    ));
    
    // Update evaluations with new book name
    setEvaluations(prev => prev.map(e => 
      e.livroId === updatedBook.id 
        ? { ...e, livro: updatedBook.livro }
        : e
    ));
    
    // Update quotes with new book name
    setQuotes(prev => prev.map(q => 
      q.livroId === updatedBook.id 
        ? { ...q, livro: updatedBook.livro }
        : q
    ));
    
    // Update readings with new book name
    setReadings(prev => prev.map(r => 
      r.livroId === updatedBook.id 
        ? { ...r, livroLido: updatedBook.livro }
        : r
    ));
  }, []);

  // Add daily reading
  const addReading = useCallback((reading: Omit<DailyReading, 'id' | 'quantidadePaginas'>) => {
    const quantidadePaginas = reading.paginaFinal - reading.paginaInicial;
    const newReading: DailyReading = {
      ...reading,
      id: generateId(),
      quantidadePaginas,
    };
    setReadings(prev => [...prev, newReading]);

    // Update status
    setStatuses(prev => prev.map(status => {
      if (status.livroId === reading.livroId) {
        const newQuantidade = status.quantidadeLida + quantidadePaginas;
        const book = books.find(b => b.id === reading.livroId);
        const newStatus: BookStatus['status'] = book && newQuantidade >= book.totalPaginas 
          ? 'Concluido' 
          : 'Lendo';
        return {
          ...status,
          quantidadeLida: newQuantidade,
          status: newStatus,
        };
      }
      return status;
    }));

    return newReading;
  }, [books]);

  // Add evaluation
  const addEvaluation = useCallback((evaluation: Omit<BookEvaluation, 'id'>) => {
    const existing = evaluations.find(e => e.livroId === evaluation.livroId);
    if (existing) {
      setEvaluations(prev => prev.map(e => 
        e.livroId === evaluation.livroId 
          ? { ...evaluation, id: e.id }
          : e
      ));
    } else {
      const newEvaluation: BookEvaluation = {
        ...evaluation,
        id: generateId(),
      };
      setEvaluations(prev => [...prev, newEvaluation]);
    }
  }, [evaluations]);

  // Add quote
  const addQuote = useCallback((quote: Omit<Quote, 'id'>) => {
    const newQuote: Quote = {
      ...quote,
      id: generateId(),
    };
    setQuotes(prev => [...prev, newQuote]);
    return newQuote;
  }, []);

  // Delete functions
  const deleteBook = useCallback((id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    setStatuses(prev => prev.filter(s => s.livroId !== id));
    setReadings(prev => prev.filter(r => r.livroId !== id));
    setEvaluations(prev => prev.filter(e => e.livroId !== id));
    setQuotes(prev => prev.filter(q => q.livroId !== id));
  }, []);

  const deleteQuote = useCallback((id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
  }, []);

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
    isLoaded,
    addBook,
    updateBook,
    addReading,
    addEvaluation,
    addQuote,
    deleteBook,
    deleteQuote,
    getDashboardStats,
  };
}
