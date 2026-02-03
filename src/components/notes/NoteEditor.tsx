import { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  X, 
  Book, 
  Tag as TagIcon, 
  Folder, 
  Link2,
  Pin,
  Archive,
  ChevronDown,
  Plus,
  Lightbulb,
  FileText,
  BookOpen,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from './RichTextEditor';
import { cn } from '@/lib/utils';
import type { Book as BookType } from '@/types/library';
import type { NoteFolder } from './NoteFolderTree';

export interface NoteData {
  id?: string;
  title: string;
  content: string;
  contentHtml?: string;
  contentJson?: object | null;
  tags: string[];
  noteType: 'fleeting' | 'permanent' | 'literature' | 'reference';
  folderId: string | null;
  bookId: string | null;
  linkedBookIds: string[];
  externalBookRefs: { title: string; author?: string; page?: string }[];
  isPinned: boolean;
  archived: boolean;
}

interface NoteEditorProps {
  initialNote?: Partial<NoteData>;
  books: BookType[];
  folders: NoteFolder[];
  allTags: string[];
  allNotes: { id: string; title: string }[];
  onSave: (note: NoteData) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

const noteTypes = [
  { value: 'fleeting', label: 'Efêmera', icon: Lightbulb, description: 'Ideia rápida para processar depois' },
  { value: 'permanent', label: 'Permanente', icon: FileText, description: 'Nota elaborada com suas palavras' },
  { value: 'literature', label: 'Literária', icon: BookOpen, description: 'Citação ou resumo de leitura' },
  { value: 'reference', label: 'Referência', icon: Bookmark, description: 'Material de consulta' },
];

export function NoteEditor({
  initialNote,
  books,
  folders,
  allTags,
  allNotes,
  onSave,
  onCancel,
  isSaving = false,
}: NoteEditorProps) {
  const [note, setNote] = useState<NoteData>({
    title: '',
    content: '',
    contentHtml: '',
    contentJson: null,
    tags: [],
    noteType: 'permanent',
    folderId: null,
    bookId: null,
    linkedBookIds: [],
    externalBookRefs: [],
    isPinned: false,
    archived: false,
    ...initialNote,
  });

  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [externalBookInput, setExternalBookInput] = useState({ title: '', author: '', page: '' });
  const [hasChanges, setHasChanges] = useState(false);

  // Auto-save indicator
  useEffect(() => {
    setHasChanges(true);
  }, [note]);

  const handleContentChange = useCallback((html: string, json: object, text: string) => {
    setNote(prev => ({
      ...prev,
      content: text,
      contentHtml: html,
      contentJson: json,
    }));
  }, []);

  const handleAddTag = (tag: string) => {
    const cleanTag = tag.trim().replace(/^#/, '').toLowerCase();
    if (cleanTag && !note.tags.includes(cleanTag)) {
      setNote(prev => ({ ...prev, tags: [...prev.tags, cleanTag] }));
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tag: string) => {
    setNote(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleToggleLinkedBook = (bookId: string) => {
    setNote(prev => ({
      ...prev,
      linkedBookIds: prev.linkedBookIds.includes(bookId)
        ? prev.linkedBookIds.filter(id => id !== bookId)
        : [...prev.linkedBookIds, bookId],
    }));
  };

  const handleAddExternalBook = () => {
    if (externalBookInput.title.trim()) {
      setNote(prev => ({
        ...prev,
        externalBookRefs: [...prev.externalBookRefs, { ...externalBookInput }],
      }));
      setExternalBookInput({ title: '', author: '', page: '' });
    }
  };

  const handleRemoveExternalBook = (index: number) => {
    setNote(prev => ({
      ...prev,
      externalBookRefs: prev.externalBookRefs.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!note.title.trim()) {
      return;
    }
    await onSave(note);
    setHasChanges(false);
  };

  // Filter tag suggestions
  const tagSuggestions = allTags
    .filter(tag => tag.toLowerCase().includes(tagInput.toLowerCase()))
    .filter(tag => !note.tags.includes(tag))
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {note.isPinned && <Pin className="h-4 w-4 text-primary fill-primary" />}
          <span className="text-sm text-muted-foreground">
            {initialNote?.id ? 'Editando nota' : 'Nova nota'}
          </span>
          {hasChanges && (
            <Badge variant="outline" className="text-xs">
              Não salvo
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !note.title.trim()}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title */}
        <div>
          <Input
            value={note.title}
            onChange={(e) => setNote(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Título da nota"
            className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
          />
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-3">
          {/* Note type */}
          <Select
            value={note.noteType}
            onValueChange={(value: any) => setNote(prev => ({ ...prev, noteType: value }))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {noteTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Folder */}
          <Select
            value={note.folderId || 'none'}
            onValueChange={(value) => setNote(prev => ({ ...prev, folderId: value === 'none' ? null : value }))}
          >
            <SelectTrigger className="w-[180px]">
              <Folder className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Pasta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem pasta</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Primary book */}
          <Select
            value={note.bookId || 'none'}
            onValueChange={(value) => setNote(prev => ({ ...prev, bookId: value === 'none' ? null : value }))}
          >
            <SelectTrigger className="w-[200px]">
              <Book className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Livro principal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {books.map((book) => (
                <SelectItem key={book.id} value={book.id}>
                  {book.livro}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pin/Archive toggles */}
          <Button
            variant={note.isPinned ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setNote(prev => ({ ...prev, isPinned: !prev.isPinned }))}
          >
            <Pin className={cn('h-4 w-4', note.isPinned && 'fill-current')} />
          </Button>
          <Button
            variant={note.archived ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setNote(prev => ({ ...prev, archived: !prev.archived }))}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <TagIcon className="h-4 w-4" />
            Tags
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="relative">
            <Input
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowTagSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddTag(tagInput);
                }
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              placeholder="Digite e pressione Enter"
              className="max-w-xs"
            />
            {showTagSuggestions && tagSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 w-full max-w-xs bg-popover border rounded-md shadow-lg z-10">
                {tagSuggestions.map((tag) => (
                  <button
                    key={tag}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => handleAddTag(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Linked books */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Referências em outros livros
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Book className="h-4 w-4" />
                Vincular livros cadastrados
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <Command>
                <CommandInput placeholder="Buscar livros..." />
                <CommandList>
                  <CommandEmpty>Nenhum livro encontrado.</CommandEmpty>
                  <CommandGroup>
                    {books
                      .filter((b) => b.id !== note.bookId)
                      .map((book) => (
                        <CommandItem
                          key={book.id}
                          onSelect={() => handleToggleLinkedBook(book.id)}
                          className="gap-2"
                        >
                          <Checkbox checked={note.linkedBookIds.includes(book.id)} />
                          {book.livro}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {note.linkedBookIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {note.linkedBookIds.map((id) => {
                const book = books.find((b) => b.id === id);
                return book ? (
                  <Badge key={id} variant="outline" className="gap-1">
                    <Link2 className="h-3 w-3" />
                    {book.livro}
                    <button
                      onClick={() => handleToggleLinkedBook(id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* External book references */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Livros não cadastrados
          </Label>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                value={externalBookInput.title}
                onChange={(e) => setExternalBookInput(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título do livro"
                className="text-sm"
              />
            </div>
            <div className="w-32">
              <Input
                value={externalBookInput.author}
                onChange={(e) => setExternalBookInput(prev => ({ ...prev, author: e.target.value }))}
                placeholder="Autor"
                className="text-sm"
              />
            </div>
            <div className="w-24">
              <Input
                value={externalBookInput.page}
                onChange={(e) => setExternalBookInput(prev => ({ ...prev, page: e.target.value }))}
                placeholder="Página"
                className="text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleAddExternalBook}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {note.externalBookRefs.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {note.externalBookRefs.map((ref, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  📚 {ref.title}
                  {ref.author && ` - ${ref.author}`}
                  {ref.page && ` (p. ${ref.page})`}
                  <button
                    onClick={() => handleRemoveExternalBook(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Rich text editor */}
        <div className="space-y-2">
          <Label>Conteúdo</Label>
          <RichTextEditor
            content={note.content}
            contentJson={note.contentJson}
            onChange={handleContentChange}
            placeholder="Comece a escrever sua nota... Use [[Nome da Nota]] para criar links."
          />
        </div>
      </div>
    </div>
  );
}
