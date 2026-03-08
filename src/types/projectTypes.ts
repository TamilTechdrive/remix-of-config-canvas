import type { Node, Edge } from '@xyflow/react';

// ── Core Types ──────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'draft';
  createdAt: string;
  updatedAt: string;
  stbModels: STBModel[];
  tags: string[];
}

export interface STBModel {
  id: string;
  projectId: string;
  name: string;
  description: string;
  chipset: string;
  builds: Build[];
  createdAt: string;
  updatedAt: string;
}

export interface Build {
  id: string;
  stbModelId: string;
  name: string;
  version: string;
  description: string;
  status: 'draft' | 'in_progress' | 'review' | 'released';
  modules: BuildModule[];
  createdAt: string;
  updatedAt: string;
  parentBuildId?: string; // for version history
}

export interface BuildModule {
  id: string;
  buildId: string;
  name: string;
  type: ModuleType;
  description: string;
  nodes: Node[];
  edges: Edge[];
  enabled: boolean;
  order: number;
}

export type ModuleType =
  | 'egos'
  | 'epress'
  | 'ekernel'
  | 'drivers'
  | 'middleware'
  | 'services'
  | 'plugins'
  | 'custom';

export const MODULE_TYPE_META: Record<ModuleType, { label: string; icon: string; color: string }> = {
  egos: { label: 'EGOS', icon: '🧠', color: 'hsl(250, 45%, 58%)' },
  epress: { label: 'EPRESS', icon: '⚡', color: 'hsl(38, 75%, 55%)' },
  ekernel: { label: 'EKERNEL', icon: '🔧', color: 'hsl(200, 55%, 52%)' },
  drivers: { label: 'DRIVERS', icon: '🔌', color: 'hsl(168, 55%, 48%)' },
  middleware: { label: 'MIDDLEWARE', icon: '🔗', color: 'hsl(280, 50%, 55%)' },
  services: { label: 'SERVICES', icon: '☁️', color: 'hsl(210, 60%, 50%)' },
  plugins: { label: 'PLUGINS', icon: '🧩', color: 'hsl(340, 55%, 55%)' },
  custom: { label: 'CUSTOM', icon: '📦', color: 'hsl(0, 0%, 55%)' },
};

export const BUILD_STATUS_META: Record<Build['status'], { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-primary/20 text-primary' },
  review: { label: 'Review', color: 'bg-node-group/20 text-node-group' },
  released: { label: 'Released', color: 'bg-node-module/20 text-node-module' },
};

export const PROJECT_STATUS_META: Record<Project['status'], { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-node-module/20 text-node-module' },
  archived: { label: 'Archived', color: 'bg-muted text-muted-foreground' },
  draft: { label: 'Draft', color: 'bg-primary/20 text-primary' },
};
