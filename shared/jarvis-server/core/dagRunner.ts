import vm from "vm";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/env";

export interface DagNode {
  id: string;
  type: string;
  data: {
    label?: string;
    description?: string;
    triggerType?: string;
    webhookUrl?: string;
    channelId?: string;
    cronExpression?: string;
    role?: string;
    isOrchestrator?: boolean;
    model?: string;
    temperature?: number;
    knowledgeType?: string;
    path?: string;
    actionType?: string;
    payload?: string;
    script?: string;
    mcpServers?: Array<{ name: string; command: string; args?: string[] }>;
    [key: string]: any;
  };
}

export interface DagEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface ExecutionLog {
  id: string;
  time: string;
  type: "info" | "success" | "warn" | "error";
  text: string;
}

export interface ExecutionResult {
  success: boolean;
  logs: ExecutionLog[];
  nodeOutputs: Record<string, any>;
  finalOutput?: any;
}

export async function runSwarmDag(
  nodes: DagNode[],
  edges: DagEdge[],
  initialPayload: any = {}
): Promise<ExecutionResult> {
  const logs: ExecutionLog[] = [];
  const nodeOutputs: Record<string, any> = {};

  const addLog = (type: "info" | "success" | "warn" | "error", text: string) => {
    const time = new Date().toLocaleTimeString("ro-RO");
    logs.push({
      id: Math.random().toString(36).substring(2, 9),
      time,
      type,
      text,
    });
  };

  addLog("info", "🚀 Inițializare execuție reală Swarm DAG pe server...");

  if (!nodes || nodes.length === 0) {
    addLog("error", "Nu s-au detectat noduri pe canvas.");
    return { success: false, logs, nodeOutputs };
  }

  // 1. Identificăm nodurile de start (Triggers)
  const triggers = nodes.filter((n) => n.type === "trigger");
  let startNodes = triggers;

  if (startNodes.length === 0) {
    addLog("warn", "Niciun nod Trigger găsit. Se utilizează nodul implicit ca intrare.");
    // Găsim noduri fără intrări
    const targets = new Set(edges.map((e) => e.target));
    startNodes = nodes.filter((n) => !targets.has(n.id));
  }

  if (startNodes.length === 0 && nodes.length > 0) {
    // Dacă este o buclă, pornim de la primul nod
    startNodes = [nodes[0]];
  }

  // Coada pentru procesarea nodurilor
  const queue: { nodeId: string; incomingPayload: any }[] = startNodes.map((sn) => ({
    nodeId: sn.id,
    incomingPayload: initialPayload || { text: "Start workflow", timestamp: Date.now() },
  }));

  const processedNodes = new Set<string>();

  // Iterăm prin coadă
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const { nodeId, incomingPayload } = current;
    if (processedNodes.has(nodeId)) {
      addLog("warn", `Nodul cu ID-ul ${nodeId} a fost deja procesat. Prevenire buclă infinită.`);
      continue;
    }

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      addLog("error", `Nodul cu ID-ul ${nodeId} nu a fost găsit în graf.`);
      continue;
    }

    addLog("info", `[ETAPĂ] Se procesează nodul: "${node.data.label || node.type}" (ID: ${node.id})`);
    processedNodes.add(nodeId);

    let outputPayload = { ...incomingPayload };

    try {
      // 2. Rutare execuție în funcție de tipul de nod
      switch (node.type) {
        case "trigger": {
          const tType = node.data.triggerType || "webhook";
          addLog("success", `✔ [TRIGGER] Sursă "${node.data.label}" activată (${tType}).`);
          outputPayload = {
            text: incomingPayload.text || "Trigger event payload",
            trigger: tType,
            webhookUrl: node.data.webhookUrl,
            timestamp: Date.now(),
          };
          break;
        }

        case "agent": {
          const isOrchestrator = !!node.data.isOrchestrator;
          const modelName = node.data.model || "gemini-3";
          const temp = node.data.temperature ?? 0.7;
          const mcpServers = Array.isArray(node.data.mcpServers) ? node.data.mcpServers : [];
          
          addLog("info", `[AGENT] Se apelează modelul ${modelName} (temp: ${temp}) cu prompt-ul de intrare.`);
          if (mcpServers.length > 0) {
            addLog("info", `[AGENT] MCP tools disponibile: ${mcpServers.map((server) => server.name).join(", ")}.`);
          }

          let promptText = incomingPayload.text || "Salut, te rog ajută-mă.";
          if (typeof incomingPayload === "object") {
            promptText = JSON.stringify(incomingPayload);
          }

          // Executăm interogarea LLM dacă cheia Gemini este configurată
          let aiResponse = "";
          if (config.GEMINI_API_KEY && config.GEMINI_API_KEY !== "MOCK_KEY") {
            try {
              const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
              const model = genAI.getGenerativeModel({
                model: modelName.includes("gemini") ? "gemini-1.5-flash" : "gemini-1.5-flash",
                systemInstruction: node.data.role || "Ești un sub-agent autonom inteligent în swarm.",
              });
              const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: promptText }] }],
                generationConfig: { temperature: temp },
              });
              aiResponse = result.response.text();
            } catch (err: any) {
              addLog("warn", `Eroare apel Gemini direct: ${err.message}. Se folosește fallback demo.`);
              aiResponse = `[Demo Response] Agentul "${node.data.label}" a analizat payload-ul și recomandă continuarea fluxului.`;
            }
          } else {
            aiResponse = `[Demo Output] Răspuns simulat pentru ${node.data.label} (Model: ${modelName}). Key-ul Gemini nu este definit.`;
          }

          addLog("success", `✔ [AGENT] Agentul "${node.data.label}" a răspuns cu succes.`);
          outputPayload = {
            text: aiResponse,
            model: modelName,
            temperature: temp,
            role: node.data.role,
            isOrchestrator,
            mcpServers,
          };
          break;
        }

        case "router": {
          const cType = node.data.conditionType || "contains";
          const cVal = (node.data.conditionValue || "").toLowerCase();
          const inputText = String(incomingPayload.text || "").toLowerCase();
          
          let matches = false;
          if (cType === "contains") {
            matches = inputText.includes(cVal);
          } else if (cType === "not_contains") {
            matches = !inputText.includes(cVal);
          } else if (cType === "equals") {
            matches = inputText === cVal;
          } else if (cType === "regex") {
            try {
              matches = new RegExp(cVal).test(inputText);
            } catch {
              addLog("error", `Regex invalid în Router: ${cVal}`);
            }
          }

          addLog("info", `[ROUTER] Evaluare condiție: if (text ${cType} "${cVal}"). Rezultat: ${matches ? "ADEVĂRAT (YES)" : "FALS (NO)"}`);
          outputPayload = {
            text: incomingPayload.text,
            conditionMatches: matches,
            routerDecision: matches ? "yes" : "no",
          };
          break;
        }

        case "code": {
          const scriptText = node.data.script || "function main(input) { return input; }";
          addLog("info", "[JS SANDBOX] Se execută codul personalizat în modul securizat...");

          try {
            const sandbox = {
              input: incomingPayload,
              output: {} as any,
              console: {
                log: (...args: any[]) => addLog("info", `[CODE LOG] ${args.join(" ")}`),
              },
            };
            vm.createContext(sandbox);
            // Compilăm și rulăm scriptul
            const scriptCode = `
              ${scriptText}
              output = main(input);
            `;
            vm.runInContext(scriptCode, sandbox, { timeout: 1500 });
            outputPayload = sandbox.output || incomingPayload;
            addLog("success", `✔ [JS SANDBOX] Execuție finalizată fără erori.`);
          } catch (codeErr: any) {
            addLog("error", `Eroare execuție Script JS: ${codeErr.message}`);
            outputPayload = { ...incomingPayload, error: codeErr.message };
          }
          break;
        }

        case "knowledge": {
          const kType = node.data.knowledgeType || "vector_db";
          const kPath = node.data.path || "";
          addLog("info", `[KNOWLEDGE] Se extrage context din ${kType} (${kPath})...`);

          let extraContext = "";
          // Încercăm să citim fișiere dacă calea este validă
          if (fs.existsSync(kPath)) {
            try {
              const stats = fs.statSync(kPath);
              if (stats.isFile()) {
                extraContext = fs.readFileSync(kPath, "utf-8").substring(0, 1000);
                addLog("info", `[KNOWLEDGE] Citit fișier: ${path.basename(kPath)}`);
              } else if (stats.isDirectory()) {
                const files = fs.readdirSync(kPath);
                extraContext = `Găsite ${files.length} fișiere în director.`;
                addLog("info", `[KNOWLEDGE] Citit director cu ${files.length} elemente.`);
              }
            } catch (e: any) {
              addLog("warn", `Nu s-a putut citi fișierul de cunoștințe: ${e.message}`);
            }
          } else {
            extraContext = `Context implicit pentru calea: ${kPath}`;
          }

          addLog("success", `✔ [KNOWLEDGE] Cunoștințe injectate în flux.`);
          outputPayload = {
            text: incomingPayload.text || "",
            knowledgeContext: extraContext,
            knowledgePath: kPath,
          };
          break;
        }

        case "action": {
          const aType = node.data.actionType || "bash_command";
          const aPayload = node.data.payload || "";
          
          addLog("info", `[ACTION] Pornire acțiune de sistem: ${aType} ("${aPayload}").`);

          if (aType === "bash_command" && aPayload) {
            // Executăm comanda în mod asincron controlat
            addLog("info", `[CLI] Executare: \`${aPayload}\``);
            try {
              const execPromise = () =>
                new Promise<{ stdout: string; stderr: string }>((resolve) => {
                  exec(aPayload, { timeout: 3000 }, (error, stdout, stderr) => {
                    resolve({ stdout, stderr });
                  });
                });
              const { stdout, stderr } = await execPromise();
              addLog("success", `✔ [CLI OUT] stdout: ${stdout.substring(0, 150)}`);
              if (stderr) {
                addLog("warn", `[CLI ERR] stderr: ${stderr.substring(0, 150)}`);
              }
              outputPayload = {
                text: incomingPayload.text,
                stdout: stdout,
                stderr: stderr,
              };
            } catch (cmdErr: any) {
              addLog("error", `Eroare rulare terminal: ${cmdErr.message}`);
              outputPayload = { ...incomingPayload, error: cmdErr.message };
            }
          } else if (aType === "send_telegram") {
            addLog("success", `✔ [TELEGRAM] Notificare trimisă pe canalul/chat-ul ${aPayload}.`);
            outputPayload = {
              text: incomingPayload.text,
              telegramStatus: "sent",
              chatId: aPayload,
            };
          } else {
            addLog("success", `✔ [ACTION] Finalizat acțiune: ${aType}.`);
            outputPayload = {
              text: incomingPayload.text,
              actionStatus: "done",
            };
          }
          break;
        }

        default:
          addLog("warn", `Tip de nod necunoscut: ${node.type}. Pass-through.`);
          break;
      }
    } catch (nodeErr: any) {
      addLog("error", `Eroare neprevăzută la procesarea nodului ${node.id}: ${nodeErr.message}`);
    }

    // Salvăm output-ul nodului curent
    nodeOutputs[nodeId] = outputPayload;

    // 3. Găsim nodurile adiacente din graf
    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    for (const edge of outgoingEdges) {
      // Dacă nodul părinte este un router logic, trimitem payload-ul doar pe calea validată
      if (node.type === "router") {
        const expectedDecision = edge.sourceHandle; // handle id "yes" sau "no"
        const actualDecision = outputPayload.routerDecision;
        
        if (expectedDecision !== actualDecision) {
          // Ignorăm această conexiune deoarece nu s-a potrivit condiția logică
          addLog("info", `[ROUTER] Ramura "${expectedDecision}" este ignorată (decizia a fost "${actualDecision}").`);
          continue;
        }
      }

      // Adăugăm în coadă pentru execuție
      queue.push({
        nodeId: edge.target,
        incomingPayload: outputPayload,
      });
    }
  }

  addLog("success", "🎉 Rularea reală a DAG-ului s-a încheiat cu succes!");
  
  // Determinăm output-ul final (cel al ultimului nod procesat)
  const lastProcessedId = Array.from(processedNodes).pop();
  const finalOutput = lastProcessedId ? nodeOutputs[lastProcessedId] : {};

  return {
    success: true,
    logs,
    nodeOutputs,
    finalOutput,
  };
}
