import { useState, useRef, useCallback } from 'react';
import { BookOpen, Search, Send, Loader2, Copy, Check, BookMarked, ScrollText, Languages, Church, Lightbulb, MessageCircleQuestion, Save, BookText, GitCompare, Heart, Globe, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';
import type { ExegesisAnalysis } from '@/hooks/useExegesis';

export type AnalysisType = 
  | 'full_exegesis' | 'context_analysis' | 'word_study' | 'genre_analysis' 
  | 'theological_analysis' | 'application' | 'question'
  | 'inductive_method' | 'version_comparison' | 'devotional' | 'geographic_historical'
  | 'lessons_applications';

interface Props {
  onSave: (analysis: { passage: string; analysis_type: string; question?: string; content: string }) => Promise<ExegesisAnalysis | null>;
  getMaterialsContext?: () => string | undefined;
  materialsCount?: number;
}

const ANALYSIS_TYPES: { id: AnalysisType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'full_exegesis', label: 'Exegese Completa', icon: BookOpen, description: 'Análise exegética completa seguindo os 7 elementos de Gorman' },
  { id: 'context_analysis', label: 'Contexto', icon: ScrollText, description: 'Contexto histórico, literário e canônico' },
  { id: 'word_study', label: 'Estudo de Palavras', icon: Languages, description: 'Palavras-chave no original (hebraico/grego)' },
  { id: 'genre_analysis', label: 'Gênero Literário', icon: BookMarked, description: 'Análise do gênero e regras de interpretação' },
  { id: 'theological_analysis', label: 'Teologia', icon: Church, description: 'Temas teológicos e história da redenção' },
  { id: 'application', label: 'Aplicação', icon: Lightbulb, description: 'Princípios permanentes e aplicação prática' },
  { id: 'inductive_method', label: 'Método Indutivo', icon: BookText, description: 'Observação → Interpretação → Aplicação' },
  { id: 'version_comparison', label: 'Versões', icon: GitCompare, description: 'Compare diferentes traduções bíblicas' },
  { id: 'devotional', label: 'Devocional', icon: Heart, description: 'Reflexão devocional cristocêntrica' },
  { id: 'geographic_historical', label: 'Geográfico/Histórico', icon: Globe, description: 'Análise geográfica e histórica com mapas' },
  { id: 'lessons_applications', label: 'Lições e Aplicações', icon: Lightbulb, description: 'Extraia lições, aplicações e reflexões do texto' },
  { id: 'question', label: 'Pergunta Livre', icon: MessageCircleQuestion, description: 'Faça uma pergunta sobre o texto' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

export function ExegesisAnalyzer({ onSave, getMaterialsContext, materialsCount = 0 }: Props) {
  const [bibleBook, setBibleBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseStart, setVerseStart] = useState('');
  const [verseEnd, setVerseEnd] = useState('');
  const [customPassage, setCustomPassage] = useState('');
  const [selectedType, setSelectedType] = useState<AnalysisType>('full_exegesis');
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const [lastResult, setLastResult] = useState<{ passage: string; type: AnalysisType; question?: string; content: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const bibleBookNames = getBibleBookNames();
  const chapters = bibleBook ? getChaptersArray(bibleBook) : [];
  const verses = bibleBook && chapter ? getVersesArray(bibleBook, parseInt(chapter)) : [];

  const getPassageText = () => {
    if (customPassage.trim()) return customPassage.trim();
    if (!bibleBook) return '';
    let passage = bibleBook;
    if (chapter) {
      passage += ` ${chapter}`;
      if (verseStart) {
        passage += `:${verseStart}`;
        if (verseEnd && verseEnd !== verseStart) passage += `-${verseEnd}`;
      }
    }
    return passage;
  };

  const generateMapImage = async (passage: string, content: string) => {
    setMapLoading(true);
    setMapImageUrl(null);
    try {
      const mapDataMatch = content.match(/```MAP_DATA\n([\s\S]*?)```/);
      const mapInfo = mapDataMatch ? mapDataMatch[1] : `Mapa bíblico de ${passage}`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          passage,
          type: 'generate_map_image',
          question: mapInfo,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.image_url) {
          setMapImageUrl(data.image_url);
        }
      }
    } catch (e) {
      console.error('Map generation error:', e);
    } finally {
      setMapLoading(false);
    }
  };

  const handleAnalyze = useCallback(async () => {
    const passage = getPassageText();
    if (!passage) { toast({ title: "Selecione uma passagem", variant: "destructive" }); return; }
    if (selectedType === 'question' && !question.trim()) { toast({ title: "Digite sua pergunta", variant: "destructive" }); return; }

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
        body: JSON.stringify({ passage, type: selectedType, question: question.trim() || undefined, materials_context: getMaterialsContext?.() }),
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

      // flush
      for (let raw of textBuffer.split("\n")) {
        if (!raw || !raw.startsWith("data: ")) continue;
        const j = raw.slice(6).trim();
        if (j === "[DONE]") continue;
        try { const c = JSON.parse(j).choices?.[0]?.delta?.content; if (c) fullContent += c; } catch {}
      }

      setLastResult({ passage, type: selectedType, question: selectedType === 'question' ? question.trim() : undefined, content: fullContent });
      setCurrentStream('');

      // Generate map image for geographic_historical type
      if (selectedType === 'geographic_historical') {
        generateMapImage(passage, fullContent);
      }

      // Auto-save
      const saved = await onSave({ passage, analysis_type: selectedType, question: question.trim() || undefined, content: fullContent });
      if (saved) { setSaved(true); toast({ title: "Análise salva!", description: "Acesse no Histórico." }); }

      setQuestion('');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error: any) {
      if (error.name !== 'AbortError') toast({ title: "Erro na análise", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [bibleBook, chapter, verseStart, verseEnd, customPassage, selectedType, question, onSave, getMaterialsContext]);

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/「(.*?)」(\(.*?\))/g, '<span style="background-color:#FEF3C7;border-left:3px solid #D97706;padding:2px 6px;border-radius:3px;font-style:italic;display:inline;">"$1"</span> <span style="color:#92400E;font-weight:600;font-size:0.9em;">$2</span>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed text-foreground/90 mb-2">')
      .replace(/\n/g, '<br/>');
    return `<p class="text-sm leading-relaxed text-foreground/90 mb-2">${html}</p>`;
  };

  return (
    <div className="space-y-6">
      {/* Passage Selection */}
      <div className="card-library p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Search className="w-4 h-4" /> Selecionar Passagem
        </h3>

        {/* Materials indicator */}
        {materialsCount > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">
              📚 {materialsCount} materiais na Base de Conhecimento — serão consultados automaticamente na análise
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Livro</label>
            <select value={bibleBook} onChange={(e) => { setBibleBook(e.target.value); setChapter(''); setVerseStart(''); setVerseEnd(''); }} className="input-library w-full text-sm">
              <option value="">Selecione</option>
              {bibleBookNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Capítulo</label>
            <select value={chapter} onChange={(e) => { setChapter(e.target.value); setVerseStart(''); setVerseEnd(''); }} className="input-library w-full text-sm" disabled={!bibleBook}>
              <option value="">-</option>
              {chapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Vers. Início</label>
            <select value={verseStart} onChange={(e) => setVerseStart(e.target.value)} className="input-library w-full text-sm" disabled={!chapter}>
              <option value="">-</option>
              {verses.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Vers. Fim</label>
            <select value={verseEnd} onChange={(e) => setVerseEnd(e.target.value)} className="input-library w-full text-sm" disabled={!verseStart}>
              <option value="">-</option>
              {verses.filter(v => !verseStart || v >= parseInt(verseStart)).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Ou cole/digite a referência ou texto bíblico</label>
          <Textarea value={customPassage} onChange={(e) => setCustomPassage(e.target.value)} className="min-h-[60px] text-sm" placeholder="Ex: Romanos 8:28-30 ou cole o texto bíblico direto" />
        </div>
        {getPassageText() && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm font-medium text-primary">📖 Passagem: {getPassageText().substring(0, 100)}{getPassageText().length > 100 ? '...' : ''}</p>
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

        {selectedType === 'question' && (
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Digite sua pergunta sobre o texto bíblico..." className="min-h-[80px]" />
        )}

        <div className="flex gap-3">
          <Button onClick={handleAnalyze} disabled={isLoading || !getPassageText()} className="btn-library-primary flex-1 sm:flex-none">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</> : <><Send className="w-4 h-4 mr-2" /> Analisar</>}
          </Button>
          {isLoading && <Button variant="outline" onClick={() => { abortRef.current?.abort(); setIsLoading(false); setCurrentStream(''); }}>Cancelar</Button>}
        </div>
      </div>

      {/* Streaming */}
      {isLoading && currentStream && (
        <div className="card-library p-4 sm:p-6" ref={resultRef}>
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium text-primary">Gerando análise...</span>
          </div>
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentStream) }} />
        </div>
      )}

      {/* Last Result */}
      {lastResult && !isLoading && (
        <div className="card-library p-4 sm:p-6 space-y-4" ref={resultRef}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                {ANALYSIS_TYPES.find(t => t.id === lastResult.type)?.label}
              </span>
              <span className="text-xs text-muted-foreground">📖 {lastResult.passage.substring(0, 60)}</span>
              {saved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Salvo</span>}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(lastResult.content); toast({ title: "Copiado!" }); }}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(lastResult.content) }} />
          {/* Map Image for Geographic/Historical */}
          {lastResult.type === 'geographic_historical' && (
            <div className="mt-4 border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-3"><MapPin className="w-4 h-4 text-primary" /> Mapa Bíblico</h4>
              {mapLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Gerando imagem do mapa...
                </div>
              ) : mapImageUrl ? (
                <img src={mapImageUrl} alt={`Mapa bíblico de ${lastResult.passage}`} className="w-full rounded-lg shadow-md" />
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">Mapa em processamento ou indisponível. Os dados geográficos estão descritos na análise acima.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!lastResult && !isLoading && (
        <div className="card-library p-6 sm:p-8 text-center space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-primary/40" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">Como usar a Exegese Bíblica</h3>
            <div className="text-sm text-muted-foreground space-y-2 max-w-lg mx-auto text-left">
              <p><strong>1.</strong> Selecione ou cole a passagem bíblica</p>
              <p><strong>2.</strong> Escolha o tipo de análise (exegese, esboço, devocional...)</p>
              <p><strong>3.</strong> Clique em "Analisar" — o resultado é salvo automaticamente</p>
              <p><strong>4.</strong> Acesse o Histórico para rever e anotar suas análises</p>
              <p><strong>5.</strong> Adicione materiais em "Materiais" para enriquecer as análises com sua biblioteca pessoal</p>
            </div>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg text-left max-w-lg mx-auto">
            <p className="text-xs text-muted-foreground mb-2 font-medium">📚 Base acadêmica:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Gorman</strong> — 7 elementos da exegese</li>
              <li>• <strong>Klein</strong> — Interpretação responsável</li>
              <li>• <strong>Fee</strong> — Gêneros literários</li>
              <li>• <strong>Hernandes</strong> — Pregação expositiva</li>
              <li>• <strong>Presley Camargo</strong> — Sermão temático/textual/expositivo</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
