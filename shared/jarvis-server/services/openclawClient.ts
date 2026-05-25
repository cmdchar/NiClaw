import axios from "axios";
import { config } from "../config/env";

export class OpenClawClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = config.OPENCLAW_BASE_URL;
    }

    async sendMessage(text: string, userId: string): Promise<string | null> {
        if (!config.OPENCLAW_ENABLED) return null;

        try {
            // OpenClaw Gateway uses a JSON-RPC like approach or a specific route
            // Based on niclaw_repo, the internal RPC call is 'chat.send'
            // We use the REST proxy if available or direct gateway port
            const response = await axios.post(`${this.baseUrl}/api/chat/send-with-media`, {
                sessionKey: `agent:jarvis:user:${userId}`,
                message: text,
                deliver: true,
                idempotencyKey: Date.now().toString()
            }, {
                timeout: 30000 // AI can take time
            });

            if (response.data && response.data.success) {
                // Return response from OpenClaw
                return response.data.result?.content || response.data.result?.message || null;
            }
            return null;
        } catch (error) {
            console.error("[OpenClaw Error]:", (error as Error).message);
            return null;
        }
    }

    async checkHealth(): Promise<boolean> {
        try {
            const res = await axios.get(`${this.baseUrl}/api/gateway/status`, { timeout: 2000 });
            return res.status === 200;
        } catch {
            return false;
        }
    }
}

export const openClawClient = new OpenClawClient();
