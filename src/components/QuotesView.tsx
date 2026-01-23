import { useState, useMemo } from 'react';
import { Quote as QuoteIcon, Save, Trash2 } from 'lucide-react';
import type { Book, Quote } from '@/types/library';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';

interface QuotesViewProps {
  books: Book[];
  quotes: Quote[];
  onSubmit: (quote: Omit<Quote, 'id'>) => void;
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

  const selectedBook = books.find(b => b.id === livroId);
  const isBibleCategory = selectedBook?.categoria?.toLowerCase() === 'bíblia' || 
                          selectedBook?.categoria?.toLowerCase() === 'biblia';

  const bibleBookNames = useMemo(() => getBibleBookNames(), []);
  const bibleChapters = useMemo(() => 
    bibleBook ? getChaptersArray(bibleBook) : [], [bibleBook]);
  const bibleVerses = useMemo(() => 
    bibleBook && bibleChapter ? getVersesArray(bibleBook, parseInt(bibleChapter)) : [], 
    [bibleBook, bibleChapter]);

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
    });

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

            <button type="submit" className="btn-primary w-full">
              <Save className="w-5 h-5" />
              Salvar Citação
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h3 className="font-display text-xl font-semibold text-foreground">Citações Guardadas</h3>
          
          {quotes.map((quote) => {
            const bibleRef = formatBibleReference(quote);
            
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
                  </div>
                </div>
              </div>
            );
          })}
          
          {quotes.length === 0 && (
            <div className="card-library p-8 text-center">
              <QuoteIcon className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma citação guardada ainda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
