import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileSearch,
  FileText,
  Highlighter,
  Loader2,
  MessageSquarePlus,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ExegesisMaterial } from '@/hooks/useExegesis';
import { cn } from '@/lib/utils';
import {
  GlobalWorkerOptions,
  Util,
  getDocument,
  type PDFDocumentProxy,
} from 'pdfjs-dist';

interface TextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  material: ExegesisMaterial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PdfTool = 'select' | 'highlight' | 'underline' | 'strike' | 'comment' | 'text';
type AnnotationType = 'highlight' | 'underline' | 'strike' | 'comment' | 'text';

interface AnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfAnnotation {
  id: string;
  page: number;
  type: AnnotationType;
  rects: AnnotationRect[];
  text?: string;
  color: string;
  createdAt: string;
}

interface SelectedTextState {
  page: number;
  rects: AnnotationRect[];
  text: string;
}

interface PendingPlacement {
  page: number;
  x: number;
  y: number;
  type: 'comment' | 'text';
}

interface SearchResult {
  page: number;
  snippet: string;
}

interface PdfTextLayerItem {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

const HIGHLIGHT_COLOR = 'hsl(var(--warning) / 0.42)';
const UNDERLINE_COLOR = 'hsl(var(--primary))';
const STRIKE_COLOR = 'hsl(var(--destructive))';
const COMMENT_COLOR = 'hsl(var(--accent) / 0.22)';
const TEXT_BOX_COLOR = 'hsl(var(--secondary))';

const PDF_COLOR_MAP = {
  highlight: { r: 0.85, g: 0.68, b: 0.2 },
  underline: { r: 0.46, g: 0.18, b: 0.28 },
  strike: { r: 0.75, g: 0.24, b: 0.24 },
  comment: { r: 0.86, g: 0.72, b: 0.42 },
  text: { r: 0.9, g: 0.88, b: 0.8 },
} as const;

const TOOL_BUTTONS = [
  { value: 'select' as const, label: 'Selecionar', icon: FileSearch },
  { value: 'highlight' as const, label: 'Destacar', icon: Highlighter },
  { value: 'underline' as const, label: 'Sublinhar', icon: UnderlineIcon },
  { value: 'strike' as const, label: 'Riscar', icon: Strikethrough },
  { value: 'comment' as const, label: 'Comentário', icon: MessageSquarePlus },
  { value: 'text' as const, label: 'Texto', icon: Type },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function MaterialViewerDialog({ material, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [viewMode, setViewMode] = useState<'page' | 'continuous'>('page');
  const [activeTool, setActiveTool] = useState<PdfTool>('select');
  const [selectedText, setSelectedText] = useState<SelectedTextState | null>(null);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [undoStack, setUndoStack] = useState<PdfAnnotation[][]>([]);
  const [redoStack, setRedoStack] = useState<PdfAnnotation[][]>([]);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [exportStartPage, setExportStartPage] = useState(1);
  const [exportEndPage, setExportEndPage] = useState(1);
  const [textLayers, setTextLayers] = useState<Record<number, PdfTextLayerItem[]>>({});
  const [textPages, setTextPages] = useState<Record<number, string>>({});
  const [isImage, setIsImage] = useState(false);

  const objectUrlRef = useRef<string | null>(null);
  const pageCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const pageTextRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pageWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const renderTokenRef = useRef(0);

  const isPdf = !!pdfDoc;
  const pagesToRender = useMemo(
    () => (viewMode === 'continuous' && pageCount > 0 ? Array.from({ length: pageCount }, (_, index) => index + 1) : [currentPage]),
    [currentPage, pageCount, viewMode],
  );

  const commentAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.type === 'comment' || annotation.type === 'text'),
    [annotations],
  );

  const resetViewerState = useCallback(() => {
    renderTokenRef.current += 1;
    setLoading(false);
    setSaving(false);
    setErrorMessage(null);
    setContent('');
    setFileBytes(null);
    setFileUrl(null);
    setPdfDoc(null);
    setPageCount(0);
    setCurrentPage(1);
    setScale(1.15);
    setViewMode('page');
    setActiveTool('select');
    setSelectedText(null);
    setAnnotations([]);
    setUndoStack([]);
    setRedoStack([]);
    setPendingPlacement(null);
    setDraftValue('');
    setSearchQuery('');
    setSearchResults([]);
    setSearchIndex(0);
    setExportStartPage(1);
    setExportEndPage(1);
    setTextLayers({});
    setTextPages({});
    setIsImage(false);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const pushHistory = useCallback((nextAnnotations: PdfAnnotation[]) => {
    setUndoStack((prev) => [...prev, annotations]);
    setRedoStack([]);
    setAnnotations(nextAnnotations);
  }, [annotations]);

  const extractPageText = useCallback(async (doc: PDFDocumentProxy, pageNumber: number) => {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();

    const items = textContent.items
      .filter((item): item is TextItem => 'str' in item)
      .map((item, index) => {
        const transform = Util.transform(viewport.transform, item.transform);
        const fontSize = Math.hypot(transform[2], transform[3]);

        return {
          id: `${pageNumber}-${index}`,
          str: item.str,
          x: transform[4],
          y: transform[5] - fontSize,
          width: item.width * scale,
          height: fontSize * 1.15,
          fontSize,
        } satisfies PdfTextLayerItem;
      });

    const text = items.map((item) => item.str).join(' ');

    setTextLayers((prev) => ({ ...prev, [pageNumber]: items }));
    setTextPages((prev) => ({ ...prev, [pageNumber]: text }));

    return { text, items };
  }, [scale]);

  const renderPdfPage = useCallback(async (doc: PDFDocumentProxy, pageNumber: number, token: number) => {
    const canvas = pageCanvasRefs.current[pageNumber];
    const textLayer = pageTextRefs.current[pageNumber];
    const wrapper = pageWrapperRefs.current[pageNumber];
    if (!canvas || !textLayer || !wrapper) return;

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;
    wrapper.style.width = `${viewport.width}px`;
    wrapper.style.minHeight = `${viewport.height}px`;

    await page.render({ canvasContext: context, viewport, canvas } as any).promise;
    if (token !== renderTokenRef.current) return;
    await extractPageText(doc, pageNumber);
  }, [extractPageText, scale]);

  const loadContent = useCallback(async () => {
    if (!material) return;
    resetViewerState();
    setLoading(true);

    try {
      if (material.file_path) {
        const extension = material.file_path.split('.').pop()?.toLowerCase() || '';
        const { data, error } = await supabase.storage.from('exegesis-materials').download(material.file_path);
        if (error) throw error;

        if (extension === 'pdf') {
          const bytes = new Uint8Array(await data.arrayBuffer());
          const loadedPdf = await getDocument({ data: bytes }).promise;
          setFileBytes(bytes);
          setPdfDoc(loadedPdf);
          setPageCount(loadedPdf.numPages);
          setCurrentPage(1);
          setExportStartPage(1);
          setExportEndPage(loadedPdf.numPages);
          setLoading(false);
          return;
        }

        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
          const url = URL.createObjectURL(data);
          objectUrlRef.current = url;
          setFileUrl(url);
          setIsImage(true);
          setLoading(false);
          return;
        }

        if (['txt', 'md'].includes(extension)) {
          setContent(await data.text());
          setLoading(false);
          return;
        }

        const url = URL.createObjectURL(data);
        objectUrlRef.current = url;
        setFileUrl(url);
        setLoading(false);
        return;
      }

      if (material.url) {
        setFileUrl(material.url);
        setLoading(false);
        return;
      }

      setContent(material.description || 'Este material não possui conteúdo visualizável.');
    } catch (error) {
      console.error('Erro ao carregar material:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao carregar o documento.');
      setContent(material.description || 'Não foi possível abrir este documento.');
    } finally {
      setLoading(false);
    }
  }, [material, resetViewerState]);

  useEffect(() => {
    if (open && material) {
      void loadContent();
    }

    return () => {
      resetViewerState();
    };
  }, [loadContent, material, open, resetViewerState]);

  useEffect(() => {
    if (!pdfDoc) return;

    const token = ++renderTokenRef.current;
    const renderAll = async () => {
      for (const pageNumber of pagesToRender) {
        await renderPdfPage(pdfDoc, pageNumber, token);
      }
    };

    void renderAll();
  }, [pagesToRender, pdfDoc, renderPdfPage]);

  useEffect(() => {
    if (!pdfDoc) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setSelectedText(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const anchorNode = selection.anchorNode;
      const pageElement = anchorNode instanceof Element
        ? anchorNode.closest('[data-page-number]')
        : anchorNode?.parentElement?.closest('[data-page-number]');

      if (!pageElement) {
        setSelectedText(null);
        return;
      }

      const page = Number(pageElement.getAttribute('data-page-number'));
      const rect = pageElement.getBoundingClientRect();
      const selectedRects = Array.from(range.getClientRects())
        .map((selectionRect) => ({
          x: selectionRect.left - rect.left,
          y: selectionRect.top - rect.top,
          width: selectionRect.width,
          height: selectionRect.height,
        }))
        .filter((selectionRect) => selectionRect.width > 0 && selectionRect.height > 0);

      const text = selection.toString().trim();
      if (!text || selectedRects.length === 0) {
        setSelectedText(null);
        return;
      }

      setSelectedText({ page, rects: selectedRects, text });
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [pdfDoc]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelectedText(null);
  };

  const applySelectedAnnotation = (type: Extract<AnnotationType, 'highlight' | 'underline' | 'strike'>) => {
    if (!selectedText) {
      toast({ title: 'Selecione um trecho do PDF primeiro.', variant: 'destructive' });
      return;
    }

    const color = type === 'highlight' ? HIGHLIGHT_COLOR : type === 'underline' ? UNDERLINE_COLOR : STRIKE_COLOR;
    const nextAnnotation: PdfAnnotation = {
      id: createId(),
      page: selectedText.page,
      type,
      rects: selectedText.rects,
      text: selectedText.text,
      color,
      createdAt: new Date().toISOString(),
    };

    pushHistory([...annotations, nextAnnotation]);
    clearSelection();
    toast({ title: `${type === 'highlight' ? 'Destaque' : type === 'underline' ? 'Sublinhado' : 'Riscado'} aplicado.` });
  };

  const handlePageClick = (event: React.MouseEvent<HTMLDivElement>, page: number) => {
    if (activeTool !== 'comment' && activeTool !== 'text') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPendingPlacement({
      page,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      type: activeTool,
    });
    setDraftValue('');
  };

  const savePlacedAnnotation = () => {
    if (!pendingPlacement || !draftValue.trim()) {
      toast({ title: 'Digite o conteúdo antes de salvar.', variant: 'destructive' });
      return;
    }

    const nextAnnotation: PdfAnnotation = {
      id: createId(),
      page: pendingPlacement.page,
      type: pendingPlacement.type,
      rects: [{ x: pendingPlacement.x, y: pendingPlacement.y, width: 180, height: pendingPlacement.type === 'comment' ? 88 : 48 }],
      text: draftValue.trim(),
      color: pendingPlacement.type === 'comment' ? COMMENT_COLOR : TEXT_BOX_COLOR,
      createdAt: new Date().toISOString(),
    };

    pushHistory([...annotations, nextAnnotation]);
    setPendingPlacement(null);
    setDraftValue('');
    setActiveTool('select');
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, annotations]);
    setAnnotations(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, annotations]);
    setAnnotations(next);
  };

  const runSearch = async () => {
    if (!pdfDoc || !searchQuery.trim()) {
      setSearchResults([]);
      setSearchIndex(0);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const results: SearchResult[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
      const cachedText = textPages[pageNumber] ?? (await extractPageText(pdfDoc, pageNumber)).text;
      const pageText = cachedText.toLowerCase();
      const foundAt = pageText.indexOf(query);
      if (foundAt >= 0) {
        const start = Math.max(0, foundAt - 40);
        const end = Math.min(cachedText.length, foundAt + query.length + 60);
        results.push({ page: pageNumber, snippet: cachedText.slice(start, end).trim() });
      }
    }

    setSearchResults(results);
    setSearchIndex(0);
    if (results.length > 0) {
      setCurrentPage(results[0].page);
      setViewMode('page');
      toast({ title: `${results.length} resultado(s) encontrado(s).` });
    } else {
      toast({ title: 'Nenhum resultado encontrado.', variant: 'destructive' });
    }
  };

  const goToSearchResult = (index: number) => {
    const target = searchResults[index];
    if (!target) return;
    setSearchIndex(index);
    setCurrentPage(target.page);
    setViewMode('page');
  };

  const buildAnnotatedPdf = useCallback(async () => {
    if (!fileBytes) return null;

    const pdf = await PDFDocument.load(fileBytes.slice());
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    annotations.forEach((annotation) => {
      const page = pdf.getPage(annotation.page - 1);
      const pageHeight = page.getHeight();
      const pageColor = annotation.type === 'highlight'
        ? PDF_COLOR_MAP.highlight
        : annotation.type === 'underline'
          ? PDF_COLOR_MAP.underline
          : annotation.type === 'strike'
            ? PDF_COLOR_MAP.strike
            : annotation.type === 'comment'
              ? PDF_COLOR_MAP.comment
              : PDF_COLOR_MAP.text;

      annotation.rects.forEach((rect) => {
        const y = pageHeight - rect.y - rect.height;

        if (annotation.type === 'highlight') {
          page.drawRectangle({ x: rect.x, y, width: rect.width, height: rect.height, color: rgb(pageColor.r, pageColor.g, pageColor.b), opacity: 0.38 });
        }

        if (annotation.type === 'underline') {
          page.drawLine({ start: { x: rect.x, y: y + 2 }, end: { x: rect.x + rect.width, y: y + 2 }, thickness: 1.5, color: rgb(pageColor.r, pageColor.g, pageColor.b) });
        }

        if (annotation.type === 'strike') {
          page.drawLine({ start: { x: rect.x, y: y + rect.height / 2 }, end: { x: rect.x + rect.width, y: y + rect.height / 2 }, thickness: 1.5, color: rgb(pageColor.r, pageColor.g, pageColor.b) });
        }

        if (annotation.type === 'comment' || annotation.type === 'text') {
          page.drawRectangle({ x: rect.x, y: pageHeight - rect.y - rect.height, width: rect.width, height: rect.height, color: rgb(pageColor.r, pageColor.g, pageColor.b), opacity: annotation.type === 'comment' ? 0.45 : 0.3 });
          if (annotation.text) {
            page.drawText(annotation.text, {
              x: rect.x + 8,
              y: pageHeight - rect.y - 18,
              size: 10,
              maxWidth: rect.width - 16,
              lineHeight: 12,
              font,
              color: rgb(0.15, 0.15, 0.15),
            });
          }
        }
      });
    });

    return pdf;
  }, [annotations, fileBytes]);

  const downloadBytes = (bytes: Uint8Array, fileName: string) => {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSavePdf = async () => {
    if (!material?.file_path || !fileBytes || !isPdf) return;
    try {
      setSaving(true);
      const pdf = await buildAnnotatedPdf();
      if (!pdf) return;

      const savedBytes = await pdf.save();
      const { error } = await supabase.storage
        .from('exegesis-materials')
        .update(material.file_path, new Blob([savedBytes], { type: 'application/pdf' }), { contentType: 'application/pdf', upsert: true });
      if (error) throw error;

      const nextBytes = new Uint8Array(savedBytes);
      setFileBytes(nextBytes);
      const refreshedPdf = await getDocument({ data: nextBytes }).promise;
      setPdfDoc(refreshedPdf);
      toast({ title: 'PDF salvo com sucesso.' });
    } catch (error) {
      console.error('Erro ao salvar PDF:', error);
      toast({ title: 'Não foi possível salvar o PDF.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!isPdf || !fileBytes || !material) return;
    try {
      setSaving(true);
      const start = Math.max(1, Math.min(exportStartPage, exportEndPage));
      const end = Math.min(pageCount, Math.max(exportStartPage, exportEndPage));
      const sourcePdf = await buildAnnotatedPdf();
      if (!sourcePdf) return;

      let bytes: Uint8Array;
      if (start === 1 && end === pageCount) {
        bytes = new Uint8Array(await sourcePdf.save());
      } else {
        const exportPdf = await PDFDocument.create();
        const copiedPages = await exportPdf.copyPages(sourcePdf, Array.from({ length: end - start + 1 }, (_, index) => start + index - 1));
        copiedPages.forEach((page) => exportPdf.addPage(page));
        bytes = new Uint8Array(await exportPdf.save());
      }

      downloadBytes(bytes, `${material.title.replace(/[^a-zA-Z0-9-_]/g, '_') || 'documento'}_${start}-${end}.pdf`);
      toast({ title: 'PDF exportado com sucesso.' });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({ title: 'Falha ao exportar o PDF.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderAnnotationOverlay = (page: number) => {
    const pageAnnotations = annotations.filter((annotation) => annotation.page === page);
    return pageAnnotations.map((annotation) =>
      annotation.rects.map((rect, index) => {
        if (annotation.type === 'highlight') {
          return <div key={`${annotation.id}-${index}`} className="absolute rounded-sm pointer-events-none" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, background: annotation.color }} />;
        }

        if (annotation.type === 'underline') {
          return <div key={`${annotation.id}-${index}`} className="absolute pointer-events-none" style={{ left: rect.x, top: rect.y + rect.height - 2, width: rect.width, height: 2, background: annotation.color }} />;
        }

        if (annotation.type === 'strike') {
          return <div key={`${annotation.id}-${index}`} className="absolute pointer-events-none" style={{ left: rect.x, top: rect.y + rect.height / 2, width: rect.width, height: 2, background: annotation.color }} />;
        }

        return (
          <div
            key={`${annotation.id}-${index}`}
            className={cn('absolute border border-border/60 rounded-md p-2 text-[11px] leading-4 shadow-sm max-w-[180px] whitespace-pre-wrap', annotation.type === 'comment' ? 'bg-accent/20' : 'bg-secondary text-secondary-foreground')}
            style={{ left: rect.x, top: rect.y, width: rect.width }}
          >
            {annotation.text}
          </div>
        );
      }),
    );
  };

  const renderTextLayer = (page: number) => {
    const items = textLayers[page] || [];
    return items.map((item) => (
      <span
        key={item.id}
        className="absolute select-text whitespace-pre"
        style={{ left: item.x, top: item.y, width: item.width, minHeight: item.height, fontSize: item.fontSize, lineHeight: `${item.height}px`, color: 'transparent', transformOrigin: '0 0', userSelect: 'text' }}
      >
        {item.str}
      </span>
    ));
  };

  const renderPdfPageCard = (page: number) => (
    <div key={page} className="flex justify-center">
      <div
        ref={(element) => { pageWrapperRefs.current[page] = element; }}
        data-page-number={page}
        className="relative rounded-xl border border-border bg-background shadow-sm overflow-hidden"
        onClick={(event) => handlePageClick(event, page)}
      >
        <canvas ref={(element) => { pageCanvasRefs.current[page] = element; }} className="block" />
        <div ref={(element) => { pageTextRefs.current[page] = element; }} data-page-number={page} className="absolute inset-0 z-10 overflow-hidden">
          {renderTextLayer(page)}
        </div>
        <div className="absolute inset-0 z-20 pointer-events-none">{renderAnnotationOverlay(page)}</div>
        <div className="absolute right-3 top-3 z-30 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm pointer-events-none">
          Página {page}
        </div>
      </div>
    </div>
  );

  const showFallbackTextEditor = !loading && !isPdf && !isImage && !fileUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[96vw] h-[94vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="border-b bg-card px-4 py-3 shrink-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base font-semibold truncate">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{material?.title}</span>
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs">
                  {isPdf ? 'Selecione trechos para destacar, sublinhar, riscar ou comentar. Para texto novo/comentário, escolha a ferramenta e clique na página.' : material?.author ? `por ${material.author}` : 'Visualizador de materiais'}
                </DialogDescription>
              </div>

              {isPdf && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleUndo} disabled={undoStack.length === 0}>
                    <RotateCcw className="h-3.5 w-3.5" />Desfazer
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleRedo} disabled={redoStack.length === 0}>
                    <RotateCw className="h-3.5 w-3.5" />Refazer
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleExportPdf} disabled={saving || !fileBytes}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Exportar PDF
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5" onClick={handleSavePdf} disabled={saving || !material?.file_path}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Salvar PDF
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isPdf && (
            <div className="border-b bg-muted/20 px-4 py-3 shrink-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {TOOL_BUTTONS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Button key={tool.value} type="button" size="sm" variant={activeTool === tool.value ? 'default' : 'outline'} className="h-8 gap-1.5" onClick={() => setActiveTool(tool.value)}>
                      <Icon className="h-3.5 w-3.5" />{tool.label}
                    </Button>
                  );
                })}

                <div className="mx-1 h-5 w-px bg-border" />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScale((value) => Math.max(0.8, Number((value - 0.1).toFixed(2))))}><Minus className="h-3.5 w-3.5" /></Button>
                <div className="min-w-[4.5rem] text-center text-xs text-muted-foreground">{Math.round(scale * 100)}%</div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setScale((value) => Math.min(2.2, Number((value + 0.1).toFixed(2))))}><Plus className="h-3.5 w-3.5" /></Button>

                <div className="mx-1 h-5 w-px bg-border" />
                <Button variant={viewMode === 'page' ? 'default' : 'outline'} size="sm" className="h-8" onClick={() => setViewMode('page')}>Por página</Button>
                <Button variant={viewMode === 'continuous' ? 'default' : 'outline'} size="sm" className="h-8" onClick={() => setViewMode('continuous')}>Scroll contínuo</Button>

                <div className="mx-1 h-5 w-px bg-border" />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <div className="text-xs text-muted-foreground">Página {currentPage}/{pageCount}</div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage >= pageCount}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>

              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <div className="relative min-w-[220px] flex-1 max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void runSearch(); }} placeholder="Buscar palavra no PDF" className="input-library h-9 pl-9 text-sm" />
                  </div>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => void runSearch()}><Search className="h-3.5 w-3.5" />Buscar</Button>
                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => goToSearchResult(Math.max(0, searchIndex - 1))} disabled={searchIndex === 0}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                      <span>{searchIndex + 1}/{searchResults.length}</span>
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => goToSearchResult(Math.min(searchResults.length - 1, searchIndex + 1))} disabled={searchIndex >= searchResults.length - 1}><ChevronRight className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Exportar páginas</span>
                  <input type="number" min={1} max={pageCount} value={exportStartPage} onChange={(event) => setExportStartPage(Number(event.target.value) || 1)} className="input-library h-9 w-20 text-sm" />
                  <span>até</span>
                  <input type="number" min={1} max={pageCount} value={exportEndPage} onChange={(event) => setExportEndPage(Number(event.target.value) || pageCount)} className="input-library h-9 w-20 text-sm" />
                </div>
              </div>

              {selectedText && (
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">Trecho selecionado:</span>
                    <span className="max-w-full truncate">“{selectedText.text}”</span>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => applySelectedAnnotation('highlight')}><Highlighter className="h-3.5 w-3.5" />Destacar</Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => applySelectedAnnotation('underline')}><UnderlineIcon className="h-3.5 w-3.5" />Sublinhar</Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => applySelectedAnnotation('strike')}><Strikethrough className="h-3.5 w-3.5" />Riscar</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={clearSelection}>Limpar seleção</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="flex h-full flex-col xl:flex-row">
              <div className="flex-1 min-h-0 overflow-auto bg-muted/10 p-4 sm:p-5">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />Carregando documento...</div>
                ) : errorMessage ? (
                  <div className="card-library mx-auto max-w-xl p-6 text-center space-y-3"><p className="text-sm font-medium text-foreground">Não foi possível abrir este material.</p><p className="text-xs text-muted-foreground">{errorMessage}</p></div>
                ) : isPdf ? (
                  <div className="space-y-6">{pagesToRender.map((page) => renderPdfPageCard(page))}</div>
                ) : isImage && fileUrl ? (
                  <div className="flex h-full items-center justify-center"><img src={fileUrl} alt={material?.title || 'Documento'} className="max-h-full max-w-full rounded-xl border border-border shadow-sm" /></div>
                ) : fileUrl ? (
                  <div className="card-library mx-auto max-w-xl p-6 text-center space-y-4"><p className="text-sm text-muted-foreground">Este arquivo não é PDF. Você pode abri-lo em outra aba.</p><Button onClick={() => window.open(fileUrl, '_blank')} className="gap-2"><ExternalLink className="h-4 w-4" />Abrir documento</Button></div>
                ) : showFallbackTextEditor ? (
                  <div className="card-library mx-auto max-w-4xl p-6"><div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground break-words"><div dangerouslySetInnerHTML={{ __html: escapeHtml(content).replace(/\n/g, '<br />') }} /></div></div>
                ) : null}
              </div>

              {isPdf && (
                <aside className="w-full xl:w-[340px] shrink-0 border-t xl:border-t-0 xl:border-l bg-card overflow-auto">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Comentários e caixas de texto</h3>
                      <p className="text-xs text-muted-foreground">Escolha <strong>Comentário</strong> ou <strong>Texto</strong> e clique em qualquer ponto da página.</p>
                    </div>

                    {pendingPlacement && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                        <p className="text-xs font-medium text-foreground">{pendingPlacement.type === 'comment' ? 'Novo comentário' : 'Novo texto'} • página {pendingPlacement.page}</p>
                        <textarea value={draftValue} onChange={(event) => setDraftValue(event.target.value)} className="input-library min-h-[110px] resize-y text-sm" placeholder={pendingPlacement.type === 'comment' ? 'Digite seu comentário aqui...' : 'Digite o texto que deseja inserir...'} />
                        <div className="flex gap-2"><Button size="sm" className="gap-1.5" onClick={savePlacedAnnotation}><Save className="h-3.5 w-3.5" />Inserir</Button><Button variant="ghost" size="sm" onClick={() => setPendingPlacement(null)}>Cancelar</Button></div>
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Resultados da busca</h4>
                        <div className="space-y-2">
                          {searchResults.map((result, index) => (
                            <button key={`${result.page}-${index}`} type="button" onClick={() => goToSearchResult(index)} className={cn('w-full rounded-lg border p-3 text-left transition-colors', searchIndex === index ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/30')}>
                              <div className="text-xs font-medium text-foreground">Página {result.page}</div>
                              <div className="mt-1 text-xs text-muted-foreground line-clamp-3">{result.snippet}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Lista lateral</h4>
                      {commentAnnotations.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Nenhum comentário ainda. Clique em <strong>Comentário</strong> ou <strong>Texto</strong> e depois na página.</div>
                      ) : (
                        <div className="space-y-2">
                          {commentAnnotations.map((annotation) => (
                            <div key={annotation.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-foreground">{annotation.type === 'comment' ? 'Comentário' : 'Texto'} • página {annotation.page}</span><Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setCurrentPage(annotation.page); setViewMode('page'); }}>Ir para</Button></div>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{annotation.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
