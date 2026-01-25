import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Book, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { VocabularyEntry } from '@/types/library';

interface VocabularyDialogProps {
  entry: VocabularyEntry | null;
  isOpen: boolean;
  onClose: () => void;
  allWords?: VocabularyEntry[];
  onSelectRelatedWord?: (entry: VocabularyEntry) => void;
}

export function VocabularyDialog({ entry, isOpen, onClose, allWords = [], onSelectRelatedWord }: VocabularyDialogProps) {
  if (!entry) return null;

  const getSourceLabel = (type: string | null | undefined) => {
    switch (type) {
      case 'livro': return '📚 Livro';
      case 'artigo': return '📄 Artigo';
      case 'site': return '🌐 Site/Web';
      default: return '📝 Outro';
    }
  };

  // Encontrar palavras relacionadas
  const findRelatedWords = (): VocabularyEntry[] => {
    if (!allWords || allWords.length <= 1) return [];
    
    const related: Set<string> = new Set();
    const currentWordLower = entry.palavra.toLowerCase();
    
    // Por sinônimos compartilhados
    entry.sinonimos?.forEach(grupo => {
      grupo.palavras?.forEach(sinonimo => {
        const sinonimoLower = sinonimo.toLowerCase();
        allWords.forEach(word => {
          if (word.id !== entry.id && word.palavra.toLowerCase() === sinonimoLower) {
            related.add(word.id);
          }
          // Também verificar se outras palavras têm este sinônimo
          word.sinonimos?.forEach(g => {
            g.palavras?.forEach(s => {
              if (s.toLowerCase() === currentWordLower && word.id !== entry.id) {
                related.add(word.id);
              }
            });
          });
        });
      });
    });

    // Por antônimos compartilhados
    entry.antonimos?.forEach(antonimo => {
      const antonimoLower = antonimo.toLowerCase();
      allWords.forEach(word => {
        if (word.id !== entry.id && word.palavra.toLowerCase() === antonimoLower) {
          related.add(word.id);
        }
      });
    });

    // Por campo semântico similar (via análise de contexto)
    if (entry.analise_contexto?.sentidoIdentificado) {
      const sentido = entry.analise_contexto.sentidoIdentificado.toLowerCase();
      allWords.forEach(word => {
        if (word.id !== entry.id && 
            word.analise_contexto?.sentidoIdentificado?.toLowerCase() === sentido) {
          related.add(word.id);
        }
      });
    }

    // Por classe gramatical similar E mesma fonte
    if (entry.classe && entry.book_id) {
      allWords.forEach(word => {
        if (word.id !== entry.id && 
            word.classe === entry.classe && 
            word.book_id === entry.book_id) {
          related.add(word.id);
        }
      });
    }

    return allWords.filter(w => related.has(w.id)).slice(0, 10);
  };

  const relatedWords = findRelatedWords();

  const handleRelatedWordClick = (relatedEntry: VocabularyEntry) => {
    if (onSelectRelatedWord) {
      onSelectRelatedWord(relatedEntry);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display flex items-center gap-2">
            {entry.palavra}
            {entry.book_id && <Book className="w-5 h-5 text-primary" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Word Header */}
          <div className="flex items-baseline gap-3 flex-wrap text-sm text-muted-foreground">
            {entry.silabas && <span>{entry.silabas}</span>}
            {entry.fonetica && <span>{entry.fonetica}</span>}
            {entry.classe && <span>/ {entry.classe}</span>}
          </div>

          {/* Related Words - Nova seção de conexões */}
          {relatedWords.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                Palavras Relacionadas
                <Badge variant="secondary" className="text-xs">{relatedWords.length}</Badge>
              </h4>
              <div className="flex flex-wrap gap-2">
                {relatedWords.map((related) => (
                  <button
                    key={related.id}
                    onClick={() => handleRelatedWordClick(related)}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1"
                  >
                    {related.book_id && <Book className="w-3 h-3 opacity-60" />}
                    {related.palavra}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Clique para ver os detalhes de uma palavra relacionada
              </p>
            </div>
          )}

          {/* Source Info */}
          {(entry.source_type || entry.source_details) && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Book className="w-4 h-4" />
                Fonte
              </h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Tipo:</span> {getSourceLabel(entry.source_type)}</p>
                {entry.source_details?.bookName && (
                  <p><span className="text-muted-foreground">Livro:</span> {entry.source_details.bookName}</p>
                )}
                {entry.source_details?.author && (
                  <p><span className="text-muted-foreground">Autor:</span> {entry.source_details.author}</p>
                )}
                {entry.source_details?.page && (
                  <p><span className="text-muted-foreground">Página:</span> {entry.source_details.page}</p>
                )}
              </div>
            </div>
          )}

          {/* Definitions */}
          {entry.definicoes && entry.definicoes.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2">Definições</h4>
              <ol className="list-decimal list-inside space-y-1 text-foreground">
                {entry.definicoes.map((def, i) => (
                  <li key={i}>{def}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Synonyms */}
          {entry.sinonimos && entry.sinonimos.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2">Sinônimos</h4>
              <ul className="space-y-1">
                {entry.sinonimos.map((grupo, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground">• {grupo.sentido}:</span>
                    <span className="text-primary">{grupo.palavras.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Antonyms */}
          {entry.antonimos && entry.antonimos.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2">Antônimos</h4>
              <p className="text-muted-foreground">{entry.antonimos.join(', ')}</p>
            </div>
          )}

          {/* Examples */}
          {entry.exemplos && entry.exemplos.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2">Exemplos de uso</h4>
              <ul className="space-y-1">
                {entry.exemplos.map((ex, i) => (
                  <li key={i} className="text-primary italic text-sm">• "{ex}"</li>
                ))}
              </ul>
            </div>
          )}

          {/* Etymology */}
          {entry.etimologia && (
            <div>
              <h4 className="font-semibold text-foreground mb-1">Etimologia</h4>
              <p className="text-muted-foreground text-sm">{entry.etimologia}</p>
            </div>
          )}

          {/* Linguistic Notes */}
          {entry.observacoes && (
            <div>
              <h4 className="font-semibold text-foreground mb-1">Observações linguísticas</h4>
              <p className="text-primary text-sm">{entry.observacoes}</p>
            </div>
          )}

          {/* Context Analysis */}
          {entry.analise_contexto && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-foreground mb-3">Análise de Contexto</h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p><span className="font-semibold">Frase original:</span> "{entry.analise_contexto.frase}"</p>
                <p><span className="font-semibold">Sentido identificado:</span> {entry.analise_contexto.sentidoIdentificado}</p>
                <p><span className="font-semibold">Explicação:</span> {entry.analise_contexto.explicacao}</p>
                {entry.analise_contexto.sinonimosAdequados && entry.analise_contexto.sinonimosAdequados.length > 0 && (
                  <p><span className="font-semibold">Sinônimos adequados:</span> {entry.analise_contexto.sinonimosAdequados.join(', ')}</p>
                )}
                {entry.analise_contexto.fraseReescrita && (
                  <p><span className="font-semibold">Frase reescrita:</span> {entry.analise_contexto.fraseReescrita}</p>
                )}
              </div>
            </div>
          )}

          {/* Created Date */}
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Adicionado em: {new Date(entry.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
