import { useState, useEffect } from 'react';
import { History, RotateCcw, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface OutlineVersion {
  id: string;
  outline_id: string;
  content: string;
  version_number: number;
  created_at: string;
  user_id: string;
}

interface Props {
  versions: OutlineVersion[];
  open: boolean;
  onClose: () => void;
  onRestore: (content: string) => void;
}

export function OutlineVersionHistory({ versions, open, onClose, onRestore }: Props) {
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const renderContent = (html: string) => {
    const isHtml = html.includes('<h1') || html.includes('<h2') || html.includes('<p>');
    if (isHtml) return html;
    return html
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="w-4 h-4" /> Histórico de Versões</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma versão anterior salva.</p>
          ) : (
            versions.map((v, i) => (
              <div key={v.id} className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-muted/30 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Versão {v.version_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">{new Date(v.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewIdx(previewIdx === i ? null : i)}>
                      {previewIdx === i ? <X className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {previewIdx === i ? 'Fechar' : 'Ver'}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { onRestore(v.content); onClose(); }}>
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </Button>
                  </div>
                </div>
                {previewIdx === i && (
                  <div className="p-4 border-t max-h-60 overflow-y-auto prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderContent(v.content) }} />
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
