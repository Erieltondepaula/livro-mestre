import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, RotateCcw, ThumbsDown, ThumbsUp, Zap, Trophy, BarChart3, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FlashcardReview {
  id: string;
  vocabulary_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  last_review_date: string | null;
}

interface VocabWord {
  id: string;
  palavra: string;
  definicoes: string[];
  classe: string | null;
  exemplos: string[];
  sinonimos: any[];
}

type Difficulty = 'hard' | 'medium' | 'easy';

// SM-2 Algorithm
function calculateNextReview(review: FlashcardReview, difficulty: Difficulty) {
  let { ease_factor, interval_days, repetitions } = review;
  
  const qualityMap: Record<Difficulty, number> = { hard: 1, medium: 3, easy: 5 };
  const q = qualityMap[difficulty];
  
  if (q < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 3;
    else interval_days = Math.round(interval_days * ease_factor);
    repetitions++;
  }
  
  ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval_days);
  
  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval_days,
    repetitions,
    next_review_date: format(nextDate, 'yyyy-MM-dd'),
    last_review_date: format(new Date(), 'yyyy-MM-dd'),
  };
}

export function FlashcardsView() {
  const { user } = useAuth();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [reviews, setReviews] = useState<FlashcardReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
  const [mode, setMode] = useState<'review' | 'quiz' | 'stats'>('review');
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    const [{ data: vocabData }, { data: reviewsData }] = await Promise.all([
      supabase.from('vocabulary').select('id, palavra, definicoes, classe, exemplos, sinonimos').order('created_at', { ascending: false }),
      supabase.from('flashcard_reviews').select('*'),
    ]);
    
    if (vocabData) {
      setWords(vocabData.map(v => ({
        ...v,
        definicoes: Array.isArray(v.definicoes) ? v.definicoes as string[] : [],
        exemplos: Array.isArray(v.exemplos) ? v.exemplos as string[] : [],
        sinonimos: Array.isArray(v.sinonimos) ? v.sinonimos : [],
      })));
    }
    if (reviewsData) {
      setReviews(reviewsData.map(r => ({
        id: r.id,
        vocabulary_id: r.vocabulary_id,
        ease_factor: Number(r.ease_factor),
        interval_days: r.interval_days,
        repetitions: r.repetitions,
        next_review_date: r.next_review_date,
        last_review_date: r.last_review_date,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const dueCards = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const reviewMap = new Map(reviews.map(r => [r.vocabulary_id, r]));
    
    return words.filter(w => {
      const review = reviewMap.get(w.id);
      if (!review) return true; // New word, never reviewed
      return review.next_review_date <= today;
    });
  }, [words, reviews]);

  const currentWord = dueCards[currentIndex];

  const handleReview = async (difficulty: Difficulty) => {
    if (!user || !currentWord) return;
    
    const existingReview = reviews.find(r => r.vocabulary_id === currentWord.id);
    const reviewData = existingReview || {
      id: '',
      vocabulary_id: currentWord.id,
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 0,
      next_review_date: format(new Date(), 'yyyy-MM-dd'),
      last_review_date: null,
    };
    
    const nextReview = calculateNextReview(reviewData, difficulty);
    
    if (existingReview) {
      await supabase.from('flashcard_reviews').update(nextReview).eq('id', existingReview.id);
    } else {
      await supabase.from('flashcard_reviews').insert({
        user_id: user.id,
        vocabulary_id: currentWord.id,
        ...nextReview,
      });
    }
    
    setSessionStats(prev => ({
      total: prev.total + 1,
      [difficulty]: prev[difficulty] + 1,
      easy: difficulty === 'easy' ? prev.easy + 1 : prev.easy,
      medium: difficulty === 'medium' ? prev.medium + 1 : prev.medium,
      hard: difficulty === 'hard' ? prev.hard + 1 : prev.hard,
    }));
    
    setIsFlipped(false);
    if (currentIndex < dueCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast({ title: '🎉 Sessão completa!', description: `Você revisou ${sessionStats.total + 1} palavras.` });
      await loadData();
      setCurrentIndex(0);
    }
  };

  // Quiz mode
  const startQuiz = () => {
    if (words.length < 4) {
      toast({ title: 'Vocabulário insuficiente', description: 'Cadastre pelo menos 4 palavras no dicionário.', variant: 'destructive' });
      return;
    }
    setMode('quiz');
    setCurrentIndex(0);
    setQuizAnswer(null);
    generateQuizOptions(0);
  };

  const generateQuizOptions = (idx: number) => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const correct = shuffled[idx % shuffled.length];
    const others = shuffled.filter(w => w.id !== correct.id).slice(0, 3);
    const options = [...others.map(w => w.palavra), correct.palavra].sort(() => Math.random() - 0.5);
    setQuizOptions(options);
    setQuizAnswer(null);
  };

  const quizWord = mode === 'quiz' ? words[currentIndex % words.length] : null;

  const handleQuizAnswer = (answer: string) => {
    if (!quizWord) return;
    setQuizAnswer(answer);
    if (answer === quizWord.palavra) {
      setSessionStats(prev => ({ ...prev, total: prev.total + 1, easy: prev.easy + 1 }));
    } else {
      setSessionStats(prev => ({ ...prev, total: prev.total + 1, hard: prev.hard + 1 }));
    }
    setTimeout(() => {
      if (currentIndex < Math.min(words.length - 1, 19)) {
        const next = currentIndex + 1;
        setCurrentIndex(next);
        generateQuizOptions(next);
      } else {
        setMode('stats');
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">Flashcards</h2>
          <p className="text-muted-foreground">Revisão espaçada do vocabulário</p>
        </div>
        <div className="card-library-elevated p-12 text-center">
          <Brain className="w-16 h-16 text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma palavra cadastrada</h3>
          <p className="text-muted-foreground">Adicione palavras no Dicionário para começar a usar os flashcards.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">Flashcards</h2>
          <p className="text-muted-foreground">
            {mode === 'review' ? `${dueCards.length} cartões para revisar hoje` : 
             mode === 'quiz' ? 'Quiz Interativo' : 'Estatísticas da sessão'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === 'review' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('review'); setCurrentIndex(0); setIsFlipped(false); setSessionStats({ total: 0, easy: 0, medium: 0, hard: 0 }); }}>
            <Brain className="w-4 h-4 mr-1" /> Revisar
          </Button>
          <Button variant={mode === 'quiz' ? 'default' : 'outline'} size="sm" onClick={startQuiz}>
            <Zap className="w-4 h-4 mr-1" /> Quiz
          </Button>
          <Button variant={mode === 'stats' ? 'default' : 'outline'} size="sm" onClick={() => setMode('stats')}>
            <BarChart3 className="w-4 h-4 mr-1" /> Stats
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{words.length}</p>
          <p className="text-xs text-muted-foreground">Total palavras</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-primary">{dueCards.length}</p>
          <p className="text-xs text-muted-foreground">Para revisar</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{reviews.filter(r => r.repetitions >= 3).length}</p>
          <p className="text-xs text-muted-foreground">Dominadas</p>
        </div>
        <div className="card-library p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{sessionStats.total}</p>
          <p className="text-xs text-muted-foreground">Revisadas hoje</p>
        </div>
      </div>

      {/* Review Mode */}
      {mode === 'review' && (
        <>
          {dueCards.length === 0 ? (
            <div className="card-library-elevated p-12 text-center">
              <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Tudo revisado! 🎉</h3>
              <p className="text-muted-foreground">Volte amanhã para novas revisões.</p>
            </div>
          ) : currentWord ? (
            <div className="max-w-xl mx-auto">
              <div className="mb-3 flex items-center gap-2">
                <Progress value={(currentIndex / dueCards.length) * 100} className="flex-1" />
                <span className="text-sm text-muted-foreground">{currentIndex + 1}/{dueCards.length}</span>
              </div>
              
              <div 
                className="card-library-elevated p-8 min-h-[280px] flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {!isFlipped ? (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">Palavra</p>
                    <h3 className="text-4xl font-bold text-foreground mb-2">{currentWord.palavra}</h3>
                    {currentWord.classe && (
                      <span className="text-sm text-muted-foreground italic">({currentWord.classe})</span>
                    )}
                    <p className="text-xs text-muted-foreground mt-6">Toque para ver a definição</p>
                  </div>
                ) : (
                  <div className="text-center space-y-4 w-full">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Definição</p>
                    <h3 className="text-xl font-semibold text-foreground">{currentWord.palavra}</h3>
                    <div className="space-y-2 text-left">
                      {currentWord.definicoes.slice(0, 3).map((def, i) => (
                        <p key={i} className="text-sm text-foreground">
                          <span className="font-medium text-primary">{i + 1}.</span> {def}
                        </p>
                      ))}
                    </div>
                    {currentWord.exemplos.length > 0 && (
                      <p className="text-sm text-muted-foreground italic border-t border-border pt-3">
                        "{currentWord.exemplos[0]}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isFlipped && (
                <div className="flex justify-center gap-3 mt-6">
                  <Button variant="outline" className="flex-1 border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleReview('hard')}>
                    <ThumbsDown className="w-4 h-4 mr-1" /> Difícil
                  </Button>
                  <Button variant="outline" className="flex-1 border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20" onClick={() => handleReview('medium')}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Médio
                  </Button>
                  <Button variant="outline" className="flex-1 border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20" onClick={() => handleReview('easy')}>
                    <ThumbsUp className="w-4 h-4 mr-1" /> Fácil
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}

      {/* Quiz Mode */}
      {mode === 'quiz' && quizWord && (
        <div className="max-w-xl mx-auto">
          <div className="mb-3 flex items-center gap-2">
            <Progress value={(currentIndex / Math.min(words.length, 20)) * 100} className="flex-1" />
            <span className="text-sm text-muted-foreground">{currentIndex + 1}/{Math.min(words.length, 20)}</span>
          </div>
          
          <div className="card-library-elevated p-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Qual palavra corresponde a esta definição?</p>
            <p className="text-lg text-foreground mb-6 font-medium">
              {quizWord.definicoes[0] || 'Sem definição'}
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              {quizOptions.map((option) => {
                const isCorrect = option === quizWord.palavra;
                const isSelected = quizAnswer === option;
                let btnClass = 'border-border hover:border-primary/50';
                if (quizAnswer) {
                  if (isCorrect) btnClass = 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700';
                  else if (isSelected && !isCorrect) btnClass = 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700';
                }
                
                return (
                  <Button
                    key={option}
                    variant="outline"
                    className={`justify-start h-auto py-3 text-left ${btnClass}`}
                    onClick={() => !quizAnswer && handleQuizAnswer(option)}
                    disabled={!!quizAnswer}
                  >
                    <ChevronRight className="w-4 h-4 mr-2 flex-shrink-0" />
                    {option}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stats Mode */}
      {mode === 'stats' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="card-library-elevated p-8 text-center">
            <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Sessão de Estudo</h3>
            <p className="text-muted-foreground mb-6">{sessionStats.total} palavras revisadas</p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <p className="text-2xl font-bold text-red-600">{sessionStats.hard}</p>
                <p className="text-xs text-red-500">Difícil</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <p className="text-2xl font-bold text-amber-600">{sessionStats.medium}</p>
                <p className="text-xs text-amber-500">Médio</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <p className="text-2xl font-bold text-green-600">{sessionStats.easy}</p>
                <p className="text-xs text-green-500">Fácil</p>
              </div>
            </div>

            {sessionStats.total > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Taxa de acerto</p>
                <Progress value={(sessionStats.easy / sessionStats.total) * 100} className="h-3" />
                <p className="text-sm font-medium text-foreground mt-1">
                  {Math.round((sessionStats.easy / sessionStats.total) * 100)}%
                </p>
              </div>
            )}

            <Button className="mt-6" onClick={() => { setMode('review'); setCurrentIndex(0); setSessionStats({ total: 0, easy: 0, medium: 0, hard: 0 }); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> Nova sessão
            </Button>
          </div>

          {/* Review history summary */}
          <div className="card-library p-6">
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Resumo Geral
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Palavras no dicionário</span>
                <span className="font-medium text-foreground">{words.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Já revisadas alguma vez</span>
                <span className="font-medium text-foreground">{reviews.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dominadas (3+ acertos)</span>
                <span className="font-medium text-green-600">{reviews.filter(r => r.repetitions >= 3).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Novas (nunca revisadas)</span>
                <span className="font-medium text-amber-600">{words.length - reviews.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
