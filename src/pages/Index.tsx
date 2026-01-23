import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { BookForm } from '@/components/BookForm';
import { ReadingForm } from '@/components/ReadingForm';
import { StatusView } from '@/components/StatusView';
import { EvaluationForm } from '@/components/EvaluationForm';
import { QuotesView } from '@/components/QuotesView';
import { BooksListView } from '@/components/BooksListView';
import { DictionaryView } from '@/components/DictionaryView';
import { BibleProgressView } from '@/components/BibleProgressView';
import { useLibrary } from '@/hooks/useLibrary';
import { toast } from '@/hooks/use-toast';
import type { Book } from '@/types/library';

type View = 'dashboard' | 'cadastrar' | 'livros' | 'leitura' | 'status' | 'avaliacao' | 'citacoes' | 'dicionario' | 'biblia';

const Index = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const {
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
  } = useLibrary();

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

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard stats={getDashboardStats()} recentStatuses={statuses} books={books} />;
      case 'cadastrar':
        return <BookForm onSubmit={handleAddBook} />;
      case 'livros':
        return <BooksListView books={books} statuses={statuses} readings={readings} onDeleteBook={handleDeleteBook} onUpdateBook={handleUpdateBook} />;
      case 'leitura':
        return <ReadingForm books={books} onSubmit={handleAddReading} />;
      case 'status':
        return <StatusView statuses={statuses} books={books} readings={readings} evaluations={evaluations} quotes={quotes} vocabulary={vocabulary} onDeleteBook={handleDeleteBook} onUpdateBook={handleUpdateBook} onUpdateReading={handleUpdateReading} />;
      case 'avaliacao':
        return <EvaluationForm books={books} evaluations={evaluations} onSubmit={handleAddEvaluation} />;
      case 'citacoes':
        return <QuotesView books={books} quotes={quotes} onSubmit={handleAddQuote} onDelete={handleDeleteQuote} />;
      case 'biblia':
        return <BibleProgressView readings={readings} />;
      case 'dicionario':
        return <DictionaryView />;
      default:
        return <Dashboard stats={getDashboardStats()} recentStatuses={statuses} books={books} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 fhd:p-12 4k:p-16 8k:p-20 overflow-auto pt-14 sm:pt-16 lg:pt-4 xl:pt-8 fhd:pt-12 4k:pt-16">
        <div className="content-container">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default Index;
