import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle, Circle, TrendingUp, Book, Search, ExternalLink, FileText, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { bibleBooks, bibleCategories } from '@/data/bibleData';
import type { Book as BookType, DailyReading, BookStatus } from '@/types/library';

interface BibleProgressViewProps {
  readings: DailyReading[];
  books: BookType[];
  statuses: BookStatus[];
}

interface BookProgress {
  name: string;
  totalChapters: number;
  chaptersRead: Set<number>;
  progress: number;
}

// Slugs for bibliaonline.com.br ACF links
const BIBLE_ONLINE_SLUGS: Record<string, string> = {
  'Gênesis': 'gn', 'Êxodo': 'ex', 'Levítico': 'lv', 'Números': 'nm', 'Deuteronômio': 'dt',
  'Josué': 'js', 'Juízes': 'jz', 'Rute': 'rt', '1 Samuel': '1sm', '2 Samuel': '2sm',
  '1 Reis': '1rs', '2 Reis': '2rs', '1 Crônicas': '1cr', '2 Crônicas': '2cr',
  'Esdras': 'ed', 'Neemias': 'ne', 'Ester': 'et', 'Jó': 'jo',
  'Salmos': 'sl', 'Provérbios': 'pv', 'Eclesiastes': 'ec', 'Cânticos': 'ct',
  'Isaías': 'is', 'Jeremias': 'jr', 'Lamentações': 'lm', 'Ezequiel': 'ez', 'Daniel': 'dn',
  'Oséias': 'os', 'Joel': 'jl', 'Amós': 'am', 'Obadias': 'ob', 'Jonas': 'jn',
  'Miquéias': 'mq', 'Naum': 'na', 'Habacuque': 'hc', 'Sofonias': 'sf',
  'Ageu': 'ag', 'Zacarias': 'zc', 'Malaquias': 'ml',
  'Mateus': 'mt', 'Marcos': 'mc', 'Lucas': 'lc', 'João': 'jo',
  'Atos': 'at', 'Romanos': 'rm', '1 Coríntios': '1co', '2 Coríntios': '2co',
  'Gálatas': 'gl', 'Efésios': 'ef', 'Filipenses': 'fp', 'Colossenses': 'cl',
  '1 Tessalonicenses': '1ts', '2 Tessalonicenses': '2ts',
  '1 Timóteo': '1tm', '2 Timóteo': '2tm', 'Tito': 'tt', 'Filemom': 'fm',
  'Hebreus': 'hb', 'Tiago': 'tg', '1 Pedro': '1pe', '2 Pedro': '2pe',
  '1 João': '1jo', '2 João': '2jo', '3 João': '3jo', 'Judas': 'jd', 'Apocalipse': 'ap',
};

function getBibleUrl(bookName: string, chapter: number): string | null {
  const slug = BIBLE_ONLINE_SLUGS[bookName];
  if (!slug) return null;
  return `https://www.bibliaonline.com.br/acf/${slug}/${chapter}`;
}

interface SearchResult {
  bibleBook: string;
  bibleChapter: number;
  bibleVerseStart?: number;
  bibleVerseEnd?: number;
  page: number;
  endPage: number;
  date?: string;
}

