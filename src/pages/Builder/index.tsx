import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Play,
  Save,
  Settings,
  Workflow,
  Cpu,
  Database,
  Globe,
  MessageSquare,
  Trash2,
  Share2,
  UserCheck,
  Zap as ZapIcon,
  GitBranch,
  Repeat,
  AlertCircle
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
import { invokeIpc } from '@/lib/api-client';
import { ExecutionGraph } from '../../../shared/types/execution';

// Custom Node Types
const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  action: ActionNode,
  knowledge: KnowledgeNode,
  approval: ApprovalNode,
  api: ApiNode,
  condition: ConditionNode,
};

function TriggerNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-blue-500/20 shadow-xl border border-blue-500/30">
      <Card className="w-48 p-4 rounded-xl border-0 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-3 w-3 text-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Trigger</span>
        </div>
        <p className="text-sm font-semibold">{(data.label as string) || 'Event Trigger'}</p>
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-background" />
      </Card>
    </div>
  );
}

function ConditionNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-orange-500/20 shadow-xl border border-orange-500/30">
      <Card className="w-48 p-4 rounded-xl border-0 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="h-3 w-3 text-orange-500" />
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Logic Split</span>
        </div>
        <p className="text-xs opacity-70 mb-1 font-mono">{(data.expression as string) || 'if(success)'}</p>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
        <div className="flex flex-col gap-4 mt-2 items-end">
           <div className="flex items-center gap-2">
             <span className="text-[8px] font-bold text-green-500 uppercase">True</span>
             <Handle type="source" position={Position.Right} id="true" style={{ top: '65%' }} className="w-3 h-3 bg-green-500" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-[8px] font-bold text-red-500 uppercase">False</span>
             <Handle type="source" position={Position.Right} id="false" style={{ top: '85%' }} className="w-3 h-3 bg-red-500" />
           </div>
        </div>
      </Card>
    </div>
  );
}

function ApprovalNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-red-500/20 shadow-xl border border-red-500/30">
      <Card className="w-48 p-4 rounded-xl border-0 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <UserCheck className="h-3 w-3 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Human Gateway</span>
        </div>
        <p className="text-sm font-semibold">{(data.label as string) || 'Verify Output'}</p>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500 border-2 border-background" />
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-red-500 border-2 border-background" />
      </Card>
    </div>
  );
}

function ApiNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-zinc-500/20 shadow-xl border border-zinc-500/30">
      <Card className="w-48 p-4 rounded-xl border-0 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <ZapIcon className="h-3 w-3 text-zinc-500" />
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">External API</span>
        </div>
        <p className="text-sm font-semibold">{(data.label as string) || 'HTTP Request'}</p>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-zinc-500 border-2 border-background" />
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-500 border-2 border-background" />
      </Card>
    </div>
  );
}

function AgentNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-purple-500/20 shadow-xl border border-purple-500/30">
      <Card className="w-48 p-4 rounded-xl border-0 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="h-3 w-3 text-purple-500" />
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">AI OS Agent</span>
        </div>
        <Badge variant="secondary" className="mb-2 text-[8px] uppercase">{(data.role as string) || 'Agent'}</Badge>
        <p className="text-sm font-semibold">{(data.label as string) || 'AI OS Agent'}</p>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500 border-2 border-background" />
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500 border-2 border-background" />
      </Card>
    </div>
  );
}

function ActionNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-green-500/20 shadow-xl border border-green-500/30">
      <Card className="w-48 p-4 rounded-xl border-0 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Play className="h-3 w-3 text-green-500" />
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">System Action</span>
        </div>
        <p className="text-sm font-semibold">{(data.label as string) || 'Execute Action'}</p>
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500 border-2 border-background" />
      </Card>
    </div>
  );
}

function KnowledgeNode({ data }: NodeProps) {
  return (
    <div className="p-1 rounded-2xl bg-amber-500/20 shadow-xl border border-amber-500/30">
      <Card className="w-48 p-4 rounded-xl border-0 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Brain Store</span>
        </div>
        <p className="text-sm font-semibold">{(data.label as string) || 'Knowledge Base'}</p>
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
    data: { label: 'Discord Message' }
  },
  {
    id: '2',
    type: 'agent',
    position: { x: 350, y: 150 },
    data: { label: 'Strategic Planner', role: 'CEO' }
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true }
];

