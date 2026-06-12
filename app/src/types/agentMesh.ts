export type AgentStatusType = 'idle' | 'starting' | 'running' | 'waiting' | 'blocked' | 'failed' | 'completed' | 'unknown';

export type AgentEventType = 
  | 'agent.health'
  | 'task.received'
  | 'task.started'
  | 'task.plan.created'
  | 'tool.started'
  | 'tool.finished'
  | 'file.changed'
  | 'decision.made'
  | 'memory.updated'
  | 'task.blocked'
  | 'task.failed'
  | 'task.completed'
  | 'heartbeat';

export interface AgentEvent {
  event_id: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  run_id?: string;
  task_id?: string;
  event_type: AgentEventType | string;
  status: AgentStatusType;
  summary: string;
  details?: any;
  workspace?: string;
  files_touched?: string[];
  commands_run?: string[];
  memory_refs?: string[];
  error?: string;
  parent_event_id?: string;
}

export interface NodeStatus {
  id: string;
  label: string;
  kind?: string;
  status: 'online' | 'offline' | 'degraded' | 'unavailable' | 'auth_required' | 'not_configured' | 'api_pending' | string;
  source?: string;
  last_seen?: string;
  health_url?: string;
  details?: any;
  error?: string | null;
}

export interface AgentMeshStatus {
  nodes: NodeStatus[];
  latestEvents: AgentEvent[];
  error?: string;
}
