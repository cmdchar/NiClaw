export interface ProvenanceMetadata {
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;

  sourceTaskId?: string;
  sourceWorkspaceId?: string;
  sourcePatchId?: string;
  sourceAgentId?: string;
  sourceDecisionId?: string;
  sourceEventId?: string;

  sourceStatus?: "known" | "unknown";
  sourceReason?: string;
}

export interface WorkspaceEvent extends ProvenanceMetadata {
  id: string;
  type: string;
  message: string;
  data?: any;
}

export interface WorkspaceArtifact extends ProvenanceMetadata {
  id: string;
  name: string;
  path?: string;
  content?: string;
  type: string;
}

export interface WorkspacePatch extends ProvenanceMetadata {
  id: string;
  targetFile: string;
  diff: string;
  status: 'proposed' | 'approved' | 'rejected' | 'applied' | 'failed';
}

export interface WorkspaceDecision extends ProvenanceMetadata {
  id: string;
  category: string;
  title: string;
  description: string;
  optionsConsidered?: string[];
  chosenOption?: string;
  rationale?: string;
}

export type WorkspaceStatus = 'initializing' | 'active' | 'frozen' | 'archived' | 'failed';

export interface TaskWorkspace extends ProvenanceMetadata {
  id: string;
  taskId: string;
  status: WorkspaceStatus;
  baseDirectory: string;

  events: WorkspaceEvent[];
  artifacts: WorkspaceArtifact[];
  patches: WorkspacePatch[];
  decisions: WorkspaceDecision[];
  
  contextFiles: string[];
}

export interface Task {
  id: string;
  title: string;
  userPrompt: string;
  targetProject: string;
  status: string;
  taskType?: string;
  executor?: string;
  createdAt: number;
  updatedAt: number;
}


export interface AgentActivityCard {
  id: string;
  name: string;
  status: string;
  role: string;
  lastAction: string;
  updatedAt: number;
}

export interface OrchestratorWorkspaceState {
  tasks: Task[];
  activeTaskId?: string;
  activeWorkspace?: TaskWorkspace;
  agentActivity: AgentActivityCard[];
}

