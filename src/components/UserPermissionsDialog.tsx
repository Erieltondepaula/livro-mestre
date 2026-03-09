import { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, LayoutDashboard, PlusCircle, Library, BookOpen, BookMarked,
  Star, Quote, Book, StickyNote, ScrollText, BarChart3, Activity,
  HelpCircle, Brain, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

interface SubFunction {
  key: string;
  label: string;
}

interface ModuleDefinition {
  key: string;
  label: string;
  icon: any;
  subFunctions?: SubFunction[];
}

// Lista completa de módulos com sub-funções
const MODULES: ModuleDefinition[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, subFunctions: [
    { key: 'dashboard.metricas', label: 'Métricas e Estatísticas' },
    { key: 'dashboard.gamificacao', label: 'Gamificação (Metas e Conquistas)' },
  ]},
  { key: 'cadastrar', label: 'Cadastrar Livro', icon: PlusCircle },
  { key: 'livros', label: 'Livros Cadastrados', icon: Library, subFunctions: [
    { key: 'livros.editar', label: 'Editar Livros' },
    { key: 'livros.excluir', label: 'Excluir Livros' },
    { key: 'livros.timeline', label: 'Timeline de Leitura' },
    { key: 'livros.metricas', label: 'Métricas do Livro' },
  ]},
  { key: 'leitura', label: 'Registrar Leitura', icon: BookOpen, subFunctions: [
    { key: 'leitura.registrar', label: 'Registrar Nova Leitura' },
    { key: 'leitura.historico', label: 'Histórico de Leituras' },
    { key: 'leitura.editar', label: 'Editar/Excluir Leituras' },
  ]},
  { key: 'status', label: 'Status dos Livros', icon: BookMarked },
  { key: 'avaliacao', label: 'Avaliações', icon: Star, subFunctions: [
    { key: 'avaliacao.criar', label: 'Criar Avaliação' },
    { key: 'avaliacao.editar', label: 'Editar Avaliação' },
  ]},
  { key: 'citacoes', label: 'Citações', icon: Quote, subFunctions: [
    { key: 'citacoes.adicionar', label: 'Adicionar Citações' },
    { key: 'citacoes.listar', label: 'Listar Citações' },
    { key: 'citacoes.tags', label: 'Gerenciar Tags' },
  ]},
  { key: 'notas', label: 'Notas', icon: StickyNote, subFunctions: [
    { key: 'notas.criar', label: 'Criar/Editar Notas' },
    { key: 'notas.pastas', label: 'Gerenciar Pastas' },
    { key: 'notas.vinculos', label: 'Vínculos entre Notas' },
    { key: 'notas.referencias', label: 'Referências Externas' },
  ]},
  { key: 'biblia', label: 'Progresso Bíblia', icon: Book },
  { key: 'exegese', label: 'Exegese Bíblica', icon: ScrollText, subFunctions: [
    { key: 'exegese.analisar', label: 'Analisar Passagem' },
    { key: 'exegese.historico', label: 'Histórico de Análises' },
    { key: 'exegese.ref_cruzadas', label: 'Referências Cruzadas' },
    { key: 'exegese.esbocos', label: 'Esboços' },
    { key: 'exegese.materiais', label: 'Materiais' },
    { key: 'exegese.titulos', label: 'Gerador de Títulos' },
  ]},
  { key: 'dicionario', label: 'Dicionário', icon: Book, subFunctions: [
    { key: 'dicionario.buscar', label: 'Buscar Palavras' },
    { key: 'dicionario.vocabulario', label: 'Vocabulário Salvo' },
  ]},
  { key: 'flashcards', label: 'Flashcards', icon: Brain },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'diagnostico', label: 'Diagnóstico', icon: Activity },
  { key: 'ajuda', label: 'Ajuda', icon: HelpCircle },
];

