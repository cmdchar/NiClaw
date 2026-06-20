export type TaskStatus = 
  | 'queued' 
  | 'planning' 
  | 'running' 
  | 'waiting_approval' 
  | 'waiting_patch_approval'
  | 'patch_generated'
  | 'waiting_patch_review'
  | 'patch_extraction_failed'
  | 'applying_patch'
  | 'verifying' 
  | 'completed' 
  | 'failed' 
  | 'provider_quota_exceeded'
  | 'blocked_policy_violation'
  | 'cancelled'
  | 'parsing_intent'
  | 'waiting_clarification'
  | 'discovering_project'
  | 'loading_context'
  | 'no_changes';

export interface TaskEvent {
  id: string;
  timestamp: number;
  type: 'log' | 'status_change' | 'agent_action' | 'approval_request' | 'verification_result' | 'error' | 'intent_ambiguous' | 'plan_skipped' | 'plan_generated' | 'execution_started' | 'execution_completed' | 'execution_timeout' | 'diff_generated' | 'report_generated' | 'patch_proposal_generated';
  message: string;
  data?: any;
}

export interface PatchProposal {
  taskId: string;
  planner: string;
  executor: string;
  summary: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  filesChanged: string[];
  diff: string;
  rawOutput: string;
  policyValidation: {
    valid: boolean;
    reason?: string;
  };
  createdAt: string;
}

export interface AuditLog {
  id: string;
  taskId: string;
  timestamp: number;
  action: string;
  actor: string; // 'nicus', 'hermes', 'system', 'openclaw'
  branch?: string;
  agent?: string;
  diffSummary?: string;
}

export interface Task {
  id: string;
  title: string;
  userPrompt: string;
  targetProject: string;
  taskType?: 'project_code_change' | 'agent_diagnostics' | 'system_health' | 'gateway_diagnostics' | 'android_connectivity_test' | 'hermes_health' | 'remote_claude_health' | 'orchestrator_status' | 'patch_review';
  executor?: string;
  status: TaskStatus;
  assignedAgents: string[];
  createdAt: number;
  updatedAt: number;
  branchName?: string;
  currentStep?: string;
  events: TaskEvent[];
  logs: string[];
  auditLogs: AuditLog[];
  resultSummary?: string;
  verificationResult?: any;
  clarification?: {
    question: string;
    reason: string;
    options?: Array<{
      id: string;
      label: string;
      projectId?: string;
      confidence?: number;
    }>;
    requestedAt: string;
    answeredAt?: string;
    answer?: string;
  };
}

export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  type: string;
  defaultBranch: string;
  testCommand?: string;
  buildCommand?: string;
  devCommand?: string;
}

export interface ProjectsRegistry {
  projects: ProjectConfig[];
}

export interface ProjectIndex {
  id: string;
  name: string;
  aliases: string[];
  path: string;
  domains: string[];
  git: boolean;
  techStack: string[];
  confidenceScore: number;
  obsidianLinks: string[];
  pathExists: boolean;
  hasPackageJson: boolean;
  hasReadme: boolean;
  commands: {
    build: 'configured' | 'missing' | 'unknown';
    test: 'configured' | 'missing' | 'unknown';
    lint: 'configured' | 'missing' | 'unknown';
    dev: 'configured' | 'missing' | 'unknown';
  };
  status: 'READY' | 'PARTIAL' | 'INCOMPLETE' | 'MISSING_PATH' | 'AMBIGUOUS' | 'ARCHIVE';
  reasonNotReady?: string;
  lastIndexedAt: string;
}
