import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface GitStatusSnapshot {
  isGit: boolean;
  branch?: string;
  dirty?: boolean;
  changedFiles?: number;
  lastCommit?: string;
  error?: string;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    windowsHide: true,
    timeout: 5000,
    maxBuffer: 256 * 1024,
  });
  return String(stdout).trim();
}

export async function readGitStatus(projectPath: string): Promise<GitStatusSnapshot> {
  const hasGitMarker = await pathExists(join(projectPath, '.git'));
  try {
    const inside = await runGit(projectPath, ['rev-parse', '--is-inside-work-tree']);
    if (inside !== 'true') {
      return { isGit: false };
    }

    const [branch, statusOutput, lastCommit] = await Promise.all([
      runGit(projectPath, ['rev-parse', '--abbrev-ref', 'HEAD']).catch(() => 'unknown'),
      runGit(projectPath, ['status', '--porcelain']).catch(() => ''),
      runGit(projectPath, ['log', '-1', '--format=%h %cs %s']).catch(() => ''),
    ]);
    const changedFiles = statusOutput ? statusOutput.split(/\r?\n/).filter(Boolean).length : 0;

    return {
      isGit: true,
      branch,
      dirty: changedFiles > 0,
      changedFiles,
      lastCommit: lastCommit || undefined,
    };
  } catch (error) {
    if (!hasGitMarker) {
      return { isGit: false };
    }
    return {
      isGit: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

