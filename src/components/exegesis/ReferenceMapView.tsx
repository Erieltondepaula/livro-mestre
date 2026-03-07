import { useMemo } from 'react';

interface ReferenceMapProps {
  centralTheme: string;
  content: string;
  keywords: string[];
}

// Extract bible references from markdown content
function extractReferences(content: string): { ref: string; category: string; color: string }[] {
  const refs: { ref: string; category: string; color: string }[] = [];
  const seen = new Set<string>();

  // Category colors (HSL-based for theme consistency)
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

  let currentCategory = '';
  const lines = content.split('\n');

  for (const line of lines) {
    // Detect category headers
    const catMatch = line.match(/#{2,3}\s*[📖📝🔤🗺️🔗🔮⛪📜⚖️✉️🌅🌐🏆]?\s*\d*\.?\s*(.*?)(?:\s*[\(（]|$)/);
    if (catMatch) {
      const headerText = catMatch[1].toUpperCase();
      for (const cat of Object.keys(categoryColors)) {
        if (headerText.includes(cat)) {
          currentCategory = cat;
          break;
        }
      }
      if (headerText.includes('TOP')) currentCategory = 'TOP';
    }

    // Extract bible references like "João 3:16", "Romanos 5:8", "1 Crônicas 29:11"
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

// Arrange items in concentric rings
function getPosition(index: number, total: number, ringRadius: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: 50 + ringRadius * Math.cos(angle),
    y: 50 + ringRadius * Math.sin(angle),
  };
}

export function ReferenceMapView({ centralTheme, content, keywords }: ReferenceMapProps) {
  const references = useMemo(() => extractReferences(content), [content]);

  if (references.length === 0) return null;

  // Split into rings if many references
  const ring1 = references.slice(0, Math.min(12, references.length));
  const ring2 = references.slice(12, Math.min(24, references.length));
  const ring3 = references.slice(24, Math.min(36, references.length));

  // Highlight keywords in the central theme
  const highlightTheme = (text: string) => {
    if (!keywords.length) return text;
    const pattern = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return text.replace(pattern, '**$1**');
  };

  const highlightedTheme = highlightTheme(centralTheme);
  const themeParts = highlightedTheme.split(/\*\*(.*?)\*\*/g);

  return (
    <div className="card-library p-4 sm:p-6 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        🗺️ Mapa de Referências Cruzadas
      </h3>

      {/* Visual Map */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: '100%', maxHeight: '700px' }}>
        <div className="absolute inset-0">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Connection lines - Ring 1 */}
            {ring1.map((_, i) => {
              const pos = getPosition(i, ring1.length, 30);
              return (
                <line
                  key={`line1-${i}`}
                  x1="50" y1="50"
                  x2={pos.x} y2={pos.y}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.15"
                  strokeDasharray="0.5,0.3"
                  opacity="0.6"
                />
              );
            })}
            {/* Connection lines - Ring 2 */}
            {ring2.map((_, i) => {
              const pos = getPosition(i, ring2.length, 42);
              return (
                <line
                  key={`line2-${i}`}
                  x1="50" y1="50"
                  x2={pos.x} y2={pos.y}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.1"
                  strokeDasharray="0.4,0.3"
                  opacity="0.4"
                />
              );
            })}

            {/* Central theme circle */}
            <circle cx="50" cy="50" r="10" fill="hsl(var(--primary))" opacity="0.15" />
            <circle cx="50" cy="50" r="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" />

            {/* Ring 1 nodes */}
            {ring1.map((ref, i) => {
              const pos = getPosition(i, ring1.length, 30);
              return (
                <g key={`node1-${i}`}>
                  <rect
                    x={pos.x - 7} y={pos.y - 1.8}
                    width="14" height="3.6"
                    rx="1.2"
                    fill={ref.color}
                    opacity="0.12"
                    stroke={ref.color}
                    strokeWidth="0.15"
                  />
                  <text
                    x={pos.x} y={pos.y + 0.5}
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

            {/* Ring 2 nodes */}
            {ring2.map((ref, i) => {
              const pos = getPosition(i, ring2.length, 42);
              return (
                <g key={`node2-${i}`}>
                  <rect
                    x={pos.x - 6.5} y={pos.y - 1.5}
                    width="13" height="3"
                    rx="1"
                    fill={ref.color}
                    opacity="0.08"
                    stroke={ref.color}
                    strokeWidth="0.1"
                  />
                  <text
                    x={pos.x} y={pos.y + 0.4}
                    textAnchor="middle"
                    fontSize="1.4"
                    fontWeight="600"
                    fill={ref.color}
                    opacity="0.85"
                    className="font-body"
                  >
                    {ref.ref}
                  </text>
                </g>
              );
            })}

            {/* Central text */}
            <foreignObject x="37" y="44" width="26" height="12">
              <div
                className="flex items-center justify-center h-full text-center"
                style={{ fontSize: '2.2px', lineHeight: '1.3' }}
              >
                <span className="font-display font-bold" style={{ color: 'hsl(var(--primary))' }}>
                  {themeParts.map((part, i) =>
                    i % 2 === 1 ? (
                      <span key={i} style={{ textDecoration: 'underline', fontWeight: 900 }}>{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </span>
              </div>
            </foreignObject>
          </svg>
        </div>
      </div>

      {/* Legend / list view */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          📊 {references.length} referências encontradas em {new Set(references.map(r => r.category)).size} categorias
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

      {/* Scrollable reference list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-64 overflow-y-auto">
        {references.map((ref, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium"
            style={{ borderColor: `${ref.color}40`, color: ref.color, backgroundColor: `${ref.color}08` }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ref.color }} />
            <span className="font-bold truncate">{ref.ref}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
