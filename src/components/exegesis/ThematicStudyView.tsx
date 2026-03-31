import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, BookOpen, ChevronRight, Send, Loader2, Save, StickyNote, Plus, Sparkles, BookMarked, Heart, Shield, Flame, Users, Star, Compass, Sun, Cloud, Zap, Globe, Trash2, Edit2, FolderHeart, DollarSign, Brain, Church } from 'lucide-react';
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exegesis`;

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
    id: 'vida_pessoal', label: 'Vida Pessoal', icon: Heart,
    themes: [
      { id: 'identidade_deus', title: 'Identidade em Deus', description: 'Quem somos em Cristo e nosso valor diante de Deus', keyVerses: ['2 Coríntios 5:17', 'Efésios 2:10', 'Gálatas 2:20'], subtopics: ['Nova criatura', 'Valor em Cristo', 'Imagem de Deus'] },
      { id: 'proposito_vida', title: 'Propósito de Vida', description: 'Descobrindo o plano de Deus para nossa existência', keyVerses: ['Jeremias 29:11', 'Efésios 2:10', 'Romanos 8:28'], subtopics: ['Chamado divino', 'Vocação', 'Missão pessoal'] },
      { id: 'autoconhecimento', title: 'Autoconhecimento', description: 'Conhecer a si mesmo à luz das Escrituras', keyVerses: ['Salmos 139:23-24', 'Jeremias 17:9', 'Provérbios 4:23'], subtopics: ['Exame interior', 'Motivações', 'Verdade sobre si'] },
      { id: 'dominio_proprio', title: 'Domínio Próprio', description: 'Controle e temperança como fruto do Espírito', keyVerses: ['Gálatas 5:22-23', 'Provérbios 25:28', '2 Timóteo 1:7'], subtopics: ['Temperança', 'Disciplina', 'Autocontrole'] },
      { id: 'disciplina', title: 'Disciplina', description: 'A disciplina como caminho de crescimento', keyVerses: ['Hebreus 12:11', '1 Coríntios 9:27', 'Provérbios 12:1'], subtopics: ['Disciplina espiritual', 'Hábitos santos', 'Perseverança'] },
      { id: 'sabedoria', title: 'Sabedoria', description: 'Buscando a sabedoria que vem do alto', keyVerses: ['Tiago 1:5', 'Provérbios 9:10', 'Colossenses 2:3'], subtopics: ['Temor do Senhor', 'Decisões sábias', 'Sabedoria prática'] },
      { id: 'tomada_decisoes', title: 'Tomada de Decisões', description: 'Como decidir segundo a vontade de Deus', keyVerses: ['Provérbios 3:5-6', 'Salmos 32:8', 'Tiago 1:5'], subtopics: ['Direção divina', 'Conselhos', 'Discernimento'] },
      { id: 'carater_cristao', title: 'Caráter Cristão', description: 'Formando o caráter à semelhança de Cristo', keyVerses: ['Romanos 5:3-4', 'Gálatas 5:22-23', '2 Pedro 1:5-7'], subtopics: ['Virtudes', 'Integridade', 'Transformação'] },
      { id: 'integridade', title: 'Integridade', description: 'Vivendo com coerência e honestidade', keyVerses: ['Provérbios 11:3', 'Salmos 15', 'Colossenses 3:23'], subtopics: ['Honestidade', 'Transparência', 'Coerência'] },
      { id: 'responsabilidade', title: 'Responsabilidade Pessoal', description: 'Assumir responsabilidade diante de Deus', keyVerses: ['Romanos 14:12', 'Gálatas 6:5', 'Mateus 25:14-30'], subtopics: ['Mordomia', 'Prestação de contas', 'Talentos'] },
      { id: 'perseveranca', title: 'Perseverança', description: 'Não desistir no caminho da fé', keyVerses: ['Hebreus 12:1-2', 'Tiago 1:12', 'Gálatas 6:9'], subtopics: ['Firmeza', 'Resistência', 'Recompensa'] },
      { id: 'resiliencia', title: 'Resiliência', description: 'Levantando-se após as quedas', keyVerses: ['Provérbios 24:16', 'Miquéias 7:8', '2 Coríntios 4:8-9'], subtopics: ['Superação', 'Força em Deus', 'Recomeço'] },
      { id: 'maturidade', title: 'Maturidade Espiritual', description: 'Crescendo para a estatura de Cristo', keyVerses: ['Efésios 4:13-15', 'Hebreus 5:14', '1 Coríntios 13:11'], subtopics: ['Crescimento', 'Alimento sólido', 'Discernimento'] },
      { id: 'humildade', title: 'Humildade', description: 'A virtude que Deus honra', keyVerses: ['Filipenses 2:5-8', 'Tiago 4:6', '1 Pedro 5:5-6'], subtopics: ['Exemplo de Cristo', 'Submissão', 'Serviço'] },
      { id: 'contentamento', title: 'Contentamento', description: 'Aprendendo a estar satisfeito em todas as situações', keyVerses: ['Filipenses 4:11-13', '1 Timóteo 6:6-8', 'Hebreus 13:5'], subtopics: ['Gratidão', 'Suficiência em Cristo', 'Desprendimento'] },
      { id: 'gratidao', title: 'Gratidão', description: 'Um coração agradecido em todas as coisas', keyVerses: ['1 Tessalonicenses 5:18', 'Colossenses 3:17', 'Salmos 100'], subtopics: ['Ação de graças', 'Reconhecimento', 'Louvor'] },
      { id: 'tempo_prioridades', title: 'Tempo e Prioridades', description: 'Administrando o tempo segundo Deus', keyVerses: ['Efésios 5:15-16', 'Salmos 90:12', 'Eclesiastes 3:1'], subtopics: ['Remir o tempo', 'Prioridades do Reino', 'Equilíbrio'] },
      { id: 'foco_direcao', title: 'Foco e Direção', description: 'Olhando para Jesus, o autor da fé', keyVerses: ['Hebreus 12:1-2', 'Filipenses 3:13-14', 'Provérbios 4:25'], subtopics: ['Alvo em Cristo', 'Determinação', 'Clareza'] },
      { id: 'vida_equilibrada', title: 'Vida Equilibrada', description: 'Equilíbrio entre o espiritual e o cotidiano', keyVerses: ['Eclesiastes 3:1', 'Lucas 2:52', 'Mateus 6:33'], subtopics: ['Corpo, alma, espírito', 'Descanso', 'Prioridades'] },
      { id: 'crescimento_pessoal', title: 'Crescimento Pessoal', description: 'Desenvolvendo-se em todas as áreas', keyVerses: ['2 Pedro 3:18', 'Provérbios 1:5', 'Lucas 2:52'], subtopics: ['Aprendizado', 'Mentoria', 'Transformação'] },
    ]
  },
  {
    id: 'vida_espiritual', label: 'Vida Espiritual', icon: Flame,
    themes: [
      { id: 'fe', title: 'Fé', description: 'A substância das coisas esperadas', keyVerses: ['Hebreus 11:1', 'Romanos 10:17', 'Marcos 11:22-24'], subtopics: ['Definição bíblica', 'Heróis da fé', 'Fé prática'] },
      { id: 'oracao', title: 'Oração', description: 'Desenvolvendo uma vida de oração profunda', keyVerses: ['Filipenses 4:6', '1 Tessalonicenses 5:17', 'Mateus 6:5-15'], subtopics: ['Tipos de oração', 'Oração eficaz', 'Pai Nosso'] },
      { id: 'jejum', title: 'Jejum', description: 'O poder do jejum bíblico', keyVerses: ['Mateus 6:16-18', 'Isaías 58:6-7', 'Atos 13:2-3'], subtopics: ['Propósito', 'Tipos de jejum', 'Jejum coletivo'] },
      { id: 'leitura_palavra', title: 'Leitura da Palavra', description: 'Alimentando-se das Escrituras', keyVerses: ['Salmos 119:105', 'Josué 1:8', '2 Timóteo 3:16-17'], subtopics: ['Meditação', 'Estudo bíblico', 'Memorização'] },
      { id: 'intimidade_deus', title: 'Intimidade com Deus', description: 'Aproximando-se do Pai celestial', keyVerses: ['Tiago 4:8', 'Salmos 27:4', 'Jeremias 33:3'], subtopics: ['Buscar a Deus', 'Comunhão', 'Adoração'] },
      { id: 'presenca_deus', title: 'Presença de Deus', description: 'Viver na consciência da presença divina', keyVerses: ['Salmos 16:11', 'Êxodo 33:14-15', 'Mateus 28:20'], subtopics: ['Manifestação', 'Glória', 'Habitar na presença'] },
      { id: 'santificacao', title: 'Santificação', description: 'Ser separado para Deus', keyVerses: ['1 Tessalonicenses 4:3', '1 Pedro 1:15-16', 'Romanos 12:1-2'], subtopics: ['Processo', 'Renúncia', 'Consagração'] },
      { id: 'arrependimento', title: 'Arrependimento', description: 'Mudança de mente e direção rumo a Deus', keyVerses: ['Atos 3:19', '2 Coríntios 7:10', 'Lucas 15:7'], subtopics: ['Convicção', 'Confissão', 'Restauração'] },
      { id: 'novo_nascimento', title: 'Novo Nascimento', description: 'Nascer de novo pelo Espírito', keyVerses: ['João 3:3-7', '2 Coríntios 5:17', 'Tito 3:5'], subtopics: ['Regeneração', 'Nova vida', 'Transformação'] },
      { id: 'batismo', title: 'Batismo', description: 'O significado e a importância do batismo', keyVerses: ['Mateus 28:19', 'Romanos 6:3-4', 'Atos 2:38'], subtopics: ['Significado', 'Obediência', 'Identificação com Cristo'] },
      { id: 'espirito_santo', title: 'Espírito Santo', description: 'A pessoa e a obra do Espírito Santo', keyVerses: ['João 14:16-17', 'Atos 1:8', 'Romanos 8:26-27'], subtopics: ['Consolador', 'Poder', 'Guia'] },
      { id: 'dons_espirituais', title: 'Dons Espirituais', description: 'Descobrindo e usando os dons do Espírito', keyVerses: ['1 Coríntios 12:4-11', 'Romanos 12:6-8', 'Efésios 4:11-13'], subtopics: ['Diversidade', 'Propósito', 'Edificação'] },
      { id: 'fruto_espirito', title: 'Fruto do Espírito', description: 'As evidências da ação do Espírito', keyVerses: ['Gálatas 5:22-23', 'João 15:1-8', 'Romanos 8:5-6'], subtopics: ['Amor e alegria', 'Paz e paciência', 'Domínio próprio'] },
      { id: 'obediencia', title: 'Obediência a Deus', description: 'Obedecer é melhor do que sacrificar', keyVerses: ['1 Samuel 15:22', 'João 14:15', 'Atos 5:29'], subtopics: ['Submissão', 'Frutos', 'Exemplos bíblicos'] },
      { id: 'dependencia_deus', title: 'Dependência de Deus', description: 'Sem Ele nada podemos fazer', keyVerses: ['João 15:5', 'Provérbios 3:5-6', 'Filipenses 4:13'], subtopics: ['Confiança total', 'Entrega', 'Suficiência divina'] },
      { id: 'adoracao', title: 'Vida de Adoração', description: 'Adorar em espírito e verdade', keyVerses: ['João 4:23-24', 'Salmos 95:6', 'Romanos 12:1'], subtopics: ['Adoração genuína', 'Estilo de vida', 'Louvor'] },
      { id: 'temor_senhor', title: 'Temor do Senhor', description: 'O início da sabedoria', keyVerses: ['Provérbios 9:10', 'Salmos 111:10', 'Eclesiastes 12:13'], subtopics: ['Reverência', 'Sabedoria', 'Obediência'] },
      { id: 'guerra_espiritual', title: 'Guerra Espiritual', description: 'A batalha invisível e nossas armas', keyVerses: ['Efésios 6:10-18', '2 Coríntios 10:4-5', 'Tiago 4:7'], subtopics: ['Armadura de Deus', 'Estratégias do inimigo', 'Vitória em Cristo'] },
      { id: 'autoridade_espiritual', title: 'Autoridade Espiritual', description: 'O poder delegado por Cristo', keyVerses: ['Lucas 10:19', 'Marcos 16:17-18', 'Mateus 28:18'], subtopics: ['Autoridade do crente', 'Nome de Jesus', 'Poder'] },
      { id: 'perseveranca_fe', title: 'Perseverança na Fé', description: 'Correr com paciência a carreira', keyVerses: ['Hebreus 12:1-2', 'Apocalipse 2:10', '2 Timóteo 4:7'], subtopics: ['Firmeza', 'Não desistir', 'Galardão'] },
    ]
  },
  {
    id: 'vida_financeira', label: 'Vida Financeira', icon: DollarSign,
    themes: [
      { id: 'mordomia', title: 'Mordomia Cristã', description: 'Administrar os recursos de Deus com fidelidade', keyVerses: ['Mateus 25:14-30', '1 Coríntios 4:2', 'Lucas 16:10-12'], subtopics: ['Fidelidade', 'Prestação de contas', 'Multiplicação'] },
      { id: 'dizimos', title: 'Dízimos', description: 'O princípio bíblico da devolução', keyVerses: ['Malaquias 3:10', 'Levítico 27:30', 'Mateus 23:23'], subtopics: ['Obediência', 'Bênçãos', 'Fidelidade'] },
      { id: 'ofertas', title: 'Ofertas', description: 'Dar com alegria e generosidade', keyVerses: ['2 Coríntios 9:7', 'Atos 20:35', 'Lucas 6:38'], subtopics: ['Alegria', 'Sacrifício', 'Semeadura'] },
      { id: 'generosidade', title: 'Generosidade', description: 'Um coração aberto para dar', keyVerses: ['Provérbios 11:25', '2 Coríntios 9:6-8', 'Atos 20:35'], subtopics: ['Dar sem esperar', 'Bênção de dar', 'Exemplo de Cristo'] },
      { id: 'prosperidade_biblica', title: 'Prosperidade Bíblica', description: 'O que a Bíblia ensina sobre prosperidade', keyVerses: ['3 João 1:2', 'Josué 1:8', 'Salmos 1:3'], subtopics: ['Prosperidade verdadeira', 'Prioridade do Reino', 'Equilíbrio'] },
      { id: 'contentamento_financeiro', title: 'Contentamento Financeiro', description: 'Estar satisfeito com o que se tem', keyVerses: ['1 Timóteo 6:6-10', 'Filipenses 4:11-13', 'Hebreus 13:5'], subtopics: ['Gratidão', 'Evitar ganância', 'Suficiência'] },
      { id: 'administracao_recursos', title: 'Administração de Recursos', description: 'Gerenciar com sabedoria', keyVerses: ['Provérbios 21:20', 'Lucas 14:28-30', 'Provérbios 27:23-24'], subtopics: ['Planejamento', 'Poupança', 'Investimento'] },
      { id: 'planejamento_financeiro', title: 'Planejamento Financeiro', description: 'Planejar com sabedoria divina', keyVerses: ['Provérbios 21:5', 'Lucas 14:28', 'Provérbios 24:27'], subtopics: ['Orçamento', 'Metas', 'Provisão'] },
      { id: 'evitar_dividas', title: 'Evitar Dívidas', description: 'Liberdade financeira segundo a Bíblia', keyVerses: ['Romanos 13:8', 'Provérbios 22:7', 'Deuteronômio 28:12'], subtopics: ['Prudência', 'Liberdade', 'Sabedoria'] },
      { id: 'honestidade_negocios', title: 'Honestidade nos Negócios', description: 'Integridade no trabalho', keyVerses: ['Provérbios 11:1', 'Provérbios 16:11', 'Levítico 19:35-36'], subtopics: ['Balança justa', 'Ética', 'Testemunho'] },
      { id: 'trabalho_digno', title: 'Trabalho Digno', description: 'Trabalhar como para o Senhor', keyVerses: ['Colossenses 3:23', 'Provérbios 14:23', '2 Tessalonicenses 3:10'], subtopics: ['Diligência', 'Excelência', 'Propósito'] },
      { id: 'riquezas_perigos', title: 'Riquezas e Perigos', description: 'Os perigos do amor ao dinheiro', keyVerses: ['1 Timóteo 6:10', 'Mateus 6:24', 'Provérbios 23:4-5'], subtopics: ['Avareza', 'Idolatria', 'Prioridades'] },
      { id: 'prioridade_reino', title: 'Prioridade do Reino', description: 'Buscai primeiro o Reino de Deus', keyVerses: ['Mateus 6:33', 'Lucas 12:31', 'Colossenses 3:1-2'], subtopics: ['Valores eternos', 'Investimento celestial', 'Fé prática'] },
      { id: 'fidelidade_financeira', title: 'Fidelidade Financeira', description: 'Fiel no pouco, confiado no muito', keyVerses: ['Lucas 16:10', 'Mateus 25:21', 'Lucas 19:17'], subtopics: ['Fidelidade', 'Confiança', 'Crescimento'] },
      { id: 'semear_colher', title: 'Semear e Colher', description: 'O princípio da semeadura', keyVerses: ['Gálatas 6:7-9', '2 Coríntios 9:6', 'Provérbios 11:18'], subtopics: ['Lei da semeadura', 'Paciência', 'Colheita'] },
      { id: 'ganancia_gratidao', title: 'Ganância vs Gratidão', description: 'Substituir a ganância pela gratidão', keyVerses: ['Lucas 12:15', 'Hebreus 13:5', '1 Timóteo 6:6'], subtopics: ['Contentamento', 'Perigo da ganância', 'Coração grato'] },
      { id: 'justica_economica', title: 'Justiça Econômica', description: 'A perspectiva bíblica de justiça', keyVerses: ['Provérbios 31:8-9', 'Amós 5:24', 'Isaías 1:17'], subtopics: ['Justiça', 'Compaixão', 'Equidade'] },
      { id: 'ajudar_necessitados', title: 'Ajudar os Necessitados', description: 'Cuidar dos pobres', keyVerses: ['Provérbios 19:17', 'Mateus 25:35-40', 'Tiago 2:15-17'], subtopics: ['Compaixão', 'Ação social', 'Misericórdia'] },
      { id: 'provisao_deus', title: 'Provisão de Deus', description: 'Deus supre todas as necessidades', keyVerses: ['Filipenses 4:19', 'Mateus 6:26-30', 'Salmos 37:25'], subtopics: ['Fidelidade de Deus', 'Confiança', 'Cuidado divino'] },
      { id: 'confianca_financas', title: 'Confiança em Deus nas Finanças', description: 'Descansar em Deus para provisão', keyVerses: ['Provérbios 3:9-10', 'Salmos 37:25', 'Mateus 6:31-33'], subtopics: ['Entrega', 'Paz', 'Provisão'] },
    ]
  },
  {
    id: 'familia', label: 'Família', icon: Users,
    themes: [
      { id: 'casamento', title: 'Casamento', description: 'A aliança sagrada entre homem e mulher', keyVerses: ['Gênesis 2:24', 'Efésios 5:25-33', 'Hebreus 13:4'], subtopics: ['Aliança', 'Compromisso', 'Fidelidade'] },
      { id: 'amor_conjugal', title: 'Amor Conjugal', description: 'O amor sacrificial no casamento', keyVerses: ['Efésios 5:25', '1 Coríntios 13:4-7', 'Cânticos 8:6-7'], subtopics: ['Sacrifício', 'Respeito', 'Intimidade'] },
      { id: 'respeito_lar', title: 'Respeito no Lar', description: 'Cultivar respeito mútuo', keyVerses: ['Efésios 5:33', '1 Pedro 3:7', 'Colossenses 3:19'], subtopics: ['Honra', 'Comunicação', 'Valorização'] },
      { id: 'papel_marido', title: 'Papel do Marido', description: 'O marido como líder espiritual', keyVerses: ['Efésios 5:25-28', '1 Pedro 3:7', 'Colossenses 3:19'], subtopics: ['Liderança servidora', 'Amor sacrificial', 'Provisão'] },
      { id: 'papel_esposa', title: 'Papel da Esposa', description: 'A mulher virtuosa', keyVerses: ['Provérbios 31:10-31', 'Efésios 5:22-24', '1 Pedro 3:1-4'], subtopics: ['Sabedoria', 'Força', 'Virtude'] },
      { id: 'criacao_filhos', title: 'Criação de Filhos', description: 'Instruir os filhos no caminho do Senhor', keyVerses: ['Provérbios 22:6', 'Efésios 6:4', 'Deuteronômio 6:6-7'], subtopics: ['Disciplina com amor', 'Ensino', 'Exemplo'] },
      { id: 'educacao_biblica', title: 'Educação Bíblica dos Filhos', description: 'Ensinar a Palavra às novas gerações', keyVerses: ['Deuteronômio 6:6-9', 'Salmos 78:1-7', '2 Timóteo 3:14-15'], subtopics: ['Ensino diário', 'Devocionais', 'Transmissão da fé'] },
      { id: 'honrar_pais', title: 'Honrar Pai e Mãe', description: 'O mandamento com promessa', keyVerses: ['Êxodo 20:12', 'Efésios 6:1-3', 'Provérbios 23:22'], subtopics: ['Respeito', 'Gratidão', 'Cuidado'] },
      { id: 'unidade_familiar', title: 'Unidade Familiar', description: 'Família unida em Deus', keyVerses: ['Salmos 133:1', 'Josué 24:15', 'Atos 16:31'], subtopics: ['Comunhão', 'Oração em família', 'Propósito'] },
      { id: 'perdao_familia', title: 'Perdão na Família', description: 'Praticar o perdão entre familiares', keyVerses: ['Efésios 4:32', 'Colossenses 3:13', 'Mateus 18:21-22'], subtopics: ['Reconciliação', 'Misericórdia', 'Restauração'] },
      { id: 'comunicacao_lar', title: 'Comunicação no Lar', description: 'Falar a verdade com amor', keyVerses: ['Efésios 4:15', 'Efésios 4:29', 'Provérbios 15:1'], subtopics: ['Diálogo', 'Escuta', 'Palavras edificantes'] },
      { id: 'conflitos_familiares', title: 'Conflitos Familiares', description: 'Resolver conflitos de forma bíblica', keyVerses: ['Mateus 18:15', 'Provérbios 15:1', 'Romanos 12:18'], subtopics: ['Resolução', 'Paciência', 'Graça'] },
      { id: 'reconciliacao', title: 'Reconciliação', description: 'Restaurando relacionamentos quebrados', keyVerses: ['2 Coríntios 5:18-19', 'Mateus 5:23-24', 'Romanos 12:18'], subtopics: ['Iniciativa', 'Humildade', 'Restauração'] },
      { id: 'alianca_familiar', title: 'Aliança Familiar', description: 'Compromisso da família com Deus', keyVerses: ['Josué 24:15', 'Gênesis 17:7', 'Atos 16:31'], subtopics: ['Compromisso', 'Fidelidade', 'Legado'] },
      { id: 'lideranca_lar', title: 'Liderança Espiritual no Lar', description: 'Liderar a família espiritualmente', keyVerses: ['Josué 24:15', 'Efésios 5:25', '1 Timóteo 3:4-5'], subtopics: ['Exemplo', 'Oração', 'Ensino'] },
      { id: 'protecao_familia', title: 'Proteção da Família', description: 'Proteger o lar espiritual e emocionalmente', keyVerses: ['Salmos 127:1', 'Salmos 91', 'Provérbios 14:26'], subtopics: ['Cobertura', 'Segurança', 'Vigilância'] },
      { id: 'heranca_espiritual', title: 'Herança Espiritual', description: 'Deixar um legado de fé', keyVerses: ['Salmos 78:4-7', 'Provérbios 13:22', '2 Timóteo 1:5'], subtopics: ['Legado', 'Gerações', 'Influência'] },
      { id: 'relacao_irmaos', title: 'Relacionamento entre Irmãos', description: 'Fraternidade e amor', keyVerses: ['Salmos 133:1', 'Gênesis 4:9', 'Provérbios 17:17'], subtopics: ['Convivência', 'Respeito', 'Apoio'] },
      { id: 'familia_igreja', title: 'Família e Igreja', description: 'A família como célula da igreja', keyVerses: ['Atos 2:46-47', 'Romanos 16:5', 'Filemom 1:2'], subtopics: ['Comunhão', 'Serviço juntos', 'Crescimento'] },
      { id: 'cura_familiar', title: 'Cura Familiar', description: 'Restauração nos relacionamentos familiares', keyVerses: ['Jeremias 30:17', 'Malaquias 4:6', 'Isaías 61:1-3'], subtopics: ['Cura emocional', 'Restauração', 'Perdão'] },
    ]
  },
  {
    id: 'vida_emocional', label: 'Vida Emocional', icon: Brain,
    themes: [
      { id: 'ansiedade_em', title: 'Ansiedade', description: 'Lançando sobre Ele toda a ansiedade', keyVerses: ['Filipenses 4:6-7', '1 Pedro 5:7', 'Mateus 6:25-34'], subtopics: ['Confiança', 'Entrega', 'Paz de Deus'] },
      { id: 'medo', title: 'Medo', description: 'Não temas, porque Eu sou contigo', keyVerses: ['Isaías 41:10', '2 Timóteo 1:7', 'Salmos 23:4'], subtopics: ['Coragem em Deus', 'Fé vs medo', 'Segurança'] },
      { id: 'depressao', title: 'Depressão', description: 'Esperança e consolo nas trevas', keyVerses: ['Salmos 42:11', 'Isaías 61:3', 'Salmos 34:18'], subtopics: ['Consolo', 'Esperança', 'Ajuda'] },
      { id: 'paz_interior', title: 'Paz Interior', description: 'A paz que excede todo entendimento', keyVerses: ['Filipenses 4:7', 'João 14:27', 'Isaías 26:3'], subtopics: ['Paz de Cristo', 'Descanso', 'Serenidade'] },
      { id: 'alegria', title: 'Alegria', description: 'A alegria do Senhor é a nossa força', keyVerses: ['Neemias 8:10', 'Filipenses 4:4', 'Salmos 16:11'], subtopics: ['Alegria genuína', 'Em meio à dor', 'Fonte da alegria'] },
      { id: 'esperanca', title: 'Esperança', description: 'Âncora firme para a alma', keyVerses: ['Hebreus 6:19', 'Romanos 15:13', 'Jeremias 29:11'], subtopics: ['Esperança eterna', 'Confiança no futuro', 'Promessas'] },
      { id: 'cura_emocional', title: 'Cura Emocional', description: 'Deus sara os quebrantados', keyVerses: ['Salmos 147:3', 'Isaías 61:1', 'Salmos 34:18'], subtopics: ['Restauração', 'Libertação', 'Processo de cura'] },
      { id: 'perdao_em', title: 'Perdão', description: 'Libertar-se através do perdão', keyVerses: ['Efésios 4:32', 'Mateus 6:14-15', 'Marcos 11:25'], subtopics: ['Liberdade', 'Decisão', 'Cura'] },
      { id: 'magoas', title: 'Mágoas', description: 'Tratando as feridas do coração', keyVerses: ['Hebreus 12:15', 'Efésios 4:31-32', 'Colossenses 3:13'], subtopics: ['Raiz de amargura', 'Libertação', 'Renovação'] },
      { id: 'raiva', title: 'Raiva', description: 'Irai-vos e não pequeis', keyVerses: ['Efésios 4:26', 'Provérbios 14:29', 'Tiago 1:19-20'], subtopics: ['Controle', 'Expressão saudável', 'Domínio próprio'] },
      { id: 'controle_emocoes', title: 'Controle das Emoções', description: 'Domínio próprio como fruto do Espírito', keyVerses: ['Gálatas 5:22-23', 'Provérbios 25:28', 'Provérbios 16:32'], subtopics: ['Temperança', 'Equilíbrio', 'Maturidade'] },
      { id: 'amor_proprio', title: 'Amor Próprio Saudável', description: 'Amar como Deus nos ama', keyVerses: ['Mateus 22:39', 'Efésios 2:10', 'Salmos 139:14'], subtopics: ['Autoaceitação', 'Identidade', 'Valor'] },
      { id: 'rejeicao', title: 'Rejeição', description: 'O amor de Deus que acolhe', keyVerses: ['Lucas 19:10', '1 Coríntios 1:27-29', 'Isaías 53:3'], subtopics: ['Aceitação em Cristo', 'Cura', 'Pertencimento'] },
      { id: 'solidao', title: 'Solidão', description: 'Nunca estamos sozinhos com Deus', keyVerses: ['Salmos 23', 'Hebreus 13:5', 'Mateus 28:20'], subtopics: ['Presença de Deus', 'Comunhão', 'Companhia divina'] },
      { id: 'confianca_em', title: 'Confiança', description: 'Confiar de todo o coração', keyVerses: ['Provérbios 3:5-6', 'Salmos 56:3', 'Isaías 26:4'], subtopics: ['Fé', 'Entrega', 'Segurança'] },
      { id: 'seguranca_deus', title: 'Segurança em Deus', description: 'Nossa fortaleza e refúgio', keyVerses: ['Salmos 46:1', 'Salmos 91', 'Provérbios 18:10'], subtopics: ['Refúgio', 'Proteção', 'Firmeza'] },
      { id: 'pensamentos', title: 'Pensamentos', description: 'Levando cativo todo pensamento', keyVerses: ['2 Coríntios 10:5', 'Filipenses 4:8', 'Romanos 12:2'], subtopics: ['Renovação da mente', 'Filtro bíblico', 'Meditação'] },
      { id: 'renovacao_mente', title: 'Renovação da Mente', description: 'Transformação pela renovação do entendimento', keyVerses: ['Romanos 12:2', 'Efésios 4:23', 'Colossenses 3:10'], subtopics: ['Transformação', 'Novos padrões', 'Mente de Cristo'] },
      { id: 'descanso', title: 'Descanso', description: 'Encontrando repouso em Deus', keyVerses: ['Mateus 11:28-30', 'Salmos 23:2', 'Êxodo 33:14'], subtopics: ['Repouso', 'Cansaço', 'Forças renovadas'] },
      { id: 'equilibrio_emocional', title: 'Equilíbrio Emocional', description: 'Estabilidade emocional pela fé', keyVerses: ['Filipenses 4:11-13', 'Isaías 26:3', 'Salmos 112:7'], subtopics: ['Estabilidade', 'Constância', 'Firmeza'] },
    ]
  },
  {
    id: 'vida_social', label: 'Vida Social e Relacional', icon: Compass,
    themes: [
      { id: 'amor_proximo', title: 'Amor ao Próximo', description: 'O mandamento do amor prático', keyVerses: ['Mateus 22:39', 'João 13:34-35', '1 Coríntios 13'], subtopics: ['Amor incondicional', 'Servir', 'Unidade'] },
      { id: 'perdao_proximo', title: 'Perdão ao Próximo', description: 'Perdoar como fomos perdoados', keyVerses: ['Mateus 18:21-22', 'Efésios 4:32', 'Colossenses 3:13'], subtopics: ['Setenta vezes sete', 'Graça', 'Libertação'] },
      { id: 'relacionamentos_saudaveis', title: 'Relacionamentos Saudáveis', description: 'Construindo relações à maneira de Deus', keyVerses: ['Provérbios 27:17', 'Eclesiastes 4:9-12', 'Romanos 12:10'], subtopics: ['Reciprocidade', 'Edificação', 'Limites'] },
      { id: 'amizades', title: 'Amizades', description: 'O valor da amizade verdadeira', keyVerses: ['Provérbios 17:17', 'Provérbios 18:24', 'João 15:13-15'], subtopics: ['Lealdade', 'Fidelidade', 'Companheirismo'] },
      { id: 'influencia', title: 'Influência', description: 'Ser influência positiva', keyVerses: ['Mateus 5:13-16', 'Filipenses 2:15', '1 Timóteo 4:12'], subtopics: ['Exemplo', 'Testemunho', 'Impacto'] },
      { id: 'testemunho', title: 'Testemunho Cristão', description: 'Viver o Evangelho no dia a dia', keyVerses: ['Mateus 5:16', '1 Pedro 3:15', 'Atos 1:8'], subtopics: ['Vida exemplar', 'Pregação viva', 'Coerência'] },
      { id: 'evangelismo', title: 'Evangelismo', description: 'Compartilhar as boas novas', keyVerses: ['Marcos 16:15', 'Romanos 10:14-15', 'Mateus 28:19-20'], subtopics: ['Grande Comissão', 'Métodos', 'Urgência'] },
      { id: 'justica', title: 'Justiça', description: 'Praticar a justiça como Deus ordena', keyVerses: ['Miquéias 6:8', 'Amós 5:24', 'Isaías 1:17'], subtopics: ['Justiça social', 'Defender oprimidos', 'Retidão'] },
      { id: 'misericordia', title: 'Misericórdia', description: 'Bem-aventurados os misericordiosos', keyVerses: ['Mateus 5:7', 'Lucas 6:36', 'Miquéias 6:8'], subtopics: ['Compaixão', 'Empatia', 'Ação'] },
      { id: 'servico', title: 'Serviço ao Próximo', description: 'Servir como Cristo serviu', keyVerses: ['Marcos 10:45', 'Gálatas 5:13', 'João 13:14-15'], subtopics: ['Servir com amor', 'Humildade', 'Exemplo de Cristo'] },
      { id: 'lideranca', title: 'Liderança', description: 'Liderar com coração de servo', keyVerses: ['Marcos 10:42-45', '1 Pedro 5:2-3', 'Josué 1:9'], subtopics: ['Liderança servidora', 'Responsabilidade', 'Influência'] },
      { id: 'autoridade_social', title: 'Autoridade', description: 'Respeito às autoridades', keyVerses: ['Romanos 13:1-7', '1 Pedro 2:13-17', 'Tito 3:1'], subtopics: ['Submissão', 'Respeito', 'Obediência'] },
      { id: 'submissao', title: 'Submissão', description: 'Submeter-se uns aos outros em Deus', keyVerses: ['Efésios 5:21', 'Hebreus 13:17', '1 Pedro 5:5'], subtopics: ['Humildade', 'Ordem', 'Confiança'] },
      { id: 'convivencia', title: 'Convivência em Comunidade', description: 'Viver em comunhão no corpo de Cristo', keyVerses: ['Atos 2:42-47', 'Hebreus 10:25', 'Romanos 12:10'], subtopics: ['Comunhão', 'Partilha', 'Unidade'] },
      { id: 'respeito_social', title: 'Respeito', description: 'Honrar a todos como Cristo honrou', keyVerses: ['1 Pedro 2:17', 'Romanos 12:10', 'Filipenses 2:3'], subtopics: ['Honra', 'Dignidade', 'Valorização'] },
      { id: 'unidade', title: 'Unidade', description: 'Que todos sejam um', keyVerses: ['João 17:21', 'Efésios 4:3', 'Salmos 133:1'], subtopics: ['Um corpo', 'Harmonia', 'Cooperação'] },
      { id: 'julgamento', title: 'Julgamento vs Discernimento', description: 'Discernir sem julgar injustamente', keyVerses: ['Mateus 7:1-5', 'João 7:24', '1 Coríntios 2:15'], subtopics: ['Discernimento', 'Misericórdia', 'Sabedoria'] },
      { id: 'humildade_relacoes', title: 'Humildade nas Relações', description: 'Considerar os outros superiores', keyVerses: ['Filipenses 2:3-4', 'Romanos 12:3', '1 Pedro 5:5'], subtopics: ['Altruísmo', 'Servir', 'Desapego'] },
      { id: 'fazer_bem', title: 'Fazer o Bem', description: 'Não nos cansemos de fazer o bem', keyVerses: ['Gálatas 6:9-10', 'Tiago 4:17', 'Hebreus 13:16'], subtopics: ['Boas obras', 'Generosidade', 'Impacto'] },
      { id: 'impacto_sociedade', title: 'Impacto na Sociedade', description: 'Transformando o mundo ao redor', keyVerses: ['Mateus 5:13-16', 'Jeremias 29:7', 'Provérbios 11:11'], subtopics: ['Sal e luz', 'Influência', 'Transformação'] },
    ]
  },
  {
    id: 'salvacao_graca', label: 'Salvação e Graça', icon: Star,
    themes: [
      { id: 'salvacao', title: 'Salvação', description: 'O plano redentor de Deus', keyVerses: ['João 3:16', 'Efésios 2:8-9', 'Romanos 10:9-10'], subtopics: ['Graça', 'Fé', 'Nova vida'] },
      { id: 'graca', title: 'Graça de Deus', description: 'O favor imerecido de Deus', keyVerses: ['Efésios 2:8-9', 'Romanos 3:24', '2 Coríntios 12:9'], subtopics: ['Graça vs Lei', 'Graça suficiente', 'Viver pela graça'] },
    ]
  },
  {
    id: 'pecado_luta', label: 'Pecado e Luta Espiritual', icon: Zap,
    themes: [
      { id: 'luxuria', title: 'Luxúria', description: 'Advertências e caminho de libertação', keyVerses: ['Romanos 13:13-14', 'Mateus 5:28', 'Tiago 4:8'], subtopics: ['Advertências', 'Consequências', 'Libertação'] },
      { id: 'mentira', title: 'Mentiras', description: 'Viver na verdade', keyVerses: ['João 8:44', 'Efésios 4:25', 'Provérbios 12:22'], subtopics: ['Consequências', 'Verdade', 'Integridade'] },
      { id: 'murmuracao', title: 'Murmuração', description: 'Os perigos da reclamação', keyVerses: ['Tiago 4:11', 'Filipenses 2:14', 'Números 11:1'], subtopics: ['Gratidão', 'Contentamento', 'Fé'] },
      { id: 'rejeicao_luta', title: 'Rejeição', description: 'O amor de Deus que acolhe todos', keyVerses: ['Lucas 19:10', '1 Coríntios 1:27-29', 'Isaías 53:3'], subtopics: ['Aceitação', 'Valor em Cristo', 'Pertencimento'] },
    ]
  },
  {
    id: 'sociedade_cristologia', label: 'Sociedade e Cristologia', icon: Globe,
    themes: [
      { id: 'aborto', title: 'Aborto', description: 'A sacralidade da vida humana e a perspectiva bíblica sobre o aborto', keyVerses: ['Salmos 139:13-16', 'Jeremias 1:5', 'Êxodo 20:13'], subtopics: ['Vida como dom de Deus', 'Ética cristã', 'Compaixão', 'Cristo e a dignidade humana'] },
      { id: 'racismo', title: 'Racismo', description: 'A igualdade racial diante de Deus e a resposta cristã ao racismo', keyVerses: ['Gálatas 3:28', 'Atos 17:26', 'Gênesis 1:27'], subtopics: ['Imagem de Deus', 'Unidade em Cristo', 'Justiça racial', 'Amor ao próximo'] },
      { id: 'sexismo', title: 'Sexismo e Dignidade', description: 'Igualdade de valor entre homens e mulheres em Cristo', keyVerses: ['Gálatas 3:28', 'Gênesis 1:27', 'Provérbios 31:10-31'], subtopics: ['Dignidade feminina', 'Complementaridade', 'Valor igualitário', 'Mulheres na Bíblia'] },
      { id: 'fome_pobreza', title: 'Fome e Pobreza', description: 'Cristo como Pão da Vida e o chamado à justiça social', keyVerses: ['João 6:35', 'Mateus 25:35-40', 'Provérbios 19:17', 'Isaías 58:6-7'], subtopics: ['Pão da Vida', 'Compaixão ativa', 'Mordomia', 'Justiça social'] },
      { id: 'doencas_sofrimento', title: 'Doenças e Sofrimento', description: 'Cristo como o Grande Médico e o sentido do sofrimento', keyVerses: ['Isaías 53:4-5', 'Mateus 9:35', '2 Coríntios 12:9', 'Romanos 8:28'], subtopics: ['Cura divina', 'Propósito na dor', 'Esperança', 'Cristo sofredor'] },
      { id: 'morte_luto', title: 'Morte e Luto', description: 'Cristo como ressurreição e vida — a resposta cristã à morte', keyVerses: ['João 11:25-26', '1 Coríntios 15:55-57', 'Apocalipse 21:4'], subtopics: ['Ressurreição', 'Esperança eterna', 'Consolo', 'Vitória sobre a morte'] },
      { id: 'guerras_conflitos', title: 'Guerras e Conflitos', description: 'Cristo como Príncipe da Paz em meio aos conflitos humanos', keyVerses: ['Isaías 9:6', 'Mateus 5:9', 'Romanos 12:18', 'João 16:33'], subtopics: ['Paz de Cristo', 'Pacificadores', 'Justiça', 'Esperança em meio ao caos'] },
      { id: 'conflitos_internos', title: 'Conflitos Internos', description: 'A batalha interior e a paz que só Cristo oferece', keyVerses: ['Romanos 7:15-25', 'Gálatas 5:17', 'Filipenses 4:6-7'], subtopics: ['Carne vs Espírito', 'Libertação', 'Renovação da mente', 'Identidade em Cristo'] },
      { id: 'conflitos_financeiros', title: 'Conflitos Financeiros', description: 'Ansiedade financeira e a provisão de Deus em Cristo', keyVerses: ['Mateus 6:25-34', 'Filipenses 4:19', '1 Timóteo 6:6-10'], subtopics: ['Provisão divina', 'Contentamento', 'Mordomia', 'Liberdade financeira'] },
      { id: 'violencia', title: 'Violência', description: 'A não-violência de Cristo e a transformação pela graça', keyVerses: ['Mateus 5:38-44', 'Romanos 12:17-21', 'João 18:36'], subtopics: ['Amor aos inimigos', 'Justiça restaurativa', 'Graça transformadora'] },
      { id: 'depressao_suicidio', title: 'Depressão e Suicídio', description: 'Cristo como esperança na escuridão mais profunda', keyVerses: ['Salmos 34:18', 'Salmos 42:11', 'Isaías 41:10', 'Mateus 11:28'], subtopics: ['Esperança', 'Acolhimento', 'Saúde mental', 'Valor da vida'] },
      { id: 'dependencia_quimica', title: 'Dependência Química', description: 'Libertação em Cristo das cadeias do vício', keyVerses: ['João 8:36', 'Gálatas 5:1', '1 Coríntios 6:19-20', 'Romanos 6:6-7'], subtopics: ['Liberdade em Cristo', 'Restauração', 'Corpo como templo', 'Nova vida'] },
      { id: 'injustica_social', title: 'Injustiça Social', description: 'O Deus que faz justiça e chama o povo à ação', keyVerses: ['Amós 5:24', 'Miquéias 6:8', 'Isaías 1:17', 'Lucas 4:18-19'], subtopics: ['Profetas sociais', 'Justiça de Deus', 'Advocacy cristã', 'Missão integral'] },
      { id: 'solidao_isolamento', title: 'Solidão e Isolamento', description: 'Cristo como Emanuel — Deus conosco na solidão', keyVerses: ['Mateus 28:20', 'Salmos 23:4', 'Hebreus 13:5', 'Isaías 43:2'], subtopics: ['Presença de Deus', 'Comunidade', 'Pertencimento', 'Relacionamentos'] },
      { id: 'imigracao_refugiados', title: 'Imigração e Refugiados', description: 'O acolhimento do estrangeiro na perspectiva bíblica', keyVerses: ['Levítico 19:33-34', 'Mateus 25:35', 'Hebreus 13:2', 'Deuteronômio 10:18-19'], subtopics: ['Hospitalidade', 'Acolhimento', 'Dignidade', 'Jesus como refugiado'] },
      { id: 'meio_ambiente', title: 'Meio Ambiente', description: 'Mordomia da criação e responsabilidade ecológica cristã', keyVerses: ['Gênesis 1:28', 'Gênesis 2:15', 'Salmos 24:1', 'Romanos 8:19-22'], subtopics: ['Criação de Deus', 'Mordomia', 'Cuidado', 'Nova criação'] },
      { id: 'tecnologia_etica', title: 'Tecnologia e Ética', description: 'Viver com sabedoria na era digital à luz da Bíblia', keyVerses: ['Efésios 5:15-16', 'Filipenses 4:8', '1 Coríntios 10:23'], subtopics: ['Redes sociais', 'Discernimento', 'Tempo e prioridades', 'Pureza digital'] },
      { id: 'identidade_genero', title: 'Identidade e Gênero', description: 'A perspectiva bíblica sobre identidade humana em Cristo', keyVerses: ['Gênesis 1:27', 'Salmos 139:14', '2 Coríntios 5:17', 'Efésios 2:10'], subtopics: ['Criação divina', 'Identidade em Cristo', 'Dignidade', 'Amor e verdade'] },
      { id: 'corrupção', title: 'Corrupção', description: 'Integridade e justiça em meio à corrupção sistêmica', keyVerses: ['Provérbios 11:1-3', 'Miquéias 6:8', 'Romanos 13:1-7', 'Isaías 10:1-2'], subtopics: ['Integridade', 'Justiça', 'Testemunho', 'Profetismo'] },
      { id: 'desigualdade', title: 'Desigualdade', description: 'A visão do Reino de Deus sobre igualdade e dignidade', keyVerses: ['Atos 2:44-45', 'Tiago 2:1-9', 'Lucas 6:20-26', 'Gálatas 3:28'], subtopics: ['Comunidade do Reino', 'Partilha', 'Justiça divina', 'Solidariedade'] },
      { id: 'perdao_falta_perdao', title: 'Perdão e Falta de Perdão', description: 'As consequências devastadoras da falta de perdão e o poder libertador do perdão de Cristo', keyVerses: ['Mateus 18:21-35', 'Efésios 4:31-32', 'Marcos 11:25', 'Lucas 23:34'], subtopics: ['Raiz de amargura', 'Liberdade', 'Exemplo de Cristo', 'Reconciliação'] },
      { id: 'saude_mental', title: 'Saúde Mental', description: 'O cuidado integral do ser humano: corpo, alma e espírito', keyVerses: ['3 João 1:2', 'Salmos 42:5', 'Romanos 12:2', 'Filipenses 4:8'], subtopics: ['Mente renovada', 'Equilíbrio', 'Autocuidado', 'Esperança'] },
      { id: 'sentido_vida', title: 'Sentido da Vida', description: 'O propósito da existência encontrado em Cristo', keyVerses: ['Eclesiastes 12:13', 'João 10:10', 'Jeremias 29:11', 'Colossenses 1:16'], subtopics: ['Propósito eterno', 'Vaidade da vida', 'Cristo como centro', 'Significado'] },
      { id: 'cansaco_burnout', title: 'Cansaço e Burnout', description: 'O descanso que Cristo oferece ao cansado e sobrecarregado', keyVerses: ['Mateus 11:28-30', 'Salmos 23:1-3', 'Isaías 40:31', 'Êxodo 33:14'], subtopics: ['Descanso em Deus', 'Limites saudáveis', 'Renovação', 'Sabbath'] },
    ]
  },
  {
    id: 'igreja_ministerio', label: 'Igreja e Ministério', icon: Church,
    themes: [
      { id: 'igreja_atual', title: 'O Papel da Igreja Hoje', description: 'A missão da Igreja na sociedade', keyVerses: ['Mateus 16:18', 'Atos 2:42-47', 'Efésios 3:10'], subtopics: ['Missão', 'Relevância', 'Impacto'] },
      { id: 'unidade_corpo', title: 'Unidade no Corpo de Cristo', description: 'Que sejam um', keyVerses: ['1 Coríntios 12:12-27', 'Efésios 4:1-6', 'João 17:21'], subtopics: ['Diversidade', 'Cooperação', 'Amor'] },
      { id: 'servir_excelencia', title: 'Servir com Excelência', description: 'Tudo para a glória de Deus', keyVerses: ['Colossenses 3:23', '1 Coríntios 10:31', '1 Pedro 4:10-11'], subtopics: ['Dedicação', 'Qualidade', 'Motivação'] },
      { id: 'importancia_comunhao', title: 'A Importância da Comunhão', description: 'Não deixar de congregar', keyVerses: ['Hebreus 10:25', 'Atos 2:42', 'Salmos 133:1'], subtopics: ['Participação', 'Relacionamento', 'Crescimento'] },
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
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ThematicCategory | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ThematicTopic | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [studyResult, setStudyResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [webSearching, setWebSearching] = useState(false);
  const [showResultView, setShowResultView] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // User custom themes
  const [userTopics, setUserTopics] = useState<ThematicTopic[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<(ThematicTopic & { dbId?: string }) | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVerses, setNewVerses] = useState('');
  const [newSubtopics, setNewSubtopics] = useState('');

  const fetchUserTopics = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_thematic_topics')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      setUserTopics(data.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description || '',
        keyVerses: d.key_verses || [],
        subtopics: d.subtopics || [],
      })));
    }
  }, [user]);

  useEffect(() => { fetchUserTopics(); }, [fetchUserTopics]);

  const handleSaveTopic = async () => {
    if (!user || !newTitle.trim()) return;
    const verses = newVerses.split(',').map(v => v.trim()).filter(Boolean);
    const subs = newSubtopics.split(',').map(s => s.trim()).filter(Boolean);

    if (editingTopic?.id) {
      await supabase.from('user_thematic_topics').update({
        title: newTitle.trim(),
        description: newDescription.trim(),
        key_verses: verses,
        subtopics: subs,
      }).eq('id', editingTopic.id);
      toast({ title: '✅ Tema atualizado!' });
    } else {
      await supabase.from('user_thematic_topics').insert({
        user_id: user.id,
        title: newTitle.trim(),
        description: newDescription.trim(),
        key_verses: verses,
        subtopics: subs,
      });
      toast({ title: '✅ Tema adicionado!' });
    }
    setShowAddDialog(false);
    setEditingTopic(null);
    resetForm();
    fetchUserTopics();
  };

  const handleDeleteTopic = async (id: string) => {
    await supabase.from('user_thematic_topics').delete().eq('id', id);
    toast({ title: '🗑️ Tema removido' });
    fetchUserTopics();
  };

  const openEditDialog = (topic: ThematicTopic) => {
    setEditingTopic(topic);
    setNewTitle(topic.title);
    setNewDescription(topic.description);
    setNewVerses(topic.keyVerses.join(', '));
    setNewSubtopics(topic.subtopics.join(', '));
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewVerses('');
    setNewSubtopics('');
  };

  const openAddDialog = () => {
    setEditingTopic(null);
    resetForm();
    setShowAddDialog(true);
  };

  const userCategory: ThematicCategory | null = userTopics.length > 0 ? {
    id: 'meus_temas', label: 'Meus Temas', icon: FolderHeart, themes: userTopics,
  } : null;

  const allCategories = [...(userCategory ? [userCategory] : []), ...THEMATIC_CATEGORIES];

  const filteredCategories = allCategories.map(cat => ({
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
    setShowResultView(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
- Passagens principais com referências completas (ACF)
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

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'thematic_study',
          passage: themeTitle,
          content: prompt,
          materials_context: materialsContext,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `Erro ${resp.status}`);
      }
      if (!resp.body) throw new Error('Sem resposta do servidor');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line.trim() === '' || line.startsWith(':')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) {
              fullContent += c;
              setStudyResult(fullContent);
            }
          } catch { /* partial json */ }
        }
      }

      if (!fullContent) {
        toast({ title: 'Nenhum conteúdo gerado', variant: 'destructive' });
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error('Thematic study error:', e);
      toast({ title: 'Erro ao gerar estudo', description: String(e.message || e), variant: 'destructive' });
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
  if (showResultView || selectedTopic) {
    const topic = selectedTopic;
    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedTopic(null); setStudyResult(''); setCustomTopic(''); setShowResultView(false); abortRef.current?.abort(); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Voltar aos temas
        </button>

        {topic && !studyResult && !loading && (
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

        {loading && !studyResult && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{webSearching ? 'Buscando fontes externas...' : 'Gerando estudo temático...'}</p>
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

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {(() => { const Icon = selectedCategory.icon; return <Icon className="w-5 h-5 text-primary" />; })()}
            <h3 className="font-bold text-foreground">{selectedCategory.label}</h3>
          </div>
          {selectedCategory.id === 'meus_temas' && (
            <Button variant="outline" size="sm" onClick={openAddDialog} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Novo
            </Button>
          )}
        </div>

        <div className="grid gap-2">
          {selectedCategory.themes.map(theme => {
            const isUserTheme = selectedCategory.id === 'meus_temas';
            return (
              <div key={theme.id} className={cn(
                "flex items-start gap-3 p-3 rounded-xl border border-border bg-card",
                "hover:bg-accent/50 hover:border-primary/30 transition-all text-left group"
              )}>
                <button onClick={() => setSelectedTopic(theme)} className="flex-1 min-w-0 text-left">
                  <span className="font-medium text-sm text-foreground">{theme.title}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{theme.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {theme.keyVerses.slice(0, 2).map(v => (
                      <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0">{v}</Badge>
                    ))}
                    {theme.keyVerses.length > 2 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{theme.keyVerses.length - 2}</Badge>}
                  </div>
                </button>
                {isUserTheme ? (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => openEditDialog(theme)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteTopic(theme.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition-colors" />
                )}
              </div>
            );
          })}
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
          {/* Add theme button */}
          <button
            onClick={openAddDialog}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5",
              "hover:bg-primary/10 hover:border-primary/60",
              "transition-all duration-200 text-left group"
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm text-primary">Adicionar Tema</span>
              <p className="text-xs text-muted-foreground">Crie seus próprios temas de estudo</p>
            </div>
          </button>

          {allCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border border-border bg-card",
                  "hover:bg-accent/50 hover:border-primary/30 hover:shadow-md",
                  "transition-all duration-200 text-left group",
                  cat.id === 'meus_temas' && "border-primary/20 bg-primary/5"
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

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTopic ? 'Editar Tema' : 'Novo Tema de Estudo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Ética Cristã" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Breve descrição do tema..." rows={2} />
            </div>
            <div>
              <Label className="text-xs">Versículos-chave (separados por vírgula)</Label>
              <Input value={newVerses} onChange={e => setNewVerses(e.target.value)} placeholder="Ex: Mateus 5:13-16, Romanos 12:2" />
            </div>
            <div>
              <Label className="text-xs">Subtemas (separados por vírgula)</Label>
              <Input value={newSubtopics} onChange={e => setNewSubtopics(e.target.value)} placeholder="Ex: Padrão bíblico, Vida prática, Ser luz" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTopic} disabled={!newTitle.trim()}>
              {editingTopic ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
