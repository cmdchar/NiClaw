import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { taskEventStore } from './task-event-store';
import { policyEngine } from './policy-engine';
import { projectDiscoveryService } from './project-discovery-service';

const execAsync = promisify(exec);

export class WorkspaceKernel {
  private async getProjectPath(projectId: string): Promise<string> {
    if (projectId === 'codex-safety-test') {
      return 'C:\\Server\\sandbox\\codex-safety-test';
    }
    const projects = await projectDiscoveryService.discoverProjects();
    const proj = projects.find(p => p.id === projectId);
    if (!proj) {
      throw new Error(`Project ${projectId} not found.`);
    }
    return proj.path;
  }

  private async resolveAndValidatePath(projectId: string, relativePath: string): Promise<string> {
    const projectPath = await this.getProjectPath(projectId);
    const targetPath = resolve(projectPath, relativePath);
    if (!targetPath.startsWith(projectPath)) {
      throw new Error(`Path traversal blocked: ${relativePath}`);
    }
    return targetPath;
  }

  async listFiles(workspaceId: string, projectId: string, relativePath: string = '.'): Promise<string[]> {
    const ws = taskEventStore.getWorkspace(workspaceId);
    if (!ws) throw new Error('Workspace not found');

    const action = { type: 'list' as const, payload: { path: relativePath } };
    const classification = await policyEngine.classifyWorkspaceAction(action);
    const eventData = { actionKind: 'listFiles', actionType: 'file', policyLevel: classification.level, ...action.payload };
    
    if (classification.level === 'blocked') {
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.action.blocked', `Blocked file list: ${classification.reason}`, eventData);
      throw new Error(`Action blocked: ${classification.reason}`);
    }

    try {
      const targetPath = await this.resolveAndValidatePath(projectId, relativePath);
      const items = await fs.readdir(targetPath);
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.file.listed', `Listed files in ${relativePath}`, eventData);
      return items;
    } catch (e: any) {
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.action.failed', `Failed to list files: ${e.message}`, eventData);
      throw e;
    }
  }

  async readFile(workspaceId: string, projectId: string, relativePath: string): Promise<string> {
    const ws = taskEventStore.getWorkspace(workspaceId);
    if (!ws) throw new Error('Workspace not found');

    const action = { type: 'read' as const, payload: { path: relativePath } };
    const classification = await policyEngine.classifyWorkspaceAction(action);
    const eventData = { actionKind: 'readFile', actionType: 'file', policyLevel: classification.level, ...action.payload };
    
    if (classification.level === 'blocked') {
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.action.blocked', `Blocked file read: ${classification.reason}`, eventData);
      throw new Error(`Action blocked: ${classification.reason}`);
    }

    try {
      const targetPath = await this.resolveAndValidatePath(projectId, relativePath);
      const content = await fs.readFile(targetPath, 'utf8');
      
      // Update context files if not present
      if (!ws.contextFiles.includes(relativePath)) {
        ws.contextFiles.push(relativePath);
        taskEventStore['saveWorkspaces'](); // small hack, better to use a dedicated method
      }

      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.file.read', `Read file ${relativePath}`, eventData);
      return content;
    } catch (e: any) {
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.action.failed', `Failed to read file: ${e.message}`, eventData);
      throw e;
    }
  }

  async search(workspaceId: string, projectId: string, query: string, glob?: string): Promise<any> {
    const ws = taskEventStore.getWorkspace(workspaceId);
    if (!ws) throw new Error('Workspace not found');

    const action = { type: 'search' as const, payload: { query, glob } };
    const classification = await policyEngine.classifyWorkspaceAction(action);
    const eventData = { actionKind: 'search', actionType: 'search', policyLevel: classification.level, ...action.payload };
    
    if (classification.level === 'blocked') {
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.action.blocked', `Blocked search: ${classification.reason}`, eventData);
      throw new Error(`Action blocked: ${classification.reason}`);
    }

    try {
      const projectPath = await this.getProjectPath(projectId);
      const searchCmd = `rg -n "${query}" ${glob ? `-g "${glob}"` : ''} .`;
      
      const { stdout } = await execAsync(searchCmd, { cwd: projectPath });
      
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.search.completed', `Executed search for ${query}`, eventData);
      return stdout;
    } catch (e: any) {
      // ripgrep exits with 1 if no matches are found, which throws in execAsync
      if (e.code === 1) {
        taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.search.completed', `Executed search for ${query} (no matches)`, eventData);
        return '';
      }
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.action.failed', `Failed to search: ${e.message}`, eventData);
      throw e;
    }
  }

  async runCommand(workspaceId: string, projectId: string, command: string, cwdRelative?: string, isApproved: boolean = false): Promise<{ stdout: string, stderr: string }> {
    const ws = taskEventStore.getWorkspace(workspaceId);
    if (!ws) throw new Error('Workspace not found');

    const action = { type: 'command' as const, payload: { command, cwdRelative } };
    const classification = await policyEngine.classifyWorkspaceAction(action);
    const eventData = { actionKind: 'runCommand', actionType: 'command', policyLevel: classification.level, ...action.payload };
    
    if (classification.level === 'blocked') {
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.command.blocked', `Blocked command execution: ${classification.reason}`, eventData);
      
      // Also notify policy engine to potentially halt the task
      await policyEngine.detectPolicyViolation(ws.taskId, { reason: classification.reason });
      
      throw new Error(`Command blocked by Policy Engine: ${classification.reason}`);
    }

    if (classification.level === 'dangerous' && !isApproved) {
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.command.blocked', `Command requires explicit approval: ${classification.reason}`, eventData);
      const error: any = new Error(`Command requires explicit approval: ${classification.reason}`);
      error.code = 'REQUIRES_APPROVAL';
      throw error;
    }

    try {
      const projectPath = await this.getProjectPath(projectId);
      const cwd = cwdRelative ? await this.resolveAndValidatePath(projectId, cwdRelative) : projectPath;

      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.command.started', `Started command: ${command} [Level: ${classification.level}]`, eventData);

      const { stdout, stderr } = await execAsync(command, { cwd });

      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.command.completed', `Command completed: ${command}`, {
        ...eventData,
        stdoutPreview: stdout.substring(0, 200),
        stderrPreview: stderr.substring(0, 200)
      });

      // Save large outputs as artifacts
      if (stdout.length > 500) {
         await taskEventStore.saveWorkspaceArtifact(workspaceId, `stdout_${Date.now()}.log`, 'command_stdout', stdout);
      }
      if (stderr.length > 500) {
         await taskEventStore.saveWorkspaceArtifact(workspaceId, `stderr_${Date.now()}.log`, 'command_stderr', stderr);
      }

      return { stdout, stderr };
    } catch (e: any) {
      taskEventStore.addWorkspaceEvent(workspaceId, 'workspace.command.failed', `Command failed: ${command}`, {
        ...eventData,
        error: e.message,
        stdoutPreview: e.stdout?.substring(0, 200),
        stderrPreview: e.stderr?.substring(0, 200)
      });
      
      if (e.stdout?.length > 500) {
         await taskEventStore.saveWorkspaceArtifact(workspaceId, `stdout_err_${Date.now()}.log`, 'command_stdout', e.stdout);
      }
      if (e.stderr?.length > 500) {
         await taskEventStore.saveWorkspaceArtifact(workspaceId, `stderr_err_${Date.now()}.log`, 'command_stderr', e.stderr);
      }
      
      throw e;
    }
  }
}

export const workspaceKernel = new WorkspaceKernel();
