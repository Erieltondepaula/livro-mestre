import { BookOpen, BookCheck, Clock, TrendingUp, Library, Target } from 'lucide-react';
import type { DashboardStats, BookStatus } from '@/types/library';

interface DashboardProps {
  stats: DashboardStats;
  recentStatuses: BookStatus[];
}

export function Dashboard({ stats, recentStatuses }: DashboardProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral do seu progresso de leitura</p>
      </div>

      {/* Progress Card */}
      <div className="card-library-elevated p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-2xl font-semibold text-foreground">Progresso Total</h3>
            <p className="text-muted-foreground mt-1">
              {stats.paginasLidas.toLocaleString()} de {stats.totalPaginas.toLocaleString()} páginas
            </p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-display font-bold text-primary">
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
        
        <p className="text-sm text-muted-foreground mt-4">
          Faltam <span className="font-semibold text-foreground">{stats.paginasFaltantes.toLocaleString()}</span> páginas para completar todos os livros
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Library className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Livros Cadastrados</p>
              <p className="text-2xl font-display font-bold text-foreground">{stats.livrosCadastrados}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-reading/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-reading" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lendo Atualmente</p>
              <p className="text-2xl font-display font-bold text-foreground">{stats.livrosLendo}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
              <BookCheck className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Concluídos</p>
              <p className="text-2xl font-display font-bold text-foreground">{stats.livrosConcluidos}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dias de Leitura</p>
              <p className="text-2xl font-display font-bold text-foreground">{stats.diasLeitura}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Média por Dia</p>
              <p className="text-2xl font-display font-bold text-foreground">
                {stats.mediaPaginasDia.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">pág</span>
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Páginas</p>
              <p className="text-2xl font-display font-bold text-foreground">{stats.totalPaginas.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Status */}
      <div className="card-library p-6">
        <h3 className="font-display text-xl font-semibold text-foreground mb-4">Status dos Livros</h3>
        <div className="overflow-x-auto">
          <table className="table-library">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Livro</th>
                <th>Status</th>
                <th>Páginas Lidas</th>
              </tr>
            </thead>
            <tbody>
              {recentStatuses.map((status) => (
                <tr key={status.id}>
                  <td className="font-medium">{status.numero}</td>
                  <td>{status.livro}</td>
                  <td>
                    <span className={`status-badge ${
                      status.status === 'Não iniciado' ? 'status-not-started' :
                      status.status === 'Lendo' ? 'status-reading' :
                      'status-completed'
                    }`}>
                      {status.status}
                    </span>
                  </td>
                  <td>{status.quantidadeLida}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
