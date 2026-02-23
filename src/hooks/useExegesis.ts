import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { OutlineVersion } from '@/components/exegesis/OutlineVersionHistory';

export interface ExegesisAnalysis {
  id: string;
  user_id: string;
  passage: string;
  analysis_type: string;
  question: string | null;
  content: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExegesisOutline {
  id: string;
  user_id: string;
  passage: string;
  outline_type: string;
  content: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MaterialCategory = 'livro' | 'comentario' | 'dicionario' | 'devocional';

export interface ExegesisMaterial {
  id: string;
  user_id: string;
  title: string;
  material_type: string;
  material_category: MaterialCategory;
  url: string | null;
  file_path: string | null;
  description: string | null;
  created_at: string;
  theme?: string | null;
  sub_themes?: string[] | null;
  keywords?: string[] | null;
  bible_references?: string[] | null;
  author?: string | null;
  content_origin?: string | null;
}

export function useExegesis() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<ExegesisAnalysis[]>([]);
  const [outlines, setOutlines] = useState<ExegesisOutline[]>([]);
  const [materials, setMaterials] = useState<ExegesisMaterial[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Analyses ---
  const fetchAnalyses = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('exegesis_analyses').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setAnalyses((data || []) as ExegesisAnalysis[]);
  }, [user]);

