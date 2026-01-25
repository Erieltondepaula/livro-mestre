import { useState } from 'react';
import { Trash2, Edit2, BarChart3 } from 'lucide-react';
import type { BookStatus, Book, DailyReading, BookEvaluation, Quote, VocabularyEntry } from '@/types/library';
import { BookEditDialog } from './BookEditDialog';
import { BookMetricsDialog } from './BookMetricsDialog';

interface StatusViewProps {
  statuses: BookStatus[];
  books: Book[];
  readings: DailyReading[];
  evaluations: BookEvaluation[];
  quotes: Quote[];
  vocabulary: VocabularyEntry[];
  onDeleteBook: (id: string) => void;
  onUpdateBook: (book: Book) => void;
  onUpdateReading?: (reading: DailyReading) => void;
}

export function StatusView({ statuses, books, readings, evaluations, quotes, vocabulary, onDeleteBook, onUpdateBook, onUpdateReading }: StatusViewProps) {
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [viewingBook, setViewingBook] = useState<Book | null>(null);

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

  const handleViewMetrics = (livroId: string) => {
    const book = books.find(b => b.id === livroId);
    if (book) {
      setViewingBook(book);
    }
  };

  const getBookStatus = (bookId: string) => {
    return statuses.find(s => s.livroId === bookId) || null;
  };

  const getBookEvaluation = (bookId: string) => {
    return evaluations.find(e => e.livroId === bookId) || null;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">Status dos Livros</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Clique num livro para visualizar métricas detalhadas</p>
      </div>

      <div className="card-library p-3 sm:p-4 lg:p-6">
        <div className="overflow-x-auto">
          <table className="table-library">
            <thead>
              <tr>
                <th className="hidden sm:table-cell">Nº</th>
                <th className="hidden md:table-cell">Miniatura</th>
                <th>Livro</th>
                <th className="hidden sm:table-cell">Status</th>
                <th>Progresso</th>
                <th className="hidden lg:table-cell">Quantidade Lida</th>
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
                    onClick={() => handleViewMetrics(status.livroId)}
                  >
                    <td className="font-medium hidden sm:table-cell">{status.numero}</td>
                    <td className="hidden md:table-cell">
                      <div className="w-10 h-14 lg:w-12 lg:h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
                        {book?.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={`Capa de ${status.livro}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[8px] lg:text-[10px] text-muted-foreground text-center">Sem capa</span>
                        )}
                      </div>
                    </td>
                    <td className="font-medium">
                      <div className="flex flex-col">
                        <span className="uppercase text-xs sm:text-sm lg:text-base line-clamp-2">{status.livro}</span>
                        {book && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {book.categoria} • {book.tipo}
                          </span>
                        )}
                        {/* Mobile: show status inline */}
                        <span className={`sm:hidden mt-1 text-[10px] px-1.5 py-0.5 rounded-full w-fit ${
                          status.status === 'Não iniciado' ? 'bg-muted text-muted-foreground' :
                          status.status === 'Lendo' ? 'bg-reading/20 text-reading' :
                          'bg-success/20 text-success'
                        }`}>
                          {status.status}
                        </span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className={`status-badge text-xs lg:text-sm ${
                        status.status === 'Não iniciado' ? 'status-not-started' :
                        status.status === 'Lendo' ? 'status-reading' :
                        'status-completed'
                      }`}>
                        {status.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 min-w-[80px] sm:min-w-[120px] lg:min-w-[150px]">
                        <div className="progress-bar-container flex-1 h-1.5 sm:h-2">
                          <div 
                            className="progress-bar-fill" 
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className="font-medium">{status.quantidadeLida}</span>
                      <span className="text-muted-foreground"> / {total} pág</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-0.5 sm:gap-1">
                        <button
                          onClick={() => handleViewMetrics(status.livroId)}
                          className="p-1.5 sm:p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Ver métricas"
                        >
                          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(status.livroId)}
                          className="p-1.5 sm:p-2 text-muted-foreground hover:text-primary transition-colors"
                          title="Editar livro"
                        >
                          <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover "${status.livro}"?`)) {
                              onDeleteBook(status.livroId);
                            }
                          }}
                          className="p-1.5 sm:p-2 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover livro"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

      <BookMetricsDialog
        book={viewingBook}
        status={viewingBook ? getBookStatus(viewingBook.id) : null}
        readings={readings}
        evaluation={viewingBook ? getBookEvaluation(viewingBook.id) : null}
        quotes={quotes}
        vocabulary={vocabulary}
        isOpen={!!viewingBook}
        onClose={() => setViewingBook(null)}
        onUpdateReading={onUpdateReading}
      />
    </div>
  );
}
