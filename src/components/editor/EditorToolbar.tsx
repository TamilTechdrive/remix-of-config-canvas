import { Upload, ZoomIn, ZoomOut, Maximize2, Database, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useReactFlow } from '@xyflow/react';
import ExportDialog from './ExportDialog';
import CloudToolbar from './CloudToolbar';

interface EditorToolbarProps {
  onExport: (format: 'json' | 'xml' | 'html' | 'opt') => void;
  onImport: () => void;
  onLoadSample: () => void;
  onCompare?: () => void;
  nodeCount: number;
  edgeCount: number;
  onCloudSave: (configData: Record<string, unknown>) => Record<string, unknown>;
  onCloudLoad: (configData: Record<string, unknown>) => void;
}

const EditorToolbar = ({ onExport, onImport, onLoadSample, onCompare, nodeCount, edgeCount, onCloudSave, onCloudLoad }: EditorToolbarProps) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="h-11 bg-surface-overlay border-b border-border flex items-center px-3 gap-1 justify-between">
      <div className="flex items-center gap-1">
        <div className="flex items-center mr-3">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center mr-2">
            <span className="text-primary text-xs font-bold">C</span>
          </div>
          <span className="text-sm font-semibold text-foreground">ConfigFlow</span>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomIn()}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomOut()}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fitView({ padding: 0.2 })}>
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={onImport}>
          <Upload className="w-3.5 h-3.5" />
          Import
        </Button>
        <ExportDialog onExport={onExport} />

        <Separator orientation="vertical" className="h-5 mx-1" />

        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={onLoadSample}>
          <Database className="w-3.5 h-3.5" />
          Load Sample
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono mr-2">
          <span>{nodeCount} nodes</span>
          <span>{edgeCount} edges</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <CloudToolbar onSave={onCloudSave} onLoad={onCloudLoad} />
      </div>
    </div>
  );
};

export default EditorToolbar;
