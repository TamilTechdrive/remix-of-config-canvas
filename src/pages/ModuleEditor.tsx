import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProjectStore } from '@/hooks/useProjectStore';
import { MODULE_TYPE_META } from '@/types/projectTypes';
import Editor from './Editor';
import { toast } from 'sonner';

const ModuleEditor = () => {
  const { projectId, modelId, buildId, moduleId } = useParams<{
    projectId: string;
    modelId: string;
    buildId: string;
    moduleId: string;
  }>();
  const navigate = useNavigate();
  const store = useProjectStore();

  const project = store.getProject(projectId || '');
  const model = store.getSTBModel(projectId || '', modelId || '');
  const build = store.getBuild(projectId || '', modelId || '', buildId || '');
  const mod = store.getModule(projectId || '', modelId || '', buildId || '', moduleId || '');

  if (!project || !model || !build || !mod) {
    return (
      <div className="h-full flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Module not found</p>
        <Button variant="outline" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Project
        </Button>
      </div>
    );
  }

  const meta = MODULE_TYPE_META[mod.type];

  return (
    <div className="h-full flex flex-col">
      {/* Context bar */}
      <div className="h-10 bg-surface-overlay border-b border-border flex items-center px-4 gap-3 text-xs shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => navigate(`/projects/${projectId}`)}
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Button>
        <span className="text-muted-foreground">{project.name}</span>
        <span className="text-muted-foreground/40">→</span>
        <span className="text-muted-foreground">{model.name}</span>
        <span className="text-muted-foreground/40">→</span>
        <span className="text-muted-foreground">
          {build.name} <span className="font-mono">v{build.version}</span>
        </span>
        <span className="text-muted-foreground/40">→</span>
        <Badge variant="outline" className="text-[9px]" style={{ borderColor: `${meta.color}40`, color: meta.color }}>
          {meta.icon} {mod.name}
        </Badge>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          initialNodes={mod.nodes}
          initialEdges={mod.edges}
          onSave={(nodes, edges) => {
            store.saveModuleConfig(projectId!, modelId!, buildId!, moduleId!, nodes, edges);
            toast.success('Module Saved', { description: `${mod.name} configuration saved` });
          }}
        />
      </div>
    </div>
  );
};

export default ModuleEditor;
