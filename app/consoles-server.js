const express = require('express');
const cors = require('cors');

// OpenHuman Server (7788)
const openhumanApp = express();
openhumanApp.use(cors());
openhumanApp.use(express.json());

const openhumanHtml = `<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenHuman Core Console</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                }
            }
        }
    </script>
    <style>
        ::-webkit-scrollbar {
            width: 6px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.1);
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(16, 185, 129, 0.2);
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(16, 185, 129, 0.4);
        }
        .glass {
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(16, 185, 129, 0.15);
        }
        .glow-green {
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);
        }
        .bubble-user {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-bottom-right-radius: 4px;
        }
        .bubble-bot {
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-bottom-left-radius: 4px;
        }
        @keyframes pulse-slow {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.95); }
        }
        .pulse-active {
            animation: pulse-slow 2s infinite ease-in-out;
        }
    </style>
</head>
<body class="bg-[#0b0f19] text-slate-100 min-h-screen flex flex-col font-sans overflow-hidden">
    
    {/* Background elements */}
    <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>

    <div class="flex-1 flex overflow-hidden p-4 md:p-6 z-10 relative">
        <div class="max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6">
            
            {/* Left Sidebar */}
            <aside class="w-full md:w-80 shrink-0 flex flex-col gap-4">
                {/* Brand card */}
                <div class="glass rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-emerald-500/20">
                            OH
                        </div>
                        <div>
                            <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                                OpenHuman
                                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 glow-green pulse-active"></span>
                            </h1>
                            <p class="text-[10px] text-emerald-400 font-mono tracking-wider uppercase">Cognitive Core Hub</p>
                        </div>
                    </div>
                    
                    <div class="h-px bg-emerald-500/10"></div>
                    
                    <div class="space-y-3 font-mono text-xs">
                        <div class="flex justify-between py-1 border-b border-white/[0.02]">
                            <span class="text-slate-400">STATUS:</span>
                            <span class="text-emerald-400 font-bold">ONLINE</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-white/[0.02]">
                            <span class="text-slate-400">ACTIVE MODEL:</span>
                            <span class="text-slate-200">DeepSeek Core</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-white/[0.02]">
                            <span class="text-slate-400">PORT ENGINE:</span>
                            <span class="text-slate-200">7788</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-white/[0.02]">
                            <span class="text-slate-400">HOST INTEGRATION:</span>
                            <span class="text-slate-200">Local loopback</span>
                        </div>
                        <div class="flex justify-between py-1">
                            <span class="text-slate-400">UPTIME:</span>
                            <span class="text-emerald-500/70" id="uptime">Loading...</span>
                        </div>
                    </div>
                </div>

                {/* System Monitors */}
                <div class="glass rounded-3xl p-5 flex-1 flex flex-col gap-3 shadow-xl hidden md:flex">
                    <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Cognitive Memory Sync</h2>
                    <div class="flex-1 flex flex-col justify-center items-center text-center p-4 border border-white/[0.03] rounded-2xl bg-black/10">
                        <div class="w-16 h-16 rounded-full border border-emerald-500/20 flex items-center justify-center mb-3">
                            <svg class="w-8 h-8 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                        </div>
                        <span class="text-xs font-semibold text-white">Obsidian Knowledge Vault</span>
                        <p class="text-[10px] text-slate-400 mt-1">Sincronizat pe Tailscale LAN cu vm-niclaw</p>
                    </div>
                </div>
            </aside>

            {/* Chat Container */}
            <main class="flex-1 glass rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
                {/* Chat Header */}
                <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/10 shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 glow-green"></div>
                        <span class="text-sm font-semibold text-white">Live Semantic Session</span>
                    </div>
                    <button onclick="clearChat()" class="text-xs text-slate-400 hover:text-emerald-400 transition-colors font-mono uppercase">Curata Chat</button>
                </div>

                {/* Messages Panel */}
                <div class="flex-1 overflow-y-auto p-6 space-y-4" id="chatHistory">
                    
                    {/* Welcome message */}
                    <div class="flex items-start gap-3 bubble-bot p-4 rounded-2xl max-w-[85%] animate-fadeIn">
                        <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">OH</div>
                        <div class="space-y-1">
                            <p class="text-xs font-mono font-bold text-emerald-400">OpenHuman Core</p>
                            <p class="text-sm text-slate-200 leading-relaxed">
                                Salut! Sunt **OpenHuman Core**, hub-ul tău local de procesare semantică. Sunt complet operațional și legat de instanța ta principală. Cu ce te pot asista astăzi în rețeaua ta?
                            </p>
                        </div>
                    </div>

                </div>

                {/* Chat Input */}
                <div class="p-4 border-t border-white/5 bg-black/10 shrink-0">
                    <form onsubmit="handleSend(event)" class="relative flex items-center">
                        <input 
                            type="text" 
                            id="messageInput"
                            placeholder="Adresează o întrebare sau deleagă o sarcină..."
                            class="w-full bg-slate-900/60 border border-white/10 rounded-2xl pl-4 pr-16 py-3.5 text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-slate-200 placeholder-slate-500"
                        />
                        <button 
                            type="submit"
                            class="absolute right-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-semibold text-xs shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
                        >
                            Trimite
                        </button>
                    </form>
                </div>
            </main>

        </div>
    </div>

    <script>
        // Simple Uptime simulation
        let startTime = Date.now() - 3624000;
        setInterval(() => {
            let diff = Date.now() - startTime;
            let secs = Math.floor(diff / 1000) % 60;
            let mins = Math.floor(diff / 60000) % 60;
            let hrs = Math.floor(diff / 3600000);
            document.getElementById('uptime').innerText = hrs + 'h ' + mins + 'm ' + secs + 's';
        }, 1000);

        const chatHistory = document.getElementById('chatHistory');
        const messageInput = document.getElementById('messageInput');

        function appendMessage(sender, text, isUser) {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-start gap-3 ' + (isUser ? 'justify-end' : '') + ' animate-fadeIn';
            
            const card = document.createElement('div');
            card.className = (isUser ? 'bubble-user' : 'bubble-bot') + ' p-4 rounded-2xl max-w-[85%]';
            
            const avatar = document.createElement('div');
            avatar.className = 'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ' + 
                (isUser ? 'bg-emerald-500 text-black order-2' : 'bg-emerald-500/20 text-emerald-400');
            avatar.innerText = isUser ? 'US' : 'OH';
            
            const content = document.createElement('div');
            content.className = 'space-y-1 ' + (isUser ? 'text-right' : '');
            
            const title = document.createElement('p');
            title.className = 'text-xs font-mono font-bold ' + (isUser ? 'text-emerald-400' : 'text-emerald-400');
            title.innerText = sender;
            
            const textPara = document.createElement('p');
            textPara.className = 'text-sm text-slate-200 leading-relaxed';
            textPara.innerText = text;
            
            content.appendChild(title);
            content.appendChild(textPara);
            
            if (isUser) {
                card.appendChild(content);
                wrapper.appendChild(card);
                wrapper.appendChild(avatar);
            } else {
                wrapper.appendChild(avatar);
                card.appendChild(content);
                wrapper.appendChild(card);
            }
            
            chatHistory.appendChild(wrapper);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        function clearChat() {
            chatHistory.innerHTML = '';
            appendMessage('OpenHuman Core', 'Chat resetat. Cu ce te pot asista?', false);
        }

        async function handleSend(e) {
            e.preventDefault();
            const text = messageInput.value.trim();
            if (!text) return;
            
            messageInput.value = '';
            appendMessage('Tu (User)', text, true);
            
            // Add thinking indicator
            const thinking = document.createElement('div');
            thinking.className = 'flex items-center gap-2 p-3 text-xs text-emerald-400 font-mono animate-pulse';
            thinking.id = 'thinking';
            thinking.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> OpenHuman analizează sarcina...';
            chatHistory.appendChild(thinking);
            chatHistory.scrollTop = chatHistory.scrollHeight;

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                const data = await response.json();
                
                // Remove thinking
                const thinkEl = document.getElementById('thinking');
                if (thinkEl) thinkEl.remove();
                
                appendMessage('OpenHuman Core', data.text || 'Niciun răspuns returnat de agent.', false);
            } catch (err) {
                const thinkEl = document.getElementById('thinking');
                if (thinkEl) thinkEl.remove();
                appendMessage('OpenHuman Core', 'Eroare la comunicarea cu serverul: ' + err.message, false);
            }
        }
    </script>
</body>
</html>`;

