// =====================================================
// SISTEMA DE CONQUISTAS - 1000+ Achievements
// =====================================================

export type AchievementRarity = 'comum' | 'raro' | 'epico' | 'lendario';
export type AchievementCategory =
  | 'leitura'
  | 'consistencia'
  | 'volume'
  | 'conhecimento'
  | 'marcos'
  | 'desafios'
  | 'horarios'
  | 'frequencia'
  | 'livros'
  | 'ocultas';

export interface AchievementDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  xp: number;
  category: AchievementCategory;
  rarity: AchievementRarity;
  hidden?: boolean; // ocultas - only show after unlocked
  condition: (stats: AchievementStats) => boolean;
  progress?: (stats: AchievementStats) => { current: number; target: number };
}

export interface AchievementStats {
  totalDays: number;
  streak: number;
  longestStreak: number;
  totalPages: number;
  completedBooks: number;
  vocabCount: number;
  quotesCount: number;
  notesCount: number;
  outlinesCount: number;
  analysesCount: number;
  totalReadingMinutes: number;
  chaptersRead: number;
  // Time-based
  earlyMorningDays: number; // readings before 6am
  morningDays: number; // readings before 8am
  nightDays: number; // readings after 22pm
  midnightDays: number; // readings 00-04am
  // Weekly
  fullWeeks: number; // weeks with 7/7 days read
  // Streak recovery
  streakRecoveries: number;
  // Micro reading
  microReadingDays: number; // days with < 5 min reading
  // Bible specific
  bibleChaptersRead: number;
  bibleBooksCompleted: number;
  otCompleted: boolean;
  ntCompleted: boolean;
  fullBibleCompleted: boolean;
  // Same hour consistency
  sameHourStreakDays: number;
}

// =====================================================
// CATEGORY METADATA
// =====================================================
export const CATEGORY_META: Record<AchievementCategory, { label: string; icon: string; color: string }> = {
  leitura: { label: 'Leitura', icon: '📖', color: 'text-blue-500' },
  consistencia: { label: 'Consistência', icon: '🔥', color: 'text-orange-500' },
  volume: { label: 'Volume', icon: '📊', color: 'text-green-500' },
  conhecimento: { label: 'Conhecimento', icon: '🧠', color: 'text-purple-500' },
  marcos: { label: 'Marcos', icon: '🏆', color: 'text-amber-500' },
  desafios: { label: 'Desafios Especiais', icon: '🎯', color: 'text-red-500' },
  horarios: { label: 'Horários', icon: '⏰', color: 'text-cyan-500' },
  frequencia: { label: 'Frequência', icon: '🗓️', color: 'text-indigo-500' },
  livros: { label: 'Livros Completos', icon: '📚', color: 'text-emerald-500' },
  ocultas: { label: 'Ocultas', icon: '💎', color: 'text-pink-500' },
};

