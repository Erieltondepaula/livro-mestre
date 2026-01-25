import { useState, useEffect, forwardRef } from 'react';
import { X, Save, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImageUpload } from './ImageUpload';
import { toast } from '@/hooks/use-toast';
import type { Book } from '@/types/library';

interface BookEditDialogProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (book: Book) => void;
  onDelete: (id: string) => void;
}

export const BookEditDialog = forwardRef<HTMLDivElement, BookEditDialogProps>(function BookEditDialog({ book, isOpen, onClose, onSave, onDelete }, ref) {
  const { isAdmin } = useAuth();
  const [livro, setLivro] = useState('');
  const [autor, setAutor] = useState('');
  const [ano, setAno] = useState('');
  const [totalPaginas, setTotalPaginas] = useState('');
  const [tipo, setTipo] = useState('Livro');
  const [categoria, setCategoria] = useState('Ficção');
  const [valorPago, setValorPago] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  
  const [bookTypes, setBookTypes] = useState<string[]>([]);
  const [bookCategories, setBookCategories] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewType, setShowNewType] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => {
    loadTypesAndCategories();
  }, []);

  useEffect(() => {
    if (book) {
      setLivro(book.livro);
      setAutor(book.autor || '');
      setAno(book.ano?.toString() || '');
      setTotalPaginas(book.totalPaginas.toString());
      setTipo(book.tipo);
      setCategoria(book.categoria);
      setValorPago(book.valorPago.toString());
      setCoverUrl(book.coverUrl);
    }
  }, [book]);

  const loadTypesAndCategories = async () => {
    const { data: typesData } = await supabase
      .from('book_types')
      .select('name')
      .order('name');
    
    const { data: categoriesData } = await supabase
      .from('book_categories')
      .select('name')
      .order('name');

    if (typesData) setBookTypes(typesData.map(t => t.name));
    if (categoriesData) setBookCategories(categoriesData.map(c => c.name));
  };

  const handleAddType = async () => {
    if (!newType.trim()) return;
    if (!isAdmin) {
      toast({ title: "Acesso negado", description: "Apenas administradores podem adicionar tipos.", variant: "destructive" });
      return;
    }
    
    const { error } = await supabase.from('book_types').insert({ name: newType.trim() });
    
    if (!error) {
      setTipo(newType.trim());
      setNewType('');
      setShowNewType(false);
      loadTypesAndCategories();
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    if (!isAdmin) {
      toast({ title: "Acesso negado", description: "Apenas administradores podem adicionar categorias.", variant: "destructive" });
      return;
    }
    
    const { error } = await supabase.from('book_categories').insert({ name: newCategory.trim() });
    
    if (!error) {
      setCategoria(newCategory.trim());
      setNewCategory('');
      setShowNewCategory(false);
      loadTypesAndCategories();
    }
  };

  if (!isOpen || !book) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livro.trim() || !totalPaginas) return;

    onSave({
      ...book,
      livro: livro.trim().toUpperCase(),
      autor: autor.trim() || undefined,
      ano: ano ? parseInt(ano) : undefined,
      totalPaginas: parseInt(totalPaginas),
      tipo: tipo as Book['tipo'],
      categoria: categoria as Book['categoria'],
      valorPago: parseFloat(valorPago) || 0,
      coverUrl,
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
    <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center">
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
          <div className="flex gap-4">
            <ImageUpload
              value={coverUrl}
              onChange={setCoverUrl}
              bookName={livro}
            />
            
            <div className="flex-1 space-y-3">
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
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Autor
                </label>
                <input
                  type="text"
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  className="input-library"
                  placeholder="Ex: Antoine de Saint-Exupéry"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Ano
              </label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="input-library"
                placeholder="Ex: 2023"
                min="1000"
                max="2100"
              />
            </div>
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
              {showNewType ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="input-library flex-1"
                    placeholder="Novo tipo..."
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddType}
                    className="px-2 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewType(false)}
                    className="px-2 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="input-library flex-1"
                  >
                    {bookTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewType(true)}
                    className="px-2 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    title="Adicionar novo tipo"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Categoria
              </label>
              {showNewCategory ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="input-library flex-1"
                    placeholder="Nova categoria..."
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-2 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(false)}
                    className="px-2 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="input-library flex-1"
                  >
                    {bookCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="px-2 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    title="Adicionar nova categoria"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
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
});
