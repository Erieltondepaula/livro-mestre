import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Settings2, Save, RotateCcw, Loader2, Eye, Edit3, Layers } from 'lucide-react';

type SermonModule = {
  sermon_type: string;
  label: string;
  default_text: string;
  custom_text: string | null;
};

const SERMON_TYPE_ORDER = [
  'outline_expository',
  'outline_textual',
  'outline_thematic',
  'outline_narrative',
  'outline_biographical',
  'outline_doctrinal',
  'outline_evangelistic',
  'outline_devotional',
  'outline_apologetic',
  'outline_prophetic',
  'outline_exhortative',
  'outline_didactic',
];

export function PromptEditorDialog() {
  const [open, setOpen] = useState(false);

  // ---------- Base prompt state ----------
  const [promptText, setPromptText] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCustomPrompt, setHasCustomPrompt] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // ---------- Sermon type modules state ----------
  const [modules, setModules] = useState<SermonModule[]>([]);
  const [selectedType, setSelectedType] = useState<string>('outline_expository');
  const [moduleText, setModuleText] = useState('');
  const [originalModuleText, setOriginalModuleText] = useState('');
  const [isModulesLoading, setIsModulesLoading] = useState(false);
  const [isModuleSaving, setIsModuleSaving] = useState(false);
  const [moduleMode, setModuleMode] = useState<'view' | 'edit'>('view');

  useEffect(() => {
    if (open) {
      loadPrompt();
      loadModules();
    }
  }, [open]);

  // Sync editor when type changes
  useEffect(() => {
    const current = modules.find((m) => m.sermon_type === selectedType);
    if (current) {
      const text = current.custom_text ?? current.default_text;
      setModuleText(text);
      setOriginalModuleText(text);
      setModuleMode('view');
    }
  }, [selectedType, modules]);

  const loadPrompt = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_sermon_prompts')
        .select('prompt_text')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.prompt_text) {
        setPromptText(data.prompt_text);
        setOriginalPrompt(data.prompt_text);
        setHasCustomPrompt(true);
      } else {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ type: 'get_system_prompt' }),
        });
        if (resp.ok) {
          const result = await resp.json();
          setPromptText(result.prompt || '');
          setOriginalPrompt(result.prompt || '');
        }
        setHasCustomPrompt(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadModules = async () => {
    setIsModulesLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch defaults from edge function
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type: 'get_sermon_type_modules' }),
      });
      const defaults: { modules: { sermon_type: string; label: string; prompt_text: string }[] } =
        resp.ok ? await resp.json() : { modules: [] };

      // Fetch user customs
      const { data: customs } = await supabase
        .from('user_sermon_type_prompts')
        .select('sermon_type, prompt_text')
        .eq('user_id', user.id);

      const customMap = new Map<string, string>();
      (customs || []).forEach((c: any) => customMap.set(c.sermon_type, c.prompt_text));

      // Merge in fixed order
      const merged: SermonModule[] = SERMON_TYPE_ORDER.map((key) => {
        const def = defaults.modules.find((m) => m.sermon_type === key);
        return {
          sermon_type: key,
          label: def?.label ?? key,
          default_text: def?.prompt_text ?? '',
          custom_text: customMap.get(key) ?? null,
        };
      });

      setModules(merged);
    } catch (e) {
      console.error('Error loading modules:', e);
      toast({ title: 'Erro ao carregar módulos', variant: 'destructive' });
    } finally {
      setIsModulesLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('user_sermon_prompts')
        .upsert(
          { user_id: user.id, prompt_text: promptText, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
      setOriginalPrompt(promptText);
      setHasCustomPrompt(true);
      setMode('view');
      toast({ title: 'Prompt salvo!', description: 'Seu prompt personalizado será usado nas próximas gerações.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja restaurar o prompt padrão? Seu prompt personalizado será removido.')) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('user_sermon_prompts').delete().eq('user_id', user.id);
      setHasCustomPrompt(false);
      toast({ title: 'Prompt restaurado', description: 'O prompt padrão será usado nas próximas gerações.' });
      loadPrompt();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveModule = async () => {
    setIsModuleSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('user_sermon_type_prompts')
        .upsert(
          {
            user_id: user.id,
            sermon_type: selectedType,
            prompt_text: moduleText,
            is_customized: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,sermon_type' },
        );
      if (error) throw error;
      setOriginalModuleText(moduleText);
      setModules((prev) =>
        prev.map((m) => (m.sermon_type === selectedType ? { ...m, custom_text: moduleText } : m)),
      );
      setModuleMode('view');
      toast({ title: 'Módulo salvo!', description: `O módulo "${currentModule?.label}" será usado nas próximas gerações.` });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar módulo', description: e.message, variant: 'destructive' });
    } finally {
      setIsModuleSaving(false);
    }
  };

  const handleResetModule = async () => {
    if (!confirm(`Restaurar o módulo "${currentModule?.label}" para o padrão? Sua versão personalizada será removida.`)) return;
    setIsModuleSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('user_sermon_type_prompts')
        .delete()
        .eq('user_id', user.id)
        .eq('sermon_type', selectedType);
      setModules((prev) =>
        prev.map((m) => (m.sermon_type === selectedType ? { ...m, custom_text: null } : m)),
      );
      const def = modules.find((m) => m.sermon_type === selectedType)?.default_text ?? '';
      setModuleText(def);
      setOriginalModuleText(def);
      toast({ title: 'Módulo restaurado', description: 'O padrão será usado nas próximas gerações.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setIsModuleSaving(false);
    }
  };

  const hasChanges = promptText !== originalPrompt;
  const moduleHasChanges = moduleText !== originalModuleText;
  const currentModule = modules.find((m) => m.sermon_type === selectedType);
  const isModuleCustomized = !!currentModule?.custom_text;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Settings2 className="w-3.5 h-3.5" /> Editar Prompt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Prompt do Sistema — Geração de Sermões
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="base" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="base" className="gap-1.5">
              <Settings2 className="w-3.5 h-3.5" /> Prompt Base
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Módulos por Tipo (12)
            </TabsTrigger>
          </TabsList>

          {/* ============= TAB: Base prompt ============= */}
          <TabsContent value="base" className="flex-1 overflow-hidden flex flex-col mt-3">
            <p className="text-xs text-muted-foreground mb-2">
              {hasCustomPrompt
                ? '✅ Usando prompt personalizado. Este prompt é a INSTRUÇÃO BASE para todas as gerações.'
                : '📋 Usando prompt padrão. Edite para personalizar a identidade global da IA.'}
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando prompt...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant={mode === 'view' ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setMode('view')}
                  >
                    <Eye className="w-3.5 h-3.5" /> Visualizar
                  </Button>
                  <Button
                    variant={mode === 'edit' ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setMode('edit')}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <div className="flex-1" />
                  {hasCustomPrompt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs text-destructive"
                      onClick={handleReset}
                      disabled={isSaving}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão
                    </Button>
                  )}
                </div>

                {mode === 'view' ? (
                  <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/20 min-h-[400px] max-h-[55vh]">
                    <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90 leading-relaxed">
                      {promptText}
                    </pre>
                  </div>
                ) : (
                  <Textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className="flex-1 min-h-[400px] max-h-[55vh] font-mono text-xs leading-relaxed resize-none"
                    placeholder="Digite o prompt do sistema..."
                  />
                )}

                {mode === 'edit' && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[10px] text-muted-foreground">
                      {promptText.length.toLocaleString()} caracteres
                      {hasChanges && ' • Alterações não salvas'}
                    </span>
                    <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="gap-1.5" size="sm">
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Salvar Prompt Base
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ============= TAB: Sermon type modules ============= */}
          <TabsContent value="modules" className="flex-1 overflow-hidden flex flex-col mt-3">
            <p className="text-xs text-muted-foreground mb-2">
              🎯 Cada tipo de sermão tem um <strong>módulo específico</strong> que é INJETADO ao prompt base
              quando você seleciona esse tipo. Edite cada módulo individualmente para personalizar o comportamento da IA por tipo.
            </p>

            {isModulesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando módulos...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-[280px] h-9 text-xs">
                      <SelectValue placeholder="Escolha um tipo de sermão..." />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m.sermon_type} value={m.sermon_type} className="text-xs">
                          <span className="flex items-center gap-2">
                            {m.label}
                            {m.custom_text && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                personalizado
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isModuleCustomized && (
                    <Badge variant="default" className="text-[10px]">✅ Personalizado</Badge>
                  )}

                  <div className="flex-1" />

                  <Button
                    variant={moduleMode === 'view' ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setModuleMode('view')}
                  >
                    <Eye className="w-3.5 h-3.5" /> Visualizar
                  </Button>
                  <Button
                    variant={moduleMode === 'edit' ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setModuleMode('edit')}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </Button>

                  {isModuleCustomized && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs text-destructive"
                      onClick={handleResetModule}
                      disabled={isModuleSaving}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                    </Button>
                  )}
                </div>

                {moduleMode === 'view' ? (
                  <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/20 min-h-[350px] max-h-[50vh]">
                    <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90 leading-relaxed">
                      {moduleText}
                    </pre>
                  </div>
                ) : (
                  <Textarea
                    value={moduleText}
                    onChange={(e) => setModuleText(e.target.value)}
                    className="flex-1 min-h-[350px] max-h-[50vh] font-mono text-xs leading-relaxed resize-none"
                    placeholder="Digite as diretrizes específicas para este tipo de sermão..."
                  />
                )}

                {moduleMode === 'edit' && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[10px] text-muted-foreground">
                      {moduleText.length.toLocaleString()} caracteres
                      {moduleHasChanges && ' • Alterações não salvas'}
                    </span>
                    <Button
                      onClick={handleSaveModule}
                      disabled={isModuleSaving || !moduleHasChanges}
                      className="gap-1.5"
                      size="sm"
                    >
                      {isModuleSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Salvar Módulo "{currentModule?.label}"
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
