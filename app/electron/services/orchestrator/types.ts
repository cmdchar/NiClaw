export type TaskStatus = 
  | 'queued' 
  | 'planning' 
  | 'running' 
  | 'waiting_approval' 
  | 'waiting_patch_approval'
  | 'verifying' 
  | 'completed' 
  | 'failed' 
  | 'provider_quota_exceeded'
  | 'blocked_policy_violation'
  | 'cancelled';

export interface TaskEvent {
  id: string;
  timestamp: number;
  type: 'log' | 'status_change' | 'agent_action' | 'approval_request' | 'verification_result' | 'error';
  message: string;
  data?: any;
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
