import { useState, useCallback, useRef } from 'react';
import {
  type Node,
  type Edge,
  type Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { ConfigNodeData, ConfigNodeType } from '@/types/configTypes';
import { NODE_LABELS } from '@/types/configTypes';
import { validateConnection, getUniquenessViolation } from '@/types/connectionRules';
import { SAMPLE_CONFIG } from '@/data/sampleConfig';
import { parseConfigToFlow } from '@/data/configParser';
import { toast } from 'sonner';

const createNodeData = (type: ConfigNodeType): ConfigNodeData => ({
  label: `New ${NODE_LABELS[type]}`,
  type,
  description: '',
  properties: {},
  visible: true,
});

const defaultInitialData = parseConfigToFlow(SAMPLE_CONFIG);

interface UseConfigEditorOptions {
  initialNodes?: Node[];
  initialEdges?: Edge[];
}

export const useConfigEditor = (options?: UseConfigEditorOptions) => {
  const hasCustomData = options?.initialNodes !== undefined;
  const [nodes, setNodes] = useState<Node[]>(hasCustomData ? options.initialNodes! : defaultInitialData.nodes);
  const [edges, setEdges] = useState<Edge[]>(hasCustomData ? (options.initialEdges || []) : defaultInitialData.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const maxIdFromNodes = hasCustomData
    ? (options.initialNodes || []).reduce((max, n) => {
        const num = parseInt(n.id.replace('node_', ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0) + 1
    : defaultInitialData.maxId;
  const idCounter = useRef(maxIdFromNodes);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const sourceType = (sourceNode.data as unknown as ConfigNodeData).type;
      const targetType = (targetNode.data as unknown as ConfigNodeData).type;

      // Uniqueness check only
      const uniqueError = getUniquenessViolation(connection.source!, connection.target!, edges);
      if (uniqueError) {
        toast.warning('Connection Blocked', { description: uniqueError });
        return;
      }

      // Validate but don't block - just warn
      const validation = validateConnection(sourceType, targetType);

      const edgeStyle: Record<string, unknown> = { strokeWidth: 2 };
      let edgeType = 'smoothstep';
      let animated = true;

      if (validation.warningLevel === 'warning') {
        edgeStyle.stroke = 'hsl(35 80% 55%)';
        edgeStyle.strokeDasharray = '6 3';
        toast.info('Non-standard Connection', { description: validation.message });
      } else if (validation.warningLevel === 'info') {
        edgeStyle.stroke = 'hsl(200 60% 50%)';
        edgeStyle.strokeDasharray = '4 4';
        toast.info('Cross-level Connection', { description: validation.message });
      } else {
        toast.success('Connected', { description: validation.message });
      }

      setEdges((eds) =>
        addEdge({ ...connection, type: edgeType, animated, style: edgeStyle }, eds)
      );
    },
    [nodes, edges]
  );

  const addNode = useCallback((type: ConfigNodeType, position: { x: number; y: number }) => {
    const id = `node_${idCounter.current++}`;
    const newNode: Node = {
      id,
      type: 'configNode',
      position,
      data: createNodeData(type) as unknown as Record<string, unknown>,
    };
    setNodes((nds) => [...nds, newNode]);
    return id;
  }, []);

  const autoAddChild = useCallback((parentId: string, childType: ConfigNodeType) => {
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    const offset = { x: 0, y: 150 };
    const childrenCount = edges.filter((e) => e.source === parentId).length;
    const position = {
      x: parentNode.position.x + childrenCount * 220 + offset.x,
      y: parentNode.position.y + offset.y,
    };

    const childId = `node_${idCounter.current++}`;
    const newNode: Node = {
      id: childId,
      type: 'configNode',
      position,
      data: createNodeData(childType) as unknown as Record<string, unknown>,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `edge_${parentId}_${childId}`,
        source: parentId,
        target: childId,
        type: 'smoothstep',
        animated: true,
        style: { strokeWidth: 2 },
      },
    ]);
    toast.success(`Added ${NODE_LABELS[childType]}`, { description: `Connected to parent node` });
  }, [nodes, edges]);

  const updateNodeData = useCallback((nodeId: string, updates: Partial<ConfigNodeData>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
      )
    );
  }, []);

  const updateNodeProperty = useCallback((nodeId: string, key: string, value: unknown) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const data = n.data as unknown as ConfigNodeData;
        return {
          ...n,
          data: {
            ...n.data,
            properties: { ...data.properties, [key]: value },
          },
        };
      })
    );
  }, []);

  const addUserRule = useCallback((nodeId: string, rule: { id: string; type: string; targetNodeId: string; targetLabel: string; reason: string }) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const data = n.data as unknown as ConfigNodeData;
        const existing = (data.properties?.userRules as unknown as any[]) || [];
        return {
          ...n,
          data: { ...n.data, properties: { ...data.properties, userRules: [...existing, rule] } },
        };
      })
    );
    toast.success('Rule Added', { description: `${rule.type} → ${rule.targetLabel}` });
  }, []);

  const removeUserRule = useCallback((nodeId: string, ruleId: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const data = n.data as unknown as ConfigNodeData;
        const existing = (data.properties?.userRules as unknown as any[]) || [];
        return {
          ...n,
          data: { ...n.data, properties: { ...data.properties, userRules: existing.filter((r: any) => r.id !== ruleId) } },
        };
      })
    );
    toast.info('Rule Removed');
  }, []);

  const updateNodeMeta = useCallback((nodeId: string, meta: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const data = n.data as unknown as ConfigNodeData;
        return {
          ...n,
          data: { ...n.data, properties: { ...data.properties, ...meta } },
        };
      })
    );
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  }, []);

  const disconnectAllEdges = useCallback((nodeId: string) => {
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    toast.info('Disconnected', { description: 'All connections removed from this node' });
  }, []);

  const disconnectEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    toast.info('Connection removed');
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // ── Export helpers ──────────────────────────────

  const exportAsJSON = useCallback(() => {
    const config = { nodes, edges, exportedAt: new Date().toISOString() };
    downloadFile(JSON.stringify(config, null, 2), 'config-flow.json', 'application/json');
  }, [nodes, edges]);

  const exportAsXML = useCallback(() => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<ConfigFlow exportedAt="' + new Date().toISOString() + '">\n';
    xml += '  <Nodes>\n';
    for (const node of nodes) {
      const d = node.data as unknown as ConfigNodeData;
      xml += `    <Node id="${node.id}" type="${d.type}" x="${node.position.x}" y="${node.position.y}">\n`;
      xml += `      <Label>${escapeXml(d.label)}</Label>\n`;
      if (d.description) xml += `      <Description>${escapeXml(d.description)}</Description>\n`;
      xml += `      <Visible>${d.visible}</Visible>\n`;
      if (Object.keys(d.properties).length > 0) {
        xml += '      <Properties>\n';
        for (const [k, v] of Object.entries(d.properties)) {
          xml += `        <Property key="${escapeXml(k)}" value="${escapeXml(String(v))}" />\n`;
        }
        xml += '      </Properties>\n';
      }
      xml += '    </Node>\n';
    }
    xml += '  </Nodes>\n  <Edges>\n';
    for (const edge of edges) {
      xml += `    <Edge id="${edge.id}" source="${edge.source}" target="${edge.target}" />\n`;
    }
    xml += '  </Edges>\n</ConfigFlow>';
    downloadFile(xml, 'config-flow.xml', 'application/xml');
  }, [nodes, edges]);

  const exportAsHTML = useCallback(() => {
    let html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>ConfigFlow Report</title>
<style>
body{font-family:system-ui;background:#1a1b23;color:#e0e0e0;padding:2rem;max-width:1200px;margin:auto}
h1{color:#4dd68e}h2{color:#6c8eef;border-bottom:1px solid #333;padding-bottom:.5rem}
.node{background:#22232e;border:1px solid #333;border-radius:8px;padding:1rem;margin:.5rem 0}
.type{font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;opacity:.6}
.props{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem}
.prop{background:#2a2b36;padding:2px 8px;border-radius:4px;font-size:.75rem;font-family:monospace}
.edge{font-size:.85rem;color:#888;padding:.25rem 0}
.badge-error{background:#e5484d;color:#fff;padding:2px 6px;border-radius:4px;font-size:.7rem}
.badge-ok{background:#4dd68e;color:#111;padding:2px 6px;border-radius:4px;font-size:.7rem}
table{width:100%;border-collapse:collapse;margin-top:1rem}
th,td{text-align:left;padding:8px;border-bottom:1px solid #333}
th{color:#4dd68e;font-size:.8rem;text-transform:uppercase}
</style></head><body>
<h1>⚙️ ConfigFlow Report</h1>
<p>Generated: ${new Date().toLocaleString()} · ${nodes.length} nodes · ${edges.length} edges</p>
<h2>Nodes</h2>
<table><tr><th>ID</th><th>Type</th><th>Label</th><th>Properties</th><th>Status</th></tr>`;

    for (const node of nodes) {
      const d = node.data as unknown as ConfigNodeData;
      const propsStr = Object.entries(d.properties).map(([k, v]) => `${k}=${v}`).join(', ') || '—';
      const included = d.properties?.included;
      const badge = included === true ? '<span class="badge-ok">included</span>' : included === false ? '<span class="badge-error">excluded</span>' : '';
      html += `<tr><td>${node.id}</td><td><span class="type">${d.type}</span></td><td>${escapeXml(d.label)}</td><td style="font-family:monospace;font-size:.8rem">${propsStr}</td><td>${badge}</td></tr>`;
    }

    html += '</table><h2>Connections</h2><table><tr><th>Source</th><th>→</th><th>Target</th></tr>';
    for (const edge of edges) {
      const srcLabel = (nodes.find(n => n.id === edge.source)?.data as unknown as ConfigNodeData)?.label || edge.source;
      const tgtLabel = (nodes.find(n => n.id === edge.target)?.data as unknown as ConfigNodeData)?.label || edge.target;
      html += `<tr><td>${escapeXml(srcLabel)}</td><td>→</td><td>${escapeXml(tgtLabel)}</td></tr>`;
    }

    html += '</table></body></html>';
    downloadFile(html, 'config-flow-report.html', 'text/html');
  }, [nodes, edges]);

  const exportAsOPT = useCallback(() => {
    // OPT format: structured option file format
    let opt = `# ConfigFlow OPT Export\n# Generated: ${new Date().toISOString()}\n# Nodes: ${nodes.length} | Edges: ${edges.length}\n\n`;

    // Group nodes by type
    const grouped: Record<string, Node[]> = {};
    for (const node of nodes) {
      const d = node.data as unknown as ConfigNodeData;
      if (!grouped[d.type]) grouped[d.type] = [];
      grouped[d.type].push(node);
    }

    for (const [type, typeNodes] of Object.entries(grouped)) {
      opt += `[${type.toUpperCase()}]\n`;
      for (const node of typeNodes) {
        const d = node.data as unknown as ConfigNodeData;
        opt += `  ${node.id} = "${d.label}"\n`;
        for (const [k, v] of Object.entries(d.properties)) {
          opt += `    ${k} = ${JSON.stringify(v)}\n`;
        }
      }
      opt += '\n';
    }

    opt += '[CONNECTIONS]\n';
    for (const edge of edges) {
      opt += `  ${edge.source} -> ${edge.target}\n`;
    }

    downloadFile(opt, 'config-flow.opt', 'text/plain');
  }, [nodes, edges]);

  const exportConfig = useCallback((format: 'json' | 'xml' | 'html' | 'opt' = 'json') => {
    switch (format) {
      case 'xml': exportAsXML(); break;
      case 'html': exportAsHTML(); break;
      case 'opt': exportAsOPT(); break;
      default: exportAsJSON();
    }
    toast.success('Exported', { description: `Configuration exported as ${format.toUpperCase()}` });
  }, [exportAsJSON, exportAsXML, exportAsHTML, exportAsOPT]);

  const importConfig = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const config = JSON.parse(ev.target?.result as string);
          if (config.modules && Array.isArray(config.modules)) {
            const parsed = parseConfigToFlow(config);
            setNodes(parsed.nodes);
            setEdges(parsed.edges);
            idCounter.current = parsed.maxId;
            setSelectedNodeId(null);
            toast.success('Imported', { description: `Loaded ${parsed.nodes.length} nodes from module config` });
            return;
          }
          if (config.nodes && config.edges) {
            setNodes(config.nodes);
            setEdges(config.edges);
            const maxId = config.nodes.reduce((max: number, n: Node) => {
              const num = parseInt(n.id.replace('node_', ''), 10);
              return isNaN(num) ? max : Math.max(max, num);
            }, 0);
            idCounter.current = maxId + 1;
            setSelectedNodeId(null);
            toast.success('Imported', { description: `Loaded ${config.nodes.length} nodes` });
          }
        } catch {
          toast.error('Import Failed', { description: 'Invalid JSON file' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const loadSampleData = useCallback(() => {
    const parsed = parseConfigToFlow(SAMPLE_CONFIG);
    setNodes(parsed.nodes);
    setEdges(parsed.edges);
    idCounter.current = parsed.maxId;
    setSelectedNodeId(null);
    toast.success('Sample Loaded', { description: `${parsed.nodes.length} nodes, ${parsed.edges.length} edges` });
  }, []);

  // Auto-resolve all fixable issues
  const autoResolveAll = useCallback((fixes: Array<{ action: string; payload: Record<string, string> }>) => {
    setNodes((nds) => {
      let updated = [...nds];
      for (const fix of fixes) {
        if (fix.action === 'add_option') {
          updated = updated.map((n) =>
            n.id === fix.payload.nodeId
              ? { ...n, data: { ...n.data, properties: { ...(n.data as any).properties, included: true } } }
              : n
          );
        } else if (fix.action === 'remove_option') {
          updated = updated.map((n) =>
            n.id === fix.payload.nodeId
              ? { ...n, data: { ...n.data, properties: { ...(n.data as any).properties, included: false } } }
              : n
          );
        }
      }
      return updated;
    });
    toast.success('Auto-Resolved', { description: `Applied ${fixes.length} fixes` });
  }, []);

  const replaceAll = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
    const maxId = newNodes.reduce((max, n) => {
      const num = parseInt(n.id.replace('node_', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    idCounter.current = maxId + 1;
    setSelectedNodeId(null);
  }, []);

  return {
    nodes,
    edges,
    selectedNodeId,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    autoAddChild,
    updateNodeData,
    updateNodeProperty,
    deleteNode,
    setSelectedNodeId,
    exportConfig,
    importConfig,
    loadSampleData,
    autoResolveAll,
    addUserRule,
    removeUserRule,
    updateNodeMeta,
    disconnectAllEdges,
    disconnectEdge,
    replaceAll,
  };
};

// ── Utilities ──────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
