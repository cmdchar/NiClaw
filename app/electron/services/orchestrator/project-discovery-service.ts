import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { ProjectIndex } from './types';
import { obsidianMemoryService } from '../obsidian-memory';
import { getDataDir } from '../../utils/paths';

export class ProjectDiscoveryService {
  private cache: ProjectIndex[] = [];
  private lastScan: number = 0;
  private readonly SERVER_ROOT = 'C:\\Server';
  private overrides: Record<string, 'READY' | 'ARCHIVE'> = {};

  private get indexPath() {
    return join(getDataDir(), 'command-center', 'project-index.json');
  }

  private get overridesPath() {
    return join(getDataDir(), 'command-center', 'project-overrides.json');
  }

  constructor() {
    this.loadIndexAtomically();
  }

  async setManualOverride(projectId: string, status: 'READY' | 'ARCHIVE') {
    this.overrides[projectId] = status;
    const project = this.cache.find(p => p.id === projectId);
    if (project) {
      project.status = status;
      project.reasonNotReady = `Manually marked as ${status}`;
      await this.saveIndexAtomically();
    }
    await this.saveOverrides();
  }

  private async loadIndexAtomically() {
    try {
      if (await this.pathExists(this.overridesPath)) {
        const oData = await fs.readFile(this.overridesPath, 'utf8');
        this.overrides = JSON.parse(oData);
      }
    } catch (e) {
      console.error('Failed to load overrides:', e);
    }
    try {
      if (await this.pathExists(this.indexPath)) {
        const data = await fs.readFile(this.indexPath, 'utf8');
        this.cache = JSON.parse(data);
        this.lastScan = Date.now();
      }
    } catch (e) {
      console.error('Failed to load project index:', e);
    }
  }

  private async saveOverrides() {
    try {
      const dir = join(getDataDir(), 'command-center');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.overridesPath, JSON.stringify(this.overrides, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save overrides:', e);
    }
  }

  async discoverProjects(forceRefresh = false): Promise<ProjectIndex[]> {
    if (!forceRefresh && this.cache.length > 0 && (Date.now() - this.lastScan) < 5 * 60 * 1000) {
      return this.cache;
    }

    const projects: Map<string, ProjectIndex> = new Map();

    // 1. Scan FS (C:\Server)
    try {
      const entries = await fs.readdir(this.SERVER_ROOT, { withFileTypes: true });
      
      const processDirectory = async (projectPath: string, name: string) => {
        const pathExists = await this.pathExists(projectPath);
        const isGit = await this.pathExists(join(projectPath, '.git'));
        const hasPackage = await this.pathExists(join(projectPath, 'package.json'));
        const hasReadmeUpper = await this.pathExists(join(projectPath, 'README.md'));
        const hasReadmeLower = await this.pathExists(join(projectPath, 'readme.md'));
        const hasReadme = hasReadmeUpper || hasReadmeLower;
        
        let commands: ProjectIndex['commands'] = {
          build: 'unknown',
          test: 'unknown',
          lint: 'unknown',
          dev: 'unknown'
        };
        let techStack: string[] = [];
        
        if (hasPackage) {
          techStack.push('node');
          try {
            const pkgStr = await fs.readFile(join(projectPath, 'package.json'), 'utf8');
            const pkg = JSON.parse(pkgStr);
            if (pkg.scripts) {
              commands.build = pkg.scripts.build ? 'configured' : 'missing';
              commands.test = pkg.scripts.test ? 'configured' : 'missing';
              commands.lint = pkg.scripts.lint ? 'configured' : 'missing';
              commands.dev = (pkg.scripts.dev || pkg.scripts.start) ? 'configured' : 'missing';
            } else {
              commands.build = 'missing';
              commands.test = 'missing';
              commands.lint = 'missing';
              commands.dev = 'missing';
            }
          } catch (e) {
            // ignore parse errors
          }
        }

        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Readiness Logic
        let status: ProjectIndex['status'] = 'INCOMPLETE';
        let reasonNotReady = '';
        
        if (!pathExists) {
          status = 'MISSING_PATH';
          reasonNotReady = 'Directory path is inaccessible.';
        } else if (isGit || hasPackage) {
          if (hasReadme) {
            status = 'READY';
            reasonNotReady = '';
          } else {
            status = 'PARTIAL';
            reasonNotReady = 'Missing README documentation.';
          }
        } else {
          status = 'INCOMPLETE';
          reasonNotReady = 'Not a recognized Git or Node project format.';
        }

        if (this.overrides[id]) {
          status = this.overrides[id];
          reasonNotReady = `Manually marked as ${status}`;
        }

        projects.set(id, {
          id,
          name: name,
          aliases: [name],
          path: projectPath,
          domains: name.includes('.') ? [name] : [],
          git: isGit,
          techStack,
          pathExists,
          hasPackageJson: hasPackage,
          hasReadme,
          status,
          reasonNotReady,
          commands,
          obsidianLinks: [],
          lastIndexedAt: new Date().toISOString(),
          confidenceScore: 0.8
        });
      };

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_') || entry.name === 'node_modules') {
          continue;
        }

        const rootPath = join(this.SERVER_ROOT, entry.name);
        await processDirectory(rootPath, entry.name);

        // Also check 1 level deeper if it's a monorepo or grouping folder
        try {
          const subEntries = await fs.readdir(rootPath, { withFileTypes: true });
          for (const sub of subEntries) {
            if (sub.isDirectory() && !sub.name.startsWith('.') && sub.name !== 'node_modules') {
              const subPath = join(rootPath, sub.name);
              // Only process sub-directory if it looks like a project itself (has package.json or .git)
              if (await this.pathExists(join(subPath, 'package.json')) || await this.pathExists(join(subPath, '.git'))) {
                await processDirectory(subPath, `${entry.name}-${sub.name}`);
              }
            }
          }
        } catch(e) {}
      }

    } catch (e) {
      console.error('Failed to scan server root', e);
    }

