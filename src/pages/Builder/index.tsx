import { useCallback, useState, useEffect } from 'react';
import {
  Plus,
  Play,
  Save,
  Workflow,
  Cpu,
  Database,
  Globe,
  MessageSquare,
  Trash2,
  Share2,
  Terminal,
  Mail,
  HelpCircle,
  X
} from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
  type Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAgentsStore } from '@/stores/agents';
import { hostApiFetch } from '@/lib/host-api';

// Custom Node Types
const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  action: ActionNode,
  knowledge: KnowledgeNode,
};

function TriggerNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-blue-500/20 shadow-xl border border-blue-500/30">
      <Card className="w-52 p-4 rounded-xl border-0 bg-card/95 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          {data.iconType === 'discord' ? (
            <MessageSquare className="h-3 w-3 text-blue-500" />
          ) : (
            <Globe className="h-3 w-3 text-blue-400" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Trigger</span>
        </div>
        <p className="text-sm font-semibold text-foreground">{(data.label as string) || 'Event Trigger'}</p>
        <p className="text-[10px] text-muted-foreground mt-1">Dispatches tasks to the agent cluster on new events.</p>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-background" />
      </Card>
    </div>
  );
}

function AgentNode({ id, data }: NodeProps) {
  const isOrchestrator = !!data.isOrchestrator;
  const onToggle = data.onToggleOrchestrator as ((id: string) => void) | undefined;

  return (
    <div className={cn(
      "p-1 rounded-2xl transition-all duration-300",
      isOrchestrator 
        ? "bg-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.5)] border-2 border-amber-500/80" 
        : "bg-purple-500/20 shadow-xl border border-purple-500/30"
    )}>
      <Card className="w-52 p-4 rounded-xl border-0 bg-card/95 backdrop-blur-md relative overflow-hidden">
        {isOrchestrator && (
          <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
        )}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Cpu className={cn("h-3 w-3", isOrchestrator ? "text-amber-500" : "text-purple-500")} />
            <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">
              {isOrchestrator ? "Orchestrator" : "AI OS Agent"}
            </span>
          </div>
          {isOrchestrator && (
            <Badge className="bg-amber-500 text-black border-amber-500 hover:bg-amber-500 text-[8px] font-extrabold px-1.5 py-0.5 uppercase tracking-widest leading-none">
              ⭐ Supreme
            </Badge>
          )}
        </div>
        <p className="text-sm font-semibold truncate text-foreground">{(data.label as string) || 'AI OS Agent'}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {isOrchestrator 
            ? "Orchestrates sub-agents using openclaw CLI routing delegation." 
            : "Specialized agent processing sub-tasks in the cluster."
          }
        </p>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "w-full mt-3 text-[10px] h-7 rounded-lg border flex items-center justify-center gap-1 transition-all duration-200",
            isOrchestrator 
              ? "text-amber-500 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20" 
              : "text-muted-foreground border-border hover:bg-purple-500/10 hover:text-purple-400"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggle) onToggle(id);
          }}
        >
          {isOrchestrator ? "⭐ Supreme Orchestrator" : "Set Orchestrator"}
        </Button>

        <Handle type="target" position={Position.Left} className={cn("w-3 h-3 border-2 border-background", isOrchestrator ? "bg-amber-500" : "bg-purple-500")} />
        <Handle type="source" position={Position.Right} className={cn("w-3 h-3 border-2 border-background", isOrchestrator ? "bg-amber-500" : "bg-purple-500")} />
      </Card>
    </div>
  );
}

function ActionNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-green-500/20 shadow-xl border border-green-500/30">
      <Card className="w-52 p-4 rounded-xl border-0 bg-card/95 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          {data.iconType === 'email' ? (
            <Mail className="h-3 w-3 text-green-500" />
          ) : (
            <Terminal className="h-3 w-3 text-green-400" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">System Action</span>
        </div>
        <p className="text-sm font-semibold text-foreground">{(data.label as string) || 'Execute Action'}</p>
        <p className="text-[10px] text-muted-foreground mt-1">Triggers system executions and external integrations.</p>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500 border-2 border-background" />
      </Card>
    </div>
  );
}

function KnowledgeNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-amber-500/20 shadow-xl border border-amber-500/30">
      <Card className="w-52 p-4 rounded-xl border-0 bg-card/95 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Brain Store</span>
        </div>
        <p className="text-sm font-semibold text-foreground">{(data.label as string) || 'Knowledge Base'}</p>
        <p className="text-[10px] text-muted-foreground mt-1">Supplies vector memory, semantic contexts, and knowledge bases.</p>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-amber-500 border-2 border-background" />
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500 border-2 border-background" />
      </Card>
    </div>
  );
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 50, y: 150 },
    data: { label: 'Discord Message', iconType: 'discord' }
  },
  {
    id: '2',
    type: 'agent',
    position: { x: 350, y: 150 },
    data: { label: 'Strategic Planner', isOrchestrator: true }
  },
  {
    id: '3',
    type: 'agent',
    position: { x: 650, y: 150 },
    data: { label: 'Researcher Agent', isOrchestrator: false }
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true }
];

const getInitialNodes = (): Node[] => {
  const saved = localStorage.getItem('clawx_builder_graph');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.nodes && parsed.nodes.length > 0) return parsed.nodes;
    } catch (e) {}
  }
  return initialNodes;
};

const getInitialEdges = (): Edge[] => {
  const saved = localStorage.getItem('clawx_builder_graph');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.edges) return parsed.edges;
    } catch (e) {}
  }
  return initialEdges;
};

