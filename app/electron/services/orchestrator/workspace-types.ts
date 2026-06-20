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
  type: string; // e.g., 'code', 'log', 'report'
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
  
  contextFiles: string[]; // Files loaded into the workspace context
  
  // A workspace might have multiple tasks if it's reused, but initially 1:1 mapped
  // and we store the parent task via sourceTaskId in ProvenanceMetadata or just taskId
}
