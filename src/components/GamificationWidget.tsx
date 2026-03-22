import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, Trophy, Target, Calendar, Award, ChevronDown, ChevronUp, Check, Lock, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import type { DailyReading } from '@/types/library';

interface GamificationWidgetProps {
  readings: DailyReading[];
}

interface ReadingGoal {
  id: string;
  daily_page_goal: number;
  current_streak: number;
  longest_streak: number;
  last_reading_date: string | null;
  total_badges: string[];
}

interface BadgeDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  xp: number; // XP gained when earned, lost when lost
  condition: (stats: BadgeStats) => boolean;
}

interface BadgeStats {
  totalDays: number;
  streak: number;
  totalPages: number;
  completedBooks: number;
  vocabCount: number;
}

// Each badge has XP weight. Total possible XP = 100 (maps to level 100)
const BADGES: BadgeDef[] = [
  { id: 'first_read', icon: '📖', label: 'Primeira Leitura', description: 'Registre sua primeira leitura', xp: 3, condition: (s) => s.totalDays >= 1 },
  { id: 'ten_pages', icon: '📄', label: '10 Páginas', description: 'Leia 10 páginas no total', xp: 3, condition: (s) => s.totalPages >= 10 },
  { id: 'fifty_pages', icon: '📑', label: '50 Páginas', description: 'Leia 50 páginas no total', xp: 5, condition: (s) => s.totalPages >= 50 },
  { id: 'hundred_pages', icon: '📚', label: '100 Páginas', description: 'Leia 100 páginas no total', xp: 7, condition: (s) => s.totalPages >= 100 },
  { id: 'five_hundred_pages', icon: '📕', label: '500 Páginas', description: 'Leia 500 páginas no total', xp: 8, condition: (s) => s.totalPages >= 500 },
  { id: 'thousand_pages', icon: '🎯', label: '1.000 Páginas', description: 'Leia 1.000 páginas no total', xp: 10, condition: (s) => s.totalPages >= 1000 },
  { id: 'three_day_streak', icon: '🔥', label: '3 Dias Seguidos', description: 'Leia 3 dias consecutivos', xp: 4, condition: (s) => s.streak >= 3 },
  { id: 'week_streak', icon: '🔥', label: '7 Dias Seguidos', description: 'Leia 7 dias consecutivos', xp: 7, condition: (s) => s.streak >= 7 },
  { id: 'two_week_streak', icon: '💪', label: '14 Dias Seguidos', description: 'Leia 14 dias consecutivos', xp: 8, condition: (s) => s.streak >= 14 },
  { id: 'month_streak', icon: '🏆', label: '30 Dias Seguidos', description: 'Leia 30 dias consecutivos', xp: 12, condition: (s) => s.streak >= 30 },
  { id: 'one_book', icon: '✅', label: '1 Livro Completo', description: 'Conclua 1 livro', xp: 5, condition: (s) => s.completedBooks >= 1 },
  { id: 'three_books', icon: '📗', label: '3 Livros Completos', description: 'Conclua 3 livros', xp: 7, condition: (s) => s.completedBooks >= 3 },
  { id: 'bookworm', icon: '🐛', label: '5 Livros Completos', description: 'Conclua 5 livros', xp: 8, condition: (s) => s.completedBooks >= 5 },
  { id: 'ten_vocab', icon: '📝', label: '10 Palavras', description: 'Salve 10 palavras no dicionário', xp: 5, condition: (s) => s.vocabCount >= 10 },
  { id: 'scholar', icon: '🎓', label: '50 Palavras', description: 'Salve 50 palavras no dicionário', xp: 8, condition: (s) => s.vocabCount >= 50 },
];

const TOTAL_XP = BADGES.reduce((sum, b) => sum + b.xp, 0); // = 100

function getLevelTitle(level: number): string {
  if (level >= 90) return '👑 Mestre da Leitura';
  if (level >= 75) return '🏅 Leitor Expert';
  if (level >= 60) return '📖 Leitor Avançado';
  if (level >= 40) return '📚 Leitor Dedicado';
  if (level >= 20) return '📗 Leitor Iniciante';
  if (level >= 5) return '🌱 Aprendiz';
  return '🥚 Novato';
}

function getLevelColor(level: number): string {
  if (level >= 90) return 'text-amber-500';
  if (level >= 75) return 'text-primary';
  if (level >= 60) return 'text-blue-500';
  if (level >= 40) return 'text-green-500';
  if (level >= 20) return 'text-teal-500';
  return 'text-muted-foreground';
}

