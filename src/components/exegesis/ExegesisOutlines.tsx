import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Send, Loader2, Copy, Trash2, Check, ChevronDown, ChevronUp, MessageSquare, Save, Download, Edit3, Eye, BookOpen, History, Sparkles, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';
import { ExegesisRichEditor } from './ExegesisRichEditor';
import { OutlineStructureEditor, getDefaultStructure } from './OutlineStructureEditor';
import { OutlineVersionHistory } from './OutlineVersionHistory';
import type { OutlineStructure } from './OutlineStructureEditor';
import type { OutlineVersion } from './OutlineVersionHistory';
import type { ExegesisOutline } from '@/hooks/useExegesis';

type OutlineType = 'outline_expository' | 'outline_textual' | 'outline_thematic';

interface Props {
  outlines: ExegesisOutline[];
  onFetch: () => void;
  onSave: (outline: { passage: string; outline_type: string; content: string }) => Promise<ExegesisOutline | null>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onUpdateContent: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  getMaterialsContext?: () => string | undefined;
  getRelevantAnalysesContext?: (passage: string) => string | undefined;
  fetchOutlineVersions?: (outlineId: string) => Promise<OutlineVersion[]>;
  materialsCount?: number;
  onSuggestImprovements?: (passage: string, content: string) => Promise<any | null>;
}

const OUTLINE_TYPES: { id: OutlineType; label: string; description: string }[] = [
  { id: 'outline_expository', label: '📖 Expositivo', description: 'Divisão natural do texto com aplicações progressivas' },
  { id: 'outline_textual', label: '📝 Textual', description: 'Baseado em palavras/expressões-chave do texto' },
  { id: 'outline_thematic', label: '🎯 Temático', description: 'Tema central com desenvolvimento doutrinário' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)$/gm, (match) => match.startsWith('<') ? match : `<p>${match}</p>`);
}

function exportAsTxt(content: string, passage: string) {
  const text = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `esboço-${passage.replace(/\s+/g, '-')}.txt`);
}

function exportAsMd(content: string, passage: string) {
  let md = content
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `esboço-${passage.replace(/\s+/g, '-')}.md`);
}

