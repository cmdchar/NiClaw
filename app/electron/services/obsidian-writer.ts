import { writeFile, appendFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { obsidianMemoryService } from './obsidian-memory';
import { vaultSnapshotService } from './vault-snapshot';
import { memoryGovernanceService, MemoryChange } from './memory-governance';

export class ObsidianWriterService {
  
  private safePath(relOrAbs: string): string | null {
    const vaultRoot = obsidianMemoryService.getVaultRoot();
    const fsPath = relOrAbs.startsWith('/') || relOrAbs.match(/^[A-Za-z]:[\\/]/)
      ? relOrAbs
      : join(vaultRoot, relOrAbs);
    const resolved = join(fsPath);
    if (!resolved.startsWith(vaultRoot)) return null;
    return resolved;
  }

  /**
   * Executes a pending change from the governance log.
   */
  async executeChange(changeId: string): Promise<boolean> {
    const change = await memoryGovernanceService.getLogById(changeId);
    if (!change || change.status !== 'approved') {
      console.warn('[ObsidianWriter] Change is not approved:', changeId);
      return false;
    }

    const absTarget = this.safePath(change.targetPath);
    if (!absTarget) {
      await memoryGovernanceService.updateStatus(change.id, 'failed', { error: 'Invalid safePath resolution' });
      return false;
    }

    // 1. Take a snapshot before touching the file
    const snapshotId = await vaultSnapshotService.createSnapshot(absTarget);
    
    await memoryGovernanceService.updateStatus(change.id, 'snapshot_created', {
      snapshotId: snapshotId || 'no_snapshot_needed'
    });

    try {
      // 2. Perform the execution based on action type
      await this.performWriteAction(change, absTarget);

      // 3. Mark as executed
      await memoryGovernanceService.updateStatus(change.id, 'executed', {
        executedAt: new Date().toISOString()
      });

      return true;

    } catch (e: any) {
      console.error('[ObsidianWriter] Failed to execute change:', changeId, e);
      await memoryGovernanceService.updateStatus(change.id, 'failed', { error: e?.message || 'Write failed' });
      return false;
    }
  }

  /**
   * Rolls back an executed change using its snapshot.
   */
  async rollbackChange(changeId: string): Promise<boolean> {
    const change = await memoryGovernanceService.getLogById(changeId);
    if (!change || change.status !== 'executed') return false;

    const absTarget = this.safePath(change.targetPath);
    if (!absTarget) return false;

    if (change.snapshotId && change.snapshotId !== 'no_snapshot_needed') {
      // Restore from snapshot
      const success = await vaultSnapshotService.restoreSnapshot(change.snapshotId, absTarget);
      if (success) {
        await memoryGovernanceService.updateStatus(change.id, 'rolled_back', { rolledBackAt: new Date().toISOString() });
        return true;
      }
    } else {
      // It was a new file creation. Rollback implies maybe deleting the created file, 
      // but to be safe we just mark it rolled back and log it.
      await memoryGovernanceService.updateStatus(change.id, 'rolled_back', { rolledBackAt: new Date().toISOString() });
      return true;
    }

    return false;
  }

  private async performWriteAction(change: MemoryChange, absTarget: string) {
    const content = change.diffPreview || '';

    switch (change.action) {
      case 'create_note':
        // No automatic folder creation here.
        await writeFile(absTarget, content, 'utf8');
        break;
      case 'append_to_note':
      case 'create_link':
        await appendFile(absTarget, '\n' + content, 'utf8');
        break;
      case 'create_folder':
        await mkdir(absTarget, { recursive: true });
        break;
      default:
        throw new Error('Unsupported governance action: ' + change.action);
    }
  }
}

export const obsidianWriterService = new ObsidianWriterService();
