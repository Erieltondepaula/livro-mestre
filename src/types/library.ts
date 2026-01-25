// Tipos dinâmicos - agora vêm do banco de dados
export type BookType = string;
export type BookCategory = string;

export type ReadingStatus = "Não iniciado" | "Lendo" | "Concluido";

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
  tempoGasto: number; // minutos (decimal, ex: 10.5 = 10min 30seg)
  quantidadePaginas: number; // calculado automaticamente
  dataInicio?: Date; // Data de início do período de leitura
  dataFim?: Date; // Data de fim do período de leitura
  ordem?: number; // Propriedade adicionada para controle de sequência e correção de build
  // Bible-specific fields
  bibleBook?: string;
  bibleChapter?: number;
  bibleVerseStart?: number;
  bibleVerseEnd?: number;
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
  // Bible-specific reference fields
  bibleBook?: string;
  bibleChapter?: number;
  bibleVerse?: number;
}

export interface SinonimoGrupo {
  sentido: string;
  palavras: string[];
}

export interface AnaliseContexto {
  frase: string;
  sentidoIdentificado: string;
  explicacao: string;
  fraseReescrita: string;
  sinonimosAdequados: string[];
  // Novos campos v2 - opcionais para compatibilidade com dados existentes
  palavraChave?: string;
  classeGramatical?: string;
  usoComumVsTecnico?: string;
  exemploSimples?: string;
  observacaoNuance?: string;
  aplicacaoPratica?: string;
  // Campos legados para compatibilidade
  sentidosNaoAplicaveis?: string[];
  observacao?: string;
}

export interface VocabularyEntry {
  id: string;
  palavra: string;
  silabas: string | null;
  fonetica: string | null;
  classe: string | null;
  definicoes: string[];
  sinonimos: SinonimoGrupo[];
  antonimos: string[];
  exemplos: string[];
  etimologia: string | null;
  observacoes: string | null;
  analise_contexto: AnaliseContexto | null;
  book_id: string | null;
  bookName?: string | null;
  pagina?: number | null;
  source_type: string | null;
  source_details: {
    bookName?: string;
    author?: string;
    page?: number;
  } | null;
  created_at: string;
}

// Alias para compatibilidade retroativa
export type VocabularyWord = VocabularyEntry;

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
