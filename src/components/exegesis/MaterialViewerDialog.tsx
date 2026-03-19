import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Bold, Italic, Underline as UnderlineIcon, Highlighter, 
  Download, Edit3, Eye, FileText, ExternalLink, Loader2,
  Type, Palette
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ExegesisMaterial } from '@/hooks/useExegesis';

interface Props {
  material: ExegesisMaterial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Amarelo', color: '#fef08a', class: 'bg-yellow-200' },
  { name: 'Verde', color: '#bbf7d0', class: 'bg-green-200' },
  { name: 'Azul', color: '#bfdbfe', class: 'bg-blue-200' },
  { name: 'Rosa', color: '#fbcfe8', class: 'bg-pink-200' },
  { name: 'Laranja', color: '#fed7aa', class: 'bg-orange-200' },
];

export function MaterialViewerDialog({ material, open, onOpenChange }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const loadContent = useCallback(async () => {
    if (!material) return;
    setLoading(true);
    setContent('');
    setFileUrl(null);
    setIsPdf(false);

    try {
      // If it has a file_path, try to get a URL from storage
      if (material.file_path) {
        const ext = material.file_path.split('.').pop()?.toLowerCase();
        
        if (ext === 'pdf') {
          const { data } = supabase.storage.from('exegesis-materials').getPublicUrl(material.file_path);
          if (data?.publicUrl) {
            setFileUrl(data.publicUrl);
            setIsPdf(true);
            setLoading(false);
            return;
          }
        }
        
        // For text-based files, try to download and read
        if (['txt', 'md', 'doc', 'docx'].includes(ext || '')) {
          const { data, error } = await supabase.storage.from('exegesis-materials').download(material.file_path);
          if (!error && data) {
            const text = await data.text();
            setContent(text);
            setLoading(false);
            return;
          }
        }

        // For images
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
          const { data } = supabase.storage.from('exegesis-materials').getPublicUrl(material.file_path);
          if (data?.publicUrl) {
            setFileUrl(data.publicUrl);
            setLoading(false);
            return;
          }
        }

        // Fallback: get signed URL
        const { data } = await supabase.storage.from('exegesis-materials').createSignedUrl(material.file_path, 3600);
        if (data?.signedUrl) {
          setFileUrl(data.signedUrl);
          if (ext === 'pdf') setIsPdf(true);
          setLoading(false);
          return;
        }
      }

      // If it has a URL (external link)
      if (material.url) {
        setFileUrl(material.url);
        setLoading(false);
        return;
      }

      // If it has description as content (pasted content)
      if (material.description) {
        setContent(material.description);
      } else {
        setContent('Este material não possui conteúdo de texto visualizável diretamente. Use o botão "Abrir Externo" para visualizar.');
      }
    } catch (err) {
      console.error('Error loading material:', err);
      setContent('Erro ao carregar conteúdo do material.');
    } finally {
      setLoading(false);
    }
  }, [material]);

  useEffect(() => {
    if (open && material) {
      loadContent();
      setIsEditing(false);
      setShowColorPicker(false);
    }
  }, [open, material, loadContent]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleHighlight = (color: string) => {
    execCommand('hiliteColor', color);
    setShowColorPicker(false);
  };

  const handleExport = () => {
    if (!editorRef.current || !material) return;
    const htmlContent = editorRef.current.innerHTML;
    const blob = new Blob([`
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>${material.title}</title>
<style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.8;color:#1a1a1a}
mark{padding:2px 4px;border-radius:2px}</style></head>
<body>${htmlContent}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${material.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exportado com sucesso!' });
  };

  const isImageFile = material?.file_path && ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => material.file_path?.toLowerCase().endsWith(ext));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{material?.title}</span>
          </DialogTitle>
          {material?.author && (
            <p className="text-xs text-muted-foreground">por {material.author}</p>
          )}
        </DialogHeader>

        {/* Toolbar */}
        {!isPdf && !isImageFile && !fileUrl?.startsWith('http') && (
          <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/30 shrink-0 flex-wrap">
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              {isEditing ? 'Visualizar' : 'Editar'}
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCommand('bold')} title="Negrito (Ctrl+B)">
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCommand('italic')} title="Itálico (Ctrl+I)">
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCommand('underline')} title="Sublinhado (Ctrl+U)">
              <UnderlineIcon className="w-3.5 h-3.5" />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setShowColorPicker(!showColorPicker)}
              >
                <Highlighter className="w-3.5 h-3.5" />
                Destacar
              </Button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-background border rounded-lg shadow-lg p-2 flex gap-1.5 z-50">
                  {HIGHLIGHT_COLORS.map(c => (
                    <button
                      key={c.color}
                      className="w-7 h-7 rounded-full border-2 border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                      onClick={() => handleHighlight(c.color)}
                    />
                  ))}
                  <button
                    className="w-7 h-7 rounded-full border-2 border-border hover:scale-110 transition-transform flex items-center justify-center text-xs text-muted-foreground"
                    title="Remover destaque"
                    onClick={() => execCommand('removeFormat')}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-border mx-1" />

            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => execCommand('fontSize', '5')} title="Texto maior">
              <Type className="w-3.5 h-3.5" />
              A+
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => execCommand('fontSize', '3')} title="Texto normal">
              <Type className="w-3 h-3" />
              A
            </Button>

            <div className="flex-1" />

            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" />
              Exportar
            </Button>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">Carregando documento...</span>
            </div>
          ) : isPdf && fileUrl ? (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={material?.title}
            />
          ) : isImageFile && fileUrl ? (
            <div className="p-6 flex items-center justify-center h-full">
              <img src={fileUrl} alt={material?.title} className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
            </div>
          ) : fileUrl && !content ? (
            <div className="p-8 text-center space-y-4">
              <ExternalLink className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Este material é um link externo.</p>
              <Button onClick={() => window.open(fileUrl, '_blank')} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Abrir Link Externo
              </Button>
            </div>
          ) : (
            <div
              ref={editorRef}
              contentEditable={isEditing}
              suppressContentEditableWarning
              className={`p-6 min-h-full text-sm leading-relaxed whitespace-pre-wrap focus:outline-none select-text ${
                isEditing 
                  ? 'bg-background cursor-text' 
                  : 'bg-background/50'
              }`}
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: '1.9' }}
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
              onPaste={(e) => {
                // Allow normal paste behavior (Ctrl+V)
                if (!isEditing) {
                  e.preventDefault();
                }
              }}
            />
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t bg-muted/20 text-[10px] text-muted-foreground shrink-0">
          <span>
            {material?.theme && `Tema: ${material.theme}`}
            {material?.theme && material?.author && ' • '}
            {material?.author && `Autor: ${material.author}`}
          </span>
          <span>
            {isEditing ? '✏️ Modo edição — Ctrl+B (negrito), Ctrl+I (itálico), Ctrl+U (sublinhado)' : '👁️ Modo leitura — Selecione texto e destaque com cores'}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
