import { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize, Minimize, Download, MapPin, Loader2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapImageViewerProps {
  imageUrl: string;
  passage: string;
  loading?: boolean;
  className?: string;
}

export function MapImageViewer({ imageUrl, passage, loading = false, className = '' }: MapImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.3, 5));
  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(prev - 0.3, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => { setZoom(1); setPosition({ x: 0, y: 0 }); };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (zoom <= 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  }, [zoom, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `mapa-biblico-${passage.replace(/\s+/g, '-')}.png`;
    link.click();
  };

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev + 0.15, 5));
    } else {
      setZoom(prev => {
        const next = Math.max(prev - 0.15, 0.5);
        if (next <= 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  }, []);

  if (loading) {
    return (
      <div className={`border border-border rounded-lg p-4 ${className}`}>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" /> Mapa Bíblico
        </h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Gerando imagem do mapa com IA...
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`border border-border rounded-lg p-4 ${className}`}>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" /> Mapa Bíblico
        </h4>
        <p className="text-xs text-muted-foreground italic text-center py-4">
          Não foi possível gerar o mapa. Os dados geográficos estão na análise acima.
        </p>
      </div>
    );
  }

  const containerClasses = isExpanded
    ? 'fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col'
    : `border border-border rounded-lg overflow-hidden ${className}`;

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className={`flex items-center justify-between gap-2 px-3 py-2 ${isExpanded ? 'border-b border-border' : 'bg-muted/30'}`}>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Mapa Bíblico — {passage}
        </h4>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Zoom +">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom -">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Resetar zoom">
            <Move className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleExpand} title={isExpanded ? 'Minimizar' : 'Expandir'}>
            {isExpanded ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Baixar mapa">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${isExpanded ? 'flex-1' : ''} ${zoom > 1 ? 'cursor-grab' : ''} ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{ height: isExpanded ? undefined : '450px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
      >
        <img
          src={imageUrl}
          alt={`Mapa bíblico de ${passage}`}
          className="w-full h-full object-contain select-none"
          draggable={false}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* Footer hint */}
      <div className={`text-center py-1.5 ${isExpanded ? 'border-t border-border' : 'bg-muted/30'}`}>
        <p className="text-[10px] text-muted-foreground">
          🖱️ Scroll para zoom • Arraste para mover • Gerado por IA
        </p>
      </div>
    </div>
  );
}

/** Extract map image URL from analysis content (stored as <!-- MAP_IMAGE:url -->) */
export function extractMapImageUrl(content: string): string | null {
  const match = content.match(/<!-- MAP_IMAGE:(.*?) -->/);
  return match ? match[1] : null;
}

/** Append map image URL to analysis content */
export function appendMapImageUrl(content: string, url: string): string {
  // Remove any existing map image marker
  const cleaned = content.replace(/\n?<!-- MAP_IMAGE:.*? -->/g, '');
  return `${cleaned}\n<!-- MAP_IMAGE:${url} -->`;
}
