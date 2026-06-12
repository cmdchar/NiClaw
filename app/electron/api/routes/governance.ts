import type { IncomingMessage, ServerResponse } from 'http';
import { sendJson } from '../route-utils';
import type { HostApiContext } from '../context';
import { memoryGovernanceService } from '../../services/memory-governance';
import { obsidianWriterService } from '../../services/obsidian-writer';

export async function handleGovernanceRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {

  // GET /api/memory/governance/queue
  if (url.pathname === '/api/memory/governance/queue' && req.method === 'GET') {
    try {
      await memoryGovernanceService.scanCandidates(); // auto-queue newly promoted
      const queue = await memoryGovernanceService.getQueue();
      sendJson(res, 200, { success: true, result: queue });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/memory/governance/log
  if (url.pathname === '/api/memory/governance/log' && req.method === 'GET') {
    try {
      const logs = await memoryGovernanceService.getLogs();
      const recent = logs.filter(l => 
        l.status === 'executed' || l.status === 'rolled_back' || l.status === 'failed' || l.status === 'rejected'
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 50);
      sendJson(res, 200, { success: true, result: recent });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/memory/governance/:id/approve
  const approveMatch = url.pathname.match(/^\/api\/memory\/governance\/([^/]+)\/approve$/);
  if (approveMatch && req.method === 'POST') {
    try {
      const id = approveMatch[1];
      const change = await memoryGovernanceService.updateStatus(id, 'approved', { approvedAt: new Date().toISOString() });
      if (!change) {
        sendJson(res, 404, { success: false, error: 'Change not found' });
        return true;
      }
      
      const success = await obsidianWriterService.executeChange(id);
      const finalChange = await memoryGovernanceService.getLogById(id);
      sendJson(res, 200, { success, result: finalChange });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/memory/governance/:id/reject
  const rejectMatch = url.pathname.match(/^\/api\/memory\/governance\/([^/]+)\/reject$/);
  if (rejectMatch && req.method === 'POST') {
    try {
      const id = rejectMatch[1];
      const change = await memoryGovernanceService.updateStatus(id, 'rejected');
      if (!change) {
        sendJson(res, 404, { success: false, error: 'Change not found' });
        return true;
      }
      sendJson(res, 200, { success: true, result: change });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/memory/rollback/:id
  const rollbackMatch = url.pathname.match(/^\/api\/memory\/rollback\/([^/]+)$/);
  if (rollbackMatch && req.method === 'POST') {
    try {
      const id = rollbackMatch[1];
      const success = await obsidianWriterService.rollbackChange(id);
      if (!success) {
        sendJson(res, 400, { success: false, error: 'Rollback failed or change not eligible' });
        return true;
      }
      const finalChange = await memoryGovernanceService.getLogById(id);
      sendJson(res, 200, { success: true, result: finalChange });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  return false;
}
