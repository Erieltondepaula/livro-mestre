import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Trash2, BookOpen, MessageCircle, Globe, X, ChevronDown, StickyNote, Copy, Paperclip, Mic, Image, FileText, Video, Save, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';
import { useAuth } from '@/contexts/AuthContext';
import type { ExegesisMaterial } from '@/hooks/useExegesis';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import {
  buildAttachmentFromFile,
  buildAttachmentPrompt,
  buildRelevantMaterialsContext,
  shouldSearchWeb,
  type ChatAttachment as Attachment,
} from './chatHelpers';

interface WebSource {
  title: string;
  url: string;
  source: string;
  snippet?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  passage?: string;
  timestamp: Date;
  attachments?: Attachment[];
  webSources?: WebSource[];
}

interface Props {
  getMaterialsContext?: () => string | undefined;
  materialsCount?: number;
  materials?: ExegesisMaterial[];
  onCreateNote?: (title: string, content: string) => void;
  onAddLink?: (title: string, url: string, materialType: 'youtube' | 'article', category: 'livro' | 'comentario' | 'dicionario' | 'devocional' | 'midia' | 'biblia', description?: string) => Promise<any>;
}

import type { MaterialCategory } from '@/hooks/useExegesis';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

export function ExegesisQAChat({ getMaterialsContext, materialsCount = 0, materials = [], onCreateNote, onAddLink }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassageSelector, setShowPassageSelector] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [conversationNoteId, setConversationNoteId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

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
    biblias: materials.filter(m => m.material_category === ('biblia' as any)).length,
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const serializeMessages = useCallback((items: Message[]) => {
    return items.map(message => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    }));
  }, []);

  const persistConversation = useCallback(async (items: Message[]) => {
    if (!user) return;

    const preview = items
      .slice(-8)
      .map(message => `${message.role === 'user' ? 'Pergunta' : 'Resposta'}: ${message.content}`)
      .join('\n\n')
      .slice(0, 6000);

    const payload = {
      title: 'Chat de Perguntas — Conversa Atual',
      content: preview || 'Conversa do Chat de Perguntas',
      content_json: {
        kind: 'chat_perguntas',
        messages: serializeMessages(items),
      } as any,
      note_type: 'reference',
      tags: ['chat_perguntas', 'exegese'],
    };

    if (conversationNoteId) {
      await supabase.from('notes').update(payload).eq('id', conversationNoteId).eq('user_id', user.id);
      return;
    }

    const { data, error } = await supabase.from('notes').insert({ user_id: user.id, ...payload }).select('id').single();
    if (!error && data?.id) setConversationNoteId(data.id);
  }, [conversationNoteId, serializeMessages, user]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setConversationNoteId(null);
      setHistoryLoaded(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, content_json')
        .eq('user_id', user.id)
        .contains('tags', ['chat_perguntas'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      const storedMessages = Array.isArray((data?.content_json as any)?.messages)
        ? ((data?.content_json as any).messages as any[]).map((message) => ({
            ...message,
            timestamp: new Date(message.timestamp),
          }))
        : [];

      setConversationNoteId(data?.id ?? null);
      setMessages(storedMessages);
      setHistoryLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const attachment = await buildAttachmentFromFile(file);
        setPendingAttachments(prev => [...prev, attachment]);
      } catch (error) {
        console.error('Erro ao preparar anexo:', error);
        toast({ title: 'Erro ao ler arquivo', description: file.name, variant: 'destructive' });
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && pendingAttachments.length === 0) || isLoading) return;

    const passage = getPassageText();
    const attachments = [...pendingAttachments];
    const { prompt: fullText } = buildAttachmentPrompt(text, attachments);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text || attachments.map(a => a.name).join(', '), passage: passage || undefined, timestamp: new Date(), attachments };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingAttachments([]);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const assistantId = crypto.randomUUID();
    let fullContent = '';

    try {
      const nextConversation = [...messages, userMsg];
      const history = nextConversation.slice(-12).map(m => {
        const prefix = m.role === 'user' ? 'Pergunta' : 'Resposta';
        const passageTag = m.passage ? `[${m.passage}] ` : '';
        return `${prefix}: ${passageTag}${m.content}`;
      }).join('\n\n');

      const materialsQuery = [passage, text, ...attachments.map(attachment => `${attachment.name} ${attachment.extractedText || ''}`)].join(' ').trim();
      const { context: materialsCtx, hasRelevantMatches } = await buildRelevantMaterialsContext(materials, materialsQuery || fullText);

      let webContext = '';
      let webSources: WebSource[] = [];
      const allowWebSearch = shouldSearchWeb({
        explicitText: text,
        webSearchEnabled,
        hasRelevantMaterialMatches: hasRelevantMatches,
        hasMaterials: materials.length > 0,
      });

      if (allowWebSearch && text) {
        setSearchingWeb(true);
        try {
          const searchQuery = (passage ? `${passage} ${text}` : text).trim();
          if (!searchQuery) throw new Error('Empty query');
          const { data: searchData } = await supabase.functions.invoke('web-search', {
            body: { query: searchQuery, sources: ['wikipedia_pt', 'wikipedia_en', 'arxiv', 'scielo'] },
          });
          if (searchData?.context) webContext = `## FONTES EXTERNAS COMPLEMENTARES\n${searchData.context}`;
          if (searchData?.results) {
            webSources = (searchData.results as any[]).map(r => ({
              title: r.title, url: r.url, source: r.source, snippet: r.snippet,
            }));
          }
        } catch (e) {
          console.warn('Web search failed:', e);
        } finally {
          setSearchingWeb(false);
        }
      }

      // Collect image base64 data for vision
      const imageData = attachments
        .filter(a => a.type === 'image' && a.base64)
        .map(a => a.base64 as string);

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          passage: passage || text || 'Anexos enviados',
          type: 'question',
          question: `${fullText}\n\n## Histórico da conversa:\n${history}${webContext ? `\n\n${webContext}` : ''}`,
          materials_context: materialsCtx || getMaterialsContext?.(),
          conversation_history: history,
          images: imageData.length > 0 ? imageData : undefined,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({ title: 'Limite atingido', description: 'Aguarde um momento.', variant: 'destructive' });
        } else if (resp.status === 402) {
          toast({ title: 'Créditos insuficientes', variant: 'destructive' });
        } else {
          throw new Error(e.error || `Erro ${resp.status}`);
        }
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('Sem resposta');

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), webSources: webSources.length > 0 ? webSources : undefined }]);

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

      let finalMessages: Message[] = [];
      setMessages(prev => {
        finalMessages = prev.map(message => message.id === assistantId ? { ...message, content: fullContent } : message);
        return finalMessages;
      });
      await persistConversation(finalMessages);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast({ title: 'Erro', description: e.message || 'Erro ao processar', variant: 'destructive' });
        setMessages(prev => prev.filter(m => m.id !== assistantId));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, bibleBook, chapter, verseStart, verseEnd, pendingAttachments, webSearchEnabled, materials, getMaterialsContext, persistConversation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = useCallback(async () => {
    if (isLoading) { abortRef.current?.abort(); setIsLoading(false); }
    // Just reset state — the old conversation stays saved in notes
    setMessages([]);
    setConversationNoteId(null);
  }, [isLoading]);

  const handleClear = useCallback(async () => {
    if (isLoading) { abortRef.current?.abort(); setIsLoading(false); }
    setMessages([]);
    if (conversationNoteId && user) {
      await supabase.from('notes').delete().eq('id', conversationNoteId).eq('user_id', user.id);
      setConversationNoteId(null);
    }
  }, [conversationNoteId, isLoading, user]);

  const passageText = getPassageText();

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[400px] bg-background rounded-lg border overflow-hidden">
      
      {/* Compact header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-xs leading-tight">Assistente Bíblico</h3>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {materials.length} materiais{webSearchEnabled ? ' + Web' : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1" title="Busca web">
            <Globe className={`w-3 h-3 ${webSearchEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            <Switch checked={webSearchEnabled} onCheckedChange={setWebSearchEnabled} className="scale-[0.65]" />
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassageSelector(!showPassageSelector)} title="Passagem">
            <BookOpen className="w-3.5 h-3.5" />
          </Button>
          {messages.length > 0 && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={handleNewConversation} title="Nova conversa">
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleClear} title="Limpar conversa">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Material badges */}
      <div className="px-3 py-1 flex flex-wrap gap-1 text-[9px] border-b bg-muted/10 shrink-0">
        {materialStats.biblias > 0 && <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">📖 {materialStats.biblias}</span>}
        {materialStats.comentarios > 0 && <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">📘 {materialStats.comentarios}</span>}
        {materialStats.dicionarios > 0 && <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">📙 {materialStats.dicionarios}</span>}
        {materialStats.livros > 0 && <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">📚 {materialStats.livros}</span>}
        {materialStats.devocionais > 0 && <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full">📗 {materialStats.devocionais}</span>}
        {materialStats.midia > 0 && <span className="bg-pink-500/10 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded-full">🎬 {materialStats.midia}</span>}
        {passageText && <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">📖 {passageText}</span>}
      </div>

      {/* Bible passage selector */}
      {showPassageSelector && (
        <div className="px-3 py-2 border-b bg-muted/5 shrink-0 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={bibleBook} onValueChange={(v) => { setBibleBook(v === '__clear' ? '' : v); setChapter(''); setVerseStart(''); setVerseEnd(''); }}>
              <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue placeholder="📖 Livro" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="__clear">— Sem filtro —</SelectItem>
                {bibleBookNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            {bibleBook && bibleBook !== '__clear' && (
              <Select value={chapter} onValueChange={(v) => { setChapter(v); setVerseStart(''); setVerseEnd(''); }}>
                <SelectTrigger className="w-[80px] h-7 text-xs"><SelectValue placeholder="Cap." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {chapters.map(ch => <SelectItem key={ch} value={String(ch)}>Cap. {ch}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {chapter && (
              <>
                <Select value={verseStart} onValueChange={setVerseStart}>
                  <SelectTrigger className="w-[70px] h-7 text-xs"><SelectValue placeholder="De v." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__clear">Todos</SelectItem>
                    {verses.map(v => <SelectItem key={v} value={String(v)}>v. {v}</SelectItem>)}
                  </SelectContent>
                </Select>
                {verseStart && verseStart !== '__clear' && (
                  <Select value={verseEnd} onValueChange={setVerseEnd}>
                    <SelectTrigger className="w-[70px] h-7 text-xs"><SelectValue placeholder="Até" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {verses.filter(v => v >= parseInt(verseStart)).map(v => <SelectItem key={v} value={String(v)}>v. {v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassageSelector(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
            <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-primary/40" />
            </div>
            <p className="font-semibold text-sm text-foreground mb-1">Assistente Bíblico</p>
             <p className="text-[11px] max-w-sm mb-4">
               Converse naturalmente sobre a Bíblia. O chat começa pelos anexos e prioriza seus Materiais de Referência.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {[
                'O que significa "justificação pela fé"?',
                'Me explica a parábola do semeador',
                'Quem foi o apóstolo Paulo?',
                'O que a Bíblia diz sobre ansiedade?',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="text-left text-[11px] p-2.5 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/20 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-3 py-3 space-y-1">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} onCreateNote={onCreateNote} onAddLink={onAddLink} />
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    {searchingWeb ? (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3 animate-spin" /> Buscando na web...
                      </span>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Pending attachments */}
      {pendingAttachments.length > 0 && (
        <div className="px-3 py-1.5 border-t bg-muted/10 flex flex-wrap gap-1.5 shrink-0">
          {pendingAttachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-[10px]">
              {a.type === 'image' && <Image className="w-3 h-3 text-blue-500" />}
              {a.type === 'audio' && <Mic className="w-3 h-3 text-green-500" />}
              {a.type === 'video' && <Video className="w-3 h-3 text-purple-500" />}
              {a.type === 'document' && <FileText className="w-3 h-3 text-amber-500" />}
              <span className="max-w-[100px] truncate">{a.name}</span>
              <button onClick={() => removeAttachment(i)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-background px-3 py-2 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-1.5 items-center">
             <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Enviar arquivo"
            >
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            </Button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={passageText ? `Pergunte sobre ${passageText}...` : 'Digite sua pergunta...'}
                className="w-full h-9 px-3 text-sm rounded-full border border-muted-foreground/20 bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
              size="icon"
              className="shrink-0 h-9 w-9 rounded-full"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground text-center mt-1">
            {!historyLoaded ? 'Carregando conversa...' : `${materials.length} materiais${webSearchEnabled ? ' + Web sob demanda' : ''} • Enter para enviar`}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---- Chat Bubble Component ---- */
function ChatBubble({ message, onCreateNote, onAddLink }: {
  message: Message;
  onCreateNote?: (title: string, content: string) => void;
  onAddLink?: (title: string, url: string, materialType: 'youtube' | 'article', category: 'livro' | 'comentario' | 'dicionario' | 'devocional' | 'midia' | 'biblia', description?: string) => Promise<any>;
}) {
  const isUser = message.role === 'user';
  const time = message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const [savedSources, setSavedSources] = useState<Set<string>>(new Set());

  const handleSaveSource = async (src: WebSource) => {
    if (!onAddLink) return;
    const result = await onAddLink(src.title, src.url, 'article', 'livro', `Fonte: ${src.source}. ${src.snippet?.substring(0, 200) || ''}`);
    if (result) {
      setSavedSources(prev => new Set(prev).add(src.url));
      toast({ title: '📚 Fonte salva!', description: `"${src.title}" adicionado aos Materiais.` });
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1.5 group`}>
      <div
        className={`relative max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted/40 text-foreground rounded-bl-sm border border-border/30'
        }`}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {message.attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-1 bg-black/10 rounded px-1.5 py-0.5 text-[10px]">
                {a.type === 'image' && <Image className="w-3 h-3" />}
                {a.type === 'audio' && <Mic className="w-3 h-3" />}
                {a.type === 'video' && <Video className="w-3 h-3" />}
                {a.type === 'document' && <FileText className="w-3 h-3" />}
                <span className="max-w-[80px] truncate">{a.name}</span>
              </div>
            ))}
          </div>
        )}

        {isUser ? (
          <div>
            {message.passage && (
              <span className="text-[9px] opacity-80 block mb-0.5 font-medium">📖 {message.passage}</span>
            )}
            <p className="whitespace-pre-wrap leading-relaxed text-[13px]">{message.content}</p>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 leading-relaxed text-[13px]">
            <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
          </div>
        )}

        {/* Web Sources - Save as Reference */}
        {!isUser && message.webSources && message.webSources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/20">
            <p className="text-[9px] font-semibold text-muted-foreground mb-1">🌐 Fontes externas utilizadas:</p>
            <div className="space-y-1">
              {message.webSources.map((src, i) => (
                <div key={i} className="flex items-center justify-between gap-1 text-[10px] bg-background/50 rounded px-2 py-1">
                  <div className="flex-1 min-w-0">
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block font-medium">
                      {src.title}
                    </a>
                    <span className="text-muted-foreground text-[8px]">{src.source}</span>
                  </div>
                  {onAddLink && (
                    <button
                      onClick={() => handleSaveSource(src)}
                      disabled={savedSources.has(src.url)}
                      className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                        savedSources.has(src.url)
                          ? 'bg-green-500/10 text-green-600 cursor-default'
                          : 'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                      }`}
                      title="Salvar como fonte"
                    >
                      <Save className="w-2.5 h-2.5" />
                      {savedSources.has(src.url) ? 'Salvo' : 'Salvar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-[8px] ${isUser ? 'text-primary-foreground/50' : 'text-muted-foreground/50'}`}>
            {time}
          </span>
          {!isUser && message.content && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { navigator.clipboard.writeText(message.content); toast({ title: "Copiado!" }); }}
                className="p-0.5 rounded hover:bg-background/50 text-muted-foreground/50 hover:text-foreground"
                title="Copiar"
              >
                <Copy className="w-3 h-3" />
              </button>
              {onCreateNote && (
                <button
                  onClick={() => {
                    const title = message.passage ? `Chat — ${message.passage}` : `Chat — ${new Date().toLocaleDateString('pt-BR')}`;
                    onCreateNote(title, message.content);
                    toast({ title: "📝 Nota criada!" });
                  }}
                  className="p-0.5 rounded hover:bg-background/50 text-muted-foreground/50 hover:text-foreground"
                  title="Criar nota"
                >
                  <StickyNote className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
