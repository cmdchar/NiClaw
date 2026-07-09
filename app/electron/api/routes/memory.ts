import type { IncomingMessage, ServerResponse } from 'http';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { getMemoryProposalStore } from '../../services/orchestrator/memory-proposal-store';
import { randomUUID } from 'node:crypto';

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
// Route handler
// ---------------------------------------------------------------------------
export async function handleMemoryRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  const vaultRoot = getVaultPath();

  // GET /api/memory/inventory (4.6A)
  if (url.pathname === '/api/memory/inventory' && req.method === 'GET') {
    try {
      const { stat } = await import('node:fs/promises');
      const s = await stat(vaultRoot);
      const { readdir } = await import('node:fs/promises');
      let rootMdCount = 0;
      try {
        const items = await readdir(vaultRoot);
        rootMdCount = items.filter(i => i.endsWith('.md')).length;
      } catch {
        // ignore
      }
      sendJson(res, 200, {
        success: true,
        vaultPath: vaultRoot,
        exists: s.isDirectory(),
        rootNoteCount: rootMdCount,
        openClawMemoryPath: '/home/debian/.openclaw/workspace/memory',
        syncScriptPath: 'C:\\Server\\AI\\sync-secondbrain-to-vm.ps1'
      });
    } catch (err) {
      sendJson(res, 200, { success: false, vaultPath: vaultRoot, exists: false, error: String(err) });
    }
    return true;
  }

  // GET /api/memory/search (4.6A)
  if (url.pathname === '/api/memory/search' && req.method === 'GET') {
    // For 4.6A, we proxy search to the existing basic Obsidian search or OpenClaw
    // Because OpenClaw isn't accessible synchronously from Host without SSH in Phase 4.6A,
    // we return a not-implemented stub or local vault search placeholder to fulfill the contract.
    sendJson(res, 200, {
      success: true,
      message: 'Local memory search to be integrated with OpenClaw in subsequent phases.',
      results: []
    });
    return true;
  }

  // GET /api/memory/proposals (4.6B)
  if (url.pathname === '/api/memory/proposals' && req.method === 'GET') {
    const status = url.searchParams.get('status') || undefined;
    try {
      const proposals = getMemoryProposalStore().getProposals(status);
      sendJson(res, 200, { success: true, proposals });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/memory/proposals (4.6B)
  if (url.pathname === '/api/memory/proposals' && req.method === 'POST') {
    // Enforce dedicated MEMORY_API_TOKEN
    const authHeader = req.headers['x-memory-token'] || req.headers.authorization || '';
    let providedToken = '';
    if (typeof authHeader === 'string') {
      providedToken = authHeader.replace(/^Bearer\s+/i, '');
    }
    const memoryApiToken = process.env.MEMORY_API_TOKEN || '';
    
    // Scoped strictly to memory proposal/approval
    if (!memoryApiToken || providedToken !== memoryApiToken) {
      sendJson(res, 401, { success: false, error: 'Unauthorized memory mutation. Invalid or missing MEMORY_API_TOKEN.' });
      return true;
    }

    try {
      const body = await parseJsonBody(req);
      const { sourceAgent, confidence, affectedFile, proposedContent } = body;
      
      if (!sourceAgent || !affectedFile || !proposedContent) {
        sendJson(res, 400, { success: false, error: 'Missing required proposal fields' });
        return true;
      }

      const proposal = {
        id: randomUUID(),
        sourceAgent: String(sourceAgent),
        confidence: Number(confidence) || 1.0,
        affectedFile: String(affectedFile),
        proposedContent: String(proposedContent),
        status: 'pending' as const,
        timestamp: new Date().toISOString()
      };

      getMemoryProposalStore().insertProposal(proposal);
      sendJson(res, 200, { success: true, proposal });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/memory/proposals/:id/approve (4.6C)
  const approveMatch = url.pathname.match(/^\/api\/memory\/proposals\/([^/]+)\/approve$/);
  if (approveMatch && req.method === 'POST') {
    const id = approveMatch[1];
    try {
      const proposal = getMemoryProposalStore().getProposalById(id);
      if (!proposal) {
        sendJson(res, 404, { success: false, error: 'Proposal not found' });
        return true;
      }
      if (proposal.status !== 'pending') {
        sendJson(res, 400, { success: false, error: `Proposal cannot be approved because status is ${proposal.status}` });
        return true;
      }

      // Execute atomic write using the hardened writer
      const { memoryWriterService } = await import('../../services/memory-writer');
      await memoryWriterService.safeWriteMemory(vaultRoot, proposal.affectedFile, proposal.proposedContent);

      // Transition status to committed
      getMemoryProposalStore().updateProposalStatus(id, 'committed');

      // Set pendingSync to true and emit mesh event
      const { secondBrainSyncRunner } = await import('../../services/secondbrain-sync-runner');
      secondBrainSyncRunner.setPendingSync(true);

      const { meshPublisher } = await import('../../services/mesh-publisher');
      meshPublisher.publishEvent({
        event_type: 'memory.updated',
        source_node: 'windows-host',
        target_node: 'mesh',
        payload: {
          proposalId: id,
          affectedFile: proposal.affectedFile
        },
        details: {
          memoryEventType: 'memory.approved',
          timestamp: new Date().toISOString()
        }
      });
      
      sendJson(res, 200, { success: true, status: 'committed', syncStatus: 'pending' });
    } catch (err) {
      getMemoryProposalStore().updateProposalStatus(id, 'failed', String(err));
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/memory/proposals/:id/reject (4.6C)
  const rejectMatch = url.pathname.match(/^\/api\/memory\/proposals\/([^/]+)\/reject$/);
  if (rejectMatch && req.method === 'POST') {
    const id = rejectMatch[1];
    try {
      const proposal = getMemoryProposalStore().getProposalById(id);
      if (!proposal) {
        sendJson(res, 404, { success: false, error: 'Proposal not found' });
        return true;
      }
      if (proposal.status !== 'pending') {
        sendJson(res, 400, { success: false, error: `Proposal cannot be rejected because status is ${proposal.status}` });
        return true;
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      const reason = body.reason ? String(body.reason) : 'No reason provided';
      
      getMemoryProposalStore().updateProposalStatus(id, 'rejected', reason);
      
      sendJson(res, 200, { success: true, status: 'rejected' });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/memory/sync/status (4.6D)
  if (url.pathname === '/api/memory/sync/status' && req.method === 'GET') {
    const { secondBrainSyncRunner } = await import('../../services/secondbrain-sync-runner');
    sendJson(res, 200, { success: true, state: secondBrainSyncRunner.getState() });
    return true;
  }

  // POST /api/memory/sync/run (4.6D)
  if (url.pathname === '/api/memory/sync/run' && req.method === 'POST') {
    // Explicitly reject Android-authenticated callers for this destructive action
    const authHeader = req.headers.authorization || '';
    if (authHeader.includes('AndroidSync') || authHeader.startsWith('Bearer android')) {
      sendJson(res, 403, { success: false, error: 'Android devices are not permitted to trigger manual syncs' });
      return true;
    }

    const { secondBrainSyncRunner } = await import('../../services/secondbrain-sync-runner');
    
    // Check single-flight before spawning
    if (secondBrainSyncRunner.getState().status === 'running') {
      sendJson(res, 409, { success: false, error: 'Sync is already running' });
      return true;
    }

    // Run async. We don't await the entire run here to avoid blocking the HTTP response for 5 minutes.
    secondBrainSyncRunner.runSync().catch((err) => {
      console.error('[SyncRunner] failed:', err);
    });

    sendJson(res, 202, { success: true, message: 'Sync started' });
    return true;
  }

  return false;
}
