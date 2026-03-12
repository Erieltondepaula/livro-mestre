import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Send, Loader2, Copy, Trash2, Check, ChevronDown, ChevronUp, MessageSquare, Save, Download, Edit3, Eye, BookOpen, History, Sparkles, AlertTriangle, Info, CheckCircle2, Monitor, Presentation, Search, Tag, Filter, CopyPlus, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { getBibleBookNames, getChaptersArray, getVersesArray } from '@/data/bibleData';
import { ExegesisRichEditor, type ExegesisRichEditorRef } from './ExegesisRichEditor';
import { SermonTitleGenerator } from './SermonTitleGenerator';
import { OutlineStructureEditor, getDefaultStructure } from './OutlineStructureEditor';
import { OutlineVersionHistory } from './OutlineVersionHistory';
import { PreacherMode } from './PreacherMode';
import { MaterialsChecklist } from './MaterialsChecklist';
import { PromptEditorDialog } from './PromptEditorDialog';
import { OutlineCopilot } from './OutlineCopilot';
import type { OutlineStructure } from './OutlineStructureEditor';
import type { OutlineVersion } from './OutlineVersionHistory';
import type { ExegesisOutline, ExegesisMaterial } from '@/hooks/useExegesis';

type OutlineType = 'outline_expository' | 'outline_textual' | 'outline_thematic';

