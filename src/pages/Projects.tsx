import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FolderOpen, Copy, Trash2, Pencil, Search,
  Archive, Tag, Clock, Package, Tv,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type { Project } from '@/types/projectTypes';
import { PROJECT_STATUS_META } from '@/types/projectTypes';

const Projects = () => {
  const navigate = useNavigate();
  const store = useProjectStore();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTags, setFormTags] = useState('');

  const filtered = store.projects.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setFormName('');
    setFormDesc('');
    setFormTags('');
    setCreateOpen(true);
  };

  const openEdit = (p: Project) => {
    setFormName(p.name);
    setFormDesc(p.description);
    setFormTags(p.tags.join(', '));
    setEditProject(p);
  };

  const handleCreate = () => {
    if (!formName.trim()) return;
    const project = store.createProject({
      name: formName.trim(),
      description: formDesc.trim(),
      tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setCreateOpen(false);
    navigate(`/projects/${project.id}`);
  };

  const handleEdit = () => {
    if (!editProject || !formName.trim()) return;
    store.updateProject(editProject.id, {
      name: formName.trim(),
      description: formDesc.trim(),
      tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditProject(null);
  };

  const handleDelete = async (p: Project) => {
    const ok = await confirm({
      title: 'Delete Project',
      description: `Permanently delete "${p.name}" and all its STB models, builds, and modules? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (ok) store.deleteProject(p.id);
  };

  const handleClone = async (p: Project) => {
    const ok = await confirm({
      title: 'Clone Project',
      description: `Create a copy of "${p.name}" with all STB models, builds, and modules?`,
      confirmLabel: 'Clone',
    });
    if (ok) store.cloneProject(p.id);
  };

  const handleArchive = async (p: Project) => {
    const newStatus = p.status === 'archived' ? 'active' : 'archived';
    const ok = await confirm({
      title: newStatus === 'archived' ? 'Archive Project' : 'Unarchive Project',
      description: `${newStatus === 'archived' ? 'Archive' : 'Restore'} "${p.name}"?`,
      confirmLabel: newStatus === 'archived' ? 'Archive' : 'Restore',
    });
    if (ok) store.updateProject(p.id, { status: newStatus });
  };

  const totalBuilds = (p: Project) => p.stbModels.reduce((acc, s) => acc + s.builds.length, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage STB configuration projects, models, builds, and modules
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Create your first STB project to get started</p>
          <Button onClick={openCreate} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(project => (
            <Card
              key={project.id}
              className="hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {project.name}
                      </p>
                      <Badge className={`text-[9px] h-4 ${PROJECT_STATUS_META[project.status].color}`}>
                        {PROJECT_STATUS_META[project.status].label}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => openEdit(project)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleClone(project)}>
                        <Copy className="w-3.5 h-3.5 mr-2" /> Clone
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(project)}>
                        <Archive className="w-3.5 h-3.5 mr-2" />
                        {project.status === 'archived' ? 'Unarchive' : 'Archive'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(project)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Tv className="w-3 h-3" />
                    {project.stbModels.length} model{project.stbModels.length !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {totalBuilds(project)} build{totalBuilds(project) !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-[9px] h-4">
                        <Tag className="w-2.5 h-2.5 mr-0.5" /> {tag}
                      </Badge>
                    ))}
                    {project.tags.length > 3 && (
                      <Badge variant="outline" className="text-[9px] h-4">+{project.tags.length - 3}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new STB configuration project</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project Name</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. STB Platform 2026" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Project description..." className="mt-1" rows={3} />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="e.g. stb, dvb, iptv" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formName.trim()}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProject} onOpenChange={v => { if (!v) setEditProject(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project Name</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} className="mt-1" rows={3} />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={formTags} onChange={e => setFormTags(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProject(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!formName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
};

export default Projects;
