import type { GatewayManager } from '../gateway/manager';
import type { ClawHubService } from '../gateway/clawhub';
import type { HostEventBus } from '../api/event-bus';
import type { Server } from 'http';

export interface CoreServices {
  gatewayManager: GatewayManager;
  clawHubService: ClawHubService;
  hostEventBus: HostEventBus;
  hostApiServer: Server | null;
}
