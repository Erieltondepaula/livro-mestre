import { useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import type { BookStatus, Book } from '@/types/library';
import { BookEditDialog } from './BookEditDialog';

interface StatusViewProps {
  statuses: BookStatus[];
  books: Book[];
  onDeleteBook: (id: string) => void;
  onUpdateBook: (book: Book) => void;
}

export function StatusView({ statuses, books, onDeleteBook, onUpdateBook }: StatusViewProps) {
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const getBookProgress = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    if (!book) return 0;
    return (status.quantidadeLida / book.totalPaginas) * 100;
  };

  const getBookTotal = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    return book?.totalPaginas || 0;
  };

  const handleEditClick = (livroId: string) => {
    const book = books.find(b => b.id === livroId);
    if (book) {
      setEditingBook(book);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Status dos Livros</h2>
        <p className="text-muted-foreground">Clique num livro para editar ou acompanhe o progresso</p>
      </div>

      <div className="card-library p-6">
        <div className="overflow-x-auto">
          <table className="table-library">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Miniatura</th>
                <th>Livro</th>
                <th>Status</th>
                <th>Progresso</th>
                <th>Quantidade Lida</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((status) => {
                const progress = getBookProgress(status);
                const total = getBookTotal(status);
                const book = books.find(b => b.id === status.livroId);
                
                return (
                  <tr 
                    key={status.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleEditClick(status.livroId)}
                  >
                    <td className="font-medium">{status.numero}</td>
                    <td>
                      <div className="w-12 h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
                        {book?.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={`Capa de ${status.livro}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground text-center">Sem capa</span>
                        )}
                      </div>
                    </td>
                    <td className="font-medium">
                      <div className="flex flex-col">
                        <span className="uppercase">{status.livro}</span>
                        {book && (
                          <span className="text-xs text-muted-foreground">
                            {book.categoria} • {book.tipo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${
                        status.status === 'Não iniciado' ? 'status-not-started' :
                        status.status === 'Lendo' ? 'status-reading' :
                        'status-completed'
                      }`}>
                        {status.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3 min-w-[150px]">
                        <div className="progress-bar-container flex-1">
                          <div 
                            className="progress-bar-fill" 
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="font-medium">{status.quantidadeLida}</span>
                      <span className="text-muted-foreground"> / {total} pág</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditClick(status.livroId)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Editar livro"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover "${status.livro}"?`)) {
                              onDeleteBook(status.livroId);
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
                );
              })}
              {statuses.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground py-8">
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
