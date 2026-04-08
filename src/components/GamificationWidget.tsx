import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, Trophy, Target, Calendar, Award, ChevronDown, ChevronUp, Lock, Star, TrendingUp, Filter, Search } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import type { DailyReading } from '@/types/library';
import {
  ALL_ACHIEVEMENTS,
  CATEGORY_META,
  RARITY_META,
  TOTAL_ACHIEVEMENTS,
  calculateLevel,
  xpForLevel,
  getLevelTitle,
  getLevelColor,
  getStreakMultiplier,
  type AchievementDef,
  type AchievementStats,
  type AchievementCategory,
  type AchievementRarity,
} from '@/data/achievements';

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

// Parse time_spent "MM:SS" or "MM" to minutes
function parseMinutes(t: string | undefined | null): number {
  if (!t) return 0;
  if (t.includes(':')) {
    const [m, s] = t.split(':').map(Number);
    return (m || 0) + (s || 0) / 60;
  }
  return parseFloat(t) || 0;
}

export function GamificationWidget({ readings }: GamificationWidgetProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = sessionStorage.getItem('gamification_collapsed');
    return saved === 'true';
  });
  const { user } = useAuth();
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoalValue, setNewGoalValue] = useState('20');
  const [showBadges, setShowBadges] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyEarned, setShowOnlyEarned] = useState(false);
  const prevLevelRef = useRef<number | null>(null);

  // Extra stats from DB
  const [extraStats, setExtraStats] = useState({
    completedBooks: 0, vocabCount: 0, quotesCount: 0,
    notesCount: 0, outlinesCount: 0, analysesCount: 0,
  });

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
    const [statusRes, vocabRes, quotesRes, notesRes, outlinesRes, analysesRes] = await Promise.all([
      supabase.from('statuses').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Concluido'),
      supabase.from('vocabulary').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('exegesis_outlines').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('exegesis_analyses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setExtraStats({
      completedBooks: statusRes.count || 0,
      vocabCount: vocabRes.count || 0,
      quotesCount: quotesRes.count || 0,
      notesCount: notesRes.count || 0,
      outlinesCount: outlinesRes.count || 0,
      analysesCount: analysesRes.count || 0,
    });
  }, [user]);

  useEffect(() => { loadGoal(); loadExtraStats(); }, [loadGoal, loadExtraStats]);

  // Compute stats from readings
  const computedStats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const readingDays = new Map<string, number>();
    let totalPages = 0;
    let totalMinutes = 0;
    let morningDays = 0;
    let earlyMorningDays = 0;
    let nightDays = 0;
    let midnightDays = 0;
    let chaptersRead = 0;

    const morningSet = new Set<string>();
    const earlySet = new Set<string>();
    const nightSet = new Set<string>();
    const midnightSet = new Set<string>();
    const hoursByDay = new Map<string, number[]>();

    for (const r of readings) {
      let dateStr: string | null = null;
      let readDate: Date | null = null;

      if (r.dataInicio) {
        readDate = new Date(r.dataInicio);
        dateStr = format(readDate, 'yyyy-MM-dd');
      } else if (r.created_at) {
        readDate = new Date(r.created_at);
        dateStr = format(readDate, 'yyyy-MM-dd');
      }

      if (dateStr) {
        readingDays.set(dateStr, (readingDays.get(dateStr) || 0) + r.quantidadePaginas);
      }
      totalPages += r.quantidadePaginas;

      if (r.tempoGasto) totalMinutes += r.tempoGasto;
      if (r.bibleChapter) chaptersRead++;

      // Time-based stats
      if (readDate && dateStr) {
        const hour = readDate.getHours();
        if (hour < 6) earlySet.add(dateStr);
        if (hour < 8) morningSet.add(dateStr);
        if (hour >= 22) nightSet.add(dateStr);
        if (hour >= 0 && hour < 4) midnightSet.add(dateStr);

        if (!hoursByDay.has(dateStr)) hoursByDay.set(dateStr, []);
        hoursByDay.get(dateStr)!.push(hour);
      }
    }

    morningDays = morningSet.size;
    earlyMorningDays = earlySet.size;
    nightDays = nightSet.size;
    midnightDays = midnightSet.size;

    const todayPages = readingDays.get(today) || 0;
    const totalDays = readingDays.size;

    // Streak calculation
    let streak = 0;
    let checkDate = new Date();
    if (!readingDays.has(today)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (!readingDays.has(format(yesterday, 'yyyy-MM-dd'))) {
        streak = 0;
      } else {
        checkDate = yesterday;
        while (readingDays.has(format(checkDate, 'yyyy-MM-dd'))) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    } else {
      while (readingDays.has(format(checkDate, 'yyyy-MM-dd'))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Full weeks (7 consecutive days)
    const sortedDates = [...readingDays.keys()].sort();
    let fullWeeks = 0;
    let consecutiveDays = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) { consecutiveDays = 1; continue; }
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (86400000));
      if (diffDays === 1) {
        consecutiveDays++;
        if (consecutiveDays >= 7) { fullWeeks++; consecutiveDays = 0; }
      } else {
        consecutiveDays = 1;
      }
    }

    // Same hour streak
    let sameHourStreakDays = 0;
    let maxSameHour = 0;
    const datesSorted = [...hoursByDay.keys()].sort();
    for (let i = 1; i < datesSorted.length; i++) {
      const prevHours = hoursByDay.get(datesSorted[i - 1])!;
      const currHours = hoursByDay.get(datesSorted[i])!;
      const prevH = Math.round(prevHours.reduce((a, b) => a + b, 0) / prevHours.length);
      const currH = Math.round(currHours.reduce((a, b) => a + b, 0) / currHours.length);
      if (Math.abs(prevH - currH) <= 1) {
        sameHourStreakDays++;
        maxSameHour = Math.max(maxSameHour, sameHourStreakDays);
      } else {
        sameHourStreakDays = 0;
      }
    }

    // Micro reading days (<=2 pages)
    let microReadingDays = 0;
    readingDays.forEach((pages) => { if (pages > 0 && pages <= 2) microReadingDays++; });

    // Streak recoveries (gaps of 1-2 days followed by resumption)
    let streakRecoveries = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const gap = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (gap >= 2 && gap <= 3) streakRecoveries++;
    }

    return {
      streak, todayPages, totalPages, totalDays, totalMinutes,
      morningDays, earlyMorningDays, nightDays, midnightDays,
      fullWeeks, sameHourStreakDays: maxSameHour, microReadingDays,
      streakRecoveries, chaptersRead,
    };
  }, [readings]);

  const achievementStats: AchievementStats = useMemo(() => ({
    totalDays: computedStats.totalDays,
    streak: Math.max(computedStats.streak, goal?.current_streak || 0),
    longestStreak: Math.max(computedStats.streak, goal?.longest_streak || 0),
    totalPages: computedStats.totalPages,
    completedBooks: extraStats.completedBooks,
    vocabCount: extraStats.vocabCount,
    quotesCount: extraStats.quotesCount,
    notesCount: extraStats.notesCount,
    outlinesCount: extraStats.outlinesCount,
    analysesCount: extraStats.analysesCount,
    totalReadingMinutes: computedStats.totalMinutes,
    chaptersRead: computedStats.chaptersRead,
    earlyMorningDays: computedStats.earlyMorningDays,
    morningDays: computedStats.morningDays,
    nightDays: computedStats.nightDays,
    midnightDays: computedStats.midnightDays,
    fullWeeks: computedStats.fullWeeks,
    streakRecoveries: computedStats.streakRecoveries,
    microReadingDays: computedStats.microReadingDays,
    bibleChaptersRead: computedStats.chaptersRead,
    bibleBooksCompleted: 0, // future: track per-bible-book completion
    otCompleted: false,
    ntCompleted: false,
    fullBibleCompleted: false,
    sameHourStreakDays: computedStats.sameHourStreakDays,
  }), [computedStats, goal, extraStats]);

  const earnedBadgeIds = useMemo(() =>
    ALL_ACHIEVEMENTS.filter(b => b.condition(achievementStats)).map(b => b.id),
    [achievementStats]
  );

  const totalXP = useMemo(() => {
    const baseXP = ALL_ACHIEVEMENTS
      .filter(b => earnedBadgeIds.includes(b.id))
      .reduce((sum, b) => sum + b.xp, 0);
    const multiplier = getStreakMultiplier(achievementStats.streak);
    return Math.round(baseXP * multiplier);
  }, [earnedBadgeIds, achievementStats.streak]);

  const level = useMemo(() => calculateLevel(totalXP), [totalXP]);
  const nextLevelXP = xpForLevel(level + 1);
  const currentLevelXP = xpForLevel(level);
  const levelProgress = nextLevelXP === Infinity ? 100 : Math.min(100, ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);

  // Persist badges
  useEffect(() => {
    if (!user || !goal) return;
    const currentBadges = goal.total_badges || [];
    const gained = earnedBadgeIds.filter(id => !currentBadges.includes(id));
    const lost = currentBadges.filter(id => !earnedBadgeIds.includes(id));
    if (gained.length === 0 && lost.length === 0) return;

    supabase.from('reading_goals').update({ total_badges: earnedBadgeIds }).eq('id', goal.id).then(() => {
      setGoal(prev => prev ? { ...prev, total_badges: [...earnedBadgeIds] } : prev);
      // Only notify first 3 gains/losses to avoid spam
      gained.slice(0, 3).forEach(id => {
        const b = ALL_ACHIEVEMENTS.find(x => x.id === id);
        if (b) toast({ title: '🏅 Nova Conquista!', description: `${b.icon} ${b.label} (+${b.xp} XP)` });
      });
      if (gained.length > 3) {
        toast({ title: '🏅 Múltiplas Conquistas!', description: `+${gained.length - 3} conquistas adicionais!` });
      }
      lost.slice(0, 2).forEach(id => {
        const b = ALL_ACHIEVEMENTS.find(x => x.id === id);
        if (b) toast({ title: '⬇️ Conquista Perdida', description: `${b.icon} ${b.label} (-${b.xp} XP)`, variant: 'destructive' });
      });
    });
  }, [earnedBadgeIds, user, goal]);

  // Level change notification
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
    if (computedStats.streak !== goal.current_streak || computedStats.streak > goal.longest_streak) {
      supabase.from('reading_goals').update({
        current_streak: computedStats.streak,
        longest_streak: Math.max(computedStats.streak, goal.longest_streak),
        last_reading_date: format(new Date(), 'yyyy-MM-dd'),
      }).eq('id', goal.id);
    }
  }, [computedStats.streak, user, goal]);

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

  // Filtered achievements for display
  const filteredAchievements = useMemo(() => {
    return ALL_ACHIEVEMENTS.filter(a => {
      const earned = earnedBadgeIds.includes(a.id);
      // Hide hidden achievements that aren't earned
      if (a.hidden && !earned) return false;
      if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
      if (selectedRarity !== 'all' && a.rarity !== selectedRarity) return false;
      if (showOnlyEarned && !earned) return false;
      if (searchTerm && !a.label.toLowerCase().includes(searchTerm.toLowerCase()) && !a.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [selectedCategory, selectedRarity, showOnlyEarned, searchTerm, earnedBadgeIds]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; earned: number }> = { all: { total: 0, earned: 0 } };
    for (const cat of Object.keys(CATEGORY_META)) {
      counts[cat] = { total: 0, earned: 0 };
    }
    ALL_ACHIEVEMENTS.forEach(a => {
      const earned = earnedBadgeIds.includes(a.id);
      if (a.hidden && !earned) return;
      counts.all.total++;
      counts[a.category].total++;
      if (earned) {
        counts.all.earned++;
        counts[a.category].earned++;
      }
    });
    return counts;
  }, [earnedBadgeIds]);

  // Nearby achievements (close to unlock)
  const nearbyAchievements = useMemo(() => {
    return ALL_ACHIEVEMENTS
      .filter(a => !earnedBadgeIds.includes(a.id) && !a.hidden && a.progress)
      .map(a => {
        const p = a.progress!(achievementStats);
        return { ...a, progressData: p, pct: p.target > 0 ? p.current / p.target : 0 };
      })
      .filter(a => a.pct >= 0.5 && a.pct < 1)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [earnedBadgeIds, achievementStats]);

  const dailyGoal = goal?.daily_page_goal || 20;
  const progress = Math.min(100, (computedStats.todayPages / dailyGoal) * 100);
  const multiplier = getStreakMultiplier(achievementStats.streak);

  return (
    <div className="card-library p-4 md:p-6 space-y-4">
      {/* Header */}
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
            <Star className={`w-4 h-4 ${getLevelColor(level)}`} />
            <span className={`text-sm font-bold ${getLevelColor(level)}`}>Nível {level}</span>
            <span className="text-xs text-muted-foreground">— {getLevelTitle(level)}</span>
          </div>
          <div className="flex items-center gap-2">
            {multiplier > 1 && (
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                🔥 {multiplier}x XP
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{totalXP} XP</span>
          </div>
        </div>
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
            style={{ width: `${levelProgress}%` }}
          />
          {[20, 40, 60, 80].map(mark => (
            <div key={mark} className="absolute top-0 bottom-0 w-px bg-background/50" style={{ left: `${mark}%` }} />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-right">
          {nextLevelXP === Infinity ? 'Nível máximo!' : `${nextLevelXP - totalXP} XP para nível ${level + 1}`}
        </p>
      </div>

      {/* Stats Grid or Edit */}
      {editingGoal ? (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Meta diária:</span>
          <Input type="number" value={newGoalValue} onChange={(e) => setNewGoalValue(e.target.value)} className="w-20 h-8 text-sm" min="1" />
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
            <p className="text-lg font-bold text-foreground">{computedStats.todayPages}/{dailyGoal}</p>
            <Progress value={progress} className="h-1.5" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Sequência</span>
            </div>
            <p className="text-lg font-bold text-foreground">{computedStats.streak} <span className="text-xs font-normal text-muted-foreground">dias</span></p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Recorde</span>
            </div>
            <p className="text-lg font-bold text-foreground">{Math.max(computedStats.streak, goal?.longest_streak || 0)} <span className="text-xs font-normal text-muted-foreground">dias</span></p>
          </div>
          <div className="space-y-2 cursor-pointer" onClick={() => setShowBadges(!showBadges)}>
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Conquistas</span>
            </div>
            <p className="text-lg font-bold text-foreground flex items-center gap-1">
              {earnedBadgeIds.length}/{categoryCounts.all?.total || TOTAL_ACHIEVEMENTS}
              {showBadges ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </p>
          </div>
        </div>
      )}

      {/* Streak Banner */}
      {computedStats.streak >= 3 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <Flame className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">
            {computedStats.streak} dias consecutivos! Continue assim! 🔥
          </span>
          {multiplier > 1 && (
            <Badge variant="outline" className="ml-auto text-[10px] text-primary border-primary/30">
              Multiplicador {multiplier}x
            </Badge>
          )}
        </div>
      )}

      {/* Nearby Achievements */}
      {nearbyAchievements.length > 0 && !showBadges && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">🎯 Próximas conquistas:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nearbyAchievements.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                <span className="text-lg">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{a.label}</p>
                  <div className="flex items-center gap-1.5">
                    <Progress value={a.pct * 100} className="h-1 flex-1" />
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                      {a.progressData.current.toLocaleString('pt-BR')}/{a.progressData.target.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges Section */}
      {showBadges && (
        <div className="space-y-3 pt-2 border-t border-border">
          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar conquista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs pl-7"
                />
              </div>
              <Button
                variant={showOnlyEarned ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowOnlyEarned(!showOnlyEarned)}
              >
                <Filter className="w-3 h-3 mr-1" />
                Conquistadas
              </Button>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-1">
              <Badge
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => setSelectedCategory('all')}
              >
                Todas ({categoryCounts.all?.earned || 0}/{categoryCounts.all?.total || 0})
              </Badge>
              {(Object.keys(CATEGORY_META) as AchievementCategory[]).map(cat => {
                const meta = CATEGORY_META[cat];
                const counts = categoryCounts[cat];
                if (!counts || counts.total === 0) return null;
                return (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px]"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {meta.icon} {meta.label} ({counts.earned}/{counts.total})
                  </Badge>
                );
              })}
            </div>

            {/* Rarity filter */}
            <div className="flex gap-1">
              <Badge
                variant={selectedRarity === 'all' ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => setSelectedRarity('all')}
              >
                Todas
              </Badge>
              {(Object.keys(RARITY_META) as AchievementRarity[]).map(r => (
                <Badge
                  key={r}
                  variant={selectedRarity === r ? 'default' : 'outline'}
                  className={`cursor-pointer text-[10px] ${selectedRarity === r ? '' : RARITY_META[r].color}`}
                  onClick={() => setSelectedRarity(r)}
                >
                  {RARITY_META[r].label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredAchievements.map((badge) => {
              const earned = earnedBadgeIds.includes(badge.id);
              const rMeta = RARITY_META[badge.rarity];
              const progressData = badge.progress ? badge.progress(achievementStats) : null;
              const pct = progressData ? Math.min(100, (progressData.current / progressData.target) * 100) : 0;

              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-center transition-all border ${
                    earned
                      ? `${rMeta.bgColor} ${rMeta.borderColor}`
                      : 'bg-muted/30 border-transparent opacity-60'
                  }`}
                  title={`${badge.description}\n${badge.xp} XP • ${rMeta.label}${progressData ? `\n${progressData.current.toLocaleString('pt-BR')}/${progressData.target.toLocaleString('pt-BR')}` : ''}`}
                >
                  <span className="text-xl">{badge.icon}</span>
                  <span className="text-[9px] leading-tight font-medium text-foreground line-clamp-2">{badge.label}</span>
                  
                  {/* Progress bar for unearned */}
                  {!earned && progressData && (
                    <div className="w-full">
                      <Progress value={pct} className="h-1" />
                    </div>
                  )}

                  <div className="flex items-center gap-0.5">
                    {earned ? (
                      <>
                        <TrendingUp className={`w-2 h-2 ${rMeta.color}`} />
                        <span className={`text-[8px] ${rMeta.color} font-bold`}>+{badge.xp}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-2 h-2 text-muted-foreground" />
                        <span className="text-[8px] text-muted-foreground">{badge.xp} XP</span>
                      </>
                    )}
                  </div>
                  
                  {/* Rarity dot */}
                  <div className={`w-1.5 h-1.5 rounded-full ${rMeta.color.replace('text-', 'bg-')}`} />
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            {TOTAL_ACHIEVEMENTS} conquistas totais • {earnedBadgeIds.length} desbloqueadas •
            Conquistas de sequência são dinâmicas — o nível reduz se parar de ler.
          </p>
        </div>
      )}
    </div>
  );
}
