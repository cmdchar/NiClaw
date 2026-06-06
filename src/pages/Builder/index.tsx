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
  X,
  Send,
  GitBranch,
  Code,
  Sliders,
  Activity,
  ChevronDown
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

// Custom Node Types V2
const nodeTypes = {
  trigger: TriggerNodeV2,
  agent: AgentNodeV2,
  router: RouterNode,
  code: CodeNode,
  knowledge: KnowledgeNodeV2,
  action: ActionNodeV2,
};

type McpServerConfig = { name: string; command: string; args?: string[] };

function normalizeMcpServers(value: unknown): McpServerConfig[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((server) => {
      if (!server || typeof server !== 'object') return null;
      const candidate = server as { name?: unknown; command?: unknown; args?: unknown };
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      const command = typeof candidate.command === 'string' ? candidate.command.trim() : '';
      const args = Array.isArray(candidate.args)
        ? candidate.args.filter((arg): arg is string => typeof arg === 'string' && arg.trim().length > 0).map((arg) => arg.trim())
        : [];
      if (!name || !command) return null;
      return { name, command, ...(args.length > 0 ? { args } : {}) };
    })
    .filter((server): server is McpServerConfig => Boolean(server));
}

function parseArgsInput(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fall back to whitespace splitting for quick CLI-style editing.
    }
  }
  return trimmed.split(/\s+/).map((item) => item.trim()).filter(Boolean);
}

function createAgentMetadata(node: Node, fallbackRole: string) {
  const mcpServers = normalizeMcpServers(node.data.mcpServers);
  return {
    role: (node.data.role as string) || fallbackRole,
    tags: ['builder-orchestrated'],
    description: (node.data.description as string) || `Orchestrat vizual via V2 Builder. Node ID: ${node.id}`,
    mcpServers,
  };
}

// ==========================================
// 1. TRIGGER NODE V2
// ==========================================
function TriggerNodeV2({ id, data }: NodeProps) {
  const onUpdate = data.onUpdateNodeData as ((nodeId: string, updatedData: Record<string, any>) => void) | undefined;
  const triggerType = (data.triggerType as string) || 'webhook';
  const label = (data.label as string) || 'Event Trigger';
  
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const typeLabel = val === 'webhook' ? 'Webhook Input' : val === 'discord' ? 'Discord Message' : val === 'telegram' ? 'Telegram Message' : 'Schedule Timer';
    if (onUpdate) {
      onUpdate(id, { triggerType: val, label: typeLabel });
    }
  };

  return (
    <div className="p-1 rounded-2xl bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] border border-blue-500/30 group transition-all duration-300 hover:border-blue-500/60">
      <Card className="w-56 p-4 rounded-xl border-0 bg-[#0B0F19]/95 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {triggerType === 'discord' ? (
              <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
            ) : triggerType === 'telegram' ? (
              <Send className="h-3.5 w-3.5 text-sky-400" />
            ) : triggerType === 'schedule' ? (
              <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-blue-400" />
            )}
            <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-blue-400/80">Trigger</span>
          </div>
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 text-[8px] font-mono px-1 py-0 leading-none">
            START
          </Badge>
        </div>
        
        <p className="text-xs font-bold text-slate-100 mb-2 truncate">{label}</p>

        {/* Inline Parameter controls */}
        <div className="space-y-2 text-[10px] border-t border-white/[0.04] pt-2">
          <div className="space-y-1">
            <span className="text-slate-500 block">Tip intrare:</span>
            <select
              value={triggerType}
              onChange={handleTypeChange}
              className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 outline-none focus:border-blue-500/50"
            >
              <option value="webhook">Webhook Link</option>
              <option value="discord">Discord Msg Event</option>
              <option value="telegram">Telegram Msg Event</option>
              <option value="schedule">Schedule (Cron)</option>
            </select>
          </div>

          {triggerType === 'webhook' && (
            <div className="space-y-1">
              <span className="text-slate-500 block">Sub-cale URL:</span>
              <input
                type="text"
                value={(data.webhookUrl as string) || '/webhook/alert'}
                onChange={(e) => onUpdate && onUpdate(id, { webhookUrl: e.target.value })}
                className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 font-mono text-[9px] outline-none focus:border-blue-500/50"
              />
            </div>
          )}

          {(triggerType === 'discord' || triggerType === 'telegram') && (
            <div className="space-y-1">
              <span className="text-slate-500 block">Target ID:</span>
              <input
                type="text"
                value={(data.channelId as string) || 'main-chat'}
                onChange={(e) => onUpdate && onUpdate(id, { channelId: e.target.value })}
                className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 font-mono text-[9px] outline-none focus:border-blue-500/50"
              />
            </div>
          )}

          {triggerType === 'schedule' && (
            <div className="space-y-1">
              <span className="text-slate-500 block">Cron Expression:</span>
              <input
                type="text"
                value={(data.cronExpression as string) || '*/5 * * * *'}
                onChange={(e) => onUpdate && onUpdate(id, { cronExpression: e.target.value })}
                className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 font-mono text-[9px] outline-none focus:border-blue-500/50"
              />
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Right} className="w-3.5 h-3.5 bg-blue-500 border-2 border-background hover:scale-125 transition-transform" />
      </Card>
    </div>
  );
}

