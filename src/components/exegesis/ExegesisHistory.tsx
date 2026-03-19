import { useState, useEffect, useMemo } from 'react';
import { Search, Copy, Trash2, Check, MessageSquare, ChevronDown, ChevronUp, Map, Leaf, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import type { ExegesisAnalysis } from '@/hooks/useExegesis';
import { MapImageViewer, extractMapImageUrl } from './MapImageViewer';
import { ReferenceMapView } from './ReferenceMapView';
import { ReferenceMapOrganic } from './ReferenceMapOrganic';

interface Props {
  analyses: ExegesisAnalysis[];
  onFetch: () => void;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TYPE_LABELS: Record<string, string> = {
  full_exegesis: 'Exegese Completa', context_analysis: 'Contexto', word_study: 'Estudo de Palavras',
  genre_analysis: 'Gênero Literário', theological_analysis: 'Teologia', application: 'Aplicação',
  inductive_method: 'Método Indutivo', version_comparison: 'Versões', devotional: 'Devocional',
  geographic_historical: 'Geográfico/Histórico', lessons_applications: 'Lições e Aplicações',
  question: 'Pergunta Livre',
  cross_references: 'Ref. Cruzadas',
  outline_expository: 'Esboço Expositivo', outline_textual: 'Esboço Textual', outline_thematic: 'Esboço Temático',
};

export function ExegesisHistory({ analyses, onFetch, onUpdateNotes, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [historyMapStyle, setHistoryMapStyle] = useState<'geometric' | 'organic'>('geometric');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => { onFetch(); }, [onFetch]);

  // Get unique analysis types for filter
  const availableTypes = useMemo(() => {
    const types = new Set(analyses.map(a => a.analysis_type));
    return Array.from(types).sort();
  }, [analyses]);

  const filtered = useMemo(() => {
    return analyses.filter(a => {
      const q = search.toLowerCase();
      const matchesSearch = !q || a.passage.toLowerCase().includes(q) || a.analysis_type.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
      const matchesType = filterType === 'all' || a.analysis_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [analyses, search, filterType]);

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copiado!" });
  };

  const handleExportMd = (a: ExegesisAnalysis) => {
    const header = `# ${TYPE_LABELS[a.analysis_type] || a.analysis_type} — ${a.passage}\n\n> Data: ${new Date(a.created_at).toLocaleDateString('pt-BR')}\n\n`;
    const notes = a.notes ? `\n\n---\n\n## Anotações\n\n${a.notes}` : '';
    const blob = new Blob([header + a.content + notes], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exegese-${a.passage.replace(/\s+/g, '-').substring(0, 40)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveNotes = async (id: string) => {
    await onUpdateNotes(id, notesValue);
    setEditingNotesId(null);
    toast({ title: "Anotação salva!" });
  };

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed text-foreground/90 mb-2">')
      .replace(/\n/g, '<br/>');
    return `<p class="text-sm leading-relaxed text-foreground/90 mb-2">${html}</p>`;
  };

  return (
    <div className="space-y-4">
      {/* Search + Filter Row */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por passagem, tipo ou conteúdo..." className="input-library w-full pl-9 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-library text-sm min-w-[160px]">
            <option value="all">Todos os tipos ({analyses.length})</option>
            {availableTypes.map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t] || t} ({analyses.filter(a => a.analysis_type === t).length})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      {(search || filterType !== 'all') && (
        <p className="text-xs text-muted-foreground">{filtered.length} resultado(s) encontrado(s)</p>
      )}

      {filtered.length === 0 ? (
        <div className="card-library p-8 text-center">
          <p className="text-sm text-muted-foreground">{search || filterType !== 'all' ? 'Nenhum resultado encontrado.' : 'Nenhuma análise salva ainda. Use a aba "Analisar" para gerar uma.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const isExpanded = expandedId === a.id;
            return (
              <div key={a.id} className="card-library overflow-hidden">
                <div className="p-4 flex items-start justify-between gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{TYPE_LABELS[a.analysis_type] || a.analysis_type}</span>
                      <span className="text-xs text-muted-foreground truncate">📖 {a.passage}</span>
                    </div>
                    {a.question && <p className="text-xs text-muted-foreground italic truncate">❓ {a.question}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString('pt-BR')} às {new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Exportar .md" onClick={(e) => { e.stopPropagation(); handleExportMd(a); }}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleCopy(a.id, a.content); }}>
                      {copiedId === a.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.content) }} />
                    
                    {/* Render cross-references map for cross_references analyses */}
                    {a.analysis_type === 'cross_references' && (() => {
                      const stopWords = new Set(['como', 'que', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'o', 'a', 'os', 'as', 'e', 'ou', 'para', 'por', 'com', 'se', 'ao', 'aos', 'à', 'às', 'é', 'são', 'foi', 'ser', 'ter', 'está', 'entre', 'qual', 'quais', 'isso', 'esse', 'esta', 'este']);
                      const kw = a.passage.split(/[\s,?!.;:]+/).filter((w: string) => w.length > 2 && !stopWords.has(w.toLowerCase()));
                      const MapComponent = historyMapStyle === 'organic' ? ReferenceMapOrganic : ReferenceMapView;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 w-fit">
                            <button onClick={() => setHistoryMapStyle('geometric')}
                              className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${historyMapStyle === 'geometric' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                              <Map className="w-3 h-3" /> Geométrico
                            </button>
                            <button onClick={() => setHistoryMapStyle('organic')}
                              className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${historyMapStyle === 'organic' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                              <Leaf className="w-3 h-3" /> Orgânico
                            </button>
                          </div>
                          <MapComponent centralTheme={a.passage} content={a.content} keywords={kw} />
                        </div>
                      );
                    })()}

                    {/* Render AI-generated map for geographic_historical analyses */}
                    {a.analysis_type === 'geographic_historical' && (() => {
                      const mapUrl = extractMapImageUrl(a.content);
                      return mapUrl ? (
                        <MapImageViewer
                          imageUrl={mapUrl}
                          passage={a.passage}
                          className="mt-4"
                        />
                      ) : null;
                    })()}
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Anotações</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                          if (editingNotesId === a.id) { handleSaveNotes(a.id); } else { setEditingNotesId(a.id); setNotesValue(a.notes || ''); }
                        }}>
                          {editingNotesId === a.id ? 'Salvar' : 'Editar'}
                        </Button>
                      </div>
                      {editingNotesId === a.id ? (
                        <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Adicione suas anotações..." className="min-h-[80px] text-sm" />
                      ) : a.notes ? (
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/30 p-3 rounded">{a.notes}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Sem anotações</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
