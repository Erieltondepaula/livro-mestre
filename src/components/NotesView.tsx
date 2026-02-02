import { useState, useMemo } from 'react';
import { StickyNote, Plus, Search, Tag, Book, Trash2, Edit2, X, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Note, Book as BookType } from '@/types/library';

interface NotesViewProps {
  books: BookType[];
  notes: Note[];
  onAddNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'linkedBooks'> & { linkedBookIds?: string[] }) => void;
  onUpdateNote: (note: Note & { linkedBookIds?: string[] }) => void;
  onDeleteNote: (id: string) => void;
}

export function NotesView({ books, notes, onAddNote, onUpdateNote, onDeleteNote }: NotesViewProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterBook, setFilterBook] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState('');
  const [formBookId, setFormBookId] = useState<string>('');
  const [formLinkedBookIds, setFormLinkedBookIds] = useState<string[]>([]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = searchTerm === '' || 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTag = !filterTag || note.tags.includes(filterTag);
      
      const matchesBook = !filterBook || 
        note.bookId === filterBook || 
        note.linkedBooks.some(lb => lb.id === filterBook);
      
      return matchesSearch && matchesTag && matchesBook;
    });
  }, [notes, searchTerm, filterTag, filterBook]);

  // Group notes by book
  const notesByBook = useMemo(() => {
    const grouped: Record<string, { bookName: string; notes: Note[] }> = {};
    const unlinked: Note[] = [];

    filteredNotes.forEach(note => {
      if (note.bookId && note.bookName) {
        if (!grouped[note.bookId]) {
          grouped[note.bookId] = { bookName: note.bookName, notes: [] };
        }
        grouped[note.bookId].notes.push(note);
      } else {
        unlinked.push(note);
      }
    });

    return { grouped, unlinked };
  }, [filteredNotes]);

  const openNewNote = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormTags([]);
    setFormTagInput('');
    setFormBookId('');
    setFormLinkedBookIds([]);
    setIsDialogOpen(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormTags(note.tags);
    setFormTagInput('');
    setFormBookId(note.bookId || '');
    setFormLinkedBookIds(note.linkedBooks.map(lb => lb.id));
    setIsDialogOpen(true);
  };

  const handleAddTag = () => {
    const tag = formTagInput.trim().replace(/^#/, '');
    if (tag && !formTags.includes(tag)) {
      setFormTags([...formTags, tag]);
      setFormTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter(t => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleToggleLinkedBook = (bookId: string) => {
    if (formLinkedBookIds.includes(bookId)) {
      setFormLinkedBookIds(formLinkedBookIds.filter(id => id !== bookId));
    } else {
      setFormLinkedBookIds([...formLinkedBookIds, bookId]);
    }
  };

  const handleSubmit = () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o conteúdo da nota.",
        variant: "destructive",
      });
      return;
    }

    if (editingNote) {
      onUpdateNote({
        ...editingNote,
        title: formTitle.trim(),
        content: formContent.trim(),
        tags: formTags,
        bookId: formBookId || null,
        linkedBookIds: formLinkedBookIds,
      });
    } else {
      onAddNote({
        title: formTitle.trim(),
        content: formContent.trim(),
        tags: formTags,
        bookId: formBookId || null,
        linkedBookIds: formLinkedBookIds,
      });
    }

    setIsDialogOpen(false);
  };

  const toggleNoteExpand = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const renderNoteCard = (note: Note) => {
    const isExpanded = expandedNotes.has(note.id);
    const shouldTruncate = note.content.length > 200;

    return (
      <div
        key={note.id}
        className="card-library p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-foreground flex-1">{note.title}</h4>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => openEditNote(note)}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir esta nota?')) {
                  onDeleteNote(note.id);
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <p className={`text-sm text-muted-foreground mb-3 whitespace-pre-wrap ${!isExpanded && shouldTruncate ? 'line-clamp-3' : ''}`}>
          {note.content}
        </p>

        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs mb-2 p-0 h-auto text-primary"
            onClick={() => toggleNoteExpand(note.id)}
          >
            {isExpanded ? (
              <>Ver menos <ChevronUp className="w-3 h-3 ml-1" /></>
            ) : (
              <>Ver mais <ChevronDown className="w-3 h-3 ml-1" /></>
            )}
          </Button>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {note.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Linked books */}
        {note.linkedBooks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.linkedBooks.map(lb => (
              <Badge key={lb.id} variant="outline" className="text-xs">
                <Link2 className="w-3 h-3 mr-1" />
                {lb.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StickyNote className="w-8 h-8 text-primary" />
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Notas</h2>
            <p className="text-sm text-muted-foreground">Organize suas ideias e conecte conhecimentos</p>
          </div>
        </div>
        <Button onClick={openNewNote}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Nota
        </Button>
      </div>

      {/* Filters */}
      <div className="card-library p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notas, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={filterTag || 'all'} onValueChange={(v) => setFilterTag(v === 'all' ? null : v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Tag className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tags</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>#{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterBook || 'all'} onValueChange={(v) => setFilterBook(v === 'all' ? null : v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Book className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por livro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os livros</SelectItem>
            {books.map(book => (
              <SelectItem key={book.id} value={book.id}>{book.livro}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes Display */}
      {filteredNotes.length === 0 ? (
        <div className="card-library p-12 text-center">
          <StickyNote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {notes.length === 0 
              ? 'Nenhuma nota criada ainda. Comece adicionando sua primeira nota!' 
              : 'Nenhuma nota encontrada com os filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grouped by book */}
          {Object.entries(notesByBook.grouped).map(([bookId, { bookName, notes: bookNotes }]) => (
            <div key={bookId} className="space-y-3">
              <div className="flex items-center gap-2">
                <Book className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{bookName}</h3>
                <Badge variant="secondary">{bookNotes.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-7">
                {bookNotes.map(renderNoteCard)}
              </div>
            </div>
          ))}

          {/* Unlinked notes */}
          {notesByBook.unlinked.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground">Notas sem vínculo</h3>
                <Badge variant="outline">{notesByBook.unlinked.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-7">
                {notesByBook.unlinked.map(renderNoteCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Editar Nota' : 'Nova Nota'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Título da nota"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Escreva sua nota aqui..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Livro Principal</Label>
              <Select value={formBookId || 'none'} onValueChange={(v) => setFormBookId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um livro (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {books.map(book => (
                    <SelectItem key={book.id} value={book.id}>{book.livro}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={formTagInput}
                  onChange={(e) => setFormTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Digite uma tag e pressione Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Adicionar
                </Button>
              </div>
              {formTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-sm">
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Referências em outros livros</Label>
              <p className="text-xs text-muted-foreground">
                Vincule esta nota a outros livros para criar conexões
              </p>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {books.filter(b => b.id !== formBookId).map(book => (
                  <label
                    key={book.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formLinkedBookIds.includes(book.id)}
                      onChange={() => handleToggleLinkedBook(book.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{book.livro}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingNote ? 'Salvar' : 'Criar Nota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}