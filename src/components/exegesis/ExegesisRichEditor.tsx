import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Typography from '@tiptap/extension-typography';
import FontFamily from '@tiptap/extension-font-family';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Link as LinkIcon,
  Undo, Redo, Pilcrow, Palette, Type, ChevronDown, Eye, EyeOff,
} from 'lucide-react';

interface ExegesisRichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  minHeight?: string;
}

const FONT_COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#DC2626', '#EA580C', '#D97706', '#CA8A04',
  '#16A34A', '#059669', '#0D9488', '#0891B2',
  '#2563EB', '#4F46E5', '#7C3AED', '#9333EA',
  '#C026D3', '#DB2777', '#E11D48', '#F43F5E',
];

// Legenda oficial de cores para sermões/exegese
const SEMANTIC_HIGHLIGHT_COLORS = [
  { color: '#BFDBFE', label: 'Azul', meaning: 'Citações Bíblicas', emoji: '🔵' },
  { color: '#1a1a1a', label: 'Preto', meaning: 'Explanação Principal', emoji: '⚫', isTextColor: true },
  { color: '#FECACA', label: 'Vermelho', meaning: 'Ilustrações / Ênfase', emoji: '🔴' },
  { color: '#BBF7D0', label: 'Verde', meaning: 'Aplicação Prática', emoji: '🟢' },
  { color: '#FEF08A', label: 'Amarelo', meaning: 'Notas Pessoais', emoji: '🟡' },
  { color: '#DDD6FE', label: 'Roxo', meaning: 'Centralidade de Cristo', emoji: '🟣' },
];

const HIGHLIGHT_COLORS = SEMANTIC_HIGHLIGHT_COLORS.filter(c => !c.isTextColor);

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'];

const FONT_FAMILIES = [
  { value: 'Source Sans 3, sans-serif', label: 'Sans Serif' },
  { value: 'Georgia, serif', label: 'Serif' },
  { value: 'Playfair Display, serif', label: 'Display' },
  { value: 'Courier New, monospace', label: 'Mono' },
];

function ToolBtn({ children, tooltip, pressed, onClick, disabled }: { children: React.ReactNode; tooltip: string; pressed?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {pressed !== undefined ? (
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={pressed} onPressedChange={onClick} disabled={disabled}>
            {children}
          </Toggle>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClick} disabled={disabled}>
            {children}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// FontSize extension using inline styles
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize || null,
        renderHTML: (attrs) => {
          if (!attrs.fontSize) return {};
          return { style: `font-size: ${attrs.fontSize}` };
        },
      },
    };
  },
});

