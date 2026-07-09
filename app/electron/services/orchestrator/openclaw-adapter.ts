import { listAgentsSnapshot } from '../../utils/agent-config';
import { getOpenClawStatus } from '../../utils/paths';
import { getPort } from '../../utils/config';

export interface OpenClawHealth {
    status: 'ONLINE' | 'OFFLINE' | 'ERROR';
    uptime: number;
    endpoint: string;
    latency: number;
    lastError?: string;
}

export class OpenClawAdapter {
    private get hostApiUrl() { return `http://127.0.0.1:${getPort('CLAWX_HOST_API') || 13210}/api/gateway/status`; }
    private get directApiUrl() { return `http://127.0.0.1:${getPort('OPENCLAW_GATEWAY')}/status`; }
    private lastHealth: OpenClawHealth = {
        status: 'OFFLINE',
        uptime: 0,
        endpoint: 'None',
        latency: 0
    };

    /**
     * Performs a real health check against the OpenClaw Gateway.
     */
    async healthCheck(): Promise<OpenClawHealth> {
        const start = Date.now();
        try {
            // Wait 500ms max for local gateway ping
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 500);

            // First check the Host API proxy status
            const { getHostApiToken } = require('../../api/server');
            const res = await fetch(this.hostApiUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Authorization': `Bearer ${getHostApiToken()}`
                }
            });

            const data = await res.json() as any;
            
            // Try to ping direct endpoint as well to see if it responds (it returns HTML usually if it's the UI)
            let directAlive = false;
            try {
                const directRes = await fetch(this.directApiUrl, { method: 'GET', signal: controller.signal });
                directAlive = directRes.ok;
            } catch (e) {
                // Ignore direct ping failure
            }

            clearTimeout(timeoutId);
            const latency = Date.now() - start;

            let endpointStr = `HostAPI: ${getPort('CLAWX_HOST_API') || 13210} | Direct: ${directAlive ? getPort('OPENCLAW_GATEWAY') : 'Down'}`;

            if (data.state === 'running' || data.gatewayReady === true) {
                this.lastHealth = {
                    status: 'ONLINE',
                    uptime: process.uptime(),
                    endpoint: endpointStr,
                    latency
                };
            } else if (data.state === 'error') {
                this.lastHealth = {
                    status: 'ERROR',
                    uptime: 0,
                    endpoint: endpointStr,
                    latency,
                    lastError: data.error || 'Gateway starting or errored'
                };
            } else {
                this.lastHealth = {
                    status: 'OFFLINE',
                    uptime: 0,
                    endpoint: endpointStr,
                    latency,
                    lastError: 'Gateway not ready'
                };
            }
        } catch (e: any) {
            this.lastHealth = {
                status: 'OFFLINE',
                uptime: 0,
                endpoint: 'HostAPI: Unreachable | Direct: Unreachable',
                latency: Date.now() - start,
                lastError: e.message
            };
        }

        return this.lastHealth;
    }

    /**
     * Returns the list of registered agents from the OpenClaw configuration.
     */
    async getAgents(): Promise<any[]> {
        try {
            const snapshot = await listAgentsSnapshot();
            return snapshot.agents || [];
        } catch (e) {
            console.error('[OpenClawAdapter] Error fetching agents:', e);
            return [];
        }
    }

    /**
     * Returns OpenClaw capabilities based on environment constraints.
     */
    async getCapabilities(): Promise<string[]> {
        const status = getOpenClawStatus();
        const capabilities = ['agent_routing', 'mcp_tools'];
        if (status.isBuilt) {
            capabilities.push('production_ready');
        }
        return capabilities;
    }

    /**
     * Mocked running tasks until Mesh tracing is fully implemented.
     */
    async getRunningTasks(): Promise<any[]> {
        return [];
    }
}

export const openClawAdapter = new OpenClawAdapter();
