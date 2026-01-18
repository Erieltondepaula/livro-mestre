import { useState } from 'react';
import { Quote as QuoteIcon, Save, Trash2 } from 'lucide-react';
import type { Book, Quote } from '@/types/library';

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

  const selectedBook = books.find(b => b.id === livroId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livroId || !citacao.trim() || !pagina || !selectedBook) return;

    onSubmit({
      livroId,
      livro: selectedBook.livro,
      citacao: citacao.trim(),
      pagina: parseInt(pagina),
    });

    // Reset form
    setCitacao('');
    setPagina('');
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
                onChange={(e) => setLivroId(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Página
              </label>
              <input
                type="number"
                value={pagina}
                onChange={(e) => setPagina(e.target.value)}
                className="input-library"
                placeholder="Ex: 42"
                min="1"
                max={selectedBook?.totalPaginas}
                required
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
          
          {quotes.map((quote) => (
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">{quote.livro}</span>
                    <span>•</span>
                    <span>Página {quote.pagina}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
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
