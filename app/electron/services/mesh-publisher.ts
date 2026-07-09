import { getSetting } from '../utils/store';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export interface AgentEvent {
  event_id: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  run_id?: string | null;
  task_id?: string | null;
  event_type: 'agent.health' | 'task.received' | 'task.started' | 'task.plan.created' | 'tool.started' | 'tool.finished' | 'file.changed' | 'decision.made' | 'memory.updated' | 'task.blocked' | 'task.failed' | 'task.completed' | 'heartbeat';
  status: 'idle' | 'starting' | 'running' | 'waiting' | 'blocked' | 'failed' | 'completed';
  summary: string;
  details?: Record<string, any>;
  workspace?: string | null;
  files_touched?: string[];
  commands_run?: string[];
  memory_refs?: string[];
  error?: string | null;
  parent_event_id?: string | null;
}

export class MeshPublisher {
  private outbox: AgentEvent[] = [];
  private isFlushing = false;
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly MAX_OUTBOX_SIZE = 500;

  constructor() {
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  private async getSuperHermesUrl(): Promise<string> {
    const fromEnv = process.env.SUPERHERMES_API_URL;
    if (fromEnv) return fromEnv;
    const fromStore = await getSetting('superhermesUrl');
    if (fromStore) return fromStore;
    return 'https://vm-niclaw.tail7a9097.ts.net:8002';
  }

  public async publishEvent(event: Omit<AgentEvent, 'event_id' | 'timestamp' | 'agent_id' | 'agent_name'>) {
    const fullEvent: AgentEvent = {
      event_id: randomUUID(),
      timestamp: new Date().toISOString(),
      agent_id: 'niclaw-host',
      agent_name: 'NiClaw Host',
      ...event
    };

    if (this.outbox.length >= this.MAX_OUTBOX_SIZE) {
      this.outbox.shift();
      logger.warn('MeshPublisher outbox full, dropping oldest event');
    }
    
    this.outbox.push(fullEvent);
    this.flush().catch(() => {});
  }

  private async flush() {
    if (this.isFlushing || this.outbox.length === 0) return;
    this.isFlushing = true;

    try {
      const gatewayToken = await getSetting('gatewayToken');
      const baseUrl = await this.getSuperHermesUrl();
      
      const batch = [...this.outbox];
      
      for (const event of batch) {
        try {
          const res = await fetch(`${baseUrl}/api/agent-events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {})
            },
            body: JSON.stringify(event)
          });
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          
          this.outbox = this.outbox.filter(e => e.event_id !== event.event_id);
        } catch (e: any) {
          logger.error(`MeshPublisher failed to post event ${event.event_id}`, e);
          break; // Stop on first error, wait for next interval
        }
      }
    } catch (e: any) {
      logger.error('MeshPublisher flush error', e);
    } finally {
      this.isFlushing = false;
    }
  }

  async publishTaskStatus(taskId: string, status: string, payload?: any) {
    let type: AgentEvent['event_type'] = 'task.started';
    let agentStatus: AgentEvent['status'] = 'running';

    if (status === 'queued' || status === 'starting') {
       type = 'task.received';
       agentStatus = 'starting';
    } else if (status === 'started' || status === 'running') {
       type = 'task.started';
       agentStatus = 'running';
    } else if (status === 'completed') {
       type = 'task.completed';
       agentStatus = 'completed';
    } else if (status === 'failed' || status.includes('error')) {
       type = 'task.failed';
       agentStatus = 'failed';
    } else if (status === 'waiting_approval' || status.includes('blocked')) {
       type = 'task.blocked';
       agentStatus = 'blocked';
    }

    await this.publishEvent({
      task_id: taskId,
      event_type: type,
      status: agentStatus,
      summary: `Task ${taskId} status changed to ${status}`,
      details: { originalStatus: status, ...payload }
    });
  }

  async publishWorkspaceEvent(workspaceId: string, taskId: string, eventType: string, summary: string, payload?: any) {
    await this.publishEvent({
      task_id: taskId,
      workspace: workspaceId,
      event_type: 'memory.updated',
      status: 'running',
      summary: summary,
      details: { workspaceEventType: eventType, ...payload }
    });
  }
}

export const meshPublisher = new MeshPublisher();
