import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, Download, List, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;

interface MapLocation {
  name: string;
  lat: number;
  lng: number;
  description?: string;
  type?: 'city' | 'region' | 'mountain' | 'water' | 'route';
}

interface BiblicalMapProps {
  passage: string;
  locations: MapLocation[];
  className?: string;
  showRoute?: boolean;
}

const TYPE_CONFIG: Record<string, { color: string; label: string; emoji: string; radius: number }> = {
  city: { color: '#DC2626', label: 'Cidade', emoji: '🏛️', radius: 8 },
  region: { color: '#7C3AED', label: 'Região', emoji: '🗺️', radius: 10 },
  mountain: { color: '#16A34A', label: 'Monte', emoji: '⛰️', radius: 9 },
  water: { color: '#0EA5E9', label: 'Corpo d\'água', emoji: '🌊', radius: 9 },
  route: { color: '#D97706', label: 'Rota', emoji: '🛤️', radius: 7 },
};

const ROUTE_COLOR = '#B45309';
const ROUTE_DASH = '8, 6';

export function BiblicalMap({ passage, locations, className = '', showRoute = true }: BiblicalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [routeVisible, setRouteVisible] = useState(showRoute);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || locations.length === 0) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    });

    // Use a visually richer tile layer (Stamen Terrain style via Stadia)
    L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia</a> &copy; <a href="https://stamen.com">Stamen</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Add numbered markers with permanent labels
    const markers: L.Marker[] = [];
    locations.forEach((loc, index) => {
      const config = TYPE_CONFIG[loc.type || 'city'] || TYPE_CONFIG.city;
      const num = index + 1;

      // Numbered circle marker
      const icon = L.divIcon({
        className: 'biblical-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              background: ${config.color};
              width: 28px;
              height: 28px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 700;
              font-size: 12px;
              font-family: sans-serif;
            ">${num}</div>
            <div style="
              position: absolute;
              top: -8px;
              left: 32px;
              background: rgba(255,255,255,0.95);
              border: 1px solid ${config.color};
              border-radius: 4px;
              padding: 2px 6px;
              font-size: 11px;
              font-weight: 600;
              color: #1a1a1a;
              white-space: nowrap;
              box-shadow: 0 1px 4px rgba(0,0,0,0.15);
              font-family: sans-serif;
            ">${config.emoji} ${loc.name}</div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:180px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="background:${config.color};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${num}</span>
            <strong style="font-size:14px;">${loc.name}</strong>
          </div>
          <span style="display:inline-block;font-size:10px;color:white;background:${config.color};border-radius:3px;padding:1px 6px;margin-bottom:4px;">${config.label}</span>
          ${loc.description ? `<p style="font-size:12px;color:#444;margin:4px 0 0;">${loc.description}</p>` : ''}
        </div>
      `);
      markers.push(marker);
    });

    // Draw route polyline connecting locations in order
    if (locations.length >= 2) {
      const routeCoords = locations.map(l => [l.lat, l.lng] as [number, number]);
      const polyline = L.polyline(routeCoords, {
        color: ROUTE_COLOR,
        weight: 3,
        opacity: 0.8,
        dashArray: ROUTE_DASH,
      }).addTo(map);

      // Add arrow decorators (simple approach: small triangles at midpoints)
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const midLat = (routeCoords[i][0] + routeCoords[i + 1][0]) / 2;
        const midLng = (routeCoords[i][1] + routeCoords[i + 1][1]) / 2;
        const arrowIcon = L.divIcon({
          className: 'route-arrow',
          html: `<div style="color:${ROUTE_COLOR};font-size:16px;font-weight:bold;text-shadow:0 0 3px white;">→</div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(map);
      }

      routeLayerRef.current = polyline;
      if (!routeVisible) polyline.setStyle({ opacity: 0 });
    }

    // Fit bounds with padding
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.3));
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
    };
  }, [locations]);

  // Toggle route visibility
  useEffect(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.setStyle({ opacity: routeVisible ? 0.8 : 0 });
    }
  }, [routeVisible]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 300);
    }
  }, [isFullscreen]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleFullscreen = () => {
    const container = mapContainerRef.current?.parentElement;
    if (!container) return;
    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleDownload = () => {
    if (!mapContainerRef.current) return;
    const canvas = mapContainerRef.current.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `mapa-biblico-${passage.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } else {
      window.print();
    }
  };

  if (locations.length === 0) return null;

  const usedTypes = [...new Set(locations.map(l => l.type || 'city'))];

  return (
    <div className={`relative border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Controls */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-1">
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleZoomIn} title="Zoom +">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleZoomOut} title="Zoom -">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleFullscreen} title="Tela cheia">
          <Maximize className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleDownload} title="Baixar PNG">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={() => setShowLegend(!showLegend)} title="Legenda">
          <List className="h-4 w-4" />
        </Button>
        {locations.length >= 2 && (
          <Button
            variant={routeVisible ? "default" : "secondary"}
            size="icon"
            className="h-8 w-8 shadow-md"
            onClick={() => setRouteVisible(!routeVisible)}
            title={routeVisible ? 'Ocultar rota' : 'Mostrar rota'}
          >
            <Route className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Title bar */}
      <div className="absolute top-2 left-14 right-2 z-[1000] pointer-events-none">
        <div className="inline-block bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-md pointer-events-auto">
          <p className="text-xs font-semibold text-foreground">📖 {passage}</p>
          <p className="text-[10px] text-muted-foreground">{locations.length} locais identificados</p>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg max-w-[260px]">
          <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">📍 Legenda</p>
          
          {/* Types */}
          <div className="space-y-1 mb-2">
            {usedTypes.map(type => {
              const config = TYPE_CONFIG[type] || TYPE_CONFIG.city;
              return (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: config.color }} />
                  <span className="font-medium">{config.emoji} {config.label}</span>
                </div>
              );
            })}
            {locations.length >= 2 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-6 h-0 shrink-0" style={{ borderTop: `2px dashed ${ROUTE_COLOR}` }} />
                <span className="font-medium">🛤️ Rota / Percurso</span>
              </div>
            )}
          </div>

          {/* Location list */}
          <div className="border-t border-border pt-2 space-y-0.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Locais</p>
            {locations.map((loc, i) => {
              const config = TYPE_CONFIG[loc.type || 'city'] || TYPE_CONFIG.city;
              return (
                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-bold shrink-0" style={{ color: config.color, minWidth: '14px' }}>{i + 1}.</span>
                  <div>
                    <span className="font-semibold text-foreground">{loc.name}</span>
                    {loc.description && (
                      <span className="text-muted-foreground"> — {loc.description}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[9px] text-muted-foreground mt-2 border-t border-border pt-1.5">
            Fonte: OpenStreetMap | Stadia Maps
          </p>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full" style={{ height: isFullscreen ? '100vh' : '450px' }} />
    </div>
  );
}

// Known biblical locations database
export const BIBLICAL_LOCATIONS: Record<string, MapLocation> = {
  'Jerusalém': { name: 'Jerusalém', lat: 31.7683, lng: 35.2137, type: 'city', description: 'Capital de Judá, cidade do Templo' },
  'Belém': { name: 'Belém', lat: 31.7054, lng: 35.2024, type: 'city', description: 'Cidade natal de Davi e Jesus' },
  'Nazaré': { name: 'Nazaré', lat: 32.6996, lng: 35.3035, type: 'city', description: 'Cidade de criação de Jesus' },
  'Cafarnaum': { name: 'Cafarnaum', lat: 32.8809, lng: 35.5753, type: 'city', description: 'Base do ministério de Jesus na Galileia' },
  'Jericó': { name: 'Jericó', lat: 31.8611, lng: 35.4593, type: 'city', description: 'Uma das cidades mais antigas do mundo' },
  'Samaria': { name: 'Samaria', lat: 32.2756, lng: 35.1913, type: 'region', description: 'Região central de Israel' },
  'Galileia': { name: 'Galileia', lat: 32.75, lng: 35.40, type: 'region', description: 'Região norte de Israel, ministério de Jesus' },
  'Judeia': { name: 'Judeia', lat: 31.65, lng: 35.20, type: 'region', description: 'Região sul de Israel' },
  'Mar da Galileia': { name: 'Mar da Galileia', lat: 32.8231, lng: 35.5831, type: 'water', description: 'Lago de água doce, cenário de muitos milagres' },
  'Mar Morto': { name: 'Mar Morto', lat: 31.5, lng: 35.5, type: 'water', description: 'Ponto mais baixo da Terra' },
  'Rio Jordão': { name: 'Rio Jordão', lat: 31.76, lng: 35.55, type: 'water', description: 'Rio do batismo de Jesus' },
  'Monte Sinai': { name: 'Monte Sinai', lat: 28.5394, lng: 33.9753, type: 'mountain', description: 'Onde Moisés recebeu os Dez Mandamentos' },
  'Monte das Oliveiras': { name: 'Monte das Oliveiras', lat: 31.7781, lng: 35.2453, type: 'mountain', description: 'Local da ascensão de Jesus' },
  'Monte Carmelo': { name: 'Monte Carmelo', lat: 32.7417, lng: 35.0458, type: 'mountain', description: 'Confronto de Elias com profetas de Baal' },
  'Antioquia da Síria': { name: 'Antioquia da Síria', lat: 36.2, lng: 36.15, type: 'city', description: 'Base das viagens missionárias de Paulo' },
  'Antioquia': { name: 'Antioquia da Síria', lat: 36.2, lng: 36.15, type: 'city', description: 'Base das viagens missionárias de Paulo' },
  'Antioquia da Pisídia': { name: 'Antioquia da Pisídia', lat: 38.3, lng: 31.17, type: 'city', description: 'Paulo pregou na sinagoga (Atos 13)' },
  'Icônio': { name: 'Icônio', lat: 37.87, lng: 32.49, type: 'city', description: 'Paulo e Barnabé pregaram (Atos 14)' },
  'Listra': { name: 'Listra', lat: 37.57, lng: 32.37, type: 'city', description: 'Paulo curou um coxo, foi apedrejado (Atos 14)' },
  'Derbe': { name: 'Derbe', lat: 37.36, lng: 33.39, type: 'city', description: 'Última cidade da 1ª viagem de Paulo' },
  'Éfeso': { name: 'Éfeso', lat: 37.9411, lng: 27.3419, type: 'city', description: 'Uma das 7 igrejas do Apocalipse' },
  'Roma': { name: 'Roma', lat: 41.9028, lng: 12.4964, type: 'city', description: 'Capital do Império Romano' },
  'Corinto': { name: 'Corinto', lat: 37.9065, lng: 22.8807, type: 'city', description: 'Cidade das cartas de Paulo' },
  'Damasco': { name: 'Damasco', lat: 33.5138, lng: 36.2765, type: 'city', description: 'Local da conversão de Paulo' },
  'Babilônia': { name: 'Babilônia', lat: 32.5355, lng: 44.4275, type: 'city', description: 'Capital do Império Babilônico' },
  'Egito': { name: 'Egito (Mênfis)', lat: 29.8481, lng: 31.2543, type: 'region', description: 'Terra do cativeiro de Israel' },
  'Hebrom': { name: 'Hebrom', lat: 31.5326, lng: 35.0998, type: 'city', description: 'Cidade de Abraão' },
  'Siló': { name: 'Siló', lat: 32.0561, lng: 35.2892, type: 'city', description: 'Local do tabernáculo antes de Jerusalém' },
  'Filipos': { name: 'Filipos', lat: 41.0147, lng: 24.2867, type: 'city', description: 'Primeira igreja de Paulo na Europa' },
  'Tessalônica': { name: 'Tessalônica', lat: 40.6401, lng: 22.9444, type: 'city', description: 'Cidade das epístolas de Paulo' },
  'Tarso': { name: 'Tarso', lat: 36.9167, lng: 34.8833, type: 'city', description: 'Cidade natal de Paulo' },
  'Nínive': { name: 'Nínive', lat: 36.3594, lng: 43.1531, type: 'city', description: 'Capital da Assíria, destino de Jonas' },
  'Tiro': { name: 'Tiro', lat: 33.2704, lng: 35.2038, type: 'city', description: 'Importante cidade fenícia' },
  'Sidom': { name: 'Sidom', lat: 33.5617, lng: 35.3717, type: 'city', description: 'Cidade fenícia mencionada nos profetas' },
  'Chipre': { name: 'Chipre (Salamina)', lat: 35.17, lng: 33.94, type: 'region', description: 'Ilha visitada na 1ª viagem de Paulo' },
  'Salamina': { name: 'Salamina', lat: 35.17, lng: 33.94, type: 'city', description: 'Paulo pregou nas sinagogas de Chipre' },
  'Pafos': { name: 'Pafos', lat: 34.77, lng: 32.42, type: 'city', description: 'Paulo confrontou Barjesus, o mago (Atos 13)' },
  'Perge': { name: 'Perge', lat: 36.96, lng: 30.85, type: 'city', description: 'Cidade da Panfília, passagem de Paulo' },
  'Atenas': { name: 'Atenas', lat: 37.9838, lng: 23.7275, type: 'city', description: 'Paulo pregou no Areópago (Atos 17)' },
  'Mileto': { name: 'Mileto', lat: 37.53, lng: 27.28, type: 'city', description: 'Paulo se despediu dos presbíteros de Éfeso' },
  'Trôade': { name: 'Trôade', lat: 39.76, lng: 26.18, type: 'city', description: 'Paulo teve a visão do homem macedônio' },
  'Cesareia': { name: 'Cesareia', lat: 32.50, lng: 34.89, type: 'city', description: 'Porto romano, Paulo foi preso (Atos 23)' },
  'Jope': { name: 'Jope', lat: 32.05, lng: 34.75, type: 'city', description: 'Visão de Pedro, Jonas embarcou para Társis' },
  'Selêucia': { name: 'Selêucia', lat: 36.12, lng: 35.94, type: 'city', description: 'Porto de partida da 1ª viagem missionária' },
  'Beréia': { name: 'Beréia', lat: 40.52, lng: 22.20, type: 'city', description: 'Judeus nobres examinaram as Escrituras' },
};

// Parse locations from analysis content
export function extractLocationsFromContent(content: string): MapLocation[] {
  const found: MapLocation[] = [];
  const contentNormalized = content
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  const addedNames = new Set<string>();

  for (const [name, loc] of Object.entries(BIBLICAL_LOCATIONS)) {
    const nameNormalized = name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (contentNormalized.includes(nameNormalized) && !addedNames.has(loc.name)) {
      found.push(loc);
      addedNames.add(loc.name);
    }
  }

  return found;
}