export function Builder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(getInitialEdges());
  const { createAgent, fetchAgents } = useAgentsStore();
  const [loading, setLoading] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);

  // Toggle Orchestrator
  const toggleOrchestrator = useCallback((nodeId: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'agent') {
          return {
            ...node,
            data: {
              ...node.data,
              isOrchestrator: node.id === nodeId ? !node.data.isOrchestrator : false,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Inject callback on render to prevent serialization problems
  const nodesWithCallbacks = nodes.map((node) => {
    if (node.type === 'agent') {
      return {
        ...node,
        data: {
          ...node.data,
          onToggleOrchestrator: toggleOrchestrator,
        },
      };
    }
    return node;
  });

  // Auto-save nodes & edges to LocalStorage (without functions)
  useEffect(() => {
    const serializedNodes = nodes.map(n => {
      const { onToggleOrchestrator, ...dataWithoutCallbacks } = n.data || {};
      return {
        ...n,
        data: dataWithoutCallbacks
      };
    });
    localStorage.setItem('clawx_builder_graph', JSON.stringify({ nodes: serializedNodes, edges }));
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const addNode = (type: string, label: string, extraData: Record<string, any> = {}) => {
    const id = Date.now().toString();
    const newNode: Node = {
      id,
      type,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { label, ...extraData },
    };
    setNodes((nds) => nds.concat(newNode));
    toast.success(`Added ${label} to workspace`);
  };

  const handleSavePlan = async () => {
    try {
      setLoading(true);
      await fetchAgents();
      const currentAgents = useAgentsStore.getState().agents;
      
      const agentNodes = nodes.filter(n => n.type === 'agent');
      if (agentNodes.length === 0) {
        toast.warning('No Agent nodes found on the canvas!');
        return;
      }

      let createdCount = 0;
      for (const node of agentNodes) {
        const nodeLabel = node.data.label as string;
        const exists = currentAgents.some(a => a.name.toLowerCase() === nodeLabel.toLowerCase());
        if (!exists) {
          await createAgent(nodeLabel, {
            role: node.data.isOrchestrator ? 'Supreme Orchestration Hub' : 'Specialized Agent',
            tags: ['builder-orchestrated'],
            description: `Orchestrated via Visual Builder plan. Node ID: ${node.id}`
          });
          createdCount++;
        }
      }
      
      if (createdCount > 0) {
        toast.success(`Synchronized AI OS Plan: created ${createdCount} new agents in the cluster!`);
      } else {
        toast.success('AI OS Plan saved! All agents on canvas are already present in the cluster.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to sync AI OS Plan with the cluster.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    try {
      setLoading(true);
      
      // 1. Validation
      const orchestratorNode = nodes.find(n => n.type === 'agent' && n.data.isOrchestrator);
      if (!orchestratorNode) {
        toast.error('Vă rugăm să desemnați un Supreme Orchestrator înainte de a face deploy! (Faceți click pe butonul de sub agent)');
        setLoading(false);
        return;
      }

      const orchestratorName = orchestratorNode.data.label as string;
      
      // Get all edges connected to the orchestrator node
      const connectedEdges = edges.filter(
        e => e.source === orchestratorNode.id || e.target === orchestratorNode.id
      );
      
      // Find agent nodes connected to the orchestrator
      const connectedNodeIds = new Set(
        connectedEdges.flatMap(e => [e.source, e.target]).filter(id => id !== orchestratorNode.id)
      );
      const subAgents = nodes.filter(n => n.type === 'agent' && connectedNodeIds.has(n.id));

      // 2. Fetch/Sync Agents list
      await fetchAgents();
      const currentAgents = useAgentsStore.getState().agents;

      // Find or create Orchestrator
      let orchestratorId = '';
      const matchedOrchestrator = currentAgents.find(a => a.name.toLowerCase() === orchestratorName.toLowerCase());
      if (matchedOrchestrator) {
        orchestratorId = matchedOrchestrator.id;
      } else {
        await createAgent(orchestratorName, {
          role: 'Supreme Orchestration Hub',
          tags: ['builder-orchestrated'],
          description: 'Supreme Orchestrator compiled via Visual Builder'
        });
        // Refetch to get newly generated ID
        await fetchAgents();
        const updatedAgents = useAgentsStore.getState().agents;
        orchestratorId = updatedAgents.find(a => a.name.toLowerCase() === orchestratorName.toLowerCase())?.id || '';
      }

      // Check / Create subagents
      const compiledSubAgentsList: Array<{ id: string; name: string; slug: string }> = [];
      for (const node of subAgents) {
        const subName = node.data.label as string;
        let subId = '';
        const matchedSub = currentAgents.find(a => a.name.toLowerCase() === subName.toLowerCase());
        if (matchedSub) {
          subId = matchedSub.id;
        } else {
          await createAgent(subName, {
            role: 'Specialized Agent',
            tags: ['builder-orchestrated'],
            description: `Sub-agent coordinated by ${orchestratorName}`
          });
          await fetchAgents();
          const updatedAgents = useAgentsStore.getState().agents;
          subId = updatedAgents.find(a => a.name.toLowerCase() === subName.toLowerCase())?.id || '';
        }
        
        compiledSubAgentsList.push({
          id: subId,
          name: subName,
          slug: subId
        });
      }

      // 3. Compile Coordination Protocol (AGENTS.md)
      const dateString = new Date().toLocaleString('ro-RO');
      const agentsMarkdown = `# Protocolul de Coordonare al Clusterului AI (Swarm)
Generat automat de **ClawX Visual Builder** pe data de: \`${dateString}\`

## 1. Topologia Rețelei (Cluster Graph)
- **Supreme Orchestrator**: \`${orchestratorName}\` (Slug/ID: \`${orchestratorId}\`)
- **Sub-Agenți Subordonați Conectați**:
${compiledSubAgentsList.length > 0 
  ? compiledSubAgentsList.map(s => `  * **${s.name}** (Slug: \`${s.slug}\`)`).join('\n')
  : '  * *Fără sub-agenți direcți conectați.*'
}

---

## 2. Protocolul de Rutare și Delegare CLI (OpenClaw)
Tu ești **${orchestratorName}**, coordonatorul suprem al acestui swarm de agenți AI. Responsabilitatea ta principală este să analizezi solicitările utilizatorului, să delegi sarcini specializate către sub-agenții tăi, să compilezi rezultatele acestora și să livrezi un raport final de înaltă fidelitate.

### Regula de Execuție CLI:
Pentru a interoga, delega o sarcină sau citi cunoștințele oricărui sub-agent din cluster, rulează următoarea comandă în terminal folosind modulul tău de execuție sistem local:

\`\`\`bash
openclaw agent --agent <slug-agent> --message "<solicitarea_ta_detaliată>" --json
\`\`\`

#### Exemple concrete de rutare:
${compiledSubAgentsList.length > 0 
  ? compiledSubAgentsList.map(s => `* **Pentru a delega către ${s.name}**:
  \`openclaw agent --agent ${s.slug} --message "Analizează te rog următorul context..." --json\``).join('\n\n')
  : '* rulează \`openclaw agent --agent <id-subagent> --message "<mesaj>" --json\`'
}

---

## 3. Fluxul Operațional (Orchestration Pipeline)
1. **Preluarea sarcinii**: Primești comanda de la utilizatorul principal.
2. **Decompunere**: Fragmentezi problema în sub-sarcini clar orientate.
3. **Delegare în paralel / secvențial**: Interoghezi sub-agenții specifici prin CLI \`openclaw agent\`.
4. **Validare**: Verifici răspunsul JSON primit de la sub-agenți. Dacă rezultatul este incomplet sau greșit, îi reinstruiești printr-o nouă comandă CLI, ghidându-i.
5. **Sinteză**: Reunești toate rapoartele verificate într-o formă premium, lizibilă și structurată, apoi raportezi răspunsul final înapoi către utilizator.

---
*Acest document reprezintă memoria vie de execuție a Orchestratorului în cluster.*
`;

      // Extract all non-agent nodes from the canvas to list them in the protocol
      const triggerNodes = nodes.filter(n => n.type === 'trigger');
      const knowledgeNodes = nodes.filter(n => n.type === 'knowledge');
      const actionNodes = nodes.filter(n => n.type === 'action');

      let extraSectionsMarkdown = '';
      
      if (triggerNodes.length > 0) {
        extraSectionsMarkdown += `\n## 4. Activatori de Intrare (Triggers)\n`;
        triggerNodes.forEach(t => {
          const data = t.data as any;
          const type = data.triggerType || 'webhook';
          const param = type === 'webhook' ? (data.webhookUrl || 'Implicit') : (data.channelId || 'Implicit');
          extraSectionsMarkdown += `* **[${String(type).toUpperCase()}]** \`${data.label}\` (ID/URL: \`${param}\`)\n  * *Descriere*: ${data.description || 'Fără descriere.'}\n`;
        });
      }
      
      if (knowledgeNodes.length > 0) {
        extraSectionsMarkdown += `\n## 5. Surse de Memorie și Context (Knowledge Bases)\n`;
        knowledgeNodes.forEach(k => {
          const data = k.data as any;
          const type = data.knowledgeType || 'vector_db';
          const path = data.path || 'Implicit';
          extraSectionsMarkdown += `* **[${String(type).toUpperCase()}]** \`${data.label}\` (Locație/Index: \`${path}\`)\n  * *Descriere*: ${data.description || 'Fără descriere.'}\n`;
        });
      }
      
      if (actionNodes.length > 0) {
        extraSectionsMarkdown += `\n## 6. Acțiuni de Execuție în Sistem (Actions)\n`;
        actionNodes.forEach(a => {
          const data = a.data as any;
          const type = data.actionType || 'bash_command';
          const payload = data.payload || 'Implicit';
          extraSectionsMarkdown += `* **[${String(type).toUpperCase()}]** \`${data.label}\` (Comandă/Payload: \`${payload}\`)\n  * *Descriere*: ${data.description || 'Fără descriere.'}\n`;
        });
      }

      const compiledMarkdown = agentsMarkdown + '\n' + extraSectionsMarkdown;

      // 4. Deploy to Cluster: write AGENTS.md on VM
      toast.loading('Se compilează și se scrie protocolul Swarm (AGENTS.md) pe VM...', { id: 'deploy-toast' });
      
      const deployResult = await hostApiFetch<{ success: boolean; filePath?: string }>('/api/agents/write-workspace-file', {
        method: 'POST',
        body: JSON.stringify({
          agentId: orchestratorId,
          fileName: 'AGENTS.md',
          content: compiledMarkdown
        })
      });

      if (deployResult.success) {
        toast.success(`Deployment reușit! Protocolul a fost scris pe VM la path: ${deployResult.filePath}`, { id: 'deploy-toast' });
      } else {
        throw new Error('Eroare la scrierea protocolului pe VM.');
      }
    } catch (e) {
      console.error(e);
      toast.error(`Deploy eșuat: ${e instanceof Error ? e.message : String(e)}`, { id: 'deploy-toast' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col -m-6 bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      {/* Builder Toolbar */}
      <div className="h-16 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Workflow className="h-6 w-6 text-primary animate-pulse" />
          <h1 className="text-xl font-serif font-semibold tracking-tight text-foreground">AI OS Visual Builder</h1>
          <Badge variant="outline" className="text-[10px] uppercase font-mono bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0.5 animate-pulse">
            ⭐ Supreme Swarm Live
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => { setNodes([]); setEdges([]); }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Șterge Canvas
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2 transition-all hover:border-purple-500/30"
            disabled={loading}
            onClick={handleSavePlan}
          >
            <Save className="h-4 w-4" />
            {loading ? 'Se salvează...' : 'Salvează Planul'}
          </Button>
          <Button
            size="sm"
            className="rounded-full gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold shadow-lg shadow-amber-500/20 transition-all border border-amber-400/40"
            disabled={loading}
            onClick={handleDeploy}
          >
            <Play className="h-4 w-4 fill-current text-black" />
            Deploy to Cluster
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Components Palette */}
        <aside className="w-64 border-r border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.01] p-4 space-y-6 overflow-y-auto z-10">
          <div className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground ml-2">Triggers</p>
            <PaletteItem
              icon={<Globe className="h-4 w-4" />}
              label="Webhook Input"
              color="text-blue-500"
              onClick={() => addNode('trigger', 'Webhook Input', { iconType: 'webhook' })}
            />
            <PaletteItem
              icon={<MessageSquare className="h-4 w-4" />}
              label="Discord Msg Input"
              color="text-blue-600"
              onClick={() => addNode('trigger', 'Discord Message', { iconType: 'discord' })}
            />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground ml-2">Agents</p>
            <PaletteItem
              icon={<Cpu className="h-4 w-4" />}
              label="Strategic Planner"
              color="text-purple-500"
              onClick={() => addNode('agent', 'Strategic Planner', { isOrchestrator: false })}
            />
            <PaletteItem
              icon={<Cpu className="h-4 w-4" />}
              label="Researcher Agent"
              color="text-purple-500"
              onClick={() => addNode('agent', 'Researcher Agent', { isOrchestrator: false })}
            />
            <PaletteItem
              icon={<Cpu className="h-4 w-4" />}
              label="Execution Engine"
              color="text-purple-500"
              onClick={() => addNode('agent', 'Execution Engine', { isOrchestrator: false })}
            />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground ml-2">Knowledge</p>
            <PaletteItem
              icon={<Database className="h-4 w-4" />}
              label="Vector DB Store"
              color="text-amber-500"
              onClick={() => addNode('knowledge', 'Long-term Memory')}
            />
            <PaletteItem
              icon={<Database className="h-4 w-4" />}
              label="Obsidian Brain Sync"
              color="text-amber-500"
              onClick={() => addNode('knowledge', 'Knowledge Brain')}
            />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground ml-2">Actions</p>
            <PaletteItem
              icon={<Terminal className="h-4 w-4" />}
              label="Terminal Command"
              color="text-green-500"
              onClick={() => addNode('action', 'Bash Script', { iconType: 'terminal' })}
            />
            <PaletteItem
              icon={<Mail className="h-4 w-4" />}
              label="Email Notification"
              color="text-green-500"
              onClick={() => addNode('action', 'Notification', { iconType: 'email' })}
            />
          </div>
          
          <div className="p-3 bg-muted/30 border border-muted/50 rounded-xl space-y-1.5 mt-6">
            <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              Ghid Swarm
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              1. Trage elemente din stânga.<br />
              2. Legă Trigger -&gt; Agent Orchestrator -&gt; Sub-agenți -&gt; Actions/Knowledge.<br />
              3. Desemnează un <strong>Orchestrator</strong>.<br />
              4. Apasă <strong>Deploy</strong> pentru a compila protocolul direct pe VM.
            </p>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative bg-black/[0.01] dark:bg-black/40 overflow-hidden">
          <ReactFlow
            nodes={nodesWithCallbacks}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={(_, node) => setEditingNode(node)}
            nodeTypes={nodeTypes}
            fitView
            className="bg-dot-pattern bg-[length:30px_30px]"
          >
            <Background color="#888" gap={20} />
            <Controls className="bg-background border-black/10 dark:border-white/10 shadow-xl" />
            <Panel position="top-right" className="p-2.5 bg-background/80 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-xl text-[10px] font-mono text-muted-foreground shadow-sm flex items-center gap-2">
              <Share2 className="h-3 w-3 text-amber-500 animate-pulse" />
              AI OS Orchestration Layer V1.0 - Active Swarm Sync
            </Panel>
          </ReactFlow>

          {editingNode && (
            <NodeSettingsModal
              node={editingNode}
              onClose={() => setEditingNode(null)}
              onSave={(updatedData) => {
                setNodes((nds) =>
                  nds.map((n) => {
                    if (n.id === editingNode.id) {
                      return {
                        ...n,
                        data: {
                          ...n.data,
                          ...updatedData,
                        },
                      };
                    }
                    return n;
                  })
                );
                setEditingNode(null);
                toast.success('Setările nodului au fost salvate!');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function PaletteItem({ icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-background border border-black/5 dark:border-white/5 hover:border-primary/30 dark:hover:border-primary/30 hover:shadow-sm transition-all group text-left"
    >
      <div className={cn("p-2 rounded-lg bg-black/5 dark:bg-white/5", color)}>
        {icon}
      </div>
      <div className="flex-1">
        <span className="text-xs font-semibold block text-foreground truncate">{label}</span>
      </div>
      <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
    </button>
  );
}

interface NodeSettingsModalProps {
  node: Node;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
}

function NodeSettingsModal({ node, onClose, onSave }: NodeSettingsModalProps) {
  const { agents } = useAgentsStore();
  const [label, setLabel] = useState(node.data.label as string || '');
  const [description, setDescription] = useState(node.data.description as string || '');
  
  // Trigger Specific States
  const [triggerType, setTriggerType] = useState(node.data.triggerType as string || 'webhook');
  const [webhookUrl, setWebhookUrl] = useState(node.data.webhookUrl as string || '');
  const [channelId, setChannelId] = useState(node.data.channelId as string || '');
  
  // Agent Specific States
  const [role, setRole] = useState(node.data.role as string || '');
  const [isOrchestrator, setIsOrchestrator] = useState(!!node.data.isOrchestrator);

  // Find initially selected agent by name matching the label
  const initialMatchedAgent = agents.find((a) => a.name.toLowerCase() === label.toLowerCase());
  const [selectedAgentId, setSelectedAgentId] = useState(initialMatchedAgent ? initialMatchedAgent.id : 'custom');

  // Knowledge Specific States
  const [knowledgeType, setKnowledgeType] = useState(node.data.knowledgeType as string || 'vector_db');
  const [path, setPath] = useState(node.data.path as string || '');

  // Action Specific States
  const [actionType, setActionType] = useState(node.data.actionType as string || 'bash_command');
  const [payload, setPayload] = useState(node.data.payload as string || '');

  const handleSave = () => {
    const updatedData: Record<string, any> = {
      label,
      description,
    };

    if (node.type === 'trigger') {
      updatedData.triggerType = triggerType;
      updatedData.webhookUrl = webhookUrl;
      updatedData.channelId = channelId;
    } else if (node.type === 'agent') {
      updatedData.role = role;
      updatedData.isOrchestrator = isOrchestrator;
    } else if (node.type === 'knowledge') {
      updatedData.knowledgeType = knowledgeType;
      updatedData.path = path;
    } else if (node.type === 'action') {
      updatedData.actionType = actionType;
      updatedData.payload = payload;
    }

    onSave(updatedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-card/95 backdrop-blur-xl p-6 shadow-2xl space-y-5 flex flex-col max-h-[90vh] overflow-y-auto relative text-left">
        <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-cyan-500 via-primary to-purple-600 rounded-t-3xl" />
        
        <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
          <div>
            <h2 className="text-lg font-serif font-semibold text-foreground">Configurează Nodul</h2>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Tip: {node.type?.toUpperCase()}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 flex-1">
          {/* Label Input for Non-Agent nodes */}
          {node.type !== 'agent' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nume Nod (Label)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                placeholder="Ex: Webhook Tranzacții, Strategist..."
              />
            </div>
          )}

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Descriere</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors h-20 resize-none"
              placeholder="Descrie pe scurt rolul acestui nod în swarm..."
            />
          </div>

          {/* Trigger Node Form */}
          {node.type === 'trigger' && (
            <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tip Activator</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors dark:text-foreground dark:bg-card"
                >
                  <option value="webhook">Webhook Input URL</option>
                  <option value="discord">Discord Message Event</option>
                  <option value="telegram">Telegram Message Event</option>
                  <option value="schedule">Schedule (Cron/Timer)</option>
                </select>
              </div>

              {triggerType === 'webhook' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Webhook Target URL</label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                    placeholder="https://platform.dracarys.ro/webhook/trigger..."
                  />
                </div>
              )}

              {(triggerType === 'discord' || triggerType === 'telegram') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Channel ID / Chat ID</label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                    placeholder="Ex: 120938401928301"
                  />
                </div>
              )}
            </div>
          )}

          {/* Agent Node Form */}
          {node.type === 'agent' && (
            <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Selectează Agent din Rețea</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedAgentId(val);
                    if (val !== 'custom') {
                      const selected = agents.find(a => a.id === val);
                      if (selected) {
                        setLabel(selected.name);
                        setDescription(selected.description || '');
                        setRole(selected.role || '');
                      }
                    }
                  }}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors dark:text-foreground dark:bg-card"
                >
                  <option value="custom">-- Agent Personalizat (Custom) --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role || 'Fără rol'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAgentId === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nume Agent Personalizat</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                    placeholder="Ex: Strategic Planner, Researcher..."
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Rol / Prompt Model AI</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                  placeholder="Ex: Strategic Planner, Python Executor..."
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <input
                  type="checkbox"
                  id="isOrchestrator"
                  checked={isOrchestrator}
                  onChange={(e) => setIsOrchestrator(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-500/30 text-amber-500 bg-transparent focus:ring-0 focus:ring-offset-0"
                />
                <label htmlFor="isOrchestrator" className="text-xs font-bold text-amber-500 cursor-pointer select-none">
                  Setează ca Supreme Orchestrator (⭐ Hub Coordonator)
                </label>
              </div>
            </div>
          )}

          {/* Knowledge Node Form */}
          {node.type === 'knowledge' && (
            <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tip Bază Cunoștințe</label>
                <select
                  value={knowledgeType}
                  onChange={(e) => setKnowledgeType(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors dark:text-foreground dark:bg-card"
                >
                  <option value="vector_db">Vector Database (Chroma/Pinecone)</option>
                  <option value="obsidian_sync">Obsidian Knowledge Vault</option>
                  <option value="local_folder">Local Workspace Filesystem</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Cale / Denumire Index</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                  placeholder="Ex: C:\Server\AI\workspace-context sau index-main..."
                />
              </div>
            </div>
          )}

          {/* Action Node Form */}
          {node.type === 'action' && (
            <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tip Execuție</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors dark:text-foreground dark:bg-card"
                >
                  <option value="bash_command">Terminal Command (Bash Script)</option>
                  <option value="send_email">Send Email Notification</option>
                  <option value="webhook_push">Webhook Post Payload</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Payload / Instrecțiuni Execuție</label>
                <textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-primary/50 transition-colors h-24 resize-none"
                  placeholder={
                    actionType === 'bash_command' 
                      ? 'pnpm install && pnpm run dev...'
                      : actionType === 'send_email'
                        ? 'recipient@example.com | Subject: Alert Swarm'
                        : 'https://webhook.site/target-endpoint-url'
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-black/5 dark:border-white/5">
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
            Anulează
          </Button>
          <Button size="sm" onClick={handleSave} className="rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg">
            Salvează Modificări
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Builder;
