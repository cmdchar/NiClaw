export type NodeType = 'trigger' | 'agent' | 'action' | 'condition' | 'knowledge';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface ExecutionGraph {
  id: string;
  version: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    name: string;
    description?: string;
    createdAt: string;
  };
}

export interface NodeExecutionState {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  inputData?: any;
  outputData?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  retryCount: number;
}

export interface ExecutionTrace {
  graphId: string;
  executionId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  nodeStates: Record<string, NodeExecutionState>;
  totalTokens: number;
  totalCost: number;
}
