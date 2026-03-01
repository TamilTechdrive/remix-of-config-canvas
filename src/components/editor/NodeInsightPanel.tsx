import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
  CheckCircle2,
  Zap,
  Link2,
  Unlink,
  ShieldAlert,
  X,
  ChevronRight,
  Wand2,
  Network,
  TrendingUp,
  ToggleLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Node, Edge } from '@xyflow/react';
import type { ConfigNodeData } from '@/types/configTypes';
import { NODE_LABELS } from '@/types/configTypes';
import { analyzeNode, type NodeAnalysis, type RuleIssue, type IssueSeverity } from '@/engine/ruleEngine';
import type { RawConfig } from '@/data/sampleConfig';

interface NodeInsightPanelProps {
  nodeId: string;
  nodes: Node[];
  edges: Edge[];
  rawConfig: RawConfig;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
  onFixIssue: (issue: RuleIssue) => void;
  onAutoResolveAll: (fixes: Array<{ action: string; payload: Record<string, string> }>) => void;
  onToggleIncluded: (nodeId: string) => void;
}

const severityIcon: Record<IssueSeverity, React.ElementType> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  suggestion: Sparkles,
};

const severityColors: Record<IssueSeverity, string> = {
  error: 'text-destructive',
  warning: 'text-node-group',
  info: 'text-node-container',
  suggestion: 'text-accent',
};

const severityBg: Record<IssueSeverity, string> = {
  error: 'bg-destructive/10 border-destructive/30',
  warning: 'bg-node-group/10 border-node-group/30',
  info: 'bg-node-container/10 border-node-container/30',
  suggestion: 'bg-accent/10 border-accent/30',
};

