import fs from "fs";
import path from "path";

interface MemoryEntry {
    role: "user" | "model";
    content: string;
}

const MEMORY_FILE = path.join(__dirname, "../../memory_db.json");
let memories: Record<string, MemoryEntry[]> = {};

// Încărcare memorie la startup
if (fs.existsSync(MEMORY_FILE)) {
    try {
        memories = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
    } catch (e) {
        console.error("Eroare la încărcarea memoriei persistente:", e);
    }
}

export function getMemory(userId: string): MemoryEntry[] {
    return memories[userId] || [];
}

export function saveMemory(userId: string, role: "user" | "model", content: string) {
    if (!memories[userId]) {
        memories[userId] = [];
    }
    memories[userId].push({ role, content });

    // Limităm contextul la ultimele 20 de mesaje
    if (memories[userId].length > 20) {
        memories[userId].shift();
    }

    // Persistență în fișier
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
    } catch (e) {
        console.error("Eroare la salvarea memoriei persistente:", e);
    }
}
