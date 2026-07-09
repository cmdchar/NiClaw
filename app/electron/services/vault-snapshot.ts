import { copyFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { pathProvider } from '../runtime/runtime-factory';

export class VaultSnapshotService {
  private snapshotsDir: string;

  constructor() {
    this.snapshotsDir = join(join(pathProvider.getHomePath(), '.openclaw'), 'governance', 'memory-snapshots');
  }

  async initialize() {
    try {
      await mkdir(this.snapshotsDir, { recursive: true });
    } catch (e) {
      console.warn('[VaultSnapshotService] Error creating snapshots dir', e);
    }
  }

  /**
   * Creates a snapshot of a file if it exists. Returns a snapshotId or null if file doesn't exist.
   */
  async createSnapshot(targetPath: string): Promise<string | null> {
    await this.initialize();
    
    try {
      const stats = await stat(targetPath);
      if (!stats.isFile()) return null;
    } catch {
      // File doesn't exist, so no snapshot needed (it's a new file)
      return null;
    }

    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const snapshotPath = join(this.snapshotsDir, snapshotId);
    
    await copyFile(targetPath, snapshotPath);
    return snapshotId;
  }

  /**
   * Restores a file from a snapshot.
   */
  async restoreSnapshot(snapshotId: string, targetPath: string): Promise<boolean> {
    const snapshotPath = join(this.snapshotsDir, snapshotId);
    try {
      // Ensure target directory exists before restoring
      await mkdir(dirname(targetPath), { recursive: true });
      await copyFile(snapshotPath, targetPath);
      return true;
    } catch (e) {
      console.error('[VaultSnapshotService] Failed to restore snapshot', snapshotId, e);
      return false;
    }
  }
}

export const vaultSnapshotService = new VaultSnapshotService();
