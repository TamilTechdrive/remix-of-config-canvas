import { useState, useMemo, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Minus, RefreshCw, ArrowRight, CheckCircle2, XCircle,
  ArrowDown, GitCompare, AlertTriangle, Package, Tv, GitBranch,
} from 'lucide-react';
import { useProjectStore } from '@/hooks/useProjectStore';
import { diffConfigs, getDiffSummary, type DiffItem, type DiffAction } from '@/engine/configDiff';
import type { Node, Edge } from '@xyflow/react';
import { MODULE_TYPE_META } from '@/types/projectTypes';
import { toast } from 'sonner';

interface ImportCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current working nodes & edges */
  currentNodes: Node[];
  currentEdges: Edge[];
  /** Called with the final merged nodes & edges after user applies actions */
  onApply: (nodes: Node[], edges: Edge[]) => void;
  /** Context: limit source picker scope */
  mode?: 'module' | 'build';
}

const ACTION_META: Record<DiffAction, { label: string; icon: typeof Plus; color: string }> = {
  import: { label: 'Import', icon: ArrowDown, color: 'text-node-module' },
  omit: { label: 'Omit', icon: XCircle, color: 'text-muted-foreground' },
  remove: { label: 'Remove', icon: Minus, color: 'text-destructive' },
  replace: { label: 'Replace', icon: RefreshCw, color: 'text-primary' },
};

