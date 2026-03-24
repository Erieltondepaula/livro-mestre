import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Trash2, BookOpen, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  getMaterialsContext?: () => string | undefined;
  materialsCount?: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

export function ExegesisQAChat({ getMaterialsContext, materialsCount = 0 }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const assistantId = crypto.randomUUID();
    let fullContent = '';

    try {
      // Build conversation history for context
      const history = [...messages, userMsg].slice(-10).map(m => `${m.role === 'user' ? 'Pergunta' : 'Resposta'}: ${m.content}`).join('\n\n');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          passage: text,
          type: 'question',
          question: text,
          materials_context: getMaterialsContext?.(),
          conversation_history: history,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({ title: 'Limite atingido', description: 'Aguarde um momento antes de enviar outra pergunta.', variant: 'destructive' });
        } else if (resp.status === 402) {
          toast({ title: 'Créditos insuficientes', description: 'Adicione créditos para continuar.', variant: 'destructive' });
        } else {
          throw new Error(e.error || `Erro ${resp.status}`);
        }
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('Sem resposta');

      // Add empty assistant message
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

      // Flush remaining
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
        // Remove empty assistant message on error
        setMessages(prev => prev.filter(m => m.id !== assistantId));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, getMaterialsContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (isLoading) {
      abortRef.current?.abort();
      setIsLoading(false);
    }
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[600px] md:h-[700px] border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Perguntas & Respostas Bíblicas</h3>
          {materialsCount > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {materialsCount} materiais integrados
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-3">
            <BookOpen className="w-12 h-12 opacity-30" />
            <div>
              <p className="font-medium text-sm">Faça perguntas sobre a Bíblia</p>
              <p className="text-xs mt-1">
                O sistema consulta materiais da sua biblioteca para respostas mais precisas.
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
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
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
            placeholder="Faça sua pergunta bíblica..."
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
