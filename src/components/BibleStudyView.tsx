import { useState, useRef, useCallback, useEffect } from 'react';
import { BookOpen, Send, Loader2, Copy, Check, FileText, HelpCircle, Lightbulb, Heart, Upload, Trash2, Globe, CheckCircle, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const STUDY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-study`;

type AnalysisType = 'complete_study' | 'summary' | 'questions' | 'practical_applications' | 'devotional_generation';

const ANALYSIS_TYPES: { id: AnalysisType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'complete_study', label: 'Estudo Completo', icon: BookOpen, description: 'Resumo + explicação + perguntas + aplicações' },
  { id: 'summary', label: 'Resumo', icon: FileText, description: 'Resumo simplificado do material' },
  { id: 'questions', label: 'Perguntas', icon: HelpCircle, description: 'Perguntas e respostas para estudo' },
  { id: 'practical_applications', label: 'Aplicações', icon: Lightbulb, description: 'Aplicações práticas para o dia a dia' },
  { id: 'devotional_generation', label: 'Gerar Devocional', icon: Heart, description: 'Gera devocional conectado ao seu acervo' },
];

interface ExternalSource {
  id: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function BibleStudyView() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<AnalysisType>('complete_study');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [externalSources, setExternalSources] = useState<ExternalSource[]>([]);
  const [savedStudies, setSavedStudies] = useState<{ id: string; title: string; content: string; result: string; created_at: string }[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load saved studies
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, title, content, content_html, created_at')
        .eq('note_type', 'bible_study')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        setSavedStudies(data.map(d => ({
          id: d.id,
          title: d.title,
          content: d.content,
          result: d.content_html || '',
          created_at: d.created_at,
        })));
      }
    })();
  }, [user]);

  // Get devotionals context from exegesis materials
  const getDevotionalsContext = useCallback(async () => {
    if (!user) return undefined;
    const { data } = await supabase
      .from('exegesis_materials')
      .select('title, description, theme, author')
      .eq('material_category', 'devocional')
      .limit(20);
    if (!data || data.length === 0) return undefined;
    return data.map(d => `- ${d.title}${d.author ? ` (${d.author})` : ''}${d.theme ? ` [Tema: ${d.theme}]` : ''}${d.description ? `: ${d.description.substring(0, 200)}` : ''}`).join('\n');
  }, [user]);

  // Get materials context
  const getMaterialsContext = useCallback(async () => {
    if (!user) return undefined;
    const { data } = await supabase
      .from('exegesis_materials')
      .select('title, description, theme, author, material_category')
      .limit(30);
    if (!data || data.length === 0) return undefined;
    return data.map(d => `- [${d.material_category}] ${d.title}${d.author ? ` (${d.author})` : ''}${d.theme ? ` [Tema: ${d.theme}]` : ''}${d.description ? `: ${d.description.substring(0, 150)}` : ''}`).join('\n');
  }, [user]);

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) {
      toast({ title: "Insira o material", description: "Cole ou digite o texto para análise.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setCurrentStream('');
    setLastResult(null);
    setExternalSources([]);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [materialsCtx, devotionalsCtx] = await Promise.all([
        getMaterialsContext(),
        selectedType === 'devotional_generation' ? getDevotionalsContext() : Promise.resolve(undefined),
      ]);

      const resp = await fetch(STUDY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          analysis_type: selectedType,
          materials_context: materialsCtx,
          devotionals_context: devotionalsCtx,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `Erro ${resp.status}`);
      }
      if (!resp.body) throw new Error("Sem resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || line.trim() === "" || line.startsWith(":")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) { fullContent += c; setCurrentStream(fullContent); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      // flush
      for (let raw of textBuffer.split("\n")) {
        if (!raw || !raw.startsWith("data: ")) continue;
        const j = raw.slice(6).trim();
        if (j === "[DONE]") continue;
        try { const c = JSON.parse(j).choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {}
      }

      setLastResult(fullContent);
      setCurrentStream('');

      // Extract external sources
      const extPattern = /🌐\s*\*\*Fonte Externa:\*\*\s*(.+)/g;
      let match;
      const sources: ExternalSource[] = [];
      while ((match = extPattern.exec(fullContent)) !== null) {
        sources.push({ id: crypto.randomUUID(), text: match[1].trim(), status: 'pending' });
      }
      setExternalSources(sources);

      // Auto-save as note
      if (user) {
        const title = `Estudo: ${content.substring(0, 60).replace(/\n/g, ' ')}...`;
        await supabase.from('notes').insert({
          user_id: user.id,
          title,
          content: content.trim(),
          content_html: fullContent,
          note_type: 'bible_study',
          tags: [selectedType],
        });
        toast({ title: "Estudo salvo!", description: "Acesse em Estudos Salvos." });
      }

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error: any) {
      if (error.name !== 'AbortError') toast({ title: "Erro na análise", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [content, selectedType, user, getMaterialsContext, getDevotionalsContext]);

  const handleCopy = () => {
    const text = lastResult || currentStream;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copiado!" });
    }
  };

  const handleSourceAction = (id: string, action: 'approved' | 'rejected') => {
    setExternalSources(prev => prev.map(s => s.id === id ? { ...s, status: action } : s));
  };

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/「(.*?)」(\(.*?\))/g, '<span style="background-color:hsl(var(--accent)/0.3);border-left:3px solid hsl(var(--primary));padding:2px 6px;border-radius:3px;font-style:italic;display:inline;">"$1"</span> <span style="color:hsl(var(--primary));font-weight:600;font-size:0.9em;">$2</span>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed text-foreground/90 mb-2">')
      .replace(/\n/g, '<br/>');
    return `<p class="text-sm leading-relaxed text-foreground/90 mb-2">${html}</p>`;
  };

  const displayContent = lastResult || currentStream;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">📚 Estudo Bíblico</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Insira materiais de estudo e receba análises completas com IA — resumos, perguntas, respostas e aplicações práticas
        </p>
      </div>

      <Tabs defaultValue="new_study" className="w-full">
        <TabsList className="w-full flex">
          <TabsTrigger value="new_study" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <Plus className="w-4 h-4 hidden sm:block" /> Novo Estudo
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <FileText className="w-4 h-4 hidden sm:block" /> Estudos Salvos
            {savedStudies.length > 0 && <span className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded-full ml-0.5">{savedStudies.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new_study" className="space-y-6">
          {/* Input Area */}
          <div className="card-library p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4" /> Inserir Material
            </h3>
            <p className="text-xs text-muted-foreground">
              Cole o texto do material que deseja estudar — artigo, trecho de livro, estudo bíblico, devocional, etc.
            </p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] text-sm"
              placeholder="Cole aqui o texto do material para análise...

Exemplo: Um trecho de um comentário bíblico, um estudo sobre um tema, um artigo teológico, um devocional, etc."
            />
            {content.trim() && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{content.trim().split(/\s+/).length} palavras</span>
                <Button variant="ghost" size="sm" onClick={() => setContent('')}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpar
                </Button>
              </div>
            )}
          </div>

          {/* Analysis Type */}
          <div className="card-library p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Tipo de Análise</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {ANALYSIS_TYPES.map(type => {
                const Icon = type.icon;
                const isActive = selectedType === type.id;
                return (
                  <button key={type.id} onClick={() => setSelectedType(type.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-center ${isActive ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground italic">{ANALYSIS_TYPES.find(t => t.id === selectedType)?.description}</p>

            <Button onClick={handleAnalyze} disabled={isLoading || !content.trim()} className="w-full gap-2">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</> : <><Send className="w-4 h-4" /> Analisar Material</>}
            </Button>
          </div>

          {/* Result */}
          {displayContent && (
            <div ref={resultRef} className="card-library p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Resultado da Análise
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                </h3>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              <div
                className="prose prose-sm max-w-none overflow-x-hidden"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
              />
            </div>
          )}

          {/* External Sources */}
          {externalSources.length > 0 && (
            <div className="card-library p-4 sm:p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4" /> Fontes Externas Utilizadas
              </h3>
              <p className="text-xs text-muted-foreground">
                A IA utilizou fontes externas complementares. Você pode aprovar, ignorar ou adicionar ao estudo.
              </p>
              <div className="space-y-2">
                {externalSources.map(source => (
                  <div key={source.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                    source.status === 'approved' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                    source.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 opacity-60' :
                    'bg-card border-border'
                  }`}>
                    <span className="text-sm flex-1">{source.text}</span>
                    {source.status === 'pending' ? (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-600 border-green-300" onClick={() => handleSourceAction(source.id, 'approved')}>
                          <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-300" onClick={() => handleSourceAction(source.id, 'rejected')}>
                          <X className="w-3.5 h-3.5" /> Ignorar
                        </Button>
                      </div>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${source.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                        {source.status === 'approved' ? '✅ Aprovada' : '❌ Ignorada'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {savedStudies.length === 0 ? (
            <div className="card-library p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum estudo salvo ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Seus estudos serão salvos automaticamente aqui.</p>
            </div>
          ) : (
            savedStudies.map(study => (
              <details key={study.id} className="card-library p-4 sm:p-6 group">
                <summary className="cursor-pointer list-none flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm text-foreground">{study.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(study.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground group-open:rotate-90 transition-transform">▶</span>
                </summary>
                {study.result && (
                  <div className="mt-4 pt-4 border-t border-border prose prose-sm max-w-none overflow-x-hidden"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(study.result) }}
                  />
                )}
              </details>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
