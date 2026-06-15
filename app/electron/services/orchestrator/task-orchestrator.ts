import { exec } from 'child_process';
import { promisify } from 'util';
import { taskEventStore } from './task-event-store';
import { projectDiscoveryService } from './project-discovery-service';
import { policyEngine } from './policy-engine';
import { hermesAdapter } from './hermes-adapter';
import { gitWorkspaceManager } from './git-workspace-manager';
import { codexCliAdapter } from './codex-cli-adapter';
import { remoteClaudeCodeAgent } from './remote-claude-code-agent';
import { Task, ProjectIndex } from './types';

const execAsync = promisify(exec);

export class TaskOrchestrator {
  async submitTask(title: string, userPrompt: string, targetProject: string, executor?: string): Promise<Task> {
    const task = taskEventStore.createTask(title, userPrompt, targetProject, executor);
    
    // Start processing asynchronously
    this.processTask(task.id).catch(err => {
      taskEventStore.addEvent(task.id, 'error', `Orchestrator error: ${err.message}`);
      taskEventStore.updateTaskStatus(task.id, 'failed');
    });

    return task;
  }

  private async processTask(taskId: string) {
    const task = taskEventStore.getTask(taskId);
    if (!task) return;

    const onLog = (msg: string) => taskEventStore.addLog(taskId, msg);

    // State: parsing_intent
    taskEventStore.updateTaskStatus(taskId, 'parsing_intent');
    onLog('Parsing structural intent from prompt...');

    // Check if targetProject was explicitly provided (e.g. codex-safety-test sandbox)
    let targetProject: ProjectIndex | null = null;

    if (task.targetProject === 'codex-safety-test') {
      // Direct sandbox bypass — no structural parsing needed
      onLog('[Phase 2.9B] Explicit sandbox target: codex-safety-test');
      targetProject = {
        id: 'codex-safety-test',
        name: 'codex-safety-test',
        path: 'C:/Server/sandbox/codex-safety-test',
        domains: [],
        aliases: ['sandbox', 'safety-test'],
        confidenceScore: 10,
        status: 'READY' as any,
        source: 'manual' as any,
      } as unknown as ProjectIndex;
    } else {
      // Structural parser
      const prompt = task.userPrompt.toLowerCase();
      const projects = await projectDiscoveryService.discoverProjects();
      
      let candidates: Array<{ project: ProjectIndex, score: number }> = [];

      for (const p of projects) {
        let score = 0;
        if (task.targetProject && p.id === task.targetProject) score += 100; // Explicitly passed project ID
        if (prompt.includes(p.name.toLowerCase())) score += 5;
        if (p.domains && p.domains.some(d => prompt.includes(d.toLowerCase()))) score += 4;
        if (p.aliases && p.aliases.some(a => prompt.includes(a.toLowerCase()))) score += 3;
        
        // broad terms based on name/stack
        if (prompt.includes('taxi') && p.name.includes('driver')) score += 2;
        if (prompt.includes('booking') && p.name.includes('calendar')) score += 2;
        if (prompt.includes('niclaw') && p.name.includes('niclaw')) score += 5;
        if (prompt.includes('android') && p.name.includes('jarvis')) score += 4;

        if (score > 0) {
          candidates.push({ project: p, score: score + p.confidenceScore });
        }
      }

      candidates.sort((a, b) => b.score - a.score);

      if (candidates.length === 0 || candidates[0].score < 3) {
        // Ambiguous
        taskEventStore.updateTaskStatus(taskId, 'waiting_clarification');
        taskEventStore.addEvent(taskId, 'intent_ambiguous', 'Could not structurally determine the target project.', {
          options: projects.map(p => p.name).slice(0, 5)
        });
        return;
      }

      targetProject = candidates[0].project;
    }

    taskEventStore.updateTaskField(taskId, { targetProject: targetProject.id });

    // State: discovering_project
    taskEventStore.updateTaskStatus(taskId, 'discovering_project');
    onLog(`Project discovered: ${targetProject.name} at ${targetProject.path} (Score: ${targetProject.confidenceScore.toFixed(1)})`);

    // State: loading_context
    taskEventStore.updateTaskStatus(taskId, 'loading_context');
    onLog('Loading context from Project Discovery (Obsidian + FS)...');
    const context = await projectDiscoveryService.getProjectContext(targetProject.id);

    // State: planning
    taskEventStore.updateTaskStatus(taskId, 'planning');
    
    onLog('Generating Hermes plan...');
    const { plan, isFallback } = await hermesAdapter.generatePlan(task.userPrompt, targetProject, context);
    taskEventStore.addEvent(taskId, 'plan_generated', isFallback ? 'Hermes unavailable - generated fallback structural plan' : 'Hermes generated plan successfully', { plan });

    onLog('Evaluating plan against Policy Engine...');
    const policyResult = await policyEngine.evaluateExecutionPlan(taskId, targetProject.id, { files: (plan as any).filesToEdit || [], commands: (plan as any).commands || [] });
    if (!policyResult.valid) {
      onLog(`[BLOCKED] Policy violation: ${policyResult.reason}`);
      await policyEngine.detectPolicyViolation(taskId, { reason: policyResult.reason });
      return;
    }

    // Await approval
    taskEventStore.updateTaskStatus(taskId, 'waiting_approval');
    taskEventStore.addEvent(taskId, 'approval_request', 'Plan generated. Please approve to proceed (Phase 4.1 / 2.9B validation).');
  }

