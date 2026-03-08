import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { ExternalLink, ZoomIn, ZoomOut, Maximize2, Minimize2, X, Maximize, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Reuse bible slugs and helpers
const BIBLE_ONLINE_SLUGS: Record<string, string> = {
  'Gênesis': 'gn', 'Gn': 'gn', 'Êxodo': 'ex', 'Ex': 'ex', 'Levítico': 'lv', 'Lv': 'lv',
  'Números': 'nm', 'Nm': 'nm', 'Deuteronômio': 'dt', 'Dt': 'dt',
  'Josué': 'js', 'Js': 'js', 'Juízes': 'jz', 'Jz': 'jz', 'Rute': 'rt', 'Rt': 'rt',
  '1 Samuel': '1sm', '1 Sm': '1sm', '2 Samuel': '2sm', '2 Sm': '2sm',
  '1 Reis': '1rs', '1 Rs': '1rs', '2 Reis': '2rs', '2 Rs': '2rs',
  '1 Crônicas': '1cr', '1 Cr': '1cr', '2 Crônicas': '2cr', '2 Cr': '2cr',
  'Esdras': 'ed', 'Ed': 'ed', 'Neemias': 'ne', 'Ne': 'ne', 'Ester': 'et', 'Et': 'et', 'Jó': 'jó',
  'Salmos': 'sl', 'Sl': 'sl', 'Provérbios': 'pv', 'Pv': 'pv', 'Eclesiastes': 'ec', 'Ec': 'ec',
  'Cânticos': 'ct', 'Ct': 'ct', 'Isaías': 'is', 'Is': 'is', 'Jeremias': 'jr', 'Jr': 'jr',
  'Lamentações': 'lm', 'Lm': 'lm', 'Ezequiel': 'ez', 'Ez': 'ez', 'Daniel': 'dn', 'Dn': 'dn',
  'Oséias': 'os', 'Os': 'os', 'Joel': 'jl', 'Jl': 'jl', 'Amós': 'am', 'Am': 'am',
  'Obadias': 'ob', 'Ob': 'ob', 'Jonas': 'jn', 'Jn': 'jn', 'Miquéias': 'mq', 'Mq': 'mq',
  'Naum': 'na', 'Na': 'na', 'Habacuque': 'hc', 'Hc': 'hc', 'Sofonias': 'sf', 'Sf': 'sf',
  'Ageu': 'ag', 'Ag': 'ag', 'Zacarias': 'zc', 'Zc': 'zc', 'Malaquias': 'ml', 'Ml': 'ml',
  'Mateus': 'mt', 'Mt': 'mt', 'Marcos': 'mc', 'Mc': 'mc', 'Lucas': 'lc', 'Lc': 'lc',
  'João': 'jo', 'Jo': 'jo', 'Atos': 'atos', 'At': 'atos',
  'Romanos': 'rm', 'Rm': 'rm', '1 Coríntios': '1co', '1 Co': '1co', '2 Coríntios': '2co', '2 Co': '2co',
  'Gálatas': 'gl', 'Gl': 'gl', 'Efésios': 'ef', 'Ef': 'ef', 'Filipenses': 'fp', 'Fp': 'fp',
  'Colossenses': 'cl', 'Cl': 'cl', '1 Tessalonicenses': '1ts', '1 Ts': '1ts',
  '2 Tessalonicenses': '2ts', '2 Ts': '2ts', '1 Timóteo': '1tm', '1 Tm': '1tm',
  '2 Timóteo': '2tm', '2 Tm': '2tm', 'Tito': 'tt', 'Tt': 'tt', 'Filemom': 'fm', 'Fm': 'fm',
  'Hebreus': 'hb', 'Hb': 'hb', 'Tiago': 'tg', 'Tg': 'tg', '1 Pedro': '1pe', '1 Pe': '1pe',
  '2 Pedro': '2pe', '2 Pe': '2pe', '1 João': '1jo', '1 Jo': '1jo', '2 João': '2jo', '2 Jo': '2jo',
  '3 João': '3jo', '3 Jo': '3jo', 'Judas': 'jd', 'Jd': 'jd', 'Apocalipse': 'ap', 'Ap': 'ap',
};

function getBibleUrl(ref: string): string | null {
  const match = ref.match(/^((?:\d\s?)?[A-ZÀ-Ú][a-zà-ú]*(?:\s[a-zà-ú]+)?)\s+(\d+)/);
  if (!match) return null;
  const slug = BIBLE_ONLINE_SLUGS[match[1].trim()];
  if (!slug) return null;
  return `https://www.bibliaonline.com.br/acf/${slug}/${match[2]}`;
}

// Semantic color palette — each category has a meaningful color
const categoryColorMap: Record<string, { color: string; meaning: string; icon: string }> = {
  'TEMÁTICAS':       { color: 'hsl(0, 75%, 48%)',   meaning: 'Conexões por tema central',        icon: '🎯' },
  'VOCABULARES':     { color: 'hsl(28, 85%, 48%)',   meaning: 'Palavras-chave compartilhadas',    icon: '📝' },
  'LINGUÍSTICAS':    { color: 'hsl(45, 85%, 45%)',   meaning: 'Estrutura linguística similar',     icon: '🔤' },
  'CONTEXTUAIS':     { color: 'hsl(140, 60%, 38%)',  meaning: 'Mesmo contexto histórico',          icon: '📜' },
  'TIPOLÓGICAS':     { color: 'hsl(170, 65%, 38%)',  meaning: 'Tipo → Antítipo (sombra e cumprimento)', icon: '🪞' },
  'PROFÉTICAS':      { color: 'hsl(210, 75%, 48%)',  meaning: 'Profecia e cumprimento',            icon: '🔮' },
  'DOUTRINÁRIAS':    { color: 'hsl(240, 65%, 52%)',  meaning: 'Fundamento doutrinário',            icon: '⛪' },
  'NARRATIVAS':      { color: 'hsl(270, 60%, 52%)',  meaning: 'Paralelos narrativos',              icon: '📖' },
  'COMPARATIVAS':    { color: 'hsl(300, 55%, 48%)',  meaning: 'Contraste ou comparação',           icon: '⚖️' },
  'APOSTÓLICAS':     { color: 'hsl(330, 70%, 48%)',  meaning: 'Ensino apostólico',                 icon: '✉️' },
  'ESCATOLÓGICAS':   { color: 'hsl(75, 65%, 40%)',   meaning: 'Últimos tempos e eternidade',       icon: '⏳' },
  'PANORAMA':        { color: 'hsl(155, 60%, 38%)',  meaning: 'Visão panorâmica bíblica',          icon: '🌍' },
  'TOP':             { color: 'hsl(350, 80%, 48%)',  meaning: 'Referências principais',            icon: '⭐' },
  'GERAL':           { color: 'hsl(25, 55%, 42%)',   meaning: 'Referência geral',                  icon: '📌' },
};

function getCategoryColor(cat: string): string {
  return categoryColorMap[cat]?.color || 'hsl(25, 55%, 42%)';
}

interface RefData {
  ref: string;
  category: string;
  color: string;
  order: number;
  snippet: string;
  conceptLabel: string;
}

function extractReferences(content: string): RefData[] {
  const refs: RefData[] = [];
  const seen = new Set<string>();
  let currentCategory = '';
  let orderCounter = 1;
  const lines = content.split('\n');

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (/^#{2,3}\s/.test(line)) {
      const headerText = line.toUpperCase();
      for (const cat of Object.keys(categoryColorMap)) {
        if (headerText.includes(cat)) { currentCategory = cat; break; }
      }
      if (headerText.includes('TOP')) currentCategory = 'TOP';
    }

    const refPattern = /((?:\d\s?)?[A-ZÀ-Ú][a-zà-úÀ-Ú]*(?:\s(?:de\s)?[a-zà-úÀ-Ú]+)?)\s+(\d+):(\d+(?:\s?[-–,]\s?\d+)*)/g;
    let match;
    while ((match = refPattern.exec(line)) !== null) {
      const bookName = match[1].trim();
      if (bookName.length < 2) continue;
      const skipWords = new Set(['Strong', 'Campo', 'Verso', 'Nota', 'Item', 'Seção', 'Parte', 'Total', 'Tipo']);
      if (skipWords.has(bookName)) continue;

      const fullRef = `${bookName} ${match[2]}:${match[3]}`;
      if (!seen.has(fullRef)) {
        seen.add(fullRef);
        // Extract concept label from surrounding bold text or snippet
        let conceptLabel = '';
        // Try to find bold text near the reference: **ConceptLabel**
        const boldMatch = line.match(/\*\*([^*]+)\*\*/);
        if (boldMatch) {
          conceptLabel = boldMatch[1].replace(/[📖🔗⚡💡🔥✝️📜🕊️⭐🌟💎🏆❤️🙏]/g, '').trim();
        }
        // Fallback: use category name
        if (!conceptLabel) conceptLabel = currentCategory || 'Referência';
        // Clean up
        if (conceptLabel.length > 25) conceptLabel = conceptLabel.slice(0, 22) + '…';

        let snippetParts: string[] = [];
        const afterRef = line.slice(match.index + match[0].length).replace(/^[\s\]\)\-–—:*"]+/, '').replace(/[*_`\[\]]/g, '').trim();
        if (afterRef) snippetParts.push(afterRef);
        for (let ci = li + 1; ci < lines.length; ci++) {
          const contLine = lines[ci].trim();
          if (!contLine || contLine.startsWith('#')) break;
          if (/((?:\d\s?)?[A-ZÀ-Ú][a-zà-úÀ-Ú]+(?:\s[a-zà-úÀ-Ú]+)?)\s+\d+:\d+/.test(contLine)) break;
          snippetParts.push(contLine.replace(/[*_`\[\]]/g, ''));
        }
        const snippet = snippetParts.join(' ').trim();
        refs.push({ ref: fullRef, category: currentCategory || 'GERAL', color: '', order: orderCounter++, snippet, conceptLabel });
      }
    }
  }

  // Assign colors by category
  refs.forEach((r) => {
    r.color = getCategoryColor(r.category);
  });

  return refs;
}

interface ReferenceMapProps {
  centralTheme: string;
  content: string;
  keywords: string[];
}

export function ReferenceMapOrganic({ centralTheme, content, keywords }: ReferenceMapProps) {
  const references = useMemo(() => extractReferences(content), [content]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const isMobile = screenWidth < 640;

  const count = references.length;
  const CX = 500;
  const CY = 500;

  // Organic radial layout with slight randomness for organic feel
  const NODES_PER_RING = isMobile ? Math.min(5, Math.max(3, Math.ceil(count / 3))) : Math.min(7, Math.max(4, Math.ceil(count / 3)));
  const RING_BASE = isMobile ? 160 : 240;
  const RING_SPACING = isMobile ? 130 : 200;

  // Seeded pseudo-random for consistent organic offsets
  const organicOffsets = useMemo(() => {
    const offsets: { dx: number; dy: number; angle: number }[] = [];
    for (let i = 0; i < Math.max(count, 20); i++) {
      const seed = (i * 137.508 + 42) % 100;
      offsets.push({
        dx: (seed % 30) - 15,
        dy: ((seed * 3) % 30) - 15,
        angle: ((seed * 7) % 20) - 10,
      });
    }
    return offsets;
  }, [count]);

  const getNodePos = useCallback((i: number) => {
    const ringIndex = Math.floor(i / NODES_PER_RING);
    const posInRing = i % NODES_PER_RING;
    const nodesInThisRing = Math.min(NODES_PER_RING, count - ringIndex * NODES_PER_RING);
    const radius = RING_BASE + ringIndex * RING_SPACING;
    const angleOffset = ringIndex * (Math.PI / NODES_PER_RING);
    const angle = (posInRing / nodesInThisRing) * 2 * Math.PI - Math.PI / 2 + angleOffset;
    const off = organicOffsets[i] || { dx: 0, dy: 0 };
    return {
      x: CX + radius * Math.cos(angle) + off.dx,
      y: CY + radius * Math.sin(angle) + off.dy,
    };
  }, [count, NODES_PER_RING, RING_BASE, RING_SPACING, organicOffsets]);

  // ViewBox
  const allPositions = count > 0 ? references.map((_, i) => getNodePos(i)) : [];
  const xs = allPositions.map(p => p.x);
  const ys = allPositions.map(p => p.y);
  const padding = isMobile ? 80 : 160;
  const minX = count > 0 ? Math.min(CX - 100, ...xs) - padding : CX - 300;
  const minY = count > 0 ? Math.min(CY - 100, ...ys) - padding : CY - 300;
  const maxX = count > 0 ? Math.max(CX + 100, ...xs) + padding : CX + 300;
  const maxY = count > 0 ? Math.max(CY + 100, ...ys) + padding : CY + 300;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  const baseHeight = isMobile ? Math.max(380, window.innerHeight * 0.6) : Math.max(550, Math.min(1000, vbH * 0.8));
  const containerHeight = isFullscreen ? undefined : baseHeight;

  // Auto-fit zoom
  useEffect(() => {
    if (!isMobile || count === 0) return;
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const cW = containerRef.current.clientWidth;
      const cH = containerRef.current.clientHeight || baseHeight;
      const autoZoom = Math.min(cW / vbW, cH / vbH) * 1.05;
      setZoom(Math.max(0.4, Math.min(3, autoZoom)));
    }, 100);
    return () => clearTimeout(timer);
  }, [count, isMobile, screenWidth]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!fullscreenRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (fullscreenRef.current.requestFullscreen) {
      fullscreenRef.current.requestFullscreen().catch(() => setIsFullscreen(prev => !prev));
    } else {
      setIsFullscreen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Pan & zoom handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) });
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
      setZoom(z => Math.max(0.3, Math.min(4, z * (dist / lastTouchDistance.current!))));
      lastTouchDistance.current = dist;
    } else if (isPanning && e.touches.length === 1) {
      setPan({ x: panStart.current.panX + (e.touches[0].clientX - panStart.current.x), y: panStart.current.panY + (e.touches[0].clientY - panStart.current.y) });
    }
  }, [isPanning]);
  const handleTouchEnd = useCallback(() => { setIsPanning(false); lastTouchDistance.current = null; }, []);

  // Curved arrow path from center to node
  const getCurvedPath = (i: number) => {
    const pos = getNodePos(i);
    const dx = pos.x - CX;
    const dy = pos.y - CY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Control point perpendicular to the line, creating a curve
    const mid = { x: CX + dx * 0.5, y: CY + dy * 0.5 };
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const curvature = (organicOffsets[i]?.angle || 0) * 2 + (i % 2 === 0 ? 30 : -30);
    const cp = { x: mid.x + perpX * curvature, y: mid.y + perpY * curvature };
    return `M ${CX} ${CY} Q ${cp.x} ${cp.y} ${pos.x} ${pos.y}`;
  };

  // Central theme lines
  const isLongTheme = centralTheme.length > 15;
  const centralW = isLongTheme ? Math.min(isMobile ? 240 : 300, centralTheme.length * 9 + 30) : (isMobile ? 120 : 160);
  const themeLines: string[] = [];
  if (isLongTheme) {
    const words = centralTheme.split(' ');
    let line = '';
    const maxChars = Math.floor(centralW / 9);
    for (const word of words) {
      if ((line + ' ' + word).trim().length > maxChars && line) {
        themeLines.push(line.trim());
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) themeLines.push(line.trim());
  } else {
    themeLines.push(centralTheme);
  }

  if (count === 0) return null;

  const selectedData = selectedRef ? references.find(r => r.ref === selectedRef) : null;
  const selectedUrl = selectedRef ? getBibleUrl(selectedRef) : null;

  return (
    <div ref={fullscreenRef} className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'card-library'} p-4 sm:p-6 ${isFullscreen ? 'flex flex-col h-full overflow-hidden' : 'space-y-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          🌿 Mapa Orgânico
          <span className="text-[10px] font-normal normal-case bg-accent/50 text-accent-foreground px-2 py-0.5 rounded-full">
            {references.length} referências
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(z - 0.3, 0.3))}><ZoomOut className="w-3.5 h-3.5" /></Button>
          <span className="text-[10px] text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(z + 0.3, 4))}><ZoomIn className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Maximize2 className="w-3.5 h-3.5" /></Button>
          {isFullscreen && (
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:hidden" onClick={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setIsFullscreen(false); }}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Selected reference bar */}
      {selectedData && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-accent/20 border border-accent/30 rounded-lg p-3 animate-fade-in">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold" style={{ color: selectedData.color }}>📖 {selectedData.conceptLabel}</span>
            <span className="text-xs text-muted-foreground">• {selectedData.ref}</span>
          </div>
          {selectedUrl && (
            <a href={selectedUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-md">
              <ExternalLink className="w-3.5 h-3.5" /> Ler na Bíblia (ACF)
            </a>
          )}
        </div>
      )}

      {/* SVG Map */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-xl border border-border ${isFullscreen ? 'flex-1' : 'w-full'}`}
        style={{
          height: isFullscreen ? undefined : `${containerHeight}px`,
          cursor: isPanning ? 'grabbing' : 'grab',
          touchAction: 'none',
          background: 'linear-gradient(135deg, hsl(40 30% 97%), hsl(30 20% 95%))',
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
          <defs>
            {/* Arrow marker */}
            <marker id="arrowOrganic" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(25, 50%, 55%)" opacity="0.7" />
            </marker>
            {/* Decorative swirl gradient */}
            <radialGradient id="centerGlowOrganic" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(35, 60%, 70%)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(35, 60%, 70%)" stopOpacity="0.05" />
            </radialGradient>
          </defs>

          {/* Decorative swirl rings (subtle) */}
          {[1, 2, 3].map((ring) => (
            <ellipse
              key={`swirl-${ring}`}
              cx={CX}
              cy={CY}
              rx={RING_BASE * ring * 0.45}
              ry={RING_BASE * ring * 0.4}
              fill="none"
              stroke="hsl(35, 40%, 75%)"
              strokeWidth="0.8"
              opacity="0.25"
              strokeDasharray="8,12"
              transform={`rotate(${ring * 15}, ${CX}, ${CY})`}
            />
          ))}

          {/* Curved arrow connections from center to each node */}
          {references.map((ref, i) => {
            const isSelected = selectedRef === ref.ref;
            const isCatActive = !activeCategory || ref.category === activeCategory;
            const dimmed = activeCategory && ref.category !== activeCategory;
            return (
              <path
                key={`curve-${i}`}
                d={getCurvedPath(i)}
                fill="none"
                stroke={ref.color}
                strokeWidth={isSelected ? 2.5 : isCatActive ? 1.8 : 1}
                strokeDasharray={isSelected ? 'none' : undefined}
                opacity={dimmed ? 0.1 : isSelected ? 0.9 : 0.45}
                markerEnd="url(#arrowOrganic)"
                style={{ transition: 'opacity 0.3s, stroke-width 0.3s' }}
              />
            );
          })}

          {/* Central theme */}
          <ellipse cx={CX} cy={CY} rx={centralW / 2 + 10} ry={isMobile ? 45 : 55} fill="url(#centerGlowOrganic)" />
          <ellipse cx={CX} cy={CY} rx={centralW / 2 + 10} ry={isMobile ? 45 : 55} fill="none" stroke="hsl(30, 50%, 60%)" strokeWidth="2" opacity="0.5" />

          {themeLines.map((line, li) => {
            const lineHeight = isMobile ? 16 : 20;
            const startY = CY - ((themeLines.length - 1) * lineHeight) / 2;
            return (
              <text key={`theme-${li}`} x={CX} y={startY + li * lineHeight} textAnchor="middle"
                fontSize={isMobile ? "13" : "17"} fontWeight="800"
                fill="hsl(25, 55%, 35%)" fontFamily="Georgia, serif">
                {line}
              </text>
            );
          })}

          {/* Reference nodes */}
          {references.map((ref, i) => {
            const pos = getNodePos(i);
            const isSelected = selectedRef === ref.ref;
            const dimmed = activeCategory && ref.category !== activeCategory;
            const labelLen = ref.conceptLabel.length;
            const refLen = ref.ref.length;
            const boxW = isMobile ? Math.max(90, Math.max(labelLen, refLen) * 7 + 20) : Math.max(110, Math.max(labelLen, refLen) * 8.5 + 24);

            return (
              <g
                key={`node-${i}`}
                onClick={(e) => { e.stopPropagation(); setSelectedRef(selectedRef === ref.ref ? null : ref.ref); }}
                style={{ cursor: 'pointer', opacity: dimmed ? 0.12 : 1, transition: 'opacity 0.3s' }}
              >
                {isSelected && (
                  <ellipse cx={pos.x} cy={pos.y} rx={boxW / 2 + 8} ry={isMobile ? 26 : 30}
                    fill={ref.color} opacity="0.15" />
                )}
                <text x={pos.x} y={pos.y - (isMobile ? 5 : 7)} textAnchor="middle"
                  fontSize={isMobile ? "11" : "14"} fontWeight="800"
                  fill={ref.color} fontFamily="Georgia, serif">
                  {ref.conceptLabel}
                </text>
                <text x={pos.x} y={pos.y + (isMobile ? 10 : 12)} textAnchor="middle"
                  fontSize={isMobile ? "8" : "10"} fontWeight="600"
                  fill="hsl(25, 40%, 50%)" opacity="0.85">
                  • {ref.ref}
                </text>
                <rect x={pos.x - boxW / 2} y={pos.y - 20} width={boxW} height={40}
                  fill="transparent" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Category legend with meanings */}
      <div className="mt-3 space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">🎨 Legenda de Cores</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set(references.map(r => r.category))).map(cat => {
            const c = references.filter(r => r.category === cat).length;
            const catInfo = categoryColorMap[cat] || { color: 'hsl(25, 55%, 42%)', meaning: 'Referência', icon: '📌' };
            return (
              <span key={cat} className="group relative inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border cursor-help"
                style={{ borderColor: catInfo.color, color: catInfo.color, backgroundColor: `${catInfo.color}10` }}
                title={catInfo.meaning}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catInfo.color }} />
                <span>{catInfo.icon} {cat}</span>
                <span className="text-muted-foreground">({c})</span>
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          {Array.from(new Set(references.map(r => r.category))).map(cat => {
            const catInfo = categoryColorMap[cat] || { color: 'hsl(25, 55%, 42%)', meaning: 'Referência', icon: '📌' };
            return (
              <span key={`desc-${cat}`} className="text-[9px] text-muted-foreground">
                <span className="font-semibold" style={{ color: catInfo.color }}>{catInfo.icon} {cat}:</span> {catInfo.meaning}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
