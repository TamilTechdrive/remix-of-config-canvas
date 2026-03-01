import { useCallback, useMemo, useState } from 'react';
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
import { useConfigEditor } from '@/hooks/useConfigEditor';
import type { ConfigNodeData, ConfigNodeType } from '@/types/configTypes';
import { SAMPLE_CONFIG } from '@/data/sampleConfig';
import { analyzeFullGraph } from '@/engine/ruleEngine';
import type { RuleIssue } from '@/engine/ruleEngine';
import { AlertCircle, Sparkles } from 'lucide-react';

const nodeTypes: NodeTypes = { configNode: ConfigNode };

const EditorCanvas = () => {
  const {
    nodes, edges, selectedNodeId, selectedNode,
    onNodesChange, onEdgesChange, onConnect,
    addNode, autoAddChild, updateNodeData, updateNodeProperty,
    deleteNode, setSelectedNodeId,
    exportConfig, importConfig, loadSampleData, autoResolveAll,
    addUserRule, removeUserRule, updateNodeMeta,
  } = useConfigEditor();

  const [showInsights, setShowInsights] = useState(false);
  const { screenToFlowPosition, setCenter } = useReactFlow();

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

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNodeId(node.id);
      setShowInsights(true);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setShowInsights(false);
  }, [setSelectedNodeId]);

  const onFocusNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.5, duration: 500 });
        setSelectedNodeId(nodeId);
        setShowInsights(true);
      }
    },
    [nodes, setCenter, setSelectedNodeId]
  );

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

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Status bar */}
      <div className="h-8 border-b border-border bg-surface-overlay flex items-center px-4 gap-4 text-xs">
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
      </div>

      <EditorToolbar
        onExport={exportConfig}
        onImport={importConfig}
        onLoadSample={loadSampleData}
        nodeCount={nodes.length}
        edgeCount={edges.length}
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
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(220 14% 18%)" />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as unknown as ConfigNodeData;
              const colors: Record<string, string> = {
                container: 'hsl(200, 60%, 50%)',
                module: 'hsl(160, 60%, 45%)',
                group: 'hsl(35, 80%, 55%)',
                option: 'hsl(260, 50%, 55%)',
              };
              return colors[data.type] || '#666';
            }}
            maskColor="hsla(220, 16%, 10%, 0.8)"
          />
        </ReactFlow>

        {/* Left palette */}
        <div className="absolute left-0 top-0 bottom-0 w-56 bg-surface-overlay border-r border-border overflow-y-auto z-10">
          <NodePalette />
        </div>

        {/* Right panel: Actions */}
        {selectedNode && showInsights && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex">
            <NodeActionsPanel
              nodeId={selectedNodeId!}
              nodes={nodes}
              edges={edges}
              rawConfig={SAMPLE_CONFIG}
              onClose={() => setShowInsights(false)}
              onFocusNode={onFocusNode}
              onFixIssue={onFixIssue}
              onAutoResolveAll={autoResolveAll}
              onToggleIncluded={onToggleIncluded}
              onAddUserRule={addUserRule}
              onRemoveUserRule={removeUserRule}
              onUpdateNodeMeta={updateNodeMeta}
            />
          </div>
        )}

        {selectedNode && !showInsights && (
          <div className="absolute right-0 top-0 bottom-0 z-10">
            <PropertiesPanel
              nodeId={selectedNodeId!}
              data={selectedNode.data as unknown as ConfigNodeData}
              onUpdate={updateNodeData}
              onClose={() => setSelectedNodeId(null)}
              onDelete={deleteNode}
              onAutoAdd={autoAddChild}
              edges={edges}
              allNodes={nodes}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const Index = () => (
  <ReactFlowProvider>
    <EditorCanvas />
  </ReactFlowProvider>
);

export default Index;
