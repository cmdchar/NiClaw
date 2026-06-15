import { exec } from 'child_process';
import { promisify } from 'util';
import { ProjectConfig } from './types';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export class VerificationService {
  /**
   * Generates a unified git diff for the current workspace.
   */
  async getDiff(projectPath: string): Promise<string> {
    try {
      // Get diff of tracked files and also untracked files if any (git add -N . && git diff)
      // Safest way to see all changes is git status and git diff
      await execAsync('git add -N .', { cwd: projectPath }); 
      const { stdout } = await execAsync('git diff', { cwd: projectPath });
      return stdout;
    } catch (e: any) {
      logger.error(`Verification Service failed to get diff: ${e.message}`);
      return `Error generating diff: ${e.message}`;
    }
  }

  /**
   * Runs the project's build/test command to verify compilation.
   */
  async runBuild(project: ProjectConfig, onLog: (msg: string) => void): Promise<boolean> {
    const buildCmd = project.buildCommand;
    if (!buildCmd) {
      onLog('No build command configured for project. Skipping build verification.');
      return true;
    }

    onLog(`Running build verification: ${buildCmd}`);
    try {
      const { stdout, stderr } = await execAsync(buildCmd, { cwd: project.path });
      if (stderr) {
        onLog(`[BUILD STDERR] ${stderr}`);
      }
      onLog(`[BUILD STDOUT] ${stdout}`);
      return true;
    } catch (e: any) {
      onLog(`[BUILD FAILED] ${e.message}`);
      if (e.stdout) onLog(`[BUILD STDOUT] ${e.stdout}`);
      if (e.stderr) onLog(`[BUILD STDERR] ${e.stderr}`);
      return false;
    }
  }
}

export const verificationService = new VerificationService();
