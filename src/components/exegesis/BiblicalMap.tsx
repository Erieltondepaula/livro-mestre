import { useEffect, useRef, useState } from 'react';
import { MapPin, ZoomIn, ZoomOut, Maximize, Download, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
}

const TYPE_COLORS: Record<string, string> = {
  city: '#DC2626',
  region: '#2563EB',
  mountain: '#16A34A',
  water: '#0891B2',
  route: '#D97706',
};

const TYPE_LABELS: Record<string, string> = {
  city: 'Cidade',
  region: 'Região',
  mountain: 'Monte',
  water: 'Corpo d\'água',
  route: 'Rota',
};

export function BiblicalMap({ passage, locations, className = '' }: BiblicalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    if (!mapContainerRef.current || locations.length === 0) return;

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    });

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Add markers
    const markers: L.Marker[] = [];
    locations.forEach(loc => {
      const color = TYPE_COLORS[loc.type || 'city'] || '#DC2626';
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      
      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif;">
          <strong style="font-size:14px;">${loc.name}</strong>
          ${loc.type ? `<br/><span style="font-size:11px;color:#666;">${TYPE_LABELS[loc.type] || loc.type}</span>` : ''}
          ${loc.description ? `<br/><span style="font-size:12px;">${loc.description}</span>` : ''}
        </div>
      `);
      markers.push(marker);
    });

    // Fit bounds
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [locations]);

  // Resize on fullscreen change
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
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleDownload = () => {
    if (!mapContainerRef.current) return;
    // Use canvas export via leaflet tile rendering
    const canvas = mapContainerRef.current.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `mapa-biblico-${passage.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } else {
      // Fallback: screenshot via html2canvas-like approach
      window.print();
    }
  };

  if (locations.length === 0) return null;

  const usedTypes = [...new Set(locations.map(l => l.type || 'city'))];

  return (
    <div className={`relative border border-border rounded-lg overflow-hidden ${className}`}>
      <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-1">
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleFullscreen}>
          <Maximize className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow-md" onClick={() => setShowLegend(!showLegend)}>
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-md max-w-[200px]">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Legenda</p>
          {usedTypes.map(type => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[type] || '#DC2626' }} />
              <span>{TYPE_LABELS[type] || type}</span>
            </div>
          ))}
          <p className="text-[9px] text-muted-foreground mt-1 border-t border-border pt-1">
            Fonte: OpenStreetMap
          </p>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full" style={{ height: isFullscreen ? '100vh' : '400px' }} />
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
  'Mar da Galileia': { name: 'Mar da Galileia', lat: 32.8231, lng: 35.5831, type: 'water', description: 'Lago de água doce, cenário de muitos milagres' },
  'Mar Morto': { name: 'Mar Morto', lat: 31.5, lng: 35.5, type: 'water', description: 'Ponto mais baixo da Terra' },
  'Rio Jordão': { name: 'Rio Jordão', lat: 31.76, lng: 35.55, type: 'water', description: 'Rio do batismo de Jesus' },
  'Monte Sinai': { name: 'Monte Sinai', lat: 28.5394, lng: 33.9753, type: 'mountain', description: 'Onde Moisés recebeu a Lei' },
  'Monte das Oliveiras': { name: 'Monte das Oliveiras', lat: 31.7781, lng: 35.2453, type: 'mountain', description: 'Local da ascensão de Jesus' },
  'Antioquia': { name: 'Antioquia', lat: 36.2, lng: 36.15, type: 'city', description: 'Centro da igreja gentílica' },
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
};

// Parse locations from analysis content
export function extractLocationsFromContent(content: string): MapLocation[] {
  const found: MapLocation[] = [];
  const contentUpper = content.toUpperCase();
  
  for (const [name, loc] of Object.entries(BIBLICAL_LOCATIONS)) {
    if (contentUpper.includes(name.toUpperCase())) {
      found.push(loc);
    }
  }
  
  return found;
}
