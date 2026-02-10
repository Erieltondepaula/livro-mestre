import { useState, useMemo } from 'react';
import {
  StickyNote,
  Plus,
  Search,
  Tag,
  Book,
  Folder,
  Filter,
  Grid3X3,
  List,
  Archive,
  Lightbulb,
  FileText,
  BookOpen,
  Bookmark,
  Cloud,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteFolderTree, type NoteFolder } from '@/components/notes/NoteFolderTree';
import { NoteCard, type NoteCardData } from '@/components/notes/NoteCard';
import { NoteEditor, type NoteData } from '@/components/notes/NoteEditor';
import { useNotes } from '@/hooks/useNotes';
import { cn } from '@/lib/utils';
import type { Book as BookType } from '@/types/library';

interface EnhancedNotesViewProps {
  books: BookType[];
}

type NoteTypeFilter = 'all' | 'fleeting' | 'permanent' | 'literature' | 'reference';
type ViewMode = 'grid' | 'list';

export function EnhancedNotesView({ books }: EnhancedNotesViewProps) {
  const {
    notes,
    folders,
    allTags,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleArchive,
    createFolder,
    renameFolder,
    deleteFolder,
    refetch,
  } = useNotes(books);

  // UI State - hide sidebar by default on mobile
  const [showSidebar, setShowSidebar] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteCardData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<NoteTypeFilter>('all');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterBook, setFilterBook] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Compute note counts per folder
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(note => {
      // We need to track folder_id, but NoteCardData doesn't have it
      // For now, count all notes in "all" category
    });
    return counts;
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // Archive filter
      if (!showArchived && note.archived) return false;
      if (showArchived && !note.archived) return false;

      // Search filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filterType !== 'all' && note.noteType !== filterType) return false;

      // Tag filter
      if (filterTag && !note.tags.includes(filterTag)) return false;

      // Book filter
      if (filterBook) {
        const matchesBook =
          note.linkedBooks.some(lb => lb.id === filterBook) ||
          (note.bookName && books.find(b => b.id === filterBook)?.livro === note.bookName);
        if (!matchesBook) return false;
      }

      return true;
    });
  }, [notes, searchTerm, filterType, filterTag, filterBook, showArchived, books]);

  // Group by pinned
  const { pinnedNotes, regularNotes } = useMemo(() => {
    const pinned = filteredNotes.filter(n => n.isPinned);
    const regular = filteredNotes.filter(n => !n.isPinned);
    return { pinnedNotes: pinned, regularNotes: regular };
  }, [filteredNotes]);

  const handleNewNote = () => {
    setEditingNote(null);
    setIsEditing(true);
  };

  const handleEditNote = (note: NoteCardData) => {
    setEditingNote(note);
    setIsEditing(true);
  };

  const handleSaveNote = async (noteData: NoteData) => {
    setIsSaving(true);
    try {
      if (editingNote) {
        await updateNote({ ...noteData, id: editingNote.id });
      } else {
        await createNote(noteData);
      }
      setIsEditing(false);
      setEditingNote(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingNote(null);
  };

  // If editing, show editor fullscreen
  if (isEditing) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col">
        <NoteEditor
          initialNote={editingNote ? {
            id: editingNote.id,
            title: editingNote.title,
            content: editingNote.content,
            contentHtml: editingNote.contentHtml,
            tags: editingNote.tags,
            noteType: editingNote.noteType,
            folderId: null, // Would need to fetch this
            bookId: null, // Would need to fetch this
            linkedBookIds: editingNote.linkedBooks.map(lb => lb.id),
            externalBookRefs: [],
            isPinned: editingNote.isPinned,
            archived: editingNote.archived,
          } : undefined}
          books={books}
          folders={folders}
          allTags={allTags}
          allNotes={notes.map(n => ({ id: n.id, title: n.title }))}
          onSave={handleSaveNote}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex relative overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setShowSidebar(false)} />
        </>
      )}
      {showSidebar && (
        <div className="fixed md:relative z-30 w-64 h-full border-r bg-card md:bg-muted/20 flex flex-col shrink-0 shadow-lg md:shadow-none top-0 left-0 md:top-auto md:left-auto">
          <div className="p-4 border-b">
            <Button onClick={handleNewNote} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Nova Nota
            </Button>
          </div>

          <ScrollArea className="flex-1 p-3">
            <NoteFolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={createFolder}
              onRenameFolder={renameFolder}
              onDeleteFolder={deleteFolder}
              noteCounts={noteCounts}
            />

            {/* Quick filters */}
            <div className="mt-6 space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-3 mb-2">
                TIPOS DE NOTA
              </p>
              <button
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted/50',
                  filterType === 'fleeting' && 'bg-primary/10 text-primary'
                )}
                onClick={() => setFilterType(filterType === 'fleeting' ? 'all' : 'fleeting')}
              >
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Efêmeras
              </button>
              <button
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted/50',
                  filterType === 'permanent' && 'bg-primary/10 text-primary'
                )}
                onClick={() => setFilterType(filterType === 'permanent' ? 'all' : 'permanent')}
              >
                <FileText className="h-4 w-4 text-primary" />
                Permanentes
              </button>
              <button
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted/50',
                  filterType === 'literature' && 'bg-primary/10 text-primary'
                )}
                onClick={() => setFilterType(filterType === 'literature' ? 'all' : 'literature')}
              >
                <BookOpen className="h-4 w-4 text-emerald-500" />
                Literárias
              </button>
              <button
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted/50',
                  filterType === 'reference' && 'bg-primary/10 text-primary'
                )}
                onClick={() => setFilterType(filterType === 'reference' ? 'all' : 'reference')}
              >
                <Bookmark className="h-4 w-4 text-violet-500" />
                Referências
              </button>
            </div>

            {/* Archived */}
            <div className="mt-4">
              <button
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted/50',
                  showArchived && 'bg-primary/10 text-primary'
                )}
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="h-4 w-4" />
                Arquivadas
              </button>
            </div>

            {/* Tag cloud */}
            {allTags.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-medium text-muted-foreground px-3 mb-2">
                  TAGS
                </p>
                <div className="flex flex-wrap gap-1 px-3">
                  {allTags.slice(0, 15).map(tag => (
                    <Badge
                      key={tag}
                      variant={filterTag === tag ? 'default' : 'secondary'}
                      className="cursor-pointer text-xs"
                      onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Sync status */}
          <div className="p-3 border-t text-xs text-muted-foreground flex items-center gap-2">
            <Cloud className="h-3 w-3" />
            Sincronizado
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', !showSidebar && 'rotate-180')} />
            </Button>

            <div className="flex items-center gap-3">
              <StickyNote className="w-6 h-6 text-primary" />
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  {showArchived ? 'Notas Arquivadas' : 'Notas'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {filteredNotes.length} nota{filteredNotes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex-1" />

            {/* View toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="grid" className="gap-1">
                  <Grid3X3 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notas, tags, conteúdo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterBook || 'all'} onValueChange={(v) => setFilterBook(v === 'all' ? null : v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Book className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Livro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os livros</SelectItem>
                {books.map(book => (
                  <SelectItem key={book.id} value={book.id}>{book.livro}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterType !== 'all' || filterTag || filterBook) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterType('all');
                  setFilterTag(null);
                  setFilterBook(null);
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Notes grid/list */}
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">
                {searchTerm || filterType !== 'all' || filterTag || filterBook
                  ? 'Nenhuma nota encontrada'
                  : 'Comece a tomar notas'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || filterType !== 'all' || filterTag || filterBook
                  ? 'Tente ajustar os filtros'
                  : 'Crie sua primeira nota e conecte seus conhecimentos'}
              </p>
              {!searchTerm && filterType === 'all' && !filterTag && !filterBook && (
                <Button onClick={handleNewNote}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Nota
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pinned notes */}
              {pinnedNotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    📌 Fixadas ({pinnedNotes.length})
                  </h3>
                  <div className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                      : 'space-y-2'
                  )}>
                    {pinnedNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onClick={() => handleEditNote(note)}
                        onEdit={() => handleEditNote(note)}
                        onDelete={() => deleteNote(note.id)}
                        onTogglePin={() => togglePin(note.id)}
                        onToggleArchive={() => toggleArchive(note.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular notes */}
              {regularNotes.length > 0 && (
                <div>
                  {pinnedNotes.length > 0 && (
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Outras ({regularNotes.length})
                    </h3>
                  )}
                  <div className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                      : 'space-y-2'
                  )}>
                    {regularNotes.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onClick={() => handleEditNote(note)}
                        onEdit={() => handleEditNote(note)}
                        onDelete={() => deleteNote(note.id)}
                        onTogglePin={() => togglePin(note.id)}
                        onToggleArchive={() => toggleArchive(note.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