const path = require('path');
const fs = require('fs');
const openhumanWebPath = '/home/debian/openhuman/app/dist-web';
const openhumanCoreTokenPath = process.env.OPENHUMAN_CORE_TOKEN_PATH || '/home/debian/.openhuman/core.token';
const hostApiUrl = (process.env.NICLAW_HOST_API_URL || 'http://127.0.0.1:13210').replace(/\/+$/, '');
const openhumanChatSessionKey = process.env.OPENHUMAN_CHAT_SESSION_KEY || 'agent:openhuman:main';
const openhumanChatTimeoutMs = Number(process.env.OPENHUMAN_CHAT_TIMEOUT_MS || 30000);
const openhumanChatMode = process.env.OPENHUMAN_CHAT_MODE || 'host-api';
const ollamaBaseUrl = (process.env.OPENHUMAN_OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const ollamaChatModel = process.env.OPENHUMAN_OLLAMA_MODEL || 'qwen2.5:3b';

function readTrimmedFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8').trim();
    } catch {
        return '';
    }
}

function getOpenHumanCoreToken() {
    return process.env.OPENHUMAN_CORE_TOKEN || readTrimmedFile(openhumanCoreTokenPath);
}

function getHostApiToken() {
    return process.env.NICLAW_HOST_API_TOKEN
        || process.env.SUPERHERMES_NICLAW_HOST_API_TOKEN
        || process.env.CLAWX_API_TOKEN
        || '';
}

