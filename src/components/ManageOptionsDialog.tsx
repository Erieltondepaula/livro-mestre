import { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Trash2, Check, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ManageOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'types' | 'categories';
  title: string;
}

interface Option {
  id: string;
  name: string;
}

export function ManageOptionsDialog({ isOpen, onClose, type, title }: ManageOptionsDialogProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showNew, setShowNew] = useState(false);

  const tableName = type === 'types' ? 'book_types' : 'book_categories';

  const loadOptions = useCallback(async () => {
    const { data } = await supabase
      .from(tableName)
      .select('id, name')
      .order('name');
    
    if (data) setOptions(data);
  }, [tableName]);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen, loadOptions]);

  const handleStartEdit = (option: Option) => {
    setEditingId(option.id);
    setEditingValue(option.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingValue.trim()) return;

    const { error } = await supabase
      .from(tableName)
      .update({ name: editingValue.trim() })
      .eq('id', editingId);

    if (!error) {
      setEditingId(null);
      setEditingValue('');
      loadOptions();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover "${name}"?`)) return;

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (!error) {
      loadOptions();
    }
  };

  const handleAddNew = async () => {
    if (!newValue.trim()) return;

    const { error } = await supabase
      .from(tableName)
      .insert({ name: newValue.trim() });

    if (!error) {
      setNewValue('');
      setShowNew(false);
      loadOptions();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {options.map((option) => (
            <div key={option.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              {editingId === option.id ? (
                <>
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="input-library flex-1 py-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Salvar"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-foreground">{option.name}</span>
                  <button
                    onClick={() => handleStartEdit(option)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(option.id, option.name)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}

          {options.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum item cadastrado
            </p>
          )}
        </div>

        <div className="p-4 border-t border-border">
          {showNew ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="input-library flex-1"
                placeholder={`Novo ${type === 'types' ? 'tipo' : 'categoria'}...`}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
              />
              <button
                onClick={handleAddNew}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="btn-primary w-full"
            >
              <Plus className="w-4 h-4" />
              Adicionar Novo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}