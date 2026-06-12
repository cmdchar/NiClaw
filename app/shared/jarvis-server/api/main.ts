import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";
import { processCommand } from "../core/orchestrator";
import { streamAI } from "../core/ai_engine";
import { config } from "../config/env";
import { openClawClient } from "../services/openclawClient";
import { runSwarmDag } from "../core/dagRunner";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/jarvis/stream" });

app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get("/health", async (req, res) => {
    const ocStatus = config.OPENCLAW_ENABLED ? await openClawClient.checkHealth() : "disabled";
    res.json({
        status: "alive",
        jarvis_brain: "ready",
        openclaw_integration: ocStatus,
        version: "2.0.0"
    });
});

/**
 * Jarvis Chat REST
 */
app.post("/jarvis/chat", async (req, res) => {
    const { text, user_id } = req.body;
    if (!text || !user_id) {
        return res.status(400).json({ error: "Missing text or user_id" });
    }
    const response = await processCommand(text, user_id);
    res.json(response);
});

/**
 * Run Swarm DAG visually designed on the canvas
 */
app.post("/api/swarm/run", async (req, res) => {
    const { nodes, edges, initialInput } = req.body;
    try {
        const result = await runSwarmDag(nodes, edges, initialInput);
        res.json(result);
    } catch (e: any) {
        res.status(500).json({
            success: false,
            error: e.message,
            logs: [
                {
                    id: "err-root",
                    time: new Date().toLocaleTimeString("ro-RO"),
                    type: "error",
                    text: `Eroare server DAG Runner: ${e.message}`
                }
            ]
        });
    }
});

/**
 * WebSocket for Real-time Streaming
 */
wss.on("connection", (ws) => {
    console.log("[WS] Client connected");

    ws.on("message", async (message) => {
        try {
            const data = JSON.parse(message.toString());
            const { text, user_id } = data;

            if (!text || !user_id) {
                ws.send(JSON.stringify({ type: "error", message: "Missing data" }));
                return;
            }

            const input = text.toLowerCase();

            // Intercept rapid commands
            if (input.includes("ora") || input.includes("caută")) {
                const response = await processCommand(text, user_id);
                ws.send(JSON.stringify({ type: "full", ...response }));
                return;
            }

            // AI Streaming
            ws.send(JSON.stringify({ type: "start" }));
            for await (const chunk of streamAI(text, user_id)) {
                ws.send(JSON.stringify({ type: "chunk", text: chunk }));
            }
            ws.send(JSON.stringify({ type: "end" }));

        } catch(e) {
            console.error("[WS Error]:", (e as Error).message);
            ws.send(JSON.stringify({ type: "error", message: "Invalid JSON format" }));
        }
    });

    ws.on("close", () => console.log("[WS] Client disconnected"));
});

const PORT = config.PORT;
server.listen(PORT, () => {
    console.log(`\n🚀 Jarvis Next-Gen Server running on port ${PORT}`);
    console.log(`   - REST: http://localhost:${PORT}/jarvis/chat`);
    console.log(`   - WS: ws://localhost:${PORT}/jarvis/stream`);
    console.log(`   - OpenClaw: ${config.OPENCLAW_ENABLED ? 'ENABLED' : 'DISABLED'}\n`);
});