export const RARITY_META: Record<AchievementRarity, { label: string; color: string; bgColor: string; borderColor: string }> = {
  comum: { label: 'Comum', color: 'text-muted-foreground', bgColor: 'bg-muted/50', borderColor: 'border-border' },
  raro: { label: 'Raro', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  epico: { label: 'Épico', color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  lendario: { label: 'Lendário', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
};

// =====================================================
// HELPER: Generate progressive achievements
// =====================================================
function genProgressive(
  prefix: string,
  category: AchievementCategory,
  icon: string,
  unit: string,
  milestones: number[],
  statKey: keyof AchievementStats,
  xpBase: number,
): AchievementDef[] {
  return milestones.map((target, i) => {
    const rarity: AchievementRarity =
      i < milestones.length * 0.3 ? 'comum' :
      i < milestones.length * 0.6 ? 'raro' :
      i < milestones.length * 0.85 ? 'epico' : 'lendario';
    
    const xp = Math.round(xpBase * (1 + i * 0.5));
    const label = `${target.toLocaleString('pt-BR')} ${unit}`;
    
    return {
      id: `${prefix}_${target}`,
      label,
      icon,
      description: `Alcance ${target.toLocaleString('pt-BR')} ${unit}`,
      xp,
      category,
      rarity,
      condition: (s: AchievementStats) => (s[statKey] as number) >= target,
      progress: (s: AchievementStats) => ({ current: Math.min(s[statKey] as number, target), target }),
    };
  });
}

// =====================================================
// 📖 LEITURA - Dias de leitura
// =====================================================
const READING_DAYS: AchievementDef[] = genProgressive(
  'read_days', 'leitura', '📖', 'dias de leitura',
  [1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 100, 120, 150, 175, 200, 225, 250, 275, 300, 350, 365, 400, 450, 500, 600, 700, 730, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1750, 2000],
  'totalDays', 2
);

// =====================================================
// 📊 VOLUME - Páginas lidas
// =====================================================
const PAGES: AchievementDef[] = genProgressive(
  'pages', 'volume', '📄', 'páginas',
  [1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 7500, 8000, 9000, 10000, 12500, 15000, 17500, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 60000, 75000, 100000],
  'totalPages', 2
);

// =====================================================
// 🔥 CONSISTÊNCIA - Sequência (Streak)
// =====================================================
const STREAKS: AchievementDef[] = genProgressive(
  'streak', 'consistencia', '🔥', 'dias seguidos',
  [1, 2, 3, 5, 7, 10, 14, 21, 28, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 200, 210, 225, 240, 250, 270, 300, 330, 365, 400, 450, 500, 545, 600, 650, 700, 730, 800, 900, 1000],
  'streak', 3
);

// =====================================================
// 📚 LIVROS COMPLETOS
// =====================================================
const BOOKS: AchievementDef[] = genProgressive(
  'books', 'livros', '📚', 'livros completos',
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 90, 100, 120, 150, 175, 200, 250, 300, 400, 500],
  'completedBooks', 3
);

// =====================================================
// 🧠 CONHECIMENTO - Vocabulário
// =====================================================
const VOCAB: AchievementDef[] = genProgressive(
  'vocab', 'conhecimento', '📝', 'palavras salvas',
  [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000],
  'vocabCount', 2
);

// =====================================================
// 🧠 CONHECIMENTO - Citações
// =====================================================
const QUOTES: AchievementDef[] = genProgressive(
  'quotes', 'conhecimento', '💬', 'citações salvas',
  [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500],
  'quotesCount', 2
);

// =====================================================
// 🧠 CONHECIMENTO - Notas
// =====================================================
const NOTES: AchievementDef[] = genProgressive(
  'notes', 'conhecimento', '📒', 'notas criadas',
  [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500],
  'notesCount', 2
);

// =====================================================
// 🧠 CONHECIMENTO - Esboços
// =====================================================
const OUTLINES: AchievementDef[] = genProgressive(
  'outlines', 'conhecimento', '📋', 'esboços criados',
  [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200],
  'outlinesCount', 3
);

// =====================================================
// 🧠 CONHECIMENTO - Análises exegéticas
// =====================================================
const ANALYSES: AchievementDef[] = genProgressive(
  'analyses', 'conhecimento', '🔍', 'análises exegéticas',
  [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200],
  'analysesCount', 3
);

// =====================================================
// ⏰ HORÁRIOS - Tempo total de leitura (minutos)
// =====================================================
const READING_TIME: AchievementDef[] = genProgressive(
  'time', 'horarios', '⏱️', 'minutos de leitura',
  [5, 10, 15, 30, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 720, 840, 960, 1080, 1200, 1500, 1800, 2100, 2400, 3000, 3600, 4200, 4800, 5400, 6000, 7200, 9000, 10800, 14400, 18000, 21600, 28800, 36000],
  'totalReadingMinutes', 2
);

// =====================================================
// ⏰ HORÁRIOS - Leitura matinal (antes das 8h)
// =====================================================
const MORNING: AchievementDef[] = genProgressive(
  'morning', 'horarios', '🌅', 'dias lendo pela manhã',
  [1, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 150, 180, 200, 250, 300, 365],
  'morningDays', 3
);

// =====================================================
// ⏰ HORÁRIOS - Leitura noturna (após 22h)
// =====================================================
const NIGHT: AchievementDef[] = genProgressive(
  'night', 'horarios', '🌙', 'dias lendo à noite',
  [1, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 150, 180, 200, 250, 300, 365],
  'nightDays', 3
);

// =====================================================
// ⏰ HORÁRIOS - Madrugada (00h-04h)
// =====================================================
const MIDNIGHT: AchievementDef[] = genProgressive(
  'midnight', 'ocultas', '🦉', 'dias lendo de madrugada',
  [1, 3, 5, 7, 10, 15, 20, 30, 50, 75, 100],
  'midnightDays', 4
).map(a => ({ ...a, hidden: true, rarity: a.rarity === 'comum' ? 'raro' as const : a.rarity }));

// =====================================================
// 🗓️ FREQUÊNCIA - Semanas completas (7/7)
// =====================================================
const FULL_WEEKS: AchievementDef[] = genProgressive(
  'full_weeks', 'frequencia', '🗓️', 'semanas completas',
  [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 52, 60, 70, 75, 80, 90, 100, 104, 120, 150, 200],
  'fullWeeks', 3
);

// =====================================================
// 📖 Capítulos bíblicos
// =====================================================
const BIBLE_CHAPTERS: AchievementDef[] = genProgressive(
  'bible_ch', 'leitura', '✝️', 'capítulos bíblicos',
  [1, 5, 10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1189, 1500, 2000, 2378, 3000, 5000, 10000],
  'bibleChaptersRead', 3
);

// =====================================================
// 📖 Livros bíblicos completos
// =====================================================
const BIBLE_BOOKS: AchievementDef[] = genProgressive(
  'bible_bk', 'livros', '📜', 'livros bíblicos completos',
  [1, 2, 3, 5, 7, 10, 12, 15, 17, 20, 22, 25, 27, 30, 33, 36, 39, 42, 45, 50, 55, 60, 66],
  'bibleBooksCompleted', 3
);

// =====================================================
// ⏰ HORÁRIOS - Mesmo horário consecutivo
// =====================================================
const SAME_HOUR: AchievementDef[] = genProgressive(
  'same_hour', 'desafios', '🕐', 'dias no mesmo horário',
  [3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 150, 180, 200, 250, 300, 365],
  'sameHourStreakDays', 4
);

// =====================================================
// 🔥 Recuperações de streak
// =====================================================
const RECOVERIES: AchievementDef[] = genProgressive(
  'recovery', 'desafios', '🔄', 'recuperações de sequência',
  [1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50],
  'streakRecoveries', 3
);

// =====================================================
// ⏰ Micro leitura
// =====================================================
const MICRO: AchievementDef[] = genProgressive(
  'micro', 'desafios', '⚡', 'dias de micro leitura',
  [1, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50, 75, 100],
  'microReadingDays', 2
);

// =====================================================
// ⏰ Aurora (antes das 6h)
// =====================================================
const EARLY_MORNING: AchievementDef[] = genProgressive(
  'dawn', 'horarios', '🌄', 'dias lendo antes das 6h',
  [1, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 365],
  'earlyMorningDays', 4
);

// =====================================================
// 🏆 MARCOS ESPECIAIS (named achievements)
// =====================================================
const MILESTONES: AchievementDef[] = [
  // Bible milestones
  {
    id: 'nt_complete', label: 'Novo Testamento Completo', icon: '⛪', category: 'marcos', rarity: 'epico',
    description: 'Complete todos os livros do Novo Testamento', xp: 50,
    condition: (s) => s.ntCompleted,
    progress: (s) => ({ current: s.ntCompleted ? 1 : 0, target: 1 }),
  },
  {
    id: 'ot_complete', label: 'Antigo Testamento Completo', icon: '📜', category: 'marcos', rarity: 'epico',
    description: 'Complete todos os livros do Antigo Testamento', xp: 60,
    condition: (s) => s.otCompleted,
    progress: (s) => ({ current: s.otCompleted ? 1 : 0, target: 1 }),
  },
  {
    id: 'full_bible', label: 'Bíblia Completa', icon: '👑', category: 'marcos', rarity: 'lendario',
    description: 'Complete toda a Bíblia', xp: 100,
    condition: (s) => s.fullBibleCompleted,
    progress: (s) => ({ current: s.fullBibleCompleted ? 1 : 0, target: 1 }),
  },
];

// =====================================================
// 🎯 DESAFIOS ESPECIAIS NOMEADOS
// =====================================================
const SPECIAL_CHALLENGES: AchievementDef[] = [
  {
    id: 'fogo_vivo', label: 'Fogo Vivo', icon: '🔥', category: 'desafios', rarity: 'lendario',
    description: '100 dias seguidos de leitura', xp: 40,
    condition: (s) => s.streak >= 100,
    progress: (s) => ({ current: Math.min(s.streak, 100), target: 100 }),
  },
  {
    id: 'inabalavel', label: 'Inabalável', icon: '💎', category: 'desafios', rarity: 'lendario',
    description: '365 dias seguidos sem falhar', xp: 80,
    condition: (s) => s.streak >= 365,
    progress: (s) => ({ current: Math.min(s.streak, 365), target: 365 }),
  },
  {
    id: 'disciplina_aco', label: 'Disciplina de Aço', icon: '⚔️', category: 'desafios', rarity: 'lendario',
    description: 'Ler 30 dias no mesmo horário', xp: 35,
    condition: (s) => s.sameHourStreakDays >= 30,
    progress: (s) => ({ current: Math.min(s.sameHourStreakDays, 30), target: 30 }),
  },
  {
    id: 'constancia_invisivel', label: 'Constância Invisível', icon: '👻', category: 'ocultas', rarity: 'epico', hidden: true,
    description: 'Ler por 30 dias mesmo com pouca leitura', xp: 20,
    condition: (s) => s.microReadingDays >= 30,
    progress: (s) => ({ current: Math.min(s.microReadingDays, 30), target: 30 }),
  },
  {
    id: 'fenix', label: 'Fênix', icon: '🐦‍🔥', category: 'desafios', rarity: 'epico',
    description: 'Recupere sua sequência 5 vezes', xp: 20,
    condition: (s) => s.streakRecoveries >= 5,
    progress: (s) => ({ current: Math.min(s.streakRecoveries, 5), target: 5 }),
  },
  {
    id: 'coruja_noturna', label: 'Coruja Noturna', icon: '🦉', category: 'ocultas', rarity: 'epico', hidden: true,
    description: 'Ler de madrugada por 10 dias', xp: 15,
    condition: (s) => s.midnightDays >= 10,
    progress: (s) => ({ current: Math.min(s.midnightDays, 10), target: 10 }),
  },
  {
    id: 'madrugador', label: 'Madrugador Espiritual', icon: '🌅', category: 'desafios', rarity: 'epico',
    description: 'Ler antes das 6h por 30 dias', xp: 25,
    condition: (s) => s.earlyMorningDays >= 30,
    progress: (s) => ({ current: Math.min(s.earlyMorningDays, 30), target: 30 }),
  },
  {
    id: 'semana_perfeita', label: 'Semana Perfeita', icon: '✨', category: 'frequencia', rarity: 'raro',
    description: 'Complete 1 semana lendo todos os dias', xp: 10,
    condition: (s) => s.fullWeeks >= 1,
    progress: (s) => ({ current: Math.min(s.fullWeeks, 1), target: 1 }),
  },
  {
    id: 'ano_completo', label: 'Ano de Leitura', icon: '🎆', category: 'frequencia', rarity: 'lendario',
    description: 'Complete 52 semanas perfeitas', xp: 60,
    condition: (s) => s.fullWeeks >= 52,
    progress: (s) => ({ current: Math.min(s.fullWeeks, 52), target: 52 }),
  },
  {
    id: 'erudito', label: 'Erudito Bíblico', icon: '🎓', category: 'conhecimento', rarity: 'lendario',
    description: 'Tenha 500 palavras, 100 notas e 50 esboços', xp: 50,
    condition: (s) => s.vocabCount >= 500 && s.notesCount >= 100 && s.outlinesCount >= 50,
  },
  {
    id: 'mil_horas', label: 'Mil Horas', icon: '⏳', category: 'marcos', rarity: 'lendario',
    description: 'Acumule 60.000 minutos (1.000 horas) de leitura', xp: 80,
    condition: (s) => s.totalReadingMinutes >= 60000,
    progress: (s) => ({ current: Math.min(s.totalReadingMinutes, 60000), target: 60000 }),
  },
  {
    id: 'centenario', label: 'Centenário', icon: '💯', category: 'marcos', rarity: 'epico',
    description: 'Conclua 100 livros', xp: 40,
    condition: (s) => s.completedBooks >= 100,
    progress: (s) => ({ current: Math.min(s.completedBooks, 100), target: 100 }),
  },
];

// =====================================================
// 💎 CONQUISTAS OCULTAS EXTRAS
// =====================================================
const HIDDEN_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'hidden_7var', label: 'Explorador', icon: '🗺️', category: 'ocultas', rarity: 'raro', hidden: true,
    description: 'Leia 7 dias seguidos capítulos de livros diferentes', xp: 10,
    condition: (s) => s.streak >= 7 && s.bibleBooksCompleted >= 2,
  },
  {
    id: 'hidden_vocab100', label: 'Lexicógrafo', icon: '📖', category: 'ocultas', rarity: 'epico', hidden: true,
    description: 'Salve 100 palavras no dicionário', xp: 15,
    condition: (s) => s.vocabCount >= 100,
  },
  {
    id: 'hidden_notes50', label: 'Escriba', icon: '✍️', category: 'ocultas', rarity: 'epico', hidden: true,
    description: 'Crie 50 notas', xp: 15,
    condition: (s) => s.notesCount >= 50,
  },
  {
    id: 'hidden_1000pg_streak', label: 'Maratonista', icon: '🏃', category: 'ocultas', rarity: 'lendario', hidden: true,
    description: '1000 páginas + 30 dias de sequência', xp: 30,
    condition: (s) => s.totalPages >= 1000 && s.streak >= 30,
  },
  {
    id: 'hidden_all_knowledge', label: 'Sábio Completo', icon: '🧙', category: 'ocultas', rarity: 'lendario', hidden: true,
    description: 'Ter vocabulário, notas, esboços e análises', xp: 25,
    condition: (s) => s.vocabCount >= 10 && s.notesCount >= 10 && s.outlinesCount >= 5 && s.analysesCount >= 5,
  },
];

