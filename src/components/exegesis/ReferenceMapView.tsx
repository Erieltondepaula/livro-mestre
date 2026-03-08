import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { ExternalLink, ZoomIn, ZoomOut, Maximize2, ChevronRight, ChevronDown } from 'lucide-react';
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

function extractReferences(content: string): { ref: string; category: string; color: string; order: number; snippet: string }[] {
  const refs: { ref: string; category: string; color: string; order: number; snippet: string }[] = [];
  const seen = new Set<string>();
  let currentCategory = '';
  let orderCounter = 1;
  const lines = content.split('\n');

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
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
        const color = categoryColors[currentCategory] || 'hsl(345, 50%, 30%)';
        // Extract snippet - text after the reference on the same line
        const afterRef = line.slice(match.index + match[0].length).replace(/^[\s\-–—:]+/, '').replace(/[*_`\[\]]/g, '').trim();
        const snippet = afterRef || '';
        refs.push({ ref: fullRef, category: currentCategory || 'GERAL', color, order: orderCounter++, snippet });
      }
    }
  }

  return refs;
}

export function ReferenceMapView({ centralTheme, content, keywords }: ReferenceMapProps) {
  const references = useMemo(() => extractReferences(content), [content]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [showReadingList, setShowReadingList] = useState(false);
  const [hoveredRef, setHoveredRef] = useState<{ ref: typeof references[0]; x: number; y: number } | null>(null);

  // Touch support
  const lastTouchDistance = useRef<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) return;
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
    setZoom(z => Math.max(0.3, Math.min(4, z - e.deltaY * 0.002)));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      setIsPanning(true);
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastTouchDistance.current;
      setZoom(z => Math.max(0.3, Math.min(4, z * scale)));
      lastTouchDistance.current = dist;
    } else if (isPanning && e.touches.length === 1) {
      setPan({
        x: panStart.current.panX + (e.touches[0].clientX - panStart.current.x),
        y: panStart.current.panY + (e.touches[0].clientY - panStart.current.y),
      });
    }
  }, [isPanning]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    lastTouchDistance.current = null;
  }, []);

  if (references.length === 0) return null;

  const count = references.length;
  // Layout: evenly spaced radial pattern. Center at (500, 500).
  const CX = 500;
  const CY = 500;
  const CENTER_R = 70;

  // Adaptive ring sizing based on node count
  // Fewer nodes per ring = more spacing between them
  const NODES_PER_RING = Math.min(8, Math.max(5, Math.ceil(count / 3)));
  const RING_BASE = 220; // First ring well clear of center
  const RING_SPACING = 180; // Generous gap between rings

  const getNodePos = (i: number) => {
    const ringIndex = Math.floor(i / NODES_PER_RING);
    const posInRing = i % NODES_PER_RING;
    const nodesInThisRing = Math.min(NODES_PER_RING, count - ringIndex * NODES_PER_RING);
    const radius = RING_BASE + ringIndex * RING_SPACING;
    // Offset each ring slightly so nodes don't align radially
    const angleOffset = ringIndex * (Math.PI / NODES_PER_RING);
    const angle = (posInRing / nodesInThisRing) * 2 * Math.PI - Math.PI / 2 + angleOffset;
    return {
      x: CX + radius * Math.cos(angle),
      y: CY + radius * Math.sin(angle),
    };
  };

  // ViewBox with generous padding so nothing clips
  const allPositions = references.map((_, i) => getNodePos(i));
  const xs = allPositions.map(p => p.x);
  const ys = allPositions.map(p => p.y);
  const padding = 150;
  const minX = Math.min(CX - CENTER_R, ...xs) - padding;
  const minY = Math.min(CY - CENTER_R, ...ys) - padding;
  const maxX = Math.max(CX + CENTER_R, ...xs) + padding;
  const maxY = Math.max(CY + CENTER_R, ...ys) + padding;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  const selectedData = selectedRef ? references.find(r => r.ref === selectedRef) : null;
  const selectedUrl = selectedRef ? getBibleUrl(selectedRef) : null;
  const nextRef = selectedData && selectedData.order < references.length
    ? references.find(r => r.order === selectedData.order + 1) : null;

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.3, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.3, 0.3));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleNodeClick = (ref: typeof references[0]) => {
    setSelectedRef(selectedRef === ref.ref ? null : ref.ref);
  };

  const handleGoToNext = () => {
    if (nextRef) setSelectedRef(nextRef.ref);
  };

  // Bold keywords in central theme
  const themeLabel = centralTheme.length > 40 ? centralTheme.slice(0, 40) + '…' : centralTheme;

  // Make container tall enough to show the map clearly
  const containerHeight = Math.max(550, Math.min(800, vbH * 0.6));

  return (
    <div className="card-library p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          🗺️ Mapa de Referências Cruzadas
          <span className="text-[10px] font-normal normal-case bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {references.length} referências
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}><ZoomOut className="w-3.5 h-3.5" /></Button>
          <span className="text-[10px] text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}><ZoomIn className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}><Maximize2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* Selected reference action bar */}
      {selectedData && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3 animate-fade-in">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ backgroundColor: selectedData.color }}>
              {selectedData.order}
            </span>
            <span className="text-sm font-bold" style={{ color: selectedData.color }}>📖 {selectedData.ref}</span>
            {selectedData.snippet && (
              <span className="text-xs text-muted-foreground italic hidden sm:inline">— {selectedData.snippet}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedUrl && (
              <a href={selectedUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-md">
                <ExternalLink className="w-3.5 h-3.5" /> Ler na Bíblia (ACF)
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

      {/* Interactive SVG Map - full width, auto-height, no clipping */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-background/50"
        style={{
          height: `${containerHeight}px`,
          cursor: isPanning ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {/* Subtle radial lines from center to each node */}
          {references.map((ref, i) => {
            const pos = getNodePos(i);
            const isSelected = selectedRef === ref.ref;
            return (
              <line
                key={`line-${i}`}
                x1={CX} y1={CY}
                x2={pos.x} y2={pos.y}
                stroke={isSelected ? ref.color : 'hsl(var(--border))'}
                strokeWidth={isSelected ? 1.5 : 0.7}
                strokeDasharray={isSelected ? 'none' : '4,4'}
                opacity={isSelected ? 0.8 : 0.3}
              />
            );
          })}

          {/* Sequential chain lines connecting nodes in order */}
          {references.map((ref, i) => {
            if (i === 0) return null;
            const prev = getNodePos(i - 1);
            const curr = getNodePos(i);
            const isInChain = selectedData && (ref.order === selectedData.order || ref.order === selectedData.order + 1 || references[i - 1].order === selectedData.order);
            return (
              <line
                key={`chain-${i}`}
                x1={prev.x} y1={prev.y}
                x2={curr.x} y2={curr.y}
                stroke={isInChain ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                strokeWidth={isInChain ? 1.2 : 0.4}
                strokeDasharray="6,4"
                opacity={isInChain ? 0.6 : 0.12}
              />
            );
          })}

          {/* Central circle */}
          <circle cx={CX} cy={CY} r={CENTER_R} fill="hsl(var(--primary))" opacity="0.08" />
          <circle cx={CX} cy={CY} r={CENTER_R} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.6" />

          {/* Central theme text */}
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill="hsl(var(--primary))" className="font-display">
            {themeLabel}
          </text>
          <text x={CX} y={CY + 18} textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))" opacity="0.7">
            {references.length} referências cruzadas
          </text>

          {/* Reference nodes */}
          {references.map((ref, i) => {
            const pos = getNodePos(i);
            const isSelected = selectedRef === ref.ref;
            const textLen = ref.ref.length;
            const boxW = Math.max(100, textLen * 8 + 30);
            const boxH = 32;

            return (
              <g
                key={`node-${i}`}
                onClick={(e) => { e.stopPropagation(); handleNodeClick(ref); }}
                onMouseEnter={(e) => {
                  const svgEl = containerRef.current?.querySelector('svg');
                  if (svgEl) {
                    const rect = svgEl.getBoundingClientRect();
                    const viewBox = svgEl.viewBox.baseVal;
                    const scaleX = rect.width / viewBox.width;
                    const scaleY = rect.height / viewBox.height;
                    const scale = Math.min(scaleX, scaleY);
                    const offsetX = (rect.width - viewBox.width * scale) / 2;
                    const offsetY = (rect.height - viewBox.height * scale) / 2;
                    const screenX = (pos.x - viewBox.x) * scale + offsetX + rect.left;
                    const screenY = (pos.y - viewBox.y) * scale + offsetY + rect.top;
                    const containerRect = containerRef.current!.getBoundingClientRect();
                    setHoveredRef({
                      ref,
                      x: (screenX - containerRect.left) * (1 / zoom) + pan.x * (1 / zoom - 1),
                      y: (screenY - containerRect.top) * (1 / zoom) + pan.y * (1 / zoom - 1),
                    });
                  }
                }}
                onMouseLeave={() => setHoveredRef(null)}
                style={{ cursor: 'pointer' }}
                className="transition-transform"
              >
                {/* Glow on selected */}
                {isSelected && (
                  <rect
                    x={pos.x - boxW / 2 - 3} y={pos.y - boxH / 2 - 3}
                    width={boxW + 6} height={boxH + 6}
                    rx="10"
                    fill="none"
                    stroke={ref.color}
                    strokeWidth="2"
                    opacity="0.4"
                  />
                )}

                {/* Card background */}
                <rect
                  x={pos.x - boxW / 2} y={pos.y - boxH / 2}
                  width={boxW} height={boxH}
                  rx="8"
                  fill="hsl(var(--card))"
                  stroke={ref.color}
                  strokeWidth={isSelected ? 2 : 1}
                  opacity={1}
                />

                {/* Order badge */}
                <circle
                  cx={pos.x - boxW / 2 + 14} cy={pos.y}
                  r="9"
                  fill={ref.color}
                />
                <text
                  x={pos.x - boxW / 2 + 14} y={pos.y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="800"
                  fill="white"
                >
                  {ref.order}
                </text>

                {/* Reference text */}
                <text
                  x={pos.x + 8} y={pos.y + 5}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={ref.color}
                >
                  {ref.ref}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredRef && hoveredRef.ref.snippet && (
          <div
            className="absolute z-50 pointer-events-none animate-fade-in"
            style={{
              left: `${hoveredRef.x}px`,
              top: `${hoveredRef.y - 50}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 max-w-[260px]">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredRef.ref.color }} />
                <span className="text-xs font-bold" style={{ color: hoveredRef.ref.color }}>{hoveredRef.ref.ref}</span>
                <span className="text-[10px] text-muted-foreground">({hoveredRef.ref.category})</span>
              </div>
              <p className="text-xs text-popover-foreground leading-relaxed italic">
                "{hoveredRef.ref.snippet}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-1.5">
        {Array.from(new Set(references.map(r => r.category))).map(cat => {
          const c = references.filter(r => r.category === cat).length;
          const color = references.find(r => r.category === cat)?.color || 'hsl(var(--primary))';
          return (
            <span key={cat} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
              style={{ borderColor: color, color, backgroundColor: `${color}10` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              {cat} ({c})
            </span>
          );
        })}
      </div>

      {/* Expandable reading list */}
      <div className="space-y-1">
        <button
          onClick={() => setShowReadingList(!showReadingList)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          {showReadingList ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          📋 Ordem de Leitura Progressiva ({references.length})
        </button>
        {showReadingList && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto mt-2 animate-fade-in">
            {references.map((ref) => {
              const url = getBibleUrl(ref.ref);
              const isSelected = selectedRef === ref.ref;
              return (
                <button
                  key={ref.order}
                  onClick={() => setSelectedRef(ref.ref)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs font-medium transition-all text-left ${isSelected ? 'ring-2 ring-primary bg-primary/5 border-primary/30' : 'hover:bg-muted/50 border-border'}`}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0 text-white"
                    style={{ backgroundColor: ref.color }}>
                    {ref.order}
                  </span>
                  <span className="font-bold truncate" style={{ color: ref.color }}>{ref.ref}</span>
                  <span className="text-[9px] text-muted-foreground truncate hidden sm:inline">{ref.category}</span>
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
        )}
      </div>
    </div>
  );
}