export function ExegesisRichEditor({
  content,
  onChange,
  placeholder = 'Comece a editar...',
  editable = true,
  className = '',
  minHeight = '300px',
}: ExegesisRichEditorProps) {
  const [customColor, setCustomColor] = useState('#000000');
  const [customHighlight, setCustomHighlight] = useState('#FEF08A');
  const [showLegend, setShowLegend] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline cursor-pointer' } }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontSize,
      Color,
      Typography,
      FontFamily.configure({ types: ['textStyle'] }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `exegesis-editor focus:outline-none p-4 ${className}`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const setFontSize = useCallback((size: string) => {
    if (!editor) return;
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border rounded-lg overflow-hidden bg-background">
        {editable && (
          <div className="border-b bg-muted/50 p-1 flex flex-wrap gap-px items-center">
            {/* Undo/Redo */}
            <ToolBtn tooltip="Desfazer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
              <Undo className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Refazer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
              <Redo className="h-3.5 w-3.5" />
            </ToolBtn>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Font Family */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                  <Type className="h-3.5 w-3.5" />
                  <ChevronDown className="h-2.5 w-2.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                {FONT_FAMILIES.map(f => (
                  <button key={f.value} className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors" style={{ fontFamily: f.value }}
                    onClick={() => editor.chain().focus().setFontFamily(f.value).run()}>
                    {f.label}
                  </button>
                ))}
                <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted text-muted-foreground"
                  onClick={() => editor.chain().focus().unsetFontFamily().run()}>
                  Padrão
                </button>
              </PopoverContent>
            </Popover>

            {/* Font Size */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                  Aa <ChevronDown className="h-2.5 w-2.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-24 p-1" align="start">
                {FONT_SIZES.map(s => (
                  <button key={s} className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted"
                    onClick={() => setFontSize(s)}>
                    {s}
                  </button>
                ))}
                <button className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted text-muted-foreground"
                  onClick={() => editor.chain().focus().unsetMark('textStyle').run()}>
                  Padrão
                </button>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Text formatting */}
            <ToolBtn tooltip="Negrito" pressed={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Itálico" pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Sublinhado" pressed={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Riscado" pressed={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolBtn>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Font Color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Palette className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="start">
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase">Cor da Fonte</p>
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {FONT_COLORS.map(color => (
                    <button key={color} className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: color }}
                      onClick={() => editor.chain().focus().setColor(color).run()} />
                  ))}
                </div>
                <div className="flex gap-1.5 items-center border-t pt-2">
                  <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                  <input type="text" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="flex-1 text-xs border rounded px-1.5 py-1 bg-background font-mono" maxLength={7} />
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => editor.chain().focus().setColor(customColor).run()}>OK</Button>
                </div>
                <button className="w-full mt-1.5 text-[10px] text-muted-foreground hover:text-foreground text-center" onClick={() => editor.chain().focus().unsetColor().run()}>Remover cor</button>
              </PopoverContent>
            </Popover>

            {/* Highlight Color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Highlighter className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="start">
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase">Marcador de Texto</p>
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {HIGHLIGHT_COLORS.map(h => (
                    <button key={h.color} className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-muted/50 transition-colors"
                      onClick={() => editor.chain().focus().toggleHighlight({ color: h.color }).run()}>
                      <span className="w-6 h-6 rounded border border-border" style={{ backgroundColor: h.color }} />
                      <span className="text-[9px] text-muted-foreground">{h.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 items-center border-t pt-2">
                  <input type="color" value={customHighlight} onChange={(e) => setCustomHighlight(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                  <input type="text" value={customHighlight} onChange={(e) => setCustomHighlight(e.target.value)} className="flex-1 text-xs border rounded px-1.5 py-1 bg-background font-mono" maxLength={7} />
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => editor.chain().focus().toggleHighlight({ color: customHighlight }).run()}>OK</Button>
                </div>
                <button className="w-full mt-1.5 text-[10px] text-muted-foreground hover:text-foreground text-center" onClick={() => editor.chain().focus().unsetHighlight().run()}>Remover destaque</button>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Headings */}
            <ToolBtn tooltip="Título 1" pressed={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Título 2" pressed={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Título 3" pressed={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Parágrafo" pressed={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
              <Pilcrow className="h-3.5 w-3.5" />
            </ToolBtn>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Alignment */}
            <ToolBtn tooltip="Alinhar à esquerda" pressed={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Centralizar" pressed={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Alinhar à direita" pressed={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
              <AlignRight className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Justificar" pressed={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
              <AlignJustify className="h-3.5 w-3.5" />
            </ToolBtn>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Lists */}
            <ToolBtn tooltip="Lista com marcadores" pressed={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Lista numerada" pressed={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn tooltip="Citação" pressed={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-3.5 w-3.5" />
            </ToolBtn>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Link */}
            <ToolBtn tooltip="Inserir link" onClick={setLink}>
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolBtn>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Legend toggle */}
            <ToolBtn tooltip={showLegend ? "Ocultar Legenda" : "Mostrar Legenda"} onClick={() => setShowLegend(!showLegend)}>
              {showLegend ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </ToolBtn>
          </div>
        )}

        {/* Color Legend Panel */}
        {showLegend && (
          <div className="border-b bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">🎨 Legenda de Cores</p>
            <div className="flex flex-wrap gap-2">
              {SEMANTIC_HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.color}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:bg-muted/60 transition-colors border border-border/50"
                  onClick={() => {
                    if (c.isTextColor) {
                      editor?.chain().focus().setColor(c.color).run();
                    } else {
                      editor?.chain().focus().toggleHighlight({ color: c.color }).run();
                    }
                  }}
                >
                  <span className="text-sm">{c.emoji}</span>
                  <span className="w-3 h-3 rounded-sm border border-border/50" style={{ backgroundColor: c.color }} />
                  <span className="font-medium">{c.meaning}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <EditorContent editor={editor} />
      </div>
    </TooltipProvider>
  );
}
