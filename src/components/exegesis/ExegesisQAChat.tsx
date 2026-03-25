import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Trash2, BookOpen, MessageCircle, Settings2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';
import { useAuth } from '@/contexts/AuthContext';
import type { ExegesisMaterial } from '@/hooks/useExegesis';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  passage?: string;
  timestamp: Date;
}

interface Props {
  getMaterialsContext?: () => string | undefined;
  materialsCount?: number;
  materials?: ExegesisMaterial[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

export function ExegesisQAChat({ getMaterialsContext, materialsCount = 0, materials = [] }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassageSelector, setShowPassageSelector] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Bible selectors
  const [bibleBook, setBibleBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseStart, setVerseStart] = useState('');
  const [verseEnd, setVerseEnd] = useState('');

  const bibleBookNames = getBibleBookNames();
  const chapters = bibleBook ? getChaptersArray(bibleBook) : [];
  const verses = bibleBook && chapter ? getVersesArray(bibleBook, parseInt(chapter)) : [];

  // Material stats
  const materialStats = {
    comentarios: materials.filter(m => m.material_category === 'comentario').length,
    dicionarios: materials.filter(m => m.material_category === 'dicionario').length,
    livros: materials.filter(m => m.material_category === 'livro').length,
    devocionais: materials.filter(m => m.material_category === 'devocional').length,
    midia: materials.filter(m => m.material_category === 'midia').length,
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build full materials context
  const getFullMaterialsContext = useCallback(() => {
    if (materials.length === 0) return undefined;
    
    const grouped = {
      comentario: materials.filter(m => m.material_category === 'comentario'),
      dicionario: materials.filter(m => m.material_category === 'dicionario'),
      livro: materials.filter(m => m.material_category === 'livro'),
      devocional: materials.filter(m => m.material_category === 'devocional'),
      midia: materials.filter(m => m.material_category === 'midia'),
    };

    const formatMaterial = (m: ExegesisMaterial) => {
      let line = `- **${m.title}**`;
      if (m.author) line += ` por ${m.author}`;
      if (m.description) line += `\n  Descrição: ${m.description}`;
      if (m.theme) line += `\n  Tema: ${m.theme}`;
      if (m.sub_themes && (m.sub_themes as any).length > 0) line += `\n  Sub-temas: ${(m.sub_themes as any).join(', ')}`;
      if (m.keywords && (m.keywords as any).length > 0) line += `\n  Palavras-chave: ${(m.keywords as any).join(', ')}`;
      if (m.bible_references && (m.bible_references as any).length > 0) line += `\n  Referências: ${(m.bible_references as any).join(', ')}`;
      if (m.content_origin) line += `\n  Origem: ${m.content_origin}`;
      return line;
    };

    let context = `\n## 📚 BIBLIOTECA COMPLETA DO USUÁRIO (${materials.length} materiais — USE 100% COMO BASE):\n`;
    context += `\nVocê DEVE utilizar TODOS estes materiais como referência para suas respostas. Cite os materiais relevantes pelo nome.\n`;
    
    if (grouped.comentario.length > 0) context += `\n### 📘 Comentários Bíblicos (${grouped.comentario.length}):\n${grouped.comentario.map(formatMaterial).join('\n\n')}`;
    if (grouped.dicionario.length > 0) context += `\n\n### 📙 Dicionários Bíblicos (${grouped.dicionario.length}):\n${grouped.dicionario.map(formatMaterial).join('\n\n')}`;
    if (grouped.livro.length > 0) context += `\n\n### 📚 Livros Teológicos (${grouped.livro.length}):\n${grouped.livro.map(formatMaterial).join('\n\n')}`;
    if (grouped.devocional.length > 0) context += `\n\n### 📗 Devocionais (${grouped.devocional.length}):\n${grouped.devocional.map(formatMaterial).join('\n\n')}`;
    if (grouped.midia.length > 0) context += `\n\n### 🎬 Mídia (${grouped.midia.length}):\n${grouped.midia.map(formatMaterial).join('\n\n')}`;
    
    return context;
  }, [materials]);

  const getPassageText = () => {
    if (!bibleBook || bibleBook === '__clear') return '';
    let passage = bibleBook;
    if (chapter) {
      passage += ` ${chapter}`;
      if (verseStart && verseStart !== '__clear') {
        passage += `:${verseStart}`;
        if (verseEnd && verseEnd !== verseStart) passage += `-${verseEnd}`;
      }
    }
    return passage;
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const passage = getPassageText();
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, passage: passage || undefined, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const assistantId = crypto.randomUUID();
    let fullContent = '';

    try {
      const history = [...messages, userMsg].slice(-10).map(m => {
        const prefix = m.role === 'user' ? 'Pergunta' : 'Resposta';
        const passageTag = m.passage ? `[${m.passage}] ` : '';
        return `${prefix}: ${passageTag}${m.content}`;
      }).join('\n\n');

      const materialsCtx = getFullMaterialsContext();

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          passage: passage || text,
          type: 'question',
          question: `${text}\n\n## Histórico da conversa:\n${history}`,
          materials_context: materialsCtx,
          conversation_history: history,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({ title: 'Limite atingido', description: 'Aguarde um momento.', variant: 'destructive' });
        } else if (resp.status === 402) {
          toast({ title: 'Créditos insuficientes', description: 'Adicione créditos para continuar.', variant: 'destructive' });
        } else {
          throw new Error(e.error || `Erro ${resp.status}`);
        }
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('Sem resposta');

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

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
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m)
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      for (let raw of textBuffer.split('\n')) {
        if (!raw || !raw.startsWith('data: ')) continue;
        const j = raw.slice(6).trim();
        if (j === '[DONE]') continue;
        try {
          const c = JSON.parse(j).choices?.[0]?.delta?.content;
          if (c) {
            fullContent += c;
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m)
            );
          }
        } catch {}
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast({ title: 'Erro', description: e.message || 'Erro ao processar pergunta', variant: 'destructive' });
        setMessages(prev => prev.filter(m => m.id !== assistantId));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, getFullMaterialsContext, bibleBook, chapter, verseStart, verseEnd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (isLoading) { abortRef.current?.abort(); setIsLoading(false); }
    setMessages([]);
  };