export function Builder() {
  const { t } = useTranslation('builder');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { createAgent } = useAgentsStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('clawx:builder-v1-state');
    if (saved) {
      try {
        const { nodes: sn, edges: se } = JSON.parse(saved);
        setNodes(sn);
        setEdges(se);
      } catch (e) {}
    }
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const addNode = (type: string, label: string, extraData: any = {}) => {
    const id = Date.now().toString();
    const newNode: Node = {
      id,
      type,
      position: { x: 400, y: 300 },
      data: { label, ...extraData },
    };
    setNodes((nds) => nds.concat(newNode));
    toast.success(`Added ${label} to workspace`);
  };

  const handleSavePlan = async () => {
    try {
      setLoading(true);
      const builderState = { nodes, edges };

      // Persist to local storage
      localStorage.setItem('clawx:builder-v1-state', JSON.stringify(builderState));

      // Synchronize agents mentioned in the graph
      const agentNodes = nodes.filter(n => n.type === 'agent');
      for (const node of agentNodes) {
        await createAgent(node.data.label as string, {
          role: node.data.role as string || 'Execution',
          tags: ['builder-orchestrated'],
          description: `Part of AI OS Plan: ${node.data.label}`,
          systemPrompt: `You are the ${node.data.role} in a multi-agent AI OS graph.`
        });
      }

      toast.success('AI OS Plan saved and synchronized');
    } catch (e) {
      toast.error('Failed to save AI OS Plan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    const executionGraph: ExecutionGraph = {
      id: `graph_${Date.now()}`,
      version: '2.0.0',
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type as any,
        label: n.data.label as string,
        config: n.data,
        inputs: [],
        outputs: []
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined
      })),
      metadata: {
        name: 'Autonomous Team Workflow',
        createdAt: new Date().toISOString()
      }
    };

    toast.promise(invokeIpc('execution:start', executionGraph), {
      loading: 'Deploying AI Team Cluster...',
      success: 'Execution Trace active. Monitoring telemetry...',
      error: 'Deployment failed.'
    });
  };

  return (
    <div className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      {/* Builder Toolbar */}
      <div className="h-16 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Workflow className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-serif font-semibold tracking-tight">AI OS Visual Builder</h1>
          <Badge variant="outline" className="text-[10px] uppercase font-mono bg-primary/10 text-primary border-primary/20">v2.0 Beta</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-destructive hover:bg-destructive/10"
            onClick={() => { setNodes([]); setEdges([]); }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2"
            disabled={loading}
            onClick={handleSavePlan}
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Plan'}
          </Button>
          <Button
            size="sm"
            className="rounded-full gap-2 shadow-lg shadow-primary/20"
            onClick={handleDeploy}
          >
            <Play className="h-4 w-4 fill-current" />
            Deploy OS
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Components Palette */}
        <aside className="w-64 border-r border-black/5 dark:border-white/10 bg-black/[0.02] p-4 space-y-6 overflow-y-auto z-10">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Triggers</p>
            <PaletteItem
              icon={<Globe className="h-4 w-4" />}
              label="Webhook"
              color="text-blue-500"
              onClick={() => addNode('trigger', 'Webhook Input')}
            />
            <PaletteItem
              icon={<MessageSquare className="h-4 w-4" />}
              label="User Message"
              color="text-blue-600"
              onClick={() => addNode('trigger', 'Direct Input')}
            />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Team Hierarchy</p>
            <PaletteItem
              icon={<Cpu className="h-4 w-4" />}
              label="CEO Agent"
              color="text-purple-500"
              onClick={() => addNode('agent', 'CEO Agent', { role: 'CEO' })}
            />
            <PaletteItem
              icon={<Cpu className="h-4 w-4" />}
              label="Planner Agent"
              color="text-purple-500"
              onClick={() => addNode('agent', 'Planner Agent', { role: 'Planner' })}
            />
            <PaletteItem
              icon={<Cpu className="h-4 w-4" />}
              label="Researcher"
              color="text-purple-500"
              onClick={() => addNode('agent', 'Researcher Agent', { role: 'Researcher' })}
            />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Logic & Memory</p>
             <PaletteItem
              icon={<GitBranch className="h-4 w-4" />}
              label="Condition"
              color="text-orange-500"
              onClick={() => addNode('condition', 'Logic Split', { expression: 'context.score > 0.8' })}
            />
            <PaletteItem
              icon={<Database className="h-4 w-4" />}
              label="Knowledge Graph"
              color="text-amber-500"
              onClick={() => addNode('knowledge', 'Long-term Memory')}
            />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Execution</p>
            <PaletteItem
              icon={<Play className="h-4 w-4" />}
              label="Bash Command"
              color="text-green-500"
              onClick={() => addNode('action', 'Terminal Command')}
            />
            <PaletteItem
              icon={<UserCheck className="h-4 w-4" />}
              label="Human-in-loop"
              color="text-red-500"
              onClick={() => addNode('approval', 'Manual Review')}
            />
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative dark:bg-black/40 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-dot-pattern bg-[length:30px_30px]"
          >
            <Background color="#888" gap={20} />
            <Controls className="bg-background border-black/10 shadow-xl" />
            <Panel position="top-right" className="p-2 bg-background/80 backdrop-blur-md border border-black/10 rounded-xl text-[10px] font-mono text-muted-foreground shadow-sm flex items-center gap-2">
              <Share2 className="h-3 w-3" />
              OS Engine Runtime: Deterministic
            </Panel>

            {nodes.length === 0 && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="text-center">
                    <Workflow className="h-24 w-24 mx-auto mb-4" />
                    <p className="text-xl font-serif">Drop components to build your AI OS</p>
                  </div>
               </div>
            )}
          </ReactFlow>
        </main>
      </div>
    </div>
  );
}

function PaletteItem({ icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-background border border-black/5 hover:border-primary/30 hover:shadow-sm transition-all group text-left"
    >
      <div className={cn("p-2 rounded-lg bg-black/5 dark:bg-white/5", color)}>
        {icon}
      </div>
      <div className="flex-1">
        <span className="text-xs font-medium block">{label}</span>
      </div>
      <Plus className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

export default Builder;
