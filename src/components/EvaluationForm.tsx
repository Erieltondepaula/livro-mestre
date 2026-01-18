import { useState } from 'react';
import { Star, Save } from 'lucide-react';
import type { Book, BookEvaluation } from '@/types/library';

interface EvaluationFormProps {
  books: Book[];
  evaluations: BookEvaluation[];
  onSubmit: (evaluation: Omit<BookEvaluation, 'id'>) => void;
}

const criterios = [
  { key: 'criatividade' as const, label: 'Criatividade/Inovação' },
  { key: 'escrita' as const, label: 'Escrita' },
  { key: 'aprendizados' as const, label: 'Aprendizados' },
  { key: 'prazer' as const, label: 'Prazer ou Divertimento ao Ler' },
  { key: 'impacto' as const, label: 'Impacto' },
];

function RatingStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="rating-star"
        >
          <Star
            className={`w-5 h-5 ${n <= value ? 'fill-accent text-accent' : 'text-muted'}`}
          />
        </button>
      ))}
    </div>
  );
}

export function EvaluationForm({ books, evaluations, onSubmit }: EvaluationFormProps) {
  const [livroId, setLivroId] = useState('');
  const [ratings, setRatings] = useState({
    criatividade: 0,
    escrita: 0,
    aprendizados: 0,
    prazer: 0,
    impacto: 0,
  });

  const selectedBook = books.find(b => b.id === livroId);
  const existingEval = evaluations.find(e => e.livroId === livroId);

  const handleBookChange = (id: string) => {
    setLivroId(id);
    const existing = evaluations.find(e => e.livroId === id);
    if (existing) {
      setRatings({
        criatividade: existing.criatividade,
        escrita: existing.escrita,
        aprendizados: existing.aprendizados,
        prazer: existing.prazer,
        impacto: existing.impacto,
      });
    } else {
      setRatings({
        criatividade: 0,
        escrita: 0,
        aprendizados: 0,
        prazer: 0,
        impacto: 0,
      });
    }
  };

  const notaFinal = Object.values(ratings).reduce((a, b) => a + b, 0) / 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livroId || !selectedBook) return;

    onSubmit({
      livroId,
      livro: selectedBook.livro,
      ...ratings,
      notaFinal: Math.round(notaFinal * 10) / 10,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Avaliações</h2>
        <p className="text-muted-foreground">Avalie os livros que você leu</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card-library-elevated p-8">
          <h3 className="font-display text-xl font-semibold text-foreground mb-6">Nova Avaliação</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Livro
              </label>
              <select
                value={livroId}
                onChange={(e) => handleBookChange(e.target.value)}
                className="input-library"
                required
              >
                <option value="">Selecione um livro</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.livro}
                  </option>
                ))}
              </select>
              {existingEval && (
                <p className="text-sm text-muted-foreground mt-2">
                  Este livro já possui avaliação. Os valores serão atualizados.
                </p>
              )}
            </div>

            {criterios.map((criterio) => (
              <div key={criterio.key}>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {criterio.label}
                </label>
                <RatingStars
                  value={ratings[criterio.key]}
                  onChange={(v) => setRatings(prev => ({ ...prev, [criterio.key]: v }))}
                />
              </div>
            ))}

            {livroId && (
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Nota Final (média)</p>
                <p className="text-3xl font-display font-bold text-primary">
                  {notaFinal.toFixed(1)}
                </p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full">
              <Save className="w-5 h-5" />
              Salvar Avaliação
            </button>
          </form>
        </div>

        <div className="card-library p-6">
          <h3 className="font-display text-xl font-semibold text-foreground mb-4">Avaliações Registadas</h3>
          
          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-foreground">{evaluation.livro}</h4>
                  <span className="text-xl font-display font-bold text-primary">
                    {evaluation.notaFinal.toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Criatividade: {evaluation.criatividade}</span>
                  <span className="text-muted-foreground">Escrita: {evaluation.escrita}</span>
                  <span className="text-muted-foreground">Aprendizados: {evaluation.aprendizados}</span>
                  <span className="text-muted-foreground">Prazer: {evaluation.prazer}</span>
                  <span className="text-muted-foreground">Impacto: {evaluation.impacto}</span>
                </div>
              </div>
            ))}
            {evaluations.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma avaliação registada ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