export function GamificationWidget({ readings }: GamificationWidgetProps) {
  const { user } = useAuth();
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoalValue, setNewGoalValue] = useState('20');
  const [showBadges, setShowBadges] = useState(false);
  const [completedBooks, setCompletedBooks] = useState(0);
  const [vocabCount, setVocabCount] = useState(0);
  const prevLevelRef = useRef<number | null>(null);

  const loadGoal = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('reading_goals').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setGoal({
        id: data.id,
        daily_page_goal: data.daily_page_goal,
        current_streak: data.current_streak,
        longest_streak: data.longest_streak,
        last_reading_date: data.last_reading_date,
        total_badges: Array.isArray(data.total_badges) ? (data.total_badges as string[]) : [],
      });
      setNewGoalValue(String(data.daily_page_goal));
    }
  }, [user]);

  const loadExtraStats = useCallback(async () => {
    if (!user) return;
    const [statusRes, vocabRes] = await Promise.all([
      supabase.from('statuses').select('id').eq('user_id', user.id).eq('status', 'Concluido'),
      supabase.from('vocabulary').select('id').eq('user_id', user.id),
    ]);
    setCompletedBooks(statusRes.data?.length || 0);
    setVocabCount(vocabRes.data?.length || 0);
  }, [user]);

  useEffect(() => { loadGoal(); loadExtraStats(); }, [loadGoal, loadExtraStats]);

  const streakData = useMemo(() => {
    if (readings.length === 0) return { streak: 0, todayPages: 0, totalPages: 0, totalDays: 0 };
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const readingDays = new Map<string, number>();
    let totalPages = 0;
    
    for (const r of readings) {
      let dateStr: string | null = null;
      if (r.dataInicio) {
        dateStr = format(new Date(r.dataInicio), 'yyyy-MM-dd');
      } else if (r.created_at) {
        dateStr = format(new Date(r.created_at), 'yyyy-MM-dd');
      }
      if (dateStr) {
        readingDays.set(dateStr, (readingDays.get(dateStr) || 0) + r.quantidadePaginas);
      }
      totalPages += r.quantidadePaginas;
    }
    
    const todayPages = readingDays.get(today) || 0;
    const totalDays = readingDays.size;
    
    let streak = 0;
    let checkDate = new Date();
    
    if (!readingDays.has(today)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (!readingDays.has(format(yesterday, 'yyyy-MM-dd'))) return { streak: 0, todayPages, totalPages, totalDays };
      checkDate = yesterday;
    }
    
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      if (readingDays.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return { streak, todayPages, totalPages, totalDays };
  }, [readings]);

  const badgeStats: BadgeStats = useMemo(() => ({
    totalDays: streakData.totalDays,
    streak: Math.max(streakData.streak, goal?.longest_streak || 0),
    totalPages: streakData.totalPages,
    completedBooks,
    vocabCount,
  }), [streakData, goal?.longest_streak, completedBooks, vocabCount]);

  // Evaluate badges dynamically — badges can be earned AND lost
  const earnedBadgeIds = useMemo(() =>
    BADGES.filter(b => b.condition(badgeStats)).map(b => b.id),
    [badgeStats]
  );

  // Calculate level from currently earned badges (0-100)
  const level = useMemo(() => {
    const xp = BADGES.filter(b => earnedBadgeIds.includes(b.id)).reduce((sum, b) => sum + b.xp, 0);
    return Math.round((xp / TOTAL_XP) * 100);
  }, [earnedBadgeIds]);

  // Persist badges (sync both gains and losses)
  useEffect(() => {
    if (!user || !goal) return;
    const currentBadges = goal.total_badges || [];
    const gained = earnedBadgeIds.filter(id => !currentBadges.includes(id));
    const lost = currentBadges.filter(id => !earnedBadgeIds.includes(id));
    
    if (gained.length === 0 && lost.length === 0) return;

    // Persist the current earned set
    supabase.from('reading_goals').update({ total_badges: earnedBadgeIds }).eq('id', goal.id).then(() => {
      setGoal(prev => prev ? { ...prev, total_badges: [...earnedBadgeIds] } : prev);
      
      gained.forEach(id => {
        const b = BADGES.find(x => x.id === id);
        if (b) toast({ title: '🏅 Nova Conquista!', description: `${b.icon} ${b.label} (+${b.xp} XP)` });
      });
      
      lost.forEach(id => {
        const b = BADGES.find(x => x.id === id);
        if (b) toast({ title: '⬇️ Conquista Perdida', description: `${b.icon} ${b.label} (-${b.xp} XP)`, variant: 'destructive' });
      });
    });
  }, [earnedBadgeIds, user, goal]);

  // Notify level changes
  useEffect(() => {
    if (prevLevelRef.current !== null && prevLevelRef.current !== level) {
      if (level > prevLevelRef.current) {
        toast({ title: `⬆️ Nível ${level}!`, description: getLevelTitle(level) });
      } else {
        toast({ title: `⬇️ Nível ${level}`, description: getLevelTitle(level), variant: 'destructive' });
      }
    }
    prevLevelRef.current = level;
  }, [level]);

  // Update streak in DB
  useEffect(() => {
    if (!user || !goal) return;
    if (streakData.streak !== goal.current_streak || streakData.streak > goal.longest_streak) {
      supabase.from('reading_goals').update({
        current_streak: streakData.streak,
        longest_streak: Math.max(streakData.streak, goal.longest_streak),
        last_reading_date: format(new Date(), 'yyyy-MM-dd'),
      }).eq('id', goal.id);
    }
  }, [streakData.streak, user, goal]);

  const handleSaveGoal = async () => {
    if (!user) return;
    const value = Math.max(1, parseInt(newGoalValue) || 20);
    
    if (goal) {
      await supabase.from('reading_goals').update({ daily_page_goal: value }).eq('id', goal.id);
    } else {
      await supabase.from('reading_goals').insert({ user_id: user.id, daily_page_goal: value });
    }
    
    setEditingGoal(false);
    await loadGoal();
    toast({ title: 'Meta atualizada!', description: `Meta diária: ${value} páginas.` });
  };

  const dailyGoal = goal?.daily_page_goal || 20;
  const progress = Math.min(100, (streakData.todayPages / dailyGoal) * 100);
  const levelTitle = getLevelTitle(level);
  const levelColor = getLevelColor(level);

  return (
    <div className="card-library p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" /> Metas & Conquistas
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setEditingGoal(!editingGoal)}>
          {editingGoal ? 'Cancelar' : 'Editar meta'}
        </Button>
      </div>

      {/* Level Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className={`w-4 h-4 ${levelColor}`} />
            <span className={`text-sm font-bold ${levelColor}`}>Nível {level}</span>
            <span className="text-xs text-muted-foreground">— {levelTitle}</span>
          </div>
          <span className="text-xs text-muted-foreground">{level}/100</span>
        </div>
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
            style={{ width: `${level}%` }}
          />
          {/* Level markers */}
          {[20, 40, 60, 75, 90].map(mark => (
            <div
              key={mark}
              className="absolute top-0 bottom-0 w-px bg-background/50"
              style={{ left: `${mark}%` }}
            />
          ))}
        </div>
      </div>

      {editingGoal ? (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Meta diária:</span>
          <Input
            type="number"
            value={newGoalValue}
            onChange={(e) => setNewGoalValue(e.target.value)}
            className="w-20 h-8 text-sm"
            min="1"
          />
          <span className="text-sm text-muted-foreground">páginas</span>
          <Button size="sm" onClick={handleSaveGoal}>Salvar</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
            <p className="text-lg font-bold text-foreground">{streakData.todayPages}/{dailyGoal}</p>
            <Progress value={progress} className="h-1.5" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Sequência</span>
            </div>
            <p className="text-lg font-bold text-foreground">{streakData.streak} <span className="text-xs font-normal text-muted-foreground">dias</span></p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Recorde</span>
            </div>
            <p className="text-lg font-bold text-foreground">{Math.max(streakData.streak, goal?.longest_streak || 0)} <span className="text-xs font-normal text-muted-foreground">dias</span></p>
          </div>
          
          <div className="space-y-2 cursor-pointer" onClick={() => setShowBadges(!showBadges)}>
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Conquistas</span>
            </div>
            <p className="text-lg font-bold text-foreground flex items-center gap-1">
              {earnedBadgeIds.length}/{BADGES.length}
              {showBadges ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </p>
          </div>
        </div>
      )}

      {/* Streak Flame */}
      {streakData.streak >= 3 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <Flame className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">
            {streakData.streak} dias consecutivos! Continue assim! 🔥
          </span>
        </div>
      )}

      {/* Badges Grid */}
      {showBadges && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {BADGES.map((badge) => {
              const earned = earnedBadgeIds.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all ${
                    earned
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-muted/50 border border-transparent opacity-50'
                  }`}
                  title={`${badge.description} (${badge.xp} XP)`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <span className="text-[10px] leading-tight font-medium text-foreground">{badge.label}</span>
                  <div className="flex items-center gap-0.5">
                    {earned ? (
                      <>
                        <TrendingUp className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[9px] text-primary font-bold">+{badge.xp}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground">{badge.xp} XP</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            💡 Conquistas de sequência podem ser perdidas se a leitura parar — o nível reduz automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}
