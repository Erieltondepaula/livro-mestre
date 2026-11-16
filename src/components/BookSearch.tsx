import { useState } from 'react';
import { BookOpen, Check, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { searchBooks, resolveSearchResult, type BookSearchMode, type BookSearchResult } from '@/lib/bookSearch';
import type { IsbnBook } from '@/lib/isbnLookup';

const modes: { value: BookSearchMode; label: string; placeholder: string }[] = [
  { value: 'isbn', label: 'ISBN-10 / ISBN-13', placeholder: '9788535914849 ou 8535914846' },
  { value: 'asin', label: 'ASIN', placeholder: 'Código Amazon de 10 caracteres' },
  { value: 'issn', label: 'ISSN', placeholder: 'Ex: 0378-5955' },
  { value: 'title', label: 'Nome do livro', placeholder: 'Ex: O Pequeno Príncipe' },
  { value: 'author', label: 'Autor', placeholder: 'Ex: George Orwell' },
];

export function BookSearch({ onSelect, onBusyChange }: { onSelect: (book: IsbnBook) => void; onBusyChange: (busy: boolean) => void }) {
  const [mode, setMode] = useState<BookSearchMode>('isbn');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const changeBusy = (value: boolean) => { setBusy(value); onBusyChange(value); };

  const apply = (book: IsbnBook) => {
    onSelect(book);
    setError(false);
    setMessage(`Dados encontrados em ${book.source}.${book.pages ? '' : ' Número de páginas não informado pelo catálogo.'}`);
    setResults([]);
  };
  const search = async () => {
    if (busy || !query.trim()) return;
    changeBusy(true); setMessage(''); setError(false); setResults([]);
    try {
      const books = await searchBooks(mode, query);
      if (!books.length) {
        setMessage(mode === 'asin' ? 'ASIN não encontrado nos catálogos públicos. A cobertura de códigos Amazon é limitada; tente ISBN ou nome do livro.' : 'Nenhum resultado encontrado. Confira a busca ou preencha os dados manualmente.');
      } else if (['isbn', 'asin', 'issn'].includes(mode) && books.length === 1) {
        apply(books[0]);
      } else {
        setResults(books); setMessage(`${books.length} resultados encontrados.`);
      }
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : 'Não foi possível consultar o catálogo.');
    } finally { changeBusy(false); }
  };
  const select = async (book: BookSearchResult) => {
    if (busy) return;
    changeBusy(true); setSelecting(book.id);
    try { apply(await resolveSearchResult(book)); }
    catch { setError(true); setMessage('Não foi possível carregar os dados desta edição. Tente novamente.'); }
    finally { changeBusy(false); setSelecting(null); }
  };

  return <div className="space-y-3 border-b border-border pb-5">
    <label htmlFor="book-search-mode" className="block text-sm font-medium text-foreground">Buscar por</label>
    <select id="book-search-mode" value={mode} disabled={busy} className="input-library" onChange={event => {
      setMode(event.target.value as BookSearchMode); setQuery(''); setResults([]); setMessage(''); setError(false);
    }}>
      {modes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
    <div className="flex flex-col sm:flex-row gap-2">
      <input id="book-search-query" aria-label={modes.find(item => item.value === mode)?.label} type="text" value={query} disabled={busy}
        className="input-library flex-1 min-w-0" placeholder={modes.find(item => item.value === mode)?.placeholder}
        maxLength={200} aria-invalid={error} aria-describedby={message ? 'book-search-status' : undefined}
        onChange={event => { setQuery(event.target.value); setResults([]); setMessage(''); setError(false); }}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} />
      <Button type="button" onClick={search} disabled={busy || !query.trim()}>
        {busy ? <Loader2 className="animate-spin" /> : <Search />}{busy ? 'Buscando…' : 'Buscar'}
      </Button>
    </div>
    {mode === 'issn' && <p className="text-xs text-muted-foreground">Periódico: dados de uma edição específica podem não estar disponíveis.</p>}
    {mode === 'asin' && <p className="text-xs text-muted-foreground">ASIN: disponibilidade limitada aos catálogos públicos.</p>}
    {message && <p id="book-search-status" role="status" className={`text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>}
    {results.length > 0 && <ul className="divide-y divide-border max-h-96 overflow-y-auto" aria-label="Resultados da busca">
      {results.map(book => <li key={book.id} className="flex items-start gap-3 py-3">
        {book.coverUrl ? <img src={book.coverUrl} alt={`Capa de ${book.title}`} className="w-12 aspect-[2/3] object-contain shrink-0" loading="lazy" /> : <BookOpen className="w-12 h-16 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground break-words">{book.title}</p>
          {book.author && <p className="text-xs text-muted-foreground break-words">{book.author}</p>}
          <p className="text-xs text-muted-foreground">{[book.year, book.pages ? `${book.pages} páginas` : null, book.source].filter(Boolean).join(' · ')}</p>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => select(book)} aria-label={`Selecionar ${book.title}`}>
            {selecting === book.id ? <Loader2 className="animate-spin" /> : <Check />} Selecionar
          </Button>
        </div>
      </li>)}
    </ul>}
  </div>;
}