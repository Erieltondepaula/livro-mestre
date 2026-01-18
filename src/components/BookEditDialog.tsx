import { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import type { Book, BookType, BookCategory } from '@/types/library';

interface BookEditDialogProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (book: Book) => void;
  onDelete: (id: string) => void;
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

export function BookEditDialog({ book, isOpen, onClose, onSave, onDelete }: BookEditDialogProps) {
  const [livro, setLivro] = useState('');
  const [totalPaginas, setTotalPaginas] = useState('');
  const [tipo, setTipo] = useState<BookType>('Livro');
  const [categoria, setCategoria] = useState<BookCategory>('Ficção');
  const [valorPago, setValorPago] = useState('');

  useEffect(() => {
    if (book) {
      setLivro(book.livro);
      setTotalPaginas(book.totalPaginas.toString());
      setTipo(book.tipo);
      setCategoria(book.categoria);
      setValorPago(book.valorPago.toString());
    }
  }, [book]);

  if (!isOpen || !book) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livro.trim() || !totalPaginas) return;

    onSave({
      ...book,
      livro: livro.trim().toUpperCase(),
      totalPaginas: parseInt(totalPaginas),
      tipo,
      categoria,
      valorPago: parseFloat(valorPago) || 0,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja remover "${book.livro}"?`)) {
      onDelete(book.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-display text-xl font-semibold text-foreground">Editar Livro</h3>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nome do Livro
            </label>
            <input
              type="text"
              value={livro}
              onChange={(e) => setLivro(e.target.value)}
              className="input-library"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Total de Páginas
              </label>
              <input
                type="number"
                value={totalPaginas}
                onChange={(e) => setTotalPaginas(e.target.value)}
                className="input-library"
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

          <div className="grid grid-cols-2 gap-4">
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
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
            <button type="submit" className="btn-primary flex-1">
              <Save className="w-5 h-5" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
