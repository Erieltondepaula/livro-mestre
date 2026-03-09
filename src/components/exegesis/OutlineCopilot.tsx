import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Brain, AlertTriangle, CheckCircle2, Lightbulb, BookOpen, 
  Sparkles, Type, AlertCircle, ChevronDown, ChevronUp, 
  RefreshCw, Target, FileText, Loader2, X, Globe, Database,
  Video, BookMarked, BarChart3, Check, XCircle, Copy, GripVertical,
  ExternalLink, Search, Compass, ArrowRight, Mic, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// ===== Types =====
interface GrammarIssue {
  type: 'punctuation' | 'capitalization' | 'spelling' | 'word_choice' | 'concordance' | 'regency' | 'crase' | 'colocacao_pronominal' | 'pleonasm' | 'redundancy' | 'coesao';
  position: number;
  text: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  explanation?: string;
}

interface CoherenceCheck {
  element: string;
  relatesTo: string;
  isCoherent: boolean;
  reason?: string;
  suggestion?: string;
}

interface BiblicalSuggestion {
  reference: string;
  reason: string;
  context: string;
}

interface WordSuggestion {
  original: string;
  alternatives: string[];
  reason: string;
}

interface ThematicAlert {
  isOffTopic: boolean;
  message: string;
  currentElement: string;
  expectedConnection: string;
}

interface DetectedPosition {
  currentSection: string;
  currentPointNumber?: number | null;
  completedSections: string[];
  nextExpectedSection: string;
  progressPercent: number;
  guidance: string;
  sectionTip: string;
  contentSuggestions?: string[];
}

interface PointDetail {
  number: number;
  hasExplanation: boolean;
  hasIllustration: boolean;
  hasTruth: boolean;
  hasApplication: boolean;
  explanationParagraphs?: number;
}

interface StructureAnalysis {
  hasTitle: boolean;
  hasTheme: boolean;
  hasBaseText: boolean;
  hasIntroduction: boolean;
  pointsCount: number;
  hasConclusion: boolean;
  hasAppeal: boolean;
  hasFinalPrayer?: boolean;
  pointsDetail?: PointDetail[];
}

interface BaseTextContext {
  passage?: string;
  historicalContext?: string;
  literaryContext?: string;
  culturalContext?: string;
  theologicalContext?: string;
  keyTerms?: Array<{ term: string; transliteration?: string; meaning: string; strongNumber?: string }>;
  hermeneuticalDangers?: string[];
  anchorReminder?: string;
  narrativePosition?: string;
}

interface CopilotAnalysis {
  overallScore: number;
  detectedPosition?: DetectedPosition;
  grammarIssues: GrammarIssue[];
  coherenceChecks: CoherenceCheck[];
  biblicalSuggestions: BiblicalSuggestion[];
  wordSuggestions: WordSuggestion[];
  thematicAlert?: ThematicAlert;
  structureAnalysis: StructureAnalysis;
  baseTextContext?: BaseTextContext | null;
}

// Research Types
interface InternalSource {
  materialTitle: string;
  relevance: string;
  suggestedUse: string;
}

interface BiblicalReference {
  reference: string;
  text?: string;
  connection: string;
  type: string;
}

interface ExternalSource {
  title: string;
  type: string;
  description: string;
  url?: string;
  relevance: string;
  preacherName?: string;
}

interface DataIllustration {
  title: string;
  content: string;
  source: string;
  suggestedPlacement: string;
}

interface SimilarSermon {
  preacher: string;
  title: string;
  approach: string;
  difference: string;
  url?: string;
}

interface ResearchData {
  contextualNote?: string;
  currentSectionHelp?: string;
  internalSources: InternalSource[];
  biblicalReferences: BiblicalReference[];
  externalSources: ExternalSource[];
  dataAndIllustrations: DataIllustration[];
  similarSermons?: SimilarSermon[];
}

interface PreviousElements {
  title?: string;
  theme?: string;
  baseText?: string;
  introduction?: string;
  points?: Array<{
    title?: string;
    development?: string;
    illustration?: string;
    phrase?: string;
    application?: string;
  }>;
  conclusion?: string;
}

