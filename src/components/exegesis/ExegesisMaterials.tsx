import { useState, useEffect, useRef } from 'react';
import { Upload, Link2, Youtube, FileText, Trash2, Plus, ExternalLink, Loader2, Files, BookOpen, BookMarked, Languages, Heart, Tag, Edit3, Check, X, Sparkles, ClipboardPaste, Film, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import type { ExegesisMaterial, MaterialCategory } from '@/hooks/useExegesis';

interface Props {
  materials: ExegesisMaterial[];
  loading: boolean;
  onFetch: () => void;
  onUpload: (file: File, title: string, category: MaterialCategory, description?: string) => Promise<ExegesisMaterial | null>;
  onAddLink: (title: string, url: string, type: 'youtube' | 'article', category: MaterialCategory, description?: string) => Promise<ExegesisMaterial | null>;
  onUpdateMetadata?: (id: string, metadata: { theme?: string; keywords?: string[]; bible_references?: string[]; author?: string; content_origin?: string }) => Promise<void>;
  onDelete: (id: string, filePath?: string | null) => Promise<void>;
  onClassify?: (content: string) => Promise<any | null>;
  onExtractMetadata?: (content: string, title?: string) => Promise<any | null>;
  onClassifyAll?: (onProgress?: (done: number, total: number) => void) => Promise<number>;
}

const CATEGORIES: { id: MaterialCategory; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'comentario', label: 'Comentários', icon: BookMarked, description: 'Comentários bíblicos expositivos' },
  { id: 'dicionario', label: 'Dicionários', icon: Languages, description: 'Dicionários bíblicos e teológicos' },
  { id: 'livro', label: 'Livros', icon: BookOpen, description: 'Livros teológicos e de referência' },
  { id: 'devocional', label: 'Devocionais', icon: Heart, description: 'Devocionais, reflexões e aplicações pastorais' },
  { id: 'midia', label: 'Mídia', icon: Film, description: 'Vídeos, imagens, links e outros recursos multimídia' },
];

