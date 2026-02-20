import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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

export interface ExegesisMaterial {
  id: string;
  user_id: string;
  title: string;
  material_type: string;
  url: string | null;
  file_path: string | null;
  description: string | null;
  created_at: string;
}

export function useExegesis() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<ExegesisAnalysis[]>([]);
  const [outlines, setOutlines] = useState<ExegesisOutline[]>([]);
  const [materials, setMaterials] = useState<ExegesisMaterial[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('exegesis_analyses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setAnalyses((data || []) as ExegesisAnalysis[]);
  }, [user]);

  const saveAnalysis = useCallback(async (analysis: { passage: string; analysis_type: string; question?: string; content: string; notes?: string }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('exegesis_analyses')
      .insert({ ...analysis, user_id: user.id } as any)
      .select()
      .single();
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

  const fetchOutlines = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('exegesis_outlines')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setOutlines((data || []) as ExegesisOutline[]);
  }, [user]);

  const saveOutline = useCallback(async (outline: { passage: string; outline_type: string; content: string; notes?: string }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('exegesis_outlines')
      .insert({ ...outline, user_id: user.id } as any)
      .select()
      .single();
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return null; }
    setOutlines(prev => [data as ExegesisOutline, ...prev]);
    return data as ExegesisOutline;
  }, [user]);

  const updateOutlineNotes = useCallback(async (id: string, notes: string) => {
    const { error } = await supabase.from('exegesis_outlines').update({ notes } as any).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setOutlines(prev => prev.map(o => o.id === id ? { ...o, notes } : o));
  }, []);

  const deleteOutline = useCallback(async (id: string) => {
    const { error } = await supabase.from('exegesis_outlines').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setOutlines(prev => prev.filter(o => o.id !== id));
  }, []);

  const fetchMaterials = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('exegesis_materials')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setMaterials((data || []) as ExegesisMaterial[]);
  }, [user]);

  const uploadMaterial = useCallback(async (file: File, title: string, description?: string) => {
    if (!user) return null;
    setLoading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const materialType = ['doc', 'docx'].includes(ext) ? 'doc' : 'pdf';
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('exegesis-materials').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('exegesis_materials')
        .insert({ user_id: user.id, title, material_type: materialType, file_path: filePath, description } as any)
        .select()
        .single();
      if (error) throw error;
      setMaterials(prev => [data as ExegesisMaterial, ...prev]);
      return data as ExegesisMaterial;
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addLink = useCallback(async (title: string, url: string, materialType: 'youtube' | 'article', description?: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('exegesis_materials')
      .insert({ user_id: user.id, title, material_type: materialType, url, description } as any)
      .select()
      .single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return null; }
    setMaterials(prev => [data as ExegesisMaterial, ...prev]);
    toast({ title: 'Link adicionado!', description: `"${title}" adicionado à biblioteca.` });
    return data as ExegesisMaterial;
  }, [user]);

  const deleteMaterial = useCallback(async (id: string, filePath?: string | null) => {
    if (filePath) {
      await supabase.storage.from('exegesis-materials').remove([filePath]);
    }
    const { error } = await supabase.from('exegesis_materials').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setMaterials(prev => prev.filter(m => m.id !== id));
  }, []);

  return {
    analyses, outlines, materials, loading,
    fetchAnalyses, saveAnalysis, updateAnalysisNotes, deleteAnalysis,
    fetchOutlines, saveOutline, updateOutlineNotes, deleteOutline,
    fetchMaterials, uploadMaterial, addLink, deleteMaterial,
  };
}
