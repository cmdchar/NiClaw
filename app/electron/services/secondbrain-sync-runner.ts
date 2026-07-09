import { spawn } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import { meshPublisher } from './mesh-publisher';

export type SyncStatus = 'idle' | 'running' | 'succeeded' | 'failed';

export interface SyncRunnerState {
  status: SyncStatus;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastError: string | null;
  pendingSync: boolean;
  logTail: string[];
}

export class SyncRunnerService {
  private readonly SCRIPT_PATH = 'C:\\Server\\AI\\sync-secondbrain-to-vm.ps1';
  private readonly MAX_LOG_LINES = 100;
  private readonly TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  private state: SyncRunnerState = {
    status: 'idle',
    lastStartedAt: null,
    lastFinishedAt: null,
    lastError: null,
    pendingSync: false,
    logTail: []
  };

  public getState(): SyncRunnerState {
    return { ...this.state, logTail: [...this.state.logTail] };
  }

  public setPendingSync(pending: boolean): void {
    this.state.pendingSync = pending;
  }

  private appendLog(line: string) {
    const safeLine = line.replace(/\r?\n$/, '');
    this.state.logTail.push(safeLine);
    if (this.state.logTail.length > this.MAX_LOG_LINES) {
      this.state.logTail.shift();
    }
  }

  private publishEvent(eventType: 'memory.sync.started' | 'memory.sync.completed' | 'memory.sync.failed', details: any = {}) {
    meshPublisher.publishEvent({
      event_type: 'memory.updated',
      source_node: 'windows-host',
      target_node: 'mesh',
      payload: {}, // No heavy payload needed
      details: {
        memoryEventType: eventType,
        ...details
      }
    });
  }

  public async runSync(): Promise<void> {
    if (this.state.status === 'running') {
      throw new Error('Sync is already running');
    }

    this.state.status = 'running';
    this.state.lastStartedAt = new Date().toISOString();
    this.state.lastFinishedAt = null;
    this.state.lastError = null;
    this.state.logTail = [];

    // Safely verify script path
    let resolvedPath: string;
    try {
      const stats = await stat(this.SCRIPT_PATH);
      if (!stats.isFile()) {
        throw new Error('Not a file');
      }
      resolvedPath = await realpath(this.SCRIPT_PATH);
      if (resolvedPath !== this.SCRIPT_PATH) {
        throw new Error('Path mismatch (symlink or traversal)');
      }
    } catch (err) {
      this.state.status = 'failed';
      this.state.lastFinishedAt = new Date().toISOString();
      this.state.lastError = `Script validation failed: ${String(err)}`;
      this.publishEvent('memory.sync.failed', { error: this.state.lastError });
      throw new Error(this.state.lastError);
    }

    this.publishEvent('memory.sync.started');

    return new Promise((resolve, reject) => {
      let isDone = false;

      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', resolvedPath
      ], {
        windowsHide: true,
        shell: false
      });

      const timeoutId = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          child.kill('SIGTERM');
          
          this.state.status = 'failed';
          this.state.lastFinishedAt = new Date().toISOString();
          this.state.lastError = 'Sync process timed out after 5 minutes';
          this.appendLog('[ERROR] ' + this.state.lastError);
          this.publishEvent('memory.sync.failed', { error: this.state.lastError });
          
          reject(new Error(this.state.lastError));
        }
      }, this.TIMEOUT_MS);

      const handleOutput = (data: Buffer) => {
        const lines = data.toString('utf8').split('\n');
        for (const line of lines) {
          if (line.trim()) {
            this.appendLog(line);
          }
        }
      };

      child.stdout.on('data', handleOutput);
      child.stderr.on('data', handleOutput);

      child.on('error', (err) => {
        if (isDone) return;
        isDone = true;
        clearTimeout(timeoutId);

        this.state.status = 'failed';
        this.state.lastFinishedAt = new Date().toISOString();
        this.state.lastError = `Process spawn error: ${err.message}`;
        this.publishEvent('memory.sync.failed', { error: this.state.lastError });
        reject(err);
      });

      child.on('close', (code) => {
        if (isDone) return;
        isDone = true;
        clearTimeout(timeoutId);

        this.state.lastFinishedAt = new Date().toISOString();
        if (code === 0) {
          this.state.status = 'succeeded';
          this.state.pendingSync = false;
          this.publishEvent('memory.sync.completed');
          resolve();
        } else {
          this.state.status = 'failed';
          this.state.lastError = `Process exited with code ${code}`;
          this.publishEvent('memory.sync.failed', { error: this.state.lastError });
          reject(new Error(this.state.lastError));
        }
      });
    });
  }
}

export const secondBrainSyncRunner = new SyncRunnerService();