const ImportCompareDialog = ({
  open, onOpenChange, currentNodes, currentEdges, onApply, mode = 'module',
}: ImportCompareDialogProps) => {
  const store = useProjectStore();

  // Source selection state
  const [sourceProjectId, setSourceProjectId] = useState('');
  const [sourceModelId, setSourceModelId] = useState('');
  const [sourceBuildId, setSourceBuildId] = useState('');
  const [sourceModuleId, setSourceModuleId] = useState('');

  // Diff results & actions
  const [diffItems, setDiffItems] = useState<DiffItem[]>([]);
  const [actions, setActions] = useState<Record<string, DiffAction>>({});
  const [compared, setCompared] = useState(false);

  // Source picker data
  const sourceProject = store.getProject(sourceProjectId);
  const sourceModel = sourceProject?.stbModels.find(m => m.id === sourceModelId);
  const sourceBuild = sourceModel?.builds.find(b => b.id === sourceBuildId);
  const sourceModule = sourceBuild?.modules.find(m => m.id === sourceModuleId);

  const getSourceData = useCallback((): { nodes: Node[]; edges: Edge[] } | null => {
    if (mode === 'module' && sourceModule) {
      return { nodes: sourceModule.nodes, edges: sourceModule.edges };
    }
    if (mode === 'build' && sourceBuild) {
      // Merge all modules' nodes/edges for build-level comparison
      const allNodes = sourceBuild.modules.flatMap(m => m.nodes);
      const allEdges = sourceBuild.modules.flatMap(m => m.edges);
      return { nodes: allNodes, edges: allEdges };
    }
    return null;
  }, [mode, sourceModule, sourceBuild]);

  const handleCompare = useCallback(() => {
    const source = getSourceData();
    if (!source) {
      toast.error('Select a source to compare');
      return;
    }
    const items = diffConfigs(source.nodes, source.edges, currentNodes, currentEdges);
    setDiffItems(items);
    // Set default actions from suggestions
    const defaultActions: Record<string, DiffAction> = {};
    items.forEach(item => { defaultActions[item.id] = item.suggestedAction; });
    setActions(defaultActions);
    setCompared(true);

    if (items.length === 0) {
      toast.info('No differences found', { description: 'Configurations are identical' });
    }
  }, [getSourceData, currentNodes, currentEdges]);

  const setAction = useCallback((itemId: string, action: DiffAction) => {
    setActions(prev => ({ ...prev, [itemId]: action }));
  }, []);

  const setAllActions = useCallback((action: DiffAction, filterType?: DiffItem['type']) => {
    setActions(prev => {
      const updated = { ...prev };
      diffItems.forEach(item => {
        if (!filterType || item.type === filterType) {
          updated[item.id] = action;
        }
      });
      return updated;
    });
  }, [diffItems]);

  const summary = useMemo(() => getDiffSummary(diffItems), [diffItems]);

  const actionSummary = useMemo(() => {
    const counts = { import: 0, omit: 0, remove: 0, replace: 0 };
    Object.values(actions).forEach(a => { counts[a]++; });
    return counts;
  }, [actions]);

  const handleApply = useCallback(() => {
    const source = getSourceData();
    if (!source) return;

    let mergedNodes = [...currentNodes];
    let mergedEdges = [...currentEdges];

    for (const item of diffItems) {
      const action = actions[item.id];
      if (!action) continue;

      switch (item.type) {
        case 'node_added':
          if (action === 'import' && item.sourceNode) {
            mergedNodes.push(item.sourceNode);
          }
          break;
        case 'node_removed':
          if (action === 'remove' && item.nodeId) {
            mergedNodes = mergedNodes.filter(n => n.id !== item.nodeId);
            mergedEdges = mergedEdges.filter(e => e.source !== item.nodeId && e.target !== item.nodeId);
          }
          break;
        case 'node_changed':
          if (action === 'replace' && item.sourceNode && item.nodeId) {
            mergedNodes = mergedNodes.map(n =>
              n.id === item.nodeId ? { ...item.sourceNode!, id: n.id, position: n.position } : n
            );
          }
          break;
        case 'edge_added':
          if (action === 'import' && item.sourceEdge) {
            mergedEdges.push(item.sourceEdge);
          }
          break;
        case 'edge_removed':
          if (action === 'remove' && item.edgeId) {
            mergedEdges = mergedEdges.filter(e => e.id !== item.edgeId);
          }
          break;
      }
    }

    onApply(mergedNodes, mergedEdges);
    toast.success('Changes Applied', {
      description: `Imported: ${actionSummary.import}, Replaced: ${actionSummary.replace}, Removed: ${actionSummary.remove}, Omitted: ${actionSummary.omit}`,
    });
    handleReset();
    onOpenChange(false);
  }, [diffItems, actions, currentNodes, currentEdges, getSourceData, onApply, actionSummary, onOpenChange]);

  const handleReset = () => {
    setSourceProjectId('');
    setSourceModelId('');
    setSourceBuildId('');
    setSourceModuleId('');
    setDiffItems([]);
    setActions({});
    setCompared(false);
  };

  const canCompare = mode === 'module' ? !!sourceModule : !!sourceBuild;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] !grid-rows-[auto_1fr_auto] overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            Import & Compare Configuration
          </DialogTitle>
          <DialogDescription>
            Select a source {mode} to compare with the current configuration, then choose actions for each difference.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="overflow-y-auto pr-2">
          <div className="space-y-4">
            {/* Source Picker */}
            <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Source Configuration</p>
              <div className="grid grid-cols-2 gap-3">
                {/* Project */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Project</label>
                  <Select value={sourceProjectId} onValueChange={v => { setSourceProjectId(v); setSourceModelId(''); setSourceBuildId(''); setSourceModuleId(''); setCompared(false); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select project..." /></SelectTrigger>
                    <SelectContent>
                      {store.projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-1.5"><Package className="w-3 h-3" /> {p.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* STB Model */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">STB Model</label>
                  <Select value={sourceModelId} onValueChange={v => { setSourceModelId(v); setSourceBuildId(''); setSourceModuleId(''); setCompared(false); }} disabled={!sourceProject}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select model..." /></SelectTrigger>
                    <SelectContent>
                      {sourceProject?.stbModels.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-1.5"><Tv className="w-3 h-3" /> {m.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Build */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Build</label>
                  <Select value={sourceBuildId} onValueChange={v => { setSourceBuildId(v); setSourceModuleId(''); setCompared(false); }} disabled={!sourceModel}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select build..." /></SelectTrigger>
                    <SelectContent>
                      {sourceModel?.builds.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          <span className="flex items-center gap-1.5"><GitBranch className="w-3 h-3" /> {b.name} <span className="font-mono text-muted-foreground">v{b.version}</span></span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Module (only in module mode) */}
                {mode === 'module' && (
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Module</label>
                    <Select value={sourceModuleId} onValueChange={v => { setSourceModuleId(v); setCompared(false); }} disabled={!sourceBuild}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select module..." /></SelectTrigger>
                      <SelectContent>
                        {sourceBuild?.modules.map(m => {
                          const meta = MODULE_TYPE_META[m.type];
                          return (
                            <SelectItem key={m.id} value={m.id}>
                              <span className="flex items-center gap-1.5">{meta.icon} {m.name}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button size="sm" className="gap-1.5" onClick={handleCompare} disabled={!canCompare}>
                <GitCompare className="w-3.5 h-3.5" /> Compare
              </Button>
            </div>

            {/* Diff Results */}
            {compared && (
              <div className="space-y-4">
                <Separator />

                {/* Summary badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Plus className="w-3 h-3 text-node-module" /> {summary.added} new
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Minus className="w-3 h-3 text-destructive" /> {summary.removed} missing
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <RefreshCw className="w-3 h-3 text-primary" /> {summary.changed} changed
                  </Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setAllActions('import')}>Import All</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setAllActions('omit')}>Omit All</Button>
                  </div>
                </div>

                <Tabs defaultValue="unified">
                  <TabsList className="h-8">
                    <TabsTrigger value="unified" className="text-xs h-6">Unified Actions</TabsTrigger>
                    <TabsTrigger value="sidebyside" className="text-xs h-6">Side by Side</TabsTrigger>
                  </TabsList>

                  {/* Unified Action List */}
                  <TabsContent value="unified">
                    {diffItems.length === 0 ? (
                      <div className="text-center py-10">
                        <CheckCircle2 className="w-8 h-8 text-node-module mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Configurations are identical</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {diffItems.map(item => {
                          const currentAction = actions[item.id] || item.suggestedAction;
                          const actionMeta = ACTION_META[currentAction];

                          return (
                            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                              {/* Type icon */}
                              <div className={`shrink-0 ${
                                item.type === 'node_added' || item.type === 'edge_added' ? 'text-node-module' :
                                item.type === 'node_removed' || item.type === 'edge_removed' ? 'text-destructive' :
                                'text-primary'
                              }`}>
                                {item.type.includes('added') ? <Plus className="w-4 h-4" /> :
                                 item.type.includes('removed') ? <Minus className="w-4 h-4" /> :
                                 <RefreshCw className="w-4 h-4" />}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                              </div>

                              {/* Action selector */}
                              <div className="flex items-center gap-1 shrink-0">
                                {getAvailableActions(item).map(action => {
                                  const meta = ACTION_META[action];
                                  const Icon = meta.icon;
                                  const isActive = currentAction === action;
                                  return (
                                    <Button
                                      key={action}
                                      variant={isActive ? 'default' : 'ghost'}
                                      size="sm"
                                      className={`h-6 text-[10px] gap-1 px-2 ${!isActive ? meta.color : ''}`}
                                      onClick={() => setAction(item.id, action)}
                                    >
                                      <Icon className="w-3 h-3" />
                                      {meta.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Side by Side */}
                  <TabsContent value="sidebyside">
                    {diffItems.length === 0 ? (
                      <div className="text-center py-10">
                        <CheckCircle2 className="w-8 h-8 text-node-module mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Configurations are identical</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {diffItems.filter(i => i.sourceValue || i.targetValue).map(item => (
                          <div key={item.id} className="rounded-lg border border-border overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 text-xs font-medium">
                              {item.type.includes('added') ? <Plus className="w-3 h-3 text-node-module" /> :
                               item.type.includes('removed') ? <Minus className="w-3 h-3 text-destructive" /> :
                               <RefreshCw className="w-3 h-3 text-primary" />}
                              {item.label}
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-border">
                              <div className="p-2.5">
                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Source</p>
                                <p className="text-[11px] font-mono text-foreground break-all">
                                  {item.sourceValue || <span className="text-muted-foreground italic">— not present —</span>}
                                </p>
                              </div>
                              <div className="p-2.5">
                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Current</p>
                                <p className="text-[11px] font-mono text-foreground break-all">
                                  {item.targetValue || <span className="text-muted-foreground italic">— not present —</span>}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {compared && diffItems.length > 0 && (
              <>
                <span className="text-node-module">{actionSummary.import} import</span>
                <span>·</span>
                <span className="text-primary">{actionSummary.replace} replace</span>
                <span>·</span>
                <span className="text-destructive">{actionSummary.remove} remove</span>
                <span>·</span>
                <span>{actionSummary.omit} omit</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { handleReset(); onOpenChange(false); }}>Cancel</Button>
            {compared && diffItems.length > 0 && (
              <Button onClick={handleApply} className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Apply Changes
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function getAvailableActions(item: DiffItem): DiffAction[] {
  switch (item.type) {
    case 'node_added':
    case 'edge_added':
      return ['import', 'omit'];
    case 'node_removed':
    case 'edge_removed':
      return ['remove', 'omit'];
    case 'node_changed':
      return ['replace', 'omit'];
    default:
      return ['omit'];
  }
}

export default ImportCompareDialog;
