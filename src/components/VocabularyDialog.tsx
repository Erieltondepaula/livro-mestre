import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Book, Link2, Pencil, Loader2, Unlink, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { VocabularyEntry } from '@/types/library';

interface BookOption {
  id: string;
  name: string;
  author: string | null;
}

interface VocabularyDialogProps {
  entry: VocabularyEntry | null;
  isOpen: boolean;
  onClose: () => void;
  allWords?: VocabularyEntry[];
  onSelectRelatedWord?: (entry: VocabularyEntry) => void;
  onEntryUpdated?: () => void;
}

export function VocabularyDialog({ entry, isOpen, onClose, allWords = [], onSelectRelatedWord, onEntryUpdated }: VocabularyDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [sourcePage, setSourcePage] = useState<string>('');

  // Reset edit state when entry changes
  useEffect(() => {
    if (entry) {
      setIsEditing(false);
      setSelectedBookId(entry.book_id || '');
      setSourcePage(entry.source_details?.page?.toString() || '');
    }
  }, [entry]);

  // Load books when editing starts
  useEffect(() => {
    if (isEditing) {
      loadBooks();
    }
  }, [isEditing]);

  const loadBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('id, name, author')
      .order('name', { ascending: true });
    
    if (data) {
      setBooks(data as BookOption[]);
    }
  };

  const handleSaveBookLink = async () => {
    if (!entry) return;
    
    setIsSaving(true);
    try {
      const selectedBook = books.find(b => b.id === selectedBookId);
      
      const sourceDetails = selectedBookId && selectedBook ? {
        bookName: selectedBook.name,
        author: selectedBook.author,
        page: sourcePage ? parseInt(sourcePage) : null,
      } : {};

      const { error } = await supabase
        .from('vocabulary')
        .update({
          book_id: selectedBookId || null,
          source_type: selectedBookId ? 'livro' : entry.source_type === 'livro' ? 'outro' : entry.source_type,
          source_details: selectedBookId ? sourceDetails : {},
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast({
        title: selectedBookId ? "Livro vinculado!" : "Vínculo removido!",
        description: selectedBookId 
          ? `"${entry.palavra}" agora está vinculada a "${selectedBook?.name}".`
          : `"${entry.palavra}" não está mais vinculada a nenhum livro.`,
      });

      setIsEditing(false);
      onEntryUpdated?.();
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBookLink = () => {
    setSelectedBookId('');
    setSourcePage('');
  };

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

          {/* Source Info / Edit Book Link */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Book className="w-4 h-4" />
                Fonte
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(!isEditing)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-4 h-4 mr-1" />
                {isEditing ? 'Cancelar' : 'Editar vínculo'}
              </Button>
            </div>

            {isEditing ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Vincular a um livro</Label>
                  <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um livro (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum livro</SelectItem>
                      {books.map(book => (
                        <SelectItem key={book.id} value={book.id}>
                          📖 {book.name} {book.author && `- ${book.author}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedBookId && selectedBookId !== 'none' && (
                  <div className="space-y-2">
                    <Label>Página (opcional)</Label>
                    <Input
                      type="number"
                      placeholder="Número da página"
                      value={sourcePage}
                      onChange={(e) => setSourcePage(e.target.value)}
                      min="1"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleSaveBookLink} 
                    disabled={isSaving}
                    size="sm"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Salvar
                  </Button>
                  {entry.book_id && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRemoveBookLink}
                    >
                      <Unlink className="w-4 h-4 mr-1" />
                      Remover vínculo
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Tipo:</span> {getSourceLabel(entry.source_type)}</p>
                {entry.source_details?.bookName ? (
                  <>
                    <p><span className="text-muted-foreground">Livro:</span> {entry.source_details.bookName}</p>
                    {entry.source_details.author && (
                      <p><span className="text-muted-foreground">Autor:</span> {entry.source_details.author}</p>
                    )}
                    {entry.source_details.page && (
                      <p><span className="text-muted-foreground">Página:</span> {entry.source_details.page}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground italic">
                    Nenhum livro vinculado. Clique em "Editar vínculo" para associar esta palavra a um livro.
                  </p>
                )}
              </div>
            )}
          </div>

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

          {/* Context Analysis - Complete v2 */}
          {entry.analise_contexto && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                📋 Análise de Contexto
              </h4>
              <div className="bg-muted/30 rounded-lg p-4 space-y-4 text-sm">
                {/* Frase original */}
                <div className="border-l-4 border-primary pl-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Frase original</p>
                  <p className="text-foreground italic">"{entry.analise_contexto.frase}"</p>
                </div>

                {/* Palavra-chave e Classe */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Palavra-chave</p>
                    <p className="text-primary font-bold">{entry.analise_contexto.palavraChave || entry.palavra}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Classe gramatical</p>
                    <p className="text-foreground">{entry.analise_contexto.classeGramatical || entry.classe}</p>
                  </div>
                </div>

                {/* Sentido identificado */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sentido identificado</p>
                  <p className="text-foreground">{entry.analise_contexto.sentidoIdentificado}</p>
                </div>

                {/* Explicação */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Explicação</p>
                  <p className="text-foreground">{entry.analise_contexto.explicacao}</p>
                </div>

                {/* Uso comum vs técnico */}
                {entry.analise_contexto.usoComumVsTecnico && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Uso comum vs técnico</p>
                    <p className="text-foreground">{entry.analise_contexto.usoComumVsTecnico}</p>
                  </div>
                )}

                {/* Sinônimos adequados */}
                {entry.analise_contexto.sinonimosAdequados && entry.analise_contexto.sinonimosAdequados.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sinônimos adequados</p>
                    <div className="flex flex-wrap gap-1">
                      {entry.analise_contexto.sinonimosAdequados.map((sin, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                          {sin}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exemplo simples */}
                {entry.analise_contexto.exemploSimples && (
                  <div className="bg-secondary/20 rounded p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Exemplo simples</p>
                    <p className="text-foreground">{entry.analise_contexto.exemploSimples}</p>
                  </div>
                )}

                {/* Observação de nuance */}
                {(entry.analise_contexto.observacaoNuance || entry.analise_contexto.observacao) && (
                  <div className="border-l-4 border-accent pl-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observação de nuance</p>
                    <p className="text-foreground">{entry.analise_contexto.observacaoNuance || entry.analise_contexto.observacao}</p>
                  </div>
                )}

                {/* Frase reescrita */}
                {entry.analise_contexto.fraseReescrita && (
                  <div className="border-l-4 border-secondary pl-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Frase reescrita</p>
                    <p className="text-foreground italic">"{entry.analise_contexto.fraseReescrita}"</p>
                  </div>
                )}

                {/* Aplicação prática */}
                {entry.analise_contexto.aplicacaoPratica && (
                  <div className="bg-primary/5 border border-primary/20 rounded p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aplicação prática</p>
                    <p className="text-foreground">{entry.analise_contexto.aplicacaoPratica}</p>
                  </div>
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
