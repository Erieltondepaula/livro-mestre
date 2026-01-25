import { useState, forwardRef } from 'react';
import { Edit2, Trash2, BookOpen } from 'lucide-react';
import type { Book, BookStatus, DailyReading } from '@/types/library';
import { BookEditDialog } from './BookEditDialog';

// SETOR 1: Definição de Tipagem (Props)
// Define quais dados este componente precisa receber do componente "pai" para funcionar.
interface BooksListViewProps {
  books: Book[];            // Lista de todos os livros cadastrados
  statuses: BookStatus[];   // Status de leitura de cada livro (lido, lendo, etc)
  readings: DailyReading[]; // Histórico de todas as sessões de leitura
  onDeleteBook: (id: string) => void; // Função para deletar um livro
  onUpdateBook: (book: Book) => void; // Função para atualizar dados de um livro
}

export const BooksListView = forwardRef<HTMLDivElement, BooksListViewProps>(function BooksListView({ books, statuses, readings, onDeleteBook, onUpdateBook }, ref) {
  // SETOR 2: Estados Locais
  // Controla se o modal de edição está aberto e qual livro está sendo editado.
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  // SETOR 3: Funções de Busca de Dados
  // Procura no array de statuses o status específico de um livro usando o ID.
  const getBookStatus = (bookId: string) => {
    return statuses.find(s => s.livroId === bookId);
  };

  // SETOR 4: Lógica de Velocidade de Leitura
  // Calcula a média de páginas por minuto baseada em todo o histórico de leituras do livro.
  // NOTA: tempoGasto agora está em SEGUNDOS
  const getAverageReadingSpeed = (bookId: string): number | null => {
    const bookReadings = readings.filter(r => r.livroId === bookId && r.tempoGasto > 0);
    
    if (bookReadings.length === 0) return null;
    
    const totalPages = bookReadings.reduce((sum, r) => sum + r.quantidadePaginas, 0);
    const totalMinutes = bookReadings.reduce((sum, r) => sum + r.tempoGasto, 0); // tempoGasto já em minutos
    
    if (totalMinutes === 0) return null;
    
    return totalPages / totalMinutes; // Retorna páginas lidas por minuto
  };

  // SETOR 5: Estimativa de Tempo Restante
  // Calcula quanto tempo (horas/minutos) falta para terminar o livro baseado na velocidade do usuário.
  const getReadingTimeEstimate = (book: Book, status: BookStatus | undefined): string | null => {
    if (!status) return null;
    
    const pagesRemaining = book.totalPaginas - status.quantidadeLida;
    if (pagesRemaining <= 0) return null;
    
    const avgSpeed = getAverageReadingSpeed(book.id);
    
    // Se não houver histórico, assume um padrão de 2 minutos por página.
    const minutesPerPage = avgSpeed ? (1 / avgSpeed) : 2;
    const totalMinutes = Math.round(pagesRemaining * minutesPerPage);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  // SETOR 6: Lógica de Cores e Texto de Status
  // Define a cor e o texto que aparece no card (verde para concluído, azul ou laranja para progresso).
  const getStatusInfo = (book: Book, status: BookStatus | undefined): { text: string; colorClass: string } => {
    if (!status || status.status === 'Não iniciado') {
      return { text: 'Não iniciado', colorClass: 'text-gray-500' };
    }
    
    if (status.status === 'Concluido') {
      return { text: 'Livro concluído', colorClass: 'text-green-600' };
    }
    
    const percentRead = (status.quantidadeLida / book.totalPaginas) * 100;
    
    if (percentRead > 50) {
      return { text: '', colorClass: 'text-orange-500' }; // Laranja se passou da metade
    }
    
    return { text: '', colorClass: 'text-blue-600' }; // Azul se está no começo
  };

  // SETOR 7: Renderização da Interface (UI)
  return (
    <div ref={ref} className="space-y-8">
      {/* Título da Seção */}
      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-primary" />
        <h2 className="font-display text-3xl font-bold text-foreground">Livros Cadastrados</h2>
      </div>

      {/* Verificação de Lista Vazia */}
      {books.length === 0 ? (
        <div className="card-library p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum livro cadastrado ainda. Comece cadastrando o seu primeiro livro!
          </p>
        </div>
      ) : (
        /* SETOR 8: Grid de Cartões - Estilo Kindle */
        /* Grid responsivo com espaçamento consistente em qualquer nível de zoom */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
          {books.map((book) => {
            const status = getBookStatus(book.id);
            const timeEstimate = getReadingTimeEstimate(book, status);
            
            return (
              <div
                key={book.id}
                className="card-library overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col"
                style={{ minWidth: 'clamp(200px, 100%, 280px)' }}
              >
                {/* Capa do Livro - Proporção preservada sem corte */}
                <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={`Capa de ${book.livro}`}
                      className="w-full h-full object-contain bg-muted"
                    />
                  ) : (
                    <div className="text-muted-foreground text-xs text-center p-2 flex flex-col items-center justify-center h-full bg-gradient-to-b from-muted to-muted/80">
                      <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                      <span>Sem capa</span>
                    </div>
                  )}
                </div>

                {/* Informações do Livro - Layout expandido */}
                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <h3 className="font-display font-semibold text-foreground text-sm leading-tight" title={book.livro}>
                    {book.livro}
                  </h3>
                  
                  {book.autor && (
                    <p className="text-xs text-muted-foreground" title={book.autor}>{book.autor}</p>
                  )}
                  
                  {/* Detalhes Técnicos */}
                  <div className="text-xs text-muted-foreground space-y-0.5 flex-1">
                    {book.ano && <p>Ano: {book.ano}</p>}
                    <p>Tipo: {book.tipo}</p>
                    {book.categoria && <p>Categoria: {book.categoria}</p>}
                  </div>

                  {/* Exibição do Status Dinâmico - Em uma única linha */}
                  {(() => {
                    const statusInfo = getStatusInfo(book, status);
                    if (status?.status === 'Concluido') {
                      return <p className={`text-xs font-medium ${statusInfo.colorClass} whitespace-nowrap`}>{statusInfo.text}</p>;
                    }
                    if (timeEstimate) {
                      return (
                        <p className={`text-xs font-medium ${statusInfo.colorClass} whitespace-nowrap`}>
                          Finalizar: {timeEstimate}
                        </p>
                      );
                    }
                    if (status?.status === 'Não iniciado' || !status) {
                      return <p className={`text-xs font-medium ${statusInfo.colorClass} whitespace-nowrap`}>{statusInfo.text}</p>;
                    }
                    return null;
                  })()}

                  {/* SETOR 9: Botões de Ação - Compacto */}
                  <div className="flex justify-center gap-1.5 pt-1.5 mt-auto">
                    <button
                      onClick={() => setEditingBook(book)}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                      title="Editar livro"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja remover "${book.livro}"?`)) {
                          onDeleteBook(book.id);
                        }
                      }}
                      className="p-1.5 rounded-md border border-border bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      title="Remover livro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SETOR 10: Modal de Edição (Invisível até ser ativado) */}
      <BookEditDialog
        book={editingBook}
        isOpen={!!editingBook}
        onClose={() => setEditingBook(null)}
        onSave={onUpdateBook}
        onDelete={onDeleteBook}
      />
    </div>
  );
});