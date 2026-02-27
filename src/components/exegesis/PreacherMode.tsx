import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreacherModeProps {
  content: string;
  passage: string;
  onClose: () => void;
}

export function PreacherMode({ content, passage, onClose }: PreacherModeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(22);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) document.exitFullscreen();
        onClose();
      }
      if (e.key === '+' || e.key === '=') setFontSize(s => Math.min(s + 2, 48));
      if (e.key === '-') setFontSize(s => Math.max(s - 2, 14));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-primary">🎤 Modo Pregador</span>
          <span className="text-xs text-muted-foreground">📖 {passage}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFontSize(s => Math.max(s - 2, 14))}>
            A-
          </Button>
          <span className="text-xs text-muted-foreground w-8 text-center">{fontSize}</span>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFontSize(s => Math.min(s + 2, 48))}>
            A+
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-12 lg:px-24 py-8">
        <div
          className="prose max-w-4xl mx-auto preacher-content"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      <div className="text-center py-2 text-xs text-muted-foreground border-t border-border bg-card shrink-0">
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Esc</kbd> Sair &nbsp;
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">+</kbd> Aumentar &nbsp;
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">-</kbd> Diminuir
      </div>
    </div>
  );
}
