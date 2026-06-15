import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { getPort } from '../utils/config';
import { getSetting } from '../utils/store';
import { logger } from '../utils/logger';
import { validateAndroidSyncToken } from '../utils/android-sync';
import { extensionRegistry } from '../extensions/registry';
import type { HostApiContext } from './context';
import { handleAppRoutes } from './routes/app';
import { handleGatewayRoutes } from './routes/gateway';
import { handleSettingsRoutes } from './routes/settings';
import { handleProviderRoutes } from './routes/providers';
import { handleAgentRoutes } from './routes/agents';
import { handleChannelRoutes } from './routes/channels';
import { handleLogRoutes } from './routes/logs';
import { handleUsageRoutes } from './routes/usage';
import { handleSkillRoutes } from './routes/skills';
import { handleFileRoutes } from './routes/files';
import { handleSessionRoutes } from './routes/sessions';
import { handleCronRoutes } from './routes/cron';
import { handleDiagnosticsRoutes } from './routes/diagnostics';
import { handleBoardRoutes } from './routes/board';
import { handlePlanRoutes } from './routes/plans';
import { handleTaskRoutes } from './routes/tasks';
import { handleObsidianRoutes } from './routes/obsidian';
import { handleDreamsRoutes } from './routes/dreams';
import { handleGovernanceRoutes } from './routes/governance';
import { handleCouncilRoutes } from './routes/council';
import { handleAgentMeshRoutes } from './routes/agent-mesh';
import { handleCommandCenterRoutes } from './routes/command-center';
import { handleModelsRoutes } from './routes/models';
import { handleOrchestratorRoutes } from './routes/orchestrator';
import { handleAndroidRoutes, isAndroidPairRequest } from './routes/android';
import { sendJson, setCorsHeaders, requireJsonContentType } from './route-utils';
import { hermesDreamEngine } from '../services/dream-engine';

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
) => Promise<boolean>;

const coreRouteHandlers: RouteHandler[] = [
  handleAppRoutes,
  handleGatewayRoutes,
  handleSettingsRoutes,
  handleProviderRoutes,
  handleAgentRoutes,
  handleChannelRoutes,
  handleSkillRoutes,
  handleFileRoutes,
  handleSessionRoutes,
  handleCronRoutes,
  handleBoardRoutes,
  handlePlanRoutes,
  handleTaskRoutes,
  handleObsidianRoutes,
  handleDreamsRoutes,
  handleGovernanceRoutes,
  handleDiagnosticsRoutes,
  handleLogRoutes,
  handleUsageRoutes,
  handleCouncilRoutes,
  handleAndroidRoutes,
  handleAgentMeshRoutes,
  handleCommandCenterRoutes,
  handleModelsRoutes,
  handleOrchestratorRoutes,
];

function buildRouteHandlers(): RouteHandler[] {
  const extensionHandlers = extensionRegistry.getRouteHandlers();
  return [...coreRouteHandlers, ...extensionHandlers];
}

/**
 * Per-session secret token used to authenticate Host API requests.
 * Generated once at server start and shared with the renderer via IPC.
 * This prevents cross-origin attackers from reading sensitive data even
 * if they can reach 127.0.0.1:13210 (the CORS wildcard alone is not
 * sufficient because browsers attach the Origin header but not a secret).
 */
let hostApiToken: string = '';

/** Retrieve the current Host API auth token (for use by IPC proxy). */
export function getHostApiToken(): string {
  return hostApiToken;
}

function headerToString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join(', ') : value;
}

