import { FileJson, FileCode, FileText, FileOutput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

interface ExportDialogProps {
  onExport: (format: 'json' | 'xml' | 'html' | 'opt') => void;
}

const formats = [
  { key: 'json' as const, label: 'JSON', desc: 'Raw flow data', icon: FileJson },
  { key: 'xml' as const, label: 'XML', desc: 'Structured XML document', icon: FileCode },
  { key: 'html' as const, label: 'HTML Report', desc: 'Visual report page', icon: FileText },
  { key: 'opt' as const, label: 'OPT File', desc: 'Option config format', icon: FileOutput },
];

const ExportDialog = ({ onExport }: ExportDialogProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
        <Download className="w-3.5 h-3.5" />
        Export
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-52">
      <DropdownMenuLabel className="text-[10px] text-muted-foreground">Export Format</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {formats.map((f) => (
        <DropdownMenuItem key={f.key} onClick={() => onExport(f.key)} className="gap-2 cursor-pointer">
          <f.icon className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">{f.label}</p>
            <p className="text-[10px] text-muted-foreground">{f.desc}</p>
          </div>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default ExportDialog;
