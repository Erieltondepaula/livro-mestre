import { useState } from 'react';
import { Settings2, Plus, Minus, ChevronDown, ChevronUp, Info, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface PointSection {
  id: string;
  label: string;
  enabled: boolean;
  children?: PointSection[];
}

export interface OutlinePoint {
  name: string;
  sections: PointSection[];
}

export interface OutlineStructure {
  pointCount: number;
  points: OutlinePoint[];
  hasFinalAppeal: boolean;
  isExplicitlyChristocentric: boolean;
  depthLevel: 'basico' | 'intermediario' | 'avancado';
}

let sectionIdCounter = 0;
const nextId = () => `sec_${Date.now()}_${sectionIdCounter++}`;

const DEFAULT_SECTIONS: () => PointSection[] = () => [
  { id: nextId(), label: 'Subtópico', enabled: true, children: [] },
  { id: nextId(), label: 'Aplicação', enabled: true, children: [] },
  { id: nextId(), label: 'Ilustração', enabled: false, children: [] },
  { id: nextId(), label: 'Frase Impacto', enabled: true, children: [] },
];

const DEFAULT_POINT = (): OutlinePoint => ({ name: '', sections: DEFAULT_SECTIONS() });

export function getDefaultStructure(): OutlineStructure {
  return {
    pointCount: 4,
    points: Array(4).fill(null).map(() => {
      const p = DEFAULT_POINT();
      return p;
    }),
    hasFinalAppeal: true,
    isExplicitlyChristocentric: true,
    depthLevel: 'avancado',
  };
}

// Convert new format to legacy format for backward compatibility with edge function
export function structureToPromptSections(structure: OutlineStructure): string {
  const lines: string[] = [];
  structure.points.slice(0, structure.pointCount).forEach((point: any, i: number) => {
    const pointLabel = point.name || `Ponto ${i + 1}`;
    const sections = point.sections || [];
    const enabledSections = sections.filter((s: any) => s.enabled);
    const sectionLabels = enabledSections.map((s: any) => {
      const childLabels = (s.children || []).filter((c: any) => c.enabled).map((c: any) => c.label);
      if (childLabels.length > 0) return `${s.label} (com: ${childLabels.join(', ')})`;
      return s.label;
    });
    lines.push(`- ${pointLabel}: ${sectionLabels.join(', ')}`);
  });
  return lines.join('\n');
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

const SUGGESTED_SECTIONS = [
  'Desenvolvimento', 'Texto', 'Aplicação Prática', 'Ilustração',
  'Frase Impacto', 'Subtópico', 'Transição', 'Reflexão',
  'Contexto Histórico', 'Palavra Original', 'Referência Cruzada',
];

interface Props {
  structure: OutlineStructure;
  onChange: (s: OutlineStructure) => void;
}

export function OutlineStructureEditor({ structure, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [addingSectionTo, setAddingSectionTo] = useState<{ pointIdx: number; parentId?: string } | null>(null);
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [dragState, setDragState] = useState<{ pointIdx: number; sectionId: string } | null>(null);

  // Migrate old format points (hasSubtopic, hasApplication, etc.) to new sections format
  const migratePoint = (p: any): OutlinePoint => {
    if (p.sections && Array.isArray(p.sections)) return p as OutlinePoint;
    return {
      name: p.name || '',
      sections: [
        { id: nextId(), label: 'Subtópico', enabled: p.hasSubtopic !== false, children: [] },
        { id: nextId(), label: 'Aplicação', enabled: p.hasApplication !== false, children: [] },
        { id: nextId(), label: 'Ilustração', enabled: !!p.hasIllustration, children: [] },
        { id: nextId(), label: 'Frase Impacto', enabled: p.hasImpactPhrase !== false, children: [] },
      ],
    };
  };

  const safePoints = structure.points.map(migratePoint);

  const updatePointCount = (delta: number) => {
    const newCount = Math.max(2, Math.min(8, structure.pointCount + delta));
    const points = [...safePoints];
    while (points.length < newCount) points.push(DEFAULT_POINT());
    onChange({ ...structure, pointCount: newCount, points: points.slice(0, newCount) });
  };

  const updatePointName = (idx: number, name: string) => {
    const points = [...safePoints];
    points[idx] = { ...points[idx], name };
    onChange({ ...structure, points });
  };

  const toggleSection = (pointIdx: number, sectionId: string, parentId?: string) => {
    const points = [...safePoints];
    const point = { ...points[pointIdx], sections: [...points[pointIdx].sections] };
    if (parentId) {
      point.sections = point.sections.map(s =>
        s.id === parentId ? { ...s, children: (s.children || []).map(c => c.id === sectionId ? { ...c, enabled: !c.enabled } : c) } : s
      );
    } else {
      point.sections = point.sections.map(s => s.id === sectionId ? { ...s, enabled: !s.enabled } : s);
    }
    points[pointIdx] = point;
    onChange({ ...structure, points });
  };

  const renameSectionLabel = (pointIdx: number, sectionId: string, newLabel: string, parentId?: string) => {
    const points = [...safePoints];
    const point = { ...points[pointIdx], sections: [...points[pointIdx].sections] };
    if (parentId) {
      point.sections = point.sections.map(s =>
        s.id === parentId ? { ...s, children: (s.children || []).map(c => c.id === sectionId ? { ...c, label: newLabel } : c) } : s
      );
    } else {
      point.sections = point.sections.map(s => s.id === sectionId ? { ...s, label: newLabel } : s);
    }
    points[pointIdx] = point;
    onChange({ ...structure, points });
  };

  const removeSection = (pointIdx: number, sectionId: string, parentId?: string) => {
    const points = [...safePoints];
    const point = { ...points[pointIdx], sections: [...points[pointIdx].sections] };
    if (parentId) {
      point.sections = point.sections.map(s =>
        s.id === parentId ? { ...s, children: (s.children || []).filter(c => c.id !== sectionId) } : s
      );
    } else {
      point.sections = point.sections.filter(s => s.id !== sectionId);
    }
    points[pointIdx] = point;
    onChange({ ...structure, points });
  };

  const addSection = (pointIdx: number, label: string, parentId?: string) => {
    if (!label.trim()) return;
    const newSection: PointSection = { id: nextId(), label: label.trim(), enabled: true, children: [] };
    const points = [...safePoints];
    const point = { ...points[pointIdx], sections: [...points[pointIdx].sections] };
    if (parentId) {
      point.sections = point.sections.map(s =>
        s.id === parentId ? { ...s, children: [...(s.children || []), newSection] } : s
      );
    } else {
      point.sections.push(newSection);
    }
    points[pointIdx] = point;
    onChange({ ...structure, points });
    setNewSectionLabel('');
    setAddingSectionTo(null);
  };

  const moveSectionInPoint = (pointIdx: number, fromIndex: number, toIndex: number) => {
    const points = [...safePoints];
    const point = { ...points[pointIdx], sections: [...points[pointIdx].sections] };
    const [moved] = point.sections.splice(fromIndex, 1);
    point.sections.splice(toIndex, 0, moved);
    points[pointIdx] = point;
    onChange({ ...structure, points });
  };

  const handleDragStart = (e: React.DragEvent, pointIdx: number, sectionId: string) => {
    setDragState({ pointIdx, sectionId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
  };

  const handleDragOver = (e: React.DragEvent, pointIdx: number, sectionId: string) => {
    if (!dragState || dragState.pointIdx !== pointIdx || dragState.sectionId === sectionId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, pointIdx: number, targetSectionId: string) => {
    e.preventDefault();
    if (!dragState || dragState.pointIdx !== pointIdx) return;
    const point = safePoints[pointIdx];
    const fromIdx = point.sections.findIndex(s => s.id === dragState.sectionId);
    const toIdx = point.sections.findIndex(s => s.id === targetSectionId);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      moveSectionInPoint(pointIdx, fromIdx, toIdx);
    }
    setDragState(null);
  };

  const renderSectionItem = (section: PointSection, pointIdx: number, parentId?: string, depth = 0) => (
    <div
      key={section.id}
      className={`flex items-center gap-1 ${depth > 0 ? 'ml-5 pl-2 border-l border-border/50' : ''} ${dragState?.sectionId === section.id ? 'opacity-50' : ''}`}
      draggable={depth === 0}
      onDragStart={depth === 0 ? (e) => handleDragStart(e, pointIdx, section.id) : undefined}
      onDragOver={depth === 0 ? (e) => handleDragOver(e, pointIdx, section.id) : undefined}
      onDrop={depth === 0 ? (e) => handleDrop(e, pointIdx, section.id) : undefined}
      onDragEnd={() => setDragState(null)}
    >
      {depth === 0 && (
        <GripVertical className="w-3 h-3 text-muted-foreground/50 cursor-grab shrink-0 hover:text-muted-foreground" />
      )}
      <Switch checked={section.enabled} onCheckedChange={() => toggleSection(pointIdx, section.id, parentId)} className="scale-[0.65] shrink-0" />
      <input
        type="text"
        value={section.label}
        onChange={(e) => renameSectionLabel(pointIdx, section.id, e.target.value, parentId)}
        className="bg-transparent text-xs border-none outline-none flex-1 min-w-0 px-1 py-0.5 rounded hover:bg-muted/40 focus:bg-muted/50 transition-colors"
        onClick={(e) => e.stopPropagation()}
      />
      {/* Add child button - only for top-level sections */}
      {!parentId && (
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); setAddingSectionTo({ pointIdx, parentId: section.id }); setNewSectionLabel(''); }}>
          <Plus className="w-2.5 h-2.5" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-40 hover:opacity-100 text-destructive"
        onClick={(e) => { e.stopPropagation(); removeSection(pointIdx, section.id, parentId); }}>
        <X className="w-2.5 h-2.5" />
      </Button>
    </div>
  );

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
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updatePointCount(1)} disabled={structure.pointCount >= 8}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Per-point config */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Configuração por Ponto</Label>
              <div className="grid gap-2">
                {safePoints.slice(0, structure.pointCount).map((point, i) => (
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
                    {/* Sections */}
                    <div className="space-y-1">
                      {point.sections.map(section => (
                        <div key={section.id} className="space-y-0.5">
                          {renderSectionItem(section, i)}
                          {/* Children */}
                          {(section.children || []).map(child => renderSectionItem(child, i, section.id, 1))}
                          {/* Adding child inline */}
                          {addingSectionTo?.pointIdx === i && addingSectionTo?.parentId === section.id && (
                            <div className="ml-5 pl-2 border-l border-border/50 flex items-center gap-1 mt-1">
                              <input
                                type="text"
                                value={newSectionLabel}
                                onChange={(e) => setNewSectionLabel(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addSection(i, newSectionLabel, section.id); if (e.key === 'Escape') setAddingSectionTo(null); }}
                                className="input-library text-xs h-6 flex-1"
                                placeholder="Nome da sub-seção..."
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => addSection(i, newSectionLabel, section.id)}>
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAddingSectionTo(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Add top-level section */}
                    {addingSectionTo?.pointIdx === i && !addingSectionTo?.parentId ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newSectionLabel}
                            onChange={(e) => setNewSectionLabel(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addSection(i, newSectionLabel); if (e.key === 'Escape') setAddingSectionTo(null); }}
                            className="input-library text-xs h-6 flex-1"
                            placeholder="Nome da seção..."
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => addSection(i, newSectionLabel)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAddingSectionTo(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {SUGGESTED_SECTIONS.filter(s => !point.sections.some(ps => ps.label === s)).slice(0, 6).map(s => (
                            <button key={s} onClick={() => addSection(i, s)} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors">
                              + {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 text-[10px] text-muted-foreground gap-1 w-full justify-start hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); setAddingSectionTo({ pointIdx: i }); setNewSectionLabel(''); }}
                      >
                        <Plus className="w-3 h-3" /> Adicionar seção
                      </Button>
                    )}
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
