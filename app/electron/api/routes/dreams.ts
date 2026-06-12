import type { IncomingMessage, ServerResponse } from 'http';
import { parseJsonBody, sendJson } from '../route-utils';
import type { HostApiContext } from '../context';
import { hermesDreamEngine } from '../../services/dream-engine';

export async function handleDreamsRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {

  // POST /api/dreams/signals
  if (url.pathname === '/api/dreams/signals' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ content: string; type?: string; source?: string; priority?: number }>(req);
      if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
        sendJson(res, 400, { success: false, error: 'Content is required' });
        return true;
      }
      const signal = await hermesDreamEngine.addSignal(
        body.content.trim(),
        body.type || 'dreamSeed',
        body.source || 'api',
        body.priority || 1
      );
      sendJson(res, 200, { success: true, signal });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/dreams/inbox
  if (url.pathname === '/api/dreams/inbox' && req.method === 'GET') {
    try {
      const inbox = await hermesDreamEngine.getInbox();
      sendJson(res, 200, { success: true, inbox });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/dreams/insights
  if (url.pathname === '/api/dreams/insights' && req.method === 'GET') {
    try {
      const insights = await hermesDreamEngine.getInsights();
      sendJson(res, 200, { success: true, insights });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/dreams/run
  if (url.pathname === '/api/dreams/run' && req.method === 'POST') {
    try {
      const insights = await hermesDreamEngine.triggerDreamCycle();
      sendJson(res, 200, { success: true, insights });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/dreams/queue
  if (url.pathname === '/api/dreams/queue' && req.method === 'GET') {
    try {
      const queue = await hermesDreamEngine.getReviewQueue();
      sendJson(res, 200, { success: true, result: queue });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/dreams/queue/:id/approve
  const queueApproveMatch = url.pathname.match(/^\/api\/dreams\/queue\/([^/]+)\/approve$/);
  if (queueApproveMatch && req.method === 'POST') {
    try {
      const id = queueApproveMatch[1];
      const success = await hermesDreamEngine.updateProposalStatus(id, 'approved');
      sendJson(res, 200, { success });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/dreams/queue/:id/reject
  const queueRejectMatch = url.pathname.match(/^\/api\/dreams\/queue\/([^/]+)\/reject$/);
  if (queueRejectMatch && req.method === 'POST') {
    try {
      const id = queueRejectMatch[1];
      const success = await hermesDreamEngine.updateProposalStatus(id, 'rejected');
      sendJson(res, 200, { success });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/dreams/queue/:id/edit
  const queueEditMatch = url.pathname.match(/^\/api\/dreams\/queue\/([^/]+)\/edit$/);
  if (queueEditMatch && req.method === 'POST') {
    try {
      const id = queueEditMatch[1];
      let bodyStr = '';
      for await (const chunk of req) { bodyStr += chunk; }
      const body = JSON.parse(bodyStr);
      const success = await hermesDreamEngine.updateProposalStatus(id, 'edited', body.content);
      sendJson(res, 200, { success });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/dreams/graph
  if (url.pathname === '/api/dreams/graph' && req.method === 'GET') {
    try {
      const graph = await hermesDreamEngine.getGraph();
      sendJson(res, 200, { success: true, result: graph });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/dreams/diary
  if (url.pathname === '/api/dreams/diary' && req.method === 'GET') {
    try {
      const content = await hermesDreamEngine.getDreamDiaryContent();
      sendJson(res, 200, { success: true, result: { content } });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // GET /api/dreams/promotions
  if (url.pathname === '/api/dreams/promotions' && req.method === 'GET') {
    try {
      const { memoryPromotionService } = await import('../../services/memory-promotion');
      const promotions = await memoryPromotionService.getPromotions();
      sendJson(res, 200, { success: true, result: promotions });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/dreams/promotions/run
  if (url.pathname === '/api/dreams/promotions/run' && req.method === 'POST') {
    try {
      const { memoryPromotionService } = await import('../../services/memory-promotion');
      const data = await memoryPromotionService.runPromotionCycle();
      sendJson(res, 200, { success: true, result: data });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/dreams/promotions/:id/accept
  const promoAcceptMatch = url.pathname.match(/^\/api\/dreams\/promotions\/([^/]+)\/accept$/);
  if (promoAcceptMatch && req.method === 'POST') {
    try {
      const id = promoAcceptMatch[1];
      const { memoryPromotionService } = await import('../../services/memory-promotion');
      const success = await memoryPromotionService.updatePromotionStatus(id, 'accepted_for_future_write');
      sendJson(res, 200, { success });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  // POST /api/dreams/promotions/:id/reject
  const promoRejectMatch = url.pathname.match(/^\/api\/dreams\/promotions\/([^/]+)\/reject$/);
  if (promoRejectMatch && req.method === 'POST') {
    try {
      const id = promoRejectMatch[1];
      const { memoryPromotionService } = await import('../../services/memory-promotion');
      const success = await memoryPromotionService.updatePromotionStatus(id, 'rejected');
      sendJson(res, 200, { success });
    } catch (err) {
      sendJson(res, 500, { success: false, error: String(err) });
    }
    return true;
  }

  return false;
}
