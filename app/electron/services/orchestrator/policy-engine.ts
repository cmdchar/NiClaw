import { promises as fs } from 'fs';
import { join } from 'path';
import { getDataDir } from '../../utils/paths';
import { projectDiscoveryService } from './project-discovery-service';
import { taskEventStore } from './task-event-store';

export interface PolicyContract {
  allowed_project_ids: string[];
  forbidden_commands: string[];
  forbidden_paths: string[];
  branch_required: boolean;
  max_files_changed: number;
  diff_capture_required: boolean;
  verification_required: boolean;
  approval_levels: string[];
  no_deploy: boolean;
  no_git_push: boolean;
}

export class PolicyEngine {
  private contract: PolicyContract | null = null;
  private lastViolation: string | null = null;

  async loadPolicyContract(): Promise<PolicyContract> {
    const dir = join(getDataDir(), 'command-center');
    const path = join(dir, 'codex-execution-contract.json');
    
    try {
      const data = await fs.readFile(path, 'utf8');
      this.contract = JSON.parse(data);
      return this.contract!;
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        // Create default contract
        this.contract = {
          allowed_project_ids: ['niclaw-app'],
          forbidden_commands: [
            "Remove-Item", "rmdir", "rd", "erase", "git clean", 
            "git reset --hard", "git push", "npm publish", 
            "pnpm publish", "yarn publish", "docker compose down -v", 
            "docker system prune", "deploy", "scp", "rsync delete", 
            "ssh production commands"
          ],
          forbidden_paths: [
            "**/*.env", "**/*.env.*", "**/*.pem", "**/*.key", "**/id_rsa",
            "**/id_ed25519", "**/secrets.*", "**/credentials.*",
            "**/service-account*.json", "**/firebase*.json", "**/.npmrc",
            "**/.pypirc", "**/docker-compose.prod*", "**/production configs",
            "C:\\\\Server\\\\AI\\\\SERVER_SECRETS*", "C:\\\\Server\\\\board\\\\v1\\\\whiteboard\\\\ai\\\\*"
          ],
          branch_required: true,
          max_files_changed: 10,
          diff_capture_required: true,
          verification_required: true,
          approval_levels: ['execution', 'patch_apply', 'rollback', 'mutating_verification', 'package_install'],
          no_deploy: true,
          no_git_push: true
        };
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path, JSON.stringify(this.contract, null, 2), 'utf8');
        return this.contract;
      }
      throw e;
    }
  }

  async validateProjectAccess(projectId: string, targetPath: string): Promise<{ valid: boolean, reason?: string }> {
    const contract = await this.loadPolicyContract();
    if (!contract.allowed_project_ids.includes(projectId)) {
      return { valid: false, reason: `Project ID ${projectId} is not in allowed_project_ids.` };
    }

    // Sandbox projects (e.g. codex-safety-test) are not in the discovery index
    // but are explicitly allowed by the policy contract — skip discovery validation
    const sandboxProjectIds = ['codex-safety-test'];
    if (!sandboxProjectIds.includes(projectId)) {
      const projects = await projectDiscoveryService.discoverProjects();
      const proj = projects.find(p => p.id === projectId);
      if (!proj) {
        return { valid: false, reason: `Project ${projectId} not found.` };
      }
      if (proj.status !== 'READY') {
        return { valid: false, reason: `Project ${projectId} is not READY.` };
      }
    }

    if (targetPath.includes('..')) {
      return { valid: false, reason: `Path traversal detected in ${targetPath}.` };
    }
    return { valid: true };
  }

  async validateCommand(command: string): Promise<{ valid: boolean, reason?: string }> {
    const contract = await this.loadPolicyContract();
    for (const forbidden of contract.forbidden_commands) {
      if (command.includes(forbidden)) {
        return { valid: false, reason: `Forbidden command detected (${forbidden})` };
      }
    }
    return { valid: true };
  }

  async validateFileChange(filePath: string, projectId?: string): Promise<{ valid: boolean, reason?: string }> {
    const contract = await this.loadPolicyContract();
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Strict Phase 3A Guardrails for niclaw-app
    if (projectId === 'niclaw-app') {
      const isAllowedUIFile = normalizedPath.endsWith('DashboardActivity.kt') || normalizedPath.endsWith('activity_dashboard.xml');
      if (!isAllowedUIFile) {
        return { valid: false, reason: `Phase 3A Strict Policy: Only DashboardActivity.kt or activity_dashboard.xml allowed. Blocked: ${filePath}` };
      }
    }

    for (const pattern of contract.forbidden_paths) {
      const isWildcard = pattern.startsWith('**/');
      const extMatch = pattern.replace('**/*', '');
      if (isWildcard && normalizedPath.endsWith(extMatch)) {
        return { valid: false, reason: `Sensitive file modification blocked (${pattern})` };
      }
      if (!isWildcard && normalizedPath.includes(pattern.replace(/\\\\/g, '/').replace('*', ''))) {
        return { valid: false, reason: `Sensitive path modification blocked (${pattern})` };
      }
    }
    return { valid: true };
  }

  async validateDiff(diffOrChangedFiles: string[], projectId?: string): Promise<{ valid: boolean, reason?: string }> {
    const contract = await this.loadPolicyContract();
    
    // Strict Phase 3A Guardrails
    const maxFiles = projectId === 'niclaw-app' ? 2 : contract.max_files_changed;

    if (diffOrChangedFiles.length > maxFiles) {
      return { valid: false, reason: `max_files_changed (${maxFiles}) exceeded for project ${projectId || 'default'}. Attempted: ${diffOrChangedFiles.length}` };
    }
    
    for (const f of diffOrChangedFiles) {
      const res = await this.validateFileChange(f, projectId);
      if (!res.valid) return res;
    }
    return { valid: true };
  }

  async requiresApproval(action: string): Promise<boolean> {
    const contract = await this.loadPolicyContract();
    return contract.approval_levels.includes(action);
  }

  async detectPolicyViolation(taskId: string, eventDetails: any): Promise<void> {
    const reason = eventDetails.reason || 'Unknown violation';
    this.lastViolation = `${reason} at ${new Date().toISOString()}`;
    taskEventStore.addAuditLog(taskId, 'POLICY_VIOLATION', 'system', undefined, undefined, reason);
    taskEventStore.updateTaskStatus(taskId, 'blocked_policy_violation' as any);
  }

  async evaluateExecutionPlan(taskId: string, projectId: string, plan: { commands?: string[], files?: string[] }): Promise<{ valid: boolean, reason?: string }> {
    const access = await this.validateProjectAccess(projectId, '');
    if (!access.valid) return access;

    if (plan.commands) {
      for (const cmd of plan.commands) {
        const cmdCheck = await this.validateCommand(cmd);
        if (!cmdCheck.valid) return cmdCheck;
      }
    }

    if (plan.files) {
      const diffCheck = await this.validateDiff(plan.files, projectId);
      if (!diffCheck.valid) return diffCheck;
    }

    return { valid: true };
  }

  async getStatus() {
    const contract = await this.loadPolicyContract();
    return {
      allowedProjectsCount: contract.allowed_project_ids.length,
      maxFilesChanged: contract.max_files_changed,
      forbiddenCommandsCount: contract.forbidden_commands.length,
      forbiddenPathsCount: contract.forbidden_paths.length,
      lastPolicyViolation: this.lastViolation || 'None',
      policyVersion: '1.0.0-Phase2.8'
    };
  }
    async validatePatchProposal(patch: any): Promise<{ valid: boolean; reason?: string }> {
        try {
            // Re-use the existing validateDiff logic but wrap it for patch proposal
            const diffValidation = await this.validateDiff(patch.filesChanged);
            if (!diffValidation.valid) {
                return { valid: false, reason: `Policy Violation: ${diffValidation.reason}` };
            }

            // Additional check: Does the raw diff contain obvious secrets?
            if (patch.diff) {
                const secretPatterns = [
                    /api_key\s*=|apikey\s*=/i,
                    /password\s*=/i,
                    /secret\s*=/i,
                    /token\s*=/i,
                    /PRIVATE KEY/i,
                    /HERMES_API_TOKEN/i,
                    /DEEPSEEK_API_KEY/i
                ];

                for (const pattern of secretPatterns) {
                    if (pattern.test(patch.diff)) {
                        return { valid: false, reason: 'Policy Violation: Patch diff contains potential secret/token patterns.' };
                    }
                }
            }

            return { valid: true };
        } catch (e: any) {
            return { valid: false, reason: `Error validating patch: ${e.message}` };
        }
    }
}

export const policyEngine = new PolicyEngine();