  const saveAnalysis = useCallback(async (analysis: { passage: string; analysis_type: string; question?: string; content: string; notes?: string }) => {
    if (!user) return null;
    const { data, error } = await supabase.from('exegesis_analyses').insert({ ...analysis, user_id: user.id } as any).select().single();
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return null; }
    setAnalyses(prev => [data as ExegesisAnalysis, ...prev]);
    return data as ExegesisAnalysis;
  }, [user]);

  const updateAnalysisNotes = useCallback(async (id: string, notes: string) => {
    const { error } = await supabase.from('exegesis_analyses').update({ notes } as any).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, notes } : a));
  }, []);

  const deleteAnalysis = useCallback(async (id: string) => {
    const { error } = await supabase.from('exegesis_analyses').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setAnalyses(prev => prev.filter(a => a.id !== id));
  }, []);

  // --- Outlines ---
  const fetchOutlines = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('exegesis_outlines').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setOutlines((data || []) as ExegesisOutline[]);
  }, [user]);

  const saveOutline = useCallback(async (outline: { passage: string; outline_type: string; content: string; notes?: string }) => {
    if (!user) return null;
    const { data, error } = await supabase.from('exegesis_outlines').insert({ ...outline, user_id: user.id } as any).select().single();
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return null; }
    setOutlines(prev => [data as ExegesisOutline, ...prev]);
    return data as ExegesisOutline;
  }, [user]);

  const updateOutlineNotes = useCallback(async (id: string, notes: string) => {
    const { error } = await supabase.from('exegesis_outlines').update({ notes } as any).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setOutlines(prev => prev.map(o => o.id === id ? { ...o, notes } : o));
  }, []);

  const updateOutlineContent = useCallback(async (id: string, content: string) => {
    if (!user) return;
    // Save version before updating
    const outline = outlines.find(o => o.id === id);
    if (outline) {
      const { data: versions } = await supabase.from('exegesis_outline_versions' as any).select('version_number').eq('outline_id', id).order('version_number', { ascending: false }).limit(1);
      const nextVersion = ((versions as any)?.[0]?.version_number || 0) + 1;
      await supabase.from('exegesis_outline_versions' as any).insert({ outline_id: id, content: outline.content, version_number: nextVersion, user_id: user.id });
    }
    const { error } = await supabase.from('exegesis_outlines').update({ content } as any).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setOutlines(prev => prev.map(o => o.id === id ? { ...o, content } : o));
  }, [user, outlines]);

  const deleteOutline = useCallback(async (id: string) => {
    const { error } = await supabase.from('exegesis_outlines').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setOutlines(prev => prev.filter(o => o.id !== id));
  }, []);

  // --- Outline Versions ---
  const fetchOutlineVersions = useCallback(async (outlineId: string): Promise<OutlineVersion[]> => {
    const { data, error } = await supabase.from('exegesis_outline_versions' as any).select('*').eq('outline_id', outlineId).order('version_number', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []) as unknown as OutlineVersion[];
  }, []);

  // --- Materials ---
  const fetchMaterials = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('exegesis_materials').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setMaterials((data || []) as ExegesisMaterial[]);
  }, [user]);

  const uploadMaterial = useCallback(async (file: File, title: string, category: MaterialCategory, description?: string) => {
    if (!user) return null;
    setLoading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const materialType = ['doc', 'docx'].includes(ext) ? 'doc' : 'pdf';
      // Sanitize filename: remove accents, special chars, spaces
      const sanitizedName = file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-zA-Z0-9._-]/g, '_') // replace special chars
        .replace(/_+/g, '_'); // collapse multiple underscores
      const filePath = `${user.id}/${Date.now()}_${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from('exegesis-materials').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data, error } = await supabase.from('exegesis_materials').insert({ user_id: user.id, title, material_type: materialType, material_category: category, file_path: filePath, description } as any).select().single();
      if (error) throw error;
      setMaterials(prev => [data as ExegesisMaterial, ...prev]);
      return data as ExegesisMaterial;
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' });
      return null;
    } finally { setLoading(false); }
  }, [user]);

  const addLink = useCallback(async (title: string, url: string, materialType: 'youtube' | 'article', category: MaterialCategory, description?: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from('exegesis_materials').insert({ user_id: user.id, title, material_type: materialType, material_category: category, url, description } as any).select().single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return null; }
    setMaterials(prev => [data as ExegesisMaterial, ...prev]);
    toast({ title: 'Link adicionado!', description: `"${title}" adicionado à biblioteca.` });
    return data as ExegesisMaterial;
  }, [user]);

  const updateMaterialMetadata = useCallback(async (id: string, metadata: { theme?: string; sub_themes?: string[]; keywords?: string[]; bible_references?: string[]; author?: string; content_origin?: string }) => {
    const { error } = await supabase.from('exegesis_materials').update(metadata as any).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, ...metadata } : m));
    toast({ title: 'Metadados atualizados!' });
  }, []);

  const deleteMaterial = useCallback(async (id: string, filePath?: string | null) => {
    if (filePath) await supabase.storage.from('exegesis-materials').remove([filePath]);
    const { error } = await supabase.from('exegesis_materials').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setMaterials(prev => prev.filter(m => m.id !== id));
  }, []);

  // --- Context builders ---
  const getMaterialsContext = useCallback(() => {
    if (materials.length === 0) return undefined;
    const grouped = {
      dicionario: materials.filter(m => m.material_category === 'dicionario'),
      comentario: materials.filter(m => m.material_category === 'comentario'),
      livro: materials.filter(m => m.material_category === 'livro'),
      devocional: materials.filter(m => m.material_category === 'devocional'),
    };
    let context = '';
    const formatMaterial = (m: ExegesisMaterial) => {
      let line = `- ${m.title}`;
      if (m.author) line += ` (${m.author})`;
      if (m.description) line += ` — ${m.description}`;
      if (m.theme) line += ` [Tema: ${m.theme}]`;
      if (m.keywords && (m.keywords as any).length > 0) line += ` [Palavras-chave: ${(m.keywords as any).join(', ')}]`;
      if (m.bible_references && (m.bible_references as any).length > 0) line += ` [Refs: ${(m.bible_references as any).join(', ')}]`;
      return line;
    };
    if (grouped.dicionario.length > 0) context += `\n### 📙 Dicionários Bíblicos:\n${grouped.dicionario.map(formatMaterial).join('\n')}`;
    if (grouped.comentario.length > 0) context += `\n### 📘 Comentários Bíblicos:\n${grouped.comentario.map(formatMaterial).join('\n')}`;
    if (grouped.livro.length > 0) context += `\n### 📚 Livros Teológicos:\n${grouped.livro.map(formatMaterial).join('\n')}`;
    if (grouped.devocional.length > 0) context += `\n### 📗 Devocionais e Reflexões:\n${grouped.devocional.map(formatMaterial).join('\n')}`;
    return context.trim() || undefined;
  }, [materials]);

  const getRelevantAnalysesContext = useCallback((passage: string) => {
    if (analyses.length === 0) return undefined;
    const passageLower = passage.toLowerCase();
    const relevant = analyses.filter(a => {
      const p = a.passage.toLowerCase();
      return p.includes(passageLower) || passageLower.includes(p) || passageLower.split(' ').some(w => w.length > 3 && p.includes(w));
    }).slice(0, 5);
    if (relevant.length === 0) return undefined;
    return relevant.map(a => `### Análise anterior (${a.analysis_type}) — ${a.passage}:\n${a.content.substring(0, 800)}${a.content.length > 800 ? '...' : ''}`).join('\n\n---\n\n');
  }, [analyses]);

  // --- AI Classification & Metadata ---
  const classifyContent = useCallback(async (content: string): Promise<any | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('exegesis', {
        body: { passage: content, type: 'classify_content' },
      });
      if (error) throw error;
      const result = typeof data?.result === 'string' ? JSON.parse(data.result) : data?.result;
      return result;
    } catch (e: any) {
      console.error('Classification error:', e);
      toast({ title: 'Erro na classificação', description: e.message, variant: 'destructive' });
      return null;
    }
  }, []);

  const extractMetadata = useCallback(async (content: string, title?: string): Promise<any | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('exegesis', {
        body: { passage: content, question: title, type: 'extract_metadata' },
      });
      if (error) throw error;
      const result = typeof data?.result === 'string' ? JSON.parse(data.result) : data?.result;
      return result;
    } catch (e: any) {
      console.error('Metadata extraction error:', e);
      toast({ title: 'Erro na extração', description: e.message, variant: 'destructive' });
      return null;
    }
  }, []);

  const classifyMaterialByTitle = useCallback(async (title: string): Promise<any | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('exegesis', {
        body: { passage: title, type: 'extract_metadata' },
      });
      if (error) throw error;
      const result = typeof data?.result === 'string' ? JSON.parse(data.result) : data?.result;
      return result;
    } catch (e: any) {
      console.error('Classify by title error:', e);
      return null;
    }
  }, []);

  const classifyAllMaterials = useCallback(async (onProgress?: (done: number, total: number) => void): Promise<number> => {
    const unclassified = materials.filter(m => !m.theme && (!m.keywords || (m.keywords as any).length === 0));
    if (unclassified.length === 0) return 0;
    let classified = 0;
    for (let i = 0; i < unclassified.length; i++) {
      const m = unclassified[i];
      onProgress?.(i + 1, unclassified.length);
      const result = await classifyMaterialByTitle(m.title);
      if (result) {
        const metadata: any = {};
        if (result.theme) metadata.theme = result.theme;
        if (result.keywords?.length > 0) metadata.keywords = result.keywords;
        if (result.bible_references?.length > 0) metadata.bible_references = result.bible_references;
        if (result.author) metadata.author = result.author;
        if (result.content_origin) metadata.content_origin = result.content_origin;
        if (result.material_category) metadata.material_category = result.material_category;
        if (Object.keys(metadata).length > 0) {
          const { error } = await supabase.from('exegesis_materials').update(metadata as any).eq('id', m.id);
          if (!error) {
            setMaterials(prev => prev.map(pm => pm.id === m.id ? { ...pm, ...metadata } : pm));
            classified++;
          }
        }
      }
    }
    return classified;
  }, [materials, classifyMaterialByTitle]);

  const suggestImprovements = useCallback(async (passage: string, outlineContent: string): Promise<any | null> => {
    try {
      const materialsCtx = getMaterialsContext();
      const { data, error } = await supabase.functions.invoke('exegesis', {
        body: { passage, question: outlineContent, type: 'suggest_improvements', materials_context: materialsCtx },
      });
      if (error) throw error;
      const result = typeof data?.result === 'string' ? JSON.parse(data.result) : data?.result;
      return result;
    } catch (e: any) {
      console.error('Suggestions error:', e);
      toast({ title: 'Erro nas sugestões', description: e.message, variant: 'destructive' });
      return null;
    }
  }, [getMaterialsContext]);

  return {
    analyses, outlines, materials, loading,
    fetchAnalyses, saveAnalysis, updateAnalysisNotes, deleteAnalysis,
    fetchOutlines, saveOutline, updateOutlineNotes, updateOutlineContent, deleteOutline,
    fetchOutlineVersions,
    fetchMaterials, uploadMaterial, addLink, updateMaterialMetadata, deleteMaterial,
    getMaterialsContext, getRelevantAnalysesContext,
    classifyContent, extractMetadata, suggestImprovements, classifyAllMaterials,
  };
}
