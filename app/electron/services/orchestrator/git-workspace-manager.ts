import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export class GitWorkspaceManager {
  
  /**
   * Gets the current branch name of the project.
   */
  async getCurrentBranch(projectPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath });
      return stdout.trim();
    } catch (e: any) {
      logger.error(`Failed to get current branch: ${e.message}`);
      throw new Error(`Git error: not a git repository or no commits yet.`);
    }
  }

  /**
   * Checks out a new branch from the current branch.
   */
  async checkoutNewBranch(projectPath: string, branchName: string): Promise<boolean> {
    try {
      await execAsync(`git checkout -b ${branchName}`, { cwd: projectPath });
      logger.info(`Checked out new branch ${branchName} in ${projectPath}`);
      return true;
    } catch (e: any) {
      logger.error(`Failed to checkout branch ${branchName}: ${e.message}`);
      // Fallback: maybe branch exists, try just checking it out
      try {
        await execAsync(`git checkout ${branchName}`, { cwd: projectPath });
        return true;
      } catch (e2: any) {
        throw new Error(`Failed to create or checkout branch ${branchName}.`);
      }
    }
  }

  /**
   * Commits current changes (used if Codex CLI doesn't commit itself, or for fallback).
   */
  async commitChanges(projectPath: string, message: string): Promise<boolean> {
    try {
      await execAsync('git add .', { cwd: projectPath });
      await execAsync(`git commit -m "${message}"`, { cwd: projectPath });
      return true;
    } catch (e: any) {
      logger.error(`Commit failed (might be no changes): ${e.message}`);
      return false; // Typically means nothing to commit
    }
  }
}

export const gitWorkspaceManager = new GitWorkspaceManager();
