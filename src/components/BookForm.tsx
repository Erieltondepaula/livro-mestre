import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import type { Book, BookType, BookCategory } from '@/types/library';

interface BookFormProps {
  onSubmit: (book: Omit<Book, 'id' | 'numero'>) => void;
}

const bookTypes: BookType[] = ['Livro', 'Ebook'];

const bookCategories: BookCategory[] = [
  'Espiritualidade ou Religioso',
  'Ficção',
  'Não-Ficção',
  'Biografia',
  'Autoajuda',
  'Negócios',
  'Ciência',
  'História',
  'Romance',
  'Fantasia',
  'Outro',
];

export function BookForm({ onSubmit }: BookFormProps) {
  const [livro, setLivro] = useState('');
  const [totalPaginas, setTotalPaginas] = useState('');
  const [tipo, setTipo] = useState<BookType>('Livro');
  const [categoria, setCategoria] = useState<BookCategory>('Ficção');
  const [valorPago, setValorPago] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livro.trim() || !totalPaginas) return;

    onSubmit({
      livro: livro.trim().toUpperCase(),
      totalPaginas: parseInt(totalPaginas),
      tipo,
      categoria,
      valorPago: parseFloat(valorPago) || 0,
    });

    // Reset form
    setLivro('');
    setTotalPaginas('');
    setTipo('Livro');
    setCategoria('Ficção');
    setValorPago('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Cadastrar Livro</h2>
        <p className="text-muted-foreground">Adicione um novo livro à sua biblioteca</p>
      </div>

      <div className="card-library-elevated p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nome do Livro
            </label>
            <input
              type="text"
              value={livro}
              onChange={(e) => setLivro(e.target.value)}
              className="input-library"
              placeholder="Ex: O Pequeno Príncipe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Total de Páginas
              </label>
              <input
                type="number"
                value={totalPaginas}
                onChange={(e) => setTotalPaginas(e.target.value)}
                className="input-library"
                placeholder="Ex: 200"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as BookType)}
                className="input-library"
              >
                {bookTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as BookCategory)}
                className="input-library"
              >
                {bookCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Valor Pago (R$)
              </label>
              <input
                type="number"
                value={valorPago}
                onChange={(e) => setValorPago(e.target.value)}
                className="input-library"
                placeholder="Ex: 39.90"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            <PlusCircle className="w-5 h-5" />
            Cadastrar Livro
          </button>
        </form>
      </div>
    </div>
  );
}
