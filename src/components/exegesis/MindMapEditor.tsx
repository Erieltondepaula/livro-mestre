import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type Viewport,
  BackgroundVariant,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Save, Trash2, Download, Upload, Palette, Type, Square, Circle,
  StickyNote, ArrowRight, Loader2, FileText, Search, Link2, Bold, Italic,
  ChevronDown, MoreHorizontal, Pencil, X, Check, FolderOpen, MapPin,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

// ─── Node Colors ───
const NODE_COLORS = [
  { label: 'Azul', bg: '#dbeafe', border: '#3b82f6', text: '#1e3a5f' },
  { label: 'Verde', bg: '#dcfce7', border: '#22c55e', text: '#14532d' },
  { label: 'Amarelo', bg: '#fef9c3', border: '#eab308', text: '#713f12' },
  { label: 'Vermelho', bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' },
  { label: 'Roxo', bg: '#f3e8ff', border: '#a855f7', text: '#581c87' },
  { label: 'Laranja', bg: '#ffedd5', border: '#f97316', text: '#7c2d12' },
  { label: 'Rosa', bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  { label: 'Cinza', bg: '#f3f4f6', border: '#6b7280', text: '#1f2937' },
];

const EDGE_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#f97316', '#ec4899', '#6b7280', '#eab308'];

// ─── Custom Node Types ───

function TextNode({ data, selected, id }: NodeProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.label as string || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const color = NODE_COLORS.find(c => c.bg === data.bgColor) || NODE_COLORS[0];
  const bgColor = (data.bgColor as string) || color.bg;
  const borderColor = (data.borderColor as string) || color.border;
  const textColor = (data.textColor as string) || color.text;
  const fontSize = (data.fontSize as number) || 14;
  const isBold = data.bold as boolean;
  const isItalic = data.italic as boolean;
  const shape = (data.shape as string) || 'rectangle';

  const borderRadius = shape === 'circle' ? '50%' : shape === 'sticky' ? '4px' : '8px';
  const minW = shape === 'circle' ? 120 : 160;
  const minH = shape === 'circle' ? 120 : 60;
  const stickyRotate = shape === 'sticky' ? 'rotate(-1deg)' : undefined;
  const stickyShadow = shape === 'sticky' ? '3px 3px 8px rgba(0,0,0,0.15)' : undefined;

  const handleDblClick = () => setEditing(true);
  const handleBlur = () => {
    setEditing(false);
    if (data.onLabelChange) (data.onLabelChange as (id: string, val: string) => void)(id, text);
  };

  return (
    <div
      onDoubleClick={handleDblClick}
      style={{
        background: bgColor,
        border: `2px solid ${selected ? '#2563eb' : borderColor}`,
        borderRadius,
        minWidth: minW,
        minHeight: minH,
        padding: shape === 'circle' ? '12px' : '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        boxShadow: stickyShadow || (selected ? '0 0 0 2px #2563eb40' : '0 1px 3px rgba(0,0,0,0.1)'),
        transform: stickyRotate,
        transition: 'box-shadow 0.15s',
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-primary/60" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-primary/60" />
      {editing ? (
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleBlur(); } }}
          className="bg-transparent border-none outline-none resize-none text-center w-full"
          style={{ color: textColor, fontSize, fontWeight: isBold ? 700 : 400, fontStyle: isItalic ? 'italic' : 'normal' }}
          rows={3}
        />
      ) : (
        <span
          className="text-center break-words max-w-[200px] select-none"
          style={{ color: textColor, fontSize, fontWeight: isBold ? 700 : 400, fontStyle: isItalic ? 'italic' : 'normal' }}
        >
          {(data.label as string) || 'Duplo-clique para editar'}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-primary/60" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-primary/60" />
    </div>
  );
}

const nodeTypes = { textNode: TextNode };

// ─── Main Component (inner, needs ReactFlowProvider) ───

interface MindMap {
  id: string;
  title: string;
  description: string | null;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  created_at: string;
  updated_at: string;
}

function MindMapInner() {
  const { user } = useAuth();
  const reactFlowInstance = useReactFlow();

  // State
  const [maps, setMaps] = useState<MindMap[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [mapTitle, setMapTitle] = useState('Novo Mapa Mental');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [edgeColor, setEdgeColor] = useState('#3b82f6');
  const [edgeType, setEdgeType] = useState<'default' | 'straight' | 'step'>('default');
  const [showMapList, setShowMapList] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const idCounter = useRef(1);

  // Fetch maps
  const fetchMaps = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('mind_maps')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) {
      const parsed = data.map((m: any) => ({
        ...m,
        nodes: Array.isArray(m.nodes) ? m.nodes : [],
        edges: Array.isArray(m.edges) ? m.edges : [],
        viewport: m.viewport && typeof m.viewport === 'object' ? m.viewport : { x: 0, y: 0, zoom: 1 },
      }));
      setMaps(parsed);
      // Load most recent if none selected
      if (!currentMapId && parsed.length > 0) {
        loadMap(parsed[0]);
      }
    }
    setLoading(false);
  }, [user, currentMapId]);

  useEffect(() => { fetchMaps(); }, [fetchMaps]);

  const loadMap = (map: MindMap) => {
    setCurrentMapId(map.id);
    setMapTitle(map.title);
    // Re-attach onLabelChange callbacks to nodes
    const nodesWithCallbacks = map.nodes.map(n => ({
      ...n,
      data: { ...n.data, onLabelChange: handleLabelChange },
    }));
    setNodes(nodesWithCallbacks);
    setEdges(map.edges);
    if (map.viewport) {
      setTimeout(() => reactFlowInstance.setViewport(map.viewport), 50);
    }
    idCounter.current = Math.max(1, ...map.nodes.map(n => parseInt(n.id.replace('node-', '')) || 0)) + 1;
  };

  // Save
  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const viewport = reactFlowInstance.getViewport();
    // Strip callbacks from nodes before saving
    const cleanNodes = nodes.map(n => ({ ...n, data: { ...n.data, onLabelChange: undefined } }));

    if (currentMapId) {
      const { error } = await supabase
        .from('mind_maps')
        .update({ title: mapTitle, nodes: cleanNodes as any, edges: edges as any, viewport: viewport as any, updated_at: new Date().toISOString() })
        .eq('id', currentMapId);
      if (!error) toast({ title: 'Mapa salvo!' });
      else toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } else {
      const { data, error } = await supabase
        .from('mind_maps')
        .insert({ user_id: user.id, title: mapTitle, nodes: cleanNodes as any, edges: edges as any, viewport: viewport as any })
        .select()
        .single();
      if (data) { setCurrentMapId(data.id); toast({ title: 'Mapa criado!' }); }
      else if (error) toast({ title: 'Erro ao criar', variant: 'destructive' });
    }
    setSaving(false);
    fetchMaps();
  }, [user, currentMapId, mapTitle, nodes, edges, reactFlowInstance, fetchMaps]);

  // New map
  const handleNewMap = () => {
    setCurrentMapId(null);
    setMapTitle('Novo Mapa Mental');
    setNodes([]);
    setEdges([]);
    idCounter.current = 1;
  };

  // Delete map
  const handleDeleteMap = async () => {
    if (!currentMapId) return;
    const { error } = await supabase.from('mind_maps').delete().eq('id', currentMapId);
    if (!error) {
      toast({ title: 'Mapa excluído' });
      handleNewMap();
      fetchMaps();
    }
  };

  // Label change
  const handleLabelChange = useCallback((nodeId: string, newLabel: string) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n));
  }, [setNodes]);

  // Add node
  const addNode = (shape: string = 'rectangle', colorIdx: number = 0) => {
    const color = NODE_COLORS[colorIdx % NODE_COLORS.length];
    const viewport = reactFlowInstance.getViewport();
    const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
    const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
    const newNode: Node = {
      id: `node-${idCounter.current++}`,
      type: 'textNode',
      position: { x: centerX - 80 + Math.random() * 40, y: centerY - 30 + Math.random() * 40 },
      data: {
        label: '',
        shape,
        bgColor: color.bg,
        borderColor: color.border,
        textColor: color.text,
        fontSize: 14,
        bold: false,
        italic: false,
        onLabelChange: handleLabelChange,
      },
    };
    setNodes(nds => [...nds, newNode]);
  };

  // Connect
  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({
      ...params,
      type: edgeType === 'default' ? 'default' : edgeType,
      animated: false,
      style: { stroke: edgeColor, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    }, eds));
  }, [setEdges, edgeColor, edgeType]);

  // Selection
  const onSelectionChange = useCallback(({ nodes: selNodes }: { nodes: Node[] }) => {
    setSelectedNodeIds(selNodes.map(n => n.id));
  }, []);

  // Delete selected
  const deleteSelected = () => {
    if (selectedNodeIds.length === 0) return;
    setNodes(nds => nds.filter(n => !selectedNodeIds.includes(n.id)));
    setEdges(eds => eds.filter(e => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)));
    setSelectedNodeIds([]);
  };

  // Change node style
  const updateSelectedNodes = (updates: Record<string, any>) => {
    setNodes(nds => nds.map(n => {
      if (selectedNodeIds.includes(n.id)) {
        return { ...n, data: { ...n.data, ...updates } };
      }
      return n;
    }));
  };

  // Export as JSON
  const exportMap = () => {
    const cleanNodes = nodes.map(n => ({ ...n, data: { ...n.data, onLabelChange: undefined } }));
    const data = { title: mapTitle, nodes: cleanNodes, edges, viewport: reactFlowInstance.getViewport() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapTitle.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const importMap = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.nodes && data.edges) {
          const nodesWithCb = data.nodes.map((n: Node) => ({ ...n, data: { ...n.data, onLabelChange: handleLabelChange } }));
          setNodes(nodesWithCb);
          setEdges(data.edges);
          setMapTitle(data.title || 'Mapa Importado');
          setCurrentMapId(null);
          idCounter.current = Math.max(1, ...data.nodes.map((n: Node) => parseInt(n.id.replace('node-', '')) || 0)) + 1;
          toast({ title: 'Mapa importado!' });
        }
      } catch { toast({ title: 'Arquivo inválido', variant: 'destructive' }); }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="card-library p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <h3 className="font-bold text-sm sm:text-base truncate">{mapTitle}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setNewTitle(mapTitle); setRenameOpen(true); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <DropdownMenu open={showMapList} onOpenChange={setShowMapList}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <FolderOpen className="w-3.5 h-3.5" /> Mapas ({maps.length}) <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-64 overflow-y-auto">
                <DropdownMenuItem onClick={handleNewMap} className="gap-2">
                  <Plus className="w-4 h-4" /> Novo Mapa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {maps.map(m => (
                  <DropdownMenuItem key={m.id} onClick={() => loadMap(m)} className={`gap-2 ${m.id === currentMapId ? 'bg-primary/10' : ''}`}>
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1">{m.title}</span>
                    <span className="text-[10px] text-muted-foreground">{m.nodes.length}n</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="default" size="sm" className="gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportMap} className="gap-2"><Download className="w-4 h-4" /> Exportar JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={importMap} className="gap-2"><Upload className="w-4 h-4" /> Importar JSON</DropdownMenuItem>
                <DropdownMenuSeparator />
                {currentMapId && (
                  <DropdownMenuItem onClick={handleDeleteMap} className="gap-2 text-destructive"><Trash2 className="w-4 h-4" /> Excluir Mapa</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card-library p-2 sm:p-3 flex items-center gap-1.5 flex-wrap">
        {/* Add shapes */}
        <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => addNode('rectangle')}>
            <Square className="w-3.5 h-3.5" /> Retângulo
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => addNode('circle')}>
            <Circle className="w-3.5 h-3.5" /> Círculo
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => addNode('sticky', 2)}>
            <StickyNote className="w-3.5 h-3.5" /> Nota
          </Button>
        </div>

        {/* Node colors */}
        {selectedNodeIds.length > 0 && (
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
            {NODE_COLORS.map((c, i) => (
              <button
                key={c.label}
                className="w-5 h-5 rounded-full border border-border hover:scale-125 transition-transform"
                style={{ background: c.bg, borderColor: c.border }}
                title={c.label}
                onClick={() => updateSelectedNodes({ bgColor: c.bg, borderColor: c.border, textColor: c.text })}
              />
            ))}
          </div>
        )}

        {/* Text style */}
        {selectedNodeIds.length > 0 && (
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              const node = nodes.find(n => selectedNodeIds.includes(n.id));
              updateSelectedNodes({ bold: !node?.data?.bold });
            }}>
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              const node = nodes.find(n => selectedNodeIds.includes(n.id));
              updateSelectedNodes({ italic: !node?.data?.italic });
            }}>
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <select
              className="h-7 text-xs bg-background border border-border rounded px-1"
              onChange={(e) => updateSelectedNodes({ fontSize: parseInt(e.target.value) })}
              defaultValue="14"
            >
              <option value="10">10px</option>
              <option value="12">12px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="20">20px</option>
              <option value="24">24px</option>
            </select>
          </div>
        )}

        {/* Edge style */}
        <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
          <span className="text-[10px] text-muted-foreground">Linha:</span>
          {EDGE_COLORS.slice(0, 5).map(c => (
            <button
              key={c}
              className={`w-4 h-4 rounded-full border ${edgeColor === c ? 'ring-2 ring-primary ring-offset-1' : 'border-border'}`}
              style={{ background: c }}
              onClick={() => setEdgeColor(c)}
            />
          ))}
          <select
            className="h-7 text-[10px] bg-background border border-border rounded px-1"
            value={edgeType}
            onChange={(e) => setEdgeType(e.target.value as any)}
          >
            <option value="default">Curva</option>
            <option value="straight">Reta</option>
            <option value="step">Degrau</option>
          </select>
        </div>

        {/* Delete */}
        {selectedNodeIds.length > 0 && (
          <Button variant="destructive" size="sm" className="gap-1 text-xs h-8" onClick={deleteSelected}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir ({selectedNodeIds.length})
          </Button>
        )}
      </div>

      {/* Canvas */}
      <div className="card-library overflow-hidden" style={{ height: 'calc(100vh - 320px)', minHeight: 450 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
          className="bg-background"
          defaultEdgeOptions={{
            type: edgeType,
            style: { stroke: edgeColor, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
          <Controls
            showInteractive={false}
            className="!bg-card !border-border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground"
          />
          <MiniMap
            nodeColor={(n) => (n.data?.borderColor as string) || '#3b82f6'}
            className="!bg-card !border-border"
            maskColor="hsl(var(--background) / 0.7)"
          />
          <Panel position="bottom-center" className="text-[10px] text-muted-foreground bg-card/80 px-2 py-0.5 rounded">
            Arraste para mover • Duplo-clique para editar texto • Conecte arrastando dos pontos
          </Panel>
        </ReactFlow>
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Renomear Mapa</DialogTitle></DialogHeader>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nome do mapa" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setMapTitle(newTitle); setRenameOpen(false); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Wrapper with ReactFlowProvider ───
export function MindMapEditor() {
  return (
    <ReactFlowProvider>
      <MindMapInner />
    </ReactFlowProvider>
  );
}
