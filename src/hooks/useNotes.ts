import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Book } from '@/types/library';
import type { NoteFolder } from '@/components/notes/NoteFolderTree';
import type { NoteCardData } from '@/components/notes/NoteCard';
import type { NoteData } from '@/components/notes/NoteEditor';

export interface UseNotesReturn {
  notes: NoteCardData[];
  folders: NoteFolder[];
  allTags: string[];
  isLoading: boolean;
  createNote: (note: NoteData) => Promise<void>;
  updateNote: (note: NoteData) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  getBacklinks: (noteId: string) => Promise<{ sourceId: string; title: string }[]>;
  searchNotes: (query: string) => NoteCardData[];
  refetch: () => Promise<void>;
}

export function useNotes(books: Book[]): UseNotesReturn {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteCardData[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [notes]);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    
    try {
      // Fetch notes with book info
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select(`
          id,
          title,
          content,
          content_html,
          content_json,
          tags,
          note_type,
          is_pinned,
          archived,
          folder_id,
          book_id,
          word_count,
          updated_at,
          created_at,
          books:book_id (id, name)
        `)
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (notesError) throw notesError;

      // Fetch linked books for each note
      const { data: linksData, error: linksError } = await supabase
        .from('note_book_links')
        .select('note_id, book_id, books:book_id (id, name)')
        .eq('user_id', user.id);

      if (linksError) throw linksError;

      // Fetch backlinks count for each note
      const { data: backlinksData, error: backlinksError } = await supabase
        .from('note_links')
        .select('target_note_id')
        .eq('user_id', user.id);

      if (backlinksError) throw backlinksError;

      // Build backlinks count map
      const backlinksCountMap: Record<string, number> = {};
      backlinksData?.forEach(bl => {
        backlinksCountMap[bl.target_note_id] = (backlinksCountMap[bl.target_note_id] || 0) + 1;
      });

      // Build linked books map
      const linkedBooksMap: Record<string, { id: string; name: string }[]> = {};
      linksData?.forEach(link => {
        if (!linkedBooksMap[link.note_id]) {
          linkedBooksMap[link.note_id] = [];
        }
        if (link.books && typeof link.books === 'object' && 'id' in link.books) {
          linkedBooksMap[link.note_id].push({
            id: link.books.id as string,
            name: link.books.name as string,
          });
        }
      });

      // Transform to NoteCardData
      const transformedNotes: NoteCardData[] = (notesData || []).map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        contentHtml: note.content_html || undefined,
        tags: note.tags || [],
        noteType: (note.note_type || 'permanent') as NoteCardData['noteType'],
        isPinned: note.is_pinned || false,
        archived: note.archived || false,
        bookName: note.books && typeof note.books === 'object' && 'name' in note.books 
          ? (note.books.name as string) 
          : null,
        linkedBooks: linkedBooksMap[note.id] || [],
        backlinksCount: backlinksCountMap[note.id] || 0,
        wordCount: note.word_count || 0,
        updatedAt: note.updated_at,
        createdAt: note.created_at,
      }));

      setNotes(transformedNotes);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      toast({
        title: 'Erro ao carregar notas',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [user]);

  const fetchFolders = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('note_folders')
        .select('id, name, parent_id, icon, color, sort_order')
        .eq('user_id', user.id)
        .order('sort_order');

      if (error) throw error;

      setFolders((data || []).map(f => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        icon: f.icon || undefined,
        color: f.color || undefined,
        sortOrder: f.sort_order,
      })));
    } catch (error: any) {
      console.error('Error fetching folders:', error);
    }
  }, [user]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchNotes(), fetchFolders()]);
    setIsLoading(false);
  }, [fetchNotes, fetchFolders]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createNote = async (noteData: NoteData) => {
    if (!user) return;

    try {
      // Insert note
      const { data: newNote, error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: noteData.title,
          content: noteData.content,
          content_html: noteData.contentHtml,
          content_json: noteData.contentJson as any,
          tags: noteData.tags,
          note_type: noteData.noteType,
          folder_id: noteData.folderId,
          book_id: noteData.bookId,
          is_pinned: noteData.isPinned,
          archived: noteData.archived,
          word_count: noteData.content.split(/\s+/).filter(Boolean).length,
        })
        .select()
        .single();

      if (noteError) throw noteError;

      // Insert linked books
      if (noteData.linkedBookIds.length > 0) {
        const links = noteData.linkedBookIds.map(bookId => ({
          user_id: user.id,
          note_id: newNote.id,
          book_id: bookId,
        }));

        const { error: linksError } = await supabase
          .from('note_book_links')
          .insert(links);

        if (linksError) throw linksError;
      }

      // Insert external book references
      if (noteData.externalBookRefs.length > 0) {
        const refs = noteData.externalBookRefs.map(ref => ({
          user_id: user.id,
          note_id: newNote.id,
          book_title: ref.title,
          book_author: ref.author || null,
          page_reference: ref.page || null,
        }));

        const { error: refsError } = await supabase
          .from('external_book_references')
          .insert(refs);

        if (refsError) throw refsError;
      }

      toast({ title: 'Nota criada!' });
      await refetch();
    } catch (error: any) {
      console.error('Error creating note:', error);
      toast({
        title: 'Erro ao criar nota',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateNote = async (noteData: NoteData) => {
    if (!user || !noteData.id) return;

    try {
      // Update note
      const { error: noteError } = await supabase
        .from('notes')
        .update({
          title: noteData.title,
          content: noteData.content,
          content_html: noteData.contentHtml,
          content_json: noteData.contentJson as any,
          tags: noteData.tags,
          note_type: noteData.noteType,
          folder_id: noteData.folderId,
          book_id: noteData.bookId,
          is_pinned: noteData.isPinned,
          archived: noteData.archived,
          word_count: noteData.content.split(/\s+/).filter(Boolean).length,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', noteData.id)
        .eq('user_id', user.id);

      if (noteError) throw noteError;

      // Update linked books: delete all and re-insert
      await supabase
        .from('note_book_links')
        .delete()
        .eq('note_id', noteData.id)
        .eq('user_id', user.id);

      if (noteData.linkedBookIds.length > 0) {
        const links = noteData.linkedBookIds.map(bookId => ({
          user_id: user.id,
          note_id: noteData.id!,
          book_id: bookId,
        }));

        await supabase.from('note_book_links').insert(links);
      }

      // Update external references: delete all and re-insert
      await supabase
        .from('external_book_references')
        .delete()
        .eq('note_id', noteData.id)
        .eq('user_id', user.id);

      if (noteData.externalBookRefs.length > 0) {
        const refs = noteData.externalBookRefs.map(ref => ({
          user_id: user.id,
          note_id: noteData.id!,
          book_title: ref.title,
          book_author: ref.author || null,
          page_reference: ref.page || null,
        }));

        await supabase.from('external_book_references').insert(refs);
      }

      toast({ title: 'Nota atualizada!' });
      await refetch();
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast({
        title: 'Erro ao atualizar nota',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Nota excluída!' });
      await refetch();
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Erro ao excluir nota',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const togglePin = async (id: string) => {
    if (!user) return;

    const note = notes.find(n => n.id === id);
    if (!note) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: !note.isPinned })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await refetch();
    } catch (error: any) {
      console.error('Error toggling pin:', error);
    }
  };

  const toggleArchive = async (id: string) => {
    if (!user) return;

    const note = notes.find(n => n.id === id);
    if (!note) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({ archived: !note.archived })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: note.archived ? 'Nota desarquivada' : 'Nota arquivada' });
      await refetch();
    } catch (error: any) {
      console.error('Error toggling archive:', error);
    }
  };

  const createFolder = async (name: string, parentId: string | null) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('note_folders')
        .insert({
          user_id: user.id,
          name,
          parent_id: parentId,
          sort_order: folders.length,
        });

      if (error) throw error;
      await fetchFolders();
    } catch (error: any) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Erro ao criar pasta',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renameFolder = async (id: string, name: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('note_folders')
        .update({ name })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchFolders();
    } catch (error: any) {
      console.error('Error renaming folder:', error);
    }
  };

  const deleteFolder = async (id: string) => {
    if (!user) return;

    try {
      // Move notes in this folder to "no folder"
      await supabase
        .from('notes')
        .update({ folder_id: null })
        .eq('folder_id', id)
        .eq('user_id', user.id);

      // Delete the folder
      const { error } = await supabase
        .from('note_folders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await Promise.all([fetchFolders(), fetchNotes()]);
    } catch (error: any) {
      console.error('Error deleting folder:', error);
    }
  };

  const getBacklinks = async (noteId: string): Promise<{ sourceId: string; title: string }[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_note_backlinks', {
        target_note_id: noteId,
      });

      if (error) throw error;

      return (data || []).map((bl: any) => ({
        sourceId: bl.source_id,
        title: bl.source_title,
      }));
    } catch (error: any) {
      console.error('Error getting backlinks:', error);
      return [];
    }
  };

  const searchNotes = (query: string): NoteCardData[] => {
    if (!query.trim()) return notes;

    const lowerQuery = query.toLowerCase();
    return notes.filter(note =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      note.bookName?.toLowerCase().includes(lowerQuery) ||
      note.linkedBooks.some(lb => lb.name.toLowerCase().includes(lowerQuery))
    );
  };

  return {
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
    getBacklinks,
    searchNotes,
    refetch,
  };
}
