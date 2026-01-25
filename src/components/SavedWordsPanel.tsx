import { useState, useMemo } from 'react';
import { Search, Book, Filter, ChevronLeft, ChevronRight, X, Link2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { VocabularyEntry } from '@/types/library';

interface BookOption {
  id: string;
  name: string;
}

interface SavedWordsPanelProps {
  words: VocabularyEntry[];
  books: BookOption[];
  onSelectWord: (entry: VocabularyEntry) => void;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ITEMS_PER_PAGE = 50;

export function SavedWordsPanel({ words, books, onSelectWord }: SavedWordsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Mapa de conexões semânticas entre palavras
  const connectionMap = useMemo(() => {
    const connections = new Map<string, Set<string>>();
    
    words.forEach(word => {
      const wordLower = word.palavra.toLowerCase();
      if (!connections.has(wordLower)) {
        connections.set(wordLower, new Set());
      }
      
      // Conectar por sinônimos compartilhados
      word.sinonimos?.forEach(grupo => {
        grupo.palavras?.forEach(sinonimo => {
          const sinonimoLower = sinonimo.toLowerCase();
          // Verificar se o sinônimo existe como palavra salva
          const matchingWord = words.find(w => 
            w.palavra.toLowerCase() === sinonimoLower && w.id !== word.id
          );
          if (matchingWord) {
            connections.get(wordLower)?.add(sinonimoLower);
            if (!connections.has(sinonimoLower)) {
              connections.set(sinonimoLower, new Set());
            }
            connections.get(sinonimoLower)?.add(wordLower);
          }
        });
      });

      // Conectar por antônimos compartilhados
      word.antonimos?.forEach(antonimo => {
        const antonimoLower = antonimo.toLowerCase();
        const matchingWord = words.find(w => 
          w.palavra.toLowerCase() === antonimoLower && w.id !== word.id
        );
        if (matchingWord) {
          connections.get(wordLower)?.add(antonimoLower);
          if (!connections.has(antonimoLower)) {
            connections.set(antonimoLower, new Set());
          }
          connections.get(antonimoLower)?.add(wordLower);
        }
      });

      // Conectar por campo semântico similar (via análise de contexto)
      if (word.analise_contexto?.sentidoIdentificado) {
        const sentido = word.analise_contexto.sentidoIdentificado.toLowerCase();
        words.forEach(otherWord => {
          if (otherWord.id !== word.id && 
              otherWord.analise_contexto?.sentidoIdentificado?.toLowerCase() === sentido) {
            connections.get(wordLower)?.add(otherWord.palavra.toLowerCase());
          }
        });
      }
    });
    
    return connections;
  }, [words]);

  // Palavras filtradas
  const filteredWords = useMemo(() => {
    let result = [...words];
    
    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(word => 
        word.palavra.toLowerCase().includes(query) ||
        word.definicoes?.some(def => def.toLowerCase().includes(query))
      );
    }
    
    // Filtro por letra
    if (selectedLetter) {
      result = result.filter(word => 
        word.palavra.toUpperCase().startsWith(selectedLetter)
      );
    }
    
    // Filtro por livro
    if (selectedBookFilter !== 'all') {
      if (selectedBookFilter === 'no-book') {
        result = result.filter(word => !word.book_id);
      } else {
        result = result.filter(word => word.book_id === selectedBookFilter);
      }
    }
    
    // Ordenar alfabeticamente
    result.sort((a, b) => a.palavra.localeCompare(b.palavra, 'pt-BR'));
    
    return result;
  }, [words, searchQuery, selectedLetter, selectedBookFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE);
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredWords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWords, currentPage]);

  // Contagem por letra
  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALPHABET.forEach(letter => {
      counts[letter] = words.filter(word => 
        word.palavra.toUpperCase().startsWith(letter)
      ).length;
    });
    return counts;
  }, [words]);

  // Reset página quando filtros mudam
  const handleLetterClick = (letter: string) => {
    setSelectedLetter(selectedLetter === letter ? null : letter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleBookFilterChange = (value: string) => {
    setSelectedBookFilter(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLetter(null);
    setSelectedBookFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedLetter || selectedBookFilter !== 'all';

  const getConnectionCount = (word: VocabularyEntry) => {
    return connectionMap.get(word.palavra.toLowerCase())?.size || 0;
  };

  if (words.length === 0) {
    return null;
  }

  return (
    <div className="card-library p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Palavras Salvas</h3>
          <Badge variant="secondary" className="text-xs">
            {words.length.toLocaleString('pt-BR')}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-muted-foreground"
        >
          <Filter className="w-4 h-4 mr-1" />
          Filtros
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar palavra ou definição..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
          {/* Alphabet Navigation */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Filtrar por letra inicial</p>
            <div className="flex flex-wrap gap-1">
              {ALPHABET.map(letter => {
                const count = letterCounts[letter];
                const isActive = selectedLetter === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => handleLetterClick(letter)}
                    disabled={count === 0}
                    className={`
                      w-7 h-7 text-xs font-medium rounded transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : count > 0 
                          ? 'bg-secondary text-secondary-foreground hover:bg-primary/20' 
                          : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                      }
                    `}
                    title={`${count} palavra${count !== 1 ? 's' : ''}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Book Filter */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Filtrar por livro</p>
            <Select value={selectedBookFilter} onValueChange={handleBookFilterChange}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Todos os livros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📚 Todos os livros</SelectItem>
                <SelectItem value="no-book">📝 Sem livro vinculado</SelectItem>
                {books.map(book => (
                  <SelectItem key={book.id} value={book.id}>
                    📖 {book.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* Results Count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          {filteredWords.length === 0 
            ? 'Nenhuma palavra encontrada' 
            : `${filteredWords.length.toLocaleString('pt-BR')} palavra${filteredWords.length !== 1 ? 's' : ''} encontrada${filteredWords.length !== 1 ? 's' : ''}`
          }
        </p>
      )}

      {/* Words Grid */}
      <ScrollArea className="max-h-[400px]">
        <div className="flex flex-wrap gap-2">
          {paginatedWords.map((entry) => {
            const connectionCount = getConnectionCount(entry);
            return (
              <button
                key={entry.id}
                onClick={() => onSelectWord(entry)}
                className="group relative px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1.5"
              >
                {entry.book_id && <Book className="w-3 h-3 opacity-60" />}
                <span>{entry.palavra}</span>
                {connectionCount > 0 && (
                  <span className="flex items-center gap-0.5 text-xs opacity-60 group-hover:opacity-100">
                    <Link2 className="w-3 h-3" />
                    {connectionCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