  async approveTask(taskId: string) {
    const task = taskEventStore.getTask(taskId);
    if (!task || task.status !== 'waiting_approval') return;

    const onLog = (msg: string) => taskEventStore.addLog(taskId, msg);

    // State: running
    taskEventStore.updateTaskStatus(taskId, 'running');
    onLog('Task approved. Starting Phase 2.9B Real Codex CLI Execution.');

    const projectPath = task.targetProject === 'codex-safety-test' ? 'C:/Server/sandbox/codex-safety-test' : 'C:/Server/niclaw/app';
    const branchName = `niclaw-auto-${taskId}`;
    
    onLog(`Creating and checking out branch: ${branchName}`);
    try {
      await gitWorkspaceManager.checkoutNewBranch(projectPath, branchName);
      onLog(`Successfully checked out branch ${branchName}.`);
    } catch(err: any) {
      onLog(`[ERROR] Failed to create branch: ${err.message}`);
      taskEventStore.updateTaskStatus(taskId, 'failed');
      return;
    }

    // Phase 2.9B / Phase Remote-1.2: Branch execution
    let execResult: any;

    if (task.executor === 'remote-claude-code') {
      onLog(`[Phase Remote-3A-R] Invoking REMOTE Claude Code CLI for prompt: "${task.userPrompt}"`);
      taskEventStore.addEvent(taskId, 'execution_started', 'Remote Claude Code execution started', {
        phase: 'Remote-3A-R',
        prompt: task.userPrompt,
        projectPath,
        branchName,
      });

      const projectConfig = { id: task.targetProject, name: task.targetProject, path: projectPath, commands: {}, type: 'auto', defaultBranch: 'main' } as any;
      execResult = await remoteClaudeCodeAgent.executePlan(task.userPrompt, projectConfig, onLog);
    } else {
      // Default codex
      onLog(`[Phase 2.9B] Invoking REAL Codex CLI for prompt: "${task.userPrompt}"`);
      taskEventStore.addEvent(taskId, 'execution_started', 'Real Codex CLI execution started', {
        phase: '2.9B',
        prompt: task.userPrompt,
        projectPath,
        branchName,
      });

      const projectConfig = { id: task.targetProject, name: task.targetProject, path: projectPath, commands: {}, type: 'auto', defaultBranch: 'main' } as any;
      const dryRun = task.targetProject !== 'codex-safety-test';
      execResult = await codexCliAdapter.executePlan(task.userPrompt, projectConfig, onLog, dryRun);
    }
    
    // Record execution result event with full metrics
    taskEventStore.addEvent(taskId, 'execution_completed', 
      execResult.realInvocation ? 'Real execution completed' : 'Execution was NOT invoked (detection failed)',
      {
        phase: task.executor === 'remote-claude-code' ? 'Remote-1.2' : '2.9B',
        realInvocation: execResult.realInvocation,
        codexVersion: execResult.codexVersion,
        commandExecuted: execResult.commandExecuted,
        exitCode: execResult.exitCode,
        durationMs: execResult.durationMs,
        durationHuman: `${(execResult.durationMs / 1000).toFixed(1)}s`,
        filesChanged: execResult.filesChanged || [],
        filesChangedCount: (execResult.filesChanged || []).length,
        diffSize: execResult.diffSize,
        stdout: (execResult.stdout || '').substring(0, 5000),
        stderr: (execResult.stderr || '').substring(0, 2000),
        success: execResult.success,
      }
    );

    if (execResult.exitCode === 124) {
      taskEventStore.addEvent(taskId, 'execution_timeout', 'Codex CLI hit execution timeout (10m)');
      onLog(`[Phase 2.9C] Timeout hit (124). Checking if any files were changed...`);
    } else if (!execResult.success) {
      onLog(`[ERROR] Codex CLI failed: exitCode=${execResult.exitCode}, files=${execResult.filesChanged.length}`);
    }

    if (execResult.quotaExceeded) {
      onLog(`[Phase 3A] Upstream provider quota exceeded.`);
      taskEventStore.updateTaskStatus(taskId, 'provider_quota_exceeded' as any);
      return;
    }

    if (execResult.filesChanged && execResult.filesChanged.length === 0 && !execResult.dryRun) {
      if (task.executor === 'remote-claude-code') {
        onLog(`[Phase 2.9C] remote-claude-code returned no filesChanged. Waiting 3s for sync...`);
        await new Promise(r => setTimeout(r, 3000));
        // Check local git status
        const { stdout: localStatus } = await execAsync('git status --porcelain', { cwd: projectPath }).catch(() => ({ stdout: '' }));
        const localFiles = localStatus.split('\n').map(l => l.substring(3).trim()).filter(l => l.length > 0);
        if (localFiles.length === 0) {
          onLog(`[Phase 4.1] No files were changed locally. Task likely needs executor approval or made no changes.`);
          taskEventStore.updateTaskStatus(taskId, 'no_changes');
          return;
        }
        execResult.filesChanged = localFiles;
      } else {
        onLog(`[Phase 2.9C] No files were changed. Task failed.`);
        taskEventStore.updateTaskStatus(taskId, 'failed');
        return;
      }
    } else if (execResult.dryRun) {
      onLog(`[Dry Run] Execution completed without changing real files.`);
    }

    // Post-execution policy check (Phase 3A/2.9C)
    const policyCheck = await policyEngine.validateDiff(execResult.filesChanged, task.targetProject);
    if (!policyCheck.valid) {
      onLog(`[Phase 3A] Post-execution policy violation: ${policyCheck.reason}`);
      await policyEngine.detectPolicyViolation(taskId, { reason: policyCheck.reason });
      // Do not commit
      return;
    }

    // State: verifying
    taskEventStore.updateTaskStatus(taskId, 'verifying');
    onLog('[Phase 2.9C] Running structural verification...');
    
    // Generate diff from staged files vs HEAD
    let diffText = execResult.diffOutput;
    try {
      if (!diffText) {
        // Stage all changes to capture diff locally
        await execAsync('git add -A', { cwd: projectPath });
        // Use -a (--text) to prevent "Binary files differ" on UTF-16/CRLF mismatches
        const { stdout } = await execAsync(`git diff -a --cached`, { cwd: projectPath });
        diffText = stdout || 'No diff output';
      }
      
      taskEventStore.addEvent(taskId, 'diff_generated', 'Generated structural diff from git', { 
        diff: diffText,
        diffSize: diffText.length,
        filesChanged: execResult.filesChanged,
      });
      onLog(`[Phase 2.9C] Diff captured: ${diffText.length} bytes`);
    } catch(err: any) {
      onLog(`Failed to capture diff: ${err.message}`);
      taskEventStore.addEvent(taskId, 'diff_generated', 'Failed to generate structural diff', { diff: err.message });
    }

    // Build final report
    const report = {
      phase: '2.9C',
      codexInvokedReal: execResult.realInvocation,
      codexVersion: execResult.codexVersion,
      commandExecuted: execResult.commandExecuted,
      executionDurationMs: execResult.durationMs,
      executionDurationHuman: `${(execResult.durationMs / 1000).toFixed(1)}s`,
      exitCode: execResult.exitCode,
      filesChanged: execResult.filesChanged,
      filesChangedCount: execResult.filesChanged.length,
      diffSizeBytes: diffText.length,
      buildTest: 'N/A (sandbox has no build/test scripts)',
      success: execResult.success,
    };

    taskEventStore.addEvent(taskId, 'report_generated', 'Phase 2.9C Final Report', { report });
    taskEventStore.updateTaskField(taskId, { 
      resultSummary: `Phase 2.9C: Codex CLI ${execResult.realInvocation ? 'REAL' : 'NOT'} invoked. ` +
        `v${execResult.codexVersion}, exit=${execResult.exitCode}, ` +
        `files=${execResult.filesChanged.length}, ` +
        `duration=${(execResult.durationMs / 1000).toFixed(1)}s`
    });
    
    // State: waiting_patch_approval (DO NOT auto-commit)
    taskEventStore.updateTaskStatus(taskId, 'waiting_patch_approval');
    onLog(`[Phase 2.9C] Task waiting for patch approval. Auto-commit disabled.`);
    onLog(`[Phase 2.9B] Task completed. Real invocation: ${execResult.realInvocation}`);
  }

