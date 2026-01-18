import { useState, useEffect } from 'react';
import { PlusCircle, Plus, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ManageOptionsDialog } from './ManageOptionsDialog';
import type { Book } from '@/types/library';

interface BookFormProps {
  onSubmit: (book: Omit<Book, 'id' | 'numero'>) => void;
}

export function BookForm({ onSubmit }: BookFormProps) {
  const [livro, setLivro] = useState('');
  const [totalPaginas, setTotalPaginas] = useState('');
  const [tipo, setTipo] = useState('Livro');
  const [categoria, setCategoria] = useState('Ficção');
  const [valorPago, setValorPago] = useState('');
  
  const [bookTypes, setBookTypes] = useState<string[]>([]);
  const [bookCategories, setBookCategories] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewType, setShowNewType] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  useEffect(() => {
    loadTypesAndCategories();
  }, []);

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
    
    const { error } = await supabase
      .from('book_types')
      .insert({ name: newType.trim() });
    
    if (!error) {
      setTipo(newType.trim());
      setNewType('');
      setShowNewType(false);
      loadTypesAndCategories();
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    const { error } = await supabase
      .from('book_categories')
      .insert({ name: newCategory.trim() });
    
    if (!error) {
      setCategoria(newCategory.trim());
      setNewCategory('');
      setShowNewCategory(false);
      loadTypesAndCategories();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!livro.trim() || !totalPaginas) return;

    onSubmit({
      livro: livro.trim().toUpperCase(),
      totalPaginas: parseInt(totalPaginas),
      tipo: tipo as Book['tipo'],
      categoria: categoria as Book['categoria'],
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
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewType(false)}
                    className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
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
                    className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    title="Adicionar novo tipo"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageTypesOpen(true)}
                    className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    title="Gerenciar tipos"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
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
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(false)}
                    className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
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
                    className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    title="Adicionar nova categoria"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageCategoriesOpen(true)}
                    className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    title="Gerenciar categorias"
                  >
                    <Settings className="w-4 h-4" />
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

      <ManageOptionsDialog
        isOpen={manageTypesOpen}
        onClose={() => {
          setManageTypesOpen(false);
          loadTypesAndCategories();
        }}
        type="types"
        title="Gerenciar Tipos"
      />

      <ManageOptionsDialog
        isOpen={manageCategoriesOpen}
        onClose={() => {
          setManageCategoriesOpen(false);
          loadTypesAndCategories();
        }}
        type="categories"
        title="Gerenciar Categorias"
      />
    </div>
  );
}
