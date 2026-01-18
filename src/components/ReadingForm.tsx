import { useState } from 'react';
import { BookOpen, Calculator } from 'lucide-react';
import type { Book, DailyReading } from '@/types/library';

interface ReadingFormProps {
  books: Book[];
  onSubmit: (reading: Omit<DailyReading, 'id' | 'quantidadePaginas'>) => void;
}

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function ReadingForm({ books, onSubmit }: ReadingFormProps) {
  const [livroId, setLivroId] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState(meses[new Date().getMonth()]);
  const [paginaInicial, setPaginaInicial] = useState('');
  const [paginaFinal, setPaginaFinal] = useState('');
  const [tempoGasto, setTempoGasto] = useState('');

  const selectedBook = books.find(b => b.id === livroId);
  const paginasLidas = paginaInicial && paginaFinal 
    ? parseInt(paginaFinal) - parseInt(paginaInicial) 
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livroId || !dia || !paginaInicial || !paginaFinal || !tempoGasto) return;

    const book = books.find(b => b.id === livroId);
    if (!book) return;

    onSubmit({
      livroId,
      livroLido: book.livro,
      dia: parseInt(dia),
      mes,
      paginaInicial: parseInt(paginaInicial),
      paginaFinal: parseInt(paginaFinal),
      tempoGasto: parseInt(tempoGasto),
    });

    // Reset form
    setPaginaInicial('');
    setPaginaFinal('');
    setTempoGasto('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Registar Leitura</h2>
        <p className="text-muted-foreground">Registre a sua sessão de leitura do dia</p>
      </div>

      <div className="card-library-elevated p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Livro
            </label>
            <select
              value={livroId}
              onChange={(e) => setLivroId(e.target.value)}
              className="input-library"
              required
            >
              <option value="">Selecione um livro</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.livro} ({book.totalPaginas} pág)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Dia
              </label>
              <input
                type="number"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="input-library"
                placeholder="Ex: 15"
                min="1"
                max="31"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Mês
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="input-library"
              >
                {meses.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Página Inicial
              </label>
              <input
                type="number"
                value={paginaInicial}
                onChange={(e) => setPaginaInicial(e.target.value)}
                className="input-library"
                placeholder="Ex: 1"
                min="1"
                max={selectedBook?.totalPaginas}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Página Final
              </label>
              <input
                type="number"
                value={paginaFinal}
                onChange={(e) => setPaginaFinal(e.target.value)}
                className="input-library"
                placeholder="Ex: 30"
                min={paginaInicial || 1}
                max={selectedBook?.totalPaginas}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tempo Gasto (minutos)
            </label>
            <input
              type="number"
              value={tempoGasto}
              onChange={(e) => setTempoGasto(e.target.value)}
              className="input-library"
              placeholder="Ex: 45"
              min="1"
              required
            />
          </div>

          {paginasLidas > 0 && (
            <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
              <Calculator className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">
                Páginas lidas nesta sessão: <strong>{paginasLidas}</strong>
              </span>
            </div>
          )}

          <button type="submit" className="btn-primary w-full">
            <BookOpen className="w-5 h-5" />
            Registar Leitura
          </button>
        </form>
      </div>
    </div>
  );
}
