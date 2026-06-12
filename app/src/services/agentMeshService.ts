import { AgentEvent, AgentMeshStatus } from '../types/agentMesh';
import { hostApiFetch } from '@/lib/host-api';

export const AgentMeshService = {
  /**
   * Fetch the current status of all nodes in the mesh.
   */
  async fetchMeshStatus(): Promise<AgentMeshStatus> {
    try {
      const statusRes = await hostApiFetch<any>('/api/agent-mesh/status').catch(() => null);
      
      const eventsRes = await hostApiFetch<any>('/api/agent-mesh/events?limit=20').catch(() => null);

      if (!statusRes) {
        return {
          nodes: [],
          latestEvents: [],
          error: 'api_pending'
        };
      }

      const statusData = statusRes;
      let realNodes = [];
      if (Array.isArray(statusData)) {
        realNodes = statusData;
      } else if (statusData.nodes && Array.isArray(statusData.nodes)) {
        realNodes = statusData.nodes;
      }

      let realEvents: AgentEvent[] = [];
      if (eventsRes) {
        const eventsData = eventsRes;
        if (Array.isArray(eventsData)) {
          realEvents = eventsData;
        } else if (eventsData.events && Array.isArray(eventsData.events)) {
          realEvents = eventsData.events;
        }
      }

      return {
        nodes: realNodes,
        latestEvents: realEvents
      };
    } catch (error) {
      console.warn('[AgentMeshService] Falling back to error state due to fetch failure:', error);
      return {
        nodes: [],
        latestEvents: [],
        error: 'unavailable'
      };
    }
  },

  /**
   * Run a real smoke test to verify connectivity.
   */
  async runSmokeTest(agentId: string): Promise<boolean> {
    try {
      const res = await hostApiFetch<any>('/api/agent-mesh/smoke-tests', {
        method: 'POST',
        body: JSON.stringify({ agentId })
      });
      return !!res;
    } catch (e) {
      console.error(`[AgentMeshService] Smoke test failed to reach API for ${agentId}`);
      return false;
    }
  }
};

