import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ConfigNode from '@/components/editor/ConfigNode';
import NodePalette from '@/components/editor/NodePalette';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import EditorToolbar from '@/components/editor/EditorToolbar';
import NodeActionsPanel from '@/components/editor/NodeActionsPanel';
import NodeContextMenu, { type ContextMenuState } from '@/components/editor/NodeContextMenu';
import { useConfigEditor } from '@/hooks/useConfigEditor';
import type { ConfigNodeData, ConfigNodeType } from '@/types/configTypes';
import { SAMPLE_CONFIG } from '@/data/sampleConfig';
import { analyzeFullGraph } from '@/engine/ruleEngine';
import type { RuleIssue } from '@/engine/ruleEngine';
import { AlertCircle, Sparkles, Save, CheckCircle2, Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

const nodeTypes: NodeTypes = { configNode: ConfigNode };
const AUTO_SAVE_INTERVAL = 30000;

const EditorCanvas = () => {
  const {
    nodes, edges, selectedNodeId, selectedNode,
    onNodesChange, onEdgesChange, onConnect,
    addNode, autoAddChild, updateNodeData, updateNodeProperty,
    deleteNode, setSelectedNodeId,
    exportConfig, importConfig, loadSampleData, autoResolveAll,
    addUserRule, removeUserRule, updateNodeMeta,
    disconnectAllEdges, disconnectEdge,
  } = useConfigEditor();

  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [rightPanel, setRightPanel] = useState<'none' | 'actions' | 'properties'>('none');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const stored = localStorage.getItem('configflow_autosave_enabled');
    return stored !== null ? stored === 'true' : true;
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'off'>('idle');
  const { screenToFlowPosition, setCenter } = useReactFlow();

  // Auto-save to localStorage
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSaveRef = useRef<string>('');

  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled(prev => {
      const next = !prev;
      localStorage.setItem('configflow_autosave_enabled', String(next));
      if (!next) {
        setAutoSaveStatus('off');
        toast.info('Auto-save disabled');
      } else {
        setAutoSaveStatus('idle');
        toast.success('Auto-save enabled');
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!autoSaveEnabled) {
      clearInterval(saveTimerRef.current);
      return;
    }
    saveTimerRef.current = setInterval(() => {
      const data = JSON.stringify({ nodes, edges });
      if (data !== lastSaveRef.current) {
        setAutoSaveStatus('saving');
        try {
          localStorage.setItem('configflow_autosave', data);
          localStorage.setItem('configflow_autosave_time', new Date().toISOString());
          lastSaveRef.current = data;
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } catch {
          setAutoSaveStatus('idle');
        }
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(saveTimerRef.current);
  }, [nodes, edges, autoSaveEnabled]);

  // Load autosave on mount
  useEffect(() => {
    const saved = localStorage.getItem('configflow_autosave');
    if (saved) {
      lastSaveRef.current = saved;
    }
  }, []);

  // Confirmed critical actions
  const confirmedDeleteNode = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    const label = node ? (node.data as unknown as ConfigNodeData).label : nodeId;
    const ok = await confirm({
      title: 'Delete Node',
      description: `Are you sure you want to delete "${label}"? This will also remove all its connections.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (ok) deleteNode(nodeId);
  }, [nodes, confirm, deleteNode]);

  const confirmedDisconnectAll = useCallback(async (nodeId: string) => {
    const count = edges.filter(e => e.source === nodeId || e.target === nodeId).length;
    if (count === 0) return;
    const ok = await confirm({
      title: 'Disconnect All',
      description: `Remove all ${count} connection(s) from this node?`,
      confirmLabel: 'Disconnect All',
      variant: 'destructive',
    });
    if (ok) disconnectAllEdges(nodeId);
  }, [edges, confirm, disconnectAllEdges]);

  const onFixIssue = useCallback(
    (issue: RuleIssue) => {
      if (!issue.fix) return;
      if (issue.fix.action === 'add_option') {
        updateNodeProperty(issue.fix.payload.nodeId, 'included', true);
      } else if (issue.fix.action === 'remove_option') {
        updateNodeProperty(issue.fix.payload.nodeId, 'included', false);
      }
    },
    [updateNodeProperty]
  );

  const onToggleIncluded = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const data = node.data as unknown as ConfigNodeData;
      const current = data.properties?.included === true;
      updateNodeProperty(nodeId, 'included', !current);
    },
    [nodes, updateNodeProperty]
  );

  // ── Confirmed critical actions ──────────────────────────────

  const confirmedAutoResolveAll = useCallback(async (fixes: Array<{ action: string; payload: Record<string, string> }>) => {
    const ok = await confirm({
      title: 'Auto-Resolve All Issues',
      description: `Apply ${fixes.length} automatic fix(es)? This will modify node properties.`,
      confirmLabel: 'Apply Fixes',
    });
    if (ok) autoResolveAll(fixes);
  }, [confirm, autoResolveAll]);

  const confirmedDisconnectEdge = useCallback(async (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    const srcLabel = (nodes.find(n => n.id === edge.source)?.data as unknown as ConfigNodeData)?.label || edge.source;
    const tgtLabel = (nodes.find(n => n.id === edge.target)?.data as unknown as ConfigNodeData)?.label || edge.target;
    const ok = await confirm({
      title: 'Disconnect Edge',
      description: `Remove connection from "${srcLabel}" → "${tgtLabel}"?`,
      confirmLabel: 'Disconnect',
      variant: 'destructive',
    });
    if (ok) disconnectEdge(edgeId);
  }, [edges, nodes, confirm, disconnectEdge]);

  const confirmedLoadSample = useCallback(async () => {
    const ok = await confirm({
      title: 'Load Sample Data',
      description: 'This will replace all current nodes and connections with sample data. Unsaved changes will be lost.',
      confirmLabel: 'Load Sample',
      variant: 'destructive',
    });
    if (ok) loadSampleData();
  }, [confirm, loadSampleData]);

  const confirmedImport = useCallback(async () => {
    const ok = await confirm({
      title: 'Import Configuration',
      description: 'Importing will replace all current nodes and connections. Unsaved changes will be lost.',
      confirmLabel: 'Continue Import',
      variant: 'destructive',
    });
    if (ok) importConfig();
  }, [confirm, importConfig]);

  const confirmedToggleIncluded = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const data = node.data as unknown as ConfigNodeData;
    const current = data.properties?.included === true;
    const action = current ? 'Exclude' : 'Include';
    const ok = await confirm({
      title: `${action} Node`,
      description: `${action} "${data.label}" ${current ? 'from' : 'in'} the configuration?`,
      confirmLabel: action,
    });
    if (ok) onToggleIncluded(nodeId);
  }, [nodes, confirm, onToggleIncluded]);

  const confirmedRemoveUserRule = useCallback(async (nodeId: string, ruleId: string) => {
    const ok = await confirm({
      title: 'Remove Rule',
      description: 'Are you sure you want to remove this user-defined rule?',
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (ok) removeUserRule(nodeId, ruleId);
  }, [confirm, removeUserRule]);

  const confirmedFixIssue = useCallback(async (issue: RuleIssue) => {
    if (!issue.fix) return;
    const ok = await confirm({
      title: 'Apply Fix',
      description: `Apply "${issue.fix.label}" to resolve: ${issue.title}?`,
      confirmLabel: 'Apply Fix',
    });
    if (ok) onFixIssue(issue);
  }, [confirm, onFixIssue]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === 'Escape') {
        setRightPanel('none');
        setSelectedNodeId(null);
      } else if (e.key === 'p' || e.key === 'P') {
        if (selectedNodeId) setRightPanel((prev) => prev === 'properties' ? 'none' : 'properties');
      } else if (e.key === 'a' || e.key === 'A') {
        if (selectedNodeId) setRightPanel((prev) => prev === 'actions' ? 'none' : 'actions');
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && rightPanel === 'none') {
        confirmedDeleteNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, rightPanel, setSelectedNodeId, confirmedDeleteNode]);

  const graphAnalysis = useMemo(
    () => analyzeFullGraph(nodes, edges, SAMPLE_CONFIG),
    [nodes, edges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as ConfigNodeType;
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, position);
    },
    [addNode, screenToFlowPosition]
  );

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ show: false, x: 0, y: 0, nodeId: null });

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNodeId(node.id);
      setRightPanel((prev) => prev === 'none' ? 'properties' : prev);
    },
    [setSelectedNodeId]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({ show: true, x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setRightPanel('none');
  }, [setSelectedNodeId]);

  const onFocusNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.5, duration: 500 });
        setSelectedNodeId(nodeId);
        setRightPanel('actions');
      }
    },
    [nodes, setCenter, setSelectedNodeId]
  );

  const onToggleVisible = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const data = node.data as unknown as ConfigNodeData;
      updateNodeData(nodeId, { visible: !data.visible });
    },
    [nodes, updateNodeData]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: { id: string }) => {
      // Select edge for potential deletion
    },
    []
  );

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Status bar */}
      <div className="h-8 border-b border-border bg-surface-overlay flex items-center px-4 gap-4 text-xs shrink-0">
        <span className="text-muted-foreground font-medium">ConfigFlow AI</span>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 text-destructive" />
          <span className="text-muted-foreground">{graphAnalysis.totalIssues} issues</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-accent" />
          <span className="text-muted-foreground">{graphAnalysis.totalConflicts} conflicts</span>
        </div>
        <span className="text-muted-foreground ml-auto">{nodes.length} nodes · {edges.length} edges</span>
        {/* Auto-save indicator with toggle */}
        <button
          onClick={toggleAutoSave}
          className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded hover:bg-secondary transition-colors"
          title={autoSaveEnabled ? 'Click to disable auto-save' : 'Click to enable auto-save'}
        >
          {!autoSaveEnabled && (
            <><Power className="w-3 h-3 text-muted-foreground/40" /><span className="text-muted-foreground/40 line-through">Auto-save</span></>
          )}
          {autoSaveEnabled && autoSaveStatus === 'saving' && (
            <><Loader2 className="w-3 h-3 text-primary animate-spin" /><span className="text-primary">Saving...</span></>
          )}
          {autoSaveEnabled && autoSaveStatus === 'saved' && (
            <><CheckCircle2 className="w-3 h-3 text-node-module" /><span className="text-node-module">Saved</span></>
          )}
          {autoSaveEnabled && (autoSaveStatus === 'idle' || autoSaveStatus === 'off') && (
            <><Save className="w-3 h-3 text-primary/60" /><span className="text-primary/60">Auto-save</span></>
          )}
        </button>
      </div>

      <EditorToolbar
        onExport={exportConfig}
        onImport={confirmedImport}
        onLoadSample={confirmedLoadSample}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        onCloudSave={() => {
          const config = exportConfig('json');
          return { nodes: nodes.map(n => ({ ...n })), edges: edges.map(e => ({ ...e })), exportedConfig: config };
        }}
        onCloudLoad={(data: Record<string, unknown>) => {
          if (data && typeof data === 'object') {
            importConfig();
          }
        }}
      />

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onEdgeClick={onEdgeClick}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          deleteKeyCode={['Backspace', 'Delete']}
          defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
          proOptions={{ hideAttribution: true }}
          edgesReconnectable
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(218 16% 82%)" />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as unknown as ConfigNodeData;
              const colors: Record<string, string> = {
                container: 'hsl(200, 55%, 52%)',
                module: 'hsl(168, 55%, 48%)',
                group: 'hsl(38, 75%, 55%)',
                option: 'hsl(250, 45%, 58%)',
              };
              return colors[data.type] || '#666';
            }}
            maskColor="hsla(218, 20%, 96%, 0.85)"
          />
        </ReactFlow>

        {/* Left palette */}
        <div className="absolute left-0 top-0 bottom-0 w-56 bg-surface-overlay border-r border-border overflow-y-auto z-10">
          <NodePalette />
        </div>

        {/* Right panel with tab toggle */}
        {selectedNode && rightPanel !== 'none' && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex flex-col">
            {/* Panel switcher tabs */}
            <div className="flex bg-surface-overlay border-b border-l border-border">
              <button
                onClick={() => setRightPanel('properties')}
                className={`px-4 py-2 text-xs font-medium transition-colors ${rightPanel === 'properties' ? 'text-primary border-b-2 border-primary bg-card' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Properties
              </button>
              <button
                onClick={() => setRightPanel('actions')}
                className={`px-4 py-2 text-xs font-medium transition-colors ${rightPanel === 'actions' ? 'text-primary border-b-2 border-primary bg-card' : 'text-muted-foreground hover:text-foreground'}`}
              >
                AI Actions
              </button>
            </div>

            {rightPanel === 'actions' && (
              <div className="flex-1 min-h-0">
                <NodeActionsPanel
                  nodeId={selectedNodeId!}
                  nodes={nodes}
                  edges={edges}
                  rawConfig={SAMPLE_CONFIG}
                  onClose={() => setRightPanel('none')}
                  onFocusNode={onFocusNode}
                  onFixIssue={confirmedFixIssue}
                  onAutoResolveAll={confirmedAutoResolveAll}
                  onToggleIncluded={confirmedToggleIncluded}
                  onAddUserRule={addUserRule}
                  onRemoveUserRule={confirmedRemoveUserRule}
                  onUpdateNodeMeta={updateNodeMeta}
                />
              </div>
            )}

            {rightPanel === 'properties' && (
              <div className="flex-1 min-h-0">
                <PropertiesPanel
                  nodeId={selectedNodeId!}
                  data={selectedNode.data as unknown as ConfigNodeData}
                  onUpdate={updateNodeData}
                  onClose={() => setRightPanel('none')}
                  onDelete={confirmedDeleteNode}
                  onAutoAdd={autoAddChild}
                  edges={edges}
                  allNodes={nodes}
                />
              </div>
            )}
          </div>
        )}

        {/* Context Menu */}
        <NodeContextMenu
          state={contextMenu}
          nodes={nodes}
          edges={edges}
          onClose={() => setContextMenu({ show: false, x: 0, y: 0, nodeId: null })}
          onDelete={confirmedDeleteNode}
          onToggleIncluded={confirmedToggleIncluded}
          onToggleVisible={onToggleVisible}
          onFocusNode={onFocusNode}
          onShowInsights={(nodeId) => { setSelectedNodeId(nodeId); setRightPanel('actions'); }}
          onDisconnectAll={confirmedDisconnectAll}
          onDisconnectEdge={confirmedDisconnectEdge}
          onCopyNodeId={(nodeId) => { navigator.clipboard.writeText(nodeId); toast.success('Node ID copied'); }}
        />
      </div>
      <ConfirmDialog />
    </div>
  );
};

const Editor = () => (
  <ReactFlowProvider>
    <EditorCanvas />
  </ReactFlowProvider>
);

export default Editor;
