import dotenv from "dotenv";

dotenv.config();

export const config = {
    PORT: process.env.PORT || 3000,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-pro",
    OPENCLAW_BASE_URL: process.env.OPENCLAW_BASE_URL || "http://localhost:18789",
    OPENCLAW_ENABLED: process.env.OPENCLAW_ENABLED === "true",
    SYSTEM_PROMPT: "Ești Jarvis, un asistent personal inteligent. Răspunde în limba română, concis și orientat pe acțiuni. Numele tău este Jarvis."
};

if (!config.GEMINI_API_KEY && !config.OPENCLAW_ENABLED) {
    console.warn("[WARNING] Nicio cheie API sau integrare OpenClaw nu este configurată. Serverul va rula în mod limitat.");
}
