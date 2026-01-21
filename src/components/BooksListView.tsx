import { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { Book } from '@/types/library';
import { BookEditDialog } from './BookEditDialog';

interface BooksListViewProps {
  books: Book[];
  onDeleteBook: (id: string) => void;
  onUpdateBook: (book: Book) => void;
}

export function BooksListView({ books, onDeleteBook, onUpdateBook }: BooksListViewProps) {
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Livros Cadastrados</h2>
        <p className="text-muted-foreground">Todos os livros da sua biblioteca</p>
      </div>

      <div className="card-library p-6">
        <div className="overflow-x-auto">
          <table className="table-library">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Capa</th>
                <th>Livro</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Páginas</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <td className="font-medium">{book.numero}</td>
                  <td>
                    <div className="w-12 h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={`Capa de ${book.livro}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem capa</span>
                      )}
                    </div>
                  </td>
                  <td className="font-medium">{book.livro}</td>
                  <td className="text-muted-foreground">{book.categoria || '-'}</td>
                  <td className="text-muted-foreground">{book.tipo}</td>
                  <td>{book.totalPaginas}</td>
                  <td>
                    {book.valorPago > 0 ? (
                      <span>R$ {book.valorPago.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingBook(book)}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
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
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover livro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum livro cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
