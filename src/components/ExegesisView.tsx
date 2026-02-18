import { useState, useRef, useCallback } from 'react';
import { BookOpen, Search, Send, Loader2, Copy, Check, BookMarked, ScrollText, Languages, Church, Lightbulb, MessageCircleQuestion, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';

type AnalysisType = 'full_exegesis' | 'context_analysis' | 'word_study' | 'genre_analysis' | 'theological_analysis' | 'application' | 'question';

interface AnalysisResult {
  id: string;
  passage: string;
  type: AnalysisType;
  question?: string;
  content: string;
  timestamp: Date;
  notes: string;
}

const ANALYSIS_TYPES: { id: AnalysisType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'full_exegesis', label: 'Exegese Completa', icon: BookOpen, description: 'Análise exegética completa do texto' },
  { id: 'context_analysis', label: 'Contexto', icon: ScrollText, description: 'Contexto histórico, literário e canônico' },
  { id: 'word_study', label: 'Estudo de Palavras', icon: Languages, description: 'Palavras-chave no original (hebraico/grego)' },
  { id: 'genre_analysis', label: 'Gênero Literário', icon: BookMarked, description: 'Análise do gênero e regras de interpretação' },
  { id: 'theological_analysis', label: 'Análise Teológica', icon: Church, description: 'Temas teológicos e história da redenção' },
  { id: 'application', label: 'Aplicação', icon: Lightbulb, description: 'Princípios permanentes e aplicação prática' },
  { id: 'question', label: 'Pergunta Livre', icon: MessageCircleQuestion, description: 'Faça uma pergunta sobre o texto' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

export function ExegesisView() {
  const [bibleBook, setBibleBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseStart, setVerseStart] = useState('');
  const [verseEnd, setVerseEnd] = useState('');
  const [customPassage, setCustomPassage] = useState('');
  const [selectedType, setSelectedType] = useState<AnalysisType>('full_exegesis');
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [currentStream, setCurrentStream] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
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
        if (verseEnd && verseEnd !== verseStart) {
          passage += `-${verseEnd}`;
        }
      }
    }
    return passage;
  };

  const handleAnalyze = useCallback(async () => {
    const passage = getPassageText();
    if (!passage) {
      toast({ title: "Selecione uma passagem", description: "Escolha um livro e capítulo ou digite a referência.", variant: "destructive" });
      return;
    }
    if (selectedType === 'question' && !question.trim()) {
      toast({ title: "Digite sua pergunta", description: "Para o modo pergunta livre, digite sua dúvida.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setCurrentStream('');
    
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ passage, type: selectedType, question: question.trim() || undefined }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
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

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              setCurrentStream(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) fullContent += content;
          } catch {}
        }
      }

      const newResult: AnalysisResult = {
        id: crypto.randomUUID(),
        passage,
        type: selectedType,
        question: selectedType === 'question' ? question.trim() : undefined,
        content: fullContent,
        timestamp: new Date(),
        notes: '',
      };

      setResults(prev => [newResult, ...prev]);
      setCurrentStream('');
      setQuestion('');
      
      // Scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({ title: "Erro na análise", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [bibleBook, chapter, verseStart, verseEnd, customPassage, selectedType, question]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setCurrentStream('');
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copiado!", description: "Análise copiada para a área de transferência." });
  };

  const handleDeleteResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, notes } : r));
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown to HTML
    let html = text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed text-foreground/90 mb-2">')
      .replace(/\n/g, '<br/>');
    
    return `<p class="text-sm leading-relaxed text-foreground/90 mb-2">${html}</p>`;
  };

  const getTypeLabel = (type: AnalysisType) => ANALYSIS_TYPES.find(t => t.id === type)?.label || type;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">Exegese Bíblica</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Interprete textos bíblicos com ferramentas de análise exegética baseadas em princípios hermenêuticos sólidos
        </p>
      </div>

      {/* Seleção de Passagem */}
      <div className="card-library p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Search className="w-4 h-4" />
          Selecionar Passagem
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Livro</label>
            <select
              value={bibleBook}
              onChange={(e) => { setBibleBook(e.target.value); setChapter(''); setVerseStart(''); setVerseEnd(''); }}
              className="input-library w-full text-sm"
            >
              <option value="">Selecione</option>
              {bibleBookNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Capítulo</label>
            <select
              value={chapter}
              onChange={(e) => { setChapter(e.target.value); setVerseStart(''); setVerseEnd(''); }}
              className="input-library w-full text-sm"
              disabled={!bibleBook}
            >
              <option value="">-</option>
              {chapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Vers. Início</label>
            <select
              value={verseStart}
              onChange={(e) => setVerseStart(e.target.value)}
              className="input-library w-full text-sm"
              disabled={!chapter}
            >
              <option value="">-</option>
              {verses.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Vers. Fim</label>
            <select
              value={verseEnd}
              onChange={(e) => setVerseEnd(e.target.value)}
              className="input-library w-full text-sm"
              disabled={!verseStart}
            >
              <option value="">-</option>
              {verses.filter(v => !verseStart || v >= parseInt(verseStart)).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Ou digite a referência manualmente</label>
          <input
            type="text"
            value={customPassage}
            onChange={(e) => setCustomPassage(e.target.value)}
            className="input-library w-full text-sm"
            placeholder="Ex: Romanos 8:28-30 ou Salmo 23"
          />
        </div>

        {getPassageText() && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm font-medium text-primary">📖 Passagem selecionada: {getPassageText()}</p>
          </div>
        )}
      </div>

      {/* Tipo de Análise */}
      <div className="card-library p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Tipo de Análise
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ANALYSIS_TYPES.map(type => {
            const Icon = type.icon;
            const isActive = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-center ${
                  isActive 
                    ? 'bg-primary/10 border-primary/30 text-primary' 
                    : 'bg-card border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground italic">
          {ANALYSIS_TYPES.find(t => t.id === selectedType)?.description}
        </p>

        {selectedType === 'question' && (
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Digite sua pergunta sobre o texto bíblico..."
            className="min-h-[80px]"
          />
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleAnalyze}
            disabled={isLoading || !getPassageText()}
            className="btn-library-primary flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Analisar
              </>
            )}
          </Button>
          {isLoading && (
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Stream em andamento */}
      {isLoading && currentStream && (
        <div className="card-library p-4 sm:p-6" ref={resultRef}>
          <div className="flex items-center gap-2 mb-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium text-primary">Gerando análise...</span>
          </div>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(currentStream) }}
          />
        </div>
      )}

      {/* Resultados */}
      {results.map(result => (
        <div key={result.id} className="card-library p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {getTypeLabel(result.type)}
                </span>
                <span className="text-xs text-muted-foreground">
                  📖 {result.passage}
                </span>
              </div>
              {result.question && (
                <p className="text-xs text-muted-foreground mt-1 italic">❓ {result.question}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {result.timestamp.toLocaleDateString('pt-BR')} às {result.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleCopy(result.id, result.content)}
              >
                {copiedId === result.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleDeleteResult(result.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.content) }}
          />

          {/* Anotações */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">📝 Minhas Anotações</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setEditingNotesId(editingNotesId === result.id ? null : result.id)}
              >
                {editingNotesId === result.id ? 'Salvar' : 'Editar'}
              </Button>
            </div>
            {editingNotesId === result.id ? (
              <Textarea
                value={result.notes}
                onChange={(e) => handleUpdateNotes(result.id, e.target.value)}
                placeholder="Adicione seus comentários, reflexões e observações pessoais sobre esta análise..."
                className="min-h-[100px] text-sm"
              />
            ) : result.notes ? (
              <p className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/30 p-3 rounded">{result.notes}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Clique em "Editar" para adicionar suas anotações</p>
            )}
          </div>
        </div>
      ))}

      {/* Info Panel */}
      {results.length === 0 && !isLoading && (
        <div className="card-library p-6 sm:p-8 text-center space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-primary/40" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">Como usar a Exegese Bíblica</h3>
            <div className="text-sm text-muted-foreground space-y-2 max-w-lg mx-auto text-left">
              <p><strong>1.</strong> Selecione o livro, capítulo e versículos da passagem</p>
              <p><strong>2.</strong> Escolha o tipo de análise desejada</p>
              <p><strong>3.</strong> Clique em "Analisar" para gerar a exegese</p>
              <p><strong>4.</strong> Adicione suas anotações e comentários pessoais</p>
            </div>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg text-left max-w-lg mx-auto">
            <p className="text-xs text-muted-foreground mb-2 font-medium">📚 Princípios fundamentais:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Exegese</strong> = extrair do texto o que está nele</li>
              <li>• <strong>Eisegese</strong> = inserir no texto o que NÃO está nele</li>
              <li>• Texto fora de contexto é pretexto para heresia</li>
              <li>• Sempre analise o gênero literário antes de interpretar</li>
              <li>• Compare com outros textos bíblicos (contexto canônico)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
