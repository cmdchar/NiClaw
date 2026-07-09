import { randomUUID } from 'crypto';
import { getSetting } from '../../../utils/store';
import { logger } from '../../../utils/logger';
import type { MeshConnectionStatus, MeshEvent, AgentRegisterPayload, AgentHeartbeatPayload } from './types';

export class MeshClientService {
  private status: MeshConnectionStatus = 'OFFLINE';
  private agentId: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private failCount = 0;
  private readonly HEARTBEAT_INTERVAL_MS = 30000;
  private readonly MAX_FAILS_BEFORE_DEGRADED = 3;

  constructor() {
    this.agentId = `host-api-${randomUUID().slice(0, 8)}`;
  }

  public getStatus(): MeshConnectionStatus {
    return this.status;
  }

  public getAgentId(): string {
    return this.agentId;
  }

  public async start(): Promise<void> {
    if (this.status !== 'OFFLINE') return;
    
    logger.info(`[MeshClient] Starting Agent Mesh Client (ID: ${this.agentId})...`);
    this.status = 'CONNECTING';

    await this.register();
    this.startHeartbeat();
  }

  public stop(): void {
    logger.info(`[MeshClient] Stopping Agent Mesh Client...`);
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.status = 'OFFLINE';
  }

  private async getSuperHermesUrl(): Promise<string> {
    const fromEnv = process.env.SUPERHERMES_API_URL;
    return fromEnv || await getSetting('superhermesUrl') || 'https://vm-niclaw.tail7a9097.ts.net:8002';
  }

  private async getGatewayToken(): Promise<string | null> {
    return await getSetting('gatewayToken');
  }

  private async sendEvent(event: MeshEvent): Promise<boolean> {
    try {
      const baseUrl = await this.getSuperHermesUrl();
      const token = await this.getGatewayToken();
      
      if (!token) {
        logger.warn('[MeshClient] Gateway token missing, cannot send mesh event.');
        return false;
      }

      const response = await fetch(`${baseUrl}/api/agent-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        logger.debug(`[MeshClient] Event send failed with status ${response.status}`);
        return false;
      }
      return true;
    } catch (e: any) {
      logger.debug(`[MeshClient] Event send network error: ${e.message}`);
      return false;
    }
  }

  private async register(): Promise<void> {
    const payload: AgentRegisterPayload = {
      id: this.agentId,
      type: 'host-api',
      version: '0.4.8',
      capabilities: ['command-center', 'mesh-proxy', 'policy-engine']
    };

    const event: MeshEvent = {
      type: 'agent.register',
      sourceId: this.agentId,
      timestamp: Date.now(),
      payload
    };

    const success = await this.sendEvent(event);
    if (success) {
      logger.info('[MeshClient] Successfully registered with SuperHermes mesh.');
      this.status = 'CONNECTED';
      this.failCount = 0;
    } else {
      logger.warn('[MeshClient] Failed to register with mesh. Will retry on next heartbeat.');
      this.status = 'DEGRADED';
      this.failCount = 1;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      const payload: AgentHeartbeatPayload = {
        uptime: process.uptime(),
        load: process.cpuUsage().user / 1000000,
        status: this.status,
        activeTasks: 0 // Mocked for now until TaskEventStore integration
      };

      const event: MeshEvent = {
        type: 'agent.heartbeat',
        sourceId: this.agentId,
        timestamp: Date.now(),
        payload
      };

      const success = await this.sendEvent(event);
      if (success) {
        if (this.status !== 'CONNECTED') {
          logger.info('[MeshClient] Mesh connection restored.');
        }
        this.status = 'CONNECTED';
        this.failCount = 0;
      } else {
        this.failCount++;
        if (this.failCount >= this.MAX_FAILS_BEFORE_DEGRADED && this.status === 'CONNECTED') {
          logger.warn('[MeshClient] Mesh connection lost or degraded.');
          this.status = 'DEGRADED';
        }
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }
}

export const meshClient = new MeshClientService();
