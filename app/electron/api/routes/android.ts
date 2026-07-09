import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { listAgentsSnapshot } from '../../utils/agent-config';
import {
  createAndroidPairingChallenge,
  getAndroidSyncSnapshot,
  markAndroidDeviceSynced,
  pairAndroidDevice,
  recordAndroidSyncEvent,
  validateAndroidSyncToken,
  type AndroidPairedDevice,
} from '../../utils/android-sync';
import { buildBoardStatus, syncBoardSnapshot } from './board';
import { readTasksStore, type SpatialTask } from './tasks';
import { getSetting } from '../../utils/store';
import { getPort } from '../../utils/config';

interface AndroidPairRequest {
  code?: string;
  deviceName?: string;
  deviceId?: string;
  platform?: string;
}

interface AndroidEventRequest {
  type?: string;
  source?: string;
  payload?: unknown;
}

interface AndroidSyncRequest {
  source?: string;
  syncBoard?: boolean;
  payload?: unknown;
}

function headerToString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join(', ') : value;
}

function extractBearerToken(req: IncomingMessage, url: URL): string {
  const authHeader = req.headers.authorization || '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return url.searchParams.get('token') || '';
}

async function getCurrentAndroidDevice(req: IncomingMessage, url: URL): Promise<AndroidPairedDevice | null> {
  const token = extractBearerToken(req, url);
  if (!token) return null;
  return validateAndroidSyncToken(token, {
    remoteAddress: req.socket.remoteAddress,
    userAgent: headerToString(req.headers['user-agent']),
  });
}

function summarizeTasks(tasks: SpatialTask[]) {
  return {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === 'todo').length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
  };
}

function summarizeBoard(board: unknown) {
  const boardRecord = board && typeof board === 'object' ? board as Record<string, unknown> : {};
  const snapshot = boardRecord.snapshot && typeof boardRecord.snapshot === 'object'
    ? boardRecord.snapshot as Record<string, unknown>
    : {};
  const probe = boardRecord.probe && typeof boardRecord.probe === 'object'
    ? boardRecord.probe as Record<string, unknown>
    : {};

  return {
    revision: boardRecord.revision,
    localSyncedAt: boardRecord.local_synced_at || boardRecord.synced_at,
    publishedAt: boardRecord.published_at,
    publishStatus: boardRecord.publish_status,
    nodeCount: snapshot.nodeCount,
    arrowCount: snapshot.arrowCount,
    reachable: probe.reachable,
  };
}

async function buildAndroidStatus(ctx: HostApiContext, device: AndroidPairedDevice | null) {
  const [androidSync, agents, tasksStore, board] = await Promise.all([
    getAndroidSyncSnapshot(),
    listAgentsSnapshot(),
    readTasksStore(),
    buildBoardStatus(),
  ]);

  return {
    success: true,
    online: true,
    checkedAt: new Date().toISOString(),
    device,
    host: {
      api: 'NiClaw Host API',
      androidSync: true,
    },
    gateway: ctx.gatewayManager.getStatus(),
    android: {
      pairedDevices: androidSync.devices,
      pairing: androidSync.pairing,
      recentEvents: androidSync.events,
    },
    board: summarizeBoard(board),
    agents: {
      total: agents.agents.length,
      defaultAgentId: agents.defaultAgentId,
      configuredChannelTypes: agents.configuredChannelTypes,
    },
    tasks: summarizeTasks(tasksStore.tasks),
  };
}

export function isAndroidPairRequest(req: IncomingMessage, url: URL): boolean {
  return req.method === 'POST' && url.pathname === '/api/android/pair';
}

export async function handleAndroidRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (!url.pathname.startsWith('/api/android')) {
    return false;
  }

  if (url.pathname === '/api/android/pair' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<AndroidPairRequest>(req);
      const result = await pairAndroidDevice({
        code: body.code || '',
        deviceName: body.deviceName,
        deviceId: body.deviceId,
        platform: body.platform || 'android',
        remoteAddress: req.socket.remoteAddress,
        userAgent: headerToString(req.headers['user-agent']),
      });
      sendJson(res, 200, { success: true, ...result });
    } catch {
      sendJson(res, 401, { success: false, error: 'Invalid or expired pairing code' });
    }
    return true;
  }

  if (url.pathname === '/api/android/pairing' && req.method === 'GET') {
    try {
      const challenge = await createAndroidPairingChallenge();
      sendJson(res, 200, {
        success: true,
        pairing: {
          code: challenge.code,
          expiresAt: challenge.expiresAt,
          ttlSeconds: 600,
        },
        host: {
          protocol: 'http',
          port: Number(url.port || '13210'),
          emulatorFallback: 'http://10.0.2.2:13210',
          lanTemplate: 'http://<PC_LAN_IP>:13210',
        },
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/android/capabilities' && req.method === 'GET') {
    try {
      sendJson(res, 200, {
        hostApi: true,
        orchestrator: true,
        gateway: true,
        classicJarvisWs: false,
        websocketUrl: null,
        gatewayUrl: `http://${(req.headers.host || url.hostname || '127.0.0.1').split(':')[0]}:${getPort('OPENCLAW_GATEWAY')}`,
        orchestratorBaseUrl: `http://${req.headers.host || url.hostname + ':' + url.port}`
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/android/status' && req.method === 'GET') {
    try {
      const device = await getCurrentAndroidDevice(req, url);
      sendJson(res, 200, await buildAndroidStatus(ctx, device));
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/android/board' && req.method === 'GET') {
    try {
      sendJson(res, 200, { success: true, board: await buildBoardStatus() });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/android/agents' && req.method === 'GET') {
    try {
      sendJson(res, 200, { success: true, ...(await listAgentsSnapshot()) });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/android/tasks' && req.method === 'GET') {
    try {
      const store = await readTasksStore();
      sendJson(res, 200, { success: true, tasks: store.tasks, summary: summarizeTasks(store.tasks) });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/android/event' && req.method === 'POST') {
    try {
      const device = await getCurrentAndroidDevice(req, url);
      const body = await parseJsonBody<AndroidEventRequest>(req);
      const event = await recordAndroidSyncEvent({
        type: body.type || 'event',
        source: body.source || 'android',
        deviceId: device?.id,
        payload: body.payload,
      });
      sendJson(res, 200, { success: true, accepted: true, executed: false, event });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/android/sync' && req.method === 'POST') {
    try {
      const device = await getCurrentAndroidDevice(req, url);
      const body = await parseJsonBody<AndroidSyncRequest>(req);
      let board: unknown;
      let boardSync: unknown;

      if (body.syncBoard === false) {
        board = await buildBoardStatus();
      } else {
        boardSync = await syncBoardSnapshot();
        board = boardSync && typeof boardSync === 'object' && 'status' in boardSync
          ? (boardSync as { status?: unknown }).status
          : boardSync;
      }

      const [agents, tasksStore] = await Promise.all([listAgentsSnapshot(), readTasksStore()]);
      const syncedDevice = await markAndroidDeviceSynced(device?.id);
      const event = await recordAndroidSyncEvent({
        type: 'sync',
        source: body.source || 'android',
        deviceId: device?.id,
        payload: {
          syncBoard: body.syncBoard !== false,
          request: body.payload,
        },
      });

      sendJson(res, 200, {
        success: true,
        syncedAt: new Date().toISOString(),
        device: syncedDevice || device,
        event,
        board,
        boardSync,
        agents,
        tasks: tasksStore.tasks,
        taskSummary: summarizeTasks(tasksStore.tasks),
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
