import { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { SubscriptionBlocker } from '@/components/SubscriptionBlocker';
import { DashboardSkeleton } from '@/components/ui/skeleton-card';
import { useLibrary } from '@/hooks/useLibrary';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from '@/hooks/use-toast';
import type { Book, Note } from '@/types/library';
import type { View } from '@/types/views';

// Lazy load heavy components for code splitting
const BookForm = lazy(() => import('@/components/BookForm').then(m => ({ default: m.BookForm })));
const ReadingForm = lazy(() => import('@/components/ReadingForm').then(m => ({ default: m.ReadingForm })));
const StatusView = lazy(() => import('@/components/StatusView').then(m => ({ default: m.StatusView })));
const EvaluationForm = lazy(() => import('@/components/EvaluationForm').then(m => ({ default: m.EvaluationForm })));
const QuotesView = lazy(() => import('@/components/QuotesView').then(m => ({ default: m.QuotesView })));
const BooksListView = lazy(() => import('@/components/BooksListView').then(m => ({ default: m.BooksListView })));
const DictionaryView = lazy(() => import('@/components/DictionaryView').then(m => ({ default: m.DictionaryView })));
const BibleProgressView = lazy(() => import('@/components/BibleProgressView').then(m => ({ default: m.BibleProgressView })));
const HelpView = lazy(() => import('@/components/HelpView').then(m => ({ default: m.HelpView })));
const EnhancedNotesView = lazy(() => import('@/components/notes/EnhancedNotesView').then(m => ({ default: m.EnhancedNotesView })));
const ReadingReportsView = lazy(() => import('@/components/ReadingReportsView').then(m => ({ default: m.ReadingReportsView })));
const ExegesisView = lazy(() => import('@/components/ExegesisView').then(m => ({ default: m.ExegesisView })));
const BibleStudyView = lazy(() => import('@/components/BibleStudyView').then(m => ({ default: m.BibleStudyView })));
const SystemDiagnosticsView = lazy(() => import('@/components/SystemDiagnosticsView').then(m => ({ default: m.SystemDiagnosticsView })));
const FlashcardsView = lazy(() => import('@/components/FlashcardsView').then(m => ({ default: m.FlashcardsView })));

// Keys for session persistence
const STORAGE_KEYS = {
  currentView: 'library_currentView',
  scrollPosition: 'library_scrollPosition',
  booksFilter: 'library_booksFilter',
};

const Index = () => {
  // Restore state from sessionStorage on mount
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.currentView);
    return (saved as View) || 'dashboard';
  });
  const [booksFilter, setBooksFilter] = useState<'all' | 'reading' | 'completed'>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.booksFilter);
    return (saved as 'all' | 'reading' | 'completed') || 'all';
  });
  const { isExpiringSoon } = useSubscription();
  const {
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
  } = useLibrary();

  // Persist current view to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.currentView, currentView);
  }, [currentView]);

  // Persist books filter to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.booksFilter, booksFilter);
  }, [booksFilter]);

  // Save scroll position before page unload/hide
  useEffect(() => {
    const saveScrollPosition = () => {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        sessionStorage.setItem(STORAGE_KEYS.scrollPosition, String(mainElement.scrollTop));
      }
    };

    // Save on visibility change (when app goes to background on mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScrollPosition();
      }
    };

    // Save before unload
    window.addEventListener('beforeunload', saveScrollPosition);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Restore scroll position on mount
    const savedScroll = sessionStorage.getItem(STORAGE_KEYS.scrollPosition);
    if (savedScroll) {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          mainElement.scrollTop = parseInt(savedScroll, 10);
        }, 100);
      }
    }

    return () => {
      window.removeEventListener('beforeunload', saveScrollPosition);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando biblioteca...</p>
        </div>
      </div>
    );
  }

  const handleAddBook = (book: Parameters<typeof addBook>[0]) => {
    addBook(book);
    toast({
      title: "Livro cadastrado!",
      description: `"${book.livro}" foi adicionado à sua biblioteca.`,
    });
  };

  const handleUpdateBook = (book: Book) => {
    updateBook(book);
    toast({
      title: "Livro atualizado!",
      description: `"${book.livro}" foi atualizado com sucesso.`,
    });
  };

  const handleAddReading = (reading: Parameters<typeof addReading>[0]) => {
    addReading(reading);
    toast({
      title: "Leitura registada!",
      description: `Sessão de leitura registada com sucesso.`,
    });
  };

  const handleUpdateReading = (reading: Parameters<typeof updateReading>[0]) => {
    updateReading(reading);
    toast({
      title: "Leitura atualizada!",
      description: `Sessão de leitura atualizada com sucesso.`,
    });
  };

  const handleAddEvaluation = (evaluation: Parameters<typeof addEvaluation>[0]) => {
    addEvaluation(evaluation);
    toast({
      title: "Avaliação salva!",
      description: `Avaliação de "${evaluation.livro}" registada.`,
    });
  };

  const handleAddQuote = (quote: Parameters<typeof addQuote>[0]) => {
    addQuote(quote);
    toast({
      title: "Citação guardada!",
      description: "A citação foi adicionada à sua coleção.",
    });
  };

  const handleDeleteBook = (id: string) => {
    const book = books.find(b => b.id === id);
    deleteBook(id);
    toast({
      title: "Livro removido",
      description: book ? `"${book.livro}" foi removido da biblioteca.` : "Livro removido.",
    });
  };

  const handleDeleteQuote = (id: string) => {
    deleteQuote(id);
    toast({
      title: "Citação removida",
      description: "A citação foi removida da sua coleção.",
    });
  };

  const handleClearAllData = () => {
    clearAllData();
    toast({
      title: "Dados limpos",
      description: "Todos os dados foram removidos. Pode começar do zero!",
    });
  };

  const handleAddNote = (note: Parameters<typeof addNote>[0]) => {
    addNote(note);
    toast({
      title: "Nota criada!",
      description: "A nota foi adicionada à sua coleção.",
    });
  };

  const handleUpdateNote = (note: Note & { linkedBookIds?: string[] }) => {
    updateNote(note);
    toast({
      title: "Nota atualizada!",
      description: "A nota foi atualizada com sucesso.",
    });
  };

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
    toast({
      title: "Nota removida",
      description: "A nota foi removida da sua coleção.",
    });
  };

  const handleNavigateToBooks = (filter?: 'all' | 'reading' | 'completed') => {
    setBooksFilter(filter || 'all');
    setCurrentView('livros');
  };

  const renderView = () => {
    const fallback = <DashboardSkeleton />;

    switch (currentView) {
      case 'dashboard':
        return <Dashboard stats={getDashboardStats()} recentStatuses={statuses} books={books} readings={readings} onNavigateToBooks={handleNavigateToBooks} />;
      case 'cadastrar':
        return <Suspense fallback={fallback}><BookForm onSubmit={handleAddBook} currentBookCount={books.length} /></Suspense>;
      case 'livros':
        return <Suspense fallback={fallback}><BooksListView books={books} statuses={statuses} readings={readings} evaluations={evaluations} quotes={quotes} vocabulary={vocabulary} notes={notes} onDeleteBook={handleDeleteBook} onUpdateBook={handleUpdateBook} initialFilter={booksFilter} onNavigateToNotes={() => setCurrentView('notas')} /></Suspense>;
      case 'leitura':
        return <Suspense fallback={fallback}><ReadingForm books={books} onSubmit={handleAddReading} /></Suspense>;
      case 'status':
        return <Suspense fallback={fallback}><StatusView statuses={statuses} books={books} readings={readings} evaluations={evaluations} quotes={quotes} vocabulary={vocabulary} onDeleteBook={handleDeleteBook} onUpdateBook={handleUpdateBook} onUpdateReading={handleUpdateReading} /></Suspense>;
      case 'avaliacao':
        return <Suspense fallback={fallback}><EvaluationForm books={books} evaluations={evaluations} onSubmit={handleAddEvaluation} /></Suspense>;
      case 'citacoes':
        return <Suspense fallback={fallback}><QuotesView books={books} quotes={quotes} onSubmit={handleAddQuote} onDelete={handleDeleteQuote} /></Suspense>;
      case 'notas':
        return <Suspense fallback={fallback}><EnhancedNotesView books={books} /></Suspense>;
      case 'biblia':
        return <Suspense fallback={fallback}><BibleProgressView readings={readings} books={books} statuses={statuses} /></Suspense>;
      case 'dicionario':
        return <Suspense fallback={fallback}><DictionaryView /></Suspense>;
      case 'relatorios':
        return <Suspense fallback={fallback}><ReadingReportsView books={books} readings={readings} statuses={statuses} /></Suspense>;
      case 'exegese':
        return <Suspense fallback={fallback}><ExegesisView /></Suspense>;
      case 'flashcards':
        return <Suspense fallback={fallback}><FlashcardsView /></Suspense>;
      case 'diagnostico':
        return <Suspense fallback={fallback}><SystemDiagnosticsView /></Suspense>;
      case 'ajuda':
        return <Suspense fallback={fallback}><HelpView /></Suspense>;
      default:
        return <Dashboard stats={getDashboardStats()} recentStatuses={statuses} books={books} readings={readings} onNavigateToBooks={handleNavigateToBooks} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className={`flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 fhd:p-12 4k:p-16 8k:p-20 overflow-auto pt-14 sm:pt-16 lg:pt-4 xl:pt-8 fhd:pt-12 4k:pt-16 ${isExpiringSoon ? 'mt-12' : ''}`}>
        <div className="content-container">
          <SubscriptionBlocker>
            {renderView()}
          </SubscriptionBlocker>
        </div>
      </main>
    </div>
  );
};

export default Index;
