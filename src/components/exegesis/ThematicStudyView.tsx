import { useState, useCallback, useEffect } from 'react';
import { Search, BookOpen, ChevronRight, Send, Loader2, Save, StickyNote, Plus, Sparkles, BookMarked, Heart, Shield, Flame, Users, Star, Compass, Sun, Cloud, Zap, Globe, Trash2, Edit2, FolderHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ExegesisAnalysis, ExegesisMaterial } from '@/hooks/useExegesis';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ThematicCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  themes: ThematicTopic[];
}

interface ThematicTopic {
  id: string;
  title: string;
  description: string;
  keyVerses: string[];
  subtopics: string[];
}

const THEMATIC_CATEGORIES: ThematicCategory[] = [
  {
    id: 'vida_crista', label: 'Vida Cristã Prática', icon: Heart,
    themes: [
      { id: 'sentido_vida', title: 'Sentido da Vida', description: 'O propósito da existência humana segundo as Escrituras', keyVerses: ['Eclesiastes 12:13', 'Jeremias 29:11', 'Romanos 8:28'], subtopics: ['Propósito divino', 'Identidade em Cristo', 'Chamado e vocação'] },
      { id: 'cansaco', title: 'Cansaço e Descanso', description: 'Como encontrar repouso e força em Deus', keyVerses: ['Mateus 11:28-30', 'Isaías 40:31', 'Salmos 23'], subtopics: ['Esgotamento emocional', 'Descanso sabático', 'Forças renovadas'] },
      { id: 'ansiedade', title: 'Ansiedade e Preocupação', description: 'Paz em meio às tribulações', keyVerses: ['Filipenses 4:6-7', 'Mateus 6:25-34', '1 Pedro 5:7'], subtopics: ['Confiança em Deus', 'Entrega das preocupações', 'Paz interior'] },
      { id: 'perdao', title: 'Perdão', description: 'A importância e o poder do perdão bíblico', keyVerses: ['Efésios 4:32', 'Mateus 6:14-15', 'Marcos 11:25-26'], subtopics: ['Benefícios do perdão', 'Rancor e amargura', 'O dever de perdoar'] },
      { id: 'fe_dificuldades', title: 'Fé em Tempos Difíceis', description: 'Mantendo a fé nas provações', keyVerses: ['Tiago 1:2-4', 'Romanos 5:3-5', 'Hebreus 11'], subtopics: ['Provas e provações', 'Perseverança', 'Testemunhos bíblicos'] },
    ]
  },
  {
    id: 'salvacao_graca', label: 'Salvação e Graça', icon: Star,
    themes: [
      { id: 'salvacao', title: 'Salvação', description: 'O plano redentor de Deus para a humanidade', keyVerses: ['João 3:16', 'Efésios 2:8-9', 'Romanos 10:9-10'], subtopics: ['Graça de Deus', 'Fé e obras', 'Nova vida em Cristo'] },
      { id: 'arrependimento', title: 'Arrependimento', description: 'Mudança de mente e direção rumo a Deus', keyVerses: ['Atos 3:19', '2 Coríntios 7:10', 'Lucas 15:7'], subtopics: ['Convicção do Espírito', 'Confissão', 'Restauração'] },
      { id: 'graca', title: 'Graça de Deus', description: 'O favor imerecido e a bondade divina', keyVerses: ['Efésios 2:8-9', 'Romanos 3:24', '2 Coríntios 12:9'], subtopics: ['Graça vs Lei', 'Graça suficiente', 'Viver pela graça'] },
    ]
  },
  {
    id: 'carater_cristao', label: 'Caráter Cristão', icon: Shield,
    themes: [
      { id: 'humildade', title: 'Humildade', description: 'O valor da humildade no caráter cristão', keyVerses: ['Filipenses 2:5-8', 'Tiago 4:6', '1 Pedro 5:5-6'], subtopics: ['Cristo como modelo', 'Orgulho vs humildade', 'Submissão'] },
      { id: 'orgulho', title: 'Orgulho', description: 'Os perigos do orgulho e da soberba', keyVerses: ['2 Crônicas 26:3-4,16', 'Filipenses 2:5-8', 'Isaías 14:12-15'], subtopics: ['Como nos afeta', 'Manifestações', 'Submissão a Deus'] },
      { id: 'integridade', title: 'Integridade e Honestidade', description: 'Viver com verdade e transparência', keyVerses: ['Provérbios 11:3', 'Colossenses 3:23', 'Salmos 15'], subtopics: ['Honestidade no trabalho', 'Verdade vs mentira', 'Caráter íntegro'] },
      { id: 'etica_crista', title: 'Ética Cristã', description: 'Vivendo os valores do Reino de Deus', keyVerses: ['Mateus 5:13-16', 'Romanos 12', 'Gálatas 5:22-23'], subtopics: ['Padrão bíblico', 'Ética nos relacionamentos', 'Ser luz e sal'] },
    ]
  },
  {
    id: 'crescimento', label: 'Crescimento Espiritual', icon: Flame,
    themes: [
      { id: 'oracao', title: 'Oração', description: 'Desenvolvendo uma vida de oração profunda', keyVerses: ['Filipenses 4:6', '1 Tessalonicenses 5:17', 'Mateus 6:5-15'], subtopics: ['Tipos de oração', 'Oração eficaz', 'Modelo do Pai Nosso'] },
      { id: 'fruto_espirito', title: 'Fruto do Espírito', description: 'As evidências da ação do Espírito Santo', keyVerses: ['Gálatas 5:22-23', 'João 15:1-8', 'Romanos 8:5-6'], subtopics: ['Amor e alegria', 'Paz e paciência', 'Domínio próprio'] },
      { id: 'santificacao', title: 'Crescer na Fé', description: 'O processo contínuo de transformação', keyVerses: ['2 Pedro 3:18', 'Filipenses 1:6', 'Romanos 12:1-2'], subtopics: ['Transformação diária', 'Disciplinas espirituais', 'Maturidade cristã'] },
    ]
  },
  {
    id: 'relacionamentos', label: 'Relacionamentos', icon: Users,
    themes: [
      { id: 'amor_proximo', title: 'Amor ao Próximo', description: 'O mandamento do amor prático', keyVerses: ['Mateus 22:39', 'João 13:34-35', '1 Coríntios 13'], subtopics: ['Amor incondicional', 'Servir ao próximo', 'Unidade no corpo'] },
      { id: 'familia', title: 'Família Cristã', description: 'Princípios bíblicos para o lar', keyVerses: ['Efésios 5:22-33', 'Deuteronômio 6:6-7', 'Provérbios 22:6'], subtopics: ['Casamento', 'Criação de filhos', 'Honrar os pais'] },
      { id: 'comunhao', title: 'Comunhão e Igreja', description: 'A importância do corpo de Cristo', keyVerses: ['Hebreus 10:25', 'Atos 2:42-47', '1 Coríntios 12'], subtopics: ['Unidade', 'Dons espirituais', 'Servir com excelência'] },
    ]
  },
  {
    id: 'temas_atuais', label: 'Temas Atuais', icon: Compass,
    themes: [
      { id: 'mundo_moderno', title: 'Cristão no Mundo Moderno', description: 'Vivendo a fé no contexto atual', keyVerses: ['Romanos 12:2', 'João 17:14-16', 'Mateus 5:13-16'], subtopics: ['Redes sociais', 'Pressões culturais', 'Testemunho no dia a dia'] },
      { id: 'racismo', title: 'Racismo e Igualdade', description: 'A visão bíblica sobre igualdade', keyVerses: ['1 Coríntios 12:27', 'Atos 17:26', 'Efésios 2:13-16'], subtopics: ['Deus não faz acepção', 'Em Cristo não há barreiras', 'Amor e justiça'] },
      { id: 'sofrimento', title: 'Sofrimento e Esperança', description: 'Encontrando esperança no sofrimento', keyVerses: ['Romanos 8:18', '2 Coríntios 4:17', 'Apocalipse 21:4'], subtopics: ['Por que sofremos', 'Consolo de Deus', 'Esperança eterna'] },
    ]
  },
  {
    id: 'pecado_luta', label: 'Pecado e Luta Espiritual', icon: Zap,
    themes: [
      { id: 'luxuria', title: 'Luxúria', description: 'Advertências e libertação', keyVerses: ['Romanos 13:13-14', 'Ezequiel 24:13', 'Tiago 4:8'], subtopics: ['Advertências', 'Consequências', 'Libertação'] },
      { id: 'mentira', title: 'Mentiras', description: 'A verdade como princípio de vida', keyVerses: ['João 8:44', 'Salmos 101:7', 'Efésios 4:25'], subtopics: ['Consequências', 'Deus aborrece a mentira', 'Viver na verdade'] },
      { id: 'murmuracao', title: 'Murmuração', description: 'Os perigos da reclamação constante', keyVerses: ['Tiago 4:11', 'Números 12:1-3,9-10', 'Salmos 106:21-25'], subtopics: ['Características', 'Como evitar', 'Gratidão como antídoto'] },
      { id: 'rejeicao', title: 'Rejeição', description: 'O amor de Deus que acolhe', keyVerses: ['Lucas 19:10', '1 Coríntios 1:27-29', '1 Tessalonicenses 4:9'], subtopics: ['Deus não rejeita ninguém', 'O amor de Deus é para todos', 'Nosso chamado ao amor'] },
    ]
  },
];

