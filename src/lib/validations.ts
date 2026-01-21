import { z } from 'zod';

// Book validation schema
export const bookSchema = z.object({
  livro: z.string()
    .min(1, 'Nome do livro é obrigatório')
    .max(200, 'Nome do livro deve ter no máximo 200 caracteres')
    .transform(val => val.trim().toUpperCase()),
  autor: z.string()
    .max(150, 'Nome do autor deve ter no máximo 150 caracteres')
    .optional()
    .transform(val => val?.trim() || undefined),
  ano: z.number()
    .int('Ano deve ser um número inteiro')
    .min(1000, 'Ano inválido')
    .max(2100, 'Ano inválido')
    .optional()
    .nullable(),
  totalPaginas: z.number()
    .int('Total de páginas deve ser um número inteiro')
    .min(1, 'Deve ter pelo menos 1 página')
    .max(50000, 'Total de páginas muito alto'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  valorPago: z.number()
    .min(0, 'Valor não pode ser negativo')
    .max(100000, 'Valor muito alto')
    .default(0),
  coverUrl: z.string().url().optional().nullable(),
});

export type BookInput = z.infer<typeof bookSchema>;

// Reading validation schema
export const readingSchema = z.object({
  livroId: z.string().uuid('ID do livro inválido'),
  livroLido: z.string().min(1),
  dia: z.number()
    .int('Dia deve ser um número inteiro')
    .min(1, 'Dia deve ser entre 1 e 31')
    .max(31, 'Dia deve ser entre 1 e 31'),
  mes: z.string().min(1, 'Mês é obrigatório'),
  paginaInicial: z.number()
    .int('Página deve ser um número inteiro')
    .min(1, 'Página inicial deve ser pelo menos 1'),
  paginaFinal: z.number()
    .int('Página deve ser um número inteiro')
    .min(1, 'Página final deve ser pelo menos 1'),
  tempoGasto: z.number()
    .int('Tempo deve ser um número inteiro')
    .min(1, 'Tempo gasto deve ser pelo menos 1 minuto')
    .max(1440, 'Tempo gasto não pode exceder 24 horas'),
  dataInicio: z.date().optional(),
  dataFim: z.date().optional(),
  isRetroactive: z.boolean().optional(),
}).refine(data => data.paginaFinal >= data.paginaInicial, {
  message: 'Página final deve ser maior ou igual à página inicial',
  path: ['paginaFinal'],
});

export type ReadingInput = z.infer<typeof readingSchema>;

// Quote validation schema
export const quoteSchema = z.object({
  livroId: z.string().uuid('ID do livro inválido'),
  livro: z.string().min(1),
  citacao: z.string()
    .min(1, 'Citação é obrigatória')
    .max(2000, 'Citação deve ter no máximo 2000 caracteres')
    .transform(val => val.trim()),
  pagina: z.number()
    .int('Página deve ser um número inteiro')
    .min(1, 'Página deve ser pelo menos 1')
    .max(50000, 'Número de página muito alto'),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

// Evaluation validation schema
export const evaluationSchema = z.object({
  livroId: z.string().uuid('ID do livro inválido'),
  livro: z.string().min(1),
  criatividade: z.number().int().min(1).max(10),
  escrita: z.number().int().min(1).max(10),
  aprendizados: z.number().int().min(1).max(10),
  prazer: z.number().int().min(1).max(10),
  impacto: z.number().int().min(1).max(10),
  notaFinal: z.number().min(0).max(10),
  observacoes: z.string().max(1000).optional().transform(val => val?.trim() || undefined),
});

export type EvaluationInput = z.infer<typeof evaluationSchema>;

// Helper function to safely parse integers
export function safeParseInt(value: string, defaultValue: number = 0): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Helper function to safely parse floats
export function safeParseFloat(value: string, defaultValue: number = 0): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Validation helper to get error messages
export function getValidationErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (path) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}