export function BibleProgressView({ readings, books, statuses }: BibleProgressViewProps) {
  const bibleLibraryBooks = useMemo(() => 
    books.filter(b => 
      b.categoria?.toLowerCase() === 'bíblia' || 
      b.categoria?.toLowerCase() === 'biblia'
    ),
    [books]
  );

  const [selectedBibleId, setSelectedBibleId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchMode, setSearchMode] = useState<'reference' | 'page'>('reference');
  const [showSearch, setShowSearch] = useState(false);

  const filteredReadings = useMemo(() => {
    if (selectedBibleId === 'all') {
      return readings.filter(r => r.bibleBook && r.bibleChapter);
    }
    return readings.filter(r => 
      r.livroId === selectedBibleId && r.bibleBook && r.bibleChapter
    );
  }, [readings, selectedBibleId]);

  // All Bible readings (for search)
  const allBibleReadings = useMemo(() => 
    readings.filter(r => {
      const book = books.find(b => b.id === r.livroId);
      return book && (book.categoria?.toLowerCase() === 'bíblia' || book.categoria?.toLowerCase() === 'biblia');
    }),
    [readings, books]
  );

  // Pages read by Bible from official status records
  const pagesReadByBibleId = useMemo(() => {
    const bibleIds = new Set(bibleLibraryBooks.map(b => b.id));
    return statuses.reduce<Record<string, number>>((acc, status) => {
      if (bibleIds.has(status.livroId)) {
        acc[status.livroId] = status.quantidadeLida || 0;
      }
      return acc;
    }, {});
  }, [statuses, bibleLibraryBooks]);

  const totalPagesRead = useMemo(() => {
    if (selectedBibleId !== 'all') {
      return pagesReadByBibleId[selectedBibleId] || 0;
    }
    return Object.values(pagesReadByBibleId).reduce((sum, p) => sum + p, 0);
  }, [pagesReadByBibleId, selectedBibleId]);

  // Total pages per Bible
  const totalBiblePages = useMemo(() => {
    if (selectedBibleId !== 'all') {
      const book = bibleLibraryBooks.find(b => b.id === selectedBibleId);
      return book?.totalPaginas || 0;
    }
    return bibleLibraryBooks.reduce((sum, b) => sum + b.totalPaginas, 0);
  }, [bibleLibraryBooks, selectedBibleId]);

  // Build index for search: bible readings with page mapping
  const readingIndex = useMemo(() => {
    return allBibleReadings
      .filter(r => r.bibleBook && r.bibleChapter)
      .map(r => ({
        bibleBook: r.bibleBook!,
        bibleChapter: r.bibleChapter!,
        bibleVerseStart: r.bibleVerseStart,
        bibleVerseEnd: r.bibleVerseEnd,
        page: r.paginaInicial,
        endPage: r.paginaFinal,
        date: r.dataInicio ? new Date(r.dataInicio).toLocaleDateString('pt-BR') : r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : undefined,
      } as SearchResult));
  }, [allBibleReadings]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchMode === 'page') {
      // Search by page number → find bible book/chapter/verse
      const pageNum = parseInt(searchQuery.trim());
      if (isNaN(pageNum)) {
        setSearchResults([]);
        return;
      }
      const results = readingIndex.filter(r => 
        pageNum >= r.page && pageNum <= r.endPage
      );
      setSearchResults(results);
    } else {
      // Search by reference (book, chapter, verse) → find page
      const query = searchQuery.trim().toLowerCase();
      const results = readingIndex.filter(r => {
        const refStr = `${r.bibleBook} ${r.bibleChapter}${r.bibleVerseStart ? ':' + r.bibleVerseStart : ''}${r.bibleVerseEnd ? '-' + r.bibleVerseEnd : ''}`.toLowerCase();
        const bookMatch = r.bibleBook.toLowerCase().includes(query);
        const fullMatch = refStr.includes(query);
        return bookMatch || fullMatch;
      });
      setSearchResults(results);
    }
  };

  // Calculate progress for each Bible book
  const bookProgress = useMemo(() => {
    const progress: Record<string, BookProgress> = {};
    bibleBooks.forEach(book => {
      progress[book.name] = {
        name: book.name,
        totalChapters: book.chapters.length,
        chaptersRead: new Set(),
        progress: 0,
      };
    });

    filteredReadings.forEach(reading => {
      if (reading.bibleBook && reading.bibleChapter) {
        const bookData = progress[reading.bibleBook];
        if (bookData) {
          bookData.chaptersRead.add(reading.bibleChapter);
        }
      }
    });

    Object.values(progress).forEach(book => {
      book.progress = book.totalChapters > 0 
        ? (book.chaptersRead.size / book.totalChapters) * 100 
        : 0;
    });

    return progress;
  }, [filteredReadings]);

  const oldTestamentBooks = bibleBooks.filter(b => b.testament === 'old').map(b => bookProgress[b.name]);
  const newTestamentBooks = bibleBooks.filter(b => b.testament === 'new').map(b => bookProgress[b.name]);

  const totalChapters = bibleBooks.reduce((sum, b) => sum + b.chapters.length, 0);
  const totalRead = Object.values(bookProgress).reduce((sum, b) => sum + b.chaptersRead.size, 0);
  const overallProgress = totalChapters > 0 ? (totalRead / totalChapters) * 100 : 0;

  // Count verses read
  const totalVersesRead = useMemo(() => {
    let count = 0;
    filteredReadings.forEach(reading => {
      if (!reading.bibleBook || !reading.bibleChapter) return;
      const bookDef = bibleBooks.find(b => b.name === reading.bibleBook);
      if (!bookDef) return;
      const chapterVerses = bookDef.chapters[reading.bibleChapter - 1] || 0;

      if (reading.bibleVerseStart && reading.bibleVerseEnd) {
        count += Math.max(0, reading.bibleVerseEnd - reading.bibleVerseStart + 1);
      } else if (reading.bibleVerseStart) {
        count += Math.max(0, chapterVerses - reading.bibleVerseStart + 1);
      } else {
        // Full chapter read
        count += chapterVerses;
      }
    });
    return count;
  }, [filteredReadings]);

  const totalBibleVerses = useMemo(() => {
    return bibleBooks.reduce((sum, b) => sum + b.chapters.reduce((s, v) => s + v, 0), 0);
  }, []);

  // Count completed books: 100% chapters OR all chapters registered individually
  const completedBooks = Object.values(bookProgress).filter(b => {
    if (b.progress === 100) return true;
    // Also check if chaptersRead matches totalChapters (handles rounding)
    if (b.chaptersRead.size >= b.totalChapters && b.totalChapters > 0) return true;
    return false;
  }).length;

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

      {bibleLibraryBooks.length > 1 && selectedBibleId !== 'all' && (
        <div className="card-library p-3 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground">
            Mostrando progresso de: <span className="font-semibold text-primary">{selectedBibleName}</span>
          </p>
        </div>
      )}

      {/* Overall Stats - now 3 rows of 2 on mobile, 6 cols on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
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
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalPagesRead.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">Páginas Lidas</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalBiblePages > 0 ? totalBiblePages.toLocaleString('pt-BR') : '—'}</p>
          <p className="text-xs text-muted-foreground">Total de Páginas</p>
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

      {/* Search Section */}
      <div className="card-library p-4 md:p-6">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-2 w-full text-left font-medium text-sm md:text-base"
        >
          <Search className="w-5 h-5 text-primary" />
          <span>Buscar Capítulo ↔ Página</span>
          <span className="ml-auto text-xs text-muted-foreground">{showSearch ? '▲' : '▼'}</span>
        </button>

        {showSearch && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                variant={searchMode === 'reference' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSearchMode('reference'); setSearchResults([]); setSearchQuery(''); }}
                className="flex-1 text-xs md:text-sm"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Livro/Capítulo → Página
              </Button>
              <Button
                variant={searchMode === 'page' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSearchMode('page'); setSearchResults([]); setSearchQuery(''); }}
                className="flex-1 text-xs md:text-sm"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Página → Livro/Capítulo
              </Button>
            </div>

            {/* Search input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder={searchMode === 'reference' ? 'Ex: Gênesis, Gênesis 1, João 3' : 'Ex: 150'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button size="sm" onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-xs text-muted-foreground">{searchResults.length} resultado(s) encontrado(s)</p>
                {searchResults.map((result, idx) => {
                  const url = getBibleUrl(result.bibleBook, result.bibleChapter);
                  const verseStr = result.bibleVerseStart
                    ? `:${result.bibleVerseStart}${result.bibleVerseEnd ? '-' + result.bibleVerseEnd : ''}`
                    : '';
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          📖 {result.bibleBook} {result.bibleChapter}{verseStr}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Páginas {result.page}–{result.endPage}
                          {result.date && ` • ${result.date}`}
                        </p>
                      </div>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Bíblia Online</span>
                          <span className="sm:hidden">ACF</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum registro encontrado. Certifique-se de que a leitura foi registrada.
              </p>
            )}
          </div>
        )}
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
