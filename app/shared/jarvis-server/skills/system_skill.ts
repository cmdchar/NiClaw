export function handleSystemAction(text: string) {
    const input = text.toLowerCase();

    // 1. Aplicații uzuale
    if (input.includes("whatsapp")) {
        return {
            actions: [
                { type: "open_app", package: "com.whatsapp" },
                { type: "speak", text: "Deschid WhatsApp" }
            ],
            skill: "system_skill",
            confidence: 1.0
        };
    }

    if (input.includes("youtube")) {
        return {
            actions: [
                { type: "open_app", package: "com.google.android.youtube" },
                { type: "speak", text: "Deschid YouTube" }
            ],
            skill: "system_skill",
            confidence: 1.0
        };
    }

    // 2. Control sistem
    if (input.includes("setări") || input.includes("settings")) {
        return {
            actions: [
                { type: "open_settings" },
                { type: "speak", text: "Deschid setările sistemului" }
            ],
            skill: "system_skill",
            confidence: 0.9
        };
    }

    if (input.includes("lanternă") || input.includes("lanterna")) {
        return {
            actions: [
                { type: "toggle_flashlight" },
                { type: "speak", text: "Comut lanterna" }
            ],
            skill: "system_skill",
            confidence: 1.0
        };
    }

    // 3. Comunicare
    if (input.includes("sună-l pe") || input.includes("suna-l pe") || input.includes("apelează")) {
        const name = input.split("pe").pop()?.trim() || "contact";
        return {
            actions: [
                { type: "make_call", recipient: name },
                { type: "speak", text: `Inițiez apel către ${name}` }
            ],
            skill: "system_skill",
            confidence: 0.95
        };
    }

    return null;
}
