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
import { useLibrary } from '@/hooks/useLibrary';
import { toast } from '@/hooks/use-toast';
import type { Book } from '@/types/library';

type View = 'dashboard' | 'cadastrar' | 'livros' | 'leitura' | 'status' | 'avaliacao' | 'citacoes' | 'dicionario';

const Index = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const {
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
        return <Dashboard stats={getDashboardStats()} recentStatuses={statuses} books={books} onClearData={handleClearAllData} />;
      case 'cadastrar':
        return <BookForm onSubmit={handleAddBook} />;
      case 'livros':
        return <BooksListView books={books} statuses={statuses} readings={readings} onDeleteBook={handleDeleteBook} onUpdateBook={handleUpdateBook} />;
      case 'leitura':
        return <ReadingForm books={books} onSubmit={handleAddReading} />;
      case 'status':
        return <StatusView statuses={statuses} books={books} onDeleteBook={handleDeleteBook} onUpdateBook={handleUpdateBook} />;
      case 'avaliacao':
        return <EvaluationForm books={books} evaluations={evaluations} onSubmit={handleAddEvaluation} />;
      case 'citacoes':
        return <QuotesView books={books} quotes={quotes} onSubmit={handleAddQuote} onDelete={handleDeleteQuote} />;
      case 'dicionario':
        return <DictionaryView />;
      default:
        return <Dashboard stats={getDashboardStats()} recentStatuses={statuses} books={books} onClearData={handleClearAllData} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 p-8 overflow-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default Index;
