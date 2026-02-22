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
import { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Link as LinkIcon,
  Undo, Redo, Pilcrow, Palette,
} from 'lucide-react';

interface ExegesisRichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  minHeight?: string;
}

const COLORS = [
  '#000000', '#DC2626', '#EA580C', '#CA8A04', '#16A34A',
  '#2563EB', '#7C3AED', '#DB2777', '#64748B',
];

export function ExegesisRichEditor({
  content,
  onChange,
  placeholder = 'Comece a editar...',
  editable = true,
  className = '',
  minHeight = '300px',
}: ExegesisRichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline cursor-pointer' } }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Typography,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none p-4 ${className}`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor && !editable) {
      editor.setEditable(false);
    } else if (editor && editable) {
      editor.setEditable(true);
    }
  }, [editable, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {editable && (
        <div className="border-b bg-muted/50 p-1.5 flex flex-wrap gap-0.5">
          {/* Undo/Redo */}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <Undo className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <Redo className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-7 mx-0.5" />

          {/* Text formatting */}
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('highlight')} onPressedChange={() => editor.chain().focus().toggleHighlight().run()}>
            <Highlighter className="h-3.5 w-3.5" />
          </Toggle>

          <Separator orientation="vertical" className="h-7 mx-0.5" />

          {/* Color picker */}
          <div className="relative group">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Palette className="h-3.5 w-3.5" />
            </Button>
            <div className="absolute top-full left-0 mt-1 bg-popover border rounded-lg p-2 hidden group-hover:grid grid-cols-3 gap-1 z-50 shadow-lg">
              {COLORS.map(color => (
                <button key={color} className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setColor(color).run()} />
              ))}
              <button className="w-6 h-6 rounded border border-border text-[8px] font-bold hover:bg-muted" onClick={() => editor.chain().focus().unsetColor().run()}>✕</button>
            </div>
          </div>

          <Separator orientation="vertical" className="h-7 mx-0.5" />

          {/* Headings */}
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('heading', { level: 1 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('heading', { level: 3 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('paragraph')} onPressedChange={() => editor.chain().focus().setParagraph().run()}>
            <Pilcrow className="h-3.5 w-3.5" />
          </Toggle>

          <Separator orientation="vertical" className="h-7 mx-0.5" />

          {/* Alignment */}
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive({ textAlign: 'left' })} onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive({ textAlign: 'center' })} onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive({ textAlign: 'right' })} onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive({ textAlign: 'justify' })} onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}>
            <AlignJustify className="h-3.5 w-3.5" />
          </Toggle>

          <Separator orientation="vertical" className="h-7 mx-0.5" />

          {/* Lists */}
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" className="h-7 w-7 p-0" pressed={editor.isActive('blockquote')} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="h-3.5 w-3.5" />
          </Toggle>

          <Separator orientation="vertical" className="h-7 mx-0.5" />

          {/* Link */}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={setLink}>
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
