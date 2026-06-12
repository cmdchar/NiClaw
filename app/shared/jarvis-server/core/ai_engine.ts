import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/env";
import { getMemory, saveMemory } from "../memory/manager";
import { openClawClient } from "../services/openclawClient";

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY || "MOCK_KEY");

const HERMES_SYSTEM_PROMPT = `
Ești Jarvis (inspirat de modelul Hermes), un asistent personal român, extrem de inteligent, concis și orientat pe execuție.
Reguli de comportament:
1. Răspunde scurt și la obiect.
2. Dacă utilizatorul cere o acțiune, confirmă execuția ei.
3. Folosește reflexia pentru a verifica dacă răspunsul tău este cel mai eficient pentru utilizator.
4. Identitatea ta este Jarvis, creat pentru a asista utilizatorul pe Android.
`;

export async function askAI(prompt: string, userId: string): Promise<string> {
    if (config.OPENCLAW_ENABLED) {
        const ocResponse = await openClawClient.sendMessage(prompt, userId);
        if (ocResponse) return ocResponse;
    }

    if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === "MOCK_KEY") {
        return "Serviciile AI sunt momentan indisponibile. Verifică configurația serverului.";
    }

    try {
        const model = genAI.getGenerativeModel({
            model: config.GEMINI_MODEL,
            systemInstruction: HERMES_SYSTEM_PROMPT
        });

        const history = getMemory(userId).map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();

        saveMemory(userId, "user", prompt);
        saveMemory(userId, "model", text);

        return text;
    } catch {
        return "Eroare la procesarea cererii (Gemini).";
    }
}

export async function* streamAI(prompt: string, userId: string) {
    if (config.OPENCLAW_ENABLED) {
        const ocResponse = await openClawClient.sendMessage(prompt, userId);
        if (ocResponse) {
            yield ocResponse;
            return;
        }
    }

    if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === "MOCK_KEY") {
        yield "Mod Demo.";
        return;
    }

    try {
        const model = genAI.getGenerativeModel({
            model: config.GEMINI_MODEL,
            systemInstruction: HERMES_SYSTEM_PROMPT
        });

        const history = getMemory(userId).map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(prompt);

        let fullResponse = "";
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            yield chunkText;
        }

        saveMemory(userId, "user", prompt);
        saveMemory(userId, "model", fullResponse);
    } catch {
        yield "Eroare streaming.";
    }
}