function formatRequestPathForLog(url: URL): string {
  const safeSearch = new URLSearchParams(url.searchParams);
  for (const key of Array.from(safeSearch.keys())) {
    if (/token|secret|password|key|code/i.test(key)) {
      safeSearch.set(key, '***');
    }
  }
  const query = safeSearch.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export function startHostApiServer(ctx: HostApiContext, port = getPort('CLAWX_HOST_API')): Server {
  // Generate a cryptographically random token for this session.
  hostApiToken = randomBytes(32).toString('hex');
  ctx.hostApiToken = hostApiToken;

  // Schedule nightly dream cycle at 03:00 AM
  function scheduleNightlyDreaming() {
    const now = new Date();
    const next3AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 0, 0);
    if (now > next3AM) {
      next3AM.setDate(next3AM.getDate() + 1);
    }
    const delay = next3AM.getTime() - now.getTime();
    
    setTimeout(() => {
      logger.info('[Dreams] Triggering nightly dream cycle (03:00 AM)');
      hermesDreamEngine.triggerDreamCycle().catch(err => {
        logger.error('[Dreams] Nightly dream cycle failed:', err);
      });
      scheduleNightlyDreaming();
    }, delay);
  }
  scheduleNightlyDreaming();

  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
      logger.info(`[Host API] ${req.method} ${formatRequestPathForLog(requestUrl)} from ${req.socket.remoteAddress}`);
      // ── CORS headers ─────────────────────────────────────────
      // Set origin-aware CORS headers early so every response
      // (including error responses) carries them consistently.
      const origin = req.headers.origin;
      setCorsHeaders(res, origin);

      // CORS preflight — respond before auth so browsers can negotiate.
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      // ── Auth gate ──────────────────────────────────────────────
      // Every non-preflight request must carry a valid Bearer token.
      // Accept via Authorization header (preferred) or ?token= query
      // parameter (for EventSource which cannot set custom headers).
      const authHeader = req.headers.authorization || '';
      const bearerToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (requestUrl.searchParams.get('token') || '');

      const gatewayToken = await getSetting('gatewayToken');
      const customApiToken = process.env.CLAWX_API_TOKEN || '';
      const androidPairRequest = isAndroidPairRequest(req, requestUrl);
      const androidDevice = bearerToken
        ? await validateAndroidSyncToken(bearerToken, {
            remoteAddress: req.socket.remoteAddress,
            userAgent: headerToString(req.headers['user-agent']),
          })
        : null;

      if (
        !androidPairRequest &&
        bearerToken !== hostApiToken &&
        bearerToken !== gatewayToken &&
        (customApiToken === '' || bearerToken !== customApiToken) &&
        !androidDevice
      ) {
        sendJson(res, 401, { success: false, error: 'Unauthorized' });
        return;
      }

      // ── Content-Type gate (anti-CSRF) ──────────────────────────
      // Mutation requests must use application/json to force a CORS
      // preflight, preventing "simple request" CSRF attacks.
      if (!requireJsonContentType(req)) {
        sendJson(res, 415, { success: false, error: 'Content-Type must be application/json' });
        return;
      }

      const routeHandlers = buildRouteHandlers();
      for (const handler of routeHandlers) {
        if (await handler(req, res, requestUrl, ctx)) {
          return;
        }
      }
      sendJson(res, 404, { success: false, error: `No route for ${req.method} ${requestUrl.pathname}` });
    } catch (error) {
      logger.error('Host API request failed:', error);
      sendJson(res, 500, { success: false, error: String(error) });
    }
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EACCES' || error.code === 'EADDRINUSE') {
      logger.error(
        `Host API server failed to bind port ${port}: ${error.message}. ` +
        'On Windows this is often caused by Hyper-V reserving the port range. ' +
        `Set CLAWX_PORT_CLAWX_HOST_API env var to override the default port.`,
      );
    } else {
      logger.error('Host API server error:', error);
    }
  });

  void (async () => {
    const remoteAccess = await getSetting('remoteAccessEnabled');
    const isHeadless = process.env.CLAWX_HEADLESS === '1' || process.env.HEADLESS === 'true';
    const bindAddress = (remoteAccess || isHeadless) ? '0.0.0.0' : '127.0.0.1';
    server.listen(port, bindAddress, () => {
      logger.info(`Host API server listening on http://${bindAddress}:${port} (Remote Access: ${remoteAccess || isHeadless})`);
    });
  })();

  return server;
}

