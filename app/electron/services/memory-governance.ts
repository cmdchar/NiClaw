import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathProvider } from '../runtime/runtime-factory';
import { memoryPromotionService } from './memory-promotion';

export type GovernanceAction = 'create_note' | 'append_to_note' | 'create_link' | 'create_folder';

export type GovernanceStatus = 'pending' | 'rejected' | 'approved' | 'snapshot_created' | 'executed' | 'failed' | 'rolled_back';

export interface MemoryChange {
  id: string;
  timestamp: string;
  candidateId: string; // Maps to dream-promotions.json id
  action: GovernanceAction;
  targetPath: string; // Target path in Obsidian
  status: GovernanceStatus;
  approvedAt: string | null;
  executedAt: string | null;
  rolledBackAt: string | null;
  snapshotId: string | null;
  contentPreview: string;
  diffPreview: string;
  error: string | null;
}

export class MemoryGovernanceService {
  private logPath: string;

  constructor() {
    this.logPath = join(pathProvider.getHomePath(), '.openclaw', 'governance', 'memory-change-log.jsonl');
  }

  async initialize() {
    try {
      await mkdir(join(pathProvider.getHomePath(), '.openclaw', 'governance'), { recursive: true });
    } catch (e) {
      console.warn('[MemoryGovernanceService] Error creating governance dir', e);
    }
  }

  async getLogs(): Promise<MemoryChange[]> {
    await this.initialize();
    try {
      const content = await readFile(this.logPath, 'utf8');
      return content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  private async writeLog(change: MemoryChange) {
    await this.initialize();
    await appendFile(this.logPath, JSON.stringify(change) + '\n', 'utf8');
  }

  private async rewriteAllLogs(logs: MemoryChange[]) {
    await this.initialize();
    const content = logs.map(l => JSON.stringify(l)).join('\n') + '\n';
    await writeFile(this.logPath, content, 'utf8');
  }

  /**
   * Scans promotions and generates pending governance actions for new ones.
   */
  async scanCandidates() {
    const promotions = await memoryPromotionService.getPromotions();
    const logs = await this.getLogs();
    
    // Process only items that reached L3+ and are 'promoted'
    const candidates = promotions.filter(p => p.status === 'promoted');
    
    for (const candidate of candidates) {
      const alreadyQueued = logs.some(l => l.candidateId === candidate.id);
      if (alreadyQueued) continue;

      const sanitizedTitle = candidate.title.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'New_Note';
      
      const newChange: MemoryChange = {
        id: `chg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toISOString(),
        candidateId: candidate.id,
        action: 'create_note',
        targetPath: `${sanitizedTitle}.md`,
        status: 'pending',
        approvedAt: null,
        executedAt: null,
        rolledBackAt: null,
        snapshotId: null,
        contentPreview: candidate.content.substring(0, 100),
        diffPreview: candidate.content,
        error: null
      };
      
      await this.writeLog(newChange);
      logs.push(newChange);
    }
  }

  async getQueue(): Promise<MemoryChange[]> {
    const logs = await this.getLogs();
    return logs.filter(l => l.status === 'pending');
  }

  async updateStatus(
    id: string, 
    status: GovernanceStatus, 
    updates: Partial<MemoryChange> = {}
  ): Promise<MemoryChange | null> {
    const logs = await this.getLogs();
    const index = logs.findIndex(l => l.id === id);
    if (index === -1) return null;

    logs[index] = { ...logs[index], ...updates, status };
    await this.rewriteAllLogs(logs);
    return logs[index];
  }
  
  async getLogById(id: string): Promise<MemoryChange | null> {
    const logs = await this.getLogs();
    return logs.find(l => l.id === id) || null;
  }
}

export const memoryGovernanceService = new MemoryGovernanceService();
