import { useState, useMemo } from 'react';
import {
  Link2, Unlink, Zap, ShieldAlert, TrendingUp, Tag, Power, PowerOff,
  Plus, X, Sparkles, AlertCircle, CheckCircle2, Copy, ArrowUpDown,
  Wand2, ToggleLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Node, Edge } from '@xyflow/react';
import type { ConfigNodeData } from '@/types/configTypes';
import { NODE_LABELS } from '@/types/configTypes';
import { analyzeNode, type RuleIssue } from '@/engine/ruleEngine';
import type { RawConfig } from '@/data/sampleConfig';

interface NodeActionsPanelProps {
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
  rawConfig: RawConfig;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
  onFixIssue: (issue: RuleIssue) => void;
  onAutoResolveAll: (fixes: Array<{ action: string; payload: Record<string, string> }>) => void;
  onToggleIncluded: (nodeId: string) => void;
  onAddUserRule: (nodeId: string, rule: UserRule) => void;
  onRemoveUserRule: (nodeId: string, ruleId: string) => void;
  onUpdateNodeMeta: (nodeId: string, meta: Partial<NodeMeta>) => void;
}

export interface UserRule {
  id: string;
  type: 'dependency' | 'conflict' | 'must_enable' | 'must_disable' | 'duplicate';
  targetNodeId: string;
  targetLabel: string;
  reason: string;
}

export interface NodeMeta {
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  priority: number;
  tags: string[];
  must_enable: boolean;
  must_disable: boolean;
}

const IMPACT_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-node-container/20 text-node-container',
  high: 'bg-node-group/20 text-node-group',
  critical: 'bg-destructive/20 text-destructive',
};

const RULE_TYPE_DESCRIPTIONS: Record<UserRule['type'], string> = {
  dependency: 'This node requires the target to be active',
  conflict: 'This node cannot coexist with the target',
  must_enable: 'The target must always be enabled when this is active',
  must_disable: 'The target must always be disabled when this is active',
  duplicate: 'This node is a duplicate/alias of the target',
};

