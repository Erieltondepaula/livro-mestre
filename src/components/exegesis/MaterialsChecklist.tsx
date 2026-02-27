import { BookMarked, Languages, BookOpen, Heart, Film, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ExegesisMaterial, MaterialCategory } from '@/hooks/useExegesis';

interface MaterialsChecklistProps {
  materials: ExegesisMaterial[];
  depthLevel: 'basico' | 'intermediario' | 'avancado';
}

const CATEGORIES: { id: MaterialCategory; label: string; icon: React.ElementType }[] = [
  { id: 'comentario', label: 'Comentários', icon: BookMarked },
  { id: 'livro', label: 'Livros', icon: BookOpen },
  { id: 'dicionario', label: 'Dicionários', icon: Languages },
  { id: 'devocional', label: 'Devocionais', icon: Heart },
  { id: 'midia', label: 'Mídia', icon: Film },
];

const MINIMUM_SOURCES: Record<string, number> = {
  basico: 3,
  intermediario: 8,
  avancado: 15,
};

const DEPTH_LABELS: Record<string, string> = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

export function MaterialsChecklist({ materials, depthLevel }: MaterialsChecklistProps) {
  const total = materials.length;
  const minimum = MINIMUM_SOURCES[depthLevel] || 3;
  const isSufficient = total >= minimum;

  const categoryCounts = CATEGORIES.map(cat => ({
    ...cat,
    count: materials.filter(m => m.material_category === cat.id).length,
  }));

  return (
    <div className="card-library p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📚 Checklist de Materiais</h4>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isSufficient ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
          {total}/{minimum} ({DEPTH_LABELS[depthLevel]})
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {categoryCounts.map(cat => {
          const Icon = cat.icon;
          const hasItems = cat.count > 0;
          return (
            <div key={cat.id} className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs ${hasItems ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted/20'}`}>
              {hasItems ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              <span className={hasItems ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                {cat.label} ({cat.count})
              </span>
            </div>
          );
        })}
      </div>

      {!isSufficient && (
        <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Nível <strong>{DEPTH_LABELS[depthLevel]}</strong> requer mínimo de {minimum} fontes. Adicione mais {minimum - total} material(is).</span>
        </div>
      )}
    </div>
  );
}
