import { useState, useRef, useCallback } from 'react';
import { Sparkles, Send, Loader2, Copy, Check, Lightbulb, HelpCircle, Flame, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

type TitleStyle = 'all' | 'creative' | 'provocative' | 'questioning' | 'affirmative';

const STYLES: { id: TitleStyle; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'all', label: '🎯 Todos', icon: <Sparkles className="w-3.5 h-3.5" />, description: 'Gera nos 4 estilos' },
  { id: 'creative', label: '💡 Criativo', icon: <Lightbulb className="w-3.5 h-3.5" />, description: 'Metáforas, ângulos novos, surpresa' },
  { id: 'provocative', label: '🔥 Provocativo', icon: <Flame className="w-3.5 h-3.5" />, description: 'Espelho, choque de realidade, confronto' },
  { id: 'questioning', label: '❓ Questionativo', icon: <HelpCircle className="w-3.5 h-3.5" />, description: 'Perguntas que não saem da mente' },
  { id: 'affirmative', label: '✅ Afirmativo', icon: <ShieldCheck className="w-3.5 h-3.5" />, description: 'Declarações de valor e esperança' },
];

interface Props {
  getMaterialsContext?: () => string | undefined;
}

export function SermonTitleGenerator({ getMaterialsContext }: Props) {
  const [bibleBook, setBibleBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseStart, setVerseStart] = useState('');
  const [verseEnd, setVerseEnd] = useState('');
  const [customPassage, setCustomPassage] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<TitleStyle>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const bibleBookNames = getBibleBookNames();
  const chapters = bibleBook ? getChaptersArray(bibleBook) : [];
  const verses = bibleBook && chapter ? getVersesArray(bibleBook, parseInt(chapter)) : [];

  const getPassageText = () => {
    if (customPassage.trim()) return customPassage.trim();
    if (!bibleBook) return '';
    let p = bibleBook;
    if (chapter) { p += ` ${chapter}`; if (verseStart) { p += `:${verseStart}`; if (verseEnd && verseEnd !== verseStart) p += `-${verseEnd}`; } }
    return p;
  };

  const handleGenerate = useCallback(async () => {
    const passage = getPassageText();
    if (!passage) { toast({ title: "Selecione uma passagem", variant: "destructive" }); return; }

    setIsLoading(true);
    setResult('');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          passage,
          type: 'title_generator',
          question: selectedStyle,
          materials_context: getMaterialsContext?.(),
        }),
        signal: controller.signal,
      });
      if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Erro ${resp.status}`); }
      if (!resp.body) throw new Error("Sem resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try { const c = JSON.parse(j).choices?.[0]?.delta?.content; if (c) { full += c; setResult(full); } } catch { buf = line + "\n" + buf; break; }
        }
      }
      for (let raw of buf.split("\n")) {
        if (!raw?.startsWith("data: ")) continue;
        const j = raw.slice(6).trim(); if (j === "[DONE]") continue;
        try { const c = JSON.parse(j).choices?.[0]?.delta?.content; if (c) full += c; } catch {}
      }
      setResult(full);
    } catch (e: any) {
      if (e.name !== 'AbortError') toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setIsLoading(false); abortRef.current = null; }
  }, [bibleBook, chapter, verseStart, verseEnd, customPassage, selectedStyle, getMaterialsContext]);

  const handleCopySection = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
    toast({ title: `${label} copiado!` });
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(result);
    setCopiedSection('all');
    setTimeout(() => setCopiedSection(null), 2000);
    toast({ title: "Tudo copiado!" });
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gm, '<h3 class="text-sm font-bold mt-3 mb-1 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-base font-bold mt-4 mb-1.5 text-primary">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mt-4 mb-2 text-foreground">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm leading-relaxed">$2</li>')
      .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed text-foreground/90 mb-1">')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="card-library p-4 sm:p-6 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" /> Gerador de Títulos & Temas Criativos
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Gere títulos, temas e pontos que <strong>transformam</strong> o ouvinte — criativos, provocativos, questionadores e afirmativos.
      </p>

      {/* Bible passage selection */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Livro</label>
          <select value={bibleBook} onChange={(e) => { setBibleBook(e.target.value); setChapter(''); setVerseStart(''); setVerseEnd(''); }} className="input-library w-full text-sm">
            <option value="">Selecione</option>
            {bibleBookNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Cap.</label>
          <select value={chapter} onChange={(e) => { setChapter(e.target.value); setVerseStart(''); setVerseEnd(''); }} className="input-library w-full text-sm" disabled={!bibleBook}>
            <option value="">-</option>
            {chapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">V. Início</label>
          <select value={verseStart} onChange={(e) => setVerseStart(e.target.value)} className="input-library w-full text-sm" disabled={!chapter}>
            <option value="">-</option>
            {verses.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">V. Fim</label>
          <select value={verseEnd} onChange={(e) => setVerseEnd(e.target.value)} className="input-library w-full text-sm" disabled={!verseStart}>
            <option value="">-</option>
            {verses.filter(v => !verseStart || v >= parseInt(verseStart)).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Ou digite a passagem</label>
        <input type="text" value={customPassage} onChange={(e) => setCustomPassage(e.target.value)} className="input-library w-full text-sm" placeholder="Ex: Mateus 11:28-30" />
      </div>

      {/* Style selection */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Estilo da Geração</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STYLES.map(s => (
            <button key={s.id} onClick={() => setSelectedStyle(s.id)}
              className={`p-2.5 rounded-lg border text-left transition-all ${selectedStyle === s.id ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' : 'bg-card border-border hover:bg-muted/50'}`}>
              <span className="text-xs font-medium flex items-center gap-1">{s.label}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.description}</p>
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={isLoading || !getPassageText()} className="btn-library-primary w-full">
        {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando títulos criativos...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar Títulos, Temas e Pontos</>}
      </Button>

      {/* Result */}
      {(isLoading || result) && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/30 px-4 py-2.5 flex items-center justify-between border-b border-border">
            <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isLoading ? 'Gerando...' : 'Títulos & Temas Gerados'}
            </span>
            {result && !isLoading && (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopyAll}>
                  {copiedSection === 'all' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  Copiar tudo
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleGenerate}>
                  <RefreshCw className="w-3 h-3" /> Regenerar
                </Button>
              </div>
            )}
          </div>
          <div className="p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
        </div>
      )}
    </div>
  );
}
