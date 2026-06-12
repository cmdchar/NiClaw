import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { dirname, join } from 'node:path';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { getDataDir } from '../../utils/paths';

export interface SpatialTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  agentId?: string;
  planId?: string;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
}

interface TasksStore {
  tasks: SpatialTask[];
}

function tasksPath(): string {
  return join(getDataDir(), 'spatial', 'tasks.json');
}

async function readTasksStore(): Promise<TasksStore> {
  try {
    const raw = await readFile(tasksPath(), 'utf8');
    const parsed = JSON.parse(raw) as TasksStore;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    return { tasks: [] };
  }
}

async function writeTasksStore(store: TasksStore): Promise<void> {
  const filePath = tasksPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export async function handleTaskRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  void ctx; // unused here, but kept for signature parity

  if (url.pathname === '/api/tasks' && req.method === 'GET') {
    try {
      const store = await readTasksStore();
      sendJson(res, 200, { success: true, tasks: store.tasks });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/tasks' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<Partial<SpatialTask>>(req);
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title) {
        sendJson(res, 400, { success: false, error: 'Task title is required' });
        return true;
      }

      const timestamp = nowIso();
      const task: SpatialTask = {
        id: newId('task'),
        title,
        description: typeof body.description === 'string' ? body.description.trim() : '',
        status: body.status === 'in_progress' || body.status === 'done' ? body.status : 'todo',
        agentId: typeof body.agentId === 'string' && body.agentId.trim() ? body.agentId.trim() : undefined,
        planId: typeof body.planId === 'string' && body.planId.trim() ? body.planId.trim() : undefined,
        filePath: typeof body.filePath === 'string' && body.filePath.trim() ? body.filePath.trim() : undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const store = await readTasksStore();
      store.tasks.push(task);
      await writeTasksStore(store);
      sendJson(res, 200, { success: true, task, tasks: store.tasks });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/tasks/') && req.method === 'PUT') {
    try {
      const taskId = decodeURIComponent(url.pathname.slice('/api/tasks/'.length));
      const body = await parseJsonBody<Partial<SpatialTask>>(req);
      const store = await readTasksStore();
      const task = store.tasks.find((t) => t.id === taskId);

      if (!task) {
        sendJson(res, 404, { success: false, error: 'Task not found' });
        return true;
      }

      if (typeof body.title === 'string' && body.title.trim()) {
        task.title = body.title.trim();
      }
      if (typeof body.description === 'string') {
        task.description = body.description.trim();
      }
      if (body.status === 'todo' || body.status === 'in_progress' || body.status === 'done') {
        task.status = body.status;
      }
      
      // Update links
      if (body.agentId !== undefined) {
        task.agentId = typeof body.agentId === 'string' && body.agentId.trim() ? body.agentId.trim() : undefined;
      }
      if (body.planId !== undefined) {
        task.planId = typeof body.planId === 'string' && body.planId.trim() ? body.planId.trim() : undefined;
      }
      if (body.filePath !== undefined) {
        task.filePath = typeof body.filePath === 'string' && body.filePath.trim() ? body.filePath.trim() : undefined;
      }

      task.updatedAt = nowIso();
      await writeTasksStore(store);
      sendJson(res, 200, { success: true, task, tasks: store.tasks });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
    try {
      const taskId = decodeURIComponent(url.pathname.slice('/api/tasks/'.length));
      const store = await readTasksStore();
      const index = store.tasks.findIndex((t) => t.id === taskId);

      if (index === -1) {
        sendJson(res, 404, { success: false, error: 'Task not found' });
        return true;
      }

      store.tasks.splice(index, 1);
      await writeTasksStore(store);
      sendJson(res, 200, { success: true, tasks: store.tasks });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
