import { useState, useCallback, useRef } from 'react';
import { BookOpen, Search, Send, Loader2, Copy, Check, Save, Link2, BookMarked, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';
import type { ExegesisAnalysis } from '@/hooks/useExegesis';

interface Props {
  onSave: (analysis: { passage: string; analysis_type: string; question?: string; content: string }) => Promise<ExegesisAnalysis | null>;
  getMaterialsContext?: () => string | undefined;
  materialsCount?: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

const CROSS_REF_TYPES = [
  { id: 'thematic', label: 'Temáticas', icon: '📖', description: 'Versículos que tratam do mesmo assunto ou conceito, mesmo sem a mesma palavra' },
  { id: 'vocabulary', label: 'Vocabulares', icon: '📝', description: 'Mesma palavra-chave no original (hebraico/grego) em contextos diferentes' },
  { id: 'linguistic', label: 'Linguísticas', icon: '🔤', description: 'Análise de termos no hebraico, aramaico e grego com variações de tradução' },
  { id: 'contextual', label: 'Contextuais', icon: '🗺️', description: 'Contexto histórico, cultural e situação do autor/público original' },
  { id: 'typological', label: 'Tipológicas', icon: '🔗', description: 'AT prefigurando o NT — tipos, sombras e cumprimentos' },
  { id: 'prophetic', label: 'Proféticas', icon: '🔮', description: 'Profecia e cumprimento entre AT e NT (literal e progressivo)' },
  { id: 'doctrinal', label: 'Doutrinárias', icon: '⛪', description: 'Notas doutrinárias e estudo sistemático da doutrina' },
  { id: 'narrative', label: 'Narrativas', icon: '📜', description: 'Exemplos históricos que demonstram o princípio bíblico' },
  { id: 'comparative', label: 'Comparativas', icon: '⚖️', description: 'Textos com contraste ou equilíbrio teológico (fé vs obras, justiça vs graça)' },
  { id: 'apostolic', label: 'Apostólicas', icon: '✉️', description: 'Citações do AT feitas pelos autores do NT — como os apóstolos interpretaram' },
  { id: 'eschatological', label: 'Escatológicas', icon: '🌅', description: 'Relação com juízo final, reino de Deus, segunda vinda, consumação' },
  { id: 'all', label: 'Panorama Geral', icon: '🌐', description: 'Busca completa nas 12 categorias + síntese panorâmica de toda a Bíblia' },
];

const BIBLE_ONLINE_SLUGS: Record<string, string> = {
  'Gênesis': 'gn', 'Êxodo': 'ex', 'Levítico': 'lv', 'Números': 'nm', 'Deuteronômio': 'dt',
  'Josué': 'js', 'Juízes': 'jz', 'Rute': 'rt', '1 Samuel': '1sm', '2 Samuel': '2sm',
  '1 Reis': '1rs', '2 Reis': '2rs', '1 Crônicas': '1cr', '2 Crônicas': '2cr',
  'Esdras': 'ed', 'Neemias': 'ne', 'Ester': 'et', 'Jó': 'jó',
  'Salmos': 'sl', 'Provérbios': 'pv', 'Eclesiastes': 'ec', 'Cânticos': 'ct',
  'Isaías': 'is', 'Jeremias': 'jr', 'Lamentações': 'lm', 'Ezequiel': 'ez', 'Daniel': 'dn',
  'Oséias': 'os', 'Joel': 'jl', 'Amós': 'am', 'Obadias': 'ob', 'Jonas': 'jn',
  'Miquéias': 'mq', 'Naum': 'na', 'Habacuque': 'hc', 'Sofonias': 'sf', 'Ageu': 'ag',
  'Zacarias': 'zc', 'Malaquias': 'ml',
  'Mateus': 'mt', 'Marcos': 'mc', 'Lucas': 'lc', 'João': 'jo', 'Atos': 'atos',
  'Romanos': 'rm', '1 Coríntios': '1co', '2 Coríntios': '2co', 'Gálatas': 'gl',
  'Efésios': 'ef', 'Filipenses': 'fp', 'Colossenses': 'cl',
  '1 Tessalonicenses': '1ts', '2 Tessalonicenses': '2ts',
  '1 Timóteo': '1tm', '2 Timóteo': '2tm', 'Tito': 'tt', 'Filemom': 'fm',
  'Hebreus': 'hb', 'Tiago': 'tg', '1 Pedro': '1pe', '2 Pedro': '2pe',
  '1 João': '1jo', '2 João': '2jo', '3 João': '3jo', 'Judas': 'jd', 'Apocalipse': 'ap',
};

export function CrossReferencesView({ onSave, getMaterialsContext, materialsCount = 0 }: Props) {
  const [bibleBook, setBibleBook] = useState('');
  const [chapterStart, setChapterStart] = useState('');
  const [chapterEnd, setChapterEnd] = useState('');
  const [verseStart, setVerseStart] = useState('');
  const [verseEnd, setVerseEnd] = useState('');
  const [customPassage, setCustomPassage] = useState('');
  const [selectedRefType, setSelectedRefType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const [lastResult, setLastResult] = useState<{ passage: string; content: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const bibleBookNames = getBibleBookNames();
  const chapters = bibleBook ? getChaptersArray(bibleBook) : [];
  const isMultiChapter = chapterStart && chapterEnd && chapterEnd !== chapterStart;
  const verses = bibleBook && chapterStart && !isMultiChapter ? getVersesArray(bibleBook, parseInt(chapterStart)) : [];

  const getBibleOnlineUrl = () => {
    if (!bibleBook || !chapterStart) return null;
    const slug = BIBLE_ONLINE_SLUGS[bibleBook];
    if (!slug) return null;
    return `https://www.bibliaonline.com.br/acf/${slug}/${chapterStart}`;
  };

  const getPassageText = () => {
    if (customPassage.trim()) return customPassage.trim();
    if (!bibleBook) return '';
    let passage = bibleBook;
    if (chapterStart) {
      passage += ` ${chapterStart}`;
      if (chapterEnd && chapterEnd !== chapterStart) {
        passage += `-${chapterEnd}`;
      } else if (verseStart) {
        passage += `:${verseStart}`;
        if (verseEnd && verseEnd !== verseStart) passage += `-${verseEnd}`;
      }
    }
    return passage;
  };

  const handleSearch = useCallback(async () => {
    const passage = getPassageText();
    if (!passage) { toast({ title: "Selecione uma passagem", variant: "destructive" }); return; }

    setIsLoading(true);
    setCurrentStream('');
    setLastResult(null);
    setSaved(false);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          passage,
          type: 'cross_references',
          question: selectedRefType,
          materials_context: getMaterialsContext?.(),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || `Erro ${resp.status}`); }
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

      for (let raw of textBuffer.split("\n")) {
        if (!raw || !raw.startsWith("data: ")) continue;
        const j = raw.slice(6).trim();
        if (j === "[DONE]") continue;
        try { const c = JSON.parse(j).choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {}
      }

      setLastResult({ passage, content: fullContent });
      setCurrentStream('');

      const savedAnalysis = await onSave({ passage, analysis_type: 'cross_references', question: selectedRefType, content: fullContent });
      if (savedAnalysis) { setSaved(true); toast({ title: "Referências salvas!", description: "Acesse no Histórico." }); }

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error: any) {
      if (error.name !== 'AbortError') toast({ title: "Erro na busca", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [bibleBook, chapterStart, chapterEnd, verseStart, verseEnd, customPassage, selectedRefType, onSave, getMaterialsContext]);

  const handleCopy = () => {
    const content = lastResult?.content || currentStream;
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copiado!" });
    }
  };

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/👉\s*\[(.*?)\]:\s*"(.*?)"/g, '<div style="background-color:hsl(var(--accent)/0.3);border-left:3px solid hsl(var(--primary));padding:8px 12px;border-radius:6px;margin:6px 0;"><strong style="color:hsl(var(--primary));">👉 $1</strong><br/><em style="font-size:0.9em;">"$2"</em></div>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed text-foreground/90 mb-2">')
      .replace(/\n/g, '<br/>');
    return `<p class="text-sm leading-relaxed text-foreground/90 mb-2">${html}</p>`;
  };

  const displayContent = lastResult?.content || currentStream;

  return (
    <div className="space-y-6">
      {/* Passage Selection */}
      <div className="card-library p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Search className="w-4 h-4" /> Selecionar Passagem
        </h3>

        {materialsCount > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">
              📚 {materialsCount} materiais na Base de Conhecimento — serão consultados nas referências
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Livro</label>
            <select value={bibleBook} onChange={(e) => { setBibleBook(e.target.value); setChapterStart(''); setChapterEnd(''); setVerseStart(''); setVerseEnd(''); }} className="input-library w-full text-sm">
              <option value="">Selecione</option>
              {bibleBookNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Cap. Início</label>
            <select value={chapterStart} onChange={(e) => { setChapterStart(e.target.value); setChapterEnd(''); setVerseStart(''); setVerseEnd(''); }} className="input-library w-full text-sm" disabled={!bibleBook}>
              <option value="">-</option>
              {chapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Cap. Fim</label>
            <select value={chapterEnd} onChange={(e) => { setChapterEnd(e.target.value); if (e.target.value && e.target.value !== chapterStart) { setVerseStart(''); setVerseEnd(''); } }} className="input-library w-full text-sm" disabled={!chapterStart}>
              <option value="">Mesmo</option>
              {chapters.filter(ch => ch >= parseInt(chapterStart)).map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Vers. Início</label>
            <select value={verseStart} onChange={(e) => setVerseStart(e.target.value)} className="input-library w-full text-sm" disabled={!chapterStart || !!isMultiChapter}>
              <option value="">{isMultiChapter ? 'N/A' : '-'}</option>
              {verses.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Vers. Fim</label>
            <select value={verseEnd} onChange={(e) => setVerseEnd(e.target.value)} className="input-library w-full text-sm" disabled={!verseStart || !!isMultiChapter}>
              <option value="">{isMultiChapter ? 'N/A' : '-'}</option>
              {verses.filter(v => !verseStart || v >= parseInt(verseStart)).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        {getBibleOnlineUrl() && (
          <a href={getBibleOnlineUrl()!} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
            <ExternalLink className="w-3.5 h-3.5" />
            Ler na Bíblia Online (ACF) — {bibleBook} {chapterStart}{isMultiChapter ? `-${chapterEnd}` : ''}
          </a>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Ou cole/digite a referência</label>
          <Textarea value={customPassage} onChange={(e) => setCustomPassage(e.target.value)} className="min-h-[50px] text-sm" placeholder="Ex: Romanos 8:28-30" />
        </div>

        {getPassageText() && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm font-medium text-primary">📖 Passagem: {getPassageText()}</p>
          </div>
        )}
      </div>

      {/* Reference Type Selection */}
      <div className="card-library p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Link2 className="w-4 h-4" /> Tipo de Referência Cruzada
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {CROSS_REF_TYPES.map(type => {
            const isActive = selectedRefType === type.id;
            return (
              <button key={type.id} onClick={() => setSelectedRefType(type.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-center ${isActive ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}>
                <span className="text-lg">{type.icon}</span>
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground italic">
          {CROSS_REF_TYPES.find(t => t.id === selectedRefType)?.description}
        </p>

        <Button onClick={handleSearch} disabled={isLoading || !getPassageText()} className="w-full gap-2" size="lg">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando referências...</> : <><Search className="w-4 h-4" /> Buscar Referências Cruzadas</>}
        </Button>

        {isLoading && (
          <Button variant="outline" size="sm" onClick={() => abortRef.current?.abort()} className="w-full">
            Cancelar
          </Button>
        )}
      </div>

      {/* Results */}
      {displayContent && (
        <div ref={resultRef} className="card-library p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Referências Cruzadas — {lastResult?.passage || getPassageText()}
            </h3>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 text-xs">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              {saved && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Save className="w-3 h-3" /> Salvo
                </Badge>
              )}
            </div>
          </div>
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
          />
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Gerando referências...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
