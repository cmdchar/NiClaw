import { ProjectConfig, ProjectsRegistry } from './types';
import { logger } from '../utils/logger';
import fs from 'fs';
import { randomUUID } from 'crypto';

export class ProjectWorkspaceService {
  private storePromise: Promise<any>;

  constructor() {
    this.storePromise = import('electron-store').then(({ default: Store }) => {
      return new Store({ name: 'projects-registry' });
    });
  }

  async getRegistry(): Promise<ProjectsRegistry> {
    const store = await this.storePromise;
    const projects = store.get('projects', []) as ProjectConfig[];
    
    // Auto-populate the private-driver default if registry is completely empty
    if (projects.length === 0) {
      const defaultProject: ProjectConfig & { needsConfiguration: boolean } = {
        id: 'private-driver',
        name: 'private-driver.ro',
        path: 'C:\\Server\\private-driver.ro',
        type: 'web',
        defaultBranch: 'main',
        testCommand: 'npm test',
        buildCommand: 'npm run build',
        needsConfiguration: true
      };
      await this.saveRegistry({ projects: [defaultProject] });
      return { projects: [defaultProject] };
    }

    return { projects };
  }

  async saveRegistry(registry: ProjectsRegistry): Promise<void> {
    const store = await this.storePromise;
    store.set('projects', registry.projects);
  }

  async getProject(projectId: string): Promise<ProjectConfig | undefined> {
    const registry = await this.getRegistry();
    return registry.projects.find(p => p.id === projectId);
  }

  async addProject(project: Omit<ProjectConfig, 'id'>): Promise<ProjectConfig> {
    if (!fs.existsSync(project.path)) {
      throw new Error(`Path does not exist: ${project.path}`);
    }
    const registry = await this.getRegistry();
    const newProject: ProjectConfig = {
      ...project,
      id: randomUUID()
    };
    registry.projects.push(newProject);
    await this.saveRegistry(registry);
    return newProject;
  }

  async removeProject(projectId: string): Promise<boolean> {
    const registry = await this.getRegistry();
    const initialLength = registry.projects.length;
    registry.projects = registry.projects.filter(p => p.id !== projectId);
    if (registry.projects.length !== initialLength) {
      await this.saveRegistry(registry);
      return true;
    }
    return false;
  }
}

export const projectWorkspaceService = new ProjectWorkspaceService();