  async cancelTask(taskId: string) {
    const task = taskEventStore.getTask(taskId);
    if (!task) return;
    taskEventStore.updateTaskStatus(taskId, 'cancelled');
    taskEventStore.addLog(taskId, 'Task was cancelled by the user.');
  }

  async retryTask(taskId: string) {
    const task = taskEventStore.getTask(taskId);
    if (!task || !['failed', 'cancelled', 'provider_quota_exceeded'].includes(task.status)) return;
    
    taskEventStore.addLog(taskId, 'Retrying task...');
    taskEventStore.updateTaskStatus(taskId, 'queued');
    this.processTask(taskId).catch(err => {
      taskEventStore.addEvent(taskId, 'error', `Orchestrator error: ${err.message}`);
      taskEventStore.updateTaskStatus(taskId, 'failed');
    });
  }

  async commitPatch(taskId: string) {
    const task = taskEventStore.getTask(taskId);
    if (!task || task.status !== 'waiting_patch_approval') return;
    
    taskEventStore.addLog(taskId, '[Phase 2.9C] Patch approved. Committing changes...');
    try {
      const projects = await projectDiscoveryService.discoverProjects();
      const project = projects.find(p => p.id === task.targetProject);
      if (project) {
        await gitWorkspaceManager.commitChanges(project.path, `Auto-commit for ${taskId}: ${task.title}`);
        taskEventStore.addLog(taskId, `[Phase 2.9C] Changes committed successfully.`);
      }
      taskEventStore.updateTaskStatus(taskId, 'completed');
    } catch (e: any) {
      taskEventStore.addLog(taskId, `[ERROR] Commit failed: ${e.message}`);
      throw e;
    }
  }

  async rejectPatch(taskId: string) {
    const task = taskEventStore.getTask(taskId);
    if (!task || task.status !== 'waiting_patch_approval') return;

    taskEventStore.addLog(taskId, '[Phase 2.9C] Patch rejected. Discarding changes...');
    try {
      const projects = await projectDiscoveryService.discoverProjects();
      const project = projects.find(p => p.id === task.targetProject);
      if (project) {
        await execAsync('git restore --staged . && git checkout -- . && git clean -fd', { cwd: project.path });
        taskEventStore.addLog(taskId, `[Phase 2.9C] Changes discarded successfully.`);
      }
      taskEventStore.updateTaskStatus(taskId, 'cancelled');
    } catch (e: any) {
      taskEventStore.addLog(taskId, `[ERROR] Discard failed: ${e.message}`);
      throw e;
    }
  }
}

export const taskOrchestrator = new TaskOrchestrator();
