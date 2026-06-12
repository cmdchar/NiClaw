import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { sendJson, parseJsonBody } from '../route-utils';
import { CouncilMemory } from '../../services/council/council-memory';
import { CouncilEngine } from '../../services/council/council-engine';
import { HermesProvider } from '../../services/council/council-runtime';
import { CouncilVoting } from '../../services/council/council-voting';
import { join } from 'path';

// Singleton initialization for now (will be injected in context ideally)
let memory: CouncilMemory | null = null;
let engine: CouncilEngine | null = null;
let voting: CouncilVoting | null = null;

function initServices(ctx: HostApiContext) {
  if (!memory) {
    const dataDir = ctx.projectRoot ? join(ctx.projectRoot, 'data') : process.cwd();
    memory = new CouncilMemory(dataDir);
    // Provider pointing to the host's current working directory
    const provider = new HermesProvider(ctx.projectRoot || process.cwd());
    engine = new CouncilEngine(memory, provider);
    voting = new CouncilVoting(memory);
  }
}

export async function handleCouncilRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (!url.pathname.startsWith('/api/council')) return false;

  initServices(ctx);

  if (url.pathname === '/api/council/sessions' && req.method === 'GET') {
    try {
      const state = memory!.getState();
      sendJson(res, 200, { success: true, sessions: state.councilSessions });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/council/sessions' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body || !body.question) {
        sendJson(res, 400, { success: false, error: 'Missing question' });
        return true;
      }
      
      const session = await engine!.runSession(body.question, body.linkedTaskId);
      sendJson(res, 200, { success: true, session });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/council/vote' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const vote = voting!.submitVote(body.sessionId, body.role, body.decision, body.rationale);
      if (!vote) {
        sendJson(res, 404, { success: false, error: 'Session not found' });
        return true;
      }
      sendJson(res, 200, { success: true, vote });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/council/decision/accept' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const decision = voting!.acceptDecision(body.decisionId);
      sendJson(res, 200, { success: true, decision });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/council/decision/reject' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const decision = voting!.rejectDecision(body.decisionId);
      sendJson(res, 200, { success: true, decision });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