// =====================================================
// MERGE ALL ACHIEVEMENTS
// =====================================================
export const ALL_ACHIEVEMENTS: AchievementDef[] = [
  ...READING_DAYS,
  ...PAGES,
  ...STREAKS,
  ...BOOKS,
  ...VOCAB,
  ...QUOTES,
  ...NOTES,
  ...OUTLINES,
  ...ANALYSES,
  ...READING_TIME,
  ...MORNING,
  ...NIGHT,
  ...MIDNIGHT,
  ...FULL_WEEKS,
  ...BIBLE_CHAPTERS,
  ...BIBLE_BOOKS,
  ...SAME_HOUR,
  ...RECOVERIES,
  ...MICRO,
  ...EARLY_MORNING,
  ...MILESTONES,
  ...SPECIAL_CHALLENGES,
  ...HIDDEN_ACHIEVEMENTS,
];

// =====================================================
// XP / LEVEL SYSTEM
// =====================================================
// Max level = 100, XP scales logarithmically
// Level N requires totalXP such that: level = 100 * (1 - e^(-totalXP/SCALE))
const XP_SCALE = 2000;

export function calculateLevel(totalXP: number): number {
  const raw = 100 * (1 - Math.exp(-totalXP / XP_SCALE));
  return Math.min(100, Math.floor(raw));
}