const OUTLINE_TAGS = [
  { id: 'evangelistico', label: '🔥 Evangelístico', color: 'bg-red-500/10 text-red-700 border-red-500/20' },
  { id: 'devocional', label: '🙏 Devocional', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  { id: 'doutrinario', label: '📚 Doutrinário', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  { id: 'ocasional', label: '🎉 Ocasional', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  { id: 'pastoral', label: '🤝 Pastoral', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  { id: 'missionario', label: '🌍 Missionário', color: 'bg-teal-500/10 text-teal-700 border-teal-500/20' },
];

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
  materials?: ExegesisMaterial[];
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
    .replace(/「(.*?)」(\(.*?\))/g, '<mark style="background-color: #FEF3C7">"$1"</mark> <strong>$2</strong>')
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
    strong{font-weight:bold}em{font-style:italic}blockquote{border-left:3px solid #ccc;padding-left:12px;color:#555}
    .citation-highlight{background-color:#FEF3C7;border-left:3px solid #D97706;padding:2px 6px;font-style:italic}
    .citation-source{color:#92400E;font-weight:600;font-size:0.9em}
    span[style*="background-color:#FEF3C7"]{background-color:#FEF3C7 !important;border-left:3px solid #D97706;padding:2px 6px;font-style:italic}
    span[style*="color:#92400E"]{color:#92400E !important;font-weight:bold;font-size:0.9em}</style>
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
    @media print{body{margin:1.5cm}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}}</style></head><body>${content}</body></html>`);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

async function exportAsPptx(content: string, passage: string) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Exegese Bíblica';
  pptx.title = passage;
  const plainText = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const lines = plainText.split('\n').filter(l => l.trim());
  let sermonTitle = passage;
  let sermonTheme = '';
  let baseText = '';
  const points: { title: string; body: string[]; references: string[] }[] = [];
  const applications: string[] = [];
  let currentPoint: { title: string; body: string[]; references: string[] } | null = null;
  let inApplications = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(TÍTULO|Título)\s*[:：]/i.test(trimmed)) { sermonTitle = trimmed.replace(/^(TÍTULO|Título)\s*[:：]\s*/i, '').trim(); }
    else if (/^(TEMA|Tema)\s*[:：]/i.test(trimmed)) { sermonTheme = trimmed.replace(/^(TEMA|Tema)\s*[:：]\s*/i, '').trim(); }
    else if (/^(TEXTO BASE|Texto Base)\s*[:：]/i.test(trimmed)) { baseText = trimmed.replace(/^(TEXTO BASE|Texto Base)\s*[:：]\s*/i, '').trim(); }
    else if (/^(PONTO|PONT)\s*\d+|^[IVX]+\./i.test(trimmed) || /^#+\s*\d+[.)]?\s/i.test(trimmed)) {
      if (currentPoint) points.push(currentPoint);
      const title = trimmed.replace(/^#+\s*/, '').replace(/^\*+/, '').replace(/\*+$/, '').trim();
      currentPoint = { title, body: [], references: [] };
      inApplications = false;
    } else if (/^(APLICAÇ|APELO|CONCLUS)/i.test(trimmed)) {
      if (currentPoint) { points.push(currentPoint); currentPoint = null; }
      inApplications = true;
    } else if (trimmed.startsWith('👉') || /^\[.*\d+:\d+/.test(trimmed)) {
      if (currentPoint) currentPoint.references.push(trimmed);
      else if (inApplications) applications.push(trimmed);
    } else {
      if (inApplications) applications.push(trimmed);
      else if (currentPoint) currentPoint.body.push(trimmed);
    }
  }
  if (currentPoint) points.push(currentPoint);
  const PRIMARY = '1a1a2e'; const ACCENT = '8B5E3C'; const LIGHT_BG = 'FDF8F0'; const TEXT_DARK = '1a1a1a'; const TEXT_MED = '555555';
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: PRIMARY };
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: ACCENT } });
  titleSlide.addText(sermonTitle, { x: 0.8, y: 1.2, w: 11.5, h: 2, fontSize: 40, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Calibri' });
  if (sermonTheme) titleSlide.addText(sermonTheme, { x: 0.8, y: 3.3, w: 11.5, h: 0.8, fontSize: 20, color: 'CCCCCC', align: 'center', fontFace: 'Calibri', italic: true });
  if (baseText) titleSlide.addText(`📖 ${baseText}`, { x: 0.8, y: 4.3, w: 11.5, h: 0.6, fontSize: 16, color: ACCENT, align: 'center', fontFace: 'Calibri' });
  titleSlide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 5.2, w: 4, h: 0.04, fill: { color: ACCENT } });
  points.forEach((point, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: LIGHT_BG };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1, fill: { color: PRIMARY } });
    slide.addText(`PONTO ${idx + 1}`, { x: 0.5, y: 0.05, w: 2, h: 0.35, fontSize: 11, color: ACCENT, fontFace: 'Calibri', bold: true });
    slide.addText(point.title.replace(/^(PONTO\s*\d+\s*[-:.]?\s*)/i, ''), { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
    const bodyText = point.body.slice(0, 8).map(l => ({ text: `• ${l.replace(/^[\-•*]\s*/, '').trim()}\n`, options: { fontSize: 13, color: TEXT_DARK, fontFace: 'Calibri', breakLine: true, lineSpacingMultiple: 1.3 } as any }));
    if (bodyText.length > 0) slide.addText(bodyText, { x: 0.5, y: 1.3, w: 8.5, h: 3.8, valign: 'top' });
    if (point.references.length > 0) {
      slide.addShape(pptx.ShapeType.rect, { x: 9.3, y: 1.3, w: 3.5, h: 3.8, fill: { color: 'F5E6D0' }, rectRadius: 0.1 });
      slide.addText('📖 Referências', { x: 9.5, y: 1.4, w: 3.1, h: 0.4, fontSize: 11, bold: true, color: ACCENT, fontFace: 'Calibri' });
      const refTexts = point.references.slice(0, 5).map(r => ({ text: `${r.replace('👉 ', '').substring(0, 80)}\n`, options: { fontSize: 9, color: TEXT_MED, fontFace: 'Calibri', breakLine: true, lineSpacingMultiple: 1.2 } as any }));
      slide.addText(refTexts, { x: 9.5, y: 1.85, w: 3.1, h: 3, valign: 'top' });
    }
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.1, w: '100%', h: 0.4, fill: { color: PRIMARY } });
    slide.addText(passage, { x: 0.5, y: 7.1, w: 12, h: 0.4, fontSize: 10, color: '999999', fontFace: 'Calibri', align: 'right' });
  });
  if (applications.length > 0) {
    const appSlide = pptx.addSlide();
    appSlide.background = { color: PRIMARY };
    appSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: ACCENT } });
    appSlide.addText('✅ APLICAÇÕES PRÁTICAS', { x: 0.5, y: 0.5, w: 12, h: 0.8, fontSize: 28, bold: true, color: 'FFFFFF', fontFace: 'Calibri', align: 'center' });
    const appTexts = applications.slice(0, 8).map(a => ({ text: `• ${a.replace(/^[\-•*]\s*/, '').trim()}\n\n`, options: { fontSize: 16, color: 'DDDDDD', fontFace: 'Calibri', breakLine: true, lineSpacingMultiple: 1.4 } as any }));
    appSlide.addText(appTexts, { x: 1, y: 1.8, w: 11, h: 4.5, valign: 'top' });
    appSlide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 6.8, w: 4, h: 0.04, fill: { color: ACCENT } });
  }
  const closeSlide = pptx.addSlide();
  closeSlide.background = { color: PRIMARY };
  closeSlide.addText('"Prega a palavra, insta a tempo e fora de tempo"', { x: 1, y: 2, w: 11, h: 1.5, fontSize: 24, italic: true, color: 'CCCCCC', align: 'center', fontFace: 'Georgia' });
  closeSlide.addText('2 Timóteo 4:2 (ACF)', { x: 1, y: 3.5, w: 11, h: 0.6, fontSize: 14, color: ACCENT, align: 'center', fontFace: 'Calibri' });
  const blob = await pptx.write({ outputType: 'blob' }) as Blob;
  downloadBlob(blob, `esboço-${passage.replace(/\s+/g, '-')}.pptx`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function ExegesisOutlines({ outlines, onFetch, onSave, onUpdateNotes, onUpdateContent, onDelete, getMaterialsContext, getRelevantAnalysesContext, fetchOutlineVersions, materialsCount = 0, materials = [], onSuggestImprovements }: Props) {
  const { hasModuleAccess } = useAuth();
  const [bibleBook, setBibleBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseStart, setVerseStart] = useState('');
  const [verseEnd, setVerseEnd] = useState('');
  const [customPassage, setCustomPassage] = useState('');
  const [selectedType, setSelectedType] = useState<OutlineType>('outline_expository');
  
  const [structure, setStructure] = useState<OutlineStructure>(getDefaultStructure());
  const [structureLoaded, setStructureLoaded] = useState(false);

  // Library filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Load structure from database on mount
  useEffect(() => {
    const loadStructure = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('user_outline_structures')
          .select('structure')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.structure) {
          setStructure(data.structure as unknown as OutlineStructure);
        }
      } catch {} finally {
        setStructureLoaded(true);
      }
    };
    loadStructure();
  }, []);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStructureChange = (s: OutlineStructure) => {
    setStructure(s);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
          .from('user_outline_structures')
          .upsert({ user_id: user.id, structure: s as any }, { onConflict: 'user_id' });
      } catch {}
    }, 500);
  };
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
  const [preacherMode, setPreacherMode] = useState<{ content: string; passage: string } | null>(null);
  const [titleGenOpen, setTitleGenOpen] = useState(false);
  const [outlineMode, setOutlineMode] = useState<'ai' | 'manual'>(hasModuleAccess('exegese.esbocos.ia') ? 'ai' : 'manual');
  const [manualContent, setManualContent] = useState('');
  const [currentElement, setCurrentElement] = useState('introducao');
  const [selectedText, setSelectedText] = useState('');
  const [previousElements, setPreviousElements] = useState<{
    title?: string;
    theme?: string;
    baseText?: string;
    introduction?: string;
    points?: Array<{ title?: string; development?: string; illustration?: string; phrase?: string; application?: string }>;
    conclusion?: string;
  }>({});
  const [showCopilot, setShowCopilot] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedOutlineId, setLastSavedOutlineId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const editorRef = useRef<ExegesisRichEditorRef | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>('');

  useEffect(() => { onFetch(); }, [onFetch]);

  // ===== AUTO-SAVE =====
  // Helper to extract passage from content (defined early for auto-save)
  const getPassageFromContentEarly = (contentText: string): string => {
    const plain = contentText.replace(/<[^>]+>/g, '').trim();
    const textoBaseMatch = plain.match(/TEXTO\s*BASE\s*[:：]?\s*(.+?)(?:\n|$)/i);
    if (textoBaseMatch?.[1]?.trim()) return textoBaseMatch[1].trim().substring(0, 100);
    const tituloMatch = plain.match(/T[ÍI]TULO\s*[:：]?\s*(.+?)(?:\n|$)/i);
    if (tituloMatch?.[1]?.trim()) return tituloMatch[1].trim().substring(0, 100);
    const temaMatch = plain.match(/TEMA\s*[:：]?\s*(.+?)(?:\n|$)/i);
    if (temaMatch?.[1]?.trim()) return temaMatch[1].trim().substring(0, 100);
    const firstLine = plain.split('\n').find(l => l.trim().length > 3);
    return firstLine?.trim().substring(0, 100) || 'Esboço sem título';
  };

  useEffect(() => {
    if (!manualContent.trim() || outlineMode !== 'manual') return;
    
    // Don't auto-save if content hasn't changed
    if (manualContent === lastSavedContentRef.current) return;
    
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    
    autoSaveRef.current = setTimeout(async () => {
      if (!manualContent.trim()) return;
      
      // Auto-extract passage from content if no bible passage selected
      const selectedPassage = getPassageText();
      const passage = selectedPassage || getPassageFromContentEarly(manualContent);
      
      setAutoSaveStatus('saving');
      try {
        if (lastSavedOutlineId) {
          await onUpdateContent(lastSavedOutlineId, manualContent);
        } else {
          const result = await onSave({
            passage,
            outline_type: selectedType,
            content: manualContent
          });
          if (result) {
            setLastSavedOutlineId(result.id);
          }
        }
        lastSavedContentRef.current = manualContent;
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch {
        setAutoSaveStatus('idle');
      }
    }, 5000);

    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [manualContent, outlineMode]);

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

  // Filter outlines
  const filteredOutlines = useMemo(() => {
    return outlines.filter(o => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchPassage = o.passage.toLowerCase().includes(q);
        const matchContent = o.content.replace(/<[^>]+>/g, '').toLowerCase().includes(q);
        if (!matchPassage && !matchContent) return false;
      }
      if (filterType && o.outline_type !== filterType) return false;
      if (filterTags.length > 0) {
        const outlineTags = (o as any).tags || [];
        if (!filterTags.some(t => outlineTags.includes(t))) return false;
      }
      return true;
    });
  }, [outlines, searchQuery, filterType, filterTags]);

  const handleToggleFilterTag = (tagId: string) => {
    setFilterTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
  };

  const handleUpdateTags = async (outlineId: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('exegesis_outlines')
        .update({ tags } as any)
        .eq('id', outlineId);
      if (error) throw error;
      onFetch();
      toast({ title: 'Tags atualizadas!' });
    } catch {
      toast({ title: 'Erro ao salvar tags', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (outline: ExegesisOutline) => {
    const newPassage = `${outline.passage} (cópia)`;
    const saved = await onSave({ passage: newPassage, outline_type: outline.outline_type, content: outline.content });
    if (saved) {
      const tags = (outline as any).tags || [];
      if (tags.length > 0) {
        await supabase.from('exegesis_outlines').update({ tags } as any).eq('id', saved.id);
      }
      toast({ title: 'Esboço duplicado!', description: `"${newPassage}" criado com sucesso.` });
    }
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

  // Extract passage from content when no bible passage is selected
  const getPassageFromContent = useCallback((contentText: string): string => {
    const plain = contentText.replace(/<[^>]+>/g, '').trim();
    // Try to extract TEXTO BASE
    const textoBaseMatch = plain.match(/TEXTO\s*BASE\s*[:：]?\s*(.+?)(?:\n|$)/i);
    if (textoBaseMatch?.[1]?.trim()) return textoBaseMatch[1].trim().substring(0, 100);
    // Try to extract TÍTULO
    const tituloMatch = plain.match(/T[ÍI]TULO\s*[:：]?\s*(.+?)(?:\n|$)/i);
    if (tituloMatch?.[1]?.trim()) return tituloMatch[1].trim().substring(0, 100);
    // Try to extract TEMA
    const temaMatch = plain.match(/TEMA\s*[:：]?\s*(.+?)(?:\n|$)/i);
    if (temaMatch?.[1]?.trim()) return temaMatch[1].trim().substring(0, 100);
    // Fallback: first non-empty line
    const firstLine = plain.split('\n').find(l => l.trim().length > 3);
    return firstLine?.trim().substring(0, 100) || 'Esboço sem título';
  }, []);

  const getEffectivePassage = useCallback((contentText: string): string => {
    const selectedPassage = getPassageText();
    if (selectedPassage) return selectedPassage;
    return getPassageFromContent(contentText);
  }, [getPassageText, getPassageFromContent]);

  const handleSaveManual = async () => {
    if (!manualContent.trim()) {
      toast({ title: "Escreva algo no esboço antes de salvar", variant: "destructive" });
      return;
    }
    
    const passage = getEffectivePassage(manualContent);
    
    try {
      if (lastSavedOutlineId) {
        await onUpdateContent(lastSavedOutlineId, manualContent);
        toast({ title: "Esboço atualizado com sucesso!" });
      } else {
        const result = await onSave({
          passage,
          outline_type: selectedType,
          content: manualContent
        });
        
        if (result) {
          setLastSavedOutlineId(result.id);
          toast({ title: "Esboço manual salvo com sucesso!" });
          onFetch();
        }
      }
      lastSavedContentRef.current = manualContent;
    } catch (error) {
      toast({ 
        title: "Erro ao salvar", 
        description: "Não foi possível salvar o esboço manual",
        variant: "destructive" 
      });
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
      .replace(/^### (.*$)/gm, '<h3 class="text-sm font-bold mt-2 mb-0.5 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-base font-bold mt-3 mb-0.5 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mt-3 mb-1 text-foreground">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/「(.*?)」(\(.*?\))/g, '<mark style="background-color:#FEF3C7;border-left:3px solid #D97706;padding:2px 6px;border-radius:3px;font-style:italic;display:inline;">"$1"</mark> <strong style="color:#92400E;font-size:0.85em;">$2</strong>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-xs">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-xs">$2</li>')
      .replace(/\n\n/g, '</p><p class="text-xs leading-snug text-foreground/90 mb-0.5">')
      .replace(/\n/g, '<br/>');
    return `<p class="text-xs leading-snug text-foreground/90 mb-0.5">${html}</p>`;
  };

  const typeLabels: Record<string, string> = { outline_expository: 'Expositivo', outline_textual: 'Textual', outline_thematic: 'Temático', outline_descriptive: 'Descritivo', outline_normative: 'Normativo', outline_theological: 'Teológico' };
  const isHtml = (content: string) => content.includes('<h1') || content.includes('<h2') || content.includes('<p>') || content.includes('<strong>');

  // Section elements with color coding
  const SECTION_ELEMENTS = [
    { id: 'titulo', label: 'Título', color: '🔵', group: 'header' },
    { id: 'tema', label: 'Tema', color: '🔵', group: 'header' },
    { id: 'texto_base', label: 'Texto Base', color: '🔵', group: 'header' },
    { id: 'introducao', label: 'Introdução', color: '🔵', group: 'body' },
    { id: 'transicao', label: 'Transição', color: '🔵', group: 'body' },
    { id: 'ponto', label: 'Ponto', color: '🔵', group: 'point' },
    { id: 'explicacao', label: 'Explicação', color: '🟢', group: 'point' },
    { id: 'ilustracao', label: 'Ilustração', color: '🟠', group: 'point' },
    { id: 'verdade', label: 'Verdade', color: '🔴', group: 'point' },
    { id: 'aplicacao', label: 'Aplicação', color: '🔴', group: 'point' },
    { id: 'frase_efeito', label: 'Frase de Efeito', color: '🔴', group: 'point' },
    { id: 'conclusao', label: 'Conclusão', color: '🔵', group: 'closing' },
    { id: 'apelo', label: 'Apelo', color: '🔴', group: 'closing' },
    { id: 'oracao_final', label: 'Oração Final', color: '🔵', group: 'closing' },
  ];

  const SERMON_TEMPLATE = `<h1 style="text-align: center">🔵 TÍTULO</h1>
<p><strong>🔵 TEMA:</strong> </p>
<p><strong>🔵 TEXTO BASE:</strong> </p>
<hr>
<h2>🔵 INTRODUÇÃO</h2>
<p><em>Contextualização, conexão com a vida real, apresentação do problema humano e da esperança bíblica. (até 5 minutos)</em></p>
<p></p>
<p><strong>🔵 TRANSIÇÃO</strong> <em>(Da introdução para o 1º ponto)</em></p>
<hr>
<h2>🔵 1º PONTO</h2>
<h3>🟢 Explicação</h3>
<p><em>Exposição fiel do texto bíblico, contexto, sentido original, o que o texto diz.</em></p>
<p></p>
<h3>🟠 Ilustração</h3>
<p><em>Exemplo bíblico, histórico ou do cotidiano que ilumina a explicação.</em></p>
<p></p>
<h3>🔴 Verdade</h3>
<p><em>Princípio espiritual central revelado pelo texto.</em></p>
<p></p>
<h3>🔴 Aplicação</h3>
<p><em>Como essa verdade confronta, consola e transforma a vida do ouvinte hoje.</em></p>
<p></p>
<p><strong>🔵 TRANSIÇÃO</strong> <em>(Do 1º para o 2º ponto)</em></p>
<hr>
<h2>🔵 2º PONTO</h2>
<h3>🟢 Explicação</h3>
<p><em>Desenvolvimento progressivo do texto, mantendo coerência com o tema.</em></p>
<p></p>
<h3>🟠 Ilustração</h3>
<p><em>Imagem clara que ajude o povo a visualizar a verdade bíblica.</em></p>
<p></p>
<h3>🔴 Verdade</h3>
<p><em>O que Deus está afirmando sobre Ele mesmo e sobre nós.</em></p>
<p></p>
<h3>🔴 Aplicação</h3>
<p><em>Chamado prático à fé, obediência e dependência do Senhor.</em></p>
<p></p>
<p><strong>🔵 TRANSIÇÃO</strong> <em>(Do 2º para o 3º ponto)</em></p>
<hr>
<h2>🔵 3º PONTO</h2>
<h3>🟢 Explicação</h3>
<p><em>Aprofundamento da mensagem, ligação com o todo das Escrituras.</em></p>
<p></p>
<h3>🟠 Ilustração</h3>
<p><em>História que prepare o coração para o clímax do sermão.</em></p>
<p></p>
<h3>🔴 Verdade</h3>
<p><em>Declaração clara da vontade de Deus revelada no texto.</em></p>
<p></p>
<h3>🔴 Aplicação</h3>
<p><em>Exortação pastoral, com graça e verdade.</em></p>
<p></p>
<p><strong>🔵 TRANSIÇÃO</strong> <em>(Do 3º para o 4º ponto)</em></p>
<hr>
<h2>🔵 4º PONTO — Foco em Cristo</h2>
<h3>🟢 Explicação</h3>
<p><em>Como o texto aponta para Cristo, Sua obra, Seu caráter e Sua missão.</em></p>
<p></p>
<h3>🟠 Ilustração</h3>
<p><em>Cena dos Evangelhos, da cruz, da graça, do cuidado de Cristo.</em></p>
<p></p>
<h3>🔴 Verdade</h3>
<p><em>Cristo é a resposta final, suficiente e eterna.</em></p>
<p></p>
<h3>🔴 Aplicação</h3>
<p><em>Convite à fé, arrependimento, descanso e entrega total a Jesus.</em></p>
<p></p>
<blockquote><p>📖 "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei." — Mateus 11:28, ACF</p></blockquote>
<p><strong>🔵 TRANSIÇÃO</strong> <em>(Do 4º ponto para a conclusão)</em></p>
<hr>
<h2>🔵 CONCLUSÃO</h2>
<p><em>Síntese do sermão, retomando o tema e reforçando a esperança em Cristo.</em></p>
<p></p>
<h2>🔴 APELO</h2>
<p><em>Chamado claro, bíblico e amoroso à decisão espiritual.</em></p>
<p></p>
<h2>🔵 ORAÇÃO FINAL</h2>
<p><em>Entrega, gratidão e dependência total do Senhor.</em></p>
<p></p>`;

  const handleInsertTemplate = () => {
    if (manualContent.replace(/<[^>]+>/g, '').trim().length > 20) {
      const confirm = window.confirm('O editor já possui conteúdo. Deseja substituir pelo template completo?');
      if (!confirm) return;
    }
    setManualContent(SERMON_TEMPLATE);
    if (editorRef.current) {
      editorRef.current.insertContent(''); // force re-render
    }
    toast({ title: '📋 Template inserido!', description: 'Estrutura completa do sermão adicionada ao editor.' });
  };

  return (
    <div className="space-y-6">
      {/* Title Generator Card — starts collapsed */}
      <div className="card-library overflow-hidden">
        <button
          onClick={() => setTitleGenOpen(!titleGenOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
        >
          <span className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Gerador de Títulos & Temas Criativos
          </span>
          {titleGenOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {titleGenOpen && <SermonTitleGenerator getMaterialsContext={getMaterialsContext} />}
      </div>

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

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Tipo de Sermão</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {OUTLINE_TYPES.map(t => (
              <button key={t.id} onClick={() => setSelectedType(t.id)}
                className={`p-3 rounded-lg border text-left transition-all ${selectedType === t.id ? 'bg-primary/10 border-primary/30' : 'bg-card border-border hover:bg-muted/50'}`}>
                <span className="text-sm font-medium">{t.label}</span>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Toggle */}
        {(hasModuleAccess('exegese.esbocos.ia') || hasModuleAccess('exegese.esbocos.texto_livre')) && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Modo de Criação</p>
            <div className="flex gap-2">
              {hasModuleAccess('exegese.esbocos.ia') && (
                <button 
                  onClick={() => setOutlineMode('ai')}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${outlineMode === 'ai' ? 'bg-primary/10 border-primary/30' : 'bg-card border-border hover:bg-muted/50'}`}>
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Gerado por IA
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Esboço criado automaticamente com base na passagem</p>
                </button>
              )}
              {hasModuleAccess('exegese.esbocos.texto_livre') && (
                <button 
                  onClick={() => setOutlineMode('manual')}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${outlineMode === 'manual' ? 'bg-primary/10 border-primary/30' : 'bg-card border-border hover:bg-muted/50'}`}>
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Texto Livre
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Escrita livre com formatação avançada</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Manual Mode Editor */}
        {outlineMode === 'manual' ? (
          <div className="space-y-3">
            {/* Template Insert + Section Selector */}
            <div className="space-y-3">
              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-dashed border-primary/40 text-primary hover:bg-primary/10"
                  onClick={handleInsertTemplate}
                >
                  <FileText className="w-3.5 h-3.5" />
                  📋 Inserir Template Completo
                </Button>
                <div className="flex-1" />
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700">🔵 Estrutura</span>
                  <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-700">🟢 Explicação</span>
                  <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-700">🟠 Ilustração</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-700">🔴 Verdade/Aplicação</span>
                </div>
              </div>

              {/* Grouped Section Selector */}
              <div className="flex items-center gap-1 flex-wrap">
                <p className="text-xs font-medium text-muted-foreground mr-1">Seção:</p>
                {(() => {
                  const groups = [
                    { key: 'header', label: 'Cabeçalho', sep: '|' },
                    { key: 'body', label: 'Corpo', sep: '|' },
                    { key: 'point', label: 'Pontos', sep: '|' },
                    { key: 'closing', label: 'Encerramento', sep: '' },
                  ];
                  return groups.map((group, gi) => (
                    <div key={group.key} className="flex items-center gap-0.5">
                      {SECTION_ELEMENTS.filter(el => el.group === group.key).map(el => (
                        <button
                          key={el.id}
                          onClick={() => setCurrentElement(el.id)}
                          className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                            currentElement === el.id 
                              ? 'bg-primary/15 text-primary border-primary/40 font-bold shadow-sm' 
                              : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60 hover:border-border'
                          }`}
                        >
                          {el.color} {el.label}
                        </button>
                      ))}
                      {gi < groups.length - 1 && <span className="text-muted-foreground/30 mx-0.5">│</span>}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Editor + Copilot Layout */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Editor */}
              <div className={`${showCopilot && hasModuleAccess('exegese.esbocos.texto_livre.copiloto') ? 'lg:flex-[2]' : 'flex-1'}`}
                   style={{ height: 'calc(100vh - 320px)', minHeight: '450px' }}>
                <ExegesisRichEditor
                  ref={editorRef}
                  content={manualContent}
                  onChange={setManualContent}
                  onSelectionChange={(text) => setSelectedText(text)}
                  placeholder="Comece a escrever seu esboço... O Copiloto IA vai analisar em tempo real."
                  minHeight="100%"
                />
              </div>

              {/* Copilot Panel - fills remaining space */}
              {hasModuleAccess('exegese.esbocos.texto_livre.copiloto') && showCopilot && (
                <div className="lg:flex-1 lg:min-w-[380px] border rounded-lg bg-card overflow-hidden flex flex-col"
                     style={{ height: 'calc(100vh - 320px)', minHeight: '450px' }}>
                  <OutlineCopilot
                    content={manualContent}
                    currentElement={currentElement}
                    selectedText={selectedText}
                    previousElements={previousElements}
                    onApplySuggestion={(original, replacement) => {
                      if (editorRef.current) {
                        editorRef.current.replaceText(original, replacement);
                      } else {
                        setManualContent(prev => prev.replace(original, replacement));
                      }
                    }}
                    onInsertReference={(ref) => {
                      if (editorRef.current) {
                        editorRef.current.insertContent(`<p>📖 ${ref}</p>`);
                      } else {
                        setManualContent(prev => prev + `\n\n📖 ${ref}`);
                      }
                    }}
                    onInsertContent={(text) => {
                      if (editorRef.current) {
                        const htmlText = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
                        editorRef.current.insertContent(`<p>${htmlText}</p>`);
                      } else {
                        setManualContent(prev => prev + text);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                onClick={handleSaveManual}
                className="btn-library-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Esboço Manual
              </Button>
              
              {/* Auto-save indicator */}
              {autoSaveStatus === 'saving' && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Salvo automaticamente
                </span>
              )}
              
              <Button variant="outline" onClick={() => { setManualContent(''); setLastSavedOutlineId(null); lastSavedContentRef.current = ''; }} disabled={!manualContent.trim()}>
                Limpar
              </Button>
              {hasModuleAccess('exegese.esbocos.texto_livre.copiloto') && (
                <Button 
                  variant={showCopilot ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5 ml-auto"
                  onClick={() => setShowCopilot(!showCopilot)}
                >
                  <Brain className="w-4 h-4" />
                  {showCopilot ? 'Ocultar Copiloto' : 'Mostrar Copiloto'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Structure Editor - Only show in AI mode */}
            <OutlineStructureEditor structure={structure} onChange={handleStructureChange} />

            <div className="flex items-center gap-2">
              <Button onClick={handleGenerate} disabled={isLoading || !getPassageText()} className="btn-library-primary">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : <><Send className="w-4 h-4 mr-2" /> Gerar Esboço</>}
              </Button>
              <PromptEditorDialog />
            </div>
          </>
        )}
      </div>

      {/* Streaming */}
      {isLoading && currentStream && (
        <div className="card-library p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-sm font-medium text-primary">Gerando esboço...</span></div>
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentStream) }} />
        </div>
      )}

      {/* ========= OUTLINE LIBRARY ========= */}
      {outlines.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Biblioteca de Esboços
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{outlines.length}</span>
            </h3>
          </div>

          {/* Search & Filters */}
          <div className="card-library p-3 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por passagem, tema ou conteúdo..."
                className="input-library w-full pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-library text-xs py-1 px-2"
              >
                <option value="">Todos os tipos</option>
                {OUTLINE_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label.replace(/[^\w\s]/g, '').trim()}</option>
                ))}
              </select>

              <span className="text-[10px] text-muted-foreground mx-1">|</span>
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              {OUTLINE_TAGS.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleToggleFilterTag(tag.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    filterTags.includes(tag.id) ? tag.color + ' font-semibold' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
              {(searchQuery || filterType || filterTags.length > 0) && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterType(''); setFilterTags([]); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {filteredOutlines.length !== outlines.length && (
              <p className="text-[10px] text-muted-foreground">{filteredOutlines.length} de {outlines.length} esboços</p>
            )}
          </div>

          {/* Outline List */}
          <div className="space-y-3">
            {filteredOutlines.map(o => {
              const isExp = expandedId === o.id;
              const isEditing = editingId === o.id;
              const outlineTags: string[] = (o as any).tags || [];
              return (
                <div key={o.id} className="card-library overflow-hidden">
                  <div className="p-4 flex items-start justify-between gap-2 cursor-pointer" onClick={() => setExpandedId(isExp ? null : o.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{typeLabels[o.outline_type] || o.outline_type}</span>
                        <span className="text-xs text-muted-foreground truncate">📖 {o.passage}</span>
                        {outlineTags.map(tid => {
                          const tagDef = OUTLINE_TAGS.find(t => t.id === tid);
                          return tagDef ? <span key={tid} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${tagDef.color}`}>{tagDef.label}</span> : null;
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" onClick={(e) => { e.stopPropagation(); handleDuplicate(o); }}>
                        <CopyPlus className="w-3.5 h-3.5" />
                      </Button>
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
                      {/* Tags Editor */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">Tags:</span>
                        {OUTLINE_TAGS.map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => {
                              const newTags = outlineTags.includes(tag.id) ? outlineTags.filter(t => t !== tag.id) : [...outlineTags, tag.id];
                              handleUpdateTags(o.id, newTags);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                              outlineTags.includes(tag.id) ? tag.color + ' font-semibold' : 'bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40'
                            }`}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                          if (isEditing) { handleSaveEdit(o.id); } else {
                            let htmlContent = isHtml(o.content) ? o.content : markdownToHtml(o.content);
                            htmlContent = htmlContent
                              .replace(/<span[^>]*class="citation-highlight"[^>]*>(.*?)<\/span>/g, '<mark style="background-color: #FEF3C7">$1</mark>')
                              .replace(/<span[^>]*class="citation-source"[^>]*>(.*?)<\/span>/g, '<strong>$1</strong>')
                              .replace(/<span[^>]*style="[^"]*background-color:\s*#FEF3C7[^"]*"[^>]*>(.*?)<\/span>/g, '<mark style="background-color: #FEF3C7">$1</mark>')
                              .replace(/<span[^>]*style="[^"]*color:\s*#92400E[^"]*"[^>]*>(.*?)<\/span>/g, '<strong>$1</strong>');
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
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => handleDuplicate(o)}>
                          <CopyPlus className="w-3.5 h-3.5" /> Duplicar
                        </Button>
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
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => exportAsPptx(isHtml(o.content) ? o.content : renderMarkdown(o.content), o.passage)}>
                          <Presentation className="w-3 h-3" /> PPT
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setPreacherMode({ content: isHtml(o.content) ? o.content : renderMarkdown(o.content), passage: o.passage })}>
                          <Monitor className="w-3 h-3" /> Pregador
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
                                <div className="flex gap-1 shrink-0">
                                  {s.example && (
                                    <>
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
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="shrink-0 text-[10px] h-7 gap-1"
                                        onClick={() => {
                                          const newExample = prompt('Editar sugestão:', s.example);
                                          if (newExample !== null) {
                                            setSuggestions(prev => {
                                              const updated = { ...prev };
                                              const suggList = [...updated[o.id].suggestions];
                                              suggList[i] = { ...suggList[i], example: newExample };
                                              updated[o.id] = { ...updated[o.id], suggestions: suggList };
                                              return updated;
                                            });
                                          }
                                        }}
                                      >
                                        <Edit3 className="w-3 h-3" /> Editar
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-border/50">
                            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleRequestSuggestions(o)} disabled={suggestionsLoading === o.id}>
                              {suggestionsLoading === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              Regenerar Sugestões
                            </Button>
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
            {filteredOutlines.length === 0 && outlines.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum esboço encontrado com os filtros selecionados.</p>
                <button onClick={() => { setSearchQuery(''); setFilterType(''); setFilterTags([]); }} className="text-xs text-primary hover:underline mt-1">Limpar filtros</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Materials Checklist */}
      {materials.length > 0 && (
        <MaterialsChecklist materials={materials} depthLevel={structure.depthLevel} />
      )}

      {/* Version History Dialog */}
      <OutlineVersionHistory
        versions={versions}
        open={!!versionsOpen}
        onClose={() => setVersionsOpen(null)}
        onRestore={handleRestoreVersion}
      />

      {/* Preacher Mode */}
      {preacherMode && (
        <PreacherMode
          content={preacherMode.content}
          passage={preacherMode.passage}
          onClose={() => setPreacherMode(null)}
        />
      )}
    </div>
  );
}
