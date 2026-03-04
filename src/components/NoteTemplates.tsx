import { FileText, BookOpen, Users, Lightbulb, CheckSquare, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export interface NoteTemplate {
  id: string;
  label: string;
  icon: React.ElementType;
  noteType: 'fleeting' | 'permanent' | 'literature' | 'reference';
  title: string;
  content: string;
  tags: string[];
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'chapter_summary',
    label: 'Resumo de Capítulo',
    icon: FileText,
    noteType: 'literature',
    title: 'Resumo: [Livro] - Capítulo X',
    content: `## Resumo do Capítulo

### Ideia Principal
_Qual é a mensagem central deste capítulo?_

### Pontos-Chave
1. 
2. 
3. 

### Citações Importantes
> "..." (p. )

### Conexões com Outros Textos
- 

### Reflexão Pessoal
_O que mais me impactou e por quê?_
`,
    tags: ['resumo', 'capítulo'],
  },
  {
    id: 'devotional',
    label: 'Reflexão Devocional',
    icon: Lightbulb,
    noteType: 'permanent',
    title: 'Devocional: [Passagem]',
    content: `## Reflexão Devocional

### Texto Bíblico
📖 

### Contexto
_Quem escreveu? Para quem? Quando?_

### O que Deus está dizendo?
_O que o texto revela sobre o caráter de Deus?_

### O que isso significa para mim?
_Como essa verdade se aplica à minha vida hoje?_

### Oração
_Senhor..._

### Versículo para memorizar
> 
`,
    tags: ['devocional', 'reflexão'],
  },
  {
    id: 'character_study',
    label: 'Análise de Personagem Bíblico',
    icon: Users,
    noteType: 'reference',
    title: 'Personagem: [Nome]',
    content: `## Análise de Personagem Bíblico

### Identificação
- **Nome:** 
- **Significado do nome:** 
- **Período:** 
- **Referências principais:** 

### Contexto Histórico
_Em que época viveu? Qual era a situação política/social?_

### Traços de Caráter
- **Qualidades:** 
- **Fraquezas:** 

### Eventos Marcantes
1. 
2. 
3. 

### Lições Espirituais
_O que podemos aprender com essa pessoa?_

### Conexão com Cristo
_Como essa história aponta para Jesus?_
`,
    tags: ['personagem', 'estudo bíblico'],
  },
  {
    id: 'thematic_study',
    label: 'Estudo Temático',
    icon: ScrollText,
    noteType: 'reference',
    title: 'Estudo: [Tema]',
    content: `## Estudo Temático

### Tema
_Qual é o tema central a ser estudado?_

### Definição
_O que significa este tema no contexto bíblico?_

### Passagens-Chave
| Referência | Texto | Contribuição |
|---|---|---|
|  |  |  |

### Desenvolvimento Bíblico-Teológico
#### No Antigo Testamento

#### No Novo Testamento

### Aplicação Prática
1. 
2. 
3. 

### Fontes Consultadas
- 
`,
    tags: ['estudo', 'temático'],
  },
  {
    id: 'practical_applications',
    label: 'Lista de Aplicações Práticas',
    icon: CheckSquare,
    noteType: 'fleeting',
    title: 'Aplicações: [Texto/Sermão]',
    content: `## Aplicações Práticas

### Texto Base
📖 

### O que eu preciso CRER?
- [ ] 

### O que eu preciso FAZER?
- [ ] 

### O que eu preciso PARAR de fazer?
- [ ] 

### O que eu preciso COMPARTILHAR?
- [ ] 

### Meta da Semana
_Uma ação concreta que vou implementar:_

### Prestação de Contas
_Quem vai me ajudar a praticar isso?_
`,
    tags: ['aplicação', 'prática'],
  },
];

interface NoteTemplatesDialogProps {
  onSelectTemplate: (template: NoteTemplate) => void;
}

export function NoteTemplatesDialog({ onSelectTemplate }: NoteTemplatesDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-1" /> Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Escolha um Template</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 mt-2">
          {NOTE_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <DialogTrigger key={template.id} asChild>
                <button
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-left"
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{template.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {template.tags.map(t => `#${t}`).join(' ')}
                    </p>
                  </div>
                </button>
              </DialogTrigger>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
