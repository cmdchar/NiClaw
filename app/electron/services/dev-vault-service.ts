import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getDataDir } from '../utils/paths';

const VAULT_FOLDERS = ['raw', 'inbox', 'projects', 'wiki', 'ops', 'agents', 'reports', 'output'] as const;
const AGENT_RULE_FILES = ['CODEX.md', 'CLAUDE.md', 'ANTIGRAVITY.md'] as const;

export interface DevVaultFolderStatus {
  name: string;
  path: string;
  exists: boolean;
}

export interface DevVaultStatus {
  rootPath: string;
  statePath: string;
  folders: DevVaultFolderStatus[];
  agentRules: DevVaultFolderStatus[];
}

export interface CommandCenterTask {
  line: number;
  text: string;
  checked: boolean;
}

export interface CommandCenterReport {
  name: string;
  path: string;
  updatedAt: string;
  size: number;
}

export function getCommandCenterStatePath(): string {
  return join(getDataDir(), 'command-center-state.json');
}

export function getDevVaultRoot(): string {
  return join(getDataDir(), 'dev-vault');
}

function nowIso(): string {
  return new Date().toISOString();
}

function agentRuleContent(agentName: string): string {
  return [
    `# ${agentName} Rules`,
    '',
    '- Read the relevant agent file before work.',
    '- Do not write randomly across folders.',
    '- Update indexes after meaningful changes.',
    '- Create reports after major changes.',
    '- Use branches for risky work.',
    '- Do not touch secrets, env files, deployment credentials, destructive commands, or production deploys without confirmation.',
    '- Keep generated outputs in output/.',
    '- Keep stable docs in wiki/.',
    '- Keep incoming tasks in inbox/.',
    '',
  ].join('\n');
}

async function writeIfMissing(path: string, content: string): Promise<void> {
  if (existsSync(path)) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

export async function ensureDevVault(): Promise<DevVaultStatus> {
  const rootPath = getDevVaultRoot();
  const statePath = getCommandCenterStatePath();
  await mkdir(rootPath, { recursive: true });

  for (const folder of VAULT_FOLDERS) {
    await mkdir(join(rootPath, folder), { recursive: true });
  }

  await writeIfMissing(statePath, `${JSON.stringify({ createdAt: nowIso(), updatedAt: nowIso() }, null, 2)}\n`);
  await writeIfMissing(join(rootPath, 'inbox', 'tasks.md'), '# Command Center Tasks\n\n');

  for (const file of AGENT_RULE_FILES) {
    await writeIfMissing(join(rootPath, 'agents', file), agentRuleContent(file.replace('.md', '')));
  }

  return getDevVaultStatus();
}

export function getDevVaultStatus(): DevVaultStatus {
  const rootPath = getDevVaultRoot();
  const statePath = getCommandCenterStatePath();
  return {
    rootPath,
    statePath,
    folders: VAULT_FOLDERS.map((name) => {
      const path = join(rootPath, name);
      return { name, path, exists: existsSync(path) };
    }),
    agentRules: AGENT_RULE_FILES.map((name) => {
      const path = join(rootPath, 'agents', name);
      return { name, path, exists: existsSync(path) };
    }),
  };
}

export async function readCommandCenterTasks(): Promise<{ path: string; exists: boolean; tasks: CommandCenterTask[] }> {
  const path = join(getDevVaultRoot(), 'inbox', 'tasks.md');
  if (!existsSync(path)) {
    return { path, exists: false, tasks: [] };
  }
  const raw = await readFile(path, 'utf8');
  const tasks = raw
    .split(/\r?\n/)
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => /^\s*-\s+\[[ xX]\]\s+/.test(line))
    .map(({ line, index }) => ({
      line: index,
      checked: /^\s*-\s+\[[xX]\]/.test(line),
      text: line.replace(/^\s*-\s+\[[ xX]\]\s+/, '').trim(),
    }));
  return { path, exists: true, tasks };
}

export async function appendInboxEntry(input: { title?: string; content: string; source?: string }): Promise<{ path: string }> {
  await ensureDevVault();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTitle = (input.title || 'inbox-entry').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'inbox-entry';
  const path = join(getDevVaultRoot(), 'inbox', `${stamp}-${safeTitle}.md`);
  const content = [
    `# ${input.title || 'Inbox Entry'}`,
    '',
    `- Created: ${nowIso()}`,
    `- Source: ${input.source || 'command-center'}`,
    '',
    input.content.trim(),
    '',
  ].join('\n');
  await writeFile(path, content, 'utf8');
  return { path };
}

export async function listRecentReports(limit = 10): Promise<CommandCenterReport[]> {
  const reportsDir = join(getDevVaultRoot(), 'reports');
  if (!existsSync(reportsDir)) return [];
  const entries = await readdir(reportsDir, { withFileTypes: true });
  const reports: CommandCenterReport[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
    const path = join(reportsDir, entry.name);
    const meta = await stat(path);
    reports.push({
      name: entry.name,
      path,
      updatedAt: meta.mtime.toISOString(),
      size: meta.size,
    });
  }
  return reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

export async function writeCommandCenterReport(input: { title: string; body: string }): Promise<{ path: string }> {
  await ensureDevVault();
  const id = randomUUID().slice(0, 8);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${stamp}-${id}-${basename(input.title).replace(/[^a-z0-9._-]+/gi, '-') || 'report'}.md`;
  const path = join(getDevVaultRoot(), 'reports', fileName);
  await writeFile(path, `# ${input.title}\n\n- Created: ${nowIso()}\n\n${input.body.trim()}\n`, 'utf8');
  return { path };
}

