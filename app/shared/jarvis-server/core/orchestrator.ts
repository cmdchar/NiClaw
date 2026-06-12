import { getTime } from "../skills/time";
import { searchWeb } from "../skills/search";
import { handleSystemAction } from "../skills/system_skill";
import { askAI } from "./ai_engine";

export async function processCommand(text: string, userId: string) {
    const input = text.toLowerCase();

    // 1. Verificăm acțiuni de sistem (Android Intents)
    const systemAction = handleSystemAction(input);
    if (systemAction) {
        return {
            text: systemAction.actions.find(a => a.type === "speak")?.text || "Execut acțiune de sistem.",
            speech: true,
            actions: systemAction.actions,
            skill: systemAction.skill,
            confidence: systemAction.confidence
        };
    }

    // 2. Ora
    if (input.includes("ora")) {
        return {
            text: getTime(),
            speech: true,
            actions: [],
            skill: "time",
            confidence: 1.0
        };
    }

    // 3. Căutare
    if (input.includes("caută")) {
        const query = input.replace("caută", "").trim();
        const result = searchWeb(query);
        return {
            text: result.text,
            speech: true,
            actions: [{ type: "open_url", url: result.url }],
            skill: "search",
            confidence: 1.0
        };
    }

    // 4. Default: AI Brain (Gemini)
    const aiResponse = await askAI(text, userId);
    return {
        text: aiResponse,
        speech: true,
        actions: [],
        skill: "ai_engine",
        confidence: 0.8
    };
}
