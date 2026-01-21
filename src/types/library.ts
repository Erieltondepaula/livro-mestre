// Tipos dinâmicos - agora vêm do banco de dados
export type BookType = string;
export type BookCategory = string;

export type ReadingStatus = 'Não iniciado' | 'Lendo' | 'Concluido';

export interface Book {
  id: string;
  numero: number;
  livro: string;
  autor?: string;
  ano?: number;
  totalPaginas: number;
  tipo: BookType;
  categoria: BookCategory;
  valorPago: number;
  coverUrl?: string;
}

export interface DailyReading {
  id: string;
  dia: number;
  mes: string;
  livroId: string;
  livroLido: string;
  paginaInicial: number;
  paginaFinal: number;
  tempoGasto: number; // minutos
  quantidadePaginas: number; // calculado automaticamente
  dataInicio?: Date; // Data de início do período de leitura
  dataFim?: Date; // Data de fim do período de leitura
}

export interface BookStatus {
  id: string;
  numero: number;
  livroId: string;
  livro: string;
  status: ReadingStatus;
  quantidadeLida: number;
}

export interface BookEvaluation {
  id: string;
  livroId: string;
  livro: string;
  criatividade: number; // 1-10
  escrita: number; // 1-10
  aprendizados: number; // 1-10
  prazer: number; // 1-10
  impacto: number; // 1-10
  notaFinal: number; // calculado ou manual
  observacoes?: string; // Observações adicionais
}

export interface Quote {
  id: string;
  citacao: string;
  livroId: string;
  livro: string;
  pagina: number;
}

export interface VocabularyWord {
  id: string;
  palavra: string;
  classe: string | null;
  definicoes: string[];
  bookId: string | null;
  bookName: string | null;
  pagina: number | null;
  createdAt: string;
}

export interface DashboardStats {
  totalPaginas: number;
  paginasLidas: number;
  percentualLido: number;
  paginasFaltantes: number;
  diasLeitura: number;
  mediaPaginasDia: number;
  livrosCadastrados: number;
  livrosLendo: number;
  livrosConcluidos: number;
}