async function readJsonResponse(response) {
    const raw = await response.text();
    try {
        return raw ? JSON.parse(raw) : null;
    } catch {
        throw new Error(`HTTP ${response.status}: ${raw.slice(0, 160)}`);
    }
}

async function postHostApiJson(pathname, token, body) {
    const response = await fetch(`${hostApiUrl}${pathname}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    const data = await readJsonResponse(response);
    if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
    }
    return data;
}

async function callOllamaDirect(text) {
    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: ollamaChatModel,
            messages: [
                {
                    role: 'system',
                    content: 'You are OpenHuman Core inside the NiClaw ecosystem. Answer in the user language, stay concise, and do not invent runtime or tool status.'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            stream: false,
            keep_alive: '0'
        })
    });
    const data = await readJsonResponse(response);
    if (!response.ok) {
        throw new Error(data?.error?.message || data?.error || `HTTP ${response.status}`);
    }
    const answer = data?.message?.content || data?.choices?.[0]?.message?.content;
    if (typeof answer === 'string' && answer.trim()) return answer.trim();
    throw new Error('Ollama did not return assistant text.');
}

function extractTextContent(content) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
        .map((part) => {
            if (typeof part === 'string') return part;
            if (part?.type === 'text' && typeof part?.text === 'string') return part.text;
            if (typeof part?.content === 'string') return part.content;
            return '';
        })
        .filter(Boolean)
        .join('\n')
        .trim();
}

function extractAssistantText(data) {
    const result = data?.result || data?.data || data;
    if (typeof result === 'string') return result;
    const directContent = extractTextContent(result?.content);
    if (directContent) return directContent;
    if (typeof result?.message === 'string') return result.message;
    if (Array.isArray(result?.messages)) {
        const assistant = [...result.messages].reverse().find((message) => message?.role === 'assistant');
        return extractTextContent(assistant?.content);
    }
    return '';
}

function extractAssistantError(message) {
    if (!message || message.role !== 'assistant') return '';
    if (typeof message.errorMessage === 'string' && message.errorMessage.trim()) {
        return message.errorMessage.trim();
    }
    if (message.stopReason === 'error') {
        return 'Assistant turn failed before producing content.';
    }
    return '';
}

function readAssistantOutcome(message) {
    const text = extractTextContent(message?.content);
    if (text) return { text };
    const error = extractAssistantError(message);
    return error ? { error } : {};
}

function findAssistantOutcomeForRun(messages, idempotencyKey, startedAtMs) {
    if (!Array.isArray(messages)) return {};

    const expectedUserKey = `${idempotencyKey}:user`;
    const userIndex = messages.findLastIndex((message) => message?.idempotencyKey === expectedUserKey);
    if (userIndex >= 0) {
        const assistant = messages.slice(userIndex + 1).find((message) => message?.role === 'assistant');
        const outcome = readAssistantOutcome(assistant);
        if (outcome.text || outcome.error) return outcome;
    }

    const fallbackAssistant = [...messages].reverse().find((message) => {
        const timestamp = Number(message?.timestamp || message?.__openclaw?.recordTimestampMs || 0);
        return message?.role === 'assistant' && timestamp >= startedAtMs;
    });
    return readAssistantOutcome(fallbackAssistant);
}

async function waitForOpenHumanAssistantText(token, idempotencyKey, startedAtMs) {
    const deadline = Date.now() + openhumanChatTimeoutMs;
    let lastError = null;

    while (Date.now() < deadline) {
        try {
            const history = await postHostApiJson('/api/gateway/rpc', token, {
                method: 'chat.history',
                params: {
                    sessionKey: openhumanChatSessionKey,
                    limit: 80
                },
                timeoutMs: 60000
            });
            const outcome = findAssistantOutcomeForRun(history?.result?.messages, idempotencyKey, startedAtMs);
            if (outcome.text) return outcome.text;
            if (outcome.error) {
                const terminalError = new Error(`OpenHuman assistant failed: ${outcome.error}`);
                terminalError.openhumanTerminal = true;
                throw terminalError;
            }
        } catch (err) {
            if (err?.openhumanTerminal) throw err;
            lastError = err;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (lastError) {
        throw new Error(`OpenHuman run started, but history polling failed: ${lastError.message}`);
    }
    throw new Error('OpenHuman run started, but no assistant response was written to history before timeout.');
}

async function abortOpenHumanHostRun(token) {
    try {
        await postHostApiJson('/api/gateway/rpc', token, {
            method: 'chat.abort',
            params: {
                sessionKey: openhumanChatSessionKey
            },
            timeoutMs: 30000
        });
    } catch (err) {
        console.warn('Failed to abort OpenHuman Host API run:', err.message);
    }
}

// Serve the compiled official OpenHuman SPA files
openhumanApp.use(express.static(openhumanWebPath));

openhumanApp.post('/rpc', async (req, res) => {
    try {
        const headers = { ...req.headers };
        delete headers['content-length'];
        delete headers['content-type'];
        delete headers['host'];
        delete headers['authorization'];
        delete headers['Authorization'];
        
        const coreToken = getOpenHumanCoreToken();
        const authorization = req.headers.authorization || (coreToken ? `Bearer ${coreToken}` : undefined);

        const response = await fetch('http://127.0.0.1:17788/rpc', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
                ...(authorization ? { Authorization: authorization } : {})
            },
            body: JSON.stringify(req.body)
        });
        const data = await readJsonResponse(response);
        res.status(response.status);
        res.json(data);
    } catch (err) {
        console.error('Error forwarding RPC:', err.message);
        res.status(500).json({
            jsonrpc: "2.0",
            error: {
                code: -32603,
                message: `Failed to connect to OpenHuman Rust Core daemon: ${err.message}`
            },
            id: req.body?.id || null
        });
    }
});

// Legacy chat endpoint
openhumanApp.post('/chat', async (req, res) => {
    const text = String(req.body?.text || req.body?.message || '').trim();
    if (!text) {
        res.status(400).json({ text: 'Mesajul este gol.' });
        return;
    }

    if (openhumanChatMode === 'ollama-direct') {
        try {
            res.json({ text: await callOllamaDirect(text) });
        } catch (err) {
            res.status(500).json({ text: `Eroare la conectare la Ollama local: ${err.message}` });
        }
        return;
    }

    const hostApiToken = getHostApiToken();
    if (!hostApiToken) {
        res.status(503).json({ text: 'NiClaw Host API token is not configured on the server.' });
        return;
    }

    let hostRunStarted = false;
    try {
        const idempotencyKey = Date.now().toString();
        const startedAtMs = Date.now();
        const data = await postHostApiJson('/api/chat/send-with-media', hostApiToken, {
            sessionKey: openhumanChatSessionKey,
            message: text,
            deliver: true,
            idempotencyKey
        });
        hostRunStarted = true;
        const immediateText = extractAssistantText(data);
        const assistantText = immediateText || await waitForOpenHumanAssistantText(hostApiToken, idempotencyKey, startedAtMs);
        res.json({ text: assistantText });
    } catch (err) {
        if (hostRunStarted) {
            await abortOpenHumanHostRun(hostApiToken);
        }
        try {
            res.json({ text: await callOllamaDirect(text) });
        } catch (fallbackErr) {
            res.status(500).json({
                text: `Eroare la conectare la NiClaw Host API: ${err.message}; fallback Ollama local a esuat: ${fallbackErr.message}`
            });
        }
    }
});

// Fallback for single-page React app (router paths like /chat, /settings, etc.)
openhumanApp.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexFile = path.join(__dirname, '../niclaw-openhuman/dist/index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send('OpenHuman UI not built.');
  }
});

openhumanApp.listen(7788, '0.0.0.0', () => {
    console.log('OpenHuman UI Console running on port 7788');
});
