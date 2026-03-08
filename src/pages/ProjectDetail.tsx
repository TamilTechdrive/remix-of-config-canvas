import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Pencil, Copy, GitBranch,
  Package, Settings2, Download, ChevronRight, Power,
  PowerOff, Boxes, Tv, Cpu, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useProjectStore } from '@/hooks/useProjectStore';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type { Build, BuildModule, ModuleType, STBModel } from '@/types/projectTypes';
import { BUILD_STATUS_META, MODULE_TYPE_META, PROJECT_STATUS_META } from '@/types/projectTypes';
import { toast } from 'sonner';

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const store = useProjectStore();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const project = store.getProject(projectId || '');

  // Selection state: which STB model + which build is active
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);

  // Dialogs
  const [createModelOpen, setCreateModelOpen] = useState(false);
  const [editModel, setEditModel] = useState<STBModel | null>(null);
  const [createBuildOpen, setCreateBuildOpen] = useState(false);
  const [editBuildOpen, setEditBuildOpen] = useState<Build | null>(null);
  const [addModuleOpen, setAddModuleOpen] = useState(false);

  // STB Model form
  const [modelName, setModelName] = useState('');
  const [modelDesc, setModelDesc] = useState('');
  const [modelChipset, setModelChipset] = useState('');

  // Build form
  const [buildName, setBuildName] = useState('');
  const [buildVersion, setBuildVersion] = useState('1.0.0');
  const [buildDesc, setBuildDesc] = useState('');

  // Module form
  const [modName, setModName] = useState('');
  const [modType, setModType] = useState<ModuleType>('egos');
  const [modDesc, setModDesc] = useState('');

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={() => navigate('/projects')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const selectedModel = project.stbModels.find(s => s.id === selectedModelId);
  const selectedBuild = selectedModel?.builds.find(b => b.id === selectedBuildId);

  // ── STB Model actions ──────────────────────────────

  const handleCreateModel = () => {
    if (!modelName.trim()) return;
    const model = store.createSTBModel(project.id, {
      name: modelName.trim(),
      description: modelDesc.trim(),
      chipset: modelChipset.trim(),
    });
    setCreateModelOpen(false);
    if (model) setSelectedModelId(model.id);
    setModelName(''); setModelDesc(''); setModelChipset('');
  };

  const handleEditModel = () => {
    if (!editModel || !modelName.trim()) return;
    store.updateSTBModel(project.id, editModel.id, {
      name: modelName.trim(),
      description: modelDesc.trim(),
      chipset: modelChipset.trim(),
    });
    setEditModel(null);
  };

  const handleDeleteModel = async (model: STBModel) => {
    const ok = await confirm({
      title: 'Delete STB Model',
      description: `Delete "${model.name}" and all its builds and modules? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (ok) {
      store.deleteSTBModel(project.id, model.id);
      if (selectedModelId === model.id) { setSelectedModelId(null); setSelectedBuildId(null); }
    }
  };

  const handleCloneModel = async (model: STBModel) => {
    const ok = await confirm({
      title: 'Clone STB Model',
      description: `Clone "${model.name}" with all builds and modules?`,
      confirmLabel: 'Clone',
    });
    if (ok) store.cloneSTBModel(project.id, model.id);
  };

  // ── Build actions ──────────────────────────────

  const handleCreateBuild = () => {
    if (!buildName.trim() || !selectedModelId) return;
    const build = store.createBuild(project.id, selectedModelId, {
      name: buildName.trim(),
      version: buildVersion.trim() || '1.0.0',
      description: buildDesc.trim(),
    });
    setCreateBuildOpen(false);
    if (build) setSelectedBuildId(build.id);
    setBuildName(''); setBuildVersion('1.0.0'); setBuildDesc('');
  };

  const handleEditBuild = () => {
    if (!editBuildOpen || !buildName.trim() || !selectedModelId) return;
    store.updateBuild(project.id, selectedModelId, editBuildOpen.id, {
      name: buildName.trim(),
      version: buildVersion.trim(),
      description: buildDesc.trim(),
    });
    setEditBuildOpen(null);
  };

  const handleDeleteBuild = async (build: Build) => {
    if (!selectedModelId) return;
    const ok = await confirm({
      title: 'Delete Build',
      description: `Delete "${build.name} v${build.version}" and all its modules?`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (ok) {
      store.deleteBuild(project.id, selectedModelId, build.id);
      if (selectedBuildId === build.id) setSelectedBuildId(null);
    }
  };

  const handleVersionBuild = async (build: Build) => {
    if (!selectedModelId) return;
    const ok = await confirm({
      title: 'Create New Version',
      description: `Clone "${build.name} v${build.version}" as a new version?`,
      confirmLabel: 'Create Version',
    });
    if (ok) {
      const clone = store.cloneBuild(project.id, selectedModelId, build.id);
      if (clone) setSelectedBuildId(clone.id);
    }
  };

  // ── Module actions ──────────────────────────────

  const handleAddModule = () => {
    if (!selectedModelId || !selectedBuildId || !modName.trim()) return;
    store.addModule(project.id, selectedModelId, selectedBuildId, {
      name: modName.trim(),
      type: modType,
      description: modDesc.trim(),
    });
    setAddModuleOpen(false);
    setModName(''); setModType('egos'); setModDesc('');
  };

  const handleDeleteModule = async (mod: BuildModule) => {
    if (!selectedModelId || !selectedBuildId) return;
    const ok = await confirm({
      title: 'Delete Module',
      description: `Delete "${mod.name}" and all its configuration?`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (ok) store.deleteModule(project.id, selectedModelId, selectedBuildId, mod.id);
  };

  const handleToggleModule = (mod: BuildModule) => {
    if (!selectedModelId || !selectedBuildId) return;
    store.updateModule(project.id, selectedModelId, selectedBuildId, mod.id, { enabled: !mod.enabled });
  };

  const openModuleEditor = (mod: BuildModule) => {
    navigate(`/projects/${project.id}/models/${selectedModelId}/builds/${selectedBuildId}/modules/${mod.id}/editor`);
  };

  // ── Export ──────────────────────────────

  const exportBuild = (build: Build) => {
    const data = {
      project: { id: project.id, name: project.name },
      stbModel: selectedModel ? { id: selectedModel.id, name: selectedModel.name } : null,
      build,
      exportedAt: new Date().toISOString(),
    };
    downloadJSON(data, `${project.name}-${build.name}-v${build.version}.json`);
    toast.success('Build Exported');
  };

  const exportProject = () => {
    const data = { project, exportedAt: new Date().toISOString() };
    downloadJSON(data, `${project.name}-full.json`);
    toast.success('Project Exported');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground truncate">{project.name}</h1>
            <Badge className={`text-[10px] ${PROJECT_STATUS_META[project.status].color}`}>
              {PROJECT_STATUS_META[project.status].label}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{project.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={exportProject} className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> Export Project
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: STB Models + Builds */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* STB Models */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Tv className="w-4 h-4 text-primary" /> STB Models
              <Badge variant="secondary" className="text-[10px]">{project.stbModels.length}</Badge>
            </h2>
            <Button size="sm" onClick={() => { setModelName(''); setModelDesc(''); setModelChipset(''); setCreateModelOpen(true); }} className="gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" /> Add Model
            </Button>
          </div>

          {project.stbModels.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-lg">
              <Tv className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No STB models yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Add your first STB model to start building</p>
            </div>
          ) : (
            <div className="space-y-2">
              {project.stbModels.map(model => (
                <Collapsible
                  key={model.id}
                  open={selectedModelId === model.id}
                  onOpenChange={open => {
                    setSelectedModelId(open ? model.id : null);
                    if (!open) setSelectedBuildId(null);
                  }}
                >
                  <Card className={`transition-all ${selectedModelId === model.id ? 'border-primary ring-1 ring-primary/20' : 'hover:border-primary/30'}`}>
                    <CardContent className="p-0">
                      {/* Model header */}
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-3 p-3 cursor-pointer">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Tv className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{model.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {model.chipset && (
                                <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
                                  <Cpu className="w-2.5 h-2.5" /> {model.chipset}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">{model.builds.length} builds</span>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${selectedModelId === model.id ? 'rotate-180' : ''}`} />
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        {/* Model actions */}
                        <div className="px-3 pb-2 flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => {
                            setModelName(model.name); setModelDesc(model.description); setModelChipset(model.chipset);
                            setEditModel(model);
                          }}>
                            <Pencil className="w-2.5 h-2.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleCloneModel(model)}>
                            <Copy className="w-2.5 h-2.5" /> Clone
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-destructive" onClick={() => handleDeleteModel(model)}>
                            <Trash2 className="w-2.5 h-2.5" /> Delete
                          </Button>
                        </div>

                        <Separator />

                        {/* Builds inside this model */}
                        <div className="p-2 space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Builds</span>
                            <Button size="sm" variant="ghost" className="h-5 text-[10px] gap-0.5 px-1.5"
                              onClick={() => { setBuildName(''); setBuildVersion('1.0.0'); setBuildDesc(''); setCreateBuildOpen(true); }}>
                              <Plus className="w-2.5 h-2.5" /> New
                            </Button>
                          </div>

                          {model.builds.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground/60 text-center py-3">No builds</p>
                          ) : (
                            model.builds
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map(build => (
                              <div
                                key={build.id}
                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-xs ${
                                  selectedBuildId === build.id
                                    ? 'bg-primary/10 border border-primary/20'
                                    : 'hover:bg-muted/50'
                                }`}
                                onClick={() => setSelectedBuildId(build.id)}
                              >
                                <GitBranch className="w-3 h-3 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">{build.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="text-[8px] h-3.5 font-mono">v{build.version}</Badge>
                                    <Badge className={`text-[8px] h-3.5 ${BUILD_STATUS_META[build.status].color}`}>
                                      {BUILD_STATUS_META[build.status].label}
                                    </Badge>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-5 w-5">
                                      <Settings2 className="w-2.5 h-2.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                                    <DropdownMenuItem onClick={() => {
                                      setBuildName(build.name); setBuildVersion(build.version); setBuildDesc(build.description);
                                      setEditBuildOpen(build);
                                    }}>
                                      <Pencil className="w-3 h-3 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleVersionBuild(build)}>
                                      <GitBranch className="w-3 h-3 mr-2" /> New Version
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => exportBuild(build)}>
                                      <Download className="w-3 h-3 mr-2" /> Export
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteBuild(build)}>
                                      <Trash2 className="w-3 h-3 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </div>

        {/* Right: Modules for selected build */}
        <div className="col-span-12 lg:col-span-8">
          {!selectedBuild ? (
            <div className="text-center py-20 border border-dashed border-border rounded-lg">
              <ChevronRight className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {!selectedModel ? 'Select an STB model to see its builds' : 'Select a build to manage its modules'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Build header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Tv className="w-3 h-3" /> {selectedModel?.name}
                    <span className="text-muted-foreground/40">→</span>
                    <GitBranch className="w-3 h-3" /> {selectedBuild.name}
                  </div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    {selectedBuild.name}
                    <Badge variant="outline" className="text-[10px] font-mono">v{selectedBuild.version}</Badge>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedBuild.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedBuild.status}
                    onValueChange={v => selectedModelId && store.updateBuild(project.id, selectedModelId, selectedBuild.id, { status: v as Build['status'] })}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="released">Released</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => { setModName(''); setModType('egos'); setModDesc(''); setAddModuleOpen(true); }} className="gap-1 h-8 text-xs">
                    <Plus className="w-3 h-3" /> Add Module
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Modules grid */}
              {selectedBuild.modules.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-lg">
                  <Package className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No modules in this build</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1"
                    onClick={() => { setModName(''); setModType('egos'); setModDesc(''); setAddModuleOpen(true); }}>
                    <Plus className="w-3 h-3" /> Add Module
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedBuild.modules.map(mod => {
                    const meta = MODULE_TYPE_META[mod.type];
                    return (
                      <Card key={mod.id} className={`transition-all ${!mod.enabled ? 'opacity-50' : 'hover:border-primary/30'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                              >
                                {meta.icon}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{mod.name}</p>
                                <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: `${meta.color}40`, color: meta.color }}>
                                  {meta.label}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => handleToggleModule(mod)}
                                title={mod.enabled ? 'Disable' : 'Enable'}>
                                {mod.enabled ? <Power className="w-3 h-3 text-node-module" /> : <PowerOff className="w-3 h-3 text-muted-foreground" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive"
                                onClick={() => handleDeleteModule(mod)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {mod.description && (
                            <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{mod.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              {mod.nodes.length} nodes · {mod.edges.length} edges
                            </span>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => openModuleEditor(mod)} disabled={!mod.enabled}>
                              <Settings2 className="w-3 h-3" /> Configure
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* Create STB Model */}
      <Dialog open={createModelOpen} onOpenChange={setCreateModelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New STB Model</DialogTitle>
            <DialogDescription>Add a new STB model to {project.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Model Name</Label>
              <Input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="e.g. STB-4K Ultra" className="mt-1" />
            </div>
            <div>
              <Label>Chipset</Label>
              <Input value={modelChipset} onChange={e => setModelChipset(e.target.value)} placeholder="e.g. Broadcom 72180" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={modelDesc} onChange={e => setModelDesc(e.target.value)} placeholder="Model description..." className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModelOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateModel} disabled={!modelName.trim()}>Create Model</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit STB Model */}
      <Dialog open={!!editModel} onOpenChange={v => { if (!v) setEditModel(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit STB Model</DialogTitle>
            <DialogDescription>Update model details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Model Name</Label>
              <Input value={modelName} onChange={e => setModelName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Chipset</Label>
              <Input value={modelChipset} onChange={e => setModelChipset(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={modelDesc} onChange={e => setModelDesc(e.target.value)} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModel(null)}>Cancel</Button>
            <Button onClick={handleEditModel} disabled={!modelName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Build */}
      <Dialog open={createBuildOpen} onOpenChange={setCreateBuildOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Build</DialogTitle>
            <DialogDescription>Create a new build for {selectedModel?.name || 'this model'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Build Name</Label>
              <Input value={buildName} onChange={e => setBuildName(e.target.value)} placeholder="e.g. Main Build" className="mt-1" />
            </div>
            <div>
              <Label>Version</Label>
              <Input value={buildVersion} onChange={e => setBuildVersion(e.target.value)} placeholder="1.0.0" className="mt-1 font-mono" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={buildDesc} onChange={e => setBuildDesc(e.target.value)} placeholder="Build description..." className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBuildOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBuild} disabled={!buildName.trim()}>Create Build</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Build */}
      <Dialog open={!!editBuildOpen} onOpenChange={v => { if (!v) setEditBuildOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Build</DialogTitle>
            <DialogDescription>Update build details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Build Name</Label>
              <Input value={buildName} onChange={e => setBuildName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Version</Label>
              <Input value={buildVersion} onChange={e => setBuildVersion(e.target.value)} className="mt-1 font-mono" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={buildDesc} onChange={e => setBuildDesc(e.target.value)} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBuildOpen(null)}>Cancel</Button>
            <Button onClick={handleEditBuild} disabled={!buildName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Module */}
      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Module</DialogTitle>
            <DialogDescription>Add a module to {selectedBuild?.name || 'this build'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Module Name</Label>
              <Input value={modName} onChange={e => setModName(e.target.value)} placeholder="e.g. Body Control" className="mt-1" />
            </div>
            <div>
              <Label>Module Type</Label>
              <Select value={modType} onValueChange={v => setModType(v as ModuleType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODULE_TYPE_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={modDesc} onChange={e => setModDesc(e.target.value)} placeholder="What this module does..." className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModuleOpen(false)}>Cancel</Button>
            <Button onClick={handleAddModule} disabled={!modName.trim()}>Add Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
};

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default ProjectDetail;