export function ExegesisMaterials({ materials, loading, onFetch, onUpload, onAddLink, onUpdateMetadata, onDelete, onClassify, onExtractMetadata, onClassifyAll }: Props) {
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('comentario');
  const [showUpload, setShowUpload] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [linkType, setLinkType] = useState<'youtube' | 'article'>('youtube');
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: string }[]>([]);
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [metaForm, setMetaForm] = useState<{ theme: string; keywords: string; bible_references: string; author: string; content_origin: string }>({ theme: '', keywords: '', bible_references: '', author: '', content_origin: 'texto' });
  const [batchClassifying, setBatchClassifying] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { onFetch(); }, [onFetch]);

  const filteredMaterials = materials.filter(m => m.material_category === activeCategory);

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const validExtensions = activeCategory === 'midia' 
      ? ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mp3', '.wav']
      : ['.pdf', '.doc', '.docx'];
    const invalidFiles = fileArray.filter(f => !validExtensions.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (invalidFiles.length > 0) toast({ title: "Formato não suportado", description: activeCategory === 'midia' ? 'Aceita: PDF, DOC, DOCX, JPG, PNG, MP4, MP3' : 'Aceita apenas: PDF, DOC, DOCX', variant: "destructive" });
    const validFiles = fileArray.filter(f => validExtensions.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (validFiles.length === 0) return;

    setUploadingFiles(validFiles.map(f => ({ name: f.name, progress: 'Enviando...' })));
    let successCount = 0;
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const name = title.trim() && validFiles.length === 1 ? title.trim() : file.name.replace(/\.[^.]+$/, '');
      setUploadingFiles(prev => prev.map((p, idx) => idx === i ? { ...p, progress: `Enviando... (${i + 1}/${validFiles.length})` } : p));
      const result = await onUpload(file, name, activeCategory, description.trim() || undefined);
      if (result) { successCount++; setUploadingFiles(prev => prev.map((p, idx) => idx === i ? { ...p, progress: '✅ Enviado' } : p)); }
      else setUploadingFiles(prev => prev.map((p, idx) => idx === i ? { ...p, progress: '❌ Erro' } : p));
    }
    if (successCount > 0) toast({ title: `${successCount} arquivo(s) enviado(s)!` });
    setTimeout(() => { setTitle(''); setDescription(''); setUploadingFiles([]); setShowUpload(false); if (fileRef.current) fileRef.current.value = ''; }, 1500);
  };

  const handleAddLink = async () => {
    if (!title.trim() || !url.trim()) { toast({ title: "Preencha título e URL", variant: "destructive" }); return; }
    await onAddLink(title.trim(), url.trim(), linkType, activeCategory, description.trim() || undefined);
    setTitle(''); setUrl(''); setDescription(''); setShowLink(false);
  };

  const handleClassifyPaste = async () => {
    if (!pasteContent.trim() || !onClassify) return;
    setClassifying(true);
    setClassificationResult(null);
    try {
      const result = await onClassify(pasteContent.trim());
      if (result) {
        setClassificationResult(result);
        if (result.material_category) setActiveCategory(result.material_category);
        toast({ title: 'Conteúdo classificado!', description: `Tipo: ${result.content_type || result.material_category} | Confiança: ${Math.round((result.confidence || 0) * 100)}%` });
      }
    } finally { setClassifying(false); }
  };

  const handleSaveClassified = async () => {
    if (!pasteTitle.trim()) { toast({ title: 'Informe um título', variant: 'destructive' }); return; }
    const cat = classificationResult?.material_category || activeCategory;
    const desc = classificationResult?.reasoning || '';
    const result = await onAddLink(pasteTitle.trim(), '', 'article', cat, desc);
    if (result && onUpdateMetadata && classificationResult) {
      await onUpdateMetadata(result.id, {
        theme: classificationResult.theme || undefined,
        keywords: classificationResult.keywords || [],
        bible_references: classificationResult.bible_references || [],
        author: classificationResult.author || undefined,
        content_origin: classificationResult.content_origin || 'texto',
      });
    }
    setPasteContent(''); setPasteTitle(''); setClassificationResult(null); setShowPaste(false);
  };

  const startEditMeta = (m: ExegesisMaterial) => {
    setEditingMetaId(m.id);
    setMetaForm({
      theme: m.theme || '',
      keywords: Array.isArray(m.keywords) ? (m.keywords as string[]).join(', ') : '',
      bible_references: Array.isArray(m.bible_references) ? (m.bible_references as string[]).join(', ') : '',
      author: m.author || '',
      content_origin: m.content_origin || 'texto',
    });
  };

  const saveMetadata = async () => {
    if (!editingMetaId || !onUpdateMetadata) return;
    await onUpdateMetadata(editingMetaId, {
      theme: metaForm.theme || undefined,
      keywords: metaForm.keywords ? metaForm.keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
      bible_references: metaForm.bible_references ? metaForm.bible_references.split(',').map(s => s.trim()).filter(Boolean) : [],
      author: metaForm.author || undefined,
      content_origin: metaForm.content_origin || 'texto',
    });
    setEditingMetaId(null);
  };

  const getIcon = (type: string) => {
    if (type === 'youtube') return <Youtube className="w-5 h-5 text-red-500" />;
    if (type === 'article') return <Link2 className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-primary" />;
  };

  const getCategoryCount = (cat: MaterialCategory) => materials.filter(m => m.material_category === cat).length;

  return (
    <div className="space-y-6">
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as MaterialCategory)} className="w-full">
        <TabsList className="w-full grid grid-cols-5">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const count = getCategoryCount(cat.id);
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5 text-xs sm:text-sm">
                <Icon className="w-4 h-4 hidden sm:block" />
                {cat.label}
                {count > 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-1">{count}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map(cat => (
          <TabsContent key={cat.id} value={cat.id}>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => { setShowUpload(!showUpload); setShowLink(false); setShowPaste(false); }} className="gap-2">
                  <Upload className="w-4 h-4" /> Enviar Arquivos
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowLink(!showLink); setShowUpload(false); setShowPaste(false); }} className="gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Link
                </Button>
                {onClassify && (
                  <Button variant="outline" size="sm" onClick={() => { setShowPaste(!showPaste); setShowUpload(false); setShowLink(false); }} className="gap-2">
                    <ClipboardPaste className="w-4 h-4" /> Colar Conteúdo
                  </Button>
                )}
                {onClassifyAll && (() => {
                  const unclassifiedCount = materials.filter(m => !m.theme && (!m.keywords || (m.keywords as any).length === 0)).length;
                  return unclassifiedCount > 0 ? (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      disabled={batchClassifying}
                      onClick={async () => {
                        setBatchClassifying(true);
                        setBatchProgress({ done: 0, total: unclassifiedCount });
                        try {
                          const count = await onClassifyAll((done, total) => setBatchProgress({ done, total }));
                          toast({ title: `${count} materiais classificados!`, description: 'Metadados extraídos automaticamente pela IA.' });
                        } finally {
                          setBatchClassifying(false);
                          setBatchProgress(null);
                        }
                      }}
                      className="gap-2"
                    >
                      {batchClassifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {batchClassifying && batchProgress ? `Classificando ${batchProgress.done}/${batchProgress.total}...` : `Classificar Todos (${unclassifiedCount})`}
                    </Button>
                  ) : null;
                })()}
              </div>

              {showPaste && onClassify && (
                <div className="card-library p-4 space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Classificação Automática por IA</h4>
                  <p className="text-xs text-muted-foreground">Cole ou digite qualquer conteúdo teológico. A IA identificará automaticamente o tipo, tema, palavras-chave e referências bíblicas.</p>
                  <input type="text" value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} className="input-library w-full text-sm" placeholder="Título do material *" />
                  <textarea
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    className="input-library w-full text-sm min-h-[120px] resize-y"
                    placeholder="Cole aqui o conteúdo do texto bíblico, comentário, devocional, pregação, definição de dicionário..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleClassifyPaste} disabled={classifying || !pasteContent.trim()} className="gap-2">
                      {classifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {classifying ? 'Classificando...' : 'Classificar com IA'}
                    </Button>
                  </div>
                  {classificationResult && (
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border">
                      <p className="text-xs font-semibold text-foreground">Resultado da Classificação:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Categoria:</span> <span className="font-medium">{classificationResult.material_category}</span></div>
                        <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{classificationResult.content_type}</span></div>
                        <div><span className="text-muted-foreground">Tema:</span> <span className="font-medium">{classificationResult.theme}</span></div>
                        <div><span className="text-muted-foreground">Confiança:</span> <span className="font-medium">{Math.round((classificationResult.confidence || 0) * 100)}%</span></div>
                      </div>
                      {classificationResult.keywords?.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {classificationResult.keywords.map((k: string, i: number) => (
                            <span key={i} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{k}</span>
                          ))}
                        </div>
                      )}
                      {classificationResult.bible_references?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">Refs: {classificationResult.bible_references.join(', ')}</p>
                      )}
                      {classificationResult.reasoning && <p className="text-[10px] text-muted-foreground italic">{classificationResult.reasoning}</p>}
                      <Button size="sm" onClick={handleSaveClassified} disabled={!pasteTitle.trim()} className="gap-1.5 mt-1">
                        <Check className="w-3.5 h-3.5" /> Salvar na categoria "{classificationResult.material_category}"
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {showUpload && (
                <div className="card-library p-4 space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2"><Files className="w-4 h-4" /> Enviar {cat.label}</h4>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-library w-full text-sm" placeholder="Título do material (opcional)" />
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input-library w-full text-sm" placeholder="Descrição breve (opcional)" />
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" multiple onChange={handleFilesSelect} className="hidden" id="exegesis-file-upload" />
                    <label htmlFor="exegesis-file-upload" className="cursor-pointer space-y-2 block">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground/60" />
                      <p className="text-sm font-medium text-foreground">Clique para selecionar arquivos</p>
                      <p className="text-xs text-muted-foreground">Aceita: PDF, DOC, DOCX • Múltiplos arquivos</p>
                    </label>
                  </div>
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {uploadingFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="flex-1 truncate text-foreground/80">{f.name}</span>
                          <span className={`text-xs ${f.progress.includes('✅') ? 'text-green-600' : f.progress.includes('❌') ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {f.progress.includes('Enviando') && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                            {f.progress}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showLink && (
                <div className="card-library p-4 space-y-3">
                  <h4 className="text-sm font-medium">Adicionar Link</h4>
                  <div className="flex gap-2">
                    <button onClick={() => setLinkType('youtube')} className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border ${linkType === 'youtube' ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'border-border text-muted-foreground'}`}>
                      <Youtube className="w-3.5 h-3.5" /> YouTube
                    </button>
                    <button onClick={() => setLinkType('article')} className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border ${linkType === 'article' ? 'bg-blue-500/10 border-blue-500/30 text-blue-600' : 'border-border text-muted-foreground'}`}>
                      <Link2 className="w-3.5 h-3.5" /> Artigo/Site
                    </button>
                  </div>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-library w-full text-sm" placeholder="Título *" />
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="input-library w-full text-sm" placeholder="URL *" />
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input-library w-full text-sm" placeholder="Descrição (opcional)" />
                  <Button size="sm" onClick={handleAddLink} className="btn-library-primary">Adicionar</Button>
                </div>
              )}

              {filteredMaterials.length === 0 ? (
                <div className="card-library p-8 text-center space-y-3">
                  {(() => { const Icon = cat.icon; return <Icon className="w-10 h-10 mx-auto text-muted-foreground/40" />; })()}
                  <p className="text-sm text-muted-foreground">Nenhum {cat.label.toLowerCase()} adicionado ainda.</p>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMaterials.map(m => (
                    <div key={m.id} className="card-library overflow-hidden">
                      <div className="p-3 flex items-center gap-3">
                        {getIcon(m.material_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.title}</p>
                          {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <p className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString('pt-BR')}</p>
                            {m.theme && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{m.theme}</span>}
                            {m.author && <span className="text-[10px] text-muted-foreground">por {m.author}</span>}
                          </div>
                          {m.keywords && Array.isArray(m.keywords) && (m.keywords as string[]).length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-1">
                              {(m.keywords as string[]).slice(0, 5).map((k, i) => (
                                <span key={i} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{k}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {onUpdateMetadata && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editingMetaId === m.id ? setEditingMetaId(null) : startEditMeta(m)}>
                              <Tag className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {m.url && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(m.url!, '_blank')}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(m.id, m.file_path)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {/* Metadata editor */}
                      {editingMetaId === m.id && (
                        <div className="p-3 border-t bg-muted/20 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1"><Tag className="w-3 h-3" /> Metadados</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input type="text" value={metaForm.theme} onChange={(e) => setMetaForm(p => ({ ...p, theme: e.target.value }))} className="input-library text-xs" placeholder="Tema principal" />
                            <input type="text" value={metaForm.author} onChange={(e) => setMetaForm(p => ({ ...p, author: e.target.value }))} className="input-library text-xs" placeholder="Autor" />
                            <input type="text" value={metaForm.keywords} onChange={(e) => setMetaForm(p => ({ ...p, keywords: e.target.value }))} className="input-library text-xs" placeholder="Palavras-chave (separe por vírgula)" />
                            <input type="text" value={metaForm.bible_references} onChange={(e) => setMetaForm(p => ({ ...p, bible_references: e.target.value }))} className="input-library text-xs" placeholder="Referências bíblicas (separe por vírgula)" />
                            <select value={metaForm.content_origin} onChange={(e) => setMetaForm(p => ({ ...p, content_origin: e.target.value }))} className="input-library text-xs">
                              <option value="texto">Texto</option>
                              <option value="video">Vídeo</option>
                              <option value="transcricao">Transcrição</option>
                              <option value="audio">Áudio</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={saveMetadata}><Check className="w-3 h-3" /> Salvar</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditingMetaId(null)}><X className="w-3 h-3" /> Cancelar</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
