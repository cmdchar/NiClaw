import { join, relative, basename, extname } from 'node:path';
import { homedir } from 'node:os';
import { stat, readdir, readFile } from 'node:fs/promises';

export interface VaultEntry {
  name: string;
  path: string;
  isDir: boolean;
  sizeBytes?: number;
  modifiedAt?: string;
}

export interface SearchResult {
  path: string;
  name: string;
  snippet: string;
  score: number;
}

export class ObsidianMemoryService {
  private vaultRoot: string;

  constructor() {
    // Standardize to the debian second brain path, fallback to local for dev
    this.vaultRoot = process.env.OBSIDIAN_VAULT_PATH || 'C:/Users/nicus/OneDrive/Documents/111SERVER';
    // Actually the user specified: /home/debian/secondBrain
    // We will use the env var if present, or /home/debian/secondBrain if on linux, else fallback.
    if (!process.env.OBSIDIAN_VAULT_PATH) {
      if (process.platform === 'linux') {
        this.vaultRoot = '/home/debian/secondBrain';
      }
    }
  }

  public getVaultRoot(): string {
    return this.vaultRoot;
  }

  private safePath(relOrAbs: string): string | null {
    const fsPath = relOrAbs.startsWith('/') || relOrAbs.match(/^[A-Za-z]:[\\/]/)
      ? relOrAbs
      : join(this.vaultRoot, relOrAbs);
    const resolved = join(fsPath);
    if (!resolved.startsWith(this.vaultRoot)) return null;
    return resolved;
  }

  public async readNote(relPath: string): Promise<string | null> {
    const absPath = this.safePath(relPath);
    if (!absPath) return null;
    try {
      const s = await stat(absPath);
      if (!s.isFile()) return null;
      return await readFile(absPath, 'utf8');
    } catch {
      return null;
    }
  }

  public async searchNotes(query: string, maxResults = 30): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    const walk = async (dir: string) => {
      if (results.length >= maxResults) return;
      let items: string[];
      try {
        items = await readdir(dir);
      } catch {
        return;
      }
      for (const item of items) {
        if (results.length >= maxResults) break;
        if (item.startsWith('.')) continue;
        const abs = join(dir, item);
        let s;
        try { s = await stat(abs); } catch { continue; }
        
        if (s.isDirectory()) {
          await walk(abs);
        } else if (s.isFile() && extname(item).toLowerCase() === '.md') {
          try {
            const content = await readFile(abs, 'utf8');
            const lowerContent = content.toLowerCase();
            const nameMatch = item.toLowerCase().includes(lowerQuery);
            const bodyIdx = lowerContent.indexOf(lowerQuery);
            if (nameMatch || bodyIdx !== -1) {
              const relPath = relative(this.vaultRoot, abs).replace(/\\/g, '/');
              let snippet = '';
              if (bodyIdx !== -1) {
                const start = Math.max(0, bodyIdx - 60);
                const end = Math.min(content.length, bodyIdx + 120);
                snippet = (start > 0 ? '…' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '…' : '');
              }
              results.push({
                path: relPath,
                name: basename(item, '.md'),
                snippet,
                score: nameMatch ? 2 : 1,
              });
            }
          } catch { /* ignore */ }
        }
      }
    };

    await walk(this.vaultRoot);
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  public async listRecentNotes(limit = 10): Promise<VaultEntry[]> {
    const results: VaultEntry[] = [];
    
    const walk = async (dir: string) => {
      let items: string[];
      try {
        items = await readdir(dir);
      } catch {
        return;
      }
      for (const item of items) {
        if (item.startsWith('.')) continue;
        const abs = join(dir, item);
        let s;
        try { s = await stat(abs); } catch { continue; }
        if (s.isDirectory()) {
          await walk(abs);
        } else if (s.isFile() && extname(item).toLowerCase() === '.md') {
          results.push({
            name: basename(item, '.md'),
            path: relative(this.vaultRoot, abs).replace(/\\/g, '/'),
            isDir: false,
            sizeBytes: s.size,
            modifiedAt: s.mtime.toISOString(),
          });
        }
      }
    };

    await walk(this.vaultRoot);
    results.sort((a, b) => {
      const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
      const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
      return timeB - timeA;
    });

    return results.slice(0, limit);
  }

  public async getDailyNotes(limit = 5): Promise<VaultEntry[]> {
    const dailyDirCandidates = ['Journals/Daily', 'Daily'];
    let dailyDir: string | null = null;
    
    for (const cand of dailyDirCandidates) {
      const p = this.safePath(cand);
      if (p) {
        try {
          const s = await stat(p);
          if (s.isDirectory()) {
            dailyDir = p;
            break;
          }
        } catch { /* ignore */ }
      }
    }

    if (!dailyDir) return [];

    try {
      const files = (await readdir(dailyDir))
        .filter(f => f.endsWith('.md') && /\d{4}-\d{2}-\d{2}/.test(f))
        .sort()
        .reverse()
        .slice(0, limit);
        
      const results: VaultEntry[] = [];
      for (const f of files) {
        const abs = join(dailyDir, f);
        const s = await stat(abs);
        results.push({
          name: basename(f, '.md'),
          path: relative(this.vaultRoot, abs).replace(/\\/g, '/'),
          isDir: false,
          sizeBytes: s.size,
          modifiedAt: s.mtime.toISOString(),
        });
      }
      return results;
    } catch {
      return [];
    }
  }

  public async refreshIndex(): Promise<void> {
    // In a more complex implementation, this would build a local sqlite or fuse index.
    // For now, it's a no-op as we walk the FS on demand.
  }
}

export const obsidianMemoryService = new ObsidianMemoryService();