  const passageText = getPassageText();

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] bg-background rounded-lg border overflow-hidden">
      
      {/* Compact header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight">Assistente Bíblico</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {materials.length} materiais integrados
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowPassageSelector(!showPassageSelector)}
            title="Selecionar passagem"
          >
            <BookOpen className="w-4 h-4" />
          </Button>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleClear} title="Limpar conversa">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Material badges (compact) */}
      <div className="px-4 py-1.5 flex flex-wrap gap-1 text-[10px] border-b bg-muted/10 shrink-0">
        {materialStats.comentarios > 0 && (
          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">📘 {materialStats.comentarios}</span>
        )}
        {materialStats.dicionarios > 0 && (
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">📙 {materialStats.dicionarios}</span>
        )}
        {materialStats.livros > 0 && (
          <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">📚 {materialStats.livros}</span>
        )}
        {materialStats.devocionais > 0 && (
          <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full">📗 {materialStats.devocionais}</span>
        )}
        {materialStats.midia > 0 && (
          <span className="bg-pink-500/10 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded-full">🎬 {materialStats.midia}</span>
        )}
        {passageText && (
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">📖 {passageText}</span>
        )}
      </div>

      {/* Bible passage selector (collapsible) */}
      {showPassageSelector && (
        <div className="px-4 py-2.5 border-b bg-muted/5 shrink-0 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={bibleBook} onValueChange={(v) => { setBibleBook(v === '__clear' ? '' : v); setChapter(''); setVerseStart(''); setVerseEnd(''); }}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="📖 Livro" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="__clear">— Sem filtro —</SelectItem>
                {bibleBookNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {bibleBook && bibleBook !== '__clear' && (
              <Select value={chapter} onValueChange={(v) => { setChapter(v); setVerseStart(''); setVerseEnd(''); }}>
                <SelectTrigger className="w-[90px] h-8 text-xs">
                  <SelectValue placeholder="Cap." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {chapters.map(ch => (
                    <SelectItem key={ch} value={String(ch)}>Cap. {ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {chapter && (
              <>
                <Select value={verseStart} onValueChange={setVerseStart}>
                  <SelectTrigger className="w-[80px] h-8 text-xs">
                    <SelectValue placeholder="De v." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__clear">Todos</SelectItem>
                    {verses.map(v => (
                      <SelectItem key={v} value={String(v)}>v. {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {verseStart && verseStart !== '__clear' && (
                  <Select value={verseEnd} onValueChange={setVerseEnd}>
                    <SelectTrigger className="w-[80px] h-8 text-xs">
                      <SelectValue placeholder="Até v." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {verses.filter(v => v >= parseInt(verseStart)).map(v => (
                        <SelectItem key={v} value={String(v)}>v. {v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPassageSelector(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages area — full height */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-6">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-primary/40" />
            </div>
            <p className="font-semibold text-base text-foreground mb-1">Assistente de Exegese Bíblica</p>
            <p className="text-xs max-w-md mb-6">
              Faça perguntas sobre a Bíblia. O sistema utiliza <strong>100% dos seus {materials.length} materiais</strong> como base para respostas fundamentadas.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {[
                'O que significa "justificação pela fé" em Romanos 3?',
                'Qual o contexto histórico de Êxodo 12?',
                'Explique a parábola do semeador',
                'Quais as diferenças entre os evangelhos sinóticos?',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                  className="text-left text-xs p-3 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/20 transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-1">
            {messages.map((msg, idx) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area — sticky bottom */}
      <div className="border-t bg-background px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={passageText ? `Pergunte sobre ${passageText}...` : 'Faça sua pergunta bíblica...'}
                className="min-h-[48px] max-h-[160px] resize-none text-sm pr-4 rounded-xl border-muted-foreground/20"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[48px] w-[48px] rounded-xl"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Respostas baseadas em {materials.length} materiais • Pressione Enter para enviar
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---- Chat Bubble Component ---- */
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const time = message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`relative max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted/50 text-foreground rounded-bl-md border border-border/50'
        }`}
      >
        {isUser ? (
          <div>
            {message.passage && (
              <span className="text-[10px] opacity-80 block mb-1 font-medium">📖 {message.passage}</span>
            )}
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 leading-relaxed">
            <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
          </div>
        )}
        <span className={`text-[9px] block mt-1 ${isUser ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground/60'}`}>
          {time}
        </span>
      </div>
    </div>
  );
}
