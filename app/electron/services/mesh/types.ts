export type MeshConnectionStatus = 'OFFLINE' | 'CONNECTING' | 'CONNECTED' | 'DEGRADED';

export interface AgentRegisterPayload {
  id: string;
  type: string;
  version: string;
  capabilities: string[];
}

export interface AgentHeartbeatPayload {
  uptime: number;
  load: number;
  status: MeshConnectionStatus;
  activeTasks: number;
}

export interface AgentMessagePayload {
  messageId: string;
  from: string;
  to?: string;
  topic: string;
  data: any;
  timestamp: number;
}

export interface MeshEvent {
  type: 'agent.register' | 'agent.heartbeat' | 'agent.message';
  sourceId: string;
  timestamp: number;
  payload: AgentRegisterPayload | AgentHeartbeatPayload | AgentMessagePayload;
}
