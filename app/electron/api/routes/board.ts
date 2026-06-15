import { existsSync, readFileSync } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { sendJson } from '../route-utils';
import { regenerateBoardBrainmap } from '../../utils/board-brainmap';

type BoardSyncStatus = {
  whiteboard?: string;
  note?: string;
  secrets?: string;
  board_url?: string;
  snapshot_path?: string;
  board_name?: string;
  board_id?: string;
  revision?: number;
  project_root?: string;
  source_brainmap?: string;
  synced_at?: string;
  local_synced_at?: string;
  published_at?: string;
  publish_status?: string;
  publish_error?: string;
};

type BoardSnapshot = {
  board_name?: string;
  generated_at?: string;
  source_brainmap?: string;
  data?: {
    nodes?: unknown[];
    arrows?: unknown[];
    edges?: unknown[];
  };
};

const BOARD_STATUS_FILE = join('ai', 'BOARD_SYNC_STATUS.json');
const BOARD_SNAPSHOT_FILE = join('ai', 'BOARD_BRAINMAP.json');
const DEFAULT_BOARD_URL = 'https://board.private-driver.ro/?board=728273ef-9709-4f1c-a77e-ab7086bfeff3';
const DEFAULT_BOARDAI_ORIGIN = 'https://board.private-driver.ro';

function findProjectRoot(): string {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), '..'),
    resolve(process.cwd(), '..', '..'),
  ];

  return candidates.find((candidate) => existsSync(join(candidate, BOARD_STATUS_FILE))) ?? process.cwd();
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getFileMtime(filePath: string): Promise<string | null> {
  try {
    const fileStat = await stat(filePath);
    return fileStat.mtime.toISOString();
  } catch {
    return null;
  }
}

function getBoardAiToken(): string {
  const envToken = process.env.BOARD_AI_TOKEN
    || process.env.BOARDAI_TOKEN
    || process.env.BOARDAI_API_TOKEN
    || '';
  if (envToken) return envToken;

  try {
    const configPath = join(homedir(), '.boardai-vault', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '')) as { token?: string };
    return String(config.token || '').trim();
  } catch {
    return '';
  }
}

function getBoardAiOrigin(boardUrl: string): string {
  const configured = process.env.BOARD_AI_ORIGIN || process.env.BOARDAI_ORIGIN || '';
  if (configured) return configured.replace(/\/+$/, '');

  try {
    const configPath = join(homedir(), '.boardai-vault', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '')) as { server?: string };
    if (config.server) return String(config.server).replace(/\/+$/, '');
  } catch {
    // fall back to board URL origin
  }

  try {
    return new URL(boardUrl).origin;
  } catch {
    return DEFAULT_BOARDAI_ORIGIN;
  }
}

function getBoardId(status: BoardSyncStatus, boardUrl: string): string {
  if (status.board_id) return status.board_id;
  try {
    return new URL(boardUrl).searchParams.get('board') || '';
  } catch {
    return '';
  }
}

async function probeBoardUrl(boardUrl: string): Promise<{ reachable: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(boardUrl, { method: 'HEAD' });
    return { reachable: response.ok, status: response.status };
  } catch (error) {
    return { reachable: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function summarizeSnapshot(snapshot: BoardSnapshot) {
  const arrows = snapshot.data?.arrows ?? snapshot.data?.edges ?? [];
  return {
    boardName: snapshot.board_name,
    generatedAt: snapshot.generated_at,
    sourceBrainmap: snapshot.source_brainmap,
    nodeCount: snapshot.data?.nodes?.length ?? 0,
    arrowCount: arrows.length,
  };
}

export async function buildBoardStatus() {
  const projectRoot = findProjectRoot();
  const statusPath = join(projectRoot, BOARD_STATUS_FILE);
  const snapshotPath = join(projectRoot, BOARD_SNAPSHOT_FILE);
  const status = await readJsonFile<BoardSyncStatus>(statusPath, {});
  const snapshot = await readJsonFile<BoardSnapshot>(snapshotPath, {});
  const boardUrl = status.board_url || DEFAULT_BOARD_URL;
  const probe = await probeBoardUrl(boardUrl);
  const boardAiToken = getBoardAiToken();

  return {
    ...status,
    board_url: boardUrl,
    project_root: projectRoot,
    snapshot_path: snapshotPath,
    source_brainmap: join(projectRoot, 'ai', 'BRAINMAP.md'),
    snapshot: summarizeSnapshot(snapshot),
    files: {
      statusPath,
      snapshotPath,
      statusUpdatedAt: await getFileMtime(statusPath),
      snapshotUpdatedAt: await getFileMtime(snapshotPath),
    },
    probe,
    remotePublishConfigured: Boolean(boardAiToken),
    remotePublishEndpoint: `${getBoardAiOrigin(boardUrl)}/api/boards/${getBoardId(status, boardUrl) || '<board_id>'}`,
  };
}

async function boardAiJsonRequest<T>(
  endpoint: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  let payload: unknown = {};
  const raw = await response.text();
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }
  }

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload && 'error' in payload
      ? String((payload as { error?: unknown }).error)
      : raw;
    throw new Error(`BoardAI publish failed (${response.status}): ${detail || response.statusText}`);
  }

  return payload as T;
}

