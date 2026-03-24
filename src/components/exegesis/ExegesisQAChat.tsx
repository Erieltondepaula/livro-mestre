import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Trash2, BookOpen, MessageCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ExegesisMaterial } from '@/hooks/useExegesis';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  passage?: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Build full materials context with ALL material details
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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const passage = getPassageText();
    const fullQuestion = passage ? `[${passage}] ${text}` : text;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, passage };
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

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

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

  return (
    <div className="flex flex-col h-[600px] md:h-[700px] border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex flex-col border-b bg-muted/30">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Perguntas & Respostas Bíblicas</h3>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {/* Material stats bar */}
        <div className="px-3 pb-2 flex flex-wrap gap-1.5 text-[10px]">
          {materialStats.comentarios > 0 && (
            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">📘 Comentários {materialStats.comentarios}</span>
          )}
          {materialStats.dicionarios > 0 && (
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">📙 Dicionários {materialStats.dicionarios}</span>
          )}
          {materialStats.livros > 0 && (
            <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">📚 Livros {materialStats.livros}</span>
          )}
          {materialStats.devocionais > 0 && (
            <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">📗 Devocionais {materialStats.devocionais}</span>
          )}
          {materialStats.midia > 0 && (
            <span className="bg-pink-500/10 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded-full">🎬 Mídia {materialStats.midia}</span>
          )}
          {materials.length === 0 && (
            <span className="text-muted-foreground">Nenhum material. Adicione na aba Materiais para respostas mais ricas.</span>
          )}
        </div>

        {/* Bible selectors */}
        <div className="px-3 pb-2 flex flex-wrap gap-2">
          <Select value={bibleBook} onValueChange={(v) => { setBibleBook(v); setChapter(''); setVerseStart(''); setVerseEnd(''); }}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
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
              <SelectTrigger className="w-[100px] h-8 text-xs">
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
                <SelectTrigger className="w-[90px] h-8 text-xs">
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
                  <SelectTrigger className="w-[90px] h-8 text-xs">
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

          {bibleBook && bibleBook !== '__clear' && (
            <span className="text-xs text-muted-foreground self-center ml-1">
              {getPassageText() || 'Selecione capítulo'}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-3">
            <BookOpen className="w-12 h-12 opacity-30" />
            <div>
              <p className="font-medium text-sm">Faça perguntas sobre a Bíblia</p>
              <p className="text-xs mt-1">
                Selecione um livro, capítulo e versículo acima, depois faça sua pergunta.
                <br />O sistema utiliza <strong>100% dos seus materiais</strong> como base.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 w-full max-w-md">
              {[
                'O que significa "justificação pela fé" em Romanos 3?',
                'Qual o contexto histórico de Êxodo 12?',
                'Explique a parábola do semeador',
                'Quais as diferenças entre os evangelhos sinóticos?',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                  className="text-left text-xs p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted/60 text-foreground rounded-bl-sm border border-border'
              }`}
            >
              {msg.role === 'user' ? (
                <div>
                  {msg.passage && (
                    <span className="text-[10px] opacity-80 block mb-1">📖 {msg.passage}</span>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-muted/60 rounded-xl px-4 py-3 border border-border">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3 bg-muted/10">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={bibleBook && bibleBook !== '__clear' ? `Pergunte sobre ${getPassageText()}...` : 'Faça sua pergunta bíblica...'}
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 h-[44px] w-[44px]"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
