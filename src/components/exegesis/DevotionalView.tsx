import { useState, useCallback, useRef } from 'react';
import { BookOpen, Send, Loader2, Save, StickyNote, Sparkles, Globe, ChevronRight, Heart, Music, PenLine, HandHeart, Paperclip, X, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';
import type { ExegesisAnalysis, ExegesisMaterial } from '@/hooks/useExegesis';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { buildAttachmentFromFile, buildAttachmentPrompt, buildRelevantMaterialsContext, type ChatAttachment } from './chatHelpers';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

interface Props {
  onSave: (analysis: { passage: string; analysis_type: string; content: string }) => Promise<ExegesisAnalysis | null>;
  getMaterialsContext?: () => string | undefined;
  materialsCount?: number;
  materials?: ExegesisMaterial[];
  onCreateNote?: (title: string, content: string) => void;
}

const DEVOTIONAL_STEPS = [
  { id: 'ambiente', icon: Heart, label: 'Prepare o Ambiente', desc: 'Local tranquilo, horário dedicado' },
  { id: 'oracao', icon: HandHeart, label: 'Oração Inicial', desc: 'Peça entendimento e proteção' },
  { id: 'adoracao', icon: Music, label: 'Adoração (Opcional)', desc: 'Louvor para concentração' },
  { id: 'leitura', icon: BookOpen, label: 'Leitura Bíblica', desc: 'Leia o trecho com atenção' },
  { id: 'meditacao', icon: PenLine, label: 'Meditação e Anotação', desc: 'Reflita e anote' },
  { id: 'encerramento', icon: HandHeart, label: 'Encerre Agradecendo', desc: 'Oração final de gratidão' },
];

const SUGGESTED_PASSAGES = [
  { passage: 'Salmos 23', label: 'O Senhor é meu pastor' },
  { passage: 'Salmos 91', label: 'Proteção divina' },
  { passage: 'João 15:1-17', label: 'A videira verdadeira' },
  { passage: 'Filipenses 4:4-9', label: 'Alegria e paz' },
  { passage: 'Romanos 8:28-39', label: 'Mais que vencedores' },
  { passage: 'Mateus 6:25-34', label: 'Não andem ansiosos' },
  { passage: 'Isaías 40:28-31', label: 'Renovar as forças' },
  { passage: 'Provérbios 3:1-8', label: 'Confiança em Deus' },
  { passage: 'Efésios 6:10-18', label: 'Armadura de Deus' },
  { passage: 'Hebreus 12:1-3', label: 'Correndo com perseverança' },
  { passage: '1 Coríntios 13', label: 'O caminho do amor' },
  { passage: 'Gálatas 5:16-26', label: 'Fruto do Espírito' },
];

export function DevotionalView({ onSave, getMaterialsContext, materialsCount = 0, materials = [], onCreateNote }: Props) {
  const { user } = useAuth();
  const [personalReflection, setPersonalReflection] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [webSearching, setWebSearching] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bible selectors
  const [bibleBook, setBibleBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseStart, setVerseStart] = useState('');
  const [verseEnd, setVerseEnd] = useState('');

  // Attachments
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);

  const bibleBookNames = getBibleBookNames();
  const chapters = bibleBook ? getChaptersArray(bibleBook) : [];
  const verses = bibleBook && chapter ? getVersesArray(bibleBook, parseInt(chapter)) : [];

  const getPassageText = () => {
    if (!bibleBook || bibleBook === '__clear') return '';
    let p = bibleBook;
    if (chapter) {
      p += ` ${chapter}`;
      if (verseStart && verseStart !== '__clear') {
        p += `:${verseStart}`;
        if (verseEnd && verseEnd !== verseStart) p += `-${verseEnd}`;
      }
    }
    return p;
  };

  const passageText = getPassageText();

  // Devotional materials from the library
  const devotionalMaterials = materials.filter(m => m.material_category === 'devocional');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const attachment = await buildAttachmentFromFile(file);
        setPendingAttachments(prev => [...prev, attachment]);
      } catch (error) {
        toast({ title: 'Erro ao ler arquivo', description: file.name, variant: 'destructive' });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const generateDevotional = useCallback(async () => {
    if (!passageText.trim()) {
      toast({ title: 'Selecione um livro bíblico', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setResult('');
    setShowResult(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Build materials context prioritizing devotional materials
      const { context: materialsCtx } = await buildRelevantMaterialsContext(materials, `${passageText} devocional meditação`);

      // Build attachment prompt
      const { prompt: attachmentText } = buildAttachmentPrompt('', pendingAttachments);
      const attachmentSection = pendingAttachments.length > 0 ? `\n\n## CONTEÚDO DOS ANEXOS DO USUÁRIO (use como base):\n${attachmentText}` : '';

      // Collect image base64
      const imageData = pendingAttachments
        .filter(a => a.type === 'image' && a.base64)
        .map(a => a.base64 as string);

      let webContext = '';
      if (useWebSearch) {
        setWebSearching(true);
        try {
          const { data } = await supabase.functions.invoke('web-search', { body: { query: `${passageText} devocional meditação bíblica` } });
          if (data?.results?.length) {
            webContext = '\n\n## FONTES EXTERNAS:\n' + data.results.map((r: any) =>
              `- ${r.title} (${r.source}): ${r.snippet}`
            ).join('\n');
          }
        } catch (e) { console.error('Web search error:', e); }
        setWebSearching(false);
      }

      const prompt = `## DEVOCIONAL DIÁRIO: ${passageText}

${personalReflection ? `## REFLEXÃO PESSOAL DO USUÁRIO:\n${personalReflection}\n` : ''}
${materialsCtx ? `## MATERIAIS DO USUÁRIO — FONTE PRIMÁRIA (USE OBRIGATORIAMENTE):\n${materialsCtx}\n\n**INSTRUÇÃO:** Priorize os materiais da categoria DEVOCIONAL. Cite explicitamente usando 「Nome do Material」.\n` : ''}
${attachmentSection}
${webContext}

Crie um DEVOCIONAL COMPLETO e PROFUNDO baseado em "${passageText}" seguindo este roteiro:

## 🙏 Devocional: [Título Inspirador]

### 📖 Texto Bíblico
- Escreva a passagem COMPLETA (versículos escritos por extenso, versão ACF)
- Contexto histórico e literário breve

### 🔍 Meditação na Palavra
- O que este texto revela sobre o caráter de Deus?
- Qual é a mensagem central para nós hoje?
- Explicação versículo por versículo (pontos-chave)

### 💡 Lições para Hoje
- 3 a 5 lições práticas extraídas do texto
- Conexão com desafios da vida cotidiana

### 🪞 Reflexão Pessoal
- Perguntas para autoexame (mínimo 3)

### ✍️ Aplicação Prática
- Uma ação concreta para hoje
- Versículo para memorizar

### 🙏 Oração Guiada
- Uma oração baseada no texto lido

### 🎵 Sugestão de Louvor
- Um hino/louvor que combina com o texto

### 📚 Para Aprofundar
- Referências cruzadas
${materialsCtx ? '- Materiais do usuário relacionados (cite usando 「」)' : ''}

IMPORTANTE:
- Linguagem íntima, pessoal, como conversa com Deus
- Profundidade espiritual mas acessível
- ${materialsCtx ? 'PRIORIZE os materiais devocionais do usuário — cite cada um usando 「Nome」' : 'Use fontes bíblicas confiáveis'}`;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'thematic_study',
          passage: `Devocional: ${passageText}`,
          content: prompt,
          materials_context: materialsCtx,
          images: imageData.length > 0 ? imageData : undefined,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `Erro ${resp.status}`);
      }
      if (!resp.body) throw new Error('Sem resposta do servidor');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line.trim() === '' || line.startsWith(':')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) {
              fullContent += c;
              setResult(fullContent);
            }
          } catch { /* partial json */ }
        }
      }

      if (!fullContent) {
        toast({ title: 'Nenhum conteúdo gerado', variant: 'destructive' });
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error('Devotional error:', e);
      toast({ title: 'Erro ao gerar devocional', description: String(e.message || e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [passageText, personalReflection, materials, useWebSearch, pendingAttachments]);

  const handleSave = async () => {
    if (!result) return;
    await onSave({ passage: `Devocional: ${passageText}`, analysis_type: 'devotional', content: result });
    toast({ title: '✅ Devocional salvo!', description: 'Acesse no Histórico de Análises.' });
  };

  const handleCreateNote = () => {
    if (!result || !onCreateNote) return;
    onCreateNote(`🙏 Devocional: ${passageText}`, result);
  };

  if (showResult) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setShowResult(false); setResult(''); abortRef.current?.abort(); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
        </button>

        {loading && !result && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{webSearching ? 'Buscando fontes...' : 'Preparando seu devocional...'}</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
                <Save className="w-3.5 h-3.5" /> Salvar no Histórico
              </Button>
              {onCreateNote && (
                <Button variant="outline" size="sm" onClick={handleCreateNote} className="gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" /> Criar Nota
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={generateDevotional} disabled={loading} className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Regenerar
              </Button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-xl border border-border bg-card">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* What is a devotional */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
          <Heart className="w-4 h-4 text-primary" /> O que é um Devocional?
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Um devocional é um tempo especial e intencional separado diariamente para cultivar um relacionamento pessoal com Deus.
        </p>
      </div>

      {/* Steps guide */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <h3 className="text-sm font-bold text-foreground mb-3">📋 Roteiro do Devocional</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DEVOTIONAL_STEPS.map((step, i) => (
            <div key={step.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-foreground">{step.label}</span>
                <p className="text-[10px] text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Passage input with Bible selector */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" /> Gerar Devocional com IA
        </h3>

        {/* Bible Book/Chapter/Verse Selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Passagem Bíblica *</label>
          <div className="flex flex-wrap gap-2">
            <Select value={bibleBook} onValueChange={(v) => { setBibleBook(v === '__clear' ? '' : v); setChapter(''); setVerseStart(''); setVerseEnd(''); }}>
              <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="📖 Livro" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="__clear">— Selecione —</SelectItem>
                {bibleBookNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            {bibleBook && bibleBook !== '__clear' && (
              <Select value={chapter} onValueChange={(v) => { setChapter(v); setVerseStart(''); setVerseEnd(''); }}>
                <SelectTrigger className="w-[100px] h-9 text-xs"><SelectValue placeholder="Capítulo" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {chapters.map(ch => <SelectItem key={ch} value={String(ch)}>Cap. {ch}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {chapter && (
              <>
                <Select value={verseStart} onValueChange={setVerseStart}>
                  <SelectTrigger className="w-[90px] h-9 text-xs"><SelectValue placeholder="De v." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__clear">Todos</SelectItem>
                    {verses.map(v => <SelectItem key={v} value={String(v)}>v. {v}</SelectItem>)}
                  </SelectContent>
                </Select>
                {verseStart && verseStart !== '__clear' && (
                  <Select value={verseEnd} onValueChange={setVerseEnd}>
                    <SelectTrigger className="w-[90px] h-9 text-xs"><SelectValue placeholder="Até v." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {verses.filter(v => v >= parseInt(verseStart)).map(v => <SelectItem key={v} value={String(v)}>v. {v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>
          {passageText && (
            <p className="text-xs text-primary font-medium mt-1.5">📖 {passageText}</p>
          )}
        </div>

        {/* Reflection */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Reflexão pessoal (opcional)</label>
          <Textarea
            placeholder="O que está no seu coração hoje? Desafios, gratidão, pedidos..."
            value={personalReflection}
            onChange={e => setPersonalReflection(e.target.value)}
            rows={2}
          />
        </div>

        {/* File upload */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Anexos (imagens, PDFs, documentos)</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
            <Paperclip className="w-3.5 h-3.5" /> Anexar arquivos
          </Button>
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pendingAttachments.map((a, i) => (
                <div key={i} className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-[10px]">
                  {a.type === 'image' ? <Image className="w-3 h-3 text-primary" /> : <FileText className="w-3 h-3 text-primary" />}
                  <span className="max-w-[100px] truncate">{a.name}</span>
                  <button onClick={() => removeAttachment(i)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Web search toggle */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Fontes externas</span>
          </div>
          <Switch checked={useWebSearch} onCheckedChange={setUseWebSearch} />
        </div>

        {/* Materials info */}
        {materialsCount > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">
              {materialsCount} materiais serão utilizados
              {devotionalMaterials.length > 0 && ` (${devotionalMaterials.length} devocionais)`}
            </span>
          </div>
        )}

        <Button onClick={generateDevotional} disabled={loading || !passageText.trim()} className="w-full gap-2" size="lg">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? (webSearching ? 'Buscando fontes...' : 'Gerando devocional...') : 'Gerar Devocional'}
        </Button>
      </div>

      {/* Suggested passages */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2">📖 Passagens Sugeridas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {SUGGESTED_PASSAGES.map(s => (
            <button
              key={s.passage}
              onClick={() => {
                // Parse passage to set selectors
                const parts = s.passage.match(/^(.+?)(?:\s+(\d+)(?::(\d+)(?:-(\d+))?)?)?$/);
                if (parts) {
                  setBibleBook(parts[1]);
                  setChapter(parts[2] || '');
                  setVerseStart(parts[3] || '');
                  setVerseEnd(parts[4] || '');
                }
              }}
              className={cn(
                "text-left p-2 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all",
                passageText === s.passage && "border-primary bg-primary/5"
              )}
            >
              <span className="text-xs font-medium text-foreground">{s.passage}</span>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
