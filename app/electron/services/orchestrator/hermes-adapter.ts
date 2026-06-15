import { promises as fs } from 'fs';
import { getSetting } from '../../utils/store';
import { ProjectIndex } from './types';
import { logger } from '../../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

function onLog(msg: string) {
  logger.info(msg);
  console.log(msg);
}

export interface HermesPlan {
  steps: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  requiresHumanApproval: boolean;
  notes: string;
}

export interface HermesHealth {
    status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'NOT_CONFIGURED';
    httpStatus: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'UNAUTHORIZED';
    cliStatus: 'ONLINE' | 'OFFLINE' | 'ERROR';
    selectedTransport: 'HTTP' | 'CLI' | 'NONE';
    planningTransport: 'HTTP' | 'CLI' | 'DEEPSEEK' | 'STRUCTURAL';
    modelsTransport: 'HTTP' | 'CLI' | 'NONE';
    endpoint?: string;
    version?: string;
    modelsCount: number;
    models: string[];
    lastError?: string;
    fallbackUsed: boolean;
    latency: number;
}

export class HermesAdapter {
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  private async getConfig(key: string, defaultValue: string): Promise<string> {
      return (process.env[key] as string) || defaultValue;
  }

  private async getHermesToken(endpoint: string): Promise<string | null> {
    const envToken = process.env.HERMES_API_TOKEN;
    if (envToken) return envToken;

    if (this.cachedToken && Date.now() < this.tokenExpiry) {
        return this.cachedToken;
    }
    try {
        const res = await fetch(endpoint, { method: 'GET' });
        const html = await res.text();
        const match = html.match(/window\.__HERMES_SESSION_TOKEN__="([^"]+)"/);
        if (match && match[1]) {
            this.cachedToken = match[1];
            this.tokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hr cache
            return this.cachedToken;
        }
    } catch (e) {
        // Silent fallback to avoid logging tokens
    }
    return null;
  }

  async healthCheck(): Promise<HermesHealth> {
    const start = Date.now();
    const endpoint = await this.getConfig('HERMES_ENDPOINT', 'http://vm-niclaw.tail7a9097.ts.net:7789');
    const cliHost = await this.getConfig('HERMES_CLI_HOST', 'vm-niclaw.tail7a9097.ts.net');
    const cliUser = await this.getConfig('HERMES_CLI_USER', 'debian');
    const cliPath = await this.getConfig('HERMES_CLI_PATH', '/home/debian/hermes-agent/.venv/bin/hermes');

    if (!endpoint && !cliHost) {
        return { status: 'NOT_CONFIGURED', httpStatus: 'OFFLINE', cliStatus: 'OFFLINE', selectedTransport: 'NONE', planningTransport: 'STRUCTURAL', modelsTransport: 'NONE', fallbackUsed: true, modelsCount: 0, models: [], latency: 0 };
    }

    let httpStatus: HermesHealth['httpStatus'] = 'OFFLINE';
    let cliStatus: HermesHealth['cliStatus'] = 'OFFLINE';
    let version = 'unknown';
    let modelsCount = 0;
    let models: string[] = [];
    let lastError = '';
    let modelsTransport: HermesHealth['modelsTransport'] = 'NONE';

    // 1. Try HTTP
    const token = await this.getHermesToken(endpoint);
    if (token) {
        try {
            const statusRes = await fetch(`${endpoint}/api/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (statusRes.ok) {
                httpStatus = 'ONLINE';
                const statusData = await statusRes.json();
                version = statusData.version || 'unknown';

                const modelsRes = await fetch(`${endpoint}/api/model/options`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (modelsRes.ok) {
                    modelsTransport = 'HTTP';
                    const modelsData = await modelsRes.json();
                    if (Array.isArray(modelsData)) {
                        for (const provider of modelsData) {
                            if (provider.models) {
                                const providerModels = provider.models.split(' ').filter(Boolean);
                                modelsCount += providerModels.length;
                                models.push(...providerModels);
                            }
                        }
                    }
                }
            } else {
                httpStatus = statusRes.status === 401 ? 'UNAUTHORIZED' : 'ERROR';
                if (!lastError) lastError = `HTTP ${statusRes.status}`;
            }
        } catch (err: any) {
            httpStatus = 'ERROR';
            if (!lastError) lastError = err.message;
        }
    } else {
        httpStatus = 'UNAUTHORIZED';
        if (!lastError) lastError = 'No token configured or found via fallback';
    }

    // 2. Try CLI
    try {
        const { stdout } = await execAsync(`ssh -o BatchMode=yes -o ConnectTimeout=5 ${cliUser}@${cliHost} "${cliPath} status"`);
        if (stdout && stdout.includes('Hermes Agent')) {
            cliStatus = 'ONLINE';
            const vMatch = stdout.match(/Hermes Agent v([0-9.]+)/);
            if (vMatch) version = vMatch[1];
        } else {
            cliStatus = 'ERROR';
            if (!lastError) lastError = 'CLI returned unexpected output';
        }
    } catch (err: any) {
        cliStatus = 'ERROR';
        if (!lastError) lastError = 'SSH CLI failed';
    }

    const isOnline = httpStatus === 'ONLINE' || cliStatus === 'ONLINE';
    const selectedTransport = httpStatus === 'ONLINE' ? 'HTTP' : (cliStatus === 'ONLINE' ? 'CLI' : 'NONE');
    const planningTransport = cliStatus === 'ONLINE' ? 'CLI' : (httpStatus === 'ONLINE' ? 'HTTP' : 'DEEPSEEK');

    return {
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        httpStatus,
        cliStatus,
        selectedTransport,
        planningTransport,
        modelsTransport,
        endpoint,
        version,
        modelsCount,
        models,
        lastError,
        fallbackUsed: false,
        latency: Date.now() - start
    };
  }

  async getModels(): Promise<string[]> {
      const health = await this.healthCheck();
      return health.models;
  }

  async generatePlan(prompt: string, project: ProjectIndex | null, context: any): Promise<{ plan: HermesPlan, isFallback: boolean }> {
    const health = await this.healthCheck();
    let fallbackUsed = false;

    // A. Try CLI fallback via hermes -z
    if (health.cliStatus === 'ONLINE') {
        try {
            const cliHost = await this.getConfig('HERMES_CLI_HOST', 'vm-niclaw.tail7a9097.ts.net');
            const cliUser = await this.getConfig('HERMES_CLI_USER', 'debian');
            const cliPath = await this.getConfig('HERMES_CLI_PATH', '/home/debian/hermes-agent/.venv/bin/hermes');

            const systemPrompt = `You are NiClaw's Hermes Planner. You must respond with a strict JSON object representing a task plan. Do not output markdown code blocks. Just output raw JSON. Required schema: { "steps": ["string"], "estimatedComplexity": "low|medium|high", "requiresHumanApproval": boolean, "notes": "string" }`;
            const fullPrompt = `${systemPrompt}\n\nPrompt: ${prompt}\nProject Context: ${project ? project.name : 'None'}\nContext: ${JSON.stringify(context)}`;
            // Base64 encode the prompt to avoid shell escaping hell
            const b64Prompt = Buffer.from(fullPrompt).toString('base64');
            const cmd = `ssh -o BatchMode=yes -o ConnectTimeout=20 ${cliUser}@${cliHost} "echo '${b64Prompt}' | base64 -d | ${cliPath} -z /dev/stdin"`;
            const { stdout } = await execAsync(cmd);
            if (stdout) {
                const outStr = stdout.trim();
                if (!outStr.includes('hermes -z: no final response was produced') && outStr.startsWith('{')) {
                    const parsedPlan = JSON.parse(outStr);
                    if (parsedPlan.steps) {
                        return { plan: parsedPlan, isFallback: false };
                    }
                } else if (outStr.includes('authentication_error')) {
                    onLog(`[Hermes] CLI Planning auth failed (DeepSeek invalid key in Hermes).`);
                }
            }
        } catch (err: any) {
            onLog(`[Hermes] CLI Planning failed: ${err.message}`);
        }
    }

    // B. Try HTTP fallback (if they ever implement /api/plan)
    if (health.httpStatus === 'ONLINE' && health.endpoint) {
      try {
        const token = await this.getHermesToken(health.endpoint);
        const res = await fetch(`${health.endpoint}/api/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ prompt, project, context })
        });
        if (res.ok) {
          return { plan: await res.json(), isFallback: false };
        } else {
          onLog(`[Hermes] HTTP /api/plan returned ${res.status}. Falling back.`);
        }
      } catch (err) {
        onLog(`[Hermes] HTTP Planning failed.`);
      }
    }

    // C. Direct DeepSeek Fallback
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      onLog(`[Phase 4] Using Direct DeepSeek fallback for planning (Hermes internal key failing)`);
      try {
        const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
        const model = process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat';
        
        const systemPrompt = `You are NiClaw's Hermes Planner. You must respond with a strict JSON object representing a task plan.
Do not output markdown code blocks. Just output raw JSON.
Required schema: { "steps": ["string"], "estimatedComplexity": "low|medium|high", "requiresHumanApproval": boolean, "notes": "string" }`;
        
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Prompt: ${prompt}\nProject Context: ${project ? project.name : 'None'}\nContext: ${JSON.stringify(context)}` }
            ],
            response_format: { type: 'json_object' }
          })
        });

        if (res.ok) {
          const completion = await res.json();
          let parsedPlan;
          try {
            parsedPlan = JSON.parse(completion.choices[0].message.content);
            return { plan: parsedPlan, isFallback: true };
          } catch (e) {
            console.error('[Hermes] DeepSeek fallback returned invalid JSON', e);
          }
        } else {
          console.error(`[Hermes] DeepSeek fallback failed with status ${res.status}`);
        }
      } catch (err) {
        console.error('[Hermes] DeepSeek fallback completely failed', err);
      }
    }

    // D. Fallback Structural Plan
    return {
      isFallback: true,
      plan: {
        steps: [
          `Analyze intent for prompt: "${prompt}"`,
          `Target project: ${project ? project.name : 'Unknown'}`,
          `Apply requested changes`
        ],
        estimatedComplexity: 'medium',
        requiresHumanApproval: true,
        notes: 'Generated structural fallback plan',
      }
    };
  }

  async generateClarification(prompt: string, options: string[]): Promise<string> {
    const health = await this.healthCheck();
    
    // Attempt HTTP Clarify
    if (health.httpStatus === 'ONLINE' && health.endpoint) {
        try {
            const token = await this.getHermesToken(health.endpoint);
            const res = await fetch(`${health.endpoint}/api/plan/clarify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ prompt, options })
            });
            if (res.ok) {
                const data = await res.json();
                return data.clarification;
            }
        } catch (err) {
            console.error('Hermes clarification failed via HTTP', err);
        }
    }
    
    return `M-ai rugat să: "${prompt}". Nu sunt sigur la care proiect te referi. Te rog alege din lista de mai jos.`;
  }
}

export const hermesAdapter = new HermesAdapter();