const NodeActionsPanel = ({
  nodeId,
  nodes,
  edges,
  rawConfig,
  onClose,
  onFocusNode,
  onFixIssue,
  onAutoResolveAll,
  onToggleIncluded,
  onAddUserRule,
  onRemoveUserRule,
  onUpdateNodeMeta,
}: NodeActionsPanelProps) => {
  const [newRuleType, setNewRuleType] = useState<UserRule['type']>('dependency');
  const [newRuleTarget, setNewRuleTarget] = useState('');
  const [newRuleReason, setNewRuleReason] = useState('');
  const [newTag, setNewTag] = useState('');

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const data = node.data as unknown as ConfigNodeData;
  const analysis = analyzeNode(nodeId, nodes, edges, rawConfig);

  const userRules: UserRule[] = (data.properties?.userRules as unknown as UserRule[]) || [];
  const meta: NodeMeta = {
    impact_level: (data.properties?.impact_level as NodeMeta['impact_level']) || 'low',
    priority: (data.properties?.priority as number) || 0,
    tags: (data.properties?.tags as unknown as string[]) || [],
    must_enable: data.properties?.must_enable === true,
    must_disable: data.properties?.must_disable === true,
  };

  const isIncluded = data.properties?.included === true;
  const fixableIssues = analysis.issues.filter((i) => i.fix);

  // Get all other nodes for target selection
  const otherNodes = nodes.filter((n) => n.id !== nodeId);

  const handleAddRule = () => {
    if (!newRuleTarget) return;
    const targetNode = nodes.find((n) => n.id === newRuleTarget);
    if (!targetNode) return;
    const targetData = targetNode.data as unknown as ConfigNodeData;

    const rule: UserRule = {
      id: `ur_${Date.now()}`,
      type: newRuleType,
      targetNodeId: newRuleTarget,
      targetLabel: targetData.label,
      reason: newRuleReason || `User-defined ${newRuleType}`,
    };
    onAddUserRule(nodeId, rule);
    setNewRuleTarget('');
    setNewRuleReason('');
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const tags = [...meta.tags, newTag.trim()];
    onUpdateNodeMeta(nodeId, { tags });
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    onUpdateNodeMeta(nodeId, { tags: meta.tags.filter((t) => t !== tag) });
  };

  const healthColor =
    analysis.health === 'critical' ? 'text-destructive' :
    analysis.health === 'warning' ? 'text-node-group' : 'text-node-module';

  return (
    <div className="w-[440px] bg-surface-overlay border-l border-border h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${healthColor}`} />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              AI Actions — {NODE_LABELS[data.type]}
            </p>
            <p className="text-sm font-semibold text-foreground">{data.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Include/Exclude for ALL node types */}
          <Button
            variant={isIncluded ? 'default' : 'secondary'}
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => onToggleIncluded(nodeId)}
          >
            <ToggleLeft className="w-3 h-3" />
            {isIncluded ? 'Included' : 'Excluded'}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick status */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap">
        <Badge className={`text-[10px] ${IMPACT_COLORS[meta.impact_level]}`}>
          Impact: {meta.impact_level}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Priority: {meta.priority}
        </Badge>
        {meta.must_enable && <Badge className="text-[10px] bg-node-module/20 text-node-module">Must Enable</Badge>}
        {meta.must_disable && <Badge className="text-[10px] bg-destructive/20 text-destructive">Must Disable</Badge>}
        {analysis.issues.length > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {analysis.issues.length} Issues
          </Badge>
        )}
      </div>

      <Tabs defaultValue="actions" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="mx-4 mt-2 bg-card border border-border">
          <TabsTrigger value="actions" className="text-xs gap-1">
            <Wand2 className="w-3 h-3" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-xs gap-1">
            <Link2 className="w-3 h-3" />
            Rules
            {userRules.length > 0 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{userRules.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="issues" className="text-xs gap-1">
            <AlertCircle className="w-3 h-3" />
            Issues
            {analysis.issues.length > 0 && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-1">{analysis.issues.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="meta" className="text-xs gap-1">
            <Tag className="w-3 h-3" />
            Meta
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0">
          {/* Actions Tab - manual rule creation */}
          <TabsContent value="actions" className="p-4 space-y-4 mt-0">
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Add Rule Manually
              </p>
              <p className="text-muted-foreground">Define dependencies, conflicts, or constraints for this node.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Rule Type</label>
                <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as UserRule['type'])}>
                  <SelectTrigger className="mt-1 h-8 text-xs bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dependency">
                      <span className="flex items-center gap-1.5"><Link2 className="w-3 h-3 text-node-container" /> Dependency (requires)</span>
                    </SelectItem>
                    <SelectItem value="conflict">
                      <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-destructive" /> Conflict (clashes with)</span>
                    </SelectItem>
                    <SelectItem value="must_enable">
                      <span className="flex items-center gap-1.5"><Power className="w-3 h-3 text-node-module" /> Must Enable</span>
                    </SelectItem>
                    <SelectItem value="must_disable">
                      <span className="flex items-center gap-1.5"><PowerOff className="w-3 h-3 text-destructive" /> Must Disable</span>
                    </SelectItem>
                    <SelectItem value="duplicate">
                      <span className="flex items-center gap-1.5"><Copy className="w-3 h-3 text-node-group" /> Duplicate Of</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Target Node</label>
                <Select value={newRuleTarget} onValueChange={setNewRuleTarget}>
                  <SelectTrigger className="mt-1 h-8 text-xs bg-card">
                    <SelectValue placeholder="Select node..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {otherNodes.map((n) => {
                      const nd = n.data as unknown as ConfigNodeData;
                      return (
                        <SelectItem key={n.id} value={n.id}>
                          <span className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">[{nd.type}]</span> {nd.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reason</label>
                <Input
                  value={newRuleReason}
                  onChange={(e) => setNewRuleReason(e.target.value)}
                  placeholder="Why this rule exists..."
                  className="mt-1 h-8 text-xs bg-card"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                />
              </div>

              <Button onClick={handleAddRule} size="sm" className="w-full h-8 text-xs gap-1.5" disabled={!newRuleTarget}>
                <Plus className="w-3 h-3" />
                Add Rule
              </Button>
            </div>

            <Separator />

            {/* Quick actions */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={meta.must_enable ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => onUpdateNodeMeta(nodeId, { must_enable: !meta.must_enable, must_disable: false })}
                >
                  <Power className="w-3 h-3" />
                  Must Enable
                </Button>
                <Button
                  variant={meta.must_disable ? 'destructive' : 'outline'}
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => onUpdateNodeMeta(nodeId, { must_disable: !meta.must_disable, must_enable: false })}
                >
                  <PowerOff className="w-3 h-3" />
                  Must Disable
                </Button>
              </div>
              {fixableIssues.length > 0 && (
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5 bg-primary"
                  onClick={() => onAutoResolveAll(fixableIssues.map((i) => i.fix!))}
                >
                  <Wand2 className="w-3 h-3" />
                  Auto-Fix All ({fixableIssues.length})
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Rules Tab - view user rules */}
          <TabsContent value="rules" className="p-4 space-y-3 mt-0">
            {/* User-defined rules */}
            {userRules.length > 0 ? (
              <div className="space-y-2">
                {userRules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} onRemove={() => onRemoveUserRule(nodeId, rule.id)} onFocus={() => onFocusNode(rule.targetNodeId)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No user-defined rules yet. Use the Actions tab to add them.
              </div>
            )}

            <Separator />

            {/* Engine-detected deps */}
            {analysis.dependencies.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-accent" /> Auto-Detected Dependencies
                </p>
                <div className="space-y-1.5">
                  {analysis.dependencies.map((d, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer hover:bg-card/80 transition-colors ${
                        d.present ? 'border-node-module/30 bg-node-module/5' : 'border-destructive/30 bg-destructive/5'
                      }`}
                      onClick={() => d.nodeId && onFocusNode(d.nodeId)}
                    >
                      {d.present ? <CheckCircle2 className="w-3.5 h-3.5 text-node-module shrink-0" /> : <Unlink className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      <span className="flex-1 font-medium text-foreground">{d.label}</span>
                      <Badge variant={d.present ? 'secondary' : 'destructive'} className="text-[10px] h-4">
                        {d.present ? 'OK' : 'Missing'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {analysis.conflicts.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1 mt-3">
                  <Zap className="w-3 h-3 text-destructive" /> Auto-Detected Conflicts
                </p>
                <div className="space-y-1.5">
                  {analysis.conflicts.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-md border border-destructive/20 bg-destructive/5 text-xs cursor-pointer hover:bg-destructive/10"
                      onClick={() => c.nodeId && onFocusNode(c.nodeId)}
                    >
                      <Zap className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <span className="flex-1 font-medium text-foreground">{c.label} ⚡ {c.conflictsWith}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="p-4 space-y-3 mt-0">
            {analysis.issues.length > 0 ? (
              <div className="space-y-2">
                {analysis.issues.map((issue) => (
                  <div key={issue.id} className={`p-2.5 rounded-md border text-xs ${
                    issue.severity === 'error' ? 'bg-destructive/10 border-destructive/30' :
                    issue.severity === 'warning' ? 'bg-node-group/10 border-node-group/30' :
                    'bg-accent/10 border-accent/30'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        issue.severity === 'error' ? 'text-destructive' : 'text-node-group'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{issue.title}</p>
                        <p className="text-muted-foreground mt-0.5">{issue.message}</p>
                        {issue.fix && (
                          <Button size="sm" variant="secondary" className="h-6 text-[10px] px-2 mt-2" onClick={() => onFixIssue(issue)}>
                            ⚡ {issue.fix.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-node-module" />
                No issues detected
              </div>
            )}

            {analysis.suggestions.length > 0 && (
              <>
                <Separator />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">AI Suggestions</p>
                {analysis.suggestions.map((s) => (
                  <div key={s.id} className="p-2 rounded-md border border-accent/20 bg-accent/5 text-xs">
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="text-muted-foreground mt-0.5">{s.message}</p>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          {/* Meta Tab */}
          <TabsContent value="meta" className="p-4 space-y-4 mt-0">
            {/* Impact Level */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Impact Level</label>
              <p className="text-[10px] text-muted-foreground mb-1">How critical is changing this node?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                  <Button
                    key={level}
                    variant={meta.impact_level === level ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 text-[10px] capitalize ${meta.impact_level === level ? IMPACT_COLORS[level] : ''}`}
                    onClick={() => onUpdateNodeMeta(nodeId, { impact_level: level })}
                  >
                    {level === 'low' ? '🟢' : level === 'medium' ? '🔵' : level === 'high' ? '🟡' : '🔴'} {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Priority (0-10)</label>
              <p className="text-[10px] text-muted-foreground mb-1">Higher = processed first in rule engine</p>
              <div className="flex items-center gap-2">
                <Input
                  type="range"
                  min={0}
                  max={10}
                  value={meta.priority}
                  onChange={(e) => onUpdateNodeMeta(nodeId, { priority: parseInt(e.target.value) || 0 })}
                  className="h-6 flex-1 bg-transparent border-0 p-0"
                />
                <Badge variant="outline" className="text-xs min-w-[28px] justify-center">{meta.priority}</Badge>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tags</label>
              <p className="text-[10px] text-muted-foreground mb-1">Categorize and filter nodes</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {meta.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/20 transition-colors" onClick={() => handleRemoveTag(tag)}>
                    {tag} <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1.5 mt-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="h-7 text-xs bg-card flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button variant="secondary" size="icon" onClick={handleAddTag} className="h-7 w-7 shrink-0">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {/* Quick tag suggestions */}
              <div className="flex flex-wrap gap-1 mt-2">
                {['core', 'optional', 'beta', 'deprecated', 'premium', 'required'].filter(t => !meta.tags.includes(t)).slice(0, 4).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[9px] cursor-pointer hover:bg-accent/20 transition-colors opacity-60 hover:opacity-100"
                    onClick={() => {
                      onUpdateNodeMeta(nodeId, { tags: [...meta.tags, tag] });
                    }}
                  >
                    + {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Node Health Summary */}
            <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-accent" />
                Node Health Report
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={`text-[10px] ${
                    analysis.health === 'healthy' ? 'bg-node-module/20 text-node-module' :
                    analysis.health === 'warning' ? 'bg-node-group/20 text-node-group' :
                    'bg-destructive/20 text-destructive'
                  }`}>
                    {analysis.health === 'healthy' ? '✅ Healthy' : analysis.health === 'warning' ? '⚠️ Warning' : '❌ Critical'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                  <span>Type:</span><span className="text-foreground font-medium">{data.type}</span>
                  <span>Connections:</span><span className="text-foreground font-medium">{edges.filter(e => e.source === nodeId || e.target === nodeId).length}</span>
                  <span>User Rules:</span><span className="text-foreground font-medium">{userRules.length}</span>
                  <span>Auto Issues:</span><span className="text-foreground font-medium">{analysis.issues.length}</span>
                  <span>Dependencies:</span><span className="text-foreground font-medium">{analysis.dependencies.length}</span>
                  <span>Conflicts:</span><span className="text-foreground font-medium">{analysis.conflicts.length}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

const RULE_ICONS: Record<UserRule['type'], { icon: React.ElementType; color: string; bg: string }> = {
  dependency: { icon: Link2, color: 'text-node-container', bg: 'border-node-container/30 bg-node-container/5' },
  conflict: { icon: Zap, color: 'text-destructive', bg: 'border-destructive/30 bg-destructive/5' },
  must_enable: { icon: Power, color: 'text-node-module', bg: 'border-node-module/30 bg-node-module/5' },
  must_disable: { icon: PowerOff, color: 'text-destructive', bg: 'border-destructive/30 bg-destructive/5' },
  duplicate: { icon: Copy, color: 'text-node-group', bg: 'border-node-group/30 bg-node-group/5' },
};

const RuleCard = ({ rule, onRemove, onFocus }: { rule: UserRule; onRemove: () => void; onFocus: () => void }) => {
  const { icon: Icon, color, bg } = RULE_ICONS[rule.type];
  return (
    <div className={`flex items-center gap-2 p-2 rounded-md border text-xs ${bg}`}>
      <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onFocus}>
        <p className="font-medium text-foreground">{rule.type.toUpperCase()}: {rule.targetLabel}</p>
        <p className="text-muted-foreground truncate">{rule.reason}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive/60 hover:text-destructive" onClick={onRemove}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
};

export default NodeActionsPanel;