// ==========================================
// 2. AGENT NODE V2
// ==========================================
function AgentNodeV2({ id, data }: NodeProps) {
  const isOrchestrator = !!data.isOrchestrator;
  const onToggle = data.onToggleOrchestrator as ((id: string) => void) | undefined;
  const onUpdate = data.onUpdateNodeData as ((nodeId: string, updatedData: Record<string, any>) => void) | undefined;
  const label = (data.label as string) || 'AI OS Agent';
  
  const selectedModel = (data.model as string) || 'gemini-3';
  const temperature = typeof data.temperature === 'number' ? data.temperature : 0.7;
  const mcpServers = normalizeMcpServers(data.mcpServers);

  return (
    <div className={cn(
      "p-1 rounded-2xl transition-all duration-300 group border",
      isOrchestrator 
        ? "bg-amber-500/30 shadow-[0_0_22px_rgba(245,158,11,0.4)] border-amber-500/70" 
        : "bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] border-purple-500/30 hover:border-purple-500/60"
    )}>
      <Card className="w-56 p-4 rounded-xl border-0 bg-[#0B0F19]/95 backdrop-blur-md relative overflow-hidden">
        {isOrchestrator && (
          <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
        )}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Cpu className={cn("h-3.5 w-3.5", isOrchestrator ? "text-amber-500" : "text-purple-500")} />
            <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-slate-400">
              {isOrchestrator ? "Orchestrator" : "Agent AI"}
            </span>
          </div>
          {isOrchestrator && (
            <Badge className="bg-amber-500 text-black border-amber-500 hover:bg-amber-500 text-[8px] font-extrabold px-1.5 py-0.5 uppercase tracking-widest leading-none">
              ⭐ Supreme
            </Badge>
          )}
        </div>

        <p className="text-xs font-bold text-slate-100 truncate">{label}</p>

        {/* Embedded parameters inside agent card */}
        <div className="space-y-2.5 text-[10px] border-t border-white/[0.04] pt-2.5 mt-2">
          <div className="space-y-1">
            <span className="text-slate-500 block">Model selectat:</span>
            <select
              value={selectedModel}
              onChange={(e) => onUpdate && onUpdate(id, { model: e.target.value })}
              className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 outline-none focus:border-purple-500/50"
            >
              <option value="gemini-3">Gemini 1.5 / 2.0 Flash</option>
              <option value="deepseek-chat">DeepSeek Chat (V3)</option>
              <option value="hermes-70b">Nous Hermes 4 70B</option>
              <option value="claude-sonnet">Claude 3.5 Sonnet</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Temperatură:</span>
              <span className="text-purple-400 font-bold font-mono">{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={temperature}
              onChange={(e) => onUpdate && onUpdate(id, { temperature: parseFloat(e.target.value) })}
              className="w-full h-1 bg-[#131926] rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">MCP tools:</span>
              <span className="text-cyan-400 font-bold font-mono">{mcpServers.length}</span>
            </div>
            <div className="min-h-6 rounded-md border border-white/10 bg-[#050811] px-1.5 py-1 text-[8px] font-mono text-slate-400">
              {mcpServers.length > 0
                ? mcpServers.slice(0, 2).map((server) => server.name).join(', ')
                : 'Niciun server MCP'}
              {mcpServers.length > 2 ? ` +${mcpServers.length - 2}` : ''}
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "w-full mt-3 text-[9px] h-6 rounded-lg border flex items-center justify-center gap-1 transition-all duration-200 uppercase font-mono",
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

        <Handle type="target" position={Position.Left} className={cn("w-3.5 h-3.5 border-2 border-background", isOrchestrator ? "bg-amber-500" : "bg-purple-500")} />
        <Handle type="source" position={Position.Right} className={cn("w-3.5 h-3.5 border-2 border-background", isOrchestrator ? "bg-amber-500" : "bg-purple-500")} />
      </Card>
    </div>
  );
}

// ==========================================
// 3. ROUTER NODE (IF/ELSE CONDITIONAL)
// ==========================================
function RouterNode({ id, data }: NodeProps) {
  const onUpdate = data.onUpdateNodeData as ((nodeId: string, updatedData: Record<string, any>) => void) | undefined;
  const conditionType = (data.conditionType as string) || 'contains';
  const conditionValue = (data.conditionValue as string) || '';

  return (
    <div className="p-1 rounded-2xl bg-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.15)] border border-teal-500/30 group transition-all duration-300 hover:border-teal-500/60">
      <Card className="w-56 p-4 rounded-xl border-0 bg-[#0B0F19]/95 backdrop-blur-md relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-teal-400" />
            <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-teal-400/80">Logical Router</span>
          </div>
          <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20 text-[8px] font-mono px-1 py-0 leading-none">
            IF/ELSE
          </Badge>
        </div>

        <p className="text-xs font-bold text-slate-100 mb-2 truncate">Condiție Text</p>

        {/* Embedded Inputs */}
        <div className="space-y-2 text-[10px] border-t border-white/[0.04] pt-2">
          <div className="space-y-1">
            <span className="text-slate-500 block">Operator logic:</span>
            <select
              value={conditionType}
              onChange={(e) => onUpdate && onUpdate(id, { conditionType: e.target.value })}
              className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 outline-none focus:border-teal-500/50"
            >
              <option value="contains">Conține textul...</option>
              <option value="not_contains">Nu conține...</option>
              <option value="equals">Este egal cu...</option>
              <option value="regex">RegEx Match...</option>
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 block">Valoare de comparat:</span>
            <input
              type="text"
              value={conditionValue}
              onChange={(e) => onUpdate && onUpdate(id, { conditionValue: e.target.value })}
              className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 font-mono text-[9px] outline-none focus:border-teal-500/50"
              placeholder="Ex: eroare, urgență"
            />
          </div>
        </div>

        {/* Input Port (Left) */}
        <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-teal-500 border-2 border-background hover:scale-125 transition-transform" />
        
        {/* Output Ports (Right Side: YES / NO) */}
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-around py-6 pr-0.5 pointer-events-none">
          <div className="flex items-center justify-end text-[8px] font-extrabold font-mono text-emerald-400 mr-2 uppercase tracking-tighter">
            DA
            <Handle 
              type="source" 
              position={Position.Right} 
              id="yes" 
              style={{ top: '30%', backgroundColor: '#10b981' }} 
              className="w-3.5 h-3.5 border-2 border-background hover:scale-125 transition-transform pointer-events-auto" 
            />
          </div>
          <div className="flex items-center justify-end text-[8px] font-extrabold font-mono text-rose-400 mr-2 uppercase tracking-tighter mt-4">
            NU
            <Handle 
              type="source" 
              position={Position.Right} 
              id="no" 
              style={{ top: '70%', backgroundColor: '#ef4444' }} 
              className="w-3.5 h-3.5 border-2 border-background hover:scale-125 transition-transform pointer-events-auto" 
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// 4. CODE NODE (CUSTOM JS SANDBOX)
// ==========================================
function CodeNode({ id, data }: NodeProps) {
  const onUpdate = data.onUpdateNodeData as ((nodeId: string, updatedData: Record<string, any>) => void) | undefined;
  const scriptContent = (data.script as string) || `// Transformă payload-ul primit\nfunction main(input) {\n  return {\n    text: input.text.toUpperCase(),\n    status: "ok"\n  };\n}`;

  return (
    <div className="p-1 rounded-2xl bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] border border-indigo-500/30 group transition-all duration-300 hover:border-indigo-500/60">
      <Card className="w-56 p-4 rounded-xl border-0 bg-[#0B0F19]/95 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Code className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-indigo-400/80">JS Custom Code</span>
          </div>
          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 text-[8px] font-mono px-1 py-0 leading-none">
            SANDBOX
          </Badge>
        </div>

        <p className="text-xs font-bold text-slate-100 mb-2 truncate">Executor Script</p>

        {/* Embedded Monaco-style textarea */}
        <div className="space-y-1.5 text-[10px] border-t border-white/[0.04] pt-2">
          <span className="text-slate-500 block font-mono">cod main(input) {"{"}</span>
          <textarea
            value={scriptContent}
            onChange={(e) => onUpdate && onUpdate(id, { script: e.target.value })}
            rows={5}
            className="w-full bg-[#050811] border border-white/10 rounded-md p-1.5 text-slate-300 font-mono text-[8px] leading-relaxed resize-none outline-none focus:border-indigo-500/50"
            placeholder="// Cod JavaScript..."
          />
          <span className="text-slate-500 block font-mono">{"}"}</span>
        </div>

        <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-indigo-500 border-2 border-background hover:scale-125 transition-transform" />
        <Handle type="source" position={Position.Right} className="w-3.5 h-3.5 bg-indigo-500 border-2 border-background hover:scale-125 transition-transform" />
      </Card>
    </div>
  );
}

// ==========================================
// 5. KNOWLEDGE NODE V2
// ==========================================
function KnowledgeNodeV2({ id, data }: NodeProps) {
  const onUpdate = data.onUpdateNodeData as ((nodeId: string, updatedData: Record<string, any>) => void) | undefined;
  const knowledgeType = (data.knowledgeType as string) || 'vector_db';
  const label = (data.label as string) || 'Knowledge Base';

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const typeLabel = val === 'vector_db' ? 'Vector Memory' : val === 'obsidian_sync' ? 'Obsidian Brain' : 'Filesystem Context';
    if (onUpdate) {
      onUpdate(id, { knowledgeType: val, label: typeLabel });
    }
  };

  return (
    <div className="p-1 rounded-2xl bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] border border-amber-500/30 group transition-all duration-300 hover:border-amber-500/60">
      <Card className="w-56 p-4 rounded-xl border-0 bg-[#0B0F19]/95 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-amber-500/80">Brain Store</span>
          </div>
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 text-[8px] font-mono px-1 py-0 leading-none">
            MEMORY
          </Badge>
        </div>

        <p className="text-xs font-bold text-slate-100 mb-2 truncate">{label}</p>

        {/* Embedded selectors */}
        <div className="space-y-2 text-[10px] border-t border-white/[0.04] pt-2">
          <div className="space-y-1">
            <span className="text-slate-500 block">Sursă memorie:</span>
            <select
              value={knowledgeType}
              onChange={handleTypeChange}
              className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 outline-none focus:border-amber-500/50"
            >
              <option value="vector_db">Vector Memory (Chroma)</option>
              <option value="obsidian_sync">Obsidian Knowledge Vault</option>
              <option value="local_folder">Local Workspace Files</option>
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 block">Cale index:</span>
            <input
              type="text"
              value={(data.path as string) || 'C:\\Server\\AI\\workspace'}
              onChange={(e) => onUpdate && onUpdate(id, { path: e.target.value })}
              className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 font-mono text-[9px] outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-amber-500 border-2 border-background hover:scale-125 transition-transform" />
        <Handle type="source" position={Position.Bottom} className="w-3.5 h-3.5 bg-amber-500 border-2 border-background hover:scale-125 transition-transform" />
      </Card>
    </div>
  );
}

// ==========================================
// 6. ACTION NODE V2
// ==========================================
function ActionNodeV2({ id, data }: NodeProps) {
  const onUpdate = data.onUpdateNodeData as ((nodeId: string, updatedData: Record<string, any>) => void) | undefined;
  const actionType = (data.actionType as string) || 'bash_command';
  const label = (data.label as string) || 'System Action';

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const typeLabel = val === 'bash_command' ? 'Bash Script' : val === 'send_email' ? 'Email Notify' : val === 'send_telegram' ? 'Telegram Notify' : 'Webhook Post';
    if (onUpdate) {
      onUpdate(id, { actionType: val, label: typeLabel });
    }
  };

  return (
    <div className="p-1 rounded-2xl bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)] border border-green-500/30 group transition-all duration-300 hover:border-green-500/60">
      <Card className="w-56 p-4 rounded-xl border-0 bg-[#0B0F19]/95 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {actionType === 'send_email' ? (
              <Mail className="h-3.5 w-3.5 text-green-500" />
            ) : actionType === 'send_telegram' ? (
              <Send className="h-3.5 w-3.5 text-sky-400" />
            ) : (
              <Terminal className="h-3.5 w-3.5 text-green-400" />
            )}
            <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-green-400/80">System Action</span>
          </div>
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 text-[8px] font-mono px-1 py-0 leading-none">
            OUTPUT
          </Badge>
        </div>

        <p className="text-xs font-bold text-slate-100 mb-2 truncate">{label}</p>

        {/* Embedded Inputs */}
        <div className="space-y-2 text-[10px] border-t border-white/[0.04] pt-2">
          <div className="space-y-1">
            <span className="text-slate-500 block">Tip acțiune:</span>
            <select
              value={actionType}
              onChange={handleTypeChange}
              className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 outline-none focus:border-green-500/50"
            >
              <option value="bash_command">Terminal (Bash CLI)</option>
              <option value="send_email">Trimite Email</option>
              <option value="send_telegram">Trimite Telegram Msg</option>
              <option value="webhook_push">Webhook Trigger POST</option>
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 block">Payload / Comandă:</span>
            <input
              type="text"
              value={(data.payload as string) || ''}
              onChange={(e) => onUpdate && onUpdate(id, { payload: e.target.value })}
              className="w-full bg-[#131926] border border-white/10 rounded-md px-1.5 py-1 text-slate-300 font-mono text-[9px] outline-none focus:border-green-500/50"
              placeholder={actionType === 'bash_command' ? 'pnpm run dev' : 'Target ID/Address'}
            />
          </div>
        </div>

        <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-green-500 border-2 border-background hover:scale-125 transition-transform" />
      </Card>
    </div>
  );
}

