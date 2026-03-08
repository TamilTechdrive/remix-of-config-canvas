import { useState, useCallback } from 'react';
import type { Project, STBModel, Build, BuildModule, ModuleType } from '@/types/projectTypes';
import { toast } from 'sonner';

const STORAGE_KEY = 'configflow_projects';

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const loadProjects = (): Project[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migration: convert old format (project.builds) → new format (project.stbModels)
    return parsed.map((p: any) => {
      if (p.stbModels) return p;
      if (p.builds) {
        return {
          ...p,
          stbModels: [{
            id: generateId(),
            projectId: p.id,
            name: 'Default Model',
            description: '',
            chipset: '',
            builds: p.builds,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }],
          builds: undefined,
        };
      }
      return { ...p, stbModels: [] };
    });
  } catch {
    return [];
  }
};

const saveProjects = (projects: Project[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

// Helper to deeply update a project
type ProjectUpdater = (p: Project) => Project;

export const useProjectStore = () => {
  const [projects, setProjects] = useState<Project[]>(loadProjects);

  const persist = useCallback((updated: Project[]) => {
    setProjects(updated);
    saveProjects(updated);
  }, []);

  const updateProjectDeep = useCallback((projectId: string, updater: ProjectUpdater) => {
    const updated = projects.map(p =>
      p.id === projectId ? { ...updater(p), updatedAt: new Date().toISOString() } : p
    );
    persist(updated);
  }, [projects, persist]);

  // ── Project CRUD ──────────────────────────────

  const createProject = useCallback((data: { name: string; description: string; tags?: string[] }): Project => {
    const project: Project = {
      id: generateId(),
      name: data.name,
      description: data.description,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stbModels: [],
      tags: data.tags || [],
    };
    persist([...projects, project]);
    toast.success('Project Created', { description: project.name });
    return project;
  }, [projects, persist]);

  const updateProject = useCallback((id: string, data: Partial<Pick<Project, 'name' | 'description' | 'status' | 'tags'>>) => {
    updateProjectDeep(id, p => ({ ...p, ...data }));
    toast.success('Project Updated');
  }, [updateProjectDeep]);

  const deleteProject = useCallback((id: string) => {
    persist(projects.filter(p => p.id !== id));
    toast.success('Project Deleted');
  }, [projects, persist]);

  const cloneProject = useCallback((id: string): Project | undefined => {
    const source = projects.find(p => p.id === id);
    if (!source) return;
    const clone: Project = {
      ...JSON.parse(JSON.stringify(source)),
      id: generateId(),
      name: `${source.name} (Copy)`,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clone.stbModels = clone.stbModels.map((stb: STBModel) => ({
      ...stb,
      id: generateId(),
      projectId: clone.id,
      builds: stb.builds.map((b: Build) => ({
        ...b,
        id: generateId(),
        stbModelId: stb.id,
        modules: b.modules.map((m: BuildModule) => ({ ...m, id: generateId(), buildId: b.id })),
      })),
    }));
    persist([...projects, clone]);
    toast.success('Project Cloned', { description: clone.name });
    return clone;
  }, [projects, persist]);

  // ── STB Model CRUD ──────────────────────────────

  const createSTBModel = useCallback((projectId: string, data: { name: string; description: string; chipset: string }): STBModel | undefined => {
    const model: STBModel = {
      id: generateId(),
      projectId,
      name: data.name,
      description: data.description,
      chipset: data.chipset,
      builds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: [...p.stbModels, model],
    }));
    toast.success('STB Model Created', { description: model.name });
    return model;
  }, [updateProjectDeep]);

  const updateSTBModel = useCallback((projectId: string, modelId: string, data: Partial<Pick<STBModel, 'name' | 'description' | 'chipset'>>) => {
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: p.stbModels.map(s =>
        s.id === modelId ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
      ),
    }));
    toast.success('STB Model Updated');
  }, [updateProjectDeep]);

  const deleteSTBModel = useCallback((projectId: string, modelId: string) => {
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: p.stbModels.filter(s => s.id !== modelId),
    }));
    toast.success('STB Model Deleted');
  }, [updateProjectDeep]);

  const cloneSTBModel = useCallback((projectId: string, modelId: string): STBModel | undefined => {
    const project = projects.find(p => p.id === projectId);
    const source = project?.stbModels.find(s => s.id === modelId);
    if (!source) return;

    const clone: STBModel = {
      ...JSON.parse(JSON.stringify(source)),
      id: generateId(),
      name: `${source.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clone.builds = clone.builds.map((b: Build) => ({
      ...b,
      id: generateId(),
      stbModelId: clone.id,
      modules: b.modules.map((m: BuildModule) => ({ ...m, id: generateId(), buildId: b.id })),
    }));
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: [...p.stbModels, clone],
    }));
    toast.success('STB Model Cloned', { description: clone.name });
    return clone;
  }, [projects, updateProjectDeep]);

  // ── Build CRUD ──────────────────────────────

  const createBuild = useCallback((projectId: string, modelId: string, data: { name: string; version: string; description: string }): Build | undefined => {
    const build: Build = {
      id: generateId(),
      stbModelId: modelId,
      name: data.name,
      version: data.version,
      description: data.description,
      status: 'draft',
      modules: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: p.stbModels.map(s =>
        s.id === modelId
          ? { ...s, builds: [...s.builds, build], updatedAt: new Date().toISOString() }
          : s
      ),
    }));
    toast.success('Build Created', { description: `${data.name} v${data.version}` });
    return build;
  }, [updateProjectDeep]);

  const updateBuild = useCallback((projectId: string, modelId: string, buildId: string, data: Partial<Pick<Build, 'name' | 'version' | 'description' | 'status'>>) => {
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: p.stbModels.map(s =>
        s.id === modelId
          ? {
              ...s,
              updatedAt: new Date().toISOString(),
              builds: s.builds.map(b =>
                b.id === buildId ? { ...b, ...data, updatedAt: new Date().toISOString() } : b
              ),
            }
          : s
      ),
    }));
    toast.success('Build Updated');
  }, [updateProjectDeep]);

  const deleteBuild = useCallback((projectId: string, modelId: string, buildId: string) => {
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: p.stbModels.map(s =>
        s.id === modelId
          ? { ...s, builds: s.builds.filter(b => b.id !== buildId), updatedAt: new Date().toISOString() }
          : s
      ),
    }));
    toast.success('Build Deleted');
  }, [updateProjectDeep]);

  const cloneBuild = useCallback((projectId: string, modelId: string, buildId: string): Build | undefined => {
    const project = projects.find(p => p.id === projectId);
    const model = project?.stbModels.find(s => s.id === modelId);
    const source = model?.builds.find(b => b.id === buildId);
    if (!source) return;

    const nextVersion = incrementVersion(source.version);
    const clone: Build = {
      ...JSON.parse(JSON.stringify(source)),
      id: generateId(),
      version: nextVersion,
      status: 'draft' as const,
      parentBuildId: source.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clone.modules = clone.modules.map((m: BuildModule) => ({ ...m, id: generateId(), buildId: clone.id }));

    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: p.stbModels.map(s =>
        s.id === modelId
          ? { ...s, builds: [...s.builds, clone], updatedAt: new Date().toISOString() }
          : s
      ),
    }));
    toast.success('Build Versioned', { description: `v${nextVersion} from v${source.version}` });
    return clone;
  }, [projects, updateProjectDeep]);

  // ── Module CRUD ──────────────────────────────

  const addModule = useCallback((projectId: string, modelId: string, buildId: string, data: { name: string; type: ModuleType; description: string }): BuildModule | undefined => {
    const mod: BuildModule = {
      id: generateId(),
      buildId,
      name: data.name,
      type: data.type,
      description: data.description,
      nodes: [],
      edges: [],
      enabled: true,
      order: 0,
    };
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: p.stbModels.map(s =>
        s.id === modelId
          ? {
              ...s,
              builds: s.builds.map(b =>
                b.id === buildId
                  ? { ...b, modules: [...b.modules, mod], updatedAt: new Date().toISOString() }
                  : b
              ),
            }
          : s
      ),
    }));
    toast.success('Module Added', { description: data.name });
    return mod;
  }, [updateProjectDeep]);

  const updateModule = useCallback((projectId: string, modelId: string, buildId: string, moduleId: string, data: Partial<BuildModule>) => {
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: p.stbModels.map(s =>
        s.id === modelId
          ? {
              ...s,
              builds: s.builds.map(b =>
                b.id === buildId
                  ? {
                      ...b,
                      updatedAt: new Date().toISOString(),
                      modules: b.modules.map(m =>
                        m.id === moduleId ? { ...m, ...data } : m
                      ),
                    }
                  : b
              ),
            }
          : s
      ),
    }));
  }, [updateProjectDeep]);

  const deleteModule = useCallback((projectId: string, modelId: string, buildId: string, moduleId: string) => {
    updateProjectDeep(projectId, p => ({
      ...p,
      stbModels: p.stbModels.map(s =>
        s.id === modelId
          ? {
              ...s,
              builds: s.builds.map(b =>
                b.id === buildId
                  ? { ...b, modules: b.modules.filter(m => m.id !== moduleId), updatedAt: new Date().toISOString() }
                  : b
              ),
            }
          : s
      ),
    }));
    toast.success('Module Deleted');
  }, [updateProjectDeep]);

  const saveModuleConfig = useCallback((projectId: string, modelId: string, buildId: string, moduleId: string, nodes: any[], edges: any[]) => {
    updateModule(projectId, modelId, buildId, moduleId, { nodes, edges });
  }, [updateModule]);

  // ── Helpers ──────────────────────────────

  const getProject = useCallback((id: string) => projects.find(p => p.id === id), [projects]);

  const getSTBModel = useCallback((projectId: string, modelId: string) => {
    const p = projects.find(pr => pr.id === projectId);
    return p?.stbModels.find(s => s.id === modelId);
  }, [projects]);

  const getBuild = useCallback((projectId: string, modelId: string, buildId: string) => {
    const s = getSTBModel(projectId, modelId);
    return s?.builds.find(b => b.id === buildId);
  }, [getSTBModel]);

  const getModule = useCallback((projectId: string, modelId: string, buildId: string, moduleId: string) => {
    const b = getBuild(projectId, modelId, buildId);
    return b?.modules.find(m => m.id === moduleId);
  }, [getBuild]);

  return {
    projects,
    createProject,
    updateProject,
    deleteProject,
    cloneProject,
    createSTBModel,
    updateSTBModel,
    deleteSTBModel,
    cloneSTBModel,
    createBuild,
    updateBuild,
    deleteBuild,
    cloneBuild,
    addModule,
    updateModule,
    deleteModule,
    saveModuleConfig,
    getProject,
    getSTBModel,
    getBuild,
    getModule,
  };
};

function incrementVersion(v: string): string {
  const parts = v.split('.').map(Number);
  if (parts.length === 3) {
    parts[2]++;
    return parts.join('.');
  }
  return v + '.1';
}
