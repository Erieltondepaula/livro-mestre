import { BookOpen, BookCheck, Clock, TrendingUp, Library, Target, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { DashboardStats, BookStatus, Book } from '@/types/library';

interface DashboardProps {
  stats: DashboardStats;
  recentStatuses: BookStatus[];
  books: Book[];
  onClearData: () => void;
}

export function Dashboard({ stats, recentStatuses, books, onClearData }: DashboardProps) {
  // Calcular a percentagem de leitura para cada status
  const getReadPercentage = (status: BookStatus) => {
    const book = books.find(b => b.id === status.livroId);
    if (!book || book.totalPaginas === 0) return 0;
    return Math.min(100, (status.quantidadeLida / book.totalPaginas) * 100);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">Dashboard</h2>
          <p className="text-sm md:text-base text-muted-foreground">Visão geral do seu progresso de leitura</p>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive w-full sm:w-auto">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Dados
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá remover TODOS os dados: livros, leituras, avaliações e citações. 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">
                Sim, limpar tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Progress Card */}
      <div className="card-library-elevated p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">Progresso Total</h3>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {stats.paginasLidas.toLocaleString()} de {stats.totalPaginas.toLocaleString()} páginas
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-3xl md:text-4xl font-display font-bold text-primary">
              {stats.percentualLido.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${Math.min(stats.percentualLido, 100)}%` }}
          />
        </div>
        
        <p className="text-xs md:text-sm text-muted-foreground mt-3 md:mt-4">
          Faltam <span className="font-semibold text-foreground">{stats.paginasFaltantes.toLocaleString()}</span> páginas para completar todos os livros
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
        <div className="stat-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Library className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Livros Cadastrados</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.livrosCadastrados}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-reading/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-reading" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Lendo Atualmente</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.livrosLendo}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <BookCheck className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Concluídos</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.livrosConcluidos}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Dias de Leitura</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.diasLeitura}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Média por Dia</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                {stats.mediaPaginasDia.toFixed(1)} <span className="text-xs sm:text-sm font-normal text-muted-foreground">pág</span>
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total de Páginas</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{stats.totalPaginas.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Status */}
      <div className="card-library p-4 md:p-6">
        <h3 className="font-display text-lg md:text-xl font-semibold text-foreground mb-4">Status dos Livros</h3>
        {recentStatuses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm md:text-base">
            Nenhum livro cadastrado ainda. Comece cadastrando o seu primeiro livro!
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[600px] md:min-w-0 px-4 md:px-0">
              <table className="table-library w-full">
                <thead>
                  <tr>
                    <th className="text-xs md:text-sm">Nº</th>
                    <th className="text-xs md:text-sm hidden sm:table-cell">Miniatura</th>
                    <th className="text-xs md:text-sm">Livro</th>
                    <th className="text-xs md:text-sm">Status</th>
                    <th className="text-xs md:text-sm">Lido</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStatuses.map((status) => {
                    const book = books.find(b => b.id === status.livroId);
                    return (
                      <tr key={status.id}>
                        <td className="font-medium text-sm">{status.numero}</td>
                        <td className="hidden sm:table-cell">
                          <div className="w-10 h-14 md:w-12 md:h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
                            {book?.coverUrl ? (
                              <img
                                src={book.coverUrl}
                                alt={`Capa de ${status.livro}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[8px] md:text-[10px] text-muted-foreground text-center">Sem capa</span>
                            )}
                          </div>
                        </td>
                        <td className="uppercase font-medium text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{status.livro}</td>
                        <td>
                          <span className={`status-badge text-xs ${
                            status.status === 'Não iniciado' ? 'status-not-started' :
                            status.status === 'Lendo' ? 'status-reading' :
                            'status-completed'
                          }`}>
                            {status.status}
                          </span>
                        </td>
                        <td className="text-sm">{getReadPercentage(status).toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
