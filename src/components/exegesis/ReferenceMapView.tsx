import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';

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

// Category colors
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

function extractReferences(content: string): { ref: string; category: string; color: string }[] {
  const refs: { ref: string; category: string; color: string }[] = [];
  const seen = new Set<string>();

  let currentCategory = '';
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
        refs.push({ ref: fullRef, category: currentCategory || 'GERAL', color });
      }
    }
  }

  return refs;
}

export function ReferenceMapView({ centralTheme, content, keywords }: ReferenceMapProps) {
  const references = useMemo(() => extractReferences(content), [content]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  if (references.length === 0) return null;

  // Limit to 18 on the map for clarity, show rest in list
  const mapRefs = references.slice(0, 18);
  const total = mapRefs.length;

  // Position refs in a single clean circle with generous radius
  const getPos = (i: number, count: number) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    const radius = 38;
    return {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    };
  };

  const selectedUrl = selectedRef ? getBibleUrl(selectedRef) : null;

  return (
    <div className="card-library p-4 sm:p-6 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        🗺️ Mapa de Referências Cruzadas
      </h3>

      {/* Selected reference action */}
      {selectedRef && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-3 animate-in fade-in">
          <span className="text-sm font-semibold text-primary">📖 {selectedRef}</span>
          {selectedUrl && (
            <a
              href={selectedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ler na Bíblia Online (ACF)
            </a>
          )}
        </div>
      )}

      {/* Visual Map - clean layout */}
      <div className="relative w-full" style={{ paddingBottom: '85%', maxHeight: '600px' }}>
        <div className="absolute inset-0">
          <svg viewBox="0 0 100 85" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Connection lines */}
            {mapRefs.map((_, i) => {
              const pos = getPos(i, total);
              return (
                <line
                  key={`line-${i}`}
                  x1="50" y1="42.5"
                  x2={pos.x} y2={pos.y}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.12"
                  strokeDasharray="0.6,0.4"
                  opacity="0.5"
                />
              );
            })}

            {/* Central circle */}
            <circle cx="50" cy="42.5" r="8" fill="hsl(var(--primary))" opacity="0.12" />
            <circle cx="50" cy="42.5" r="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.25" />

            {/* Central text */}
            <foreignObject x="38" y="37" width="24" height="11">
              <div
                className="flex items-center justify-center h-full text-center px-1"
                style={{ fontSize: '2px', lineHeight: '1.3' }}
              >
                <span className="font-display font-bold" style={{ color: 'hsl(var(--primary))' }}>
                  {centralTheme.length > 40 ? centralTheme.slice(0, 40) + '…' : centralTheme}
                </span>
              </div>
            </foreignObject>

            {/* Reference nodes */}
            {mapRefs.map((ref, i) => {
              const pos = getPos(i, total);
              const isSelected = selectedRef === ref.ref;
              const textLen = ref.ref.length;
              const boxW = Math.max(10, textLen * 0.85);
              const boxH = 3.2;

              return (
                <g
                  key={`node-${i}`}
                  onClick={() => setSelectedRef(selectedRef === ref.ref ? null : ref.ref)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={pos.x - boxW / 2} y={pos.y - boxH / 2}
                    width={boxW} height={boxH}
                    rx="1.2"
                    fill={isSelected ? ref.color : 'hsl(var(--background))'}
                    opacity={isSelected ? 0.2 : 1}
                    stroke={ref.color}
                    strokeWidth={isSelected ? '0.3' : '0.15'}
                  />
                  <text
                    x={pos.x} y={pos.y + 0.6}
                    textAnchor="middle"
                    fontSize="1.6"
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
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          📊 {references.length} referências encontradas em {new Set(references.map(r => r.category)).size} categorias
          {references.length > 18 && <span className="text-muted-foreground/60"> • {references.length - 18} adicionais na lista abaixo</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set(references.map(r => r.category))).map(cat => {
            const count = references.filter(r => r.category === cat).length;
            const color = references.find(r => r.category === cat)?.color || 'hsl(var(--primary))';
            return (
              <span
                key={cat}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                style={{ borderColor: color, color, backgroundColor: `${color}10` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {cat} ({count})
              </span>
            );
          })}
        </div>
      </div>

      {/* Clickable reference list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-64 overflow-y-auto">
        {references.map((ref, i) => {
          const url = getBibleUrl(ref.ref);
          return (
            <a
              key={i}
              href={url || '#'}
              target={url ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={(e) => { if (!url) e.preventDefault(); setSelectedRef(ref.ref); }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ borderColor: `${ref.color}40`, color: ref.color, backgroundColor: `${ref.color}08` }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ref.color }} />
              <span className="font-bold truncate">{ref.ref}</span>
              {url && <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-50" />}
            </a>
          );
        })}
      </div>
    </div>
  );
}