const NodeInsightPanel = ({
  nodeId,
  nodes,
  edges,
  rawConfig,
  onClose,
  onFocusNode,
  onFixIssue,
  onAutoResolveAll,
  onToggleIncluded,
}: NodeInsightPanelProps) => {
  const analysis = useMemo(
    () => analyzeNode(nodeId, nodes, edges, rawConfig),
    [nodeId, nodes, edges, rawConfig]
  );

  // Impact analysis: what depends on this node
  const impactNodes = useMemo(() => {
    const dependents: { id: string; label: string; type: string }[] = [];
    const connectedTargets = edges.filter((e) => e.source === nodeId).map((e) => e.target);
    const connectedSources = edges.filter((e) => e.target === nodeId).map((e) => e.source);

    for (const nid of [...connectedTargets, ...connectedSources]) {
      const n = nodes.find((nd) => nd.id === nid);
      if (n) {
        const nd = n.data as unknown as ConfigNodeData;
        dependents.push({ id: n.id, label: nd.label, type: nd.type });
      }
    }
    return dependents;
  }, [nodeId, nodes, edges]);

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const data = node.data as unknown as ConfigNodeData;

  const healthColor =
    analysis.health === 'critical'
      ? 'text-destructive'
      : analysis.health === 'warning'
      ? 'text-node-group'
      : 'text-node-module';

  const healthBg =
    analysis.health === 'critical'
      ? 'bg-destructive/20'
      : analysis.health === 'warning'
      ? 'bg-node-group/20'
      : 'bg-node-module/20';

  const fixableIssues = analysis.issues.filter((i) => i.fix);
  const isIncluded = data.properties?.included === true;

  return (
    <div className="w-[420px] bg-surface-overlay border-l border-border h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${healthColor}`} />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              AI Insights — {NODE_LABELS[data.type]}
            </p>
            <p className="text-sm font-semibold text-foreground">{data.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {data.type === 'option' && (
            <Button
              variant={isIncluded ? 'default' : 'secondary'}
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => onToggleIncluded(nodeId)}
            >
              <ToggleLeft className="w-3 h-3" />
              {isIncluded ? 'Included' : 'Excluded'}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Health Summary */}
      <div className={`mx-4 mt-3 rounded-lg p-3 ${healthBg} flex items-center gap-3`}>
        {analysis.health === 'healthy' ? (
          <CheckCircle2 className="w-5 h-5 text-node-module shrink-0" />
        ) : analysis.health === 'critical' ? (
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-node-group shrink-0" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-semibold ${healthColor}`}>
            {analysis.health === 'healthy' ? 'All Clear' : analysis.health === 'critical' ? 'Critical Issues Found' : 'Warnings Detected'}
          </p>
          <p className="text-xs text-muted-foreground">
            {analysis.issues.length} issues · {analysis.dependencies.length} deps · {analysis.conflicts.length} conflicts
          </p>
        </div>
        {fixableIssues.length > 0 && (
          <Button
            size="sm"
            className="h-7 text-[10px] gap-1 bg-primary text-primary-foreground"
            onClick={() => onAutoResolveAll(fixableIssues.map((i) => i.fix!))}
          >
            <Wand2 className="w-3 h-3" />
            Fix All ({fixableIssues.length})
          </Button>
        )}
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="issues" className="flex-1 flex flex-col mt-2">
        <TabsList className="mx-4 bg-card border border-border">
          <TabsTrigger value="issues" className="text-xs gap-1">
            <AlertCircle className="w-3 h-3" />
            Issues
            {analysis.issues.length > 0 && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-1">{analysis.issues.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="deps" className="text-xs gap-1">
            <Link2 className="w-3 h-3" />
            Deps
          </TabsTrigger>
          <TabsTrigger value="impact" className="text-xs gap-1">
            <Network className="w-3 h-3" />
            Impact
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs gap-1">
            <Sparkles className="w-3 h-3" />
            AI
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Issues Tab */}
          <TabsContent value="issues" className="p-4 space-y-3 mt-0">
            {analysis.conflicts.length > 0 && (
              <>
                <SectionHeader icon={Zap} label="Conflicts" count={analysis.conflicts.length} color="text-destructive" />
                <div className="space-y-2">
                  {analysis.conflicts.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-md bg-destructive/5 border border-destructive/20 text-xs cursor-pointer hover:bg-destructive/10 transition-colors"
                      onClick={() => c.nodeId && onFocusNode(c.nodeId)}
                    >
                      <Zap className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {c.label} <span className="text-destructive">⚡</span> {c.conflictsWith}
                        </p>
                        <p className="text-muted-foreground">Cannot be active simultaneously</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
                <Separator />
              </>
            )}
            {analysis.issues.length > 0 ? (
              <div className="space-y-2">
                {analysis.issues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} onFocus={onFocusNode} onFix={onFixIssue} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-node-module" />
                No issues detected
              </div>
            )}
          </TabsContent>

          {/* Dependencies Tab */}
          <TabsContent value="deps" className="p-4 space-y-3 mt-0">
            <SectionHeader icon={Link2} label="Dependencies" count={analysis.dependencies.length} color="text-node-container" />
            {analysis.dependencies.length > 0 ? (
              <div className="space-y-1.5">
                {analysis.dependencies.map((d, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer hover:bg-card/80 transition-colors ${
                      d.present ? 'border-node-module/30 bg-node-module/5' : 'border-destructive/30 bg-destructive/5'
                    }`}
                    onClick={() => d.nodeId && onFocusNode(d.nodeId)}
                  >
                    {d.present ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-node-module shrink-0" />
                    ) : (
                      <Unlink className="w-3.5 h-3.5 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{d.label}</p>
                      <p className="text-muted-foreground">{d.present ? 'Satisfied ✓' : 'Missing — must be enabled'}</p>
                    </div>
                    {d.present ? (
                      <Badge variant="secondary" className="text-[10px] h-4 bg-node-module/20 text-node-module border-0">OK</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] h-4">Missing</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No dependency rules for this node</p>
            )}
          </TabsContent>

          {/* Impact Tab */}
          <TabsContent value="impact" className="p-4 space-y-3 mt-0">
            <SectionHeader icon={Network} label="Connected Nodes" count={impactNodes.length} color="text-accent" />
            {impactNodes.length > 0 ? (
              <div className="space-y-1.5">
                {impactNodes.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center gap-2 p-2 rounded-md border border-border bg-card text-xs cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => onFocusNode(n.id)}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{n.label}</p>
                      <p className="text-muted-foreground uppercase text-[10px]">{n.type}</p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No direct connections</p>
            )}

            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">🤖 Impact Summary</p>
              <p>Changing this node affects <strong className="text-foreground">{impactNodes.length}</strong> directly connected nodes.</p>
              {data.type === 'option' && isIncluded && (
                <p className="text-node-group">⚠️ Disabling this option may break {analysis.issues.filter(i => i.id.startsWith('needed_by')).length} dependent configurations.</p>
              )}
            </div>
          </TabsContent>

          {/* AI Suggestions Tab */}
          <TabsContent value="ai" className="p-4 space-y-3 mt-0">
            <SectionHeader icon={Sparkles} label="AI Recommendations" count={analysis.suggestions.length} color="text-accent" />
            {analysis.suggestions.length > 0 ? (
              <div className="space-y-2">
                {analysis.suggestions.map((s) => (
                  <IssueCard key={s.id} issue={s} onFocus={onFocusNode} onFix={onFixIssue} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-accent/40" />
                No additional suggestions
              </div>
            )}

            <Separator />
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-xs space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-accent" />
                AI Analysis Summary
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This <strong className="text-foreground">{data.type}</strong> node has{' '}
                <strong className="text-foreground">{impactNodes.length}</strong> connections,{' '}
                <strong className="text-foreground">{analysis.dependencies.length}</strong> dependency rules, and{' '}
                <strong className="text-foreground">{analysis.conflicts.length}</strong> conflict rules.
                {analysis.health === 'healthy' && ' Configuration looks optimal. ✓'}
                {analysis.health === 'warning' && ' Some items need attention.'}
                {analysis.health === 'critical' && ' Critical issues must be resolved before deployment.'}
              </p>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

// ── Sub-components ──────────────────────────────

const SectionHeader = ({ icon: Icon, label, count, color }: { icon: React.ElementType; label: string; count: number; color: string }) => (
  <div className="flex items-center gap-1.5">
    <Icon className={`w-3.5 h-3.5 ${color}`} />
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    <Badge variant="secondary" className="text-[10px] h-4 ml-auto">{count}</Badge>
  </div>
);

const IssueCard = ({ issue, onFocus, onFix }: { issue: RuleIssue; onFocus: (id: string) => void; onFix: (issue: RuleIssue) => void }) => {
  const Icon = severityIcon[issue.severity];
  return (
    <div className={`p-2.5 rounded-md border text-xs ${severityBg[issue.severity]}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${severityColors[issue.severity]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{issue.title}</p>
          <p className="text-muted-foreground mt-0.5 leading-relaxed">{issue.message}</p>
          <div className="flex items-center gap-2 mt-2">
            {issue.fix && (
              <Button size="sm" variant="secondary" className="h-6 text-[10px] px-2" onClick={() => onFix(issue)}>
                ⚡ {issue.fix.label}
              </Button>
            )}
            {issue.affectedNodeIds.length > 1 && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => onFocus(issue.affectedNodeIds[1])}>
                Go to related node →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeInsightPanel;
