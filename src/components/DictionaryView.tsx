import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, ArrowLeft, BookOpen, Save, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VocabularyDialog } from './VocabularyDialog';
import { SavedWordsPanel } from './SavedWordsPanel';
import { toast } from '@/hooks/use-toast';
import type { VocabularyEntry, SinonimoGrupo, AnaliseContexto } from '@/types/library';

interface DictionaryResult {
  palavra: string;
  silabas: string;
  fonetica: string;
  classe: string;
  definicoes: string[];
  sinonimos: SinonimoGrupo[];
  antonimos: string[];
  exemplos: string[];
  etimologia: string;
  observacoes: string;
  analiseContexto?: AnaliseContexto;
}

interface BookOption {
  id: string;
  name: string;
  author: string | null;
}

export function DictionaryView() {
  const { user } = useAuth();
  const [searchWord, setSearchWord] = useState('');
  const [contextPhrase, setContextPhrase] = useState('');
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // Source selection
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [sourceType, setSourceType] = useState<string>('livro');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [sourcePage, setSourcePage] = useState<string>('');
  const [books, setBooks] = useState<BookOption[]>([]);
  
  // Saved vocabulary
  const [savedWords, setSavedWords] = useState<VocabularyEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<VocabularyEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load saved vocabulary and books
  useEffect(() => {
    loadVocabulary();
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('id, name, author')
      .order('name', { ascending: true });
    
    if (!error && data) {
      setBooks(data as BookOption[]);
    }
  };

  const loadVocabulary = async () => {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSavedWords(data as unknown as VocabularyEntry[]);
    }
  };

  const searchDictionary = async (word?: string, context?: string) => {
    const wordToSearch = word || searchWord.trim();
    if (!wordToSearch) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('dictionary', {
        body: { word: wordToSearch, context },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setResult(data);
      setShowResult(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar definição. Tente novamente.');
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  const analyzeContext = async () => {
    if (!result || !contextPhrase.trim()) return;
    setIsAnalyzing(true);
    await searchDictionary(result.palavra, contextPhrase.trim());
  };

  const openSaveDialog = () => {
    setShowSourceDialog(true);
    setSourceType('livro');
    setSelectedBookId('');
    setSourcePage('');
  };

  const saveToVocabulary = async () => {
    if (!result || !user) return;
    
    setIsSaving(true);
    try {
      // First try to check if word exists for this user
      const { data: existing } = await supabase
        .from('vocabulary')
        .select('id')
        .ilike('palavra', result.palavra)
        .maybeSingle();

      // Get book details if selected
      const selectedBook = books.find(b => b.id === selectedBookId);
      
      const sourceDetails = sourceType === 'livro' && selectedBook ? {
        bookName: selectedBook.name,
        author: selectedBook.author,
        page: sourcePage ? parseInt(sourcePage) : null,
      } : {};

      const vocabularyData = {
        palavra: result.palavra.toLowerCase(),
        silabas: result.silabas,
        fonetica: result.fonetica,
        classe: result.classe,
        definicoes: result.definicoes as unknown as any,
        sinonimos: result.sinonimos as unknown as any,
        antonimos: result.antonimos as unknown as any,
        exemplos: result.exemplos as unknown as any,
        etimologia: result.etimologia,
        observacoes: result.observacoes,
        analise_contexto: result.analiseContexto as unknown as any || null,
        user_id: user.id,
        book_id: sourceType === 'livro' ? selectedBookId || null : null,
        source_type: sourceType,
        source_details: sourceDetails,
      };

      let error;
      if (existing) {
        // Update existing
        const updateResult = await supabase
          .from('vocabulary')
          .update(vocabularyData)
          .eq('id', existing.id);
        error = updateResult.error;
      } else {
        // Insert new
        const insertResult = await supabase
          .from('vocabulary')
          .insert(vocabularyData);
        error = insertResult.error;
      }

      if (error) throw error;

      toast({
        title: "Palavra salva!",
        description: `"${result.palavra}" foi adicionada ao seu vocabulário.`,
      });

      setShowSourceDialog(false);
      loadVocabulary();
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      searchDictionary();
    }
  };

  const handleBack = () => {
    setShowResult(false);
    setResult(null);
    setContextPhrase('');
  };

  const openWordDetail = (entry: VocabularyEntry) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
  };

  if (showResult && result) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="card-library p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="font-display text-3xl font-bold text-foreground">
              Base de Vocabulário
            </h2>
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>

          {/* Word Header */}
          <div className="mb-6">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-bold text-lg text-primary">{result.palavra}</span>
              <span className="text-muted-foreground">{result.silabas}</span>
              <span className="text-muted-foreground">{result.fonetica}</span>
              <span className="text-muted-foreground">/ {result.classe}</span>
            </div>
          </div>

          {/* Definitions */}
          <ol className="list-decimal list-inside space-y-1 mb-6 text-foreground">
            {result.definicoes.map((def, i) => (
              <li key={i}>{def}</li>
            ))}
          </ol>

          {/* Synonyms */}
          {result.sinonimos && result.sinonimos.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-2">Sinônimos</h3>
              <ul className="space-y-1">
                {result.sinonimos.map((grupo, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground">• {grupo.sentido}:</span>
                    <span className="text-primary">{grupo.palavras.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Antonyms */}
          {result.antonimos && result.antonimos.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-2">Antônimos</h3>
              <p className="text-muted-foreground">{result.antonimos.join(', ')}</p>
            </div>
          )}

          {/* Examples */}
          {result.exemplos && result.exemplos.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-2">Exemplos de uso</h3>
              <ul className="space-y-1">
                {result.exemplos.map((ex, i) => (
                  <li key={i} className="text-primary italic">• "{ex}"</li>
                ))}
              </ul>
            </div>
          )}

          {/* Etymology */}
          {result.etimologia && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-1">Etimologia</h3>
              <p className="text-muted-foreground">{result.etimologia}</p>
            </div>
          )}

          {/* Linguistic Notes */}
          {result.observacoes && (
            <div className="mb-6">
              <h3 className="font-semibold text-foreground mb-1">Observações linguísticas</h3>
              <p className="text-primary">{result.observacoes}</p>
            </div>
          )}

          {/* Context Analysis Section */}
          <div className="border-t pt-6 mt-6">
            <p className="text-primary mb-4">
              Você tem uma frase ou trecho real onde essa palavra aparece para que eu possa analisar o contexto e identificar o sentido correto?
            </p>
            <div className="space-y-3">
              <Textarea
                placeholder="Digite a frase ou trecho..."
                value={contextPhrase}
                onChange={(e) => setContextPhrase(e.target.value)}
                className="w-full min-h-[100px]"
              />
              <Button 
                onClick={analyzeContext} 
                disabled={isAnalyzing || !contextPhrase.trim()}
                variant="secondary"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Analisar contexto
              </Button>
            </div>
          </div>

          {/* Context Analysis Result - New Complete Format */}
          {result.analiseContexto && (
            <div className="mt-8 border-t pt-6">
              <h3 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                📋 Análise de Contexto
              </h3>
              
              <div className="bg-muted/30 rounded-lg p-6 space-y-5">
                {/* Frase original */}
                <div className="border-l-4 border-primary pl-4">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Frase original</p>
                  <p className="text-foreground italic">"{result.analiseContexto.frase}"</p>
                </div>

                {/* Palavra-chave e Classe */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Palavra-chave</p>
                    <p className="text-primary font-bold">{result.analiseContexto.palavraChave || result.palavra}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Classe gramatical</p>
                    <p className="text-foreground">{result.analiseContexto.classeGramatical || result.classe}</p>
                  </div>
                </div>

                {/* Sentido identificado */}
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sentido identificado no contexto</p>
                  <p className="text-foreground">{result.analiseContexto.sentidoIdentificado}</p>
                </div>

                {/* Explicação */}
                <div className="bg-background/50 rounded-md p-4">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Explicação</p>
                  <p className="text-foreground">{result.analiseContexto.explicacao}</p>
                </div>

                {/* Uso comum vs técnico */}
                {result.analiseContexto.usoComumVsTecnico && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Uso comum vs uso técnico</p>
                    <p className="text-foreground">{result.analiseContexto.usoComumVsTecnico}</p>
                  </div>
                )}

                {/* Sinônimos adequados */}
                {result.analiseContexto.sinonimosAdequados && result.analiseContexto.sinonimosAdequados.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sinônimos adequados ao contexto</p>
                    <div className="flex flex-wrap gap-2">
                      {result.analiseContexto.sinonimosAdequados.map((sin, i) => (
                        <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {sin}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exemplo simples */}
                {result.analiseContexto.exemploSimples && (
                  <div className="bg-secondary/20 rounded-md p-4">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Exemplo simples</p>
                    <p className="text-foreground">{result.analiseContexto.exemploSimples}</p>
                  </div>
                )}

                {/* Observação de nuance */}
                {(result.analiseContexto.observacaoNuance || result.analiseContexto.observacao) && (
                  <div className="border-l-4 border-accent pl-4">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observação de nuance</p>
                    <p className="text-foreground">{result.analiseContexto.observacaoNuance || result.analiseContexto.observacao}</p>
                  </div>
                )}

                {/* Frase reescrita */}
                {result.analiseContexto.fraseReescrita && (
                  <div className="border-l-4 border-secondary pl-4">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Frase reescrita</p>
                    <p className="text-foreground italic">"{result.analiseContexto.fraseReescrita}"</p>
                  </div>
                )}

                {/* Aplicação prática */}
                {result.analiseContexto.aplicacaoPratica && (
                  <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aplicação prática</p>
                    <p className="text-foreground">{result.analiseContexto.aplicacaoPratica}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save Button - at the end */}
          <div className="border-t pt-6 mt-6">
            <Button 
              onClick={openSaveDialog} 
              disabled={isSaving}
              size="lg"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar palavra no vocabulário
            </Button>
          </div>
        </div>

        {/* Source Selection Dialog */}
        <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Book className="w-5 h-5" />
                Selecionar Fonte
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Fonte</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="livro">📚 Livro Registrado</SelectItem>
                    <SelectItem value="artigo">📄 Artigo</SelectItem>
                    <SelectItem value="site">🌐 Site/Web</SelectItem>
                    <SelectItem value="outro">📝 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sourceType === 'livro' && (
                <>
                  <div className="space-y-2">
                    <Label>Livro</Label>
                    <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um livro..." />
                      </SelectTrigger>
                      <SelectContent>
                        {books.map((book) => (
                          <SelectItem key={book.id} value={book.id}>
                            {book.name} {book.author && `- ${book.author}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {books.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nenhum livro cadastrado. Cadastre um livro primeiro.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Página (opcional)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 42"
                      value={sourcePage}
                      onChange={(e) => setSourcePage(e.target.value)}
                    />
                  </div>
                </>
              )}

              {sourceType !== 'livro' && (
                <p className="text-sm text-muted-foreground">
                  A palavra será salva sem vínculo com um livro específico.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSourceDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={saveToVocabulary} 
                disabled={isSaving || (sourceType === 'livro' && !selectedBookId && books.length > 0)}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Palavra
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Dicionário</h2>
        <p className="text-muted-foreground">Consulte significados de palavras em português</p>
      </div>

      {/* Search */}
      <div className="card-library p-6">
        <div className="flex gap-4 max-w-xl">
          <Input
            placeholder="Digite uma palavra em português..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={() => searchDictionary()} disabled={isLoading || !searchWord.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="ml-2">Buscar</span>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Saved Vocabulary - Novo componente escalável */}
      <SavedWordsPanel
        words={savedWords}
        books={books}
        onSelectWord={openWordDetail}
      />

      {/* Empty state */}
      {!result && !error && !isLoading && savedWords.length === 0 && (
        <div className="card-library p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Digite uma palavra para buscar sua definição completa
          </p>
        </div>
      )}

      {/* Vocabulary Dialog - Atualizado com conexões e edição de vínculo */}
      <VocabularyDialog 
        entry={selectedEntry} 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        allWords={savedWords}
        onSelectRelatedWord={(entry) => {
          setSelectedEntry(entry);
        }}
        onEntryUpdated={() => {
          loadVocabulary();
          // Atualizar o entry selecionado com os novos dados
          if (selectedEntry) {
            supabase
              .from('vocabulary')
              .select('*')
              .eq('id', selectedEntry.id)
              .maybeSingle()
              .then(({ data }) => {
                if (data) {
                  setSelectedEntry(data as unknown as VocabularyEntry);
                }
              });
          }
        }}
      />
    </div>
  );
}