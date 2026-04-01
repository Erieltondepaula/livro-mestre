import { useState } from 'react';
import { BookOpen, History, FileText, Library, Link2, MapPin, MessageCircle, ChevronRight, Layers, Heart } from 'lucide-react';
import { useExegesis } from '@/hooks/useExegesis';
import { useAuth } from '@/contexts/AuthContext';
import { ExegesisAnalyzer } from '@/components/exegesis/ExegesisAnalyzer';
import { ExegesisHistory } from '@/components/exegesis/ExegesisHistory';
import { ExegesisOutlines } from '@/components/exegesis/ExegesisOutlines';
import { ExegesisMaterials } from '@/components/exegesis/ExegesisMaterials';
import { CrossReferencesView } from '@/components/exegesis/CrossReferencesView';
import { MindMapEditor } from '@/components/exegesis/MindMapEditor';
import { ExegesisQAChat } from '@/components/exegesis/ExegesisQAChat';
import { ThematicStudyView } from '@/components/exegesis/ThematicStudyView';
import { DevotionalView } from '@/components/exegesis/DevotionalView';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ExegesisSection = 'analyze' | 'cross_refs' | 'history' | 'outlines' | 'materials' | 'qa_chat' | 'mindmap' | 'thematic_study' | 'devotional';

interface MenuItem {
  id: ExegesisSection;
  label: string;
  icon: React.ElementType;
  moduleKey?: string;
  badge?: number;
}

export function ExegesisView() {
  const { hasModuleAccess, user } = useAuth();
  const {
    analyses, outlines, materials, loading,
    fetchAnalyses, saveAnalysis, updateAnalysisNotes, deleteAnalysis,
    fetchOutlines, saveOutline, updateOutlineNotes, updateOutlineContent, deleteOutline,
    fetchOutlineVersions,
    fetchMaterials, uploadMaterial, addLink, updateMaterialMetadata, deleteMaterial,
    getMaterialsContext, getRelevantAnalysesContext,
    classifyContent, extractMetadata, suggestImprovements, classifyAllMaterials,
  } = useExegesis();

  useEffect(() => { fetchMaterials(); fetchAnalyses(); }, [fetchMaterials, fetchAnalyses]);

  const [activeSection, setActiveSection] = useState<ExegesisSection | null>(null);

  const handleCreateNote = useCallback(async (title: string, content: string) => {
    if (!user) return;
    try {
      await supabase.from('notes').insert({
        user_id: user.id,
        title,
        content,
        note_type: 'permanente',
        tags: ['exegese'],
      });
      toast({ title: '📝 Nota criada!', description: 'Acesse em Notas para editar.' });
    } catch (e) {
      console.error('Error creating note:', e);
    }
  }, [user]);

  const menuItems: MenuItem[] = [
    ...(hasModuleAccess('exegese.analisar') ? [{ id: 'analyze' as const, label: 'Analisar Passagem', icon: BookOpen }] : []),
    ...(hasModuleAccess('exegese.ref_cruzadas') ? [{ id: 'cross_refs' as const, label: 'Referências Cruzadas', icon: Link2 }] : []),
    ...(hasModuleAccess('exegese.historico') ? [{ id: 'history' as const, label: 'Histórico de Análises', icon: History }] : []),
    ...(hasModuleAccess('exegese.esbocos') ? [{ id: 'outlines' as const, label: 'Esboços de Sermões', icon: FileText }] : []),
    ...(hasModuleAccess('exegese.materiais') ? [{ id: 'materials' as const, label: 'Materiais de Referência', icon: Library, badge: materials.length }] : []),
    { id: 'thematic_study' as const, label: 'Estudo por Tema', icon: Layers },
    { id: 'devotional' as const, label: 'Devocionais', icon: Heart },
    { id: 'qa_chat', label: 'Chat de Perguntas', icon: MessageCircle },
    { id: 'mindmap', label: 'Mapa Mental', icon: MapPin },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'analyze':
        return <ExegesisAnalyzer onSave={saveAnalysis} getMaterialsContext={getMaterialsContext} materialsCount={materials.length} materials={materials} onCreateNote={handleCreateNote} />;
      case 'cross_refs':
        return <CrossReferencesView onSave={saveAnalysis} getMaterialsContext={getMaterialsContext} materialsCount={materials.length} materials={materials} onCreateNote={handleCreateNote} />;
      case 'history':
        return <ExegesisHistory analyses={analyses} onFetch={fetchAnalyses} onUpdateNotes={updateAnalysisNotes} onDelete={deleteAnalysis} onCreateNote={handleCreateNote} />;
      case 'outlines':
        return (
          <ExegesisOutlines
            outlines={outlines}
            onFetch={fetchOutlines}
            onSave={saveOutline}
            onUpdateNotes={updateOutlineNotes}
            onUpdateContent={updateOutlineContent}
            onDelete={deleteOutline}
            getMaterialsContext={getMaterialsContext}
            getRelevantAnalysesContext={getRelevantAnalysesContext}
            fetchOutlineVersions={fetchOutlineVersions}
            materialsCount={materials.length}
            materials={materials}
            onSuggestImprovements={suggestImprovements}
          />
        );
      case 'materials':
        return (
          <ExegesisMaterials
            materials={materials}
            loading={loading}
            onFetch={fetchMaterials}
            onUpload={uploadMaterial}
            onAddLink={addLink}
            onUpdateMetadata={updateMaterialMetadata}
            onDelete={deleteMaterial}
            onClassify={classifyContent}
            onExtractMetadata={extractMetadata}
            onClassifyAll={classifyAllMaterials}
          />
        );
      case 'thematic_study':
        return <ThematicStudyView onSave={saveAnalysis} getMaterialsContext={getMaterialsContext} materialsCount={materials.length} materials={materials} onCreateNote={handleCreateNote} analyses={analyses} onDeleteAnalysis={deleteAnalysis} />;
      case 'devotional':
        return <DevotionalView onSave={saveAnalysis} getMaterialsContext={getMaterialsContext} materialsCount={materials.length} materials={materials} onCreateNote={handleCreateNote} />;
      case 'qa_chat':
        return <ExegesisQAChat getMaterialsContext={getMaterialsContext} materialsCount={materials.length} materials={materials} onCreateNote={handleCreateNote} />;
      case 'mindmap':
        return <MindMapEditor />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          {activeSection && (
            <button
              onClick={() => setActiveSection(null)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Voltar ao menu"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              {activeSection ? menuItems.find(m => m.id === activeSection)?.label : 'Exegese Bíblica'}
            </h2>
            {!activeSection && (
              <p className="text-sm text-muted-foreground mt-1">
                Ferramentas de análise exegética, esboços e biblioteca de referências
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Menu or Content */}
      {activeSection === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border border-border bg-card",
                  "hover:bg-accent/50 hover:border-primary/30 hover:shadow-md",
                  "transition-all duration-200 text-left group"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{item.badge}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
}
