import { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  MoreHorizontal,
  Edit2,
  Trash2,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string;
  color?: string;
  sortOrder: number;
  children?: NoteFolder[];
  noteCount?: number;
}

interface NoteFolderTreeProps {
  folders: NoteFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  noteCounts: Record<string, number>;
}

function buildFolderTree(folders: NoteFolder[]): NoteFolder[] {
  const folderMap = new Map<string, NoteFolder>();
  const rootFolders: NoteFolder[] = [];

  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  folderMap.forEach(folder => {
    if (folder.parentId && folderMap.has(folder.parentId)) {
      const parent = folderMap.get(folder.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(folder);
    } else {
      rootFolders.push(folder);
    }
  });

  const sortFolders = (arr: NoteFolder[]) => {
    arr.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    arr.forEach(f => f.children && sortFolders(f.children));
  };
  sortFolders(rootFolders);

  return rootFolders;
}

interface FolderItemProps {
  folder: NoteFolder;
  level: number;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  noteCounts: Record<string, number>;
}

function FolderItem({
  folder,
  level,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  noteCounts,
}: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [childName, setChildName] = useState('');

  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;
  const noteCount = noteCounts[folder.id] || 0;

  const handleRename = () => {
    if (newName.trim()) {
      onRenameFolder(folder.id, newName.trim());
      setIsRenaming(false);
    }
  };

  const handleCreateChild = () => {
    if (childName.trim()) {
      onCreateFolder(childName.trim(), folder.id);
      setChildName('');
      setIsCreatingChild(false);
    }
  };

  return (
    <div className="select-none">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer group',
            'hover:bg-muted/50',
            isSelected && 'bg-primary/10 text-primary'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-5" />
          )}

          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => onSelectFolder(folder.id)}
          >
            {isOpen && hasChildren ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}

            {isRenaming ? (
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                className="h-6 text-sm px-1"
                autoFocus
              />
            ) : (
              <span className="truncate text-sm">{folder.name}</span>
            )}

            {noteCount > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {noteCount}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsCreatingChild(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova subpasta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm('Excluir esta pasta? As notas serão movidas para "Sem pasta".')) {
                    onDeleteFolder(folder.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isCreatingChild && (
          <div
            className="flex items-center gap-2 px-2 py-1"
            style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}
          >
            <Input
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              onBlur={() => setIsCreatingChild(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateChild();
                if (e.key === 'Escape') setIsCreatingChild(false);
              }}
              placeholder="Nome da pasta"
              className="h-7 text-sm"
              autoFocus
            />
          </div>
        )}

        <CollapsibleContent>
          {folder.children?.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              noteCounts={noteCounts}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function NoteFolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  noteCounts,
}: NoteFolderTreeProps) {
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [rootName, setRootName] = useState('');

  const tree = buildFolderTree(folders);
  const totalNotes = Object.values(noteCounts).reduce((a, b) => a + b, 0);

  const handleCreateRoot = () => {
    if (rootName.trim()) {
      onCreateFolder(rootName.trim(), null);
      setRootName('');
      setIsCreatingRoot(false);
    }
  };

  return (
    <div className="space-y-1">
      {/* All notes */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer',
          'hover:bg-muted/50',
          selectedFolderId === null && 'bg-primary/10 text-primary'
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-4 w-4" />
        <span className="text-sm font-medium">Todas as Notas</span>
        <span className="text-xs text-muted-foreground ml-auto">{totalNotes}</span>
      </div>

      {/* Folder tree */}
      {tree.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          level={0}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onCreateFolder={onCreateFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          noteCounts={noteCounts}
        />
      ))}

      {/* Create new root folder */}
      {isCreatingRoot ? (
        <div className="flex items-center gap-2 px-3 py-1">
          <Input
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            onBlur={() => setIsCreatingRoot(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateRoot();
              if (e.key === 'Escape') setIsCreatingRoot(false);
            }}
            placeholder="Nome da pasta"
            className="h-7 text-sm"
            autoFocus
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => setIsCreatingRoot(true)}
        >
          <Plus className="h-4 w-4" />
          Nova pasta
        </Button>
      )}
    </div>
  );
}