interface Props {
  content: string;
  currentElement: string;
  previousElements?: PreviousElements;
  onApplySuggestion?: (original: string, replacement: string) => void;
  onInsertReference?: (reference: string) => void;
  onInsertContent?: (content: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  titulo: '📌 Título',
  tema: '🎯 Tema',
  texto_base: '📖 Texto Base',
  introducao: '🚪 Introdução',
  transicao: '🔗 Transição',
  ponto_1: '1️⃣ Ponto 1',
  explicacao_1: '📝 Explicação (P1)',
  ilustracao_1: '💡 Ilustração (P1)',
  verdade_1: '✨ Verdade (P1)',
  aplicacao_1: '🎯 Aplicação (P1)',
  ponto_2: '2️⃣ Ponto 2',
  explicacao_2: '📝 Explicação (P2)',
  ilustracao_2: '💡 Ilustração (P2)',
  verdade_2: '✨ Verdade (P2)',
  aplicacao_2: '🎯 Aplicação (P2)',
  ponto_3: '3️⃣ Ponto 3',
  explicacao_3: '📝 Explicação (P3)',
  ilustracao_3: '💡 Ilustração (P3)',
  verdade_3: '✨ Verdade (P3)',
  aplicacao_3: '🎯 Aplicação (P3)',
  ponto_4: '4️⃣ Ponto 4',
  explicacao_4: '📝 Explicação (P4)',
  ilustracao_4: '💡 Ilustração (P4)',
  verdade_4: '✨ Verdade (P4)',
  aplicacao_4: '🎯 Aplicação (P4)',
  conclusao: '🏁 Conclusão',
  apelo: '🙏 Apelo',
  oracao_final: '✝️ Oração Final',
};

const SOURCE_TYPE_ICONS: Record<string, typeof Globe> = {
  artigo: Globe,
  video: Video,
  livro: BookMarked,
  blog: Globe,
  documentario: Video,
  pesquisa: BarChart3,
  comentario: BookOpen,
  pregacao: Mic,
};

export function OutlineCopilot({ content, currentElement, previousElements, onApplySuggestion, onInsertReference, onInsertContent }: Props) {
  const [analysis, setAnalysis] = useState<CopilotAnalysis | null>(null);
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'guide' | 'analysis' | 'research'>('guide');
  const [expandedSections, setExpandedSections] = useState<string[]>(['guide', 'alert', 'grammar', 'coherence', 'similar']);
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const researchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContentRef = useRef<string>('');
  const lastResearchContentRef = useRef<string>('');

  const analyzeContent = useCallback(async () => {
    if (!content || content.replace(/<[^>]+>/g, '').trim().length < 10) {
      setAnalysis(null);
      return;
    }

    const plainContent = content.replace(/<[^>]+>/g, '').trim();
    if (plainContent === lastContentRef.current) return;
    lastContentRef.current = plainContent;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outline-copilot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            content: plainContent,
            currentElement,
            previousElements,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Copilot error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao analisar');
    } finally {
      setIsLoading(false);
    }
  }, [content, currentElement, previousElements]);

