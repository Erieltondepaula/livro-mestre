import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Settings2, Save, RotateCcw, Loader2, Eye, Edit3 } from 'lucide-react';

const DEFAULT_PROMPT_PREVIEW = `Este é o prompt padrão do sistema. Para personalizá-lo, clique em "Editar" e faça suas alterações.

O prompt padrão inclui:
• Regras de linguagem (palavras proibidas e substituições)
• Tom e estilo de conversa familiar
• Base acadêmica de exegese (Gorman, Klein, Fee, etc.)
• Base de homilética (Chapell, Olyott, Keller, Warren, Hernandes, etc.)
• Os 4 pilares do sermão transformador
• Estrutura de análise exegética
• Regras de engenharia do sermão

Ao salvar um prompt personalizado, ele será usado NO LUGAR do prompt padrão em todas as gerações de esboço.`;

export function PromptEditorDialog() {
  const [open, setOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCustomPrompt, setHasCustomPrompt] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  useEffect(() => {
    if (open) loadPrompt();
  }, [open]);

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
        // Fetch default prompt from edge function
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_sermon_prompts')
        .upsert(
          { user_id: user.id, prompt_text: promptText, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
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

      // Delete custom prompt to revert to default
      await supabase
        .from('user_sermon_prompts')
        .delete()
        .eq('user_id', user.id);

      setHasCustomPrompt(false);
      toast({ title: 'Prompt restaurado', description: 'O prompt padrão será usado nas próximas gerações.' });
      loadPrompt();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = promptText !== originalPrompt;

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
          <p className="text-xs text-muted-foreground">
            {hasCustomPrompt
              ? '✅ Usando prompt personalizado. Este prompt é enviado como instrução base para a IA em todas as gerações de esboço.'
              : '📋 Usando prompt padrão. Edite para personalizar as instruções da IA.'}
          </p>
        </DialogHeader>

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
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive" onClick={handleReset} disabled={isSaving}>
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão
                </Button>
              )}
            </div>

            {mode === 'view' ? (
              <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/20 min-h-[400px] max-h-[60vh]">
                <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90 leading-relaxed">
                  {promptText}
                </pre>
              </div>
            ) : (
              <Textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="flex-1 min-h-[400px] max-h-[60vh] font-mono text-xs leading-relaxed resize-none"
                placeholder="Digite o prompt do sistema..."
              />
            )}

            {mode === 'edit' && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-[10px] text-muted-foreground">
                  {promptText.length.toLocaleString()} caracteres
                  {hasChanges && ' • Alterações não salvas'}
                </span>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="gap-1.5"
                  size="sm"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar Prompt
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
