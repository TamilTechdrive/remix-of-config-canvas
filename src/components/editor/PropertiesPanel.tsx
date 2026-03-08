import { useState } from 'react';
import {
  X, Plus, Trash2, Eye, EyeOff, HelpCircle, Palette,
  StickyNote, ChevronDown, ChevronRight, Copy, RotateCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ConfigNodeData, ConfigNodeType } from '@/types/configTypes';
import { NODE_LABELS } from '@/types/configTypes';
import DependencySuggestions from './DependencySuggestions';
import type { Edge } from '@xyflow/react';

interface VisibilityCondition {
  id: string;
  sourceNodeId: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'is_true' | 'is_false' | 'is_empty' | 'is_not_empty';
  value: string;
  logic: 'and' | 'or';
}

interface PropertiesPanelProps {
  nodeId: string;
  data: ConfigNodeData;
  onUpdate: (nodeId: string, data: Partial<ConfigNodeData>) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onAutoAdd: (parentId: string, type: ConfigNodeType) => void;
  edges: Edge[];
  allNodes: { id: string; data: unknown }[];
}

const OPERATOR_LABELS: Record<VisibilityCondition['operator'], string> = {
  equals: 'Equals',
  not_equals: 'Not Equals',
  contains: 'Contains',
  gt: 'Greater Than',
  lt: 'Less Than',
  is_true: 'Is True',
  is_false: 'Is False',
  is_empty: 'Is Empty',
  is_not_empty: 'Is Not Empty',
};

const NO_VALUE_OPERATORS = ['is_true', 'is_false', 'is_empty', 'is_not_empty'];

const NODE_COLOR_PRESETS = [
  { label: 'Default', value: '' },
  { label: '🔵 Blue', value: 'blue' },
  { label: '🟢 Green', value: 'green' },
  { label: '🟡 Yellow', value: 'yellow' },
  { label: '🔴 Red', value: 'red' },
  { label: '🟣 Purple', value: 'purple' },
  { label: '🟠 Orange', value: 'orange' },
];

