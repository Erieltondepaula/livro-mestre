import { useState } from 'react';
import { Settings2, Plus, Minus, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface OutlineStructure {
  pointCount: number;
  points: { name: string; hasSubtopic: boolean; hasApplication: boolean; hasIllustration: boolean; hasImpactPhrase: boolean }[];
  hasFinalAppeal: boolean;
  isExplicitlyChristocentric: boolean;
  depthLevel: 'basico' | 'intermediario' | 'avancado';
}

const DEFAULT_POINT = { name: '', hasSubtopic: true, hasApplication: true, hasIllustration: false, hasImpactPhrase: true };

export function getDefaultStructure(): OutlineStructure {
  return {
    pointCount: 4,
    points: Array(4).fill(null).map((_, i) => ({ ...DEFAULT_POINT, hasIllustration: i >= 2 })),
    hasFinalAppeal: true,
    isExplicitlyChristocentric: true,
    depthLevel: 'avancado',
  };
}

const DEPTH_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  basico: {
    label: 'Básico',
    description: 'Linguagem simples e direta. Ideal para pregações introdutórias, cultos evangelísticos ou públicos iniciantes. Foco na clareza e aplicação prática imediata.',
  },
  intermediario: {
    label: 'Intermediário',
    description: 'Equilíbrio entre profundidade teológica e acessibilidade. Inclui contexto histórico, palavras-chave do original e aplicações pastorais. Ideal para cultos regulares.',
  },
  avancado: {
    label: 'Avançado',
    description: 'Análise exegética profunda com estudo de palavras no original (hebraico/grego), contexto histórico-cultural detalhado, referências cruzadas extensas e reflexão teológica densa. Ideal para estudos bíblicos e seminários.',
  },
};

interface Props {
  structure: OutlineStructure;
  onChange: (s: OutlineStructure) => void;
}

export function OutlineStructureEditor({ structure, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const updatePointCount = (delta: number) => {
    const newCount = Math.max(2, Math.min(6, structure.pointCount + delta));
    const points = [...structure.points];
    while (points.length < newCount) points.push({ ...DEFAULT_POINT });
    onChange({ ...structure, pointCount: newCount, points: points.slice(0, newCount) });
  };

  const updatePoint = (idx: number, key: keyof Omit<OutlineStructure['points'][0], 'name'>, value: boolean) => {
    const points = [...structure.points];
    points[idx] = { ...points[idx], [key]: value };
    onChange({ ...structure, points });
  };

  const updatePointName = (idx: number, name: string) => {
    const points = [...structure.points];
    points[idx] = { ...points[idx], name };
    onChange({ ...structure, points });
  };

  return (
    <TooltipProvider>
      <div className="card-library overflow-hidden">
        <button className="w-full p-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
          <span className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="w-4 h-4 text-primary" /> Estrutura do Esboço
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{structure.pointCount} pontos • {DEPTH_DESCRIPTIONS[structure.depthLevel]?.label}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {expanded && (
          <div className="p-4 border-t space-y-4">
            {/* Point count */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Quantidade de pontos</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updatePointCount(-1)} disabled={structure.pointCount <= 2}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{structure.pointCount}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updatePointCount(1)} disabled={structure.pointCount >= 6}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Per-point config */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Configuração por Ponto</Label>
              <div className="grid gap-2">
                {structure.points.slice(0, structure.pointCount).map((point, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground/70 shrink-0">Ponto {i + 1}</span>
                      <input
                        type="text"
                        value={point.name || ''}
                        onChange={(e) => updatePointName(i, e.target.value)}
                        className="input-library flex-1 text-xs h-7"
                        placeholder={`Nome do ponto ${i + 1} (opcional)`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Switch checked={point.hasSubtopic} onCheckedChange={(v) => updatePoint(i, 'hasSubtopic', v)} className="scale-75" /> Subtópico
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Switch checked={point.hasApplication} onCheckedChange={(v) => updatePoint(i, 'hasApplication', v)} className="scale-75" /> Aplicação
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Switch checked={point.hasIllustration} onCheckedChange={(v) => updatePoint(i, 'hasIllustration', v)} className="scale-75" /> Ilustração
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Switch checked={point.hasImpactPhrase} onCheckedChange={(v) => updatePoint(i, 'hasImpactPhrase', v)} className="scale-75" /> Frase Impacto
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3">
              <label className="flex items-center justify-between gap-2 text-sm">
                Apelo final <Switch checked={structure.hasFinalAppeal} onCheckedChange={(v) => onChange({ ...structure, hasFinalAppeal: v })} />
              </label>
              <label className="flex items-center justify-between gap-2 text-sm">
                Cristocentrismo explícito <Switch checked={structure.isExplicitlyChristocentric} onCheckedChange={(v) => onChange({ ...structure, isExplicitlyChristocentric: v })} />
              </label>
            </div>

            {/* Depth */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Label className="text-xs text-muted-foreground uppercase">Nível de profundidade</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Define o grau de detalhamento exegético e teológico do esboço gerado. Quanto mais avançado, mais profunda a análise de palavras originais, contexto e referências.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['basico', 'intermediario', 'avancado'] as const).map(level => {
                  const info = DEPTH_DESCRIPTIONS[level];
                  return (
                    <Tooltip key={level}>
                      <TooltipTrigger asChild>
                        <button onClick={() => onChange({ ...structure, depthLevel: level })}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${structure.depthLevel === level ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border hover:bg-muted/50'}`}>
                          {info.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                        {info.description}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              {/* Active description below buttons */}
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                {DEPTH_DESCRIPTIONS[structure.depthLevel]?.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