export function UserPermissionsDialog({ open, onOpenChange, user, onSave, isMasterEditing }: UserPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  
  const isEditingMaster = user?.is_master ?? false;

  useEffect(() => {
    if (open && user) {
      loadPermissions();
      setExpandedModules([]);
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

  // Check if a module has full access (module key itself is in permissions)
  const hasFullModuleAccess = (moduleKey: string) => permissions.includes(moduleKey);

  // Check if a sub-function is enabled
  const hasSubFunctionAccess = (subKey: string) => permissions.includes(subKey);

  // Check if module has any access (full or partial)
  const hasAnyAccess = (module: ModuleDefinition) => {
    if (permissions.includes(module.key)) return true;
    if (module.subFunctions) {
      return module.subFunctions.some(sf => permissions.includes(sf.key));
    }
    return false;
  };

  // Toggle full module access
  const handleToggleModule = (module: ModuleDefinition) => {
    if (hasFullModuleAccess(module.key)) {
      // Remove module and all its sub-functions
      const keysToRemove = new Set([module.key, ...(module.subFunctions?.map(sf => sf.key) || [])]);
      setPermissions(prev => prev.filter(p => !keysToRemove.has(p)));
    } else {
      // Add full module access, remove individual sub-functions (full access covers them)
      const subKeys = new Set(module.subFunctions?.map(sf => sf.key) || []);
      setPermissions(prev => [
        ...prev.filter(p => p !== module.key && !subKeys.has(p)),
        module.key,
      ]);
    }
  };

  // Toggle individual sub-function
  const handleToggleSubFunction = (module: ModuleDefinition, subKey: string) => {
    setPermissions(prev => {
      let next = [...prev];
      
      // If module has full access, we need to switch to individual mode
      if (next.includes(module.key) && module.subFunctions) {
        // Remove full module key
        next = next.filter(p => p !== module.key);
        // Add all sub-functions except the one being toggled off
        module.subFunctions.forEach(sf => {
          if (sf.key !== subKey && !next.includes(sf.key)) {
            next.push(sf.key);
          }
        });
        return next;
      }
      
      // Toggle individual sub-function
      if (next.includes(subKey)) {
        next = next.filter(p => p !== subKey);
      } else {
        next.push(subKey);
      }
      
      // If all sub-functions are now enabled, upgrade to full module access
      if (module.subFunctions && module.subFunctions.every(sf => next.includes(sf.key))) {
        next = next.filter(p => !module.subFunctions!.some(sf => sf.key === p));
        next.push(module.key);
      }
      
      return next;
    });
  };

  const toggleExpanded = (moduleKey: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleKey)
        ? prev.filter(k => k !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const handleSelectAll = () => {
    setPermissions(MODULES.map(m => m.key));
  };

  const handleDeselectAll = () => {
    setPermissions([]);
  };

  // Count enabled sub-functions for a module
  const getSubFunctionCount = (module: ModuleDefinition) => {
    if (!module.subFunctions) return { enabled: 0, total: 0 };
    if (hasFullModuleAccess(module.key)) return { enabled: module.subFunctions.length, total: module.subFunctions.length };
    const enabled = module.subFunctions.filter(sf => permissions.includes(sf.key)).length;
    return { enabled, total: module.subFunctions.length };
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditingMaster ? 'Perfil do Usuário Mestre' : 'Permissões de Módulos'}
          </DialogTitle>
          <DialogDescription>
            {isEditingMaster 
              ? `${user?.display_name || user?.email} é o usuário mestre com acesso total ao sistema.`
              : `Configure os módulos e funções que ${user?.display_name || user?.email} poderá acessar.`
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEditingMaster ? (
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
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Habilitar todos
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Desabilitar todos
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Habilite módulos completos ou expanda para configurar funções individuais.
            </p>

            <div className="space-y-2">
              {MODULES.map((module) => {
                const Icon = module.icon;
                const isFullAccess = hasFullModuleAccess(module.key);
                const hasAny = hasAnyAccess(module);
                const hasSubs = module.subFunctions && module.subFunctions.length > 0;
                const isExpanded = expandedModules.includes(module.key);
                const counts = getSubFunctionCount(module);

                return (
                  <div key={module.key} className="rounded-lg border transition-colors overflow-hidden"
                    style={{
                      borderColor: hasAny ? 'hsl(var(--primary) / 0.3)' : undefined,
                      backgroundColor: hasAny ? 'hsl(var(--primary) / 0.03)' : undefined,
                    }}
                  >
                    {/* Module header */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {hasSubs ? (
                          <button
                            onClick={() => toggleExpanded(module.key)}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        ) : (
                          <div className="w-4" />
                        )}
                        <Icon className={`w-4 h-4 flex-shrink-0 ${hasAny ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="min-w-0">
                          <Label
                            className={`text-sm font-medium cursor-pointer block ${hasAny ? 'text-foreground' : 'text-muted-foreground'}`}
                            onClick={() => hasSubs ? toggleExpanded(module.key) : handleToggleModule(module)}
                          >
                            {module.label}
                          </Label>
                          {hasSubs && !isFullAccess && counts.enabled > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {counts.enabled}/{counts.total} funções
                            </span>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={isFullAccess}
                        onCheckedChange={() => handleToggleModule(module)}
                      />
                    </div>

                    {/* Sub-functions */}
                    {hasSubs && isExpanded && (
                      <div className="border-t border-border/50 bg-muted/20 px-3 py-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-8">
                          Funções individuais:
                        </p>
                        {module.subFunctions!.map((sf) => {
                          const isChecked = isFullAccess || hasSubFunctionAccess(sf.key);
                          return (
                            <label
                              key={sf.key}
                              className="flex items-center gap-3 px-8 py-1.5 rounded hover:bg-muted/40 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleToggleSubFunction(module, sf.key)}
                                disabled={false}
                              />
                              <span className={`text-sm ${isChecked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {sf.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
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