export function xpForLevel(level: number): number {
  if (level >= 100) return Infinity;
  return Math.round(-XP_SCALE * Math.log(1 - level / 100));
}

export function getLevelTitle(level: number): string {
  if (level >= 95) return '👑 Mestre Supremo';
  if (level >= 90) return '👑 Mestre da Leitura';
  if (level >= 80) return '🏅 Leitor Expert';
  if (level >= 70) return '📖 Leitor Avançado';
  if (level >= 60) return '📚 Leitor Sênior';
  if (level >= 50) return '📗 Leitor Dedicado';
  if (level >= 40) return '📘 Leitor Consistente';
  if (level >= 30) return '📙 Leitor Regular';
  if (level >= 20) return '📕 Leitor Iniciante';
  if (level >= 10) return '🌱 Aprendiz';
  if (level >= 5) return '🥚 Novato';
  return '🐣 Começando';
}

export function getLevelColor(level: number): string {
  if (level >= 90) return 'text-amber-500';
  if (level >= 70) return 'text-purple-500';
  if (level >= 50) return 'text-blue-500';
  if (level >= 30) return 'text-green-500';
  if (level >= 10) return 'text-teal-500';
  return 'text-muted-foreground';
}

// Streak XP multiplier
export function getStreakMultiplier(streak: number): number {
  if (streak >= 365) return 3.0;
  if (streak >= 180) return 2.5;
  if (streak >= 90) return 2.0;
  if (streak >= 30) return 1.5;
  if (streak >= 7) return 1.2;
  return 1.0;
}

// Total achievement count for display
export const TOTAL_ACHIEVEMENTS = ALL_ACHIEVEMENTS.length;
export const VISIBLE_ACHIEVEMENTS = ALL_ACHIEVEMENTS.filter(a => !a.hidden).length;
