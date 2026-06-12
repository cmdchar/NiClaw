export interface SpatialTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  agentId?: string;
  planId?: string;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
}
