import { useState, useMemo } from 'react';
import { Quote as QuoteIcon, Save, Trash2, Calendar, Tag, Search } from 'lucide-react';
import type { Book, Quote } from '@/types/library';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const QUOTE_TAGS = [
  { id: 'motivação', label: '💪 Motivação', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  { id: 'sabedoria', label: '🦉 Sabedoria', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  { id: 'fé', label: '✝️ Fé', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  { id: 'liderança', label: '👑 Liderança', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  { id: 'amor', label: '❤️ Amor', color: 'bg-red-500/10 text-red-700 border-red-500/20' },
  { id: 'esperança', label: '🌟 Esperança', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  { id: 'coragem', label: '🦁 Coragem', color: 'bg-teal-500/10 text-teal-700 border-teal-500/20' },
  { id: 'outro', label: '📝 Outro', color: 'bg-gray-500/10 text-gray-700 border-gray-500/20' },
];

interface QuotesViewProps {
  books: Book[];
  quotes: Quote[];
  onSubmit: (quote: Omit<Quote, 'id'> & { tags?: string[] }) => void;
  onDelete: (id: string) => void;
}

export function QuotesView({ books, quotes, onSubmit, onDelete }: QuotesViewProps) {
  const [livroId, setLivroId] = useState('');
  const [citacao, setCitacao] = useState('');
  const [pagina, setPagina] = useState('');
  
  // Bible reference fields
  const [bibleBook, setBibleBook] = useState('');
  const [bibleChapter, setBibleChapter] = useState('');
  const [bibleVerse, setBibleVerse] = useState('');

  // Filter state for saved quotes
  const [filterBookId, setFilterBookId] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const selectedBook = books.find(b => b.id === livroId);
  const isBibleCategory = selectedBook?.categoria?.toLowerCase() === 'bíblia' || 
                          selectedBook?.categoria?.toLowerCase() === 'biblia';

  const bibleBookNames = useMemo(() => getBibleBookNames(), []);
  const bibleChapters = useMemo(() => 
    bibleBook ? getChaptersArray(bibleBook) : [], [bibleBook]);
  const bibleVerses = useMemo(() => 
    bibleBook && bibleChapter ? getVersesArray(bibleBook, parseInt(bibleChapter)) : [], 
    [bibleBook, bibleChapter]);

  // Get unique books that have quotes
  const booksWithQuotes = useMemo(() => {
    const bookIds = [...new Set(quotes.map(q => q.livroId))];
    return books.filter(b => bookIds.includes(b.id));
  }, [books, quotes]);

  // Filter and limit quotes for display
  const displayedQuotes = useMemo(() => {
    let filtered = [...quotes];
    
    if (filterBookId) {
      filtered = filtered.filter(q => q.livroId === filterBookId);
    }

    if (filterTag) {
      filtered = filtered.filter(q => (q as any).tags?.includes(filterTag));
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(q => q.citacao.toLowerCase().includes(query));
    }
    
    // Sort by creation date descending (newest first) and take only 4
    filtered.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
    
    return filtered.slice(0, 8);
  }, [quotes, filterBookId, filterTag, searchText]);

  const handleBookChange = (bookId: string) => {
    setLivroId(bookId);
    setBibleBook('');
    setBibleChapter('');
    setBibleVerse('');
  };

  const handleBibleBookChange = (bookName: string) => {
    setBibleBook(bookName);
    setBibleChapter('');
    setBibleVerse('');
  };

  const handleBibleChapterChange = (chapter: string) => {
    setBibleChapter(chapter);
    setBibleVerse('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livroId || !citacao.trim() || !selectedBook) return;
    
    // For Bible quotes, require at least the book reference
    if (isBibleCategory && !bibleBook) return;
    
    // For non-Bible quotes, require page number
    if (!isBibleCategory && !pagina) return;

    onSubmit({
      livroId,
      livro: selectedBook.livro,
      citacao: citacao.trim(),
      pagina: pagina ? parseInt(pagina) : 0,
      bibleBook: isBibleCategory ? bibleBook : undefined,
      bibleChapter: isBibleCategory && bibleChapter ? parseInt(bibleChapter) : undefined,
      bibleVerse: isBibleCategory && bibleVerse ? parseInt(bibleVerse) : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    } as any);

    // Reset form
    setCitacao('');
    setPagina('');
    setBibleBook('');
    setBibleChapter('');
    setBibleVerse('');
  };

  // Format Bible reference for display
  const formatBibleReference = (quote: Quote) => {
    if (quote.bibleBook) {
      let ref = quote.bibleBook;
      if (quote.bibleChapter) {
        ref += ` ${quote.bibleChapter}`;
        if (quote.bibleVerse) {
          ref += `:${quote.bibleVerse}`;
        }
      }
      return ref;
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Citações Marcantes</h2>
        <p className="text-muted-foreground">Guarde as frases que mais impactaram você</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card-library-elevated p-8">
          <h3 className="font-display text-xl font-semibold text-foreground mb-6">Nova Citação</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Livro
              </label>
              <select
                value={livroId}
                onChange={(e) => handleBookChange(e.target.value)}
                className="input-library"
                required
              >
                <option value="">Selecione um livro</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.livro}
                  </option>
                ))}
              </select>
            </div>

            {/* Bible Reference Fields */}
            {isBibleCategory && (
              <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium text-sm text-primary flex items-center gap-2">
                  📖 Referência Bíblica
                </h4>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Livro da Bíblia *
                  </label>
                  <select
                    value={bibleBook}
                    onChange={(e) => handleBibleBookChange(e.target.value)}
                    className="input-library"
                    required={isBibleCategory}
                  >
                    <option value="">Selecione o livro</option>
                    {bibleBookNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {bibleBook && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Capítulo
                      </label>
                      <select
                        value={bibleChapter}
                        onChange={(e) => handleBibleChapterChange(e.target.value)}
                        className="input-library"
                      >
                        <option value="">-</option>
                        {bibleChapters.map((ch) => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Versículo
                      </label>
                      <select
                        value={bibleVerse}
                        onChange={(e) => setBibleVerse(e.target.value)}
                        className="input-library"
                        disabled={!bibleChapter}
                      >
                        <option value="">-</option>
                        {bibleVerses.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Citação
              </label>
              <textarea
                value={citacao}
                onChange={(e) => setCitacao(e.target.value)}
                className="input-library min-h-[120px] resize-y"
                placeholder="Digite a citação marcante..."
                required
              />
            </div>

            {/* Page field - optional for Bible, required for others */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Página {isBibleCategory ? '(opcional)' : ''}
              </label>
              <input
                type="number"
                value={pagina}
                onChange={(e) => setPagina(e.target.value)}
                className="input-library"
                placeholder="Ex: 42"
                min="1"
                max={selectedBook?.totalPaginas}
                required={!isBibleCategory}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Tag className="w-3.5 h-3.5 inline mr-1" /> Tags (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                {QUOTE_TAGS.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      selectedTags.includes(tag.id)
                        ? tag.color + ' ring-1 ring-primary/30'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                    onClick={() => setSelectedTags(prev => 
                      prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                    )}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">
              <Save className="w-5 h-5" />
              Salvar Citação
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">Citações Guardadas</h3>
          
          {/* Search + Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nas citações..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterBookId}
                onChange={(e) => setFilterBookId(e.target.value)}
                className="input-library text-sm h-8 w-auto"
              >
                <option value="">Todos os livros</option>
                {booksWithQuotes.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.livro}
                  </option>
                ))}
              </select>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="input-library text-sm h-8 w-auto"
              >
                <option value="">Todas as tags</option>
                {QUOTE_TAGS.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Display only the 4 most recent quotes */}
          {displayedQuotes.map((quote) => {
            const bibleRef = formatBibleReference(quote);
            const createdDate = quote.created_at ? format(new Date(quote.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : null;
            
            return (
              <div key={quote.id} className="card-library p-6 relative group">
                <button
                  onClick={() => onDelete(quote.id)}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  title="Remover citação"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="flex gap-4">
                  <QuoteIcon className="w-8 h-8 text-primary/30 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-foreground italic mb-3 pr-8">"{quote.citacao}"</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span className="font-medium">{quote.livro}</span>
                      <span>•</span>
                      {bibleRef ? (
                        <span className="font-medium text-primary">{bibleRef}</span>
                      ) : (
                        <span>Página {quote.pagina}</span>
                      )}
                    </div>
                    {(quote.tags && quote.tags.length > 0) && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {quote.tags.map(tagId => {
                          const tagDef = QUOTE_TAGS.find(t => t.id === tagId);
                          return tagDef ? (
                            <span key={tagId} className={`text-[10px] px-2 py-0.5 rounded-full border ${tagDef.color}`}>
                              {tagDef.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {createdDate && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/70">
                        <Calendar className="w-3 h-3" />
                        <span>{createdDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {displayedQuotes.length === 0 && (
            <div className="card-library p-8 text-center">
              <QuoteIcon className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filterBookId ? 'Nenhuma citação para este livro.' : 'Nenhuma citação guardada ainda.'}
              </p>
            </div>
          )}

          {/* Show total count when filtering */}
          {filterBookId && quotes.filter(q => q.livroId === filterBookId).length > 4 && (
            <p className="text-sm text-muted-foreground text-center">
              Mostrando 4 de {quotes.filter(q => q.livroId === filterBookId).length} citações
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
