import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { getLogsDir } from '../../utils/paths';
import { appendInboxEntry, ensureDevVault, listRecentReports, readCommandCenterTasks } from '../../services/dev-vault-service';
import { scanDevelopmentWorkspaces } from '../../services/dev-workspace-scanner';
import { buildCommandCenterStatus } from '../../services/server-health';
import { createCommandCenterReport } from '../../services/command-center-reporting';

function redactText(value: string): string {
  return value
    .replace(/(token|secret|password|api[_-]?key)\s*[:=]\s*[^\s,;}]+/gi, '$1=<redacted>')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer <redacted>')
    .replace(/[A-Za-z0-9_-]{32,}/g, '<redacted>');
}

async function readImportantLogs(limit = 8): Promise<Array<{ name: string; path: string; updatedAt: string; preview: string }>> {
  const logsDir = getLogsDir();
  if (!existsSync(logsDir)) return [];
  const entries = await readdir(logsDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const path = join(logsDir, entry.name);
    const meta = await stat(path);
    files.push({ name: entry.name, path, updatedAt: meta.mtime.toISOString() });
  }
  const recent = files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
  return Promise.all(recent.map(async (file) => {
    const raw = await readFile(file.path, 'utf8').catch(() => '');
    const lines = raw.split(/\r?\n/).filter(Boolean).slice(-5).join(' ');
    return {
      ...file,
      preview: redactText(lines).slice(0, 500),
    };
  }));
}

export async function handleCommandCenterRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (!url.pathname.startsWith('/api/command-center')) {
    return false;
  }

  if (url.pathname === '/api/command-center/status' && req.method === 'GET') {
    try {
      const status = await buildCommandCenterStatus(ctx);
      sendJson(res, 200, { success: true, status });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/command-center/projects' && req.method === 'GET') {
    try {
      const result = await scanDevelopmentWorkspaces();
      sendJson(res, 200, { success: true, ...result });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error), generatedAt: new Date().toISOString(), roots: [], projects: [] });
    }
    return true;
  }

  if (url.pathname === '/api/command-center/git' && req.method === 'GET') {
    try {
      const result = await scanDevelopmentWorkspaces();
      sendJson(res, 200, {
        success: true,
        generatedAt: result.generatedAt,
        repositories: result.projects.filter((project) => project.git.isGit),
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error), repositories: [] });
    }
    return true;
  }

  if (url.pathname === '/api/command-center/tasks' && req.method === 'GET') {
    try {
      await ensureDevVault();
      const tasks = await readCommandCenterTasks();
      sendJson(res, 200, { success: true, ...tasks });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error), tasks: [] });
    }
    return true;
  }

  if (url.pathname === '/api/command-center/logs' && req.method === 'GET') {
    try {
      const logs = await readImportantLogs();
      sendJson(res, 200, { success: true, logs });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error), logs: [] });
    }
    return true;
  }

  if (url.pathname === '/api/command-center/reports' && req.method === 'GET') {
    try {
      await ensureDevVault();
      const reports = await listRecentReports();
      sendJson(res, 200, { success: true, reports });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error), reports: [] });
    }
    return true;
  }

  if (url.pathname === '/api/command-center/inbox' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ title?: string; content?: string; source?: string }>(req);
      const content = typeof body.content === 'string' ? body.content.trim() : '';
      if (!content) {
        sendJson(res, 400, { success: false, error: 'content is required' });
        return true;
      }
      const entry = await appendInboxEntry({ title: body.title, content, source: body.source });
      sendJson(res, 200, { success: true, entry });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/command-center/report' && req.method === 'POST') {
    try {
      const [status, projects] = await Promise.all([
        buildCommandCenterStatus(ctx),
        scanDevelopmentWorkspaces(),
      ]);
      const report = await createCommandCenterReport({ status, projects });
      sendJson(res, 200, { success: true, report });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}