  const doResearch = useCallback(async () => {
    const plainContent = content?.replace(/<[^>]+>/g, '').trim() || '';
    if (plainContent.length < 20) {
      setResearch(null);
      return;
    }
    if (plainContent === lastResearchContentRef.current) return;
    lastResearchContentRef.current = plainContent;

    setIsResearching(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outline-copilot-research`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            content: plainContent,
            currentElement,
            theme: previousElements?.theme,
            title: previousElements?.title,
            previousElements,
            detectedPosition: analysis?.detectedPosition,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      setResearch(data);
      setDismissedItems(new Set());
    } catch (err) {
      console.error('Research error:', err);
    } finally {
      setIsResearching(false);
    }
  }, [content, currentElement, previousElements, analysis?.detectedPosition]);

  // Debounced analysis
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => analyzeContent(), 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [content, analyzeContent]);

  // Debounced research
  useEffect(() => {
    if (researchDebounceRef.current) clearTimeout(researchDebounceRef.current);
    researchDebounceRef.current = setTimeout(() => doResearch(), 3000);
    return () => { if (researchDebounceRef.current) clearTimeout(researchDebounceRef.current); };
  }, [content, doResearch]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'border-red-500 bg-red-500/10';
    if (severity === 'medium') return 'border-amber-500 bg-amber-500/10';
    return 'border-blue-500 bg-blue-500/10';
  };

  const handleApply = (original: string, replacement: string) => {
    if (onApplySuggestion) {
      onApplySuggestion(original, replacement);
      toast({ title: 'Sugestão aplicada!' });
    }
  };

  const handleInsertRef = (ref: string) => {
    if (onInsertReference) {
      onInsertReference(ref);
      toast({ title: 'Referência inserida!' });
    }
  };

  const handleAcceptContent = (text: string) => {
    if (onInsertContent) {
      onInsertContent(text);
      toast({ title: 'Conteúdo inserido no esboço!' });
    }
  };

  const handleDismiss = (itemKey: string) => {
    setDismissedItems(prev => new Set([...prev, itemKey]));
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const researchCount = research
    ? (research.internalSources?.length || 0) +
      (research.biblicalReferences?.length || 0) +
      (research.externalSources?.length || 0) +
      (research.dataAndIllustrations?.length || 0) +
      (research.similarSermons?.length || 0)
    : 0;

  const detectedPos = analysis?.detectedPosition;

  if (!content || content.replace(/<[^>]+>/g, '').trim().length < 10) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Brain className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Comece a digitar seu esboço para ativar o Copiloto IA
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          O assistente vai detectar sua estrutura e guiar a elaboração em tempo real
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 p-2 sm:p-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Brain className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold truncate">Copiloto IA</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            {isResearching && <Search className="w-3 h-3 animate-pulse text-blue-500" />}
            {analysis && (
              <div className="flex items-center gap-1">
                <span className={`text-[10px] sm:text-xs font-bold ${getScoreColor(analysis.overallScore)}`}>
                  {analysis.overallScore}%
                </span>
                <div className="w-8 sm:w-10 h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${getScoreBg(analysis.overallScore)}`} style={{ width: `${analysis.overallScore}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detected Position Badge */}
        {detectedPos && (
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
              📍 {SECTION_LABELS[detectedPos.currentSection] || detectedPos.currentSection}
            </span>
            {detectedPos.progressPercent > 0 && (
              <span className="text-[9px] text-muted-foreground">
                {detectedPos.progressPercent}% completo
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 text-[10px] sm:text-xs py-1.5 px-1.5 rounded-md transition-colors ${
              activeTab === 'guide'
                ? 'bg-emerald-500/10 text-emerald-600 font-semibold'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            🧭 Guia
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 text-[10px] sm:text-xs py-1.5 px-1.5 rounded-md transition-colors ${
              activeTab === 'analysis'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            📝 Análise
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`flex-1 text-[10px] sm:text-xs py-1.5 px-1.5 rounded-md transition-colors relative ${
              activeTab === 'research'
                ? 'bg-blue-500/10 text-blue-600 font-semibold'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            🔍 Pesquisa
            {researchCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-blue-500 text-white text-[8px] rounded-full flex items-center justify-center px-1">
                {researchCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-auto p-2 space-y-2 min-h-0">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={analyzeContent}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* ============ GUIDE TAB ============ */}
        {activeTab === 'guide' && (
          <>
            {isLoading && !analysis && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Compass className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Analisando estrutura...</p>
                </div>
              </div>
            )}

            {/* Contextual Note from Research */}
            {research?.contextualNote && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-700 mb-1">💡 Copiloto encontrou:</p>
                    <p className="text-blue-700/90">{research.contextualNote}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Guidance */}
            {detectedPos && (
              <>
                {/* Current Position & Guidance */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-emerald-700">
                        Você está em: {SECTION_LABELS[detectedPos.currentSection] || detectedPos.currentSection}
                      </p>
                      {detectedPos.guidance && (
                        <p className="text-emerald-700/80 mt-1">{detectedPos.guidance}</p>
                      )}
                {detectedPos.sectionTip && (
                        <p className="text-emerald-600/70 mt-2 italic text-[10px]">💡 {detectedPos.sectionTip}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Suggestions */}
                {detectedPos.contentSuggestions && detectedPos.contentSuggestions.length > 0 && (
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-xs font-semibold text-indigo-700 mb-2">✍️ Sugestões de conteúdo para esta seção:</p>
                    <div className="space-y-1.5">
                      {detectedPos.contentSuggestions.map((sug, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs group">
                          <span className="text-indigo-500 flex-shrink-0 mt-0.5">•</span>
                          <p className="text-indigo-700/80 flex-1">{sug}</p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-green-600 hover:bg-green-500/10"
                              onClick={() => handleAcceptContent(`\n\n${sug}`)}>
                              <Check className="w-2.5 h-2.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-muted-foreground hover:bg-muted/50"
                              onClick={() => handleCopyToClipboard(sug)}>
                              <Copy className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Step */}
                {detectedPos.nextExpectedSection && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs">
                    <ArrowRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div>
                      <span className="text-amber-700 font-medium">Próximo passo: </span>
                      <span className="text-amber-700/80">
                        {SECTION_LABELS[detectedPos.nextExpectedSection] || detectedPos.nextExpectedSection}
                      </span>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="p-2.5 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">Progresso do Sermão</span>
                    <span className="text-[10px] font-bold text-foreground">{detectedPos.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${detectedPos.progressPercent}%` }}
                    />
                  </div>
                  {detectedPos.completedSections?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {detectedPos.completedSections.map((s, i) => (
                        <span key={i} className="text-[8px] px-1 py-0.5 bg-green-500/20 text-green-700 rounded">
                          ✓ {SECTION_LABELS[s]?.replace(/^[^\s]+ /, '') || s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Section Help from Research */}
            {research?.currentSectionHelp && (
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-700 mb-1">📚 Ajuda para esta seção:</p>
                    <p className="text-purple-700/80">{research.currentSectionHelp}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Base Text Context - Anti-Heresy Guard */}
            {analysis?.baseTextContext && (
              <CollapsibleSection
                icon={<BookMarked className="w-3.5 h-3.5 text-amber-700" />}
                title="📖 Contexto do Texto Base"
                expanded={expandedSections.includes('basetext')}
                onToggle={() => toggleSection('basetext')}
              >
                {analysis.baseTextContext.passage && (
                  <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 mb-2">
                    <p className="text-xs font-bold text-amber-800">📜 {analysis.baseTextContext.passage}</p>
                  </div>
                )}

                {analysis.baseTextContext.historicalContext && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-foreground/80 mb-0.5">🏛️ Contexto Histórico:</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{analysis.baseTextContext.historicalContext}</p>
                  </div>
                )}

                {analysis.baseTextContext.literaryContext && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-foreground/80 mb-0.5">📄 Contexto Literário:</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{analysis.baseTextContext.literaryContext}</p>
                  </div>
                )}

                {analysis.baseTextContext.culturalContext && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-foreground/80 mb-0.5">🌍 Contexto Cultural:</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{analysis.baseTextContext.culturalContext}</p>
                  </div>
                )}

                {analysis.baseTextContext.theologicalContext && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-foreground/80 mb-0.5">⛪ Contexto Teológico:</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{analysis.baseTextContext.theologicalContext}</p>
                  </div>
                )}

                {analysis.baseTextContext.keyTerms && analysis.baseTextContext.keyTerms.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-foreground/80 mb-1">🔤 Termos-chave no Original:</p>
                    <div className="space-y-1">
                      {analysis.baseTextContext.keyTerms.map((kt, idx) => (
                        <div key={idx} className="p-1.5 rounded bg-blue-500/5 border border-blue-500/10">
                          <p className="text-[10px]">
                            <span className="font-bold text-blue-700">{kt.term}</span>
                            {kt.transliteration && <span className="italic text-muted-foreground"> ({kt.transliteration})</span>}
                            {kt.strongNumber && <span className="text-[9px] text-muted-foreground/60"> [{kt.strongNumber}]</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{kt.meaning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.baseTextContext.narrativePosition && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-foreground/80 mb-0.5">📐 Narrativa Redentiva:</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{analysis.baseTextContext.narrativePosition}</p>
                  </div>
                )}

                {analysis.baseTextContext.hermeneuticalDangers && analysis.baseTextContext.hermeneuticalDangers.length > 0 && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-2">
                    <p className="text-[10px] font-semibold text-red-700 mb-1">⚠️ PERIGOS HERMENÊUTICOS - Evite:</p>
                    <div className="space-y-1">
                      {analysis.baseTextContext.hermeneuticalDangers.map((danger, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[10px] text-red-600/80">
                          <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>{danger}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.baseTextContext.anchorReminder && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">⚓ Regra de Ouro - Ancoragem ao Texto:</p>
                    <p className="text-[10px] text-emerald-700/80 italic">{analysis.baseTextContext.anchorReminder}</p>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Structure Checklist */}
            {analysis?.structureAnalysis && (
              <CollapsibleSection
                icon={<FileText className="w-3.5 h-3.5 text-foreground/70" />}
                title="Checklist da Estrutura"
                expanded={expandedSections.includes('structure')}
                onToggle={() => toggleSection('structure')}
              >
                <div className="space-y-1">
                  {[
                    { label: 'Título', value: analysis.structureAnalysis.hasTitle },
                    { label: 'Tema', value: analysis.structureAnalysis.hasTheme },
                    { label: 'Texto Base', value: analysis.structureAnalysis.hasBaseText },
                    { label: 'Introdução', value: analysis.structureAnalysis.hasIntroduction },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-1.5 text-[10px] p-1 rounded ${item.value ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {item.value ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                      {item.label}
                    </div>
                  ))}
                  
                  {/* Points Detail */}
                  {analysis.structureAnalysis.pointsDetail?.map((point) => (
                    <div key={point.number} className="ml-1 border-l-2 border-muted pl-2 space-y-0.5">
                      <p className="text-[10px] font-medium text-foreground/80">Ponto {point.number}</p>
                      {[
                        { label: `Explicação${point.explanationParagraphs ? ` (${point.explanationParagraphs} par.)` : ''}`, value: point.hasExplanation, warn: point.hasExplanation && (point.explanationParagraphs || 0) < 5 },
                        { label: 'Ilustração', value: point.hasIllustration },
                        { label: 'Verdade', value: point.hasTruth },
                        { label: 'Aplicação', value: point.hasApplication },
                      ].map((item) => (
                        <div key={item.label} className={`flex items-center gap-1.5 text-[9px] ${item.value ? (item.warn ? 'text-amber-600' : 'text-green-700') : 'text-muted-foreground'}`}>
                          {item.value ? (item.warn ? <AlertTriangle className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />) : <div className="w-2.5 h-2.5 rounded-full border border-current" />}
                          {item.label}
                        </div>
                      ))}
                    </div>
                  ))}

                  {[
                    { label: 'Conclusão', value: analysis.structureAnalysis.hasConclusion },
                    { label: 'Apelo', value: analysis.structureAnalysis.hasAppeal },
                    { label: 'Oração Final', value: analysis.structureAnalysis.hasFinalPrayer },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-1.5 text-[10px] p-1 rounded ${item.value ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {item.value ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                      {item.label}
                    </div>
                  ))}
                </div>

                {analysis.structureAnalysis.pointsCount > 0 && !analysis.structureAnalysis.pointsDetail?.length && (
                  <p className="text-[10px] text-muted-foreground mt-2">📌 {analysis.structureAnalysis.pointsCount} ponto(s) detectado(s)</p>
                )}
              </CollapsibleSection>
            )}

            {/* Similar Sermons */}
            {research?.similarSermons && research.similarSermons.length > 0 && (
              <CollapsibleSection
                icon={<Mic className="w-3.5 h-3.5 text-rose-600" />}
                title="Pregações Similares"
                badge={research.similarSermons.filter(s => !dismissedItems.has(`similar-${s.preacher}`)).length}
                badgeColor="bg-rose-500/20 text-rose-700"
                expanded={expandedSections.includes('similar')}
                onToggle={() => toggleSection('similar')}
              >
                {research.similarSermons
                  .filter(s => !dismissedItems.has(`similar-${s.preacher}`))
                  .map((sermon, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs">
                    <div className="flex items-start gap-2">
                      <Mic className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-rose-700">{sermon.preacher}</p>
                        <p className="text-foreground/80 mt-0.5">"{sermon.title}"</p>
                        <p className="text-muted-foreground mt-1"><strong>Abordagem:</strong> {sermon.approach}</p>
                        <p className="text-emerald-700 mt-1 text-[10px]">💡 <strong>Como diferenciar:</strong> {sermon.difference}</p>
                        {(() => {
                          const searchUrl = sermon.url && (sermon.url.startsWith('https://www.google.com') || sermon.url.startsWith('https://www.youtube.com') || sermon.url.startsWith('https://pt.wikipedia.org'))
                            ? sermon.url
                            : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${sermon.preacher} ${sermon.title} pregação`)}`;
                          return (
                            <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 mt-1">
                              <ExternalLink className="w-2.5 h-2.5" /> Buscar pregação
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:bg-muted/50 gap-1"
                        onClick={() => handleCopyToClipboard(`${sermon.preacher}: "${sermon.title}" - ${sermon.approach}`)}>
                        <Copy className="w-3 h-3" /> Copiar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-500/10 gap-1 ml-auto"
                        onClick={() => handleDismiss(`similar-${sermon.preacher}`)}>
                        <XCircle className="w-3 h-3" /> Dispensar
                      </Button>
                    </div>
                  </div>
                ))}
              </CollapsibleSection>
            )}
          </>
        )}

        {/* ============ ANALYSIS TAB ============ */}
        {activeTab === 'analysis' && analysis && (
          <>
            {/* Thematic Alert */}
            {analysis.thematicAlert?.isOffTopic && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">⚠️ Desvio Temático!</p>
                    <p className="text-xs text-red-600 mt-1">{analysis.thematicAlert.message}</p>
                    <p className="text-[10px] text-red-500/80 mt-2">
                      <strong>Elemento:</strong> {analysis.thematicAlert.currentElement}<br />
                      <strong>Conexão esperada:</strong> {analysis.thematicAlert.expectedConnection}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Grammar */}
            {analysis.grammarIssues.length > 0 && (
              <CollapsibleSection
                icon={<Type className="w-3.5 h-3.5 text-amber-600" />}
                title="Gramática e Estilo"
                badge={analysis.grammarIssues.filter(i => !dismissedItems.has(`grammar-${i.text}`)).length}
                badgeColor="bg-amber-500/20 text-amber-700"
                expanded={expandedSections.includes('grammar')}
                onToggle={() => toggleSection('grammar')}
              >
                {analysis.grammarIssues
                  .filter(issue => !dismissedItems.has(`grammar-${issue.text}`))
                  .map((issue, idx) => (
                  <div key={idx} className={`p-2.5 rounded-lg border text-xs ${getSeverityColor(issue.severity)}`}>
                    <p className="text-muted-foreground/80 mb-1">
                      <span className="line-through">{issue.text}</span> → <span className="text-foreground font-medium">{issue.suggestion}</span>
                    </p>
                    {issue.explanation && (
                      <p className="text-[10px] text-blue-600/80 bg-blue-500/5 rounded px-2 py-1 mb-2 italic">
                        📖 {issue.explanation}
                      </p>
                    )}
                    <div className="flex items-center gap-1 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-green-600 hover:bg-green-500/10 gap-1"
                        onClick={() => handleApply(issue.text, issue.suggestion)}>
                        <Check className="w-3 h-3" /> Aplicar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:bg-muted/50 gap-1"
                        onClick={() => handleCopyToClipboard(issue.suggestion)}>
                        <Copy className="w-3 h-3" /> Copiar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-500/10 gap-1 ml-auto"
                        onClick={() => handleDismiss(`grammar-${issue.text}`)}>
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CollapsibleSection>
            )}

            {/* Coherence */}
            {analysis.coherenceChecks.length > 0 && (
              <CollapsibleSection
                icon={<Target className="w-3.5 h-3.5 text-blue-600" />}
                title="Coerência"
                expanded={expandedSections.includes('coherence')}
                onToggle={() => toggleSection('coherence')}
              >
                {analysis.coherenceChecks.map((check, idx) => (
                  <div key={idx} className={`p-2.5 rounded-lg text-xs ${check.isCoherent ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className="flex items-start gap-2">
                      {check.isCoherent ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <p className="font-medium">{check.element} ↔ {check.relatesTo}</p>
                        {check.reason && <p className="text-muted-foreground mt-1">{check.reason}</p>}
                        {!check.isCoherent && check.suggestion && (
                          <div className="mt-2 p-2 bg-blue-500/10 rounded border border-blue-500/20">
                            <p className="text-blue-700 italic">💡 {check.suggestion}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] text-muted-foreground hover:bg-muted/50 gap-1"
                                onClick={() => handleCopyToClipboard(check.suggestion || '')}>
                                <Copy className="w-2.5 h-2.5" /> Copiar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleSection>
            )}

            {/* Biblical Suggestions */}
            {analysis.biblicalSuggestions.length > 0 && (
              <CollapsibleSection
                icon={<BookOpen className="w-3.5 h-3.5 text-purple-600" />}
                title="Textos Bíblicos"
                badge={analysis.biblicalSuggestions.filter(s => !dismissedItems.has(`bible-analysis-${s.reference}`)).length}
                badgeColor="bg-purple-500/20 text-purple-700"
                expanded={expandedSections.includes('biblical')}
                onToggle={() => toggleSection('biblical')}
              >
                {analysis.biblicalSuggestions
                  .filter(sug => !dismissedItems.has(`bible-analysis-${sug.reference}`))
                  .map((sug, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs">
                    <p className="font-semibold text-purple-700">{sug.reference}</p>
                    <p className="text-muted-foreground mt-1">{sug.reason}</p>
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-green-600 hover:bg-green-500/10 gap-1"
                        onClick={() => handleInsertRef(sug.reference)}>
                        <Check className="w-3 h-3" /> Inserir
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:bg-muted/50 gap-1"
                        onClick={() => handleCopyToClipboard(`${sug.reference}: ${sug.reason}`)}>
                        <Copy className="w-3 h-3" /> Copiar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-500/10 gap-1 ml-auto"
                        onClick={() => handleDismiss(`bible-analysis-${sug.reference}`)}>
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CollapsibleSection>
            )}

            {/* Word Suggestions */}
            {analysis.wordSuggestions.length > 0 && (
              <CollapsibleSection
                icon={<Sparkles className="w-3.5 h-3.5 text-teal-600" />}
                title="Melhores Palavras"
                badge={analysis.wordSuggestions.filter(s => !dismissedItems.has(`word-${s.original}`)).length}
                badgeColor="bg-teal-500/20 text-teal-700"
                expanded={expandedSections.includes('words')}
                onToggle={() => toggleSection('words')}
              >
                {analysis.wordSuggestions
                  .filter(sug => !dismissedItems.has(`word-${sug.original}`))
                  .map((sug, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/20 text-xs">
                    <p className="text-muted-foreground mb-2">
                      <span className="line-through">{sug.original}</span> → escolha:
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {sug.alternatives.map((alt, i) => (
                        <button key={i} onClick={() => handleApply(sug.original, alt)} 
                          className="px-2.5 py-1 bg-teal-500/20 text-teal-700 rounded-md hover:bg-teal-500/30 transition-colors font-medium">
                          {alt}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{sug.reason}</p>
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:bg-muted/50 gap-1"
                        onClick={() => handleCopyToClipboard(sug.alternatives.join(', '))}>
                        <Copy className="w-3 h-3" /> Copiar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-500/10 gap-1 ml-auto"
                        onClick={() => handleDismiss(`word-${sug.original}`)}>
                        <XCircle className="w-3 h-3" /> Dispensar
                      </Button>
                    </div>
                  </div>
                ))}
              </CollapsibleSection>
            )}

            {/* All Good */}
            {analysis.grammarIssues.length === 0 && analysis.coherenceChecks.every(c => c.isCoherent) && !analysis.thematicAlert?.isOffTopic && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-xs text-green-700">Excelente! Conteúdo coerente e bem escrito.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'analysis' && isLoading && !analysis && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Analisando...</p>
            </div>
          </div>
        )}

        {/* ============ RESEARCH TAB ============ */}
        {activeTab === 'research' && (
          <>
            {isResearching && !research && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Search className="w-8 h-8 animate-pulse text-blue-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Pesquisando fontes...</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Analisando base de conhecimento e buscando referências</p>
                </div>
              </div>
            )}

            {research && (
              <>
                {/* Internal Sources */}
                {research.internalSources?.filter(s => !dismissedItems.has(`internal-${s.materialTitle}`)).length > 0 && (
                  <CollapsibleSection
                    icon={<Database className="w-3.5 h-3.5 text-emerald-600" />}
                    title="Fontes Internas"
                    badge={research.internalSources.filter(s => !dismissedItems.has(`internal-${s.materialTitle}`)).length}
                    badgeColor="bg-emerald-500/20 text-emerald-700"
                    expanded={expandedSections.includes('internal')}
                    onToggle={() => toggleSection('internal')}
                  >
                    {research.internalSources
                      .filter(s => !dismissedItems.has(`internal-${s.materialTitle}`))
                      .map((source, idx) => (
                        <ResearchCard key={idx} itemKey={`internal-${source.materialTitle}`}
                          icon={<Database className="w-3.5 h-3.5 text-emerald-600" />}
                          title={source.materialTitle} description={source.relevance} detail={source.suggestedUse} accentColor="emerald"
                          onAccept={() => handleAcceptContent(`\n\n📚 [Fonte: ${source.materialTitle}]\n${source.suggestedUse}`)}
                          onDismiss={() => handleDismiss(`internal-${source.materialTitle}`)}
                          onCopy={() => handleCopyToClipboard(`${source.materialTitle}: ${source.suggestedUse}`)} />
                      ))}
                  </CollapsibleSection>
                )}

                {/* Biblical References */}
                {research.biblicalReferences?.filter(r => !dismissedItems.has(`bible-${r.reference}`)).length > 0 && (
                  <CollapsibleSection
                    icon={<BookOpen className="w-3.5 h-3.5 text-purple-600" />}
                    title="Referências Bíblicas"
                    badge={research.biblicalReferences.filter(r => !dismissedItems.has(`bible-${r.reference}`)).length}
                    badgeColor="bg-purple-500/20 text-purple-700"
                    expanded={expandedSections.includes('bibleResearch')}
                    onToggle={() => toggleSection('bibleResearch')}
                  >
                    {research.biblicalReferences
                      .filter(r => !dismissedItems.has(`bible-${r.reference}`))
                      .map((ref, idx) => (
                        <ResearchCard key={idx} itemKey={`bible-${ref.reference}`}
                          icon={<BookOpen className="w-3.5 h-3.5 text-purple-600" />}
                          title={ref.reference} badge={ref.type} description={ref.connection} detail={ref.text} accentColor="purple"
                          onAccept={() => {
                            const text = ref.text ? `\n\n📖 "${ref.text}" — ${ref.reference} (ACF)` : `\n\n📖 ${ref.reference} (ACF)`;
                            handleAcceptContent(text);
                          }}
                          onDismiss={() => handleDismiss(`bible-${ref.reference}`)}
                          onCopy={() => handleCopyToClipboard(ref.text ? `"${ref.text}" — ${ref.reference} (ACF)` : ref.reference)} />
                      ))}
                  </CollapsibleSection>
                )}

                {/* External Sources */}
                {research.externalSources?.filter(s => !dismissedItems.has(`external-${s.title}`)).length > 0 && (
                  <CollapsibleSection
                    icon={<Globe className="w-3.5 h-3.5 text-blue-600" />}
                    title="Fontes Externas"
                    badge={research.externalSources.filter(s => !dismissedItems.has(`external-${s.title}`)).length}
                    badgeColor="bg-blue-500/20 text-blue-700"
                    expanded={expandedSections.includes('external')}
                    onToggle={() => toggleSection('external')}
                  >
                    {research.externalSources
                      .filter(s => !dismissedItems.has(`external-${s.title}`))
                      .map((source, idx) => {
                        const Icon = SOURCE_TYPE_ICONS[source.type] || Globe;
                        return (
                          <ResearchCard key={idx} itemKey={`external-${source.title}`}
                            icon={<Icon className="w-3.5 h-3.5 text-blue-600" />}
                            title={source.title} badge={source.type}
                            description={`${source.description}${source.preacherName ? ` — ${source.preacherName}` : ''}`}
                            detail={source.relevance} url={source.url} accentColor="blue"
                            onAccept={() => handleAcceptContent(`\n\n🔗 [${source.title}](${source.url || '#'}) — ${source.description}`)}
                            onDismiss={() => handleDismiss(`external-${source.title}`)}
                            onCopy={() => handleCopyToClipboard(`${source.title}: ${source.description}${source.url ? ` — ${source.url}` : ''}`)} />
                        );
                      })}
                  </CollapsibleSection>
                )}

                {/* Data & Illustrations */}
                {research.dataAndIllustrations?.filter(d => !dismissedItems.has(`data-${d.title}`)).length > 0 && (
                  <CollapsibleSection
                    icon={<BarChart3 className="w-3.5 h-3.5 text-orange-600" />}
                    title="Dados & Ilustrações"
                    badge={research.dataAndIllustrations.filter(d => !dismissedItems.has(`data-${d.title}`)).length}
                    badgeColor="bg-orange-500/20 text-orange-700"
                    expanded={expandedSections.includes('data')}
                    onToggle={() => toggleSection('data')}
                  >
                    {research.dataAndIllustrations
                      .filter(d => !dismissedItems.has(`data-${d.title}`))
                      .map((item, idx) => (
                        <ResearchCard key={idx} itemKey={`data-${item.title}`}
                          icon={<BarChart3 className="w-3.5 h-3.5 text-orange-600" />}
                          title={item.title} description={item.content}
                          detail={`Fonte: ${item.source} · Sugestão: ${item.suggestedPlacement}`} accentColor="orange"
                          onAccept={() => handleAcceptContent(`\n\n📊 ${item.title}\n${item.content}\n(Fonte: ${item.source})`)}
                          onDismiss={() => handleDismiss(`data-${item.title}`)}
                          onCopy={() => handleCopyToClipboard(`${item.title}: ${item.content} (Fonte: ${item.source})`)} />
                      ))}
                  </CollapsibleSection>
                )}

                {researchCount === 0 && !isResearching && (
                  <div className="p-4 text-center">
                    <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma pesquisa encontrada.</p>
                    <p className="text-[10px] text-muted-foreground/60">Continue escrevendo para ativar a pesquisa.</p>
                  </div>
                )}

                {isResearching && (
                  <div className="flex items-center gap-2 p-2 bg-blue-500/5 rounded-lg">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <p className="text-[10px] text-blue-600">Atualizando pesquisa...</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-2 border-t bg-muted/20 flex gap-1.5">
        <Button variant="outline" size="sm" className="flex-1 text-[10px] sm:text-xs gap-1 h-8"
          onClick={analyzeContent} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          <span className="hidden sm:inline">Reanalisar</span>
          <span className="sm:hidden">Analisar</span>
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-[10px] sm:text-xs gap-1 h-8"
          onClick={() => { lastResearchContentRef.current = ''; doResearch(); }} disabled={isResearching}>
          {isResearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          <span className="hidden sm:inline">Repesquisar</span>
          <span className="sm:hidden">Pesquisar</span>
        </Button>
      </div>
    </div>
  );
}

// ===== Reusable Components =====

function CollapsibleSection({ icon, title, badge, badgeColor, expanded, onToggle, children }: {
  icon: React.ReactNode;
  title: string;
  badge?: number;
  badgeColor?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <button onClick={onToggle} className="w-full p-2 bg-muted/30 flex items-center justify-between hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium">{title}</span>
          {badge !== undefined && (
            <span className={`text-[10px] px-1.5 rounded ${badgeColor || 'bg-muted'}`}>{badge}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {expanded && <div className="p-2 space-y-2">{children}</div>}
    </div>
  );
}

function ResearchCard({ itemKey, icon, title, badge, description, detail, url, accentColor, onAccept, onDismiss, onCopy }: {
  itemKey: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  description: string;
  detail?: string;
  url?: string;
  accentColor: string;
  onAccept: () => void;
  onDismiss: () => void;
  onCopy: () => void;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    orange: 'border-orange-500/20 bg-orange-500/5',
  };

  return (
    <div className={`p-2.5 rounded-lg border text-xs ${colorMap[accentColor] || 'border-border'} transition-all hover:shadow-sm`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-foreground truncate">{title}</p>
            {badge && <span className="text-[9px] px-1 py-0.5 bg-muted rounded">{badge}</span>}
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-3">{description}</p>
          {detail && <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{detail}</p>}
          {url && (
            <a href={
              url.startsWith('https://www.google.com') || url.startsWith('https://www.youtube.com') || url.startsWith('https://pt.wikipedia.org') || url.startsWith('https://en.wikipedia.org')
                ? url 
                : `https://www.google.com/search?q=${encodeURIComponent(title)}`
            } target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 mt-1">
              <ExternalLink className="w-2.5 h-2.5" /> {url.includes('youtube.com') ? 'Buscar no YouTube' : url.includes('wikipedia.org') ? 'Ver na Wikipedia' : 'Pesquisar'}
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-green-600 hover:bg-green-500/10 gap-1" onClick={onAccept}>
          <Check className="w-3 h-3" /> Aceitar
        </Button>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:bg-muted/50 gap-1" onClick={onCopy}>
          <Copy className="w-3 h-3" /> Copiar
        </Button>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-500/10 gap-1 ml-auto" onClick={onDismiss}>
          <XCircle className="w-3 h-3" /> Dispensar
        </Button>
      </div>
    </div>
  );
}
