import { useState, useEffect } from 'react';
import { safeParseInt, safeParseFloat } from '@/lib/validations';
import { PlusCircle, Plus, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ManageOptionsDialog } from './ManageOptionsDialog';
import { ImageUpload } from './ImageUpload';
import { UpgradePrompt } from './UpgradePrompt';
import { toast } from '@/hooks/use-toast';
import type { Book } from '@/types/library';

const FREE_PLAN_BOOK_LIMIT = 3;

interface BookFormProps {
  onSubmit: (book: Omit<Book, 'id' | 'numero'>) => void;
  currentBookCount?: number;
}

export function BookForm({ onSubmit, currentBookCount = 0 }: BookFormProps) {
  const { isAdmin } = useAuth();
  const { subscription } = useSubscription();
  const [livro, setLivro] = useState('');
  const [autor, setAutor] = useState('');
  const [ano, setAno] = useState('');
  const [totalPaginas, setTotalPaginas] = useState('');
  const [tipo, setTipo] = useState('Livro');
  const [categoria, setCategoria] = useState('Ficção');
  const [valorPago, setValorPago] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [targetCompletionDate, setTargetCompletionDate] = useState('');
  
  const [bookTypes, setBookTypes] = useState<string[]>([]);
  const [bookCategories, setBookCategories] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewType, setShowNewType] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

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
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem adicionar tipos.",
        variant: "destructive",
      });
      return;
    }
    
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
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem adicionar categorias.",
        variant: "destructive",
      });
      return;
    }
    
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

    // Verificar limite de livros no plano gratuito
    // Mestre e usuários com assinatura ativa podem cadastrar ilimitado
    if (subscription.isFreePlan && !subscription.isMasterUser && currentBookCount >= FREE_PLAN_BOOK_LIMIT) {
      setShowUpgradePrompt(true);
      return;
    }

    onSubmit({
      livro: livro.trim().toUpperCase(),
      autor: autor.trim() || undefined,
      ano: ano ? safeParseInt(ano) : undefined,
      totalPaginas: safeParseInt(totalPaginas, 1),
      tipo: tipo as Book['tipo'],
      categoria: categoria as Book['categoria'],
      valorPago: safeParseFloat(valorPago, 0),
      coverUrl,
      targetCompletionDate: targetCompletionDate || undefined,
    });

    // Reset form
    setLivro('');
    setAutor('');
    setAno('');
    setTotalPaginas('');
    setTipo('Livro');
    setCategoria('Ficção');
    setValorPago('');
    setCoverUrl(undefined);
    setTargetCompletionDate('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Cadastrar Livro</h2>
        <p className="text-muted-foreground">Adicione um novo livro à sua biblioteca</p>
      </div>

      <div className="card-library-elevated p-4 sm:p-6 lg:p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <ImageUpload
              value={coverUrl}
              onChange={setCoverUrl}
              bookName={livro}
            />
            
            <div className="flex-1 space-y-4">
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

          <div className="grid grid-cols-2 gap-3 sm:gap-6">
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
                placeholder="Ex: 200"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
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
                    className="input-library flex-1 min-w-0"
                    placeholder="Novo tipo..."
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddType}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewType(false)}
                    className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="input-library flex-1 min-w-0"
                  >
                    {bookTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewType(true)}
                    className="px-2 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 shrink-0"
                    title="Adicionar novo tipo"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageTypesOpen(true)}
                    className="px-2 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 shrink-0"
                    title="Gerenciar tipos"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
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

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Data Prevista para Conclusão (Opcional)
            </label>
            <input
              type="date"
              value={targetCompletionDate}
              onChange={(e) => setTargetCompletionDate(e.target.value)}
              className="input-library"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Define uma meta para finalizar a leitura. Útil para planos de leitura devocionais ou metas pessoais.
            </p>
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

      {/* Popup de Upgrade para Plano Gratuito */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        currentBookCount={currentBookCount}
      />
    </div>
  );
}
