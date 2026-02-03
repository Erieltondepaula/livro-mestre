import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Pin, 
  Archive, 
  Book, 
  Link2, 
  MoreHorizontal,
  Edit2,
  Trash2,
  Clock,
  FileText,
  Lightbulb,
  BookOpen,
  Bookmark
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface NoteCardData {
  id: string;
  title: string;
  content: string;
  contentHtml?: string;
  tags: string[];
  noteType: 'fleeting' | 'permanent' | 'literature' | 'reference';
  isPinned: boolean;
  archived: boolean;
  bookName?: string | null;
  linkedBooks: { id: string; name: string }[];
  backlinksCount: number;
  wordCount: number;
  updatedAt: string;
  createdAt: string;
}

interface NoteCardProps {
  note: NoteCardData;
  isSelected?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
}

const noteTypeIcons: Record<string, typeof FileText> = {
  fleeting: Lightbulb,
  permanent: FileText,
  literature: BookOpen,
  reference: Bookmark,
};

const noteTypeLabels: Record<string, string> = {
  fleeting: 'Efêmera',
  permanent: 'Permanente',
  literature: 'Literária',
  reference: 'Referência',
};

const noteTypeColors: Record<string, string> = {
  fleeting: 'text-amber-500',
  permanent: 'text-primary',
  literature: 'text-emerald-500',
  reference: 'text-violet-500',
};

export const NoteCard = memo(function NoteCard({
  note,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
}: NoteCardProps) {
  const TypeIcon = noteTypeIcons[note.noteType] || FileText;
  
  // Extract plain text preview from content (strip HTML if present)
  const getPreview = () => {
    if (note.contentHtml) {
      const doc = new DOMParser().parseFromString(note.contentHtml, 'text/html');
      return doc.body.textContent || '';
    }
    return note.content;
  };

  const preview = getPreview().slice(0, 150);

  return (
    <div
      className={cn(
        'group relative p-4 rounded-lg border bg-card cursor-pointer transition-all',
        'hover:shadow-md hover:border-primary/30',
        isSelected && 'ring-2 ring-primary border-primary',
        note.archived && 'opacity-60'
      )}
      onClick={onClick}
    >
      {/* Pin indicator */}
      {note.isPinned && (
        <Pin className="absolute top-2 right-2 h-4 w-4 text-primary fill-primary" />
      )}

      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <TypeIcon className={cn('h-4 w-4 mt-0.5 shrink-0', noteTypeColors[note.noteType])} />
        <h4 className="font-semibold text-foreground flex-1 line-clamp-2 pr-6">
          {note.title}
        </h4>
      </div>

      {/* Preview */}
      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
        {preview}
        {note.content.length > 150 && '...'}
      </p>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {note.tags.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{note.tags.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Book references */}
      {(note.bookName || note.linkedBooks.length > 0) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.bookName && (
            <Badge variant="outline" className="text-xs">
              <Book className="h-3 w-3 mr-1" />
              {note.bookName}
            </Badge>
          )}
          {note.linkedBooks.slice(0, 2).map((lb) => (
            <Badge key={lb.id} variant="outline" className="text-xs opacity-70">
              <Link2 className="h-3 w-3 mr-1" />
              {lb.name}
            </Badge>
          ))}
          {note.linkedBooks.length > 2 && (
            <Badge variant="outline" className="text-xs opacity-70">
              +{note.linkedBooks.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(note.updatedAt), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </span>
          {note.backlinksCount > 0 && (
            <span className="flex items-center gap-1" title="Backlinks">
              <Link2 className="h-3 w-3" />
              {note.backlinksCount}
            </span>
          )}
        </div>
        <span>{note.wordCount} palavras</span>
      </div>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin(); }}>
            <Pin className="h-4 w-4 mr-2" />
            {note.isPinned ? 'Desafixar' : 'Fixar'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleArchive(); }}>
            <Archive className="h-4 w-4 mr-2" />
            {note.archived ? 'Desarquivar' : 'Arquivar'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => { 
              e.stopPropagation(); 
              if (confirm('Excluir esta nota permanentemente?')) {
                onDelete();
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