async function publishBoardSnapshot(params: {
  boardUrl: string;
  boardId: string;
  snapshot: BoardSnapshot;
  revision: number;
}) {
  const token = getBoardAiToken();
  if (!token) {
    return {
      published: false,
      remotePublishConfigured: false,
      error: 'BOARD_AI_TOKEN or BOARDAI_TOKEN is not configured.',
    };
  }

  if (!params.boardId) {
    return {
      published: false,
      remotePublishConfigured: true,
      error: 'BoardAI board id is missing.',
    };
  }

  const endpoint = `${getBoardAiOrigin(params.boardUrl)}/api/boards/${encodeURIComponent(params.boardId)}`;
  let remoteRevision = params.revision;

  try {
    const remoteBoard = await boardAiJsonRequest<{ revision?: number }>(endpoint, token);
    const candidateRevision = Number(remoteBoard?.revision);
    if (Number.isFinite(candidateRevision) && candidateRevision >= 1) {
      remoteRevision = Math.floor(candidateRevision);
    }
  } catch {
    // Some deployments may allow PUT but not GET for the same token.
  }

  const publishPayload = {
    data: params.snapshot.data || { nodes: [], arrows: [] },
    name: params.snapshot.board_name || 'app Brainmap',
    revision: remoteRevision,
  };

  const result = await boardAiJsonRequest<{ revision?: number }>(endpoint, token, {
    method: 'PUT',
    body: JSON.stringify(publishPayload),
  });

  const nextRevision = Number(result?.revision);
  return {
    published: true,
    remotePublishConfigured: true,
    revision: Number.isFinite(nextRevision) && nextRevision >= 1
      ? Math.floor(nextRevision)
      : remoteRevision + 1,
    endpoint,
  };
}

export async function syncBoardSnapshot() {
  const projectRoot = findProjectRoot();
  const statusPath = join(projectRoot, BOARD_STATUS_FILE);
  const snapshotPath = join(projectRoot, BOARD_SNAPSHOT_FILE);
  const current = await readJsonFile<BoardSyncStatus>(statusPath, {});
  const snapshot = await regenerateBoardBrainmap(projectRoot);
  const boardUrl = current.board_url || DEFAULT_BOARD_URL;
  const currentRevision = Number(current.revision ?? 0);
  const publishResult = await publishBoardSnapshot({
    boardUrl,
    boardId: getBoardId(current, boardUrl),
    snapshot,
    revision: currentRevision > 0 ? currentRevision : 1,
  });
  const syncedAt = new Date().toISOString();
  const nextStatus: BoardSyncStatus = {
    ...current,
    board_url: boardUrl,
    snapshot_path: snapshotPath,
    source_brainmap: join(projectRoot, 'ai', 'BRAINMAP.md'),
    project_root: projectRoot,
    revision: publishResult.published && publishResult.revision
      ? publishResult.revision
      : currentRevision + 1,
    synced_at: syncedAt,
    local_synced_at: syncedAt,
    published_at: publishResult.published ? syncedAt : current.published_at,
    publish_status: publishResult.published ? 'published' : 'not_configured',
    publish_error: publishResult.published ? undefined : publishResult.error,
  };

  await writeFile(statusPath, `${JSON.stringify(nextStatus, null, 2)}\n`, 'utf8');
  return {
    success: true,
    published: publishResult.published,
    remotePublishConfigured: publishResult.remotePublishConfigured,
    message: publishResult.published
      ? 'BoardAI brainmap regenerated and snapshot published successfully.'
      : `BoardAI brainmap regenerated and local metadata refreshed. ${publishResult.error}`,
    status: await buildBoardStatus(),
  };
}

export async function handleBoardRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/board/status' && req.method === 'GET') {
    try {
      sendJson(res, 200, await buildBoardStatus());
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/board/sync' && req.method === 'POST') {
    try {
      sendJson(res, 200, await syncBoardSnapshot());
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