interface Props {
  onSave: (analysis: { passage: string; analysis_type: string; content: string }) => Promise<ExegesisAnalysis | null>;
  getMaterialsContext?: () => string | undefined;
  materialsCount?: number;
  materials?: ExegesisMaterial[];
  onCreateNote?: (title: string, content: string) => void;
}

export function ThematicStudyView({ onSave, getMaterialsContext, materialsCount = 0, materials = [], onCreateNote }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<ThematicCategory | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ThematicTopic | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [studyResult, setStudyResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [webSearching, setWebSearching] = useState(false);

  const filteredCategories = THEMATIC_CATEGORIES.map(cat => ({
    ...cat,
    themes: cat.themes.filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subtopics.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(cat => cat.themes.length > 0);

  const generateStudy = useCallback(async (topic: ThematicTopic | null, custom?: string) => {
    const themeTitle = topic?.title || custom || '';
    if (!themeTitle.trim()) {
      toast({ title: 'Informe um tema', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setStudyResult('');

    try {
      const materialsContext = getMaterialsContext?.() || '';
      let webContext = '';

      if (useWebSearch) {
        setWebSearching(true);
        try {
          const { data } = await supabase.functions.invoke('web-search', { body: { query: `${themeTitle} estudo bíblico teologia` } });
          if (data?.results?.length) {
            webContext = '\n\n## FONTES EXTERNAS (complementares):\n' + data.results.map((r: any) =>
              `- ${r.title} (${r.source}): ${r.snippet}\n  Ref. ABNT: ${r.abnt_reference || `${r.source}. Disponível em: ${r.url}. Acesso em: ${new Date().toLocaleDateString('pt-BR')}`}`
            ).join('\n');
          }
        } catch (e) { console.error('Web search error:', e); }
        setWebSearching(false);
      }

      const topicDetails = topic
        ? `\nVersículos-chave: ${topic.keyVerses.join(', ')}\nSubtemas: ${topic.subtopics.join(', ')}\nDescrição: ${topic.description}`
        : '';

      const prompt = `## ESTUDO TEMÁTICO BÍBLICO: ${themeTitle}
${topicDetails}

${materialsContext ? `## MATERIAIS DO USUÁRIO (USE OBRIGATORIAMENTE 100%):\n${materialsContext}\n` : ''}
${webContext}

Elabore um ESTUDO TEMÁTICO COMPLETO e PROFUNDO sobre "${themeTitle}" seguindo esta estrutura:

## 📖 Tema: ${themeTitle}

### 🎯 Tema Central
- Definição clara e bíblica do tema
- Relevância para a vida cristã atual

### 📌 Texto Base
- Passagens principais com referências completas
- Contexto dos textos selecionados

### 🧭 Subtemas para Estudo (mínimo 4 encontros)
Para cada subtema:
- **Título do Subtema**
- Explicação bíblica aprofundada
- 📖 Versículo-chave com referência
- Aplicação prática

### 📜 Referências Cruzadas
- Textos do AT que se conectam ao tema
- Textos do NT que complementam
- Paralelos e tipologias

### 💬 Perguntas para Discussão
- Mínimo 5 perguntas reflexivas
- Perguntas de aplicação pessoal

### 🔥 Dinâmica Sugerida
- Atividade prática para o grupo
- Como conduzir a discussão

### 🎤 Frase de Impacto
- Uma frase marcante para encerramento

### 📚 Referências Bibliográficas
- Cite todas as fontes utilizadas no formato ABNT
- Inclua materiais do usuário que foram consultados

IMPORTANTE:
- Use linguagem acessível, como conversa entre amigos
- Profundidade teológica SEM termos acadêmicos complexos
- Cada ponto deve ter aplicação prática real
- ${materialsContext ? 'PRIORIZE os materiais do usuário como fonte primária' : 'Use fontes bíblicas confiáveis'}
${webContext ? '- Cite as fontes externas no formato ABNT quando utilizadas' : ''}`;

      const response = await supabase.functions.invoke('exegesis', {
        body: { type: 'thematic_study', passage: themeTitle, content: prompt, materialsContext },
      });

      if (response.error) throw new Error(response.error.message);

      // Handle streaming
      const reader = response.data instanceof ReadableStream
        ? response.data.getReader()
        : null;

      if (reader) {
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                setStudyResult(fullText);
              }
            } catch { /* partial */ }
          }
        }
      }
    } catch (e) {
      console.error('Thematic study error:', e);
      toast({ title: 'Erro ao gerar estudo', description: String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [getMaterialsContext, useWebSearch]);

  const handleSaveAnalysis = async () => {
    if (!studyResult) return;
    const title = selectedTopic?.title || customTopic || 'Estudo Temático';
    await onSave({ passage: title, analysis_type: 'thematic_study', content: studyResult });
    toast({ title: '✅ Estudo salvo!', description: 'Acesse no Histórico de Análises.' });
  };

  const handleCreateNote = () => {
    if (!studyResult || !onCreateNote) return;
    const title = selectedTopic?.title || customTopic || 'Estudo Temático';
    onCreateNote(`📖 Estudo: ${title}`, studyResult);
  };

  // Topic detail view with study result
  if (selectedTopic || (customTopic && studyResult)) {
    const topic = selectedTopic;
    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedTopic(null); setStudyResult(''); setCustomTopic(''); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Voltar aos temas
        </button>

        {topic && !studyResult && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card">
              <h3 className="text-lg font-bold text-foreground">{topic.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {topic.keyVerses.map(v => (
                  <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                ))}
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Subtemas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {topic.subtopics.map(s => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Buscar fontes externas (ABNT)</span>
              </div>
              <Switch checked={useWebSearch} onCheckedChange={setUseWebSearch} />
            </div>

            {materialsCount > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                <BookMarked className="w-4 h-4 text-primary" />
                <span className="text-xs text-primary font-medium">{materialsCount} materiais serão utilizados como base</span>
              </div>
            )}

            <Button onClick={() => generateStudy(topic)} disabled={loading} className="w-full gap-2" size="lg">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? (webSearching ? 'Buscando fontes...' : 'Gerando estudo...') : 'Gerar Estudo Completo'}
            </Button>
          </div>
        )}

        {studyResult && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleSaveAnalysis} className="gap-1.5">
                <Save className="w-3.5 h-3.5" /> Salvar no Histórico
              </Button>
              {onCreateNote && (
                <Button variant="outline" size="sm" onClick={handleCreateNote} className="gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" /> Criar Nota
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => generateStudy(topic, customTopic)} disabled={loading} className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Regenerar
              </Button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-xl border border-border bg-card">
              <ReactMarkdown>{studyResult}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Category themes view
  if (selectedCategory) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Voltar às categorias
        </button>

        <div className="flex items-center gap-2 mb-2">
          {(() => { const Icon = selectedCategory.icon; return <Icon className="w-5 h-5 text-primary" />; })()}
          <h3 className="font-bold text-foreground">{selectedCategory.label}</h3>
        </div>

        <div className="grid gap-2">
          {selectedCategory.themes.map(theme => (
            <button
              key={theme.id}
              onClick={() => setSelectedTopic(theme)}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border border-border bg-card",
                "hover:bg-accent/50 hover:border-primary/30 transition-all text-left group"
              )}
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-foreground">{theme.title}</span>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{theme.description}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {theme.keyVerses.slice(0, 2).map(v => (
                    <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0">{v}</Badge>
                  ))}
                  {theme.keyVerses.length > 2 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{theme.keyVerses.length - 2}</Badge>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Main categories + search + custom topic view
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tema (ex: perdão, ansiedade, família...)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Custom topic */}
      <div className="p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 space-y-2">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Tema Personalizado</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Digite qualquer tema bíblico..."
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            className="flex-1 text-sm"
          />
          <Button
            size="sm"
            onClick={() => {
              if (customTopic.trim()) {
                setSelectedTopic(null);
                generateStudy(null, customTopic);
              }
            }}
            disabled={!customTopic.trim() || loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Gerar
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Fontes externas</span>
          </div>
          <Switch checked={useWebSearch} onCheckedChange={setUseWebSearch} />
        </div>
      </div>

      {/* Categories grid */}
      {searchQuery ? (
        <div className="space-y-3">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="space-y-2">
              <div className="flex items-center gap-2">
                {(() => { const Icon = cat.icon; return <Icon className="w-4 h-4 text-primary" />; })()}
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{cat.label}</span>
              </div>
              {cat.themes.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => { setSelectedCategory(cat); setSelectedTopic(theme); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-all text-left"
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{theme.title}</span>
                    <p className="text-xs text-muted-foreground">{theme.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum tema encontrado. Use o campo acima para gerar um estudo personalizado.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {THEMATIC_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border border-border bg-card",
                  "hover:bg-accent/50 hover:border-primary/30 hover:shadow-md",
                  "transition-all duration-200 text-left group"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-foreground">{cat.label}</span>
                  <p className="text-xs text-muted-foreground">{cat.themes.length} temas</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
