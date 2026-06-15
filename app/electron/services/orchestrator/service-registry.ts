import { join } from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getDataDir } from '../../utils/paths';
import { hermesAdapter } from './hermes-adapter';
import { openClawAdapter } from './openclaw-adapter';
import { obsidianMemoryService } from '../obsidian-memory';

const execAsync = promisify(exec);

export interface ServiceHealth {
  service: string;
  status: 'ONLINE' | 'OFFLINE' | 'NOT_CONFIGURED' | 'ERROR';
  details?: string;
  latency?: number;
  lastChecked: number;
}

export class ServiceRegistry {
  private healthCache: Map<string, ServiceHealth> = new Map();

  async getHealthStatus(): Promise<ServiceHealth[]> {
    await Promise.all([
      this.checkCodexCli(),
      this.checkHermes(),
      this.checkOpenClaw(),
      this.checkOpenHuman(),
      this.checkSecondBrain()
    ]);

    const statusArray = Array.from(this.healthCache.values());
    await this.saveHealthAtomically(statusArray);
    return statusArray;
  }

  private updateCache(service: string, status: ServiceHealth['status'], details?: string, latency?: number) {
    this.healthCache.set(service, {
      service,
      status,
      details,
      latency,
      lastChecked: Date.now()
    });
  }

  private async checkCodexCli() {
    try {
      // Check if it's on the PATH
      const cmd = process.platform === 'win32' ? 'where codex' : 'which codex';
      await execAsync(cmd);
      
      const { stdout } = await execAsync('codex --version');
      this.updateCache('Codex CLI', 'ONLINE', `Version: ${stdout.trim()}`);
    } catch (e: any) {
      this.updateCache('Codex CLI', 'NOT_CONFIGURED', 'Codex CLI not found in PATH');
    }
  }

  private async checkHermes() {
    try {
      const health = await hermesAdapter.healthCheck();
      if (health.status === 'ONLINE') {
        const models = await hermesAdapter.getModels();
        this.updateCache('Hermes', 'ONLINE', `Available models: ${models.length}`, health.latency);
      } else {
        this.updateCache('Hermes', health.status, `Endpoint: ${health.endpoint || 'unconfigured'}`, health.latency);
      }
    } catch (e: any) {
      this.updateCache('Hermes', 'ERROR', e.message);
    }
  }

  private async checkOpenClaw() {
    try {
      const health = await openClawAdapter.healthCheck();
      this.updateCache('OpenClaw', health.status, `Endpoint: ${health.endpoint} ${health.lastError ? `(${health.lastError})` : ''}`, health.latency);
    } catch (e: any) {
      this.updateCache('OpenClaw', 'ERROR', e.message);
    }
  }

  private async checkOpenHuman() {
    // Open-Human currently requires explicit endpoint configuration in Phase 2
    // If not configured, it's NOT_CONFIGURED (Android Command Center handles fallback)
    this.updateCache('Open-Human', 'NOT_CONFIGURED', 'Fallback to Android approval loop');
  }

  private async checkSecondBrain() {
    try {
      const isConnected = await obsidianMemoryService.testConnection();
      if (isConnected) {
        this.updateCache('SecondBrain', 'ONLINE', 'Vault path accessible');
      } else {
        this.updateCache('SecondBrain', 'NOT_CONFIGURED', 'Vault path invalid or missing');
      }
    } catch (e: any) {
      this.updateCache('SecondBrain', 'ERROR', e.message);
    }
  }

  private async saveHealthAtomically(statusArray: ServiceHealth[]) {
    try {
      const dir = join(getDataDir(), 'command-center');
      await fs.mkdir(dir, { recursive: true });
      
      const dbPath = join(dir, 'service-health.json');
      const tempFile = join(dir, `service-health.json.tmp.${Date.now()}`);
      const backupFile = join(dir, 'service-health.json.bak');
      
      await fs.writeFile(tempFile, JSON.stringify(statusArray, null, 2), 'utf8');
      
      try {
        await fs.access(dbPath);
        await fs.copyFile(dbPath, backupFile);
      } catch (e) {
        // ignore
      }
      await fs.rename(tempFile, dbPath);
    } catch (e) {
      console.error('Failed to save service-health atomically', e);
    }
  }
}

export const serviceRegistry = new ServiceRegistry();
