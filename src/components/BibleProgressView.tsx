import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle, Circle, TrendingUp, Book } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bibleBooks, bibleCategories } from '@/data/bibleData';
import type { Book as BookType, DailyReading } from '@/types/library';

interface BibleProgressViewProps {
  readings: DailyReading[];
  books: BookType[];
}

interface BookProgress {
  name: string;
  totalChapters: number;
  chaptersRead: Set<number>;
  progress: number;
}

export function BibleProgressView({ readings, books }: BibleProgressViewProps) {
  // Filter Bible books from the library
  const bibleLibraryBooks = useMemo(() => 
    books.filter(b => 
      b.categoria?.toLowerCase() === 'bíblia' || 
      b.categoria?.toLowerCase() === 'biblia'
    ),
    [books]
  );

  // State for selected Bible book (use 'all' to show combined, or book ID for specific)
  const [selectedBibleId, setSelectedBibleId] = useState<string>('all');

  // Filter readings based on selected Bible book
  const filteredReadings = useMemo(() => {
    if (selectedBibleId === 'all') {
      // All Bible readings
      return readings.filter(r => r.bibleBook && r.bibleChapter);
    }
    // Readings for specific Bible book
    return readings.filter(r => 
      r.livroId === selectedBibleId && r.bibleBook && r.bibleChapter
    );
  }, [readings, selectedBibleId]);

  // Calculate progress for each Bible book
  const bookProgress = useMemo(() => {
    const progress: Record<string, BookProgress> = {};
    
    // Initialize all books
    bibleBooks.forEach(book => {
      progress[book.name] = {
        name: book.name,
        totalChapters: book.chapters.length,
        chaptersRead: new Set(),
        progress: 0,
      };
    });

    // Mark chapters as read
    filteredReadings.forEach(reading => {
      if (reading.bibleBook && reading.bibleChapter) {
        const bookData = progress[reading.bibleBook];
        if (bookData) {
          bookData.chaptersRead.add(reading.bibleChapter);
        }
      }
    });

    // Calculate percentages
    Object.values(progress).forEach(book => {
      book.progress = book.totalChapters > 0 
        ? (book.chaptersRead.size / book.totalChapters) * 100 
        : 0;
    });

    return progress;
  }, [filteredReadings]);

  // Group by testament
  const oldTestamentBooks = bibleBooks.filter(b => b.testament === 'old').map(b => bookProgress[b.name]);
  const newTestamentBooks = bibleBooks.filter(b => b.testament === 'new').map(b => bookProgress[b.name]);

  // Calculate overall stats
  const totalChapters = bibleBooks.reduce((sum, b) => sum + b.chapters.length, 0);
  const totalRead = Object.values(bookProgress).reduce((sum, b) => sum + b.chaptersRead.size, 0);
  const overallProgress = totalChapters > 0 ? (totalRead / totalChapters) * 100 : 0;

  const completedBooks = Object.values(bookProgress).filter(b => b.progress === 100).length;

  // Get the selected Bible book name for display
  const selectedBibleName = useMemo(() => {
    if (selectedBibleId === 'all') return 'Todas as Bíblias';
    const book = bibleLibraryBooks.find(b => b.id === selectedBibleId);
    return book?.livro || 'Bíblia';
  }, [selectedBibleId, bibleLibraryBooks]);

  const renderBookList = (books: BookProgress[], categoryName?: string) => {
    return (
      <div className="space-y-3">
        {categoryName && (
          <h4 className="font-medium text-sm text-primary border-b border-border pb-2">{categoryName}</h4>
        )}
        {books.map((book) => (
          <div key={book.name} className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {book.progress === 100 ? (
              <CheckCircle className="w-4 h-4 text-success" />
            ) : book.progress > 0 ? (
              <TrendingUp className="w-4 h-4 text-primary" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{book.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {book.chaptersRead.size}/{book.totalChapters}
                </span>
              </div>
              <Progress value={book.progress} className="h-2" />
            </div>
            <span className="text-xs text-muted-foreground w-12 text-right">
              {book.progress.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Group by categories
  const renderByCategory = (testament: 'old' | 'new') => {
    const categories = bibleCategories.filter(c => c.testament === testament);
    return categories.map(category => {
      const categoryBooks = category.books
        .map(bookName => bookProgress[bookName])
        .filter(Boolean);
      return (
        <div key={category.name} className="mb-6">
          {renderBookList(categoryBooks, category.name)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Progresso de Leitura Bíblica
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Acompanhe seu progresso na leitura da Bíblia Sagrada
          </p>
        </div>

        {/* Bible selector */}
        {bibleLibraryBooks.length > 1 && (
          <div className="flex items-center gap-2">
            <Book className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedBibleId} onValueChange={setSelectedBibleId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecionar Bíblia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Bíblias (Combinado)</SelectItem>
                {bibleLibraryBooks.map(book => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.livro}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Selected Bible indicator */}
      {bibleLibraryBooks.length > 1 && selectedBibleId !== 'all' && (
        <div className="card-library p-3 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground">
            Mostrando progresso de: <span className="font-semibold text-primary">{selectedBibleName}</span>
          </p>
        </div>
      )}

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-primary">{overallProgress.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Progresso Total</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalRead}</p>
          <p className="text-xs text-muted-foreground">Capítulos Lidos</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalChapters}</p>
          <p className="text-xs text-muted-foreground">Total de Capítulos</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-success">{completedBooks}</p>
          <p className="text-xs text-muted-foreground">Livros Completos</p>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="card-library p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium">
            Progresso Geral {selectedBibleId !== 'all' && `- ${selectedBibleName}`}
          </span>
          <span className="text-sm text-muted-foreground">{overallProgress.toFixed(1)}%</span>
        </div>
        <Progress value={overallProgress} className="h-4" />
      </div>

      {/* Testament Tabs */}
      <Tabs defaultValue="old" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="old" className="text-sm">
            📜 Velho Testamento ({oldTestamentBooks.filter(b => b.progress === 100).length}/39)
          </TabsTrigger>
          <TabsTrigger value="new" className="text-sm">
            ✝️ Novo Testamento ({newTestamentBooks.filter(b => b.progress === 100).length}/27)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="old" className="mt-6">
          <div className="card-library p-4 md:p-6 max-h-[600px] overflow-y-auto">
            {renderByCategory('old')}
          </div>
        </TabsContent>
        
        <TabsContent value="new" className="mt-6">
          <div className="card-library p-4 md:p-6 max-h-[600px] overflow-y-auto">
            {renderByCategory('new')}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
