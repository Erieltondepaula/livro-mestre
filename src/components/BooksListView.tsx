import { useState } from 'react';
import { Edit2, Trash2, BookOpen } from 'lucide-react';
import type { Book, BookStatus } from '@/types/library';
import { BookEditDialog } from './BookEditDialog';

interface BooksListViewProps {
  books: Book[];
  statuses: BookStatus[];
  onDeleteBook: (id: string) => void;
  onUpdateBook: (book: Book) => void;
}

export function BooksListView({ books, statuses, onDeleteBook, onUpdateBook }: BooksListViewProps) {
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const getBookStatus = (bookId: string) => {
    return statuses.find(s => s.livroId === bookId);
  };

  const getReadingTimeEstimate = (book: Book, status: BookStatus | undefined) => {
    if (!status) return null;
    
    const pagesRemaining = book.totalPaginas - status.quantidadeLida;
    if (pagesRemaining <= 0) return null;
    
    // Estimate: 2 min per page
    const totalMinutes = pagesRemaining * 2;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-primary" />
        <h2 className="font-display text-3xl font-bold text-foreground">Livros Cadastrados</h2>
      </div>

      {books.length === 0 ? (
        <div className="card-library p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum livro cadastrado ainda. Comece cadastrando o seu primeiro livro!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => {
            const status = getBookStatus(book.id);
            const isCompleted = status?.status === 'Concluido';
            const timeEstimate = getReadingTimeEstimate(book, status);
            
            return (
              <div
                key={book.id}
                className="card-library overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Cover Image */}
                <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={`Capa de ${book.livro}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground text-sm text-center p-4">
                      Sem capa
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <h3 className="font-display font-semibold text-foreground leading-tight line-clamp-2">
                    {book.livro}
                  </h3>
                  
                  {book.autor && (
                    <p className="text-sm text-muted-foreground">{book.autor}</p>
                  )}
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    {book.ano && <p>Ano: {book.ano}</p>}
                    <p>Tipo: {book.tipo}</p>
                    {book.categoria && <p>Categoria: {book.categoria}</p>}
                  </div>

                  {/* Status indicator */}
                  {isCompleted ? (
                    <p className="text-sm font-medium text-success">Livro concluído</p>
                  ) : timeEstimate ? (
                    <p className="text-sm font-medium text-primary">
                      Tempo para finalizar: {timeEstimate}
                    </p>
                  ) : null}

                  {/* Actions */}
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => setEditingBook(book)}
                      className="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                      title="Editar livro"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja remover "${book.livro}"?`)) {
                          onDeleteBook(book.id);
                        }
                      }}
                      className="p-2 rounded-lg border border-border bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      title="Remover livro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BookEditDialog
        book={editingBook}
        isOpen={!!editingBook}
        onClose={() => setEditingBook(null)}
        onSave={onUpdateBook}
        onDelete={onDeleteBook}
      />
    </div>
  );
}
