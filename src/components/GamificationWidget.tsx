import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, Trophy, Target, Calendar, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
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
  total_badges: any[];
}

const BADGES = [
  { id: 'first_read', label: '📖 Primeira Leitura', condition: (stats: any) => stats.totalDays >= 1 },
  { id: 'week_streak', label: '🔥 7 dias seguidos', condition: (stats: any) => stats.streak >= 7 },
  { id: 'month_streak', label: '🏆 30 dias seguidos', condition: (stats: any) => stats.streak >= 30 },
  { id: 'hundred_pages', label: '📚 100 páginas lidas', condition: (stats: any) => stats.totalPages >= 100 },
  { id: 'thousand_pages', label: '🎯 1.000 páginas', condition: (stats: any) => stats.totalPages >= 1000 },
  { id: 'bookworm', label: '🐛 5 livros completos', condition: (stats: any) => stats.completedBooks >= 5 },
  { id: 'scholar', label: '🎓 50 palavras no dicionário', condition: (stats: any) => stats.vocabCount >= 50 },
];

export function GamificationWidget({ readings }: GamificationWidgetProps) {
  const { user } = useAuth();
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoalValue, setNewGoalValue] = useState('20');

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
        total_badges: Array.isArray(data.total_badges) ? data.total_badges : [],
      });
      setNewGoalValue(String(data.daily_page_goal));
    }
  }, [user]);

  useEffect(() => { loadGoal(); }, [loadGoal]);

  // Calculate streak from readings
  const streakData = useMemo(() => {
    if (readings.length === 0) return { streak: 0, todayPages: 0 };
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const readingDays = new Map<string, number>();
    
    for (const r of readings) {
      const date = r.dataInicio ? format(r.dataInicio, 'yyyy-MM-dd') : null;
      if (date) {
        readingDays.set(date, (readingDays.get(date) || 0) + r.quantidadePaginas);
      }
    }
    
    const todayPages = readingDays.get(today) || 0;
    
    // Calculate streak
    let streak = 0;
    let checkDate = new Date();
    
    // If no reading today, start from yesterday
    if (!readingDays.has(today)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (!readingDays.has(format(yesterday, 'yyyy-MM-dd'))) return { streak: 0, todayPages };
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
    
    return { streak, todayPages };
  }, [readings]);

  // Update streak in DB
  useEffect(() => {
    if (!user || !goal) return;
    const updateStreak = async () => {
      if (streakData.streak !== goal.current_streak || streakData.streak > goal.longest_streak) {
        await supabase.from('reading_goals').update({
          current_streak: streakData.streak,
          longest_streak: Math.max(streakData.streak, goal.longest_streak),
          last_reading_date: format(new Date(), 'yyyy-MM-dd'),
        }).eq('id', goal.id);
      }
    };
    updateStreak();
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
          {/* Daily Progress */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
            <p className="text-lg font-bold text-foreground">{streakData.todayPages}/{dailyGoal}</p>
            <Progress value={progress} className="h-1.5" />
          </div>
          
          {/* Streak */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs text-muted-foreground">Sequência</span>
            </div>
            <p className="text-lg font-bold text-foreground">{streakData.streak} <span className="text-xs font-normal text-muted-foreground">dias</span></p>
          </div>
          
          {/* Best Streak */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground">Recorde</span>
            </div>
            <p className="text-lg font-bold text-foreground">{Math.max(streakData.streak, goal?.longest_streak || 0)} <span className="text-xs font-normal text-muted-foreground">dias</span></p>
          </div>
          
          {/* Badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs text-muted-foreground">Conquistas</span>
            </div>
            <p className="text-lg font-bold text-foreground">{goal?.total_badges?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Streak Flame Animation */}
      {streakData.streak >= 3 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
            {streakData.streak} dias consecutivos! Continue assim! 🔥
          </span>
        </div>
      )}
    </div>
  );
}
