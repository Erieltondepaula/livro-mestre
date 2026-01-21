import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, LayoutDashboard, PlusCircle, Library, BookOpen, BookMarked, Star, Quote, Book } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  is_master: boolean;
}

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSave?: () => void;
  isMasterEditing?: boolean;
}

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'cadastrar', label: 'Cadastrar Livro', icon: PlusCircle },
  { key: 'livros', label: 'Livros Cadastrados', icon: Library },
  { key: 'leitura', label: 'Registrar Leitura', icon: BookOpen },
  { key: 'status', label: 'Status dos Livros', icon: BookMarked },
  { key: 'avaliacao', label: 'Avaliações', icon: Star },
  { key: 'citacoes', label: 'Citações', icon: Quote },
  { key: 'dicionario', label: 'Dicionário', icon: Book },
];

export function UserPermissionsDialog({ open, onOpenChange, user, onSave, isMasterEditing }: UserPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Check if editing a master user (only show info, no permission changes)
  const isEditingMaster = user?.is_master ?? false;

  useEffect(() => {
    if (open && user) {
      loadPermissions();
    }
  }, [open, user]);

  const loadPermissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('module_key')
        .eq('user_id', user.user_id);

      if (error) throw error;

      setPermissions(data?.map(p => p.module_key) || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (moduleKey: string) => {
    setPermissions(prev => 
      prev.includes(moduleKey) 
        ? prev.filter(p => p !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const handleSelectAll = () => {
    setPermissions(MODULES.map(m => m.key));
  };

  const handleDeselectAll = () => {
    setPermissions([]);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Delete all existing permissions for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', user.user_id);

      // Insert new permissions
      if (permissions.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(
            permissions.map(module_key => ({
              user_id: user.user_id,
              module_key,
            }))
          );

        if (error) throw error;
      }

      toast({
        title: "Permissões salvas",
        description: `As permissões de ${user.display_name || user.email} foram atualizadas.`,
      });

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as permissões.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditingMaster ? 'Perfil do Usuário Mestre' : 'Permissões de Módulos'}
          </DialogTitle>
          <DialogDescription>
            {isEditingMaster 
              ? `${user?.display_name || user?.email} é o usuário mestre com acesso total ao sistema.`
              : `Configure os módulos que ${user?.display_name || user?.email} poderá acessar.`
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEditingMaster ? (
          // Master user info view
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground font-medium mb-2">Acesso Total</p>
              <p className="text-sm text-muted-foreground">
                O usuário mestre tem acesso a todos os módulos e funcionalidades do sistema automaticamente. 
                Não é necessário configurar permissões individuais.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULES.map((module) => {
                const Icon = module.icon;
                
                return (
                  <div
                    key={module.key}
                    className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium text-foreground">
                        {module.label}
                      </Label>
                    </div>
                    <Switch checked={true} disabled />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          // Regular user permissions view
          <div className="space-y-6">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Selecionar todos
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Desmarcar todos
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULES.map((module) => {
                const Icon = module.icon;
                const isEnabled = permissions.includes(module.key);
                
                return (
                  <div
                    key={module.key}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isEnabled 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Label 
                        htmlFor={module.key} 
                        className={`text-sm font-medium cursor-pointer ${
                          isEnabled ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {module.label}
                      </Label>
                    </div>
                    <Switch
                      id={module.key}
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(module.key)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Permissões
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}