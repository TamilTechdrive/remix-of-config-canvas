import { useEffect, useRef, useState } from 'react';
import {
  Trash2, Copy, Link2, Unlink, Eye, EyeOff, ToggleLeft,
  Sparkles, Clipboard, ExternalLink, ChevronRight, Unlink2,
} from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { ConfigNodeData } from '@/types/configTypes';

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}

interface NodeContextMenuProps {
  state: ContextMenuState;
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onToggleIncluded: (nodeId: string) => void;
  onToggleVisible: (nodeId: string) => void;
  onFocusNode: (nodeId: string) => void;
  onShowInsights: (nodeId: string) => void;
  onDisconnectAll: (nodeId: string) => void;
  onDisconnectEdge: (edgeId: string) => void;
  onCopyNodeId: (nodeId: string) => void;
}

const NodeContextMenu = ({
  state, nodes, edges, onClose, onDelete, onToggleIncluded,
  onToggleVisible, onFocusNode, onShowInsights, onDisconnectAll, onDisconnectEdge, onCopyNodeId,
}: NodeContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [adjustedPos, setAdjustedPos] = useState({ x: state.x, y: state.y });

  useEffect(() => {
    if (!state.show || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setAdjustedPos({
      x: state.x + rect.width > vw ? Math.max(0, vw - rect.width - 8) : state.x,
      y: state.y + rect.height > vh ? Math.max(0, vh - rect.height - 8) : state.y,
    });
  }, [state.show, state.x, state.y]);

  useEffect(() => {
    if (!state.show) return;
    setShowConnections(false);
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('contextmenu', handleClick);
      document.addEventListener('keydown', handleKey);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('contextmenu', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [state.show, onClose]);

  if (!state.show || !state.nodeId) return null;

  const node = nodes.find(n => n.id === state.nodeId);
  if (!node) return null;
  const data = node.data as unknown as ConfigNodeData;
  const isIncluded = data.properties?.included === true;

  const connectedEdges = edges.filter(e => e.source === state.nodeId || e.target === state.nodeId);
  const outgoing = edges.filter(e => e.source === state.nodeId);
  const incoming = edges.filter(e => e.target === state.nodeId);

  const getNodeLabel = (nodeId: string) => {
    const n = nodes.find(nd => nd.id === nodeId);
    return n ? (n.data as unknown as ConfigNodeData).label : nodeId;
  };

  const getNodeType = (nodeId: string) => {
    const n = nodes.find(nd => nd.id === nodeId);
    return n ? (n.data as unknown as ConfigNodeData).type : '';
  };

  const typeColorMap: Record<string, string> = {
    container: 'text-node-container',
    module: 'text-node-module',
    group: 'text-node-group',
    option: 'text-node-option',
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[240px] bg-popover border border-border rounded-lg shadow-2xl py-1.5 animate-in fade-in-0 zoom-in-95"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border mb-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{data.type}</p>
        <p className="text-xs font-semibold text-foreground truncate max-w-[210px]">{data.label}</p>
      </div>

      {!showConnections ? (
        <>
          {/* Include/Exclude */}
          <MenuItem icon={ToggleLeft} label={isIncluded ? 'Exclude Node' : 'Include Node'}
            onClick={() => { onToggleIncluded(state.nodeId!); onClose(); }} />
          <MenuItem icon={data.visible ? EyeOff : Eye} label={data.visible ? 'Hide Node' : 'Show Node'}
            onClick={() => { onToggleVisible(state.nodeId!); onClose(); }} />

          <Separator />

          {/* Dependencies info */}
          <MenuItem icon={Link2} label={`Dependencies (${outgoing.length})`}
            onClick={() => { onShowInsights(state.nodeId!); onClose(); }} />
          <MenuItem icon={ExternalLink} label={`Dependents (${incoming.length})`}
            onClick={() => { onShowInsights(state.nodeId!); onClose(); }} />
          <MenuItem icon={Sparkles} label="AI Insights" className="text-accent"
            onClick={() => { onShowInsights(state.nodeId!); onClose(); }} />

          <Separator />

          {/* Disconnect submenu trigger */}
          {connectedEdges.length > 0 && (
            <button
              onClick={() => setShowConnections(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary/80 transition-colors rounded-sm text-node-group"
            >
              <Unlink2 className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">Disconnect Target...</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
          <MenuItem icon={Unlink} label={`Disconnect All (${connectedEdges.length})`}
            onClick={() => { onDisconnectAll(state.nodeId!); onClose(); }}
            className="text-node-group" disabled={connectedEdges.length === 0} />

          <Separator />

          <MenuItem icon={Clipboard} label="Copy Node ID"
            onClick={() => { onCopyNodeId(state.nodeId!); onClose(); }} />
          <MenuItem icon={Trash2} label="Delete Node" className="text-destructive"
            onClick={() => { onDelete(state.nodeId!); onClose(); }} />
        </>
      ) : (
        <>
          {/* Back button */}
          <button
            onClick={() => setShowConnections(false)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary/80 transition-colors text-muted-foreground"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Back
          </button>
          <Separator />

          {/* Outgoing connections */}
          {outgoing.length > 0 && (
            <div className="px-3 py-1">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Outgoing</p>
            </div>
          )}
          {outgoing.map(edge => {
            const targetLabel = getNodeLabel(edge.target);
            const targetType = getNodeType(edge.target);
            return (
              <button
                key={edge.id}
                onClick={() => { onDisconnectEdge(edge.id); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-destructive/10 transition-colors rounded-sm group/edge"
              >
                <Unlink2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover/edge:text-destructive" />
                <span className={`text-[9px] uppercase font-bold ${typeColorMap[targetType] || ''}`}>{targetType}</span>
                <span className="flex-1 text-left truncate text-foreground">{targetLabel}</span>
              </button>
            );
          })}

          {/* Incoming connections */}
          {incoming.length > 0 && (
            <div className="px-3 py-1">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Incoming</p>
            </div>
          )}
          {incoming.map(edge => {
            const sourceLabel = getNodeLabel(edge.source);
            const sourceType = getNodeType(edge.source);
            return (
              <button
                key={edge.id}
                onClick={() => { onDisconnectEdge(edge.id); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-destructive/10 transition-colors rounded-sm group/edge"
              >
                <Unlink2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover/edge:text-destructive" />
                <span className={`text-[9px] uppercase font-bold ${typeColorMap[sourceType] || ''}`}>{sourceType}</span>
                <span className="flex-1 text-left truncate text-foreground">{sourceLabel}</span>
              </button>
            );
          })}

          {connectedEdges.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No connections</p>
          )}
        </>
      )}
    </div>
  );
};

const Separator = () => <div className="h-px bg-border my-1 mx-2" />;

const MenuItem = ({ icon: Icon, label, onClick, className = '', disabled = false }: {
  icon: React.ElementType; label: string; onClick: () => void; className?: string; disabled?: boolean;
}) => (
  <button
    disabled={disabled}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-secondary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-sm ${className}`}
  >
    <Icon className="w-3.5 h-3.5 shrink-0" />
    {label}
  </button>
);

export default NodeContextMenu;
export type { ContextMenuState };
