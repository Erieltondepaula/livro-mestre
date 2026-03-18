import { useState, useRef, useCallback, useEffect } from 'react';
import { BookOpen, Send, Loader2, Copy, Check, FileText, HelpCircle, Lightbulb, Heart, Upload, Trash2, Globe, CheckCircle, X, Plus, Download, Edit3, Save, Image as ImageIcon, MessageSquare, RefreshCw, Highlighter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const STUDY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-study`;

type AnalysisType = 'complete_study' | 'summary' | 'questions' | 'practical_applications' | 'devotional_generation';

const ANALYSIS_TYPES: { id: AnalysisType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'complete_study', label: 'Estudo Completo', icon: BookOpen, description: 'Estudo estruturado com todas as seções — Lendo, Estudando, Aplicando a Palavra' },
  { id: 'summary', label: 'Resumo', icon: FileText, description: 'Resumo simplificado com tópicos objetivos' },
  { id: 'questions', label: 'Perguntas', icon: HelpCircle, description: 'Perguntas de compreensão, reflexão e aprofundamento com respostas' },
  { id: 'practical_applications', label: 'Aplicações', icon: Lightbulb, description: 'Aplicações práticas 100% concretas para o dia a dia' },
  { id: 'devotional_generation', label: 'Gerar Devocional', icon: Heart, description: 'Devocional conectado ao seu acervo de materiais' },
];

interface ExternalSource {
  id: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface SavedStudy {
  id: string;
  title: string;
  content: string;
  result: string;
  created_at: string;
}

interface InlineComment {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  comment: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  isHighlightOnly: boolean;
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
  const [savedStudies, setSavedStudies] = useState<SavedStudy[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [floatingToolbar, setFloatingToolbar] = useState<{ x: number; y: number; text: string; startOffset: number; endOffset: number } | null>(null);
  const [commentColor, setCommentColor] = useState<InlineComment['color']>('yellow');
  const [pendingCommentTarget, setPendingCommentTarget] = useState<{ text: string; startOffset: number; endOffset: number } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  const contentDisplayRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  // Handle file upload (txt, etc.)
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${file.name} excede 10MB`, variant: "destructive" });
        continue;
      }

      try {
        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          const text = await file.text();
          setUploadedFiles(prev => [...prev, { name: file.name, content: text }]);
          setContent(prev => prev ? prev + '\n\n---\n📄 ' + file.name + ':\n' + text : text);
          toast({ title: "Arquivo adicionado", description: file.name });
        } else if (file.type === 'application/pdf') {
          // For PDF, we extract what we can - inform user
          const text = `[📄 Arquivo PDF: ${file.name} — ${(file.size / 1024).toFixed(0)}KB]\nConteúdo do PDF não pode ser extraído automaticamente no navegador. Cole o texto do PDF diretamente na área de texto.`;
          setUploadedFiles(prev => [...prev, { name: file.name, content: text }]);
          setContent(prev => prev ? prev + '\n\n' + text : text);
          toast({ title: "PDF adicionado", description: "Cole o texto do PDF na área de texto para análise completa." });
        } else {
          toast({ title: "Formato não suportado", description: `${file.name} — Use TXT, MD ou cole o texto diretamente.`, variant: "destructive" });
        }
      } catch {
        toast({ title: "Erro ao ler arquivo", description: file.name, variant: "destructive" });
      }
    }
    if (e.target) e.target.value = '';
  }, []);

  // Handle image upload with description
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Não é uma imagem", description: file.name, variant: "destructive" });
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: "Máximo 5MB", variant: "destructive" });
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const imageDescription = `[🖼️ Imagem: ${file.name}]\nDescreva o conteúdo desta imagem abaixo para que a IA possa analisar:\n> (Ex: "Página de livro com texto sobre João 3:16", "Slide de aula sobre hermenêutica", "Anotação manuscrita sobre Romanos 8")`;
        setUploadedFiles(prev => [...prev, { name: file.name, content: imageDescription }]);
        setContent(prev => prev ? prev + '\n\n' + imageDescription : imageDescription);
        toast({ title: "Imagem adicionada", description: "Descreva o conteúdo da imagem na área de texto para análise." });
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) {
      toast({ title: "Insira o material", description: "Cole ou digite o texto para análise.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setCurrentStream('');
    setLastResult(null);
    setExternalSources([]);
    setIsEditing(false);
    setComments([]);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(STUDY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          analysis_type: selectedType,
          user_id: user?.id,
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

      // flush remaining
      for (let raw of textBuffer.split("\n")) {
        if (!raw || !raw.startsWith("data: ")) continue;
        const j = raw.slice(6).trim();
        if (j === "[DONE]") continue;
        try { const c = JSON.parse(j).choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {}
      }

      setLastResult(fullContent);
      setEditableContent(fullContent);
      setCurrentStream('');

      // Extract external sources
      const extPattern = /🌐\s*\*\*Fonte Externa:\*\*\s*(.+)/g;
      let match;
      const sources: ExternalSource[] = [];
      while ((match = extPattern.exec(fullContent)) !== null) {
        sources.push({ id: crypto.randomUUID(), text: match[1].trim(), status: 'pending' });
      }
      setExternalSources(sources);

      // Auto-save
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

        // Reload saved studies
        const { data } = await supabase
          .from('notes')
          .select('id, title, content, content_html, created_at')
          .eq('note_type', 'bible_study')
          .order('created_at', { ascending: false })
          .limit(20);
        if (data) {
          setSavedStudies(data.map(d => ({
            id: d.id, title: d.title, content: d.content,
            result: d.content_html || '', created_at: d.created_at,
          })));
        }

        toast({ title: "✅ Estudo salvo!", description: "Acesse em Estudos Salvos." });
      }

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error: any) {
      if (error.name !== 'AbortError') toast({ title: "Erro na análise", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [content, selectedType, user]);

  const handleCopy = () => {
    const text = isEditing ? editableContent : (lastResult || currentStream);
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copiado!" });
    }
  };

  const handleExport = () => {
    const text = isEditing ? editableContent : (lastResult || currentStream);
    if (!text) return;

    // Add comments into the export
    let exportText = text;
    if (comments.length > 0) {
      exportText += '\n\n---\n## 💬 COMENTÁRIOS E DESTAQUES DO USUÁRIO\n';
      comments.forEach((c, i) => {
        exportText += `\n### ${c.isHighlightOnly ? '🖍️ Destaque' : '💬 Comentário'} ${i + 1}\n> "${c.selectedText}"\n${c.comment ? `\n${c.comment}\n` : ''}`;
      });
    }

    // Export as markdown file
    const blob = new Blob([exportText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estudo-biblico-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exportado!", description: "Arquivo .md baixado com sucesso." });
  };

  const handleSaveEdit = async () => {
    setLastResult(editableContent);
    setIsEditing(false);

    // Update in DB if we have a saved study
    if (user && savedStudies.length > 0) {
      const latest = savedStudies[0];
      await supabase.from('notes').update({ content_html: editableContent }).eq('id', latest.id);
      toast({ title: "Edição salva!" });
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, { id: crypto.randomUUID(), sectionIndex: prev.length, text: newComment.trim() }]);
    setNewComment('');
    setShowCommentInput(false);
    toast({ title: "Comentário adicionado!" });
  };

  const handleDeleteComment = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const handleSourceAction = (id: string, action: 'approved' | 'rejected') => {
    setExternalSources(prev => prev.map(s => s.id === id ? { ...s, status: action } : s));
  };

  const handleDeleteStudy = async (studyId: string) => {
    await supabase.from('notes').delete().eq('id', studyId);
    setSavedStudies(prev => prev.filter(s => s.id !== studyId));
    toast({ title: "Estudo excluído" });
  };

  const handleLoadStudy = (study: SavedStudy) => {
    setContent(study.content);
    setLastResult(study.result);
    setEditableContent(study.result);
    setCurrentStream('');
    toast({ title: "Estudo carregado", description: "Você pode editar ou re-analisar." });
  };

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/「(.*?)」(\(.*?\))/g, '<span style="background-color:hsl(var(--accent)/0.3);border-left:3px solid hsl(var(--primary));padding:2px 6px;border-radius:3px;font-style:italic;display:inline;">"$1"</span> <span style="color:hsl(var(--primary));font-weight:600;font-size:0.9em;">$2</span>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-primary/30 pl-4 my-2 italic text-muted-foreground">$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
      .replace(/```\n?\[COMENTÁRIO\]\n?([\s\S]*?)```/g, '<div class="bg-accent/20 border border-accent/40 rounded-lg p-3 my-3"><span class="text-xs font-semibold text-primary uppercase">💬 Espaço para Comentário</span><p class="text-sm text-muted-foreground mt-1 italic">$1</p></div>')
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
          Insira materiais (texto, arquivos, imagens) e receba análises completas com IA — integrado com sua base de Materiais da Exegese
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
              Cole texto, envie arquivos (TXT, MD) ou imagens. A IA consultará automaticamente seus Materiais da Exegese como base de conhecimento.
            </p>

            {/* File upload buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 text-xs">
                <Upload className="w-3.5 h-3.5" /> Enviar Arquivo
              </Button>
              <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} className="gap-1.5 text-xs">
                <ImageIcon className="w-3.5 h-3.5" /> Enviar Imagem
              </Button>
            </div>

            <input ref={fileInputRef} type="file" accept=".txt,.md,.text,.csv" multiple onChange={handleFileUpload} className="hidden" />
            <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />

            {/* Show uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-md px-2.5 py-1 text-xs">
                    <FileText className="w-3 h-3 text-primary" />
                    <span className="text-foreground">{f.name}</span>
                    <button onClick={() => {
                      setUploadedFiles(prev => prev.filter((_, idx) => idx !== i));
                    }} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] text-sm"
              placeholder={`Cole aqui o texto do material para análise...

Exemplos:
• Trecho de comentário bíblico
• Estudo sobre um tema teológico
• Artigo ou devocional
• Descrição de uma imagem de livro/anotação

A IA utilizará automaticamente seus Materiais (Exegese >> Materiais) como referência.`}
            />
            {content.trim() && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{content.trim().split(/\s+/).length} palavras</span>
                <Button variant="ghost" size="sm" onClick={() => { setContent(''); setUploadedFiles([]); }}>
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
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando com base nos seus Materiais...</> : <><Send className="w-4 h-4" /> Analisar Material</>}
            </Button>
          </div>

          {/* Result */}
          {displayContent && (
            <div ref={resultRef} className="card-library p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Resultado da Análise
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                </h3>
                <div className="flex gap-1.5">
                  {!isLoading && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setIsEditing(!isEditing); if (!isEditing) setEditableContent(lastResult || ''); }} className="gap-1 text-xs">
                        <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Cancelar' : 'Editar'}
                      </Button>
                      {isEditing && (
                        <Button variant="default" size="sm" onClick={handleSaveEdit} className="gap-1 text-xs">
                          <Save className="w-3.5 h-3.5" /> Salvar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { setShowCommentInput(!showCommentInput); }} className="gap-1 text-xs">
                        <MessageSquare className="w-3.5 h-3.5" /> Comentar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1 text-xs">
                        <Download className="w-3.5 h-3.5" /> Exportar
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 text-xs">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
              </div>

              {/* Comment input */}
              {showCommentInput && (
                <div className="flex gap-2 p-3 bg-accent/10 rounded-lg border border-accent/30">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Digite seu comentário..."
                    className="flex-1 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  />
                  <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                    Adicionar
                  </Button>
                </div>
              )}

              {/* User comments */}
              {comments.length > 0 && (
                <div className="space-y-2">
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-2 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                      <MessageSquare className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm flex-1">{c.text}</p>
                      <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isEditing ? (
                <Textarea
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="min-h-[400px] text-sm font-mono"
                />
              ) : (
                <div
                  className="prose prose-sm max-w-none overflow-x-hidden"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
                />
              )}

              {/* Re-analyze button */}
              {!isLoading && lastResult && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={handleAnalyze} className="gap-1.5 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" /> Re-analisar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* External Sources */}
          {externalSources.length > 0 && (
            <div className="card-library p-4 sm:p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4" /> Fontes Externas Utilizadas
              </h3>
              <p className="text-xs text-muted-foreground">
                A IA utilizou fontes externas. Você pode aprovar, ignorar ou adicionar ao estudo.
              </p>
              <div className="space-y-2">
                {externalSources.map(source => (
                  <div key={source.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                    source.status === 'approved' ? 'bg-accent/20 border-accent/40' :
                    source.status === 'rejected' ? 'bg-muted/30 border-border opacity-60' :
                    'bg-card border-border'
                  }`}>
                    <span className="text-sm flex-1">{source.text}</span>
                    {source.status === 'pending' ? (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleSourceAction(source.id, 'approved')}>
                          <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleSourceAction(source.id, 'rejected')}>
                          <X className="w-3.5 h-3.5" /> Ignorar
                        </Button>
                      </div>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${source.status === 'approved' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
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
              <div key={study.id} className="card-library p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm text-foreground">{study.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(study.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => handleLoadStudy(study)}>
                      <Edit3 className="w-3.5 h-3.5" /> Abrir
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={() => handleDeleteStudy(study.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </Button>
                  </div>
                </div>
                {study.result && (
                  <details>
                    <summary className="text-xs text-primary cursor-pointer hover:underline">Ver conteúdo</summary>
                    <div className="prose prose-sm max-w-none mt-2 overflow-x-hidden" dangerouslySetInnerHTML={{ __html: renderMarkdown(study.result) }} />
                  </details>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
