import { access, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { readGitStatus, type GitStatusSnapshot } from './git-monitor';

const EXCLUDED_DIRS = new Set([
  '.git',
  '.idea',
  '.vscode',
  'node_modules',
  'dist',
  'dist-electron',
  'build',
  'out',
  'release',
  'coverage',
  'RecycleBin',
]);

const PROJECT_MARKERS = [
  'package.json',
  'pnpm-workspace.yaml',
  'pyproject.toml',
  'requirements.txt',
  'Cargo.toml',
  'go.mod',
  'docker-compose.yml',
  'AGENTS.md',
  join('ai', 'BRAIN.md'),
];

export interface WorkspaceRootScan {
  path: string;
  exists: boolean;
  error?: string;
}

export interface DevProjectSnapshot {
  name: string;
  path: string;
  markers: string[];
  kind: string;
  git: GitStatusSnapshot;
}

export interface DevWorkspaceScanResult {
  generatedAt: string;
  roots: WorkspaceRootScan[];
  projects: DevProjectSnapshot[];
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function splitConfiguredRoots(raw: string): string[] {
  return raw
    .split(/[;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of paths) {
    const normalized = resolve(item);
    const key = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function getDefaultWorkspaceRoots(): string[] {
  const configured = process.env.NICLAW_DEV_WORKSPACES || process.env.CLAWX_DEV_WORKSPACES || '';
  const roots = configured ? splitConfiguredRoots(configured) : [];
  const cwd = process.cwd();
  roots.push(cwd);
  roots.push(dirname(cwd));
  if (process.platform === 'win32') {
    roots.push('C:\\Server');
  } else {
    roots.push('/home/debian');
    roots.push('/home/debian/Server');
  }
  return uniquePaths(roots);
}

async function readChildDirs(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name))
    .map((entry) => join(root, entry.name));
}

async function detectMarkers(projectPath: string): Promise<string[]> {
  const found: string[] = [];
  for (const marker of PROJECT_MARKERS) {
    if (await pathExists(join(projectPath, marker))) {
      found.push(marker.split(sep).join('/'));
    }
  }
  if (await pathExists(join(projectPath, '.git'))) {
    found.push('.git');
  }
  return found;
}

function classifyProject(markers: string[]): string {
  if (markers.includes('package.json') || markers.includes('pnpm-workspace.yaml')) return 'node';
  if (markers.includes('pyproject.toml') || markers.includes('requirements.txt')) return 'python';
  if (markers.includes('Cargo.toml')) return 'rust';
  if (markers.includes('go.mod')) return 'go';
  if (markers.includes('docker-compose.yml')) return 'docker';
  if (markers.includes('ai/BRAIN.md')) return 'ai-workspace';
  if (markers.includes('.git')) return 'git';
  return 'workspace';
}

async function collectCandidates(root: string): Promise<string[]> {
  const candidates = new Set<string>([root]);
  for (const child of await readChildDirs(root)) {
    candidates.add(child);
    if (basename(root).toLowerCase() === 'server') {
      for (const grandchild of await readChildDirs(child).catch(() => [])) {
        candidates.add(grandchild);
      }
    }
  }
  return Array.from(candidates);
}

export async function scanDevelopmentWorkspaces(options?: { maxProjects?: number }): Promise<DevWorkspaceScanResult> {
  const maxProjects = options?.maxProjects ?? 80;
  const roots = getDefaultWorkspaceRoots();
  const rootStatuses: WorkspaceRootScan[] = [];
  const projects: DevProjectSnapshot[] = [];
  const seenProjects = new Set<string>();

  for (const root of roots) {
    if (!existsSync(root)) {
      rootStatuses.push({ path: root, exists: false });
      continue;
    }

    rootStatuses.push({ path: root, exists: true });
    let candidates: string[] = [];
    try {
      candidates = await collectCandidates(root);
    } catch (error) {
      rootStatuses[rootStatuses.length - 1].error = error instanceof Error ? error.message : String(error);
      continue;
    }

    for (const candidate of candidates) {
      if (projects.length >= maxProjects) break;
      const normalized = resolve(candidate);
      const key = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
      if (seenProjects.has(key)) continue;
      seenProjects.add(key);

      const markers = await detectMarkers(normalized);
      if (markers.length === 0) continue;
      projects.push({
        name: basename(normalized),
        path: normalized,
        markers,
        kind: classifyProject(markers),
        git: await readGitStatus(normalized),
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    roots: rootStatuses,
    projects: projects.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