    // 2. Scan Obsidian for project mentions
    // For now, we simulate pulling notes matching "project" or checking if folder names match note names.
    // In a real deep scan, we would look for YAML frontmatter `type: project` or parse `Projects/` dir.
    try {
      // Very basic intersection: look for notes with the exact same name as the folder
      for (const [id, proj] of projects.entries()) {
        const results = await obsidianMemoryService.searchNotes(proj.name, 5);
        if (results && results.length > 0) {
          proj.obsidianLinks = results.map(r => r.path);
          proj.confidenceScore = Math.min(1.0, proj.confidenceScore + 0.15); // Bonus for having documentation
        }
      }
    } catch (e) {
      console.error('Failed to correlate with Obsidian', e);
    }

    this.cache = Array.from(projects.values());
    this.lastScan = Date.now();
    await this.saveIndexAtomically();
    return this.cache;
  }

  private async saveIndexAtomically() {
    try {
      const dir = join(getDataDir(), 'command-center');
      await fs.mkdir(dir, { recursive: true });
      const tempFile = join(dir, `project-index.json.tmp.${Date.now()}`);
      const backupFile = join(dir, 'project-index.json.bak');
      
      await fs.writeFile(tempFile, JSON.stringify(this.cache, null, 2), 'utf8');
      if (await this.pathExists(this.indexPath)) {
        await fs.copyFile(this.indexPath, backupFile);
      }
      await fs.rename(tempFile, this.indexPath);
    } catch (err) {
      console.error('Failed to save project index atomically:', err);
    }
  }

  async searchProjects(query: string): Promise<ProjectIndex[]> {
    const all = await this.discoverProjects();
    if (!query) return all;

    const lowerQ = query.toLowerCase();
    return all.filter(p => 
      p.name.toLowerCase().includes(lowerQ) || 
      p.aliases.some(a => a.toLowerCase().includes(lowerQ))
    ).sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  async getProjectContext(projectId: string): Promise<any> {
    const all = await this.discoverProjects();
    const proj = all.find(p => p.id === projectId);
    if (!proj) return null;

    // Load actual markdown snippets from obsidian if available
    const notesContent = [];
    for (const notePath of proj.obsidianLinks.slice(0, 3)) { // max 3 notes to avoid huge context
      const content = await obsidianMemoryService.readNote(notePath);
      if (content) {
        notesContent.push({ path: notePath, content });
      }
    }

    return {
      project: proj,
      notes: notesContent
    };
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }
}

export const projectDiscoveryService = new ProjectDiscoveryService();
