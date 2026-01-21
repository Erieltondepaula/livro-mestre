import { useState } from 'react';
import { Search, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Phonetic {
  text?: string;
  audio?: string;
}

interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms?: string[];
}

interface DictionaryResult {
  word: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
}

export function DictionaryView() {
  const [searchWord, setSearchWord] = useState('');
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchDictionary = async () => {
    if (!searchWord.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchWord.trim())}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError('Palavra não encontrada. Verifique a ortografia e tente novamente.');
        } else {
          setError('Erro ao buscar definição. Tente novamente mais tarde.');
        }
        return;
      }

      const data = await response.json();
      if (data && data.length > 0) {
        setResult(data[0]);
      }
    } catch (err) {
      setError('Não foi possível conectar ao dicionário. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchDictionary();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">Dicionário</h2>
        <p className="text-muted-foreground">Consulte significados e termos em inglês</p>
      </div>

      {/* Search */}
      <div className="card-library p-6">
        <div className="flex gap-4 max-w-xl">
          <Input
            placeholder="Digite uma palavra em inglês..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={searchDictionary} disabled={isLoading || !searchWord.trim()}>
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

      {/* Result */}
      {result && (
        <div className="card-library p-6 space-y-6">
          {/* Word Header */}
          <div className="flex items-center gap-4">
            <h3 className="font-display text-3xl font-bold text-foreground">
              {result.word}
            </h3>
            {result.phonetics?.map((phonetic, index) => (
              <div key={index} className="flex items-center gap-2">
                {phonetic.text && (
                  <span className="text-muted-foreground text-lg">{phonetic.text}</span>
                )}
                {phonetic.audio && (
                  <button
                    onClick={() => playAudio(phonetic.audio!)}
                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                    title="Ouvir pronúncia"
                  >
                    <Volume2 className="w-5 h-5 text-primary" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Meanings */}
          <div className="space-y-6">
            {result.meanings?.map((meaning, index) => (
              <div key={index} className="space-y-3">
                <h4 className="font-semibold text-primary capitalize">
                  {meaning.partOfSpeech}
                </h4>
                
                <ul className="space-y-3">
                  {meaning.definitions?.slice(0, 5).map((def, defIndex) => (
                    <li key={defIndex} className="pl-4 border-l-2 border-secondary">
                      <p className="text-foreground">{def.definition}</p>
                      {def.example && (
                        <p className="text-muted-foreground text-sm mt-1 italic">
                          "{def.example}"
                        </p>
                      )}
                    </li>
                  ))}
                </ul>

                {meaning.synonyms && meaning.synonyms.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">Sinónimos:</span>
                    {meaning.synonyms.slice(0, 5).map((syn, synIndex) => (
                      <button
                        key={synIndex}
                        onClick={() => {
                          setSearchWord(syn);
                          searchDictionary();
                        }}
                        className="text-sm px-2 py-1 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {syn}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && !isLoading && (
        <div className="card-library p-12 text-center">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Digite uma palavra para buscar sua definição
          </p>
        </div>
      )}
    </div>
  );
}
