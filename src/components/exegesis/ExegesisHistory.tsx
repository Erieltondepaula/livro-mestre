import { useState, useEffect } from 'react';
import { Search, Copy, Trash2, Check, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import type { ExegesisAnalysis } from '@/hooks/useExegesis';
import { MapImageViewer, extractMapImageUrl } from './MapImageViewer';

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
  question: 'Pergunta Livre',
  outline_expository: 'Esboço Expositivo', outline_textual: 'Esboço Textual', outline_thematic: 'Esboço Temático',
};

export function ExegesisHistory({ analyses, onFetch, onUpdateNotes, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { onFetch(); }, [onFetch]);

  const filtered = analyses.filter(a => {
    const q = search.toLowerCase();
    return !q || a.passage.toLowerCase().includes(q) || a.analysis_type.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
  });

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copiado!" });
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por passagem, tipo ou conteúdo..." className="input-library w-full pl-9 text-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="card-library p-8 text-center">
          <p className="text-sm text-muted-foreground">{search ? 'Nenhum resultado encontrado.' : 'Nenhuma análise salva ainda. Use a aba "Analisar" para gerar uma.'}</p>
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
