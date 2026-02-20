import { useState, useEffect, useRef } from 'react';
import { Upload, Link2, Youtube, FileText, Trash2, Plus, ExternalLink, Loader2, Files } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { ExegesisMaterial } from '@/hooks/useExegesis';

interface Props {
  materials: ExegesisMaterial[];
  loading: boolean;
  onFetch: () => void;
  onUpload: (file: File, title: string, description?: string) => Promise<ExegesisMaterial | null>;
  onAddLink: (title: string, url: string, type: 'youtube' | 'article', description?: string) => Promise<ExegesisMaterial | null>;
  onDelete: (id: string, filePath?: string | null) => Promise<void>;
}

export function ExegesisMaterials({ materials, loading, onFetch, onUpload, onAddLink, onDelete }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [linkType, setLinkType] = useState<'youtube' | 'article'>('youtube');
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { onFetch(); }, [onFetch]);

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const invalidFiles = fileArray.filter(f => !validExtensions.some(ext => f.name.toLowerCase().endsWith(ext)));
    
    if (invalidFiles.length > 0) {
      toast({ title: "Formato não suportado", description: `Aceita apenas: PDF, DOC, DOCX. Arquivos ignorados: ${invalidFiles.map(f => f.name).join(', ')}`, variant: "destructive" });
    }

    const validFiles = fileArray.filter(f => validExtensions.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (validFiles.length === 0) return;

    setUploadingFiles(validFiles.map(f => ({ name: f.name, progress: 'Enviando...' })));

    let successCount = 0;
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const name = title.trim() && validFiles.length === 1
        ? title.trim()
        : file.name.replace(/\.[^.]+$/, '');
      
      setUploadingFiles(prev => prev.map((p, idx) => idx === i ? { ...p, progress: `Enviando... (${i + 1}/${validFiles.length})` } : p));
      
      const result = await onUpload(file, name, description.trim() || undefined);
      if (result) {
        successCount++;
        setUploadingFiles(prev => prev.map((p, idx) => idx === i ? { ...p, progress: '✅ Enviado' } : p));
      } else {
        setUploadingFiles(prev => prev.map((p, idx) => idx === i ? { ...p, progress: '❌ Erro' } : p));
      }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} arquivo(s) enviado(s)!`, description: `${successCount} de ${validFiles.length} arquivo(s) adicionado(s) com sucesso.` });
    }

    setTimeout(() => {
      setTitle('');
      setDescription('');
      setUploadingFiles([]);
      setShowUpload(false);
      if (fileRef.current) fileRef.current.value = '';
    }, 1500);
  };

  const handleAddLink = async () => {
    if (!title.trim() || !url.trim()) { toast({ title: "Preencha título e URL", variant: "destructive" }); return; }
    await onAddLink(title.trim(), url.trim(), linkType, description.trim() || undefined);
    setTitle(''); setUrl(''); setDescription(''); setShowLink(false);
  };

  const getIcon = (type: string) => {
    if (type === 'youtube') return <Youtube className="w-5 h-5 text-red-500" />;
    if (type === 'article') return <Link2 className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-primary" />;
  };

  const getFileTypeLabel = (name: string, type: string) => {
    if (type === 'youtube') return 'YouTube';
    if (type === 'article') return 'Artigo';
    const ext = name?.split('.').pop()?.toUpperCase();
    return ext || 'PDF';
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => { setShowUpload(!showUpload); setShowLink(false); }} className="gap-2">
          <Upload className="w-4 h-4" /> Enviar Arquivos
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setShowLink(!showLink); setShowUpload(false); }} className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar Link
        </Button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="card-library p-4 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Files className="w-4 h-4" /> Enviar Comentários, Dicionários e Materiais
          </h4>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-library w-full text-sm" placeholder="Título do material (opcional — usa nome do arquivo se vazio)" />
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input-library w-full text-sm" placeholder="Descrição breve (opcional)" />
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              onChange={handleFilesSelect}
              className="hidden"
              id="exegesis-file-upload"
            />
            <label htmlFor="exegesis-file-upload" className="cursor-pointer space-y-2 block">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">Clique para selecionar arquivos</p>
              <p className="text-xs text-muted-foreground">Selecione um ou vários arquivos de uma vez</p>
              <p className="text-xs text-muted-foreground">Aceita: PDF, DOC, DOCX • Tamanho ilimitado</p>
            </label>
          </div>

          {/* Upload Progress */}
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

      {/* Link Form */}
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

      {/* Materials List */}
      {materials.length === 0 ? (
        <div className="card-library p-8 text-center space-y-3">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum material adicionado ainda.</p>
          <p className="text-xs text-muted-foreground">Envie comentários bíblicos, dicionários, livros teológicos ou links para enriquecer suas análises.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {materials.map(m => (
            <div key={m.id} className="card-library p-3 flex items-center gap-3">
              {getIcon(m.material_type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.title}</p>
                {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString('pt-BR')} • {getFileTypeLabel(m.title, m.material_type)}</p>
              </div>
              <div className="flex gap-1">
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
          ))}
        </div>
      )}
    </div>
  );
}
