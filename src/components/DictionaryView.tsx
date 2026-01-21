import { useState } from 'react';
import { Search, Loader2, AlertCircle, ArrowLeft, BookOpen, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface SinonimoGrupo {
  sentido: string;
  palavras: string[];
}

interface AnaliseContexto {
  frase: string;
  sentidoIdentificado: string;
  explicacao: string;
  sentidosNaoAplicaveis: string[];
  sinonimosAdequados: string[];
  fraseReescrita: string;
  observacao: string;
}

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

export function DictionaryView() {
  const [searchWord, setSearchWord] = useState('');
  const [contextPhrase, setContextPhrase] = useState('');
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

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
              <Input
                placeholder="Digite a frase ou trecho..."
                value={contextPhrase}
                onChange={(e) => setContextPhrase(e.target.value)}
                className="w-full"
              />
              <Button 
                onClick={analyzeContext} 
                disabled={isAnalyzing || !contextPhrase.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Analisar contexto e guardar na base
              </Button>
            </div>
          </div>

          {/* Context Analysis Result */}
          {result.analiseContexto && (
            <div className="mt-8 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <p className="text-sm text-muted-foreground mb-1">Etapa A - Nota da Palavra 📋 03 - Palavras</p>
                  <h4 className="font-bold text-foreground">{result.palavra}</h4>
                  <p className="text-sm text-muted-foreground mt-2">{result.definicoes[0]}</p>
                </div>

                <div className="border-l-4 border-accent pl-4">
                  <p className="text-sm text-muted-foreground mb-1">Etapa B - Nota de Conceito 📋 02 - Conceitos</p>
                  <h4 className="font-semibold text-foreground">Complexidade Decisória</h4>
                  <p className="text-sm text-muted-foreground">{result.analiseContexto.explicacao}</p>
                  <p className="text-sm text-muted-foreground mt-1">Palavras ligadas: [[{result.palavra}]]</p>
                </div>

                <div className="border-l-4 border-secondary pl-4">
                  <p className="text-sm text-muted-foreground mb-1">Etapa C - Nota de Campo Semântico 📋 05 - Campos Semânticos</p>
                  <h4 className="font-semibold text-foreground">Quantificadores de Magnitude</h4>
                  <p className="text-sm text-muted-foreground">Grupo de palavras utilizadas para descrever quantidades que fogem ao controle comum ou que sugerem imensidão.</p>
                  <p className="text-sm text-muted-foreground mt-1">Palavras deste campo: [[{result.palavra}]]</p>
                </div>

                <div className="border-l-4 border-muted-foreground pl-4">
                  <p className="text-sm text-muted-foreground mb-1">Etapa D - Nota de Contexto 📋 04 - Contextos</p>
                  <p className="text-sm"><span className="font-semibold">Frase original:</span> "{result.analiseContexto.frase}"</p>
                  <p className="text-sm"><span className="font-semibold">Palavra analisada:</span> [[{result.palavra}]]</p>
                  <p className="text-sm"><span className="font-semibold">Sentido identificado:</span> {result.analiseContexto.sentidoIdentificado}</p>
                  <p className="text-sm"><span className="font-semibold">Explicação:</span> {result.analiseContexto.explicacao}</p>
                  {result.analiseContexto.sentidosNaoAplicaveis && result.analiseContexto.sentidosNaoAplicaveis.length > 0 && (
                    <p className="text-sm"><span className="font-semibold">Sentidos não aplicáveis:</span> {result.analiseContexto.sentidosNaoAplicaveis.join(', ')}</p>
                  )}
                  <p className="text-sm"><span className="font-semibold">Sinônimos adequados:</span> {result.analiseContexto.sinonimosAdequados?.join(', ')}</p>
                  <p className="text-sm"><span className="font-semibold">Frase reescrita:</span> {result.analiseContexto.fraseReescrita}</p>
                  <p className="text-sm"><span className="font-semibold">Observação:</span> {result.analiseContexto.observacao}</p>
                </div>

                <div className="border-l-4 border-primary/50 pl-4">
                  <p className="text-sm text-muted-foreground mb-1">Etapa E - Nota de Fonte 📋 01 - Fonte</p>
                  <h4 className="font-semibold text-foreground">Frase sobre Relacionamentos</h4>
                  <p className="text-sm"><span className="font-semibold">Tipo:</span> Outro</p>
                  <p className="text-sm"><span className="font-semibold">Autor:</span> Desconhecido (Trecho fornecido pelo usuário)</p>
                  <p className="text-sm"><span className="font-semibold">Ano:</span></p>
                  <p className="text-sm"><span className="font-semibold">Página ou local:</span></p>
                  <p className="text-sm"><span className="font-semibold">Palavras encontradas:</span> [[{result.palavra}]]</p>
                </div>
              </div>
            </div>
          )}
        </div>
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

      {/* Empty state */}
      {!result && !error && !isLoading && (
        <div className="card-library p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Digite uma palavra para buscar sua definição completa
          </p>
        </div>
      )}
    </div>
  );
}