function exportAsDocx(content: string, passage: string) {
  const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Esboço - ${passage}</title>
    <style>body{font-family:Calibri,sans-serif;font-size:12pt;line-height:1.6;margin:2cm}
    h1{font-size:18pt;color:#1a1a1a}h2{font-size:15pt;color:#333}h3{font-size:13pt;color:#555}
    mark{padding:2px 4px;border-radius:3px}
    strong{font-weight:bold}em{font-style:italic}blockquote{border-left:3px solid #ccc;padding-left:12px;color:#555}</style>
    </head><body>${content}</body></html>`;
  downloadBlob(new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' }), `esboço-${passage.replace(/\s+/g, '-')}.doc`);
}

function exportAsPdf(content: string, passage: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { toast({ title: 'Erro', description: 'Permita pop-ups para exportar PDF', variant: 'destructive' }); return; }
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Esboço - ${passage}</title>
    <style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.8;margin:2cm;color:#1a1a1a}
    h1{font-size:20pt;text-align:center;margin-bottom:8pt}h2{font-size:15pt;margin-top:16pt;border-bottom:1px solid #ddd;padding-bottom:4pt}
    h3{font-size:13pt;margin-top:12pt}strong{font-weight:bold}em{font-style:italic}
    mark{padding:2px 4px;border-radius:3px}
    blockquote{border-left:3px solid #666;padding-left:12px;color:#555;margin:8pt 0}
    @media print{body{margin:1.5cm}}</style></head><body>${content}</body></html>`);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function ExegesisOutlines({ outlines, onFetch, onSave, onUpdateNotes, onUpdateContent, onDelete, getMaterialsContext, getRelevantAnalysesContext, fetchOutlineVersions, materialsCount = 0, onSuggestImprovements }: Props) {
  const [bibleBook, setBibleBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseStart, setVerseStart] = useState('');
  const [verseEnd, setVerseEnd] = useState('');
  const [customPassage, setCustomPassage] = useState('');
  const [selectedType, setSelectedType] = useState<OutlineType>('outline_expository');
  const [structure, setStructure] = useState<OutlineStructure>(getDefaultStructure());
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = useState<string | null>(null);
  const [versions, setVersions] = useState<OutlineVersion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, any>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { onFetch(); }, [onFetch]);

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
    setCurrentStream('');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          passage,
          type: selectedType,
          materials_context: getMaterialsContext?.(),
          analyses_context: getRelevantAnalysesContext?.(passage),
          structure_config: structure,
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
          try { const c = JSON.parse(j).choices?.[0]?.delta?.content; if (c) { full += c; setCurrentStream(full); } } catch { buf = line + "\n" + buf; break; }
        }
      }
      for (let raw of buf.split("\n")) {
        if (!raw?.startsWith("data: ")) continue;
        const j = raw.slice(6).trim(); if (j === "[DONE]") continue;
        try { const c = JSON.parse(j).choices?.[0]?.delta?.content; if (c) full += c; } catch {}
      }

      setCurrentStream('');
      const saved = await onSave({ passage, outline_type: selectedType, content: full });
      if (saved) toast({ title: "Esboço salvo!" });
    } catch (e: any) {
      if (e.name !== 'AbortError') toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setIsLoading(false); abortRef.current = null; }
  }, [bibleBook, chapter, verseStart, verseEnd, customPassage, selectedType, structure, onSave, getMaterialsContext, getRelevantAnalysesContext]);

  const handleSaveEdit = async (id: string) => {
    await onUpdateContent(id, editContent);
    setEditingId(null);
    toast({ title: "Esboço atualizado!" });
    // Auto-suggest improvements after saving
    if (onSuggestImprovements) {
      const outline = outlines.find(o => o.id === id);
      if (outline) {
        setSuggestionsLoading(id);
        const result = await onSuggestImprovements(outline.passage, editContent.replace(/<[^>]+>/g, '').substring(0, 3000));
        if (result) setSuggestions(prev => ({ ...prev, [id]: result }));
        setSuggestionsLoading(null);
      }
    }
  };

  const handleRequestSuggestions = async (outline: ExegesisOutline) => {
    if (!onSuggestImprovements) return;
    setSuggestionsLoading(outline.id);
    const plainContent = outline.content.replace(/<[^>]+>/g, '').substring(0, 3000);
    const result = await onSuggestImprovements(outline.passage, plainContent);
    if (result) setSuggestions(prev => ({ ...prev, [outline.id]: result }));
    setSuggestionsLoading(null);
  };

  const handleShowVersions = async (outlineId: string) => {
    if (fetchOutlineVersions) {
      const v = await fetchOutlineVersions(outlineId);
      setVersions(v);
      setVersionsOpen(outlineId);
    }
  };

  const handleRestoreVersion = async (content: string) => {
    if (!versionsOpen) return;
    const htmlContent = isHtml(content) ? content : markdownToHtml(content);
    setEditContent(htmlContent);
    setEditingId(versionsOpen);
    toast({ title: 'Versão restaurada — salve para confirmar.' });
  };

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-3 mb-1 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-4 mb-1.5 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-5 mb-2 text-foreground">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
      .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed text-foreground/90 mb-1">')
      .replace(/\n/g, '<br/>');
    return `<p class="text-sm leading-relaxed text-foreground/90 mb-1">${html}</p>`;
  };

  const typeLabels: Record<string, string> = { outline_expository: 'Expositivo', outline_textual: 'Textual', outline_thematic: 'Temático' };
  const isHtml = (content: string) => content.includes('<h1') || content.includes('<h2') || content.includes('<p>') || content.includes('<strong>');

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="card-library p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" /> Gerar Esboço de Sermão
        </h3>

        {materialsCount > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">📚 {materialsCount} materiais + análises anteriores serão consultados automaticamente</span>
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
          <input type="text" value={customPassage} onChange={(e) => setCustomPassage(e.target.value)} className="input-library w-full text-sm" placeholder="Ex: João 3:16" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {OUTLINE_TYPES.map(t => (
            <button key={t.id} onClick={() => setSelectedType(t.id)}
              className={`p-3 rounded-lg border text-left transition-all ${selectedType === t.id ? 'bg-primary/10 border-primary/30' : 'bg-card border-border hover:bg-muted/50'}`}>
              <span className="text-sm font-medium">{t.label}</span>
              <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
            </button>
          ))}
        </div>

        {/* Structure Editor */}
        <OutlineStructureEditor structure={structure} onChange={setStructure} />

        <Button onClick={handleGenerate} disabled={isLoading || !getPassageText()} className="btn-library-primary">
          {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : <><Send className="w-4 h-4 mr-2" /> Gerar Esboço</>}
        </Button>
      </div>

      {/* Streaming */}
      {isLoading && currentStream && (
        <div className="card-library p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-sm font-medium text-primary">Gerando esboço...</span></div>
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentStream) }} />
        </div>
      )}

      {/* Saved Outlines */}
      {outlines.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Esboços Salvos</h3>
          {outlines.map(o => {
            const isExp = expandedId === o.id;
            const isEditing = editingId === o.id;
            return (
              <div key={o.id} className="card-library overflow-hidden">
                <div className="p-4 flex items-start justify-between gap-2 cursor-pointer" onClick={() => setExpandedId(isExp ? null : o.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{typeLabels[o.outline_type] || o.outline_type}</span>
                      <span className="text-xs text-muted-foreground truncate">📖 {o.passage}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(o.content.replace(/<[^>]+>/g, '')); setCopiedId(o.id); setTimeout(() => setCopiedId(null), 2000); toast({ title: "Copiado!" }); }}>
                      {copiedId === o.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(o.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {isExp && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                        if (isEditing) { handleSaveEdit(o.id); } else {
                          const htmlContent = isHtml(o.content) ? o.content : markdownToHtml(o.content);
                          setEditContent(htmlContent);
                          setEditingId(o.id);
                        }
                      }}>
                        {isEditing ? <><Save className="w-3.5 h-3.5" /> Salvar</> : <><Edit3 className="w-3.5 h-3.5" /> Editar</>}
                      </Button>
                      {isEditing && (
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setEditingId(null)}>
                          <Eye className="w-3.5 h-3.5" /> Cancelar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => handleShowVersions(o.id)}>
                        <History className="w-3.5 h-3.5" /> Versões
                      </Button>
                      {onSuggestImprovements && (
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => handleRequestSuggestions(o)} disabled={suggestionsLoading === o.id}>
                          {suggestionsLoading === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          {suggestionsLoading === o.id ? 'Analisando...' : 'Sugestões IA'}
                        </Button>
                      )}
                      <div className="flex-1" />
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => exportAsPdf(isHtml(o.content) ? o.content : renderMarkdown(o.content), o.passage)}>
                        <Download className="w-3 h-3" /> PDF
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => exportAsDocx(isHtml(o.content) ? o.content : renderMarkdown(o.content), o.passage)}>
                        <Download className="w-3 h-3" /> Word
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => exportAsTxt(o.content, o.passage)}>
                        <Download className="w-3 h-3" /> TXT
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => exportAsMd(o.content, o.passage)}>
                        <Download className="w-3 h-3" /> MD
                      </Button>
                    </div>

                    {/* AI Suggestions Panel */}
                    {suggestions[o.id] && (
                      <div className="bg-muted/20 border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Sugestões de Melhoria</h4>
                          <div className="flex items-center gap-2">
                            {suggestions[o.id].overall_score && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${suggestions[o.id].overall_score >= 80 ? 'bg-green-500/10 text-green-600' : suggestions[o.id].overall_score >= 60 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'}`}>
                                Nota: {suggestions[o.id].overall_score}/100
                              </span>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSuggestions(prev => { const next = { ...prev }; delete next[o.id]; return next; })}>
                              ✕
                            </Button>
                          </div>
                        </div>
                        {suggestions[o.id].strengths?.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Pontos fortes</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {suggestions[o.id].strengths.map((s: string, i: number) => (
                                <span key={i} className="text-[10px] bg-green-500/10 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {suggestions[o.id].homiletics_notes && (
                          <div className="text-xs bg-primary/5 p-2.5 rounded border border-primary/10">
                            <p className="font-semibold text-primary mb-0.5">📖 Homilética</p>
                            <p className="text-foreground/80">{suggestions[o.id].homiletics_notes}</p>
                          </div>
                        )}
                        {suggestions[o.id].oratory_notes && (
                          <div className="text-xs bg-accent/30 p-2.5 rounded border border-accent/50">
                            <p className="font-semibold text-foreground mb-0.5">🎙️ Oratória</p>
                            <p className="text-foreground/80">{suggestions[o.id].oratory_notes}</p>
                          </div>
                        )}
                        <div className="space-y-2">
                          {suggestions[o.id].suggestions?.map((s: any, i: number) => (
                            <div key={i} className="flex gap-2.5 items-start text-xs border-b border-border/50 pb-2 last:border-0">
                              <div className="shrink-0 mt-0.5">
                                {s.severity === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> :
                                 s.severity === 'improvement' ? <Sparkles className="w-3.5 h-3.5 text-primary" /> :
                                 <Info className="w-3.5 h-3.5 text-blue-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground">{s.title} <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-1">{s.area}</span></p>
                                <p className="text-muted-foreground mt-0.5">{s.description}</p>
                                {s.example && <p className="text-primary/80 mt-1 italic">💡 {s.example}</p>}
                              </div>
                              {s.example && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0 text-[10px] h-7 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                  onClick={() => {
                                    const htmlContent = isHtml(o.content) ? o.content : markdownToHtml(o.content);
                                    setEditContent(htmlContent + `\n<p><strong>📝 [Sugestão aplicada — ${s.title}]:</strong> ${s.example}</p>`);
                                    setEditingId(o.id);
                                    toast({ title: 'Sugestão adicionada ao esboço — revise e salve.' });
                                  }}
                                >
                                  <Check className="w-3 h-3" /> Aplicar
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isEditing ? (
                      <ExegesisRichEditor content={editContent} onChange={setEditContent} placeholder="Edite o esboço..." minHeight="400px" />
                    ) : (
                      isHtml(o.content) ? (
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: o.content }} />
                      ) : (
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(o.content) }} />
                      )
                    )}

                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Anotações</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                          if (editingNotesId === o.id) { onUpdateNotes(o.id, notesValue); setEditingNotesId(null); toast({ title: "Salvo!" }); } else { setEditingNotesId(o.id); setNotesValue(o.notes || ''); }
                        }}>{editingNotesId === o.id ? 'Salvar' : 'Editar'}</Button>
                      </div>
                      {editingNotesId === o.id ? (
                        <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Anotações..." className="min-h-[80px] text-sm" />
                      ) : o.notes ? (
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/30 p-3 rounded">{o.notes}</p>
                      ) : <p className="text-xs text-muted-foreground italic">Sem anotações</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Version History Dialog */}
      <OutlineVersionHistory
        versions={versions}
        open={!!versionsOpen}
        onClose={() => setVersionsOpen(null)}
        onRestore={handleRestoreVersion}
      />
    </div>
  );
}
