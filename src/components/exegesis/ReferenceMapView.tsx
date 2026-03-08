import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { ExternalLink, ZoomIn, ZoomOut, Maximize2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReferenceMapProps {
  centralTheme: string;
  content: string;
  keywords: string[];
}

const BIBLE_ONLINE_SLUGS: Record<string, string> = {
  'Gênesis': 'gn', 'Êxodo': 'ex', 'Levítico': 'lv', 'Números': 'nm', 'Deuteronômio': 'dt',
  'Josué': 'js', 'Juízes': 'jz', 'Rute': 'rt', '1 Samuel': '1sm', '2 Samuel': '2sm',
  '1 Reis': '1rs', '2 Reis': '2rs', '1 Crônicas': '1cr', '2 Crônicas': '2cr',
  'Esdras': 'ed', 'Neemias': 'ne', 'Ester': 'et', 'Jó': 'jó',
  'Salmos': 'sl', 'Provérbios': 'pv', 'Eclesiastes': 'ec', 'Cânticos': 'ct',
  'Isaías': 'is', 'Jeremias': 'jr', 'Lamentações': 'lm', 'Ezequiel': 'ez', 'Daniel': 'dn',
  'Oséias': 'os', 'Joel': 'jl', 'Amós': 'am', 'Obadias': 'ob', 'Jonas': 'jn',
  'Miquéias': 'mq', 'Naum': 'na', 'Habacuque': 'hc', 'Sofonias': 'sf', 'Ageu': 'ag',
  'Zacarias': 'zc', 'Malaquias': 'ml',
  'Mateus': 'mt', 'Marcos': 'mc', 'Lucas': 'lc', 'João': 'jo', 'Atos': 'atos',
  'Romanos': 'rm', '1 Coríntios': '1co', '2 Coríntios': '2co', 'Gálatas': 'gl',
  'Efésios': 'ef', 'Filipenses': 'fp', 'Colossenses': 'cl',
  '1 Tessalonicenses': '1ts', '2 Tessalonicenses': '2ts',
  '1 Timóteo': '1tm', '2 Timóteo': '2tm', 'Tito': 'tt', 'Filemom': 'fm',
  'Hebreus': 'hb', 'Tiago': 'tg', '1 Pedro': '1pe', '2 Pedro': '2pe',
  '1 João': '1jo', '2 João': '2jo', '3 João': '3jo', 'Judas': 'jd', 'Apocalipse': 'ap',
};

function getBibleUrl(ref: string): string | null {
  const match = ref.match(/^((?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+(?:\s[a-zà-ú]+)?)\s+(\d+)/);
  if (!match) return null;
  const slug = BIBLE_ONLINE_SLUGS[match[1]];
  if (!slug) return null;
  return `https://www.bibliaonline.com.br/acf/${slug}/${match[2]}`;
}

const categoryColors: Record<string, string> = {
  'TEMÁTICAS': 'hsl(345, 50%, 30%)',
  'VOCABULARES': 'hsl(210, 50%, 45%)',
  'LINGUÍSTICAS': 'hsl(38, 70%, 50%)',
  'CONTEXTUAIS': 'hsl(145, 45%, 35%)',
  'TIPOLÓGICAS': 'hsl(270, 40%, 45%)',
  'PROFÉTICAS': 'hsl(30, 60%, 45%)',
  'DOUTRINÁRIAS': 'hsl(0, 50%, 40%)',
  'NARRATIVAS': 'hsl(180, 40%, 40%)',
  'COMPARATIVAS': 'hsl(200, 50%, 40%)',
  'APOSTÓLICAS': 'hsl(320, 40%, 40%)',
  'ESCATOLÓGICAS': 'hsl(50, 60%, 40%)',
  'PANORAMA': 'hsl(160, 40%, 35%)',
  'TOP': 'hsl(345, 50%, 30%)',
};

function extractReferences(content: string): { ref: string; category: string; color: string; order: number }[] {
  const refs: { ref: string; category: string; color: string; order: number }[] = [];
  const seen = new Set<string>();
  let currentCategory = '';
  let orderCounter = 1;
  const lines = content.split('\n');

  for (const line of lines) {
    const catMatch = line.match(/#{2,3}\s*[📖📝🔤🗺️🔗🔮⛪📜⚖️✉️🌅🌐🏆]?\s*\d*\.?\s*(.*?)(?:\s*[\(（]|$)/);
    if (catMatch) {
      const headerText = catMatch[1].toUpperCase();
      for (const cat of Object.keys(categoryColors)) {
        if (headerText.includes(cat)) { currentCategory = cat; break; }
      }
      if (headerText.includes('TOP')) currentCategory = 'TOP';
    }

    const refPattern = /(?:👉\s*\[?)?((?:\d\s)?[A-ZÀ-Ú][a-zà-ú]+(?:\s[a-zà-ú]+)?)\s+(\d+):(\d+(?:[,-]\d+)?)/g;
    let match;
    while ((match = refPattern.exec(line)) !== null) {
      const fullRef = `${match[1]} ${match[2]}:${match[3]}`;
      if (!seen.has(fullRef)) {
        seen.add(fullRef);
        const color = categoryColors[currentCategory] || 'hsl(var(--primary))';
        refs.push({ ref: fullRef, category: currentCategory || 'GERAL', color, order: orderCounter++ });
      }
    }
  }

  return refs;
}

export function ReferenceMapView({ centralTheme, content, keywords }: ReferenceMapProps) {
  const references = useMemo(() => extractReferences(content), [content]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [revealedCount, setRevealedCount] = useState(5);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const visibleRefs = useMemo(() => references.slice(0, revealedCount), [references, revealedCount]);
  const hasMore = revealedCount < references.length;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(3, z - e.deltaY * 0.002)));
  }, []);

  if (references.length === 0) return null;

  // Progressive ring layout - inner refs first, expanding outward
  const getPos = (i: number, count: number) => {
    // Distribute in concentric rings of ~8 nodes each
    const nodesPerRing = 8;
    const ringIndex = Math.floor(i / nodesPerRing);
    const posInRing = i % nodesPerRing;
    const ringCount = Math.min(nodesPerRing, count - ringIndex * nodesPerRing);
    const baseRadius = 28;
    const ringSpacing = 16;
    const radius = baseRadius + ringIndex * ringSpacing;
    const angleOffset = ringIndex * 0.3; // stagger rings
    const angle = (posInRing / ringCount) * 2 * Math.PI - Math.PI / 2 + angleOffset;
    return {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    };
  };

  const selectedUrl = selectedRef ? getBibleUrl(selectedRef) : null;
  const selectedOrder = selectedRef ? references.find(r => r.ref === selectedRef)?.order : null;

  // Find next ref in reading order
  const nextRef = selectedOrder && selectedOrder < references.length
    ? references.find(r => r.order === selectedOrder + 1) : null;

  // Zoom/pan handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.3, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.3, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(3, z - e.deltaY * 0.002)));
  }, []);

  const handleNodeClick = (ref: typeof references[0]) => {
    setSelectedRef(selectedRef === ref.ref ? null : ref.ref);
    // Auto-reveal more if clicking last visible
    if (ref.order === revealedCount && hasMore) {
      setRevealedCount(c => Math.min(c + 5, references.length));
    }
  };

  const handleRevealMore = () => {
    setRevealedCount(c => Math.min(c + 5, references.length));
  };

  const handleGoToNext = () => {
    if (nextRef) {
      setSelectedRef(nextRef.ref);
      if (nextRef.order > revealedCount) {
        setRevealedCount(nextRef.order);
      }
    }
  };

  // Bold the central theme keywords
  const renderCentralTheme = () => {
    let text = centralTheme.length > 50 ? centralTheme.slice(0, 50) + '…' : centralTheme;
    if (keywords.length > 0) {
      // Wrap keywords in bold styling - return JSX
      const regex = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        keywords.some(k => k.toLowerCase() === part.toLowerCase())
          ? <tspan key={i} fontWeight="900" fill="hsl(var(--primary))">{part}</tspan>
          : <tspan key={i}>{part}</tspan>
      );
    }
    return text;
  };

  // SVG viewBox adjusts based on revealed refs
  const maxRing = Math.floor((visibleRefs.length - 1) / 8);
  const viewSize = 100 + maxRing * 32;
  const viewOffset = -(viewSize - 100) / 2;

  return (
    <div className="card-library p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          🗺️ Mapa de Referências Cruzadas
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}><ZoomOut className="w-3.5 h-3.5" /></Button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}><ZoomIn className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}><Maximize2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* Selected reference action bar */}
      {selectedRef && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">{selectedOrder}</span>
            <span className="text-sm font-bold text-primary">📖 {selectedRef}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedUrl && (
              <a href={selectedUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-md">
                <ExternalLink className="w-3.5 h-3.5" /> Ler na Bíblia Online (ACF)
              </a>
            )}
            {nextRef && (
              <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={handleGoToNext}>
                Próxima: {nextRef.ref} <ChevronRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Interactive SVG Map */}
      <div
        ref={svgContainerRef}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-background/50"
        style={{ height: 'clamp(350px, 60vw, 550px)', cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          viewBox={`${viewOffset} ${viewOffset} ${viewSize} ${viewSize}`}
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {/* Connection lines - progressive chain */}
          {visibleRefs.map((ref, i) => {
            const pos = getPos(i, visibleRefs.length);
            // Connect to center
            return (
              <g key={`lines-${i}`}>
                <line
                  x1="50" y1="50"
                  x2={pos.x} y2={pos.y}
                  stroke={ref.color}
                  strokeWidth="0.15"
                  strokeDasharray="0.8,0.5"
                  opacity={selectedRef === ref.ref ? 0.8 : 0.25}
                />
                {/* Chain line to next ref */}
                {i < visibleRefs.length - 1 && (() => {
                  const nextPos = getPos(i + 1, visibleRefs.length);
                  return (
                    <line
                      x1={pos.x} y1={pos.y}
                      x2={nextPos.x} y2={nextPos.y}
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.1"
                      strokeDasharray="0.4,0.3"
                      opacity={0.15}
                    />
                  );
                })()}
              </g>
            );
          })}

          {/* Central circle */}
          <circle cx="50" cy="50" r="10" fill="hsl(var(--primary))" opacity="0.1" />
          <circle cx="50" cy="50" r="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" />

          {/* Central text with bold keywords */}
          <text x="50" y="49" textAnchor="middle" fontSize="2.2" fontWeight="700" fill="hsl(var(--primary))" className="font-display">
            {renderCentralTheme()}
          </text>
          <text x="50" y="52.5" textAnchor="middle" fontSize="1.4" fill="hsl(var(--muted-foreground))" opacity="0.7">
            {references.length} referências
          </text>

          {/* Reference nodes */}
          {visibleRefs.map((ref, i) => {
            const pos = getPos(i, visibleRefs.length);
            const isSelected = selectedRef === ref.ref;
            const textLen = ref.ref.length;
            const boxW = Math.max(14, textLen * 0.95 + 4);
            const boxH = 5;

            return (
              <g
                key={`node-${i}`}
                onClick={(e) => { e.stopPropagation(); handleNodeClick(ref); }}
                style={{ cursor: 'pointer' }}
              >
                {/* Node background */}
                <rect
                  x={pos.x - boxW / 2} y={pos.y - boxH / 2}
                  width={boxW} height={boxH}
                  rx="1.5"
                  fill={isSelected ? ref.color : 'hsl(var(--card))'}
                  opacity={isSelected ? 0.15 : 1}
                  stroke={ref.color}
                  strokeWidth={isSelected ? '0.4' : '0.2'}
                />
                {/* Order number badge */}
                <circle
                  cx={pos.x - boxW / 2 + 2} cy={pos.y}
                  r="1.8"
                  fill={ref.color}
                  opacity={0.9}
                />
                <text
                  x={pos.x - boxW / 2 + 2} y={pos.y + 0.6}
                  textAnchor="middle"
                  fontSize="1.5"
                  fontWeight="800"
                  fill="white"
                >
                  {ref.order}
                </text>
                {/* Reference text */}
                <text
                  x={pos.x + 1.5} y={pos.y + 0.6}
                  textAnchor="middle"
                  fontSize="1.7"
                  fontWeight="700"
                  fill={ref.color}
                  className="font-body"
                >
                  {ref.ref}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Progressive reveal button */}
      {hasMore && (
        <div className="flex items-center justify-center">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleRevealMore}>
            <ChevronRight className="w-3.5 h-3.5" />
            Revelar mais referências ({revealedCount}/{references.length})
          </Button>
        </div>
      )}

      {/* Legend */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          📊 {references.length} referências • {new Set(references.map(r => r.category)).size} categorias
          • Mostrando {visibleRefs.length} de {references.length}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set(references.map(r => r.category))).map(cat => {
            const count = references.filter(r => r.category === cat).length;
            const color = references.find(r => r.category === cat)?.color || 'hsl(var(--primary))';
            return (
              <span key={cat} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                style={{ borderColor: color, color, backgroundColor: `${color}10` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {cat} ({count})
              </span>
            );
          })}
        </div>
      </div>

      {/* Sequential reading list */}
      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📋 Ordem de Leitura Progressiva</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto">
          {references.map((ref) => {
            const url = getBibleUrl(ref.ref);
            const isSelected = selectedRef === ref.ref;
            return (
              <button
                key={ref.order}
                onClick={() => {
                  setSelectedRef(ref.ref);
                  if (ref.order > revealedCount) setRevealedCount(ref.order);
                }}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs font-medium transition-all text-left ${isSelected ? 'ring-2 ring-primary bg-primary/5 border-primary/30' : 'hover:bg-muted/50 border-border'}`}
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: ref.color, color: 'white' }}>
                  {ref.order}
                </span>
                <span className="font-bold truncate" style={{ color: ref.color }}>{ref.ref}</span>
                <span className="text-[9px] text-muted-foreground truncate">{ref.category}</span>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="ml-auto flex-shrink-0 opacity-50 hover:opacity-100">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
