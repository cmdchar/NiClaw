import type { IncomingMessage, ServerResponse } from 'http';
import { join, relative, basename, extname } from 'node:path';
import { homedir } from 'node:os';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';

// ---------------------------------------------------------------------------
// Vault path resolution
// ---------------------------------------------------------------------------
function getVaultPath(): string {
  return (
    process.env.OBSIDIAN_VAULT_PATH ||
    join(homedir(), 'secondBrain')
  );
}

// ---------------------------------------------------------------------------
// Path safety: prevent directory traversal outside vault
// ---------------------------------------------------------------------------
function safePath(vaultRoot: string, relOrAbs: string): string | null {
  const fsPath = relOrAbs.startsWith('/')
    ? relOrAbs
    : join(vaultRoot, relOrAbs);
  const resolved = join(fsPath); // normalize
  if (!resolved.startsWith(vaultRoot)) return null;
  return resolved;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface VaultEntry {
  name: string;
  path: string;   // relative to vault root
  isDir: boolean;
  sizeBytes?: number;
  modifiedAt?: string;
}

async function listDir(vaultRoot: string, absDir: string): Promise<VaultEntry[]> {
  const { readdir, stat } = await import('node:fs/promises');
  const items = await readdir(absDir, { withFileTypes: true });
  const entries: VaultEntry[] = [];
  for (const item of items) {
    if (item.name.startsWith('.')) continue; // skip hidden
    const abs = join(absDir, item.name);
    const relPath = relative(vaultRoot, abs).replace(/\\/g, '/');
    if (item.isDirectory()) {
      entries.push({ name: item.name, path: relPath, isDir: true });
    } else if (item.isFile() && ['.md', '.txt', '.canvas'].includes(extname(item.name).toLowerCase())) {
      try {
        const s = await stat(abs);
        entries.push({
          name: item.name,
          path: relPath,
          isDir: false,
          sizeBytes: s.size,
          modifiedAt: s.mtime.toISOString(),
        });
      } catch {
        entries.push({ name: item.name, path: relPath, isDir: false });
      }
    }
  }
  // Dirs first, then files, alphabetical
  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return entries;
}

async function readNote(absPath: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  return readFile(absPath, 'utf8');
}

async function searchVault(vaultRoot: string, query: string, maxResults = 30): Promise<Array<{ path: string; name: string; snippet: string; score: number }>> {
  const { readdir, stat, readFile } = await import('node:fs/promises');
  const results: Array<{ path: string; name: string; snippet: string; score: number }> = [];
  const lowerQuery = query.toLowerCase();

  async function walk(dir: string) {
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
            const relPath = relative(vaultRoot, abs).replace(/\\/g, '/');
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
        } catch { /* skip unreadable */ }
      }
    }
  }

  await walk(vaultRoot);
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function handleObsidianRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  const { stat } = await import('node:fs/promises');
  const vaultRoot = getVaultPath();

  // GET /api/obsidian/status
  if (url.pathname === '/api/obsidian/status' && req.method === 'GET') {
    try {
      const s = await stat(vaultRoot);
      const { readdir } = await import('node:fs/promises');
      // quick shallow count of .md files at root
      const items = await readdir(vaultRoot);
      const rootMdCount = items.filter(i => i.endsWith('.md')).length;
      sendJson(res, 200, {
        success: true,
        vaultPath: vaultRoot,
        exists: s.isDirectory(),
        rootNoteCount: rootMdCount,
        pinnedNotes: [
          { label: 'Today', path: 'Journals/Daily/Today.md', icon: '📅' },
          { label: 'CENTRALBRAIN', path: 'Meta/CENTRALBRAIN.md', icon: '🧠' },
          { label: 'NiClaw Brain', path: 'Meta/NiClaw Live Brain.md', icon: '🤖' },
          { label: 'Projects', path: 'Projects', icon: '📁', isDir: true },
          { label: 'Runbooks', path: 'Runbooks', icon: '📋', isDir: true },
        ],
      });
    } catch (err) {
      sendJson(res, 200, { success: false, vaultPath: vaultRoot, exists: false, error: String(err) });
    }
    return true;
  }

  // GET /api/obsidian/browse?path=<relPath>
  if (url.pathname === '/api/obsidian/browse' && req.method === 'GET') {
    try {
      const relPath = url.searchParams.get('path') || '';
      const absPath = relPath ? safePath(vaultRoot, relPath) : vaultRoot;
      if (!absPath) {
        sendJson(res, 400, { success: false, error: 'Invalid path' });
        return true;
      }
      const s = await stat(absPath);
      if (!s.isDirectory()) {
        sendJson(res, 400, { success: false, error: 'Path is not a directory' });
        return true;
      }
      const entries = await listDir(vaultRoot, absPath);
      sendJson(res, 200, { success: true, path: relPath || '/', entries });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/obsidian/read?path=<relPath>
  if (url.pathname === '/api/obsidian/read' && req.method === 'GET') {
    try {
      const relPath = url.searchParams.get('path') || '';
      if (!relPath) {
        sendJson(res, 400, { success: false, error: 'Missing path' });
        return true;
      }
      const absPath = safePath(vaultRoot, relPath);
      if (!absPath) {
        sendJson(res, 400, { success: false, error: 'Invalid path' });
        return true;
      }
      const s = await stat(absPath);
      if (!s.isFile()) {
        sendJson(res, 400, { success: false, error: 'Path is not a file' });
        return true;
      }
      const content = await readNote(absPath);
      sendJson(res, 200, {
        success: true,
        path: relPath,
        name: basename(relPath, extname(relPath)),
        content,
        sizeBytes: s.size,
        modifiedAt: s.mtime.toISOString(),
      });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/obsidian/search  { query: string, maxResults?: number }
  if (url.pathname === '/api/obsidian/search' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ query: string; maxResults?: number }>(req);
      if (!body.query || body.query.trim().length < 2) {
        sendJson(res, 400, { success: false, error: 'Query too short' });
        return true;
      }
      const results = await searchVault(vaultRoot, body.query.trim(), body.maxResults || 30);
      sendJson(res, 200, { success: true, query: body.query, results });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/obsidian/today  — shortcut to today's journal
  if (url.pathname === '/api/obsidian/today' && req.method === 'GET') {
    const candidates = [
      'Journals/Daily/Today.md',
      'Daily/Today.md',
      'Today.md',
    ];
    for (const rel of candidates) {
      const abs = safePath(vaultRoot, rel);
      if (!abs) continue;
      try {
        const s = await stat(abs);
        if (s.isFile()) {
          const content = await readNote(abs);
          sendJson(res, 200, {
            success: true,
            path: rel,
            name: 'Today',
            content,
            modifiedAt: s.mtime.toISOString(),
          });
          return true;
        }
      } catch { /* try next */ }
    }
    sendJson(res, 404, { success: false, error: 'Today.md not found in vault' });
    return true;
  }

  // GET /api/obsidian/recent-journals?limit=5  — last N daily journal files
  if (url.pathname === '/api/obsidian/recent-journals' && req.method === 'GET') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '5', 10);
      const dailyDir = safePath(vaultRoot, 'Journals/Daily') || safePath(vaultRoot, 'Daily') || vaultRoot;
      const s = await stat(dailyDir!).catch(() => null);
      if (!s?.isDirectory()) {
        sendJson(res, 200, { success: true, journals: [] });
        return true;
      }
      const { readdir } = await import('node:fs/promises');
      const files = (await readdir(dailyDir!))
        .filter(f => f.endsWith('.md') && /\d{4}-\d{2}-\d{2}/.test(f))
        .sort()
        .reverse()
        .slice(0, limit);
      const journals = files.map(f => ({
        name: basename(f, '.md'),
        path: `Journals/Daily/${f}`,
      }));
      sendJson(res, 200, { success: true, journals });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  return false;
}
