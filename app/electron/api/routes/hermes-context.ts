import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { sendJson } from '../route-utils';
import { readTasksStore } from './tasks';
import { listAgentsSnapshot } from '../../utils/agent-config';
import { getAndroidSyncSnapshot } from '../../utils/android-sync';

// ── Minimal plan types (SpatialPlan is not exported from plans.ts) ────────
interface SpatialPlanStep {
  id: string;
  title: string;
  kind: string;
  requiresApproval: boolean;
  approvalStatus: string;
}

interface SpatialPlan {
  id: string;
  title: string;
  status: string;
  steps: SpatialPlanStep[];
}

interface PlansStore {
  plans: SpatialPlan[];
}

async function readPlansStoreLazy(): Promise<PlansStore> {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { getDataDir } = await import('../../utils/paths');

  const filePath = join(getDataDir(), 'spatial', 'plans.json');
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as PlansStore;
  } catch {
    return { plans: [] };
  }
}

interface BlockedApprovalSummary {
  planId: string;
  planTitle: string;
  planStatus: string;
  stepId: string;
  stepTitle: string;
  stepKind: string;
}

function extractBlockedApprovals(plans: SpatialPlan[]): BlockedApprovalSummary[] {
  const blocked: BlockedApprovalSummary[] = [];
  for (const plan of plans) {
    if (plan.status === 'draft' || plan.status === 'completed') continue;
    for (const step of plan.steps) {
      if (step.approvalStatus === 'pending' && step.requiresApproval) {
        blocked.push({
          planId: plan.id,
          planTitle: plan.title,
          planStatus: plan.status,
          stepId: step.id,
          stepTitle: step.title,
          stepKind: step.kind,
        });
      }
    }
  }
  return blocked;
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function handleHermesContextRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname !== '/api/hermes/context' || req.method !== 'GET') {
    return false;
  }

  try {
    // Gather data from all sources in parallel
    const [
      tasksStore,
      plansStore,
      agentsSnapshot,
      androidSnapshot,
      gatewayStatus,
    ] = await Promise.all([
      readTasksStore(),
      readPlansStoreLazy(),
      listAgentsSnapshot(),
      getAndroidSyncSnapshot(),
      (async () => ctx.gatewayManager.getStatus())(),
    ]);

    // Mesh status
    const { meshClient } = require('../../services/mesh/mesh-client');
    const meshStatus = meshClient.getStatus();
    const meshAgentId = meshClient.getAgentId();

    // Memory sync status (may not be available if service not initialized)
    let memorySync: {
      status: string;
      lastStartedAt?: string | null;
      lastFinishedAt?: string | null;
      lastError?: string | null;
      pendingSync: boolean;
    } = { status: 'unknown', pendingSync: false };
    try {
      const { secondBrainSyncRunner } = await import('../../services/secondbrain-sync-runner');
      const state = secondBrainSyncRunner.getState();
      memorySync = {
        status: state.status,
        lastStartedAt: state.lastStartedAt,
        lastFinishedAt: state.lastFinishedAt,
        lastError: state.lastError,
        pendingSync: state.pendingSync,
      };
    } catch {
      // secondBrainSyncRunner not available in this context — that's fine
    }

    // Task summary
    const tasks = tasksStore.tasks;
    const activeTasks = tasks.filter((t) => t.status !== 'done');
    const taskSummary = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
      active: activeTasks.slice(0, 20), // limit to avoid huge payloads
    };

    // Blocked approvals
    const blockedApprovals = extractBlockedApprovals(plansStore.plans);

    // Agent health — AgentSummary doesn't have paused/currentTask directly
    const agents = agentsSnapshot.agents;
    const agentHealth = {
      total: agents.length,
      defaultAgentId: agentsSnapshot.defaultAgentId,
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        isDefault: a.isDefault,
        role: a.role,
        channelTypes: a.channelTypes,
        modelDisplay: a.modelDisplay,
      })),
    };

    // Android devices — AndroidPairedDevice uses `name` and `lastSyncAt`
    const androidDevices = {
      paired: androidSnapshot.devices.length,
      devices: androidSnapshot.devices.map((d) => ({
        id: d.id,
        name: d.name,
        lastSeen: d.lastSyncAt,
        platform: d.platform,
      })),
      pairing: androidSnapshot.pairing
        ? {
            active: androidSnapshot.pairing.active,
            expiresAt: androidSnapshot.pairing.expiresAt,
          }
        : null,
    };

    // Plans summary
    const plansSummary = {
      total: plansStore.plans.length,
      running: plansStore.plans.filter((p) => p.status === 'running').length,
      blocked: plansStore.plans.filter((p) => p.status === 'blocked').length,
      completed: plansStore.plans.filter((p) => p.status === 'completed').length,
    };

    // Build final context response
    const context = {
      success: true,
      timestamp: new Date().toISOString(),
      host: {
        type: 'niclaw-host-api',
        version: '0.4.8',
        uptime: process.uptime(),
        load: process.cpuUsage().user / 1_000_000, // seconds
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      mesh: {
        status: meshStatus,
        agentId: meshAgentId,
      },
      gateway: gatewayStatus,
      agents: agentHealth,
      tasks: taskSummary,
      plans: plansSummary,
      blockedApprovals,
      memory: memorySync,
      android: androidDevices,
    };

    sendJson(res, 200, context);
  } catch (error) {
    sendJson(res, 500, { success: false, error: String(error) });
  }

  return true;
}