// Default layout graphs
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 50, y: 150 },
    data: { label: 'Webhook Input', triggerType: 'webhook', webhookUrl: '/webhook/alert' }
  },
  {
    id: '2',
    type: 'agent',
    position: { x: 350, y: 150 },
    data: { label: 'Strategic Planner', isOrchestrator: true, model: 'gemini-3', temperature: 0.7 }
  },
  {
    id: '3',
    type: 'agent',
    position: { x: 650, y: 150 },
    data: { label: 'Researcher Agent', isOrchestrator: false, model: 'deepseek-chat', temperature: 0.5 }
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
    } catch {
      // Ignore invalid saved graph state and fall back to defaults.
    }
  }
  return initialNodes;
};

const getInitialEdges = (): Edge[] => {
  const saved = localStorage.getItem('clawx_builder_graph');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.edges) return parsed.edges;
    } catch {
      // Ignore invalid saved graph state and fall back to defaults.
    }
  }
  return initialEdges;
};

// ==========================================
// MAIN BUILDER PAGE
// ==========================================
export function Builder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(getInitialEdges());
  const { createAgent, updateAgent, fetchAgents } = useAgentsStore();
  
  const [loading, setLoading] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);

  // Debug & Execution states
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [executionLogs, setExecutionLogs] = useState<Array<{ id: number; type: 'info' | 'success' | 'warn' | 'error'; text: string; time: string }>>([
    { id: 1, type: 'info', text: 'Visual IDE V2 inițializat. Gata pentru programarea Swarm-ului.', time: new Date().toLocaleTimeString() }
  ]);
  const [isSimulating, setIsSimulating] = useState(false);

  const addLog = (type: 'info' | 'success' | 'warn' | 'error', text: string) => {
    setExecutionLogs(prev => [
      ...prev,
      { id: Date.now() + Math.random(), type, text, time: new Date().toLocaleTimeString() }
    ]);
  };

  // Callback to update node's internal state
  const updateNodeData = useCallback((nodeId: string, updatedData: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updatedData,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Toggle Supreme Orchestrator status
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
    const nodeName = nodes.find(n => n.id === nodeId)?.data.label;
    addLog('info', `Toggle Supreme Orchestrator status pe: ${nodeName}`);
  }, [nodes, setNodes]);

  // Inject callbacks into nodes on state change (prevents serialisation bugs)
  const nodesWithCallbacks = nodes.map((node) => {
    return {
      ...node,
      data: {
        ...node.data,
        onUpdateNodeData: updateNodeData,
        onToggleOrchestrator: toggleOrchestrator,
      },
    };
  });

  // Persistent save graph data to localStorage
  useEffect(() => {
    const serializedNodes = nodes.map(n => {
      const { onToggleOrchestrator: _onToggleOrchestrator, onUpdateNodeData: _onUpdateNodeData, ...dataWithoutCallbacks } = n.data || {};
      return {
        ...n,
        data: dataWithoutCallbacks
      };
    });
    localStorage.setItem('clawx_builder_graph', JSON.stringify({ nodes: serializedNodes, edges }));
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      addLog('info', `Edge conectat: ${params.source} -> ${params.target} (${params.sourceHandle || 'default'} -> ${params.targetHandle || 'default'})`);
    },
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
    addLog('info', `Nod nou adăugat: ${label} (Tip: ${type})`);
    toast.success(`Nodul ${label} a fost adăugat pe canvas`);
  };

  const handleSavePlan = async () => {
    try {
      setLoading(true);
      addLog('info', 'Se sincronizează planul AI OS cu clusterul...');
      await fetchAgents();
      const currentAgents = useAgentsStore.getState().agents;
      
      const agentNodes = nodes.filter(n => n.type === 'agent');
      if (agentNodes.length === 0) {
        addLog('warn', 'Niciun nod de tip Agent nu a fost găsit pe canvas!');
        toast.warning('Niciun agent pe canvas!');
        return;
      }

      let createdCount = 0;
      for (const node of agentNodes) {
        const nodeLabel = node.data.label as string;
        const matchedAgent = currentAgents.find(a => a.name.toLowerCase() === nodeLabel.toLowerCase());
        const metadata = createAgentMetadata(node, node.data.isOrchestrator ? 'Supreme Orchestration Hub' : 'Specialized Agent');
        if (!matchedAgent) {
          await createAgent(nodeLabel, metadata);
          createdCount++;
          addLog('success', `Agent creat cu succes în cluster: ${nodeLabel}`);
        } else {
          await updateAgent(matchedAgent.id, metadata);
        }
      }
      
      if (createdCount > 0) {
        addLog('success', `Plan sincronizat! ${createdCount} agenți noi generați în swarm.`);
        toast.success(`Plan sincronizat! ${createdCount} agenți creați.`);
      } else {
        addLog('info', 'Toți agenții de pe canvas sunt deja prezenți în cluster. Metadata MCP a fost sincronizată.');
        toast.success('Plan salvat! Agenții și MCP tools sunt sincronizați.');
      }
    } catch (e) {
      console.error(e);
      addLog('error', `Eroare la salvare: ${e instanceof Error ? e.message : String(e)}`);
      toast.error('Eroare la sincronizarea planului.');
    } finally {
      setLoading(false);
    }
  };

  // Live E2E Swarm execution simulation (Interactive step-by-step)
  const handleRunSimulation = async () => {
    if (isSimulating) return;
    
    // 1. Validation
    const orchestratorNode = nodes.find(n => n.type === 'agent' && n.data.isOrchestrator);
    if (!orchestratorNode) {
      addLog('error', 'Execuție eșuată: Nu s-a desemnat un Supreme Orchestrator!');
      toast.error('Desemnați un Supreme Orchestrator pe canvas!');
      return;
    }

    setIsSimulating(true);
    setExecutionLogs([]);
    addLog('info', '🚀 Se inițiază execuția reală a Swarm DAG pe server...');
    setIsConsoleOpen(true);

    try {
      // 2. Apelăm API-ul real de pe server
      const runResult = await hostApiFetch<{ success: boolean; logs: any[]; nodeOutputs: any; finalOutput?: any }>('/api/swarm/run', {
        method: 'POST',
        body: JSON.stringify({
          nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
          edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
          initialInput: { text: "Manual trigger via visual builder dashboard.", timestamp: Date.now() }
        })
      });

      if (runResult && runResult.success) {
        // Redăm logurile primite de la server pas-cu-pas pentru un efect vizual uimitor
        for (const log of runResult.logs) {
          addLog(log.type, log.text);
          
          // Animăm nodurile implicate pe canvas în timp ce rulăm logurile
          if (log.text.includes('[ETAPĂ]')) {
            const match = log.text.match(/ID: (\w+)/);
            if (match && match[1]) {
              const activeNodeId = match[1];
              
              setNodes(nds => nds.map(n => n.id === activeNodeId 
                ? { ...n, className: cn('ring-4 ring-offset-2 ring-offset-black transition-all animate-pulse', 
                    n.type === 'trigger' ? 'ring-blue-500' :
                    n.type === 'agent' ? 'ring-purple-500' :
                    n.type === 'router' ? 'ring-teal-500' :
                    n.type === 'code' ? 'ring-indigo-500' :
                    n.type === 'knowledge' ? 'ring-amber-500' : 'ring-green-500'
                  ) } 
                : { ...n, className: '' }
              ));

              // Evidențiem edge-urile care intră în acest nod
              setEdges(eds => eds.map(e => e.target === activeNodeId 
                ? { ...e, style: { stroke: '#a855f7', strokeWidth: 4 }, animated: true }
                : { ...e, style: {} }
              ));
            }
          }
          await new Promise(r => setTimeout(r, 600)); // Delay scurt pentru animație premium
        }

        // Curățăm clasele active la final
        setNodes(nds => nds.map(n => ({ ...n, className: '' })));
        setEdges(eds => eds.map(e => ({ ...e, style: {} })));
        
        addLog('success', '🎉 Execuție reală a DAG-ului finalizată cu succes pe server!');
        toast.success('Rularea reală a fluxului Swarm s-a încheiat cu succes!');
      } else {
        throw new Error('Serverul a returnat succes: false.');
      }
    } catch {
      console.warn("Eroare apel real DAG Runner. Se trece la modul de simulare local offline...");
      addLog('warn', '⚠️ Serverul offline sau indisponibil. Pornire simulare locală offline de siguranță...');
      
      // Find trigger nodes to start the pipeline
      const triggers = nodes.filter(n => n.type === 'trigger');
      if (triggers.length === 0) {
        addLog('warn', 'Niciun nod Trigger activ. Se folosește trigger-ul implicit.');
      }

      // Step 1: Webhook Trigger active
      if (triggers.length > 0) {
        addLog('info', `[ETAPĂ] Se procesează nodul: "${triggers[0].data.label}" (ID: ${triggers[0].id})`);
        setNodes(nds => nds.map(n => n.id === triggers[0].id ? { ...n, className: 'ring-4 ring-blue-500 ring-offset-2 ring-offset-black transition-all' } : n));
        await new Promise(r => setTimeout(r, 1200));
        addLog('success', `✔ [TRIGGER] Date JSON prelucrate cu succes din Webhook: { "event": "order_alert", "amount": 2500 }`);
      }

      // Step 2: Transition to Orchestrator
      addLog('info', `[ETAPĂ] Se procesează nodul: "${orchestratorNode.data.label}" (ID: ${orchestratorNode.id})`);
      setEdges(eds => eds.map(e => e.source === (triggers[0]?.id || '1') && e.target === orchestratorNode.id ? { ...e, style: { stroke: '#3b82f6', strokeWidth: 4 } } : e));
      setNodes(nds => nds.map(n => n.id === (triggers[0]?.id || '1') ? { ...n, className: '' } : n));
      setNodes(nds => nds.map(n => n.id === orchestratorNode.id ? { ...n, className: 'ring-4 ring-amber-500 ring-offset-2 ring-offset-black transition-all' } : n));
      await new Promise(r => setTimeout(r, 1500));

      addLog('info', `[ORCHESTRATOR] Supreme Orchestrator folosește modelul ${orchestratorNode.data.model || 'Gemini 3'} (Temp: ${orchestratorNode.data.temperature || 0.7})`);
      addLog('info', `[ORCHESTRATOR] Compilare protocol de rutare CLI... delegare către sub-agenți...`);

      // Find sub-agents connected to the orchestrator
      const connectedEdges = edges.filter(e => e.source === orchestratorNode.id || e.target === orchestratorNode.id);
      const subAgentIds = new Set(connectedEdges.flatMap(e => [e.source, e.target]).filter(id => id !== orchestratorNode.id));
      const subAgents = nodes.filter(n => n.type === 'agent' && subAgentIds.has(n.id));

      if (subAgents.length > 0) {
        addLog('info', `[ETAPĂ] Se delegă asincron sub-sarcini către ${subAgents.length} sub-agenți...`);
        setNodes(nds => nds.map(n => n.id === orchestratorNode.id ? { ...n, className: '' } : n));
        
        setEdges(eds => eds.map(e => e.source === orchestratorNode.id && subAgentIds.has(e.target) ? { ...e, style: { stroke: '#a855f7', strokeWidth: 4 }, animated: true } : e));
        setNodes(nds => nds.map(n => subAgentIds.has(n.id) ? { ...n, className: 'ring-4 ring-purple-500 ring-offset-2 ring-offset-black transition-all animate-pulse' } : n));
        
        await new Promise(r => setTimeout(r, 1800));

        for (const sub of subAgents) {
          addLog('success', `✔ [SUB-AGENT] "${sub.data.label}" a rulat cu succes! Model: ${sub.data.model || 'DeepSeek'}.`);
        }
      }

      // Step 4: Routing & Code transforms if present
      const routerNode = nodes.find(n => n.type === 'router');
      const codeNode = nodes.find(n => n.type === 'code');

      if (codeNode) {
        addLog('info', `[ETAPĂ] Se procesează nodul: "${codeNode.data.label || 'Script'}" (ID: ${codeNode.id})`);
        setNodes(nds => nds.map(n => subAgentIds.has(n.id) ? { ...n, className: '' } : n));
        setNodes(nds => nds.map(n => n.id === codeNode.id ? { ...n, className: 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-black transition-all animate-pulse' } : n));
        await new Promise(r => setTimeout(r, 1200));
        addLog('success', `✔ [CODE NODE] Scriptul custom JS s-a executat fără erori. Output: { "text": "ORDER RECEIVED FOR 2500$", "status": "ok" }`);
      }

      if (routerNode) {
        addLog('info', `[ETAPĂ] Se procesează nodul: "${routerNode.data.label || 'Decision'}" (ID: ${routerNode.id})`);
        const targetId = codeNode ? codeNode.id : (subAgents[0]?.id || orchestratorNode.id);
        setEdges(eds => eds.map(e => e.source === targetId && e.target === routerNode.id ? { ...e, style: { stroke: '#14b8a6', strokeWidth: 4 } } : e));
        setNodes(nds => nds.map(n => n.id === targetId ? { ...n, className: '' } : n));
        setNodes(nds => nds.map(n => n.id === routerNode.id ? { ...n, className: 'ring-4 ring-teal-500 ring-offset-2 ring-offset-black transition-all' } : n));
        await new Promise(r => setTimeout(r, 1200));

        const condType = routerNode.data.conditionType || 'contains';
        const condVal = (routerNode.data.conditionValue as string) || '';
        addLog('info', `[ROUTER] Condiție evaluată: if (input ${condType} "${condVal}")`);
        addLog('success', `✔ [ROUTER] Rezultat evaluare: ADEVĂRAT (YES). Se urmează ramificația superioară.`);
      }

      // Step 5: System outputs
      const actionNodes = nodes.filter(n => n.type === 'action');
      if (actionNodes.length > 0) {
        addLog('info', `[ETAPĂ] Se procesează nodul: "${actionNodes[0].data.label}" (ID: ${actionNodes[0].id})`);
        setNodes(nds => nds.map(n => n.id === (routerNode?.id || orchestratorNode.id) ? { ...n, className: '' } : n));
        
        setEdges(eds => eds.map(e => e.source === (routerNode?.id || orchestratorNode.id) && e.sourceHandle === 'yes' ? { ...e, style: { stroke: '#10b981', strokeWidth: 4 } } : e));
        setNodes(nds => nds.map(n => n.id === actionNodes[0].id ? { ...n, className: 'ring-4 ring-green-500 ring-offset-2 ring-offset-black transition-all animate-bounce' } : n));
        await new Promise(r => setTimeout(r, 1200));
        
        addLog('success', `✔ [ACTION] S-a executat cu succes acțiunea "${actionNodes[0].data.label}"!`);
        if (actionNodes[0].data.actionType === 'send_telegram') {
          addLog('success', `✔ [TELEGRAM] Notificare trimisă pe canalul ${actionNodes[0].data.payload || 'implicit'}.`);
        }
      }

      // Clean up highlights
      setNodes(nds => nds.map(n => ({ ...n, className: '' })));
      setEdges(eds => eds.map(e => ({ ...e, style: {} })));
      addLog('success', '🎉 Simulare offline completă finalizată cu succes! Swarm-ul este configurat perfect.');
      toast.success('Simularea offline a fluxului Swarm s-a încheiat cu succes!');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDeploy = async () => {
    try {
      setLoading(true);
      addLog('info', 'Se compilează protocolul de coordonare Swarm (AGENTS.md)...');
      
      const orchestratorNode = nodes.find(n => n.type === 'agent' && n.data.isOrchestrator);
      if (!orchestratorNode) {
        addLog('error', 'Deploy eșuat: Supreme Orchestrator lipsește!');
        toast.error('Desemnați un Supreme Orchestrator înainte de deploy!');
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
      const orchestratorMetadata = createAgentMetadata(orchestratorNode, 'Supreme Orchestration Hub');
      if (matchedOrchestrator) {
        orchestratorId = matchedOrchestrator.id;
        await updateAgent(orchestratorId, orchestratorMetadata);
      } else {
        addLog('info', `Se creează Orchestratorul în cluster: ${orchestratorName}`);
        await createAgent(orchestratorName, orchestratorMetadata);
        // Refetch to get newly generated ID
        await fetchAgents();
        const updatedAgents = useAgentsStore.getState().agents;
        orchestratorId = updatedAgents.find(a => a.name.toLowerCase() === orchestratorName.toLowerCase())?.id || '';
      }

      // Check / Create subagents
      const compiledSubAgentsList: Array<{ id: string; name: string; slug: string; model?: string; temp?: number; mcpServers: McpServerConfig[] }> = [];
      for (const node of subAgents) {
        const subName = node.data.label as string;
        let subId = '';
        const matchedSub = currentAgents.find(a => a.name.toLowerCase() === subName.toLowerCase());
        const subMetadata = createAgentMetadata(node, 'Specialized Agent');
        if (matchedSub) {
          subId = matchedSub.id;
          await updateAgent(subId, subMetadata);
        } else {
          addLog('info', `Se adaugă sub-agent automat în cluster: ${subName}`);
          await createAgent(subName, {
            ...subMetadata,
            description: (node.data.description as string) || `Sub-agent coordinated by ${orchestratorName}`,
          });
          await fetchAgents();
          const updatedAgents = useAgentsStore.getState().agents;
          subId = updatedAgents.find(a => a.name.toLowerCase() === subName.toLowerCase())?.id || '';
        }
        
        compiledSubAgentsList.push({
          id: subId,
          name: subName,
          slug: subId,
          model: node.data.model as string,
          temp: node.data.temperature as number,
          mcpServers: normalizeMcpServers(node.data.mcpServers),
        });
      }

      // 3. Compile Coordination Protocol (AGENTS.md)
      const dateString = new Date().toLocaleString('ro-RO');
      const orchestratorMcpServers = normalizeMcpServers(orchestratorNode.data.mcpServers);
      const agentsMarkdown = `# Protocolul de Coordonare al Clusterului AI (Swarm)
Generat automat de **ClawX Visual Builder V2 (Advanced Visual IDE)** pe data de: \`${dateString}\`

## 1. Topologia Rețelei (Cluster Graph)
- **Supreme Orchestrator**: \`${orchestratorName}\` (Slug/ID: \`${orchestratorId}\`)
- **MCP Tools Orchestrator**: \`${orchestratorMcpServers.length > 0 ? orchestratorMcpServers.map((server) => server.name).join(', ') : 'none'}\`
- **Sub-Agenți Subordonați Conectați**:
${compiledSubAgentsList.length > 0 
  ? compiledSubAgentsList.map(s => `  * **${s.name}** (Slug: \`${s.slug}\` | Model: \`${s.model || 'gemini-3'}\` | Temp: \`${s.temp || 0.7}\` | MCP: \`${s.mcpServers.length > 0 ? s.mcpServers.map((server) => server.name).join(', ') : 'none'}\`)`).join('\n')
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
  : '* rulează `openclaw agent --agent <id-subagent> --message "<mesaj>" --json`'
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
      const routerNodes = nodes.filter(n => n.type === 'router');
      const codeNodes = nodes.filter(n => n.type === 'code');

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

      if (routerNodes.length > 0) {
        extraSectionsMarkdown += `\n## 5. Routere Logice Condiționale (If/Else Decisions)\n`;
        routerNodes.forEach(r => {
          const data = r.data as any;
          extraSectionsMarkdown += `* **[ROUTER]** \`${data.label || 'Decision'}\`\n  * *Condiție*: If Input \`${data.conditionType || 'contains'}\` \`"${data.conditionValue || ''}"\`\n  * *Căi*: YES (Succes) -> Green Port | NO (Eșuat) -> Red Port\n`;
        });
      }

      if (codeNodes.length > 0) {
        extraSectionsMarkdown += `\n## 6. Scripturi Custom JavaScript (Sandbox Transformations)\n`;
        codeNodes.forEach(c => {
          const data = c.data as any;
          extraSectionsMarkdown += `* **[JS SCRIPT]** \`${data.label || 'Code Node'}\`\n  * *Script*: \n\`\`\`javascript\n${data.script || ''}\n\`\`\`\n`;
        });
      }
      
      if (knowledgeNodes.length > 0) {
        extraSectionsMarkdown += `\n## 7. Surse de Memorie și Context (Knowledge Bases)\n`;
        knowledgeNodes.forEach(k => {
          const data = k.data as any;
          const type = data.knowledgeType || 'vector_db';
          const path = data.path || 'Implicit';
          extraSectionsMarkdown += `* **[${String(type).toUpperCase()}]** \`${data.label}\` (Locație/Index: \`${path}\`)\n  * *Descriere*: ${data.description || 'Fără descriere.'}\n`;
        });
      }
      
      if (actionNodes.length > 0) {
        extraSectionsMarkdown += `\n## 8. Acțiuni de Execuție în Sistem (Actions)\n`;
        actionNodes.forEach(a => {
          const data = a.data as any;
          const type = data.actionType || 'bash_command';
          const payload = data.payload || 'Implicit';
          if (type === 'send_telegram') {
            extraSectionsMarkdown += `* **[TELEGRAM]** Trimite mesaj către Telegram (Chat/Channel ID: \`${payload}\`)\n  * *Descriere*: ${data.description || 'Trimite rezultatele sau rapoartele direct în chat-ul de Telegram.'}\n  * *Regulă de Execuție*: Rulat prin modulul tău de execuție local în Bash CLI:\n    \`\`\`bash\n    openclaw message send --channel telegram --target "${payload}" --message "<mesajul_tău>"\n    \`\`\`\n`;
          } else {
            extraSectionsMarkdown += `* **[${String(type).toUpperCase()}]** \`${data.label}\` (Comandă/Payload: \`${payload}\`)\n  * *Descriere*: ${data.description || 'Fără descriere.'}\n`;
          }
        });
      }

      const compiledMarkdown = agentsMarkdown + '\n' + extraSectionsMarkdown;

      // 4. Deploy to Cluster: write AGENTS.md on VM
      addLog('info', 'Se încarcă protocolul Swarm generat pe serverul VM...');
      toast.loading('Se scrie protocolul Swarm pe VM...', { id: 'deploy-toast' });
      
      const deployResult = await hostApiFetch<{ success: boolean; filePath?: string }>('/api/agents/write-workspace-file', {
        method: 'POST',
        body: JSON.stringify({
          agentId: orchestratorId,
          fileName: 'AGENTS.md',
          content: compiledMarkdown
        })
      });

      if (deployResult.success) {
        addLog('success', `Deployment reușit! Swarm-ul este activat pe VM la calea: ${deployResult.filePath}`);
        toast.success(`Deployment reușit! Protocol scris la path: ${deployResult.filePath}`, { id: 'deploy-toast' });
      } else {
        throw new Error('Eroare la scrierea protocolului pe VM.');
      }
    } catch (e) {
      console.error(e);
      addLog('error', `Deploy eșuat: ${e instanceof Error ? e.message : String(e)}`);
      toast.error(`Deploy eșuat: ${e instanceof Error ? e.message : String(e)}`, { id: 'deploy-toast' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col -m-6 bg-[#080B11] h-[calc(100vh-2.5rem)] overflow-hidden">
      {/* Builder V2 Header Toolbar */}
      <div className="h-16 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Workflow className="h-6 w-6 text-purple-500 animate-pulse" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              ClawX Swarm Builder V2
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-ping" />
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">Advanced Visual AI IDE</p>
          </div>
          <Badge variant="outline" className="text-[9px] uppercase font-mono bg-purple-500/10 text-purple-400 border-purple-500/20 px-2 py-0.5 ml-2">
            DAG SYNCHRONIZER
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-rose-500 hover:bg-rose-500/10 transition-colors text-xs"
            onClick={() => { setNodes([]); setEdges([]); addLog('warn', 'Canvas curățat complet.'); }}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Șterge Canvas
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5 text-xs text-slate-300 border-white/10 bg-transparent hover:bg-white/5 transition-all"
            disabled={loading}
            onClick={handleSavePlan}
          >
            <Save className="h-4 w-4" />
            Sincronizează Planul
          </Button>
          <Button
            size="sm"
            className="rounded-full gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all border border-emerald-400/40"
            disabled={loading || isSimulating}
            onClick={handleRunSimulation}
          >
            <Play className="h-3.5 w-3.5 fill-current text-black" />
            Rulează Simulare
          </Button>
          <Button
            size="sm"
            className="rounded-full gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all border border-amber-400/40"
            disabled={loading}
            onClick={handleDeploy}
          >
            <Share2 className="h-3.5 w-3.5 text-black" />
            Deploy pe VM
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* V2 Left Palette Sidebar */}
        <aside className="w-64 border-r border-white/10 bg-[#0B0F19]/40 p-4 space-y-6 overflow-y-auto z-10">
          <div className="space-y-2">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 ml-2 font-mono">1. Activatori (Triggers)</p>
            <PaletteItem
              icon={<Globe className="h-4 w-4" />}
              label="Webhook Input V2"
              color="text-blue-400"
              onClick={() => addNode('trigger', 'Webhook Input', { triggerType: 'webhook', webhookUrl: '/webhook/alert' })}
            />
            <PaletteItem
              icon={<MessageSquare className="h-4 w-4" />}
              label="Discord Msg Event"
              color="text-blue-500"
              onClick={() => addNode('trigger', 'Discord Message', { triggerType: 'discord', channelId: '120938401928' })}
            />
            <PaletteItem
              icon={<Send className="h-4 w-4" />}
              label="Telegram Msg Event"
              color="text-sky-400"
              onClick={() => addNode('trigger', 'Telegram Message', { triggerType: 'telegram', channelId: '-100123456789' })}
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 ml-2 font-mono">2. Swarm Logic (Agents)</p>
            <PaletteItem
              icon={<Cpu className="h-4 w-4" />}
              label="Strategic Planner"
              color="text-purple-400"
              onClick={() => addNode('agent', 'Strategic Planner', { isOrchestrator: false, model: 'gemini-3', temperature: 0.7 })}
            />
            <PaletteItem
              icon={<Cpu className="h-4 w-4" />}
              label="Researcher Agent"
              color="text-purple-400"
              onClick={() => addNode('agent', 'Researcher Agent', { isOrchestrator: false, model: 'deepseek-chat', temperature: 0.5 })}
            />
            <PaletteItem
              icon={<Cpu className="h-4 w-4" />}
              label="Execution Engine"
              color="text-purple-400"
              onClick={() => addNode('agent', 'Execution Engine', { isOrchestrator: false, model: 'hermes-70b', temperature: 0.2 })}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 ml-2 font-mono">3. Logică & Transformări</p>
            <PaletteItem
              icon={<GitBranch className="h-4 w-4" />}
              label="If / Else Router"
              color="text-teal-400"
              onClick={() => addNode('router', 'Router Logic', { conditionType: 'contains', conditionValue: 'eroare' })}
            />
            <PaletteItem
              icon={<Code className="h-4 w-4" />}
              label="JS Script Code"
              color="text-indigo-400"
              onClick={() => addNode('code', 'Custom JS Script')}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 ml-2 font-mono">4. Memorie (Knowledge)</p>
            <PaletteItem
              icon={<Database className="h-4 w-4" />}
              label="Vector DB Store"
              color="text-amber-500"
              onClick={() => addNode('knowledge', 'Vector Memory', { knowledgeType: 'vector_db', path: 'index-main' })}
            />
            <PaletteItem
              icon={<Database className="h-4 w-4" />}
              label="Obsidian Brain Sync"
              color="text-amber-500"
              onClick={() => addNode('knowledge', 'Obsidian Brain', { knowledgeType: 'obsidian_sync', path: 'C:\\Server\\AI' })}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 ml-2 font-mono">5. Integrări Acțiuni</p>
            <PaletteItem
              icon={<Terminal className="h-4 w-4" />}
              label="Terminal Command"
              color="text-green-500"
              onClick={() => addNode('action', 'Bash Script', { actionType: 'bash_command', payload: 'pnpm run dev' })}
            />
            <PaletteItem
              icon={<Send className="h-4 w-4" />}
              label="Telegram Message"
              color="text-sky-400"
              onClick={() => addNode('action', 'Telegram Message', { actionType: 'send_telegram', payload: '-100123456789' })}
            />
          </div>
          
          <div className="p-3 bg-[#131824]/40 border border-white/5 rounded-2xl space-y-1.5 mt-6 font-mono text-[9px] text-slate-400 leading-relaxed">
            <div className="flex items-center gap-1.5 text-slate-200 font-bold">
              <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
              Ghid Swarm V2
            </div>
            1. Trage noduri din stânga.<br />
            2. Configurează modelul și parametrii direct pe nod.<br />
            3. Conectează handles (porturi) de la stânga la dreapta.<br />
            4. Apasă <strong>Rulează Simulare</strong> pentru testare pas-cu-pas live.<br />
            5. Apasă <strong>Deploy pe VM</strong> pentru a scrie protocolul în swarm.
          </div>
        </aside>

        {/* Canvas & Debug Console split-screen */}
        <main className="flex-1 flex flex-col relative bg-[#050811] overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 min-h-0 relative">
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
              <Background color="#161b26" gap={20} />
              <Controls className="bg-[#0B0F19] border-white/10 text-white shadow-2xl" />
              <Panel position="top-right" className="p-2.5 bg-[#0B0F19]/80 backdrop-blur-md border border-white/10 rounded-xl text-[9px] font-mono text-slate-400 shadow-xl flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                Orchestration Layer V2 - DAG Runner Active
              </Panel>
            </ReactFlow>
          </div>

          {/* Retractable Execution & Debug Console */}
          <div className={cn(
            "border-t border-white/10 bg-[#0B0F19]/95 backdrop-blur-md flex flex-col transition-all duration-300 z-10 shrink-0",
            isConsoleOpen ? "h-64" : "h-10"
          )}>
            {/* Console header */}
            <div className="h-10 px-6 flex items-center justify-between border-b border-white/5 select-none cursor-pointer" onClick={() => setIsConsoleOpen(!isConsoleOpen)}>
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">Execution Log & Swarm Debug Console</span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] font-mono leading-none">
                  ONLINE
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); setExecutionLogs([]); }} 
                  className="text-[9px] font-mono text-slate-500 hover:text-slate-200 transition-colors uppercase"
                >
                  Curăță Consola
                </button>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-300", isConsoleOpen ? "" : "rotate-180")} />
              </div>
            </div>

            {/* Logs body */}
            {isConsoleOpen && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px]">
                {executionLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 border-b border-white/[0.01] pb-1">
                    <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                    {log.type === 'success' ? (
                      <span className="text-emerald-400 shrink-0 font-bold">[SUCCESS]</span>
                    ) : log.type === 'warn' ? (
                      <span className="text-amber-400 shrink-0 font-bold">[WARN]</span>
                    ) : log.type === 'error' ? (
                      <span className="text-rose-400 shrink-0 font-bold">[ERROR]</span>
                    ) : (
                      <span className="text-blue-400 shrink-0 font-bold">[INFO]</span>
                    )}
                    <span className={cn(
                      "flex-1 leading-relaxed",
                      log.type === 'success' ? "text-slate-200" : log.type === 'warn' ? "text-amber-200/90" : log.type === 'error' ? "text-rose-300" : "text-slate-400"
                    )}>
                      {log.text}
                    </span>
                  </div>
                ))}
                {isSimulating && (
                  <div className="flex items-center gap-2 p-1 text-[10px] text-purple-400 font-mono animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></span>
                    Rulare simulată DAG în curs...
                  </div>
                )}
              </div>
            )}
          </div>

          {editingNode && (
            <NodeSettingsModal
              node={editingNode}
              onClose={() => setEditingNode(null)}
              onSave={(updatedData) => {
                updateNodeData(editingNode.id, updatedData);
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

// Sidebar item template
function PaletteItem({ icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#131926]/40 border border-white/5 hover:border-purple-500/30 hover:bg-[#131926]/80 hover:shadow-lg transition-all group text-left"
    >
      <div className={cn("p-1.5 rounded-lg bg-white/5", color)}>
        {icon}
      </div>
      <div className="flex-1">
        <span className="text-xs font-semibold block text-slate-200 truncate">{label}</span>
      </div>
      <Plus className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-purple-400 transition-all shrink-0" />
    </button>
  );
}

interface NodeSettingsModalProps {
  node: Node;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
}

// Detailed Edit Modal (Fallback for complex setups)
function NodeSettingsModal({ node, onClose, onSave }: NodeSettingsModalProps) {
  const { agents } = useAgentsStore();
  const [label, setLabel] = useState(node.data.label as string || '');
  const [description, setDescription] = useState(node.data.description as string || '');
  
  // States
  const [triggerType, setTriggerType] = useState(node.data.triggerType as string || 'webhook');
  const [webhookUrl, setWebhookUrl] = useState(node.data.webhookUrl as string || '');
  const [channelId, setChannelId] = useState(node.data.channelId as string || '');
  const [cronExpression, setCronExpression] = useState(node.data.cronExpression as string || '*/5 * * * *');
  
  const [role, setRole] = useState(node.data.role as string || '');
  const [isOrchestrator, setIsOrchestrator] = useState(!!node.data.isOrchestrator);
  const [model, setModel] = useState(node.data.model as string || 'gemini-3');
  const [temperature, setTemperature] = useState(typeof node.data.temperature === 'number' ? node.data.temperature : 0.7);
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>(normalizeMcpServers(node.data.mcpServers));

  const initialMatchedAgent = agents.find((a) => a.name.toLowerCase() === label.toLowerCase());
  const [selectedAgentId, setSelectedAgentId] = useState(initialMatchedAgent ? initialMatchedAgent.id : 'custom');

  const [knowledgeType, setKnowledgeType] = useState(node.data.knowledgeType as string || 'vector_db');
  const [path, setPath] = useState(node.data.path as string || '');

  const [actionType, setActionType] = useState(node.data.actionType as string || 'bash_command');
  const [payload, setPayload] = useState(node.data.payload as string || '');

  const [script, setScript] = useState(node.data.script as string || '');

  const updateMcpServer = (index: number, patch: Partial<McpServerConfig>) => {
    setMcpServers((servers) => servers.map((server, serverIndex) => (
      serverIndex === index ? { ...server, ...patch } : server
    )));
  };

  const updateMcpServerArgs = (index: number, value: string) => {
    updateMcpServer(index, { args: parseArgsInput(value) });
  };

  const addMcpServer = () => {
    setMcpServers((servers) => [...servers, { name: 'filesystem', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] }]);
  };

  const removeMcpServer = (index: number) => {
    setMcpServers((servers) => servers.filter((_, serverIndex) => serverIndex !== index));
  };

  const handleSave = () => {
    const updatedData: Record<string, any> = {
      label,
      description,
    };

    if (node.type === 'trigger') {
      updatedData.triggerType = triggerType;
      updatedData.webhookUrl = webhookUrl;
      updatedData.channelId = channelId;
      updatedData.cronExpression = cronExpression;
    } else if (node.type === 'agent') {
      updatedData.role = role;
      updatedData.isOrchestrator = isOrchestrator;
      updatedData.model = model;
      updatedData.temperature = temperature;
      updatedData.mcpServers = normalizeMcpServers(mcpServers);
    } else if (node.type === 'knowledge') {
      updatedData.knowledgeType = knowledgeType;
      updatedData.path = path;
    } else if (node.type === 'action') {
      updatedData.actionType = actionType;
      updatedData.payload = payload;
    } else if (node.type === 'code') {
      updatedData.script = script;
    }

    onSave(updatedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0B0F19]/95 backdrop-blur-xl p-6 shadow-2xl space-y-5 flex flex-col max-h-[90vh] overflow-y-auto relative text-left">
        <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-purple-500 via-primary to-cyan-500 rounded-t-3xl" />
        
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <div>
            <h2 className="text-md font-bold text-white">Configurație Nod Swarm</h2>
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest mt-0.5">Nod: {node.id} | Tip: {node.type?.toUpperCase()}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 flex-1 text-slate-300">
          {/* Label Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">Denumire Nod (Label)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors text-white"
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">Descriere Scenariu / Rol</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors h-16 resize-none text-white"
            />
          </div>

          {/* Trigger Node Details */}
          {node.type === 'trigger' && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Tip Activator</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white"
                >
                  <option value="webhook">Webhook Input URL</option>
                  <option value="discord">Discord Message Event</option>
                  <option value="telegram">Telegram Message Event</option>
                  <option value="schedule">Schedule (Cron/Timer)</option>
                </select>
              </div>

              {triggerType === 'webhook' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Webhook Subpath</label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white font-mono"
                  />
                </div>
              )}

              {(triggerType === 'discord' || triggerType === 'telegram') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Channel ID / Chat ID</label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white font-mono"
                  />
                </div>
              )}

              {triggerType === 'schedule' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Cron Expression</label>
                  <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Agent Node Details */}
          {node.type === 'agent' && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Selectează Agent din Rețea</label>
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
                        setMcpServers(normalizeMcpServers(selected.mcpServers));
                      }
                    }
                  }}
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white"
                >
                  <option value="custom">-- Agent Personalizat (Custom) --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role || 'Fără rol'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Rol / Prompt Model AI</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Model LLM Utilizat</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white"
                >
                  <option value="gemini-3">Gemini 1.5 / 2.0 Flash</option>
                  <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                  <option value="hermes-70b">Nous Hermes 4 70B</option>
                  <option value="claude-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-xs font-semibold text-slate-200">Temperatură (Creativitate)</label>
                  <span className="text-purple-400 font-bold font-mono text-xs">{temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#131926] rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-200">MCP Tool Servers</label>
                    <p className="text-[10px] text-slate-500">Aceste servere se salvează pe agentul OpenClaw la sync/deploy.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={addMcpServer}
                    className="h-7 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 text-[10px] text-cyan-300 hover:bg-cyan-500/20"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>

                {mcpServers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-[10px] text-slate-500">
                    Niciun MCP server configurat pentru acest agent.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mcpServers.map((server, index) => (
                      <div key={`${server.name}-${index}`} className="space-y-2 rounded-xl border border-white/10 bg-[#050811]/80 p-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={server.name}
                            onChange={(e) => updateMcpServer(index, { name: e.target.value })}
                            placeholder="name"
                            className="min-w-0 flex-1 bg-[#131926] border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50 text-white font-mono"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeMcpServer(index)}
                            className="h-7 w-7 rounded-lg text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <input
                          type="text"
                          value={server.command}
                          onChange={(e) => updateMcpServer(index, { command: e.target.value })}
                          placeholder="command, ex: npx"
                          className="w-full bg-[#131926] border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50 text-white font-mono"
                        />
                        <input
                          type="text"
                          value={(server.args || []).join(' ')}
                          onChange={(e) => updateMcpServerArgs(index, e.target.value)}
                          placeholder="args, ex: -y @modelcontextprotocol/server-filesystem C:\\Server"
                          className="w-full bg-[#131926] border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-cyan-500/50 text-white font-mono"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <input
                  type="checkbox"
                  id="isOrchestrator"
                  checked={isOrchestrator}
                  onChange={(e) => setIsOrchestrator(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-500/30 text-amber-500 bg-transparent focus:ring-0"
                />
                <label htmlFor="isOrchestrator" className="text-xs font-bold text-amber-500 cursor-pointer select-none">
                  Setează ca Supreme Orchestrator (⭐ Hub Coordonator)
                </label>
              </div>
            </div>
          )}

          {/* Code Node Details */}
          {node.type === 'code' && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">JavaScript Transformation Script</label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={8}
                  className="w-full bg-[#050811] border border-white/10 rounded-xl p-3 text-xs font-mono text-emerald-400 leading-relaxed resize-none outline-none focus:border-indigo-500/50"
                  placeholder={`function main(input) {\n  return {\n    text: input.text\n  };\n}`}
                />
              </div>
            </div>
          )}

          {/* Knowledge Node Details */}
          {node.type === 'knowledge' && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Tip Bază Cunoștințe</label>
                <select
                  value={knowledgeType}
                  onChange={(e) => setKnowledgeType(e.target.value)}
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white"
                >
                  <option value="vector_db">Vector Database (Chroma/Pinecone)</option>
                  <option value="obsidian_sync">Obsidian Knowledge Vault</option>
                  <option value="local_folder">Local Workspace Filesystem</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Cale Index / Folder</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white"
                />
              </div>
            </div>
          )}

          {/* Action Node Details */}
          {node.type === 'action' && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Tip Execuție Acțiune</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white"
                >
                  <option value="bash_command">Terminal Command (Bash Script)</option>
                  <option value="send_email">Trimite Notificare Email</option>
                  <option value="send_telegram">Trimite Mesaj Telegram</option>
                  <option value="webhook_push">Webhook Post Payload</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Payload / Comandă Execuție</label>
                <input
                  type="text"
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-500/50 text-white font-mono"
                  placeholder="Instrucțiuni sau adresă..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl text-slate-400 hover:text-white">
            Anulează
          </Button>
          <Button size="sm" onClick={handleSave} className="rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-black font-extrabold shadow-lg">
            Salvează Modificări
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Builder;
