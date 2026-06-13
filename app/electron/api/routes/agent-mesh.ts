import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { getSetting } from '../../utils/store';
import { logger } from '../../utils/logger';

const SUPERHERMES_URL = 'https://vm-niclaw.tail7a9097.ts.net:8002';

export async function handleAgentMeshRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  void ctx;
  // Common handler for Mesh Proxy endpoints
  if (url.pathname.startsWith('/api/agent-mesh/')) {
    const gatewayToken = await getSetting('gatewayToken');
    if (!gatewayToken) {
      sendJson(res, 500, { success: false, error: 'Gateway token not configured' });
      return true;
    }

    // Map internal path back to the external mesh path
    const targetPath = url.pathname.replace('/api/agent-mesh/', '/api/mesh/');
    const targetUrl = `${SUPERHERMES_URL}${targetPath}${url.search}`;

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
