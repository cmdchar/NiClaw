import { Task, TaskEvent, TaskStatus, AuditLog } from './types';
export type ExtendedTaskStatus = TaskStatus | 'blocked_policy_violation' | 'waiting_rollback_approval';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { getDataDir } from '../../utils/paths';

export class TaskEventStore extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private baseDir: string = '';
  private initialized: boolean = false;

  constructor() {
    super();
    this.initStore();
  }

  private async initStore() {
    try {
      this.baseDir = join(getDataDir(), 'command-center');
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(join(this.baseDir, 'events'), { recursive: true });
      await fs.mkdir(join(this.baseDir, 'reports'), { recursive: true });
      await fs.mkdir(join(this.baseDir, 'patches'), { recursive: true });

      const tasksFile = join(this.baseDir, 'tasks.json');
      try {
        const data = await fs.readFile(tasksFile, 'utf8');
        const rawTasks = JSON.parse(data);
        for (const [id, task] of Object.entries(rawTasks)) {
          // Initialize empty arrays for runtime if they are missing
          const t = task as Task;
          t.events = t.events || [];
          t.logs = t.logs || [];
          t.auditLogs = t.auditLogs || [];
          this.tasks.set(id, t);
        }
      } catch (e: any) {
        if (e.code !== 'ENOENT') {
          console.error('Failed to load tasks.json', e);
        }
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TaskEventStore', error);
    }
  }

  private async saveTasks() {
    if (!this.initialized) return;
    try {
      const dbPath = join(this.baseDir, 'tasks.json');
      const tempFile = join(this.baseDir, `tasks.json.tmp.${Date.now()}`);
      const backupFile = join(this.baseDir, 'tasks.json.bak');
      
      const rawTasks: Record<string, any> = {};
      for (const [id, task] of this.tasks.entries()) {
        rawTasks[id] = task;
      }
      
      await fs.writeFile(tempFile, JSON.stringify(rawTasks, null, 2), 'utf8');
      try {
        await fs.access(dbPath);
        await fs.copyFile(dbPath, backupFile);
      } catch (e) {
        // ignore if it doesn't exist
      }
      await fs.rename(tempFile, dbPath);
    } catch (e) {
      console.error('Failed to save tasks atomically:', e);
    }
  }

  private async saveTaskEvents(taskId: string) {
    if (!this.initialized) return;
    const task = this.tasks.get(taskId);
    if (!task) return;
    try {
      const dbPath = join(this.baseDir, 'events', `${taskId}.json`);
      const tempFile = join(this.baseDir, 'events', `${taskId}.json.tmp.${Date.now()}`);
      const backupFile = join(this.baseDir, 'events', `${taskId}.json.bak`);
      
      const content = JSON.stringify({
        events: task.events,
        logs: task.logs,
        auditLogs: task.auditLogs
      }, null, 2);
      
      await fs.writeFile(tempFile, content, 'utf8');
      try {
        await fs.access(dbPath);
        await fs.copyFile(dbPath, backupFile);
      } catch (e) {
        // ignore
      }
      await fs.rename(tempFile, dbPath);
    } catch (e) {
      console.error('Failed to save task events atomically:', e);
    }
  }

  createTask(title: string, userPrompt: string, targetProject: string, executor?: string): Task {
    const id = randomUUID();
    const task: Task = {
      id,
      title,
      userPrompt,
      targetProject,
      executor,
      status: 'queued',
      assignedAgents: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      events: [],
      logs: [],
      auditLogs: []
    };
    this.tasks.set(id, task);
    this.saveTasks();
    this.saveTaskEvents(id);
    this.emit('task_created', task);
    
    // Add initial audit log
    this.addAuditLog(id, 'Task created', 'system');
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  updateTaskStatus(id: string, status: ExtendedTaskStatus) {
    const task = this.tasks.get(id);
    if (!task) return;
    (task as any).status = status;
    task.updatedAt = Date.now();
    this.saveTasks();
    this.addEvent(id, 'status_change', `Status changed to ${status}`, { status });
    this.emit('task_updated', task);
  }

  addEvent(taskId: string, type: TaskEvent['type'], message: string, data?: any) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    const event: TaskEvent = {
      id: randomUUID(),
      timestamp: Date.now(),
      type,
      message,
      data
    };
    task.events.push(event);
    task.updatedAt = Date.now();
    this.saveTasks();
    this.saveTaskEvents(taskId);
    this.emit('task_event', { taskId, event });
  }

  addLog(taskId: string, log: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.logs.push(`[${new Date().toISOString()}] ${log}`);
    task.updatedAt = Date.now();
    this.saveTasks();
    this.saveTaskEvents(taskId);
    this.emit('task_log', { taskId, log });
  }

  addAuditLog(taskId: string, action: string, actor: string, branch?: string, agent?: string, diffSummary?: string, severity?: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    const audit: AuditLog & { severity?: string } = {
      id: randomUUID(),
      taskId,
      timestamp: Date.now(),
      action,
      actor,
      branch,
      agent,
      diffSummary,
      severity
    };
    task.auditLogs = task.auditLogs || [];
    task.auditLogs.push(audit);
    task.updatedAt = Date.now();
    
    this.saveTasks();
    this.saveTaskEvents(taskId);
    this.emit('task_audit', { taskId, audit });
  }

  updateTaskField(taskId: string, field: Partial<Task>) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    Object.assign(task, field);
    task.updatedAt = Date.now();
    this.saveTasks();
    this.emit('task_updated', task);
  }

  getEvents(taskId: string): TaskEvent[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];
    return task.events || [];
  }
}

export const taskEventStore = new TaskEventStore();
