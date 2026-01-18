import { Trash2 } from 'lucide-react';
import type { BookStatus, Book } from '@/types/library';

interface StatusViewProps {
  statuses: BookStatus[];
  books: Book[];
  onDeleteBook: (id: string) => void;
}

export function StatusView({ statuses, books, onDeleteBook }: StatusViewProps) {
  const getBookProgress = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    if (!book) return 0;
    return (status.quantidadeLida / book.totalPaginas) * 100;
  };

  const getBookTotal = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    return book?.totalPaginas || 0;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Status dos Livros</h2>
        <p className="text-muted-foreground">Acompanhe o progresso de cada livro</p>
      </div>

      <div className="card-library p-6">
        <div className="overflow-x-auto">
          <table className="table-library">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Livro</th>
                <th>Status</th>
                <th>Progresso</th>
                <th>Quantidade Lida</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((status) => {
                const progress = getBookProgress(status);
                const total = getBookTotal(status);
                
                return (
                  <tr key={status.id}>
                    <td className="font-medium">{status.numero}</td>
                    <td className="font-medium">{status.livro}</td>
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
                    <td>
                      <button
                        onClick={() => onDeleteBook(status.livroId)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover livro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {statuses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum livro cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
