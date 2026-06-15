import { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../route-utils';

export async function handleModelsRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<boolean> {
  if (url.pathname === '/api/models' && req.method === 'GET') {
    try {
      // Proxy to Hermes or just return known defaults for now, 
      // but try fetching from Hermes first.
      const hermesResponse = await fetch('http://127.0.0.1:7789/models').catch(() => null);
      if (hermesResponse && hermesResponse.ok) {
        const data = await hermesResponse.json();
        sendJson(res, 200, data);
      } else {
        // Fallback
        sendJson(res, 200, { models: ["gpt-4o", "claude-3-opus", "gemini-1.5-pro", "local-model"] });
      }
    } catch (e) {
      sendJson(res, 500, { error: String(e) });
    }
    return true;
  }
  return false;
}
