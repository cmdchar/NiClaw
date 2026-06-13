import { AgentEvent, AgentMeshStatus } from '../types/agentMesh';

const MESH_BASE_URL = 'https://vm-niclaw.tail7a9097.ts.net:8002';

export const AgentMeshService = {
  /**
   * Fetch the current status of all nodes in the mesh.
   */
  async fetchMeshStatus(): Promise<AgentMeshStatus> {
    try {
      const statusRes = await fetch(`${MESH_BASE_URL}/api/mesh/status`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).catch(err => {
        throw err;
      });
      
      const eventsRes = await fetch(`${MESH_BASE_URL}/api/mesh/events?limit=20`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).catch(err => {
        throw err;
      });

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
    } catch (error: any) {
      console.warn('[AgentMeshService] Falling back to error state due to fetch failure:', error);
      return {
        nodes: [],
        latestEvents: [],
        error: error.message || 'unavailable'
      };
    }
  },

  /**
   * Run a real smoke test to verify connectivity.
   */
  async runSmokeTest(target: string): Promise<boolean> {
    try {
      const res = await fetch(`${MESH_BASE_URL}/api/mesh/smoke-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target })
      });
      return res.ok;
    } catch (e) {
      console.error(`[AgentMeshService] Smoke test failed to reach API for ${target}`, e);
      return false;
    }
  }
};

