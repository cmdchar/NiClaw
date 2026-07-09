import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { getSetting } from '../../utils/store';
import { logger } from '../../utils/logger';

export async function handleAgentMeshRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  void ctx;
  
  if (url.pathname === '/api/agent-mesh/status' && req.method === 'GET') {
    const { meshClient } = require('../../services/mesh/mesh-client');
    sendJson(res, 200, {
      success: true,
      status: meshClient.getStatus(),
      agentId: meshClient.getAgentId()
    });
    return true;
  }

  if (url.pathname === '/api/agent-mesh/message' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      logger.info(`[Mesh] Received message from ${body.from || 'unknown'}: ${body.topic}`);
      // In v1, we just ack the message.
      sendJson(res, 200, { success: true, message: 'Message received and logged.' });
    } catch (e: any) {
      sendJson(res, 400, { success: false, error: 'Invalid payload' });
    }
    return true;
  }

  // Common handler for Mesh Proxy endpoints
  if (url.pathname.startsWith('/api/agent-mesh/')) {
    const gatewayToken = await getSetting('gatewayToken');
    if (!gatewayToken) {
      sendJson(res, 500, { success: false, error: 'Gateway token not configured' });
      return true;
    }

    const fromEnv = process.env.SUPERHERMES_API_URL;
    const baseUrl = fromEnv || await getSetting('superhermesUrl') || 'https://vm-niclaw.tail7a9097.ts.net:8002';

    // Map internal path back to the external mesh path
    let targetPath = url.pathname.replace('/api/agent-mesh/', '/api/mesh/');
    if (url.pathname.includes('/agent-events')) {
       targetPath = url.pathname.replace('/api/agent-mesh/agent-events', '/api/agent-events');
    }
    
    const targetUrl = `${baseUrl}${targetPath}${url.search}`;

    try {
      let bodyData: any = undefined;
      if (req.method === 'POST') {
        bodyData = await parseJsonBody(req);
      }

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayToken}`,
        },
        body: bodyData ? JSON.stringify(bodyData) : undefined,
      });

      if (!response.ok) {
        let errorText = await response.text().catch(() => '');
        sendJson(res, response.status, { success: false, error: `Upstream error: ${response.status}`, details: errorText });
        return true;
      }

      const data = await response.json();
      sendJson(res, 200, data);
      return true;
    } catch (e: any) {
      logger.error('Mesh proxy failed', e);
      sendJson(res, 500, { success: false, error: 'Mesh proxy failed', details: e?.message });
      return true;
    }
  }

  return false;
}