const PropertiesPanel = ({ nodeId, data, onUpdate, onClose, onDelete, onAutoAdd, edges, allNodes }: PropertiesPanelProps) => {
  const [newPropKey, setNewPropKey] = useState('');
  const [newPropValue, setNewPropValue] = useState('');
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    basic: true, visibility: true, properties: false, appearance: false, notes: false, deps: false,
  });

  const toggleSection = (key: string) =>
    setSectionsOpen((s) => ({ ...s, [key]: !s[key] }));

  // Parse conditions from data
  const conditions: VisibilityCondition[] =
    (data.properties?.visibilityConditions as unknown as VisibilityCondition[]) || [];

  const notes: string = (data.properties?.notes as string) || '';
  const colorTag: string = (data.properties?.colorTag as string) || '';

  const addProperty = () => {
    if (!newPropKey.trim()) return;
    onUpdate(nodeId, {
      properties: { ...data.properties, [newPropKey.trim()]: newPropValue },
    });
    setNewPropKey('');
    setNewPropValue('');
  };

  const removeProperty = (key: string) => {
    const { [key]: _, ...rest } = data.properties;
    onUpdate(nodeId, { properties: rest });
  };

  const updateProperty = (key: string, value: string) => {
    onUpdate(nodeId, {
      properties: { ...data.properties, [key]: value },
    });
  };

  // Visibility condition helpers
  const addCondition = () => {
    const newCond: VisibilityCondition = {
      id: `vc_${Date.now()}`,
      sourceNodeId: '',
      field: 'visible',
      operator: 'is_true',
      value: '',
      logic: conditions.length > 0 ? 'and' : 'and',
    };
    onUpdate(nodeId, {
      properties: { ...data.properties, visibilityConditions: [...conditions, newCond] },
    });
  };

  const updateCondition = (id: string, updates: Partial<VisibilityCondition>) => {
    const updated = conditions.map((c) => (c.id === id ? { ...c, ...updates } : c));
    onUpdate(nodeId, {
      properties: { ...data.properties, visibilityConditions: updated },
    });
  };

  const removeCondition = (id: string) => {
    onUpdate(nodeId, {
      properties: { ...data.properties, visibilityConditions: conditions.filter((c) => c.id !== id) },
    });
  };

  // Build human-readable visibility summary
  const getVisibilitySummary = (): string => {
    if (conditions.length === 0) return 'Always visible';
    return conditions.map((c, i) => {
      const sourceNode = allNodes.find((n) => n.id === c.sourceNodeId);
      const sourceLabel = sourceNode ? (sourceNode.data as ConfigNodeData).label : '(select node)';
      const op = OPERATOR_LABELS[c.operator];
      const val = NO_VALUE_OPERATORS.includes(c.operator) ? '' : ` "${c.value}"`;
      const prefix = i > 0 ? ` ${c.logic.toUpperCase()} ` : '';
      return `${prefix}${sourceLabel}.${c.field} ${op}${val}`;
    }).join('');
  };

  // Filter out internal property keys
  const displayProperties = Object.entries(data.properties).filter(
    ([key]) => !['visibilityConditions', 'notes', 'colorTag', 'userRules', 'impact_level', 'priority', 'tags', 'must_enable', 'must_disable'].includes(key)
  );

  return (
    <TooltipProvider>
      <div className="w-80 bg-surface-overlay border-l border-border h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {colorTag && (
              <div className={`w-2.5 h-2.5 rounded-full bg-node-${colorTag === 'blue' ? 'container' : colorTag === 'green' ? 'module' : colorTag === 'yellow' ? 'group' : colorTag === 'purple' ? 'option' : 'group'}`} />
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {NODE_LABELS[data.type]} Properties
              </p>
              <p className="text-sm font-semibold text-foreground">{data.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => {
                  navigator.clipboard.writeText(nodeId);
                }} className="h-7 w-7">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left"><p className="text-xs">Copy Node ID</p></TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-1">
            {/* ── BASIC INFO ── */}
            <CollapsibleSection
              title="Basic Info"
              icon="📝"
              open={sectionsOpen.basic}
              onToggle={() => toggleSection('basic')}
            >
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    value={data.label}
                    onChange={(e) => onUpdate(nodeId, { label: e.target.value })}
                    className="mt-1 bg-card border-border text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    value={data.description || ''}
                    onChange={(e) => onUpdate(nodeId, { description: e.target.value })}
                    className="mt-1 bg-card border-border text-sm resize-none"
                    rows={2}
                    placeholder="What does this node do?"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Visible</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3 h-3 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px]">
                        <p className="text-xs">Controls whether this node is visible in the final configuration output</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.visible ? (
                      <Eye className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <Switch
                      checked={data.visible}
                      onCheckedChange={(visible) => onUpdate(nodeId, { visible })}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── VISIBILITY CONDITIONS (replaces raw Visibility Rule) ── */}
            <CollapsibleSection
              title="Visibility Conditions"
              icon="👁️"
              badge={conditions.length > 0 ? String(conditions.length) : undefined}
              open={sectionsOpen.visibility}
              onToggle={() => toggleSection('visibility')}
            >
              <div className="space-y-3">
                {/* Summary */}
                <div className="bg-card border border-border rounded-md p-2.5 text-xs">
                  <p className="text-muted-foreground font-mono text-[10px] leading-relaxed">
                    {getVisibilitySummary()}
                  </p>
                </div>

                {/* Explanation */}
                <div className="bg-accent/5 border border-accent/20 rounded-md p-2 text-[10px] text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">How it works:</p>
                  <p>Define conditions that control when this node appears. Pick a source node, a field to check, and an operator. Multiple conditions combine with AND/OR logic.</p>
                </div>

                {/* Conditions list */}
                {conditions.map((cond, idx) => (
                  <div key={cond.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
                    {idx > 0 && (
                      <Select value={cond.logic} onValueChange={(v) => updateCondition(cond.id, { logic: v as 'and' | 'or' })}>
                        <SelectTrigger className="h-6 w-16 text-[10px] bg-muted">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="and">AND</SelectItem>
                          <SelectItem value="or">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <div>
                      <label className="text-[10px] text-muted-foreground">When this node's…</label>
                      <Select value={cond.sourceNodeId} onValueChange={(v) => updateCondition(cond.id, { sourceNodeId: v })}>
                        <SelectTrigger className="mt-0.5 h-7 text-xs bg-card border-border">
                          <SelectValue placeholder="Select source node" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {allNodes.filter((n) => n.id !== nodeId).map((n) => {
                            const nd = n.data as ConfigNodeData;
                            return (
                              <SelectItem key={n.id} value={n.id}>
                                <span className="text-xs">[{nd.type}] {nd.label}</span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Field</label>
                        <Select value={cond.field} onValueChange={(v) => updateCondition(cond.id, { field: v })}>
                          <SelectTrigger className="mt-0.5 h-7 text-xs bg-card border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visible">visible</SelectItem>
                            <SelectItem value="included">included</SelectItem>
                            <SelectItem value="label">label</SelectItem>
                            <SelectItem value="enabled">enabled</SelectItem>
                            <SelectItem value="value">value</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Operator</label>
                        <Select value={cond.operator} onValueChange={(v) => updateCondition(cond.id, { operator: v as VisibilityCondition['operator'] })}>
                          <SelectTrigger className="mt-0.5 h-7 text-xs bg-card border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(OPERATOR_LABELS).map(([k, label]) => (
                              <SelectItem key={k} value={k}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {!NO_VALUE_OPERATORS.includes(cond.operator) && (
                      <div>
                        <label className="text-[10px] text-muted-foreground">Value</label>
                        <Input
                          value={cond.value}
                          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                          className="mt-0.5 h-7 text-xs bg-card border-border"
                          placeholder="Compare value..."
                        />
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-destructive/70 hover:text-destructive w-full"
                      onClick={() => removeCondition(cond.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remove Condition
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs gap-1"
                  onClick={addCondition}
                >
                  <Plus className="w-3 h-3" /> Add Condition
                </Button>

                {/* Legacy raw rule input */}
                <Collapsible>
                  <CollapsibleTrigger className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-1 cursor-pointer">
                    Advanced: Raw Expression
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Input
                      value={data.visibilityRule || ''}
                      onChange={(e) => onUpdate(nodeId, { visibilityRule: e.target.value })}
                      placeholder="e.g. parent.enabled === true"
                      className="mt-1 bg-card border-border text-[10px] font-mono h-7"
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CollapsibleSection>

            {/* ── CUSTOM PROPERTIES ── */}
            <CollapsibleSection
              title="Custom Properties"
              icon="⚙️"
              badge={displayProperties.length > 0 ? String(displayProperties.length) : undefined}
              open={sectionsOpen.properties}
              onToggle={() => toggleSection('properties')}
            >
              <div className="space-y-2">
                {displayProperties.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground min-w-[50px] truncate">{key}</span>
                    <Input
                      value={String(value)}
                      onChange={(e) => updateProperty(key, e.target.value)}
                      className="h-7 text-xs bg-card border-border flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProperty(key)}
                      className="h-7 w-7 shrink-0 text-destructive/70 hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Input
                    value={newPropKey}
                    onChange={(e) => setNewPropKey(e.target.value)}
                    placeholder="Key"
                    className="h-7 text-xs bg-card border-border"
                  />
                  <Input
                    value={newPropValue}
                    onChange={(e) => setNewPropValue(e.target.value)}
                    placeholder="Value"
                    className="h-7 text-xs bg-card border-border"
                    onKeyDown={(e) => e.key === 'Enter' && addProperty()}
                  />
                  <Button variant="secondary" size="icon" onClick={addProperty} className="h-7 w-7 shrink-0">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── APPEARANCE ── */}
            <CollapsibleSection
              title="Appearance"
              icon="🎨"
              open={sectionsOpen.appearance}
              onToggle={() => toggleSection('appearance')}
            >
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Color Tag</Label>
                  <Select value={colorTag} onValueChange={(v) => onUpdate(nodeId, { properties: { ...data.properties, colorTag: v } })}>
                    <SelectTrigger className="mt-1 h-8 text-xs bg-card">
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      {NODE_COLOR_PRESETS.map((c) => (
                        <SelectItem key={c.value || 'default'} value={c.value || 'none'}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── NOTES ── */}
            <CollapsibleSection
              title="Notes"
              icon="📌"
              badge={notes ? '✓' : undefined}
              open={sectionsOpen.notes}
              onToggle={() => toggleSection('notes')}
            >
              <Textarea
                value={notes}
                onChange={(e) => onUpdate(nodeId, { properties: { ...data.properties, notes: e.target.value } })}
                className="bg-card border-border text-xs resize-none"
                rows={3}
                placeholder="Add notes, reminders, or documentation for this node..."
              />
            </CollapsibleSection>

            {/* ── DEPENDENCY SUGGESTIONS ── */}
            <CollapsibleSection
              title="Dependency Suggestions"
              icon="🔗"
              open={sectionsOpen.deps}
              onToggle={() => toggleSection('deps')}
            >
              <DependencySuggestions
                nodeId={nodeId}
                nodeData={data}
                edges={edges}
                allNodes={allNodes}
                onAutoAdd={onAutoAdd}
              />
            </CollapsibleSection>

            <Separator className="my-2" />

            {/* Quick info */}
            <div className="bg-card border border-border rounded-lg p-2.5 text-[10px] text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Node ID</span>
                <span className="font-mono text-foreground">{nodeId}</span>
              </div>
              <div className="flex justify-between">
                <span>Type</span>
                <Badge variant="outline" className="text-[9px] h-4">{data.type}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Connections</span>
                <span className="text-foreground">{edges.filter((e) => e.source === nodeId || e.target === nodeId).length}</span>
              </div>
            </div>

            {/* Delete */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(nodeId)}
              className="w-full mt-2"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete Node
            </Button>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};

// Collapsible section component
const CollapsibleSection = ({
  title,
  icon,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <Collapsible open={open} onOpenChange={onToggle}>
    <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-card/50 rounded-md px-2 -mx-2 transition-colors cursor-pointer">
      {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
      <span className="text-sm">{icon}</span>
      <span className="text-xs font-medium text-foreground flex-1 text-left">{title}</span>
      {badge && (
        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{badge}</Badge>
      )}
    </CollapsibleTrigger>
    <CollapsibleContent className="pl-7 pr-1 pb-3 pt-1 space-y-2">
      {children}
    </CollapsibleContent>
  </Collapsible>
);

export default PropertiesPanel;
