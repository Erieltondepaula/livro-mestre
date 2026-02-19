import { BookOpen, History, FileText, Library } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExegesis } from '@/hooks/useExegesis';
import { ExegesisAnalyzer } from '@/components/exegesis/ExegesisAnalyzer';
import { ExegesisHistory } from '@/components/exegesis/ExegesisHistory';
import { ExegesisOutlines } from '@/components/exegesis/ExegesisOutlines';
import { ExegesisMaterials } from '@/components/exegesis/ExegesisMaterials';

export function ExegesisView() {
  const {
    analyses, outlines, materials, loading,
    fetchAnalyses, saveAnalysis, updateAnalysisNotes, deleteAnalysis,
    fetchOutlines, saveOutline, updateOutlineNotes, deleteOutline,
    fetchMaterials, uploadMaterial, addLink, deleteMaterial,
  } = useExegesis();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">Exegese Bíblica</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Interprete textos bíblicos com ferramentas de análise exegética, esboços de sermões e biblioteca de referências
        </p>
      </div>

      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="analyze" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="w-4 h-4 hidden sm:block" /> Analisar
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-4 h-4 hidden sm:block" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="outlines" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="w-4 h-4 hidden sm:block" /> Esboços
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1.5 text-xs sm:text-sm">
            <Library className="w-4 h-4 hidden sm:block" /> Materiais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze">
          <ExegesisAnalyzer onSave={saveAnalysis} />
        </TabsContent>

        <TabsContent value="history">
          <ExegesisHistory analyses={analyses} onFetch={fetchAnalyses} onUpdateNotes={updateAnalysisNotes} onDelete={deleteAnalysis} />
        </TabsContent>

        <TabsContent value="outlines">
          <ExegesisOutlines outlines={outlines} onFetch={fetchOutlines} onSave={saveOutline} onUpdateNotes={updateOutlineNotes} onDelete={deleteOutline} />
        </TabsContent>

        <TabsContent value="materials">
          <ExegesisMaterials materials={materials} loading={loading} onFetch={fetchMaterials} onUpload={uploadMaterial} onAddLink={addLink} onDelete={deleteMaterial} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
