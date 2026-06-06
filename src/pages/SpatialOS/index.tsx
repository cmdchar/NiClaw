import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  FolderTree,
  GitPullRequest,
  LayoutDashboard,
  Link,
  Loader2,
  Map,
  Network,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Terminal,
  Trash2,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { hostApiFetch } from '@/lib/host-api';
import { cn } from '@/lib/utils';
import { useAgentsStore } from '@/stores/agents';
import { useGatewayStore } from '@/stores/gateway';
import { useTasksStore } from '@/stores/tasks';
import type { AgentSummary } from '@/types/agent';
import type { SpatialTask } from '@/types/task';

type BoardStatusResponse = {
  board_url?: string;
  board_id?: string;
  revision?: number;
  synced_at?: string;
  local_synced_at?: string;
  remotePublishConfigured?: boolean;
  publish_status?: string;
  publish_error?: string;
  published_at?: string;
  snapshot?: {
    nodeCount?: number;
    arrowCount?: number;
    generatedAt?: string;
  };
  probe?: {
    reachable?: boolean;
    status?: number;
    error?: string;
  };
};

type GatewayHealthResponse = {
  ok?: boolean;
  state?: string;
  healthy?: boolean;
  error?: string;
  message?: string;
  gatewayReady?: boolean;
  capabilities?: {
    core?: {
      process?: string;
      transport?: string;
      rpcRouter?: string;
    };
    openclawHealth?: {
      state?: string;
    };
  };
};

type LogsResponse = {
  content: string;
};

type SpatialPlanStep = {
  id: string;
  kind: 'manual' | 'note' | 'host_api' | 'shell' | 'browser' | 'board_sync' | 'doctor_diagnose' | 'doctor_fix' | 'gateway_restart' | 'build_validation';
  title: string;
  detail?: string;
  status: 'pending' | 'completed' | 'blocked' | 'failed';
  requiresApproval: boolean;
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected' | 'consumed';
  approvalUpdatedAt?: string;
  approvalNote?: string;
  validationProfile?: 'typecheck';
};

type SpatialPlanEvent = {
  id: string;
  runId: string;
  planId: string;
  stepId?: string;
  ts: string;
  level: 'info' | 'warning' | 'error';
  message: string;
};

type SpatialPlanRun = {
  id: string;
  planId: string;
  status: 'completed' | 'blocked' | 'failed';
  startedAt: string;
  finishedAt: string;
  events: SpatialPlanEvent[];
};

type SpatialPlan = {
  id: string;
  title: string;
  objective: string;
  status: 'draft' | 'ready' | 'running' | 'completed' | 'blocked' | 'failed';
  createdAt: string;
  updatedAt: string;
  steps: SpatialPlanStep[];
  runs: SpatialPlanRun[];
};

type PlansResponse = {
  success: boolean;
  plans: SpatialPlan[];
  error?: string;
  storage?: {
    path?: string;
  };
};

type PlanRunResponse = PlansResponse & {
  plan?: SpatialPlan;
  run?: SpatialPlanRun;
};

type ZoneState = 'online' | 'idle' | 'warning' | 'missing' | 'error';

type SpatialZone = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  state: ZoneState;
  metric: string;
  detail: string;
  icon: typeof Bot;
};

function formatDate(value?: string): string {
  if (!value) return 'not reported';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function stateLabel(state: ZoneState): string {
  if (state === 'online') return 'online';
  if (state === 'idle') return 'idle';
  if (state === 'warning') return 'warning';
  if (state === 'missing') return 'missing backend';
  return 'error';
}

function stateClassName(state: ZoneState): string {
  if (state === 'online') return 'border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200';
  if (state === 'idle') return 'border-sky-300/70 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200';
  if (state === 'warning') return 'border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200';
  if (state === 'missing') return 'border-slate-300/70 bg-slate-50 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-300';
  return 'border-red-300/70 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200';
}

function StatusBadge({ state }: { state: ZoneState }) {
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-2xs font-medium uppercase tracking-wide', stateClassName(state))}>
      {stateLabel(state)}
    </span>
  );
}

function AgentRow({ agent }: { agent: AgentSummary }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/70 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{agent.name}</div>
          <div className="truncate text-2xs text-muted-foreground">{agent.id}</div>
        </div>
        {agent.isDefault && <Badge variant="secondary" className="shrink-0">default</Badge>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-2xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">{agent.modelDisplay || 'model inherited'}</span>
        <span className="rounded bg-muted px-1.5 py-0.5">{agent.mcpServers?.length ?? 0} MCP</span>
        <span className="rounded bg-muted px-1.5 py-0.5">{agent.channelTypes.length} channels</span>
      </div>
    </div>
  );
}

function PlanStatusBadge({ status }: { status: SpatialPlan['status'] }) {
  const state: ZoneState = status === 'completed'
    ? 'online'
    : status === 'blocked'
      ? 'warning'
      : status === 'failed'
        ? 'error'
        : 'idle';
  return <StatusBadge state={state} />;
}

export function SpatialOS() {
  const agents = useAgentsStore((state) => state.agents);
  const agentsLoading = useAgentsStore((state) => state.loading);
  const agentsError = useAgentsStore((state) => state.error);
  const fetchAgents = useAgentsStore((state) => state.fetchAgents);
  const updateAgent = useAgentsStore((state) => state.updateAgent);
  const gatewayStatus = useGatewayStore((state) => state.status);

  const tasks = useTasksStore((state) => state.tasks);
  const tasksLoading = useTasksStore((state) => state.loading);
  const tasksError = useTasksStore((state) => state.error);
  const fetchTasks = useTasksStore((state) => state.fetchTasks);
  const createTask = useTasksStore((state) => state.createTask);
  const updateTask = useTasksStore((state) => state.updateTask);
  const deleteTask = useTasksStore((state) => state.deleteTask);

  const [boardStatus, setBoardStatus] = useState<BoardStatusResponse | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [gatewayHealth, setGatewayHealth] = useState<GatewayHealthResponse | null>(null);
  const [gatewayHealthError, setGatewayHealthError] = useState<string | null>(null);
  const [logs, setLogs] = useState('');
  const [logsError, setLogsError] = useState<string | null>(null);
  const [plans, setPlans] = useState<SpatialPlan[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [planObjective, setPlanObjective] = useState('');
  const [planBusy, setPlanBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Agent Harness State
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentTranscripts, setAgentTranscripts] = useState<Record<string, any[]>>({});

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [selectedAgentId, agents],
  );

  // Set default selected agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const fetchAgentTranscript = useCallback(async (agentId: string, sessionKey: string) => {
    if (!sessionKey) return;
    try {
      const response = await hostApiFetch<{ success: boolean; messages: any[] }>(
        `/api/sessions/transcript?sessionKey=${encodeURIComponent(sessionKey)}&limit=40`
      );
      if (response.success && Array.isArray(response.messages)) {
        setAgentTranscripts((prev) => ({ ...prev, [agentId]: response.messages }));
      }
    } catch (e) {
      console.warn(`Failed to fetch transcript for agent ${agentId}:`, e);
    }
  }, []);

  // Poll transcript logs for selected agent
  useEffect(() => {
    if (activeZone === 'agents' && selectedAgent) {
      void fetchAgentTranscript(selectedAgent.id, selectedAgent.mainSessionKey);
      const interval = setInterval(() => {
        void fetchAgentTranscript(selectedAgent.id, selectedAgent.mainSessionKey);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [activeZone, selectedAgent, fetchAgentTranscript]);

  const refreshSpatialStatus = useCallback(async () => {
    setRefreshing(true);
    await fetchAgents();
    await fetchTasks();

    const boardPromise = hostApiFetch<BoardStatusResponse>('/api/board/status')
      .then((status) => {
        setBoardStatus(status);
        setBoardError(null);
      })
      .catch((error: unknown) => {
        setBoardError(String(error));
      });

    const gatewayPromise = hostApiFetch<GatewayHealthResponse>('/api/gateway/health?probe=1')
      .then((health) => {
        setGatewayHealth(health);
        setGatewayHealthError(null);
      })
      .catch((error: unknown) => {
        setGatewayHealthError(String(error));
      });

    const logsPromise = hostApiFetch<LogsResponse>('/api/logs?tailLines=32')
      .then((response) => {
        setLogs(response.content);
        setLogsError(null);
      })
      .catch((error: unknown) => {
        setLogsError(String(error));
      });

    const plansPromise = hostApiFetch<PlansResponse>('/api/plans')
      .then((response) => {
        setPlans(response.plans || []);
        setPlansError(null);
      })
      .catch((error: unknown) => {
        setPlansError(String(error));
      });

    await Promise.allSettled([boardPromise, gatewayPromise, logsPromise, plansPromise]);
    setRefreshing(false);
  }, [fetchAgents]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSpatialStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSpatialStatus]);

  const boardReachable = boardStatus?.probe?.reachable === true;
  const gatewayReady = gatewayHealth?.healthy === true
    || gatewayHealth?.gatewayReady === true
    || (
      gatewayHealth?.ok === true
      && gatewayHealth.capabilities?.core?.process === 'running'
      && gatewayHealth.capabilities?.core?.transport === 'connected'
      && gatewayHealth.capabilities?.core?.rpcRouter === 'ready'
    )
    || gatewayStatus.gatewayReady === true;
  const logLines = useMemo(
    () => logs.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(-14),
    [logs],
  );
  const latestPlan = plans[0];
  const latestRun = latestPlan?.runs?.[0];
  const planEvents = latestRun?.events ?? [];

  const handleCreatePlan = async () => {
    const title = planTitle.trim();
    const objective = planObjective.trim();
    if (!title || !objective) {
      setPlansError('Plan title and objective are required.');
      return;
    }
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlansResponse>('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          title,
          objective,
          steps: [
            {
              kind: 'manual',
              title: 'Review objective and confirm execution scope',
              detail: objective,
            },
          ],
        }),
      });
      setPlans(response.plans || []);
      setPlansError(null);
      setPlanTitle('');
      setPlanObjective('');
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleCreateBoardSyncPlan = async () => {
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlansResponse>('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Sync BoardAI Brainmap',
          objective: 'Publish the current BOARD_BRAINMAP snapshot to board.private-driver.ro through the real BoardAI Host API adapter.',
          steps: [
            {
              kind: 'board_sync',
              title: 'Publish BoardAI snapshot',
              detail: 'Calls the backend BoardAI sync service and records the result as a plan run event.',
            },
          ],
        }),
      });
      setPlans(response.plans || []);
      setPlansError(null);
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleCreateDoctorPlan = async () => {
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlansResponse>('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Run OpenClaw Doctor Diagnose',
          objective: 'Run the existing read-only OpenClaw Doctor diagnostic service and persist its result as a Spatial Plan event.',
          steps: [
            {
              kind: 'doctor_diagnose',
              title: 'Diagnose OpenClaw runtime',
              detail: 'Calls the backend OpenClaw Doctor diagnose service. The configuration-changing --fix action remains approval-gated and is not used here.',
            },
          ],
        }),
      });
      setPlans(response.plans || []);
      setPlansError(null);
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleCreateDoctorFixPlan = async () => {
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlansResponse>('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Repair OpenClaw Configuration',
          objective: 'Run OpenClaw Doctor --fix only after an explicit approval is persisted by the Spatial Plan backend.',
          steps: [
            {
              kind: 'doctor_fix',
              title: 'Approve and run OpenClaw Doctor fix',
              detail: 'Configuration-changing repair action. Execution remains blocked until the owner explicitly approves this step.',
            },
          ],
        }),
      });
      setPlans(response.plans || []);
      setPlansError(null);
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleCreateGatewayRestartPlan = async () => {
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlansResponse>('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Restart OpenClaw Gateway',
          objective: 'Restart the OpenClaw Gateway through the existing GatewayManager only after an explicit approval is persisted by the Spatial Plan backend.',
          steps: [
            {
              kind: 'gateway_restart',
              title: 'Approve and restart OpenClaw Gateway',
              detail: 'Runtime-impacting action. Execution remains blocked until the owner explicitly approves this step.',
            },
          ],
        }),
      });
      setPlans(response.plans || []);
      setPlansError(null);
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleCreateTypecheckPlan = async () => {
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlansResponse>('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Validate Desktop TypeScript',
          objective: 'Run the allowlisted desktop TypeScript validation command through the Spatial Plan backend after an explicit approval.',
          steps: [
            {
              kind: 'build_validation',
              validationProfile: 'typecheck',
              title: 'Approve and run desktop typecheck',
              detail: 'Runs only the backend-allowlisted pnpm run typecheck profile. Arbitrary shell commands are not accepted.',
            },
          ],
        }),
      });
      setPlans(response.plans || []);
      setPlansError(null);
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleCreateHostApiPlan = async () => {
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlansResponse>('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Query Gateway Health',
          objective: 'Retrieve health status of the gateway using the local Host API dispatcher',
          steps: [
            {
              kind: 'host_api',
              title: 'Query Gateway Health API',
              detail: 'GET /api/gateway/health',
            },
          ],
        }),
      });
      setPlans(response.plans || []);
      setPlansError(null);
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleCreateBrowserPlan = async () => {
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlansResponse>('/api/plans', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Verify Board Reachability',
          objective: 'Open the public board URL in a headless browser and verify its title',
          steps: [
            {
              kind: 'browser',
              title: 'Verify board.private-driver.ro title',
              detail: JSON.stringify({
                url: 'https://board.private-driver.ro/?board=728273ef-9709-4f1c-a77e-ab7086bfeff3',
                evaluate: 'document.title'
              }),
            },
          ],
        }),
      });
      setPlans(response.plans || []);
      setPlansError(null);
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleApproval = async (planId: string, stepId: string, action: 'approve' | 'reject') => {
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlansResponse>(`/api/plans/${encodeURIComponent(planId)}/steps/${encodeURIComponent(stepId)}/approval`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setPlans(response.plans || []);
      setPlansError(null);
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const handleRunPlan = async (planId: string) => {
    setPlanBusy(true);
    try {
      const response = await hostApiFetch<PlanRunResponse>(`/api/plans/${encodeURIComponent(planId)}/run`, {
        method: 'POST',
      });
      setPlans(response.plans || []);
      setPlansError(null);
    } catch (error) {
      setPlansError(String(error));
    } finally {
      setPlanBusy(false);
    }
  };

  const zones = useMemo<SpatialZone[]>(() => [
    {
      id: 'gateway',
      title: 'OpenClaw Gateway',
      eyebrow: 'Runtime core',
      description: 'Host-managed runtime status and gateway health probe.',
      state: gatewayHealthError ? 'error' : gatewayReady ? 'online' : gatewayStatus.state === 'running' ? 'warning' : 'idle',
      metric: gatewayStatus.state,
      detail: gatewayHealthError
        || gatewayHealth?.message
        || gatewayHealth?.capabilities?.openclawHealth?.state
        || `port ${gatewayStatus.port ?? 'not assigned'}`,
      icon: Activity,
    },
    {
      id: 'agents',
      title: 'Agent Harness',
      eyebrow: 'Workers',
      description: 'Configured OpenClaw agents with model, MCP and channel surface.',
      state: agentsError ? 'error' : agentsLoading ? 'warning' : agents.length > 0 ? 'online' : 'idle',
      metric: `${agents.length} agents`,
      detail: agentsError || `${agents.reduce((total, agent) => total + (agent.mcpServers?.length ?? 0), 0)} MCP servers mapped`,
      icon: Bot,
    },
    {
      id: 'boardai',
      title: 'BoardAI Brainmap',
      eyebrow: 'Whiteboard',
      description: 'Published project brainmap connected through the BoardAI Host API adapter.',
      state: boardError ? 'error' : boardReachable ? 'online' : 'warning',
      metric: `rev ${boardStatus?.revision ?? 'n/a'}`,
      detail: boardError || `${boardStatus?.snapshot?.nodeCount ?? 0} nodes / ${boardStatus?.snapshot?.arrowCount ?? 0} arrows`,
      icon: Network,
    },
    {
      id: 'plans',
      title: 'Interactive Plan Mode',
      eyebrow: 'Plan -> Execute',
      description: 'Persisted plans and backend run events for scoped execution loops.',
      state: plansError ? 'error' : plans.length > 0 ? 'online' : 'idle',
      metric: `${plans.length} plans`,
      detail: plansError || (latestPlan ? `${latestPlan.status} / ${latestPlan.steps.length} steps` : 'Host API ready'),
      icon: ClipboardList,
    },
    {
      id: 'kanban',
      title: 'Kanban / Tasks',
      eyebrow: 'Work queue',
      description: 'Task cards bound to files, agents, plans and BoardAI nodes.',
      state: tasksError ? 'error' : tasksLoading ? 'warning' : 'online',
      metric: `${tasks.length} tasks`,
      detail: tasksError || `${tasks.filter((t) => t.status === 'in_progress').length} in progress / ${tasks.filter((t) => t.status === 'done').length} done`,
      icon: LayoutDashboard,
    },
    {
      id: 'review',
      title: 'Code Review',
      eyebrow: 'Diffs & checks',
      description: 'Review panel for changed files, validation state and approvals.',
      state: 'missing',
      metric: 'contract needed',
      detail: 'Missing Host API: git diff/check summary endpoint',
      icon: GitPullRequest,
    },
  ], [
    agents,
    agentsError,
    agentsLoading,
    boardError,
    boardReachable,
    boardStatus,
    gatewayHealth,
    gatewayHealthError,
    gatewayReady,
    gatewayStatus.port,
    gatewayStatus.state,
    latestPlan,
    plans.length,
    plansError,
    tasks,
    tasksLoading,
    tasksError,
  ]);

  return (
    <div data-testid="spatial-os-page" className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f7f9fc] text-slate-950 dark:bg-[#090d14] dark:text-slate-50">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/80 px-5 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-normal">NiClaw Spatial AI OS</h1>
            <p className="truncate text-xs text-muted-foreground">2.5D functional shell backed by live Host API status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">2.5D first pass</Badge>
          <Button size="sm" variant="outline" onClick={() => void refreshSpatialStatus()} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_320px] grid-rows-[minmax(0,1fr)_190px] gap-3 p-3">
        <aside className="row-span-2 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-white/10">
            <FolderTree className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            <span className="text-sm font-medium">Workspace Explorer</span>
          </div>
          <div className="space-y-3 overflow-y-auto p-3">
            <section>
              <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Live agents</div>
              <div className="space-y-2">
                {agents.length > 0 ? agents.map((agent) => <AgentRow key={agent.id} agent={agent} />) : (
                  <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                    {agentsLoading ? 'Loading agents from Host API...' : agentsError || 'No agents returned by Host API.'}
                  </div>
                )}
              </div>
            </section>
            <section>
              <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Connected surfaces</div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Host API</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> BoardAI status</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Plans API</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Kanban Board live</div>
              </div>
            </section>
          </div>
        </aside>

        <section className="relative min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
          {activeZone === 'agents' ? (
            <div className="flex h-full flex-col min-h-0 p-4">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 pb-3 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                  <div>
                    <h2 className="text-sm font-semibold">Agent Harness Workspace</h2>
                    <p className="text-3xs text-muted-foreground">Persisted properties, target model routing, and direct session logs</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveZone(null)} className="h-8 text-xs font-semibold">
                  ← Back to Map
                </Button>
              </div>

              <div className="grid flex-1 min-h-0 grid-cols-[210px_minmax(0,1fr)] gap-3 pt-3">
                <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all hover:bg-slate-50 dark:hover:bg-white/5",
                        selectedAgentId === agent.id
                          ? "border-cyan-300 bg-cyan-50/50 dark:border-cyan-400/30 dark:bg-cyan-400/10 text-cyan-950 dark:text-cyan-100"
                          : "border-slate-200 bg-background/50 dark:border-white/5"
                      )}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold">{agent.name}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            agent.paused ? "bg-slate-400" : "bg-emerald-500 animate-pulse"
                          )} />
                        </div>
                      </div>
                      <span className="truncate text-3xs text-muted-foreground font-mono">{agent.role || 'worker'}</span>
                      {agent.currentTask && (
                        <span className="mt-1 line-clamp-1 text-3xs italic text-muted-foreground/80">
                          "{agent.currentTask}"
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {selectedAgent ? (
                  <AgentHarnessDetailsCard
                    agent={selectedAgent}
                    transcript={agentTranscripts[selectedAgent.id] || []}
                    onRefresh={() => void fetchAgentTranscript(selectedAgent.id, selectedAgent.mainSessionKey)}
                    onUpdate={async (updates) => {
                      await updateAgent(selectedAgent.id, updates);
                      await fetchAgents();
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-white/5 dark:bg-slate-900/10">
                    <Bot className="h-10 w-10 text-slate-400/70" />
                    <p className="mt-2 text-xs text-muted-foreground">Select an agent from the list to view its harness card.</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeZone === 'kanban' ? (
            <KanbanHarness
              tasks={tasks}
              agents={agents}
              plans={plans}
              onClose={() => setActiveZone(null)}
              onCreateTask={createTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
            />
          ) : (
            <>
              <div className="absolute left-1/2 top-3 z-10 flex w-[min(560px,calc(100%-2rem))] -translate-x-1/2 items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
                <Compass className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">Type a command, symbol, agent, or plan...</span>
                <Badge variant="secondary">command palette shell</Badge>
              </div>

              <div className="absolute right-4 top-4 z-10 rounded-lg border border-slate-200 bg-white/85 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/85">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                  <Map className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
                  Workspace Map
                </div>
                <div className="grid h-24 w-36 grid-cols-3 gap-1">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setActiveZone(zone.id)}
                      className={cn('rounded border cursor-pointer hover:opacity-80 transition', stateClassName(zone.state))}
                      title={zone.title}
                    />
                  ))}
                </div>
              </div>

              <div className="h-full overflow-auto px-8 pb-8 pt-20">
                <div className="relative mx-auto grid max-w-5xl grid-cols-3 gap-5">
                  <div className="pointer-events-none absolute inset-x-20 top-1/2 h-px -translate-y-1/2 bg-cyan-300/50 dark:bg-cyan-400/20" />
                  <div className="pointer-events-none absolute bottom-12 left-1/2 top-12 w-px -translate-x-1/2 bg-cyan-300/50 dark:bg-cyan-400/20" />
                  {zones.map((zone) => {
                    const Icon = zone.icon;
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setActiveZone(zone.id)}
                        className={cn(
                          "group relative min-h-40 rounded-xl border p-5 text-left transition-all duration-300 backdrop-blur-md cursor-pointer",
                          "bg-white/80 border-slate-200/80 shadow-md shadow-slate-100/50 hover:shadow-lg hover:shadow-cyan-100/60 hover:border-cyan-400/70 hover:-translate-y-1.5 hover:[transform:rotateX(5deg)_rotateY(-5deg)]",
                          "dark:bg-slate-950/40 dark:border-white/5 dark:shadow-none dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] dark:hover:border-cyan-400/40",
                          "[transform-style:preserve-3d] perspective-500"
                        )}
                      >
                        {/* Neon glowing indicator point in top corner */}
                        <div className="absolute right-4 top-4 flex h-2 w-2">
                          <span className={cn(
                            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                            zone.state === 'online' ? 'bg-emerald-400' :
                            zone.state === 'idle' ? 'bg-sky-400' :
                            zone.state === 'warning' ? 'bg-amber-400' :
                            zone.state === 'missing' ? 'bg-slate-400' : 'bg-red-400'
                          )} />
                          <span className={cn(
                            "relative inline-flex rounded-full h-2 w-2",
                            zone.state === 'online' ? 'bg-emerald-500' :
                            zone.state === 'idle' ? 'bg-sky-500' :
                            zone.state === 'warning' ? 'bg-amber-500' :
                            zone.state === 'missing' ? 'bg-slate-500' : 'bg-red-500'
                          )} />
                        </div>

                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                            <Icon className="h-5 w-5" />
                          </div>
                          <StatusBadge state={zone.state} />
                        </div>
                        <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{zone.eyebrow}</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{zone.title}</div>
                        <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{zone.description}</p>
                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-3 dark:border-white/10">
                          <span className="text-sm font-medium text-foreground">{zone.metric}</span>
                          <span className="truncate text-right text-2xs text-muted-foreground">{zone.detail}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
          <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-white/10">
            <ShieldCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            <span className="text-sm font-medium">Inspector</span>
          </div>
          <div className="space-y-4 overflow-y-auto p-3">
            <section className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="mb-2 text-xs font-medium">Gateway</div>
              <dl className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3"><dt>State</dt><dd className="text-foreground">{gatewayStatus.state}</dd></div>
                <div className="flex justify-between gap-3"><dt>Port</dt><dd className="text-foreground">{gatewayStatus.port ?? 'n/a'}</dd></div>
                <div className="flex justify-between gap-3"><dt>Ready</dt><dd className="text-foreground">{gatewayReady ? 'yes' : 'no'}</dd></div>
              </dl>
              {gatewayHealthError && <p className="mt-2 text-xs text-red-500">{gatewayHealthError}</p>}
            </section>

            <section className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="mb-2 text-xs font-medium">BoardAI</div>
              <dl className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3"><dt>Reachable</dt><dd className="text-foreground">{boardReachable ? 'yes' : 'no'}</dd></div>
                <div className="flex justify-between gap-3"><dt>Revision</dt><dd className="text-foreground">{boardStatus?.revision ?? 'n/a'}</dd></div>
                <div className="flex justify-between gap-3"><dt>Published</dt><dd className="text-foreground">{formatDate(boardStatus?.published_at)}</dd></div>
              </dl>
              {boardError && <p className="mt-2 text-xs text-red-500">{boardError}</p>}
            </section>

            <section className="rounded-lg border border-dashed border-border p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                <Workflow className="h-3.5 w-3.5" />
                Plan Mode
              </div>
              <div className="space-y-2">
                <input
                  value={planTitle}
                  onChange={(event) => setPlanTitle(event.target.value)}
                  placeholder="Plan title"
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-cyan-400"
                />
                <textarea
                  value={planObjective}
                  onChange={(event) => setPlanObjective(event.target.value)}
                  placeholder="Objective"
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-2 py-2 text-xs outline-none focus:border-cyan-400"
                />
                <Button size="sm" className="w-full" onClick={() => void handleCreatePlan()} disabled={planBusy}>
                  {planBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
                  Create Backend Plan
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => void handleCreateBoardSyncPlan()} disabled={planBusy}>
                  <Network className="mr-2 h-4 w-4" />
                  Create BoardAI Sync Plan
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => void handleCreateDoctorPlan()} disabled={planBusy}>
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Create Doctor Diagnose Plan
                </Button>
                <Button data-testid="spatial-create-doctor-fix-plan" size="sm" variant="outline" className="w-full" onClick={() => void handleCreateDoctorFixPlan()} disabled={planBusy}>
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Create Doctor Fix Plan
                </Button>
                <Button data-testid="spatial-create-gateway-restart-plan" size="sm" variant="outline" className="w-full" onClick={() => void handleCreateGatewayRestartPlan()} disabled={planBusy}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Create Gateway Restart Plan
                </Button>
                <Button data-testid="spatial-create-typecheck-plan" size="sm" variant="outline" className="w-full" onClick={() => void handleCreateTypecheckPlan()} disabled={planBusy}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Typecheck Plan
                </Button>
                <Button data-testid="spatial-create-host-api-plan" size="sm" variant="outline" className="w-full" onClick={() => void handleCreateHostApiPlan()} disabled={planBusy}>
                  <Activity className="mr-2 h-4 w-4" />
                  Create Host API Plan
                </Button>
                <Button data-testid="spatial-create-browser-plan" size="sm" variant="outline" className="w-full" onClick={() => void handleCreateBrowserPlan()} disabled={planBusy}>
                  <Link className="mr-2 h-4 w-4" />
                  Create Browser Plan
                </Button>
              </div>
              {plansError && <p className="mt-2 text-xs text-red-500">{plansError}</p>}
              <div className="mt-3 space-y-2">
                {plans.slice(0, 3).map((plan) => (
                  <div key={plan.id} className="rounded-md border border-border/70 bg-background/70 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{plan.title}</div>
                        <div className="line-clamp-2 text-2xs text-muted-foreground">{plan.objective}</div>
                      </div>
                      <PlanStatusBadge status={plan.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-2xs text-muted-foreground">{plan.steps.length} steps / {plan.runs.length} runs</span>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-2xs" onClick={() => void handleRunPlan(plan.id)} disabled={planBusy}>
                        Run
                      </Button>
                    </div>
                    {plan.steps.filter((step) => step.requiresApproval).map((step) => (
                      <div key={step.id} className="mt-2 rounded border border-amber-300/70 bg-amber-50 px-2 py-1.5 text-2xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{step.title}</span>
                          <span className="shrink-0 font-medium uppercase">{step.approvalStatus}</span>
                        </div>
                        {step.approvalStatus !== 'approved' && (
                          <div className="mt-1.5 flex gap-1.5">
                            <Button data-testid={`spatial-approve-step-${step.id}`} size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => void handleApproval(plan.id, step.id, 'approve')} disabled={planBusy}>
                              Approve
                            </Button>
                            <Button data-testid={`spatial-reject-step-${step.id}`} size="sm" variant="outline" className="h-6 px-2 text-2xs" onClick={() => void handleApproval(plan.id, step.id, 'reject')} disabled={planBusy}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {plans.length === 0 && (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Backend contract is ready. Create the first persisted execution plan to start the loop.
                  </p>
                )}
              </div>
            </section>
          </div>
        </aside>

        <section className="col-span-2 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-slate-100 shadow-sm dark:border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4 text-cyan-300" />
              Terminal / Events / Agent Logs
            </div>
            <Badge variant="outline" className="border-white/20 text-slate-300">{logLines.length} lines</Badge>
          </div>
          <div className="h-[calc(100%-2.4rem)] overflow-y-auto p-3 font-mono text-2xs leading-5">
            {planEvents.length > 0 && (
              <div className="mb-3 border-b border-white/10 pb-3">
                {planEvents.map((event) => (
                  <div key={event.id} className={cn(
                    'whitespace-pre-wrap break-words',
                    event.level === 'error' ? 'text-red-300' : event.level === 'warning' ? 'text-amber-300' : 'text-cyan-200',
                  )}>
                    [{new Date(event.ts).toLocaleTimeString()}] plan:{event.message}
                  </div>
                ))}
              </div>
            )}
            {logsError ? (
              <div className="text-red-300">{logsError}</div>
            ) : logLines.length > 0 ? (
              logLines.map((line, index) => (
                <div key={`${index}-${line}`} className="whitespace-pre-wrap break-words text-slate-300">
                  {line}
                </div>
              ))
            ) : (
              <div className="text-slate-500">No Host API log lines returned yet.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return (content as Array<{ type?: unknown; text?: unknown }>)
    .filter((block) => block?.type === 'text' && typeof block.text === 'string' && block.text.trim())
    .map((block) => String(block.text))
    .join('\n')
    .trim();
}

interface AgentHarnessDetailsCardProps {
  agent: AgentSummary;
  transcript: any[];
  onRefresh: () => void;
  onUpdate: (updates: {
    paused?: boolean;
    currentTask?: string;
    permissions?: {
      fileWrite?: boolean;
      cmdExecute?: 'always' | 'ask' | 'never';
      webSearch?: boolean;
      sandbox?: boolean;
      fileWriteApproval?: boolean;
      webSearchApproval?: boolean;
      sandboxApproval?: boolean;
      shellApproval?: boolean;
    };
  }) => Promise<void>;
}

function AgentHarnessDetailsCard({
  agent,
  transcript,
  onRefresh,
  onUpdate,
}: AgentHarnessDetailsCardProps) {
  const [taskText, setTaskText] = useState(agent.currentTask || '');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setTaskText(agent.currentTask || '');
  }, [agent.currentTask, agent.id]);

  const handleSaveTask = async () => {
    setUpdating(true);
    try {
      await onUpdate({ currentTask: taskText.trim() });
    } finally {
      setUpdating(false);
    }
  };

  const handleTogglePaused = async () => {
    setUpdating(true);
    try {
      await onUpdate({ paused: !agent.paused });
    } finally {
      setUpdating(false);
    }
  };

  const handlePermissionToggle = async (
    key: 'fileWrite' | 'webSearch' | 'sandbox' | 'fileWriteApproval' | 'webSearchApproval' | 'sandboxApproval' | 'shellApproval',
    value: boolean
  ) => {
    setUpdating(true);
    try {
      const nextPermissions = {
        fileWrite: agent.permissions?.fileWrite ?? true,
        cmdExecute: agent.permissions?.cmdExecute ?? 'ask',
        webSearch: agent.permissions?.webSearch ?? true,
        sandbox: agent.permissions?.sandbox ?? false,
        fileWriteApproval: agent.permissions?.fileWriteApproval ?? false,
        webSearchApproval: agent.permissions?.webSearchApproval ?? false,
        sandboxApproval: agent.permissions?.sandboxApproval ?? false,
        shellApproval: agent.permissions?.shellApproval ?? false,
        [key]: value,
      };
      await onUpdate({ permissions: nextPermissions });
    } finally {
      setUpdating(false);
    }
  };

  const handleCmdExecuteChange = async (value: 'always' | 'ask' | 'never') => {
    setUpdating(true);
    try {
      const nextPermissions = {
        fileWrite: agent.permissions?.fileWrite ?? true,
        cmdExecute: value,
        webSearch: agent.permissions?.webSearch ?? true,
        sandbox: agent.permissions?.sandbox ?? false,
        fileWriteApproval: agent.permissions?.fileWriteApproval ?? false,
        webSearchApproval: agent.permissions?.webSearchApproval ?? false,
        sandboxApproval: agent.permissions?.sandboxApproval ?? false,
        shellApproval: agent.permissions?.shellApproval ?? false,
      };
      await onUpdate({ permissions: nextPermissions });
    } finally {
      setUpdating(false);
    }
  };

  const fileWrite = agent.permissions?.fileWrite ?? true;
  const cmdExecute = agent.permissions?.cmdExecute ?? 'ask';
  const webSearch = agent.permissions?.webSearch ?? true;
  const sandbox = agent.permissions?.sandbox ?? false;
  const fileWriteApproval = agent.permissions?.fileWriteApproval ?? false;
  const webSearchApproval = agent.permissions?.webSearchApproval ?? false;
  const sandboxApproval = agent.permissions?.sandboxApproval ?? false;
  const shellApproval = agent.permissions?.shellApproval ?? false;

  return (
    <div className="flex h-full flex-col min-h-0 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-slate-900/10">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 pb-3 dark:border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">{agent.name}</span>
            <Badge variant="outline" className="text-3xs uppercase font-mono">{agent.role || 'Worker'}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">{agent.description || 'No description set'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn(
            "text-2xs font-bold font-mono tracking-wide uppercase px-2 py-0.5",
            agent.paused
              ? "bg-slate-500/10 text-slate-500 border border-slate-500/20"
              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse"
          )}>
            {agent.paused ? "Paused" : "Active"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-semibold"
            onClick={() => void handleTogglePaused()}
            disabled={updating}
          >
            {agent.paused ? "Resume Agent" : "Pause Agent"}
          </Button>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-1 lg:grid-cols-3 gap-4 border-b border-slate-200/60 py-4 dark:border-white/5">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 text-cyan-500" />
            Current Agent Task / Goal
          </span>
          <textarea
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="Assign a task or system goal to this agent..."
            rows={4}
            className="w-full resize-none rounded-md border border-slate-200 bg-background px-3 py-2 text-xs outline-none focus:border-cyan-400 dark:border-white/10"
          />
          <Button
            size="sm"
            className="h-8 text-xs self-end font-semibold px-4"
            onClick={() => void handleSaveTask()}
            disabled={updating || taskText.trim() === (agent.currentTask || '')}
          >
            {updating ? "Saving..." : "Save Task"}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
            Permissions & Approval Gates
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/20 pb-1.5 dark:border-white/5">
              <span className="text-muted-foreground truncate">File Write</span>
              <Switch
                checked={fileWrite}
                onCheckedChange={(val) => void handlePermissionToggle('fileWrite', val)}
                disabled={updating}
              />
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/20 pb-1.5 dark:border-white/5">
              <span className="text-muted-foreground truncate">Write Gate</span>
              <Switch
                checked={fileWriteApproval}
                onCheckedChange={(val) => void handlePermissionToggle('fileWriteApproval', val)}
                disabled={updating}
              />
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/20 pb-1.5 dark:border-white/5">
              <span className="text-muted-foreground truncate">Web Search</span>
              <Switch
                checked={webSearch}
                onCheckedChange={(val) => void handlePermissionToggle('webSearch', val)}
                disabled={updating}
              />
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/20 pb-1.5 dark:border-white/5">
              <span className="text-muted-foreground truncate">Search Gate</span>
              <Switch
                checked={webSearchApproval}
                onCheckedChange={(val) => void handlePermissionToggle('webSearchApproval', val)}
                disabled={updating}
              />
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/20 pb-1.5 dark:border-white/5">
              <span className="text-muted-foreground truncate">Sandbox</span>
              <Switch
                checked={sandbox}
                onCheckedChange={(val) => void handlePermissionToggle('sandbox', val)}
                disabled={updating}
              />
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/20 pb-1.5 dark:border-white/5">
              <span className="text-muted-foreground truncate">Sandbox Gate</span>
              <Switch
                checked={sandboxApproval}
                onCheckedChange={(val) => void handlePermissionToggle('sandboxApproval', val)}
                disabled={updating}
              />
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/20 pb-1.5 dark:border-white/5">
              <span className="text-muted-foreground truncate">Shell Exec</span>
              <select
                value={cmdExecute}
                onChange={(e) => void handleCmdExecuteChange(e.target.value as 'always' | 'ask' | 'never')}
                disabled={updating}
                className="rounded border border-slate-200 bg-background px-1 py-0.5 text-3xs font-mono outline-none focus:border-cyan-400 dark:border-white/10"
              >
                <option value="always">Always</option>
                <option value="ask">Ask</option>
                <option value="never">Never</option>
              </select>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/20 pb-1.5 dark:border-white/5">
              <span className="text-muted-foreground truncate">Shell Gate</span>
              <Switch
                checked={shellApproval}
                onCheckedChange={(val) => void handlePermissionToggle('shellApproval', val)}
                disabled={updating}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-3xs text-muted-foreground mt-1">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">Model: {agent.modelDisplay}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <Boxes className="h-3.5 w-3.5 text-cyan-500" />
            Active MCP Servers
          </span>
          <div className="flex flex-col gap-2 max-h-[145px] overflow-y-auto pr-1 text-3xs font-mono">
            {agent.mcpServers && agent.mcpServers.length > 0 ? (
              agent.mcpServers.map((server, idx) => (
                <div key={idx} className="rounded border border-slate-200 bg-slate-100/50 p-2 dark:border-white/5 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between font-bold text-cyan-600 dark:text-cyan-400">
                    <span className="truncate">{server.name}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="Active" />
                  </div>
                  <div className="mt-1 text-muted-foreground truncate" title={`${server.command} ${(server.args || []).join(' ')}`}>
                    <span className="text-slate-400">Cmd:</span> {server.command} {server.args && server.args.length > 0 && server.args.join(' ')}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic text-center py-6">
                No MCP servers configured. Bind servers in Visual Builder.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col min-h-0 pt-3">
        <div className="flex shrink-0 items-center justify-between pb-2">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-cyan-500" />
            Agent Session Transcript Logs
          </span>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-6 text-3xs">
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-3xs leading-relaxed text-slate-300 dark:border-white/5 dark:bg-slate-950">
          {transcript.length > 0 ? (
            transcript.map((msg, index) => {
              const role = typeof msg.role === 'string' ? msg.role : 'system';
              const text = extractMessageText(msg.content);
              return (
                <div key={index} className="mb-2">
                  <span className={cn(
                    "font-bold",
                    role === 'user' ? "text-sky-300" : role === 'assistant' ? "text-cyan-400" : "text-amber-300"
                  )}>
                    [{role.toUpperCase()}]
                  </span>{" "}
                  <span>{text}</span>
                </div>
              );
            })
          ) : (
            <div className="text-slate-500 italic text-center pt-8">No transcript messages found for this agent session. Send a message to populate logs.</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface KanbanHarnessProps {
  tasks: SpatialTask[];
  agents: AgentSummary[];
  plans: any[];
  onClose: () => void;
  onCreateTask: (title: string, description?: string, options?: any) => Promise<void>;
  onUpdateTask: (taskId: string, updates: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

function KanbanHarness({
  tasks,
  agents,
  plans,
  onClose,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
}: KanbanHarnessProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [newFilePath, setNewFilePath] = useState('');
  const [busy, setBusy] = useState(false);

  // Edit Link State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editAgent, setEditAgent] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editFile, setEditFile] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      await onCreateTask(newTitle.trim(), newDesc.trim(), {
        status: newStatus,
        agentId: selectedAgent || undefined,
        planId: selectedPlan || undefined,
        filePath: newFilePath.trim() || undefined,
      });
      setNewTitle('');
      setNewDesc('');
      setNewStatus('todo');
      setSelectedAgent('');
      setSelectedPlan('');
      setNewFilePath('');
      setShowCreate(false);
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (taskId: string, currentStatus: 'todo' | 'in_progress' | 'done', direction: 'left' | 'right') => {
    let nextStatus: 'todo' | 'in_progress' | 'done' = currentStatus;
    if (currentStatus === 'todo' && direction === 'right') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress' && direction === 'right') nextStatus = 'done';
    else if (currentStatus === 'in_progress' && direction === 'left') nextStatus = 'todo';
    else if (currentStatus === 'done' && direction === 'left') nextStatus = 'in_progress';

    if (nextStatus !== currentStatus) {
      await onUpdateTask(taskId, { status: nextStatus });
    }
  };

  const handleOpenLinkEdit = (task: SpatialTask) => {
    setEditingTaskId(task.id);
    setEditAgent(task.agentId || '');
    setEditPlan(task.planId || '');
    setEditFile(task.filePath || '');
  };

  const handleSaveLinks = async (taskId: string) => {
    setBusy(true);
    try {
      await onUpdateTask(taskId, {
        agentId: editAgent || null,
        planId: editPlan || null,
        filePath: editFile.trim() || null,
      });
      setEditingTaskId(null);
    } finally {
      setBusy(false);
    }
  };

  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="flex h-full flex-col min-h-0 p-4">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 pb-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
          <div>
            <h2 className="text-sm font-semibold">Project Kanban Board</h2>
            <p className="text-3xs text-muted-foreground">Manage active workspace tasks, track progress, and map dependencies</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
            className="h-8 text-xs font-semibold px-3 bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adaugă Task
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs font-semibold">
            ← Back to Map
          </Button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="shrink-0 mt-3 p-3 rounded-lg border border-cyan-200/70 bg-cyan-50/20 dark:border-cyan-400/20 dark:bg-cyan-400/5 grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-3xs font-semibold text-muted-foreground uppercase">Titlu Task</label>
            <input
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Rezolvă erorile din STT"
              className="h-8 rounded-md border border-slate-200 bg-background px-2.5 text-xs outline-none focus:border-cyan-400 dark:border-white/10"
            />
            <label className="text-3xs font-semibold text-muted-foreground uppercase mt-2">Descriere</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descrie detaliile..."
              rows={2}
              className="resize-none rounded-md border border-slate-200 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-cyan-400 dark:border-white/10"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-3xs font-semibold text-muted-foreground uppercase">Asignează Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-background px-2 text-xs outline-none focus:border-cyan-400 dark:border-white/10"
            >
              <option value="">Fără agent (Unassigned)</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <label className="text-3xs font-semibold text-muted-foreground uppercase mt-2">Asignează Plan</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-background px-2 text-xs outline-none focus:border-cyan-400 dark:border-white/10"
            >
              <option value="">Fără plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 justify-between">
            <div>
              <label className="text-3xs font-semibold text-muted-foreground uppercase">Fișier Asociat</label>
              <input
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="Ex: app/src/App.tsx"
                className="h-8 w-full rounded-md border border-slate-200 bg-background px-2.5 text-xs outline-none focus:border-cyan-400 dark:border-white/10"
              />
              <div className="flex gap-4 mt-3">
                <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newStatus"
                    checked={newStatus === 'todo'}
                    onChange={() => setNewStatus('todo')}
                  /> Todo
                </label>
                <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newStatus"
                    checked={newStatus === 'in_progress'}
                    onChange={() => setNewStatus('in_progress')}
                  /> În Lucru
                </label>
                <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newStatus"
                    checked={newStatus === 'done'}
                    onChange={() => setNewStatus('done')}
                  /> Finalizat
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)} className="h-7 text-3xs">Cancel</Button>
              <Button type="submit" size="sm" disabled={busy} className="h-7 text-3xs bg-cyan-600 hover:bg-cyan-700 text-white">
                {busy ? 'Se salvează...' : 'Adaugă'}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-3 gap-3 pt-3">
        {/* TODO COLUMN */}
        <div className="flex flex-col rounded-lg border border-slate-200/60 bg-slate-50/40 p-2.5 dark:border-white/5 dark:bg-slate-900/5 min-h-0">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/40 pb-2 mb-2 dark:border-white/5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">De Făcut ({todoTasks.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {todoTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                agents={agents}
                plans={plans}
                editingTaskId={editingTaskId}
                editAgent={editAgent}
                editPlan={editPlan}
                editFile={editFile}
                busy={busy}
                onSetEditAgent={setEditAgent}
                onSetEditPlan={setEditPlan}
                onSetEditFile={setEditFile}
                onOpenLinks={handleOpenLinkEdit}
                onSaveLinks={handleSaveLinks}
                onCancelLinks={() => setEditingTaskId(null)}
                onMove={(dir) => void handleMove(t.id, t.status, dir)}
                onDelete={() => void onDeleteTask(t.id)}
              />
            ))}
            {todoTasks.length === 0 && (
              <div className="text-3xs text-muted-foreground italic text-center py-6">Niciun task.</div>
            )}
          </div>
        </div>

        {/* IN PROGRESS COLUMN */}
        <div className="flex flex-col rounded-lg border border-cyan-200/30 bg-cyan-50/5 p-2.5 dark:border-cyan-400/5 dark:bg-cyan-400/5 min-h-0">
          <div className="flex shrink-0 items-center justify-between border-b border-cyan-200/20 pb-2 mb-2 dark:border-cyan-400/10">
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
              În Lucru ({inProgressTasks.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {inProgressTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                agents={agents}
                plans={plans}
                editingTaskId={editingTaskId}
                editAgent={editAgent}
                editPlan={editPlan}
                editFile={editFile}
                busy={busy}
                onSetEditAgent={setEditAgent}
                onSetEditPlan={setEditPlan}
                onSetEditFile={setEditFile}
                onOpenLinks={handleOpenLinkEdit}
                onSaveLinks={handleSaveLinks}
                onCancelLinks={() => setEditingTaskId(null)}
                onMove={(dir) => void handleMove(t.id, t.status, dir)}
                onDelete={() => void onDeleteTask(t.id)}
              />
            ))}
            {inProgressTasks.length === 0 && (
              <div className="text-3xs text-muted-foreground italic text-center py-6">Nu se lucrează la niciun task în acest moment.</div>
            )}
          </div>
        </div>

        {/* DONE COLUMN */}
        <div className="flex flex-col rounded-lg border border-emerald-200/30 bg-emerald-50/5 p-2.5 dark:border-emerald-400/5 dark:bg-emerald-400/5 min-h-0">
          <div className="flex shrink-0 items-center justify-between border-b border-emerald-200/20 pb-2 mb-2 dark:border-emerald-400/10">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Finalizate ({doneTasks.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {doneTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                agents={agents}
                plans={plans}
                editingTaskId={editingTaskId}
                editAgent={editAgent}
                editPlan={editPlan}
                editFile={editFile}
                busy={busy}
                onSetEditAgent={setEditAgent}
                onSetEditPlan={setEditPlan}
                onSetEditFile={setEditFile}
                onOpenLinks={handleOpenLinkEdit}
                onSaveLinks={handleSaveLinks}
                onCancelLinks={() => setEditingTaskId(null)}
                onMove={(dir) => void handleMove(t.id, t.status, dir)}
                onDelete={() => void onDeleteTask(t.id)}
              />
            ))}
            {doneTasks.length === 0 && (
              <div className="text-3xs text-muted-foreground italic text-center py-6">Niciun task finalizat în această sesiune.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: SpatialTask;
  agents: AgentSummary[];
  plans: any[];
  editingTaskId: string | null;
  editAgent: string;
  editPlan: string;
  editFile: string;
  busy: boolean;
  onSetEditAgent: (val: string) => void;
  onSetEditPlan: (val: string) => void;
  onSetEditFile: (val: string) => void;
  onOpenLinks: (task: SpatialTask) => void;
  onSaveLinks: (taskId: string) => void;
  onCancelLinks: () => void;
  onMove: (direction: 'left' | 'right') => void;
  onDelete: () => void;
}

function TaskCard({
  task,
  agents,
  plans,
  editingTaskId,
  editAgent,
  editPlan,
  editFile,
  busy,
  onSetEditAgent,
  onSetEditPlan,
  onSetEditFile,
  onOpenLinks,
  onSaveLinks,
  onCancelLinks,
  onMove,
  onDelete,
}: TaskCardProps) {
  const isEditing = editingTaskId === task.id;
  const agentName = agents.find((a) => a.id === task.agentId)?.name || task.agentId;
  const planTitle = plans.find((p) => p.id === task.planId)?.title || task.planId;

  return (
    <div className="rounded-lg border border-slate-200 bg-background p-3 shadow-2xs hover:border-slate-300 dark:border-white/5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-foreground leading-normal">{task.title}</span>
        <button
          type="button"
          onClick={onDelete}
          className="text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded transition-colors"
          title="Șterge task"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {task.description && (
        <p className="mt-1 text-3xs text-muted-foreground leading-relaxed">{task.description}</p>
      )}

      {isEditing ? (
        <div className="mt-3 p-2 rounded border border-border bg-slate-50/50 dark:bg-white/5 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-4xs font-semibold text-slate-400 uppercase">Agent</span>
            <select
              value={editAgent}
              onChange={(e) => onSetEditAgent(e.target.value)}
              className="h-6 rounded border bg-background px-1 text-4xs outline-none"
            >
              <option value="">Fără agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xs font-semibold text-slate-400 uppercase">Plan</span>
            <select
              value={editPlan}
              onChange={(e) => onSetEditPlan(e.target.value)}
              className="h-6 rounded border bg-background px-1 text-4xs outline-none"
            >
              <option value="">Fără plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xs font-semibold text-slate-400 uppercase">Fișier</span>
            <input
              value={editFile}
              onChange={(e) => onSetEditFile(e.target.value)}
              placeholder="e.g. app/src/App.tsx"
              className="h-6 rounded border bg-background px-1.5 text-4xs outline-none"
            />
          </div>
          <div className="flex gap-1.5 justify-end mt-1">
            <Button size="sm" variant="outline" className="h-5 px-1.5 text-4xs" onClick={onCancelLinks}>
              Cancel
            </Button>
            <Button size="sm" className="h-5 px-2 text-4xs bg-cyan-600 hover:bg-cyan-700 text-white" disabled={busy} onClick={() => onSaveLinks(task.id)}>
              {busy ? 'Save...' : 'Salvează'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {task.agentId && (
            <Badge variant="outline" className="text-4xs font-mono py-px px-1.5 border-cyan-200/50 bg-cyan-50/20 text-cyan-700 dark:border-cyan-400/10 dark:text-cyan-300">
              <Bot className="h-2.5 w-2.5 mr-0.5 inline" /> {agentName}
            </Badge>
          )}
          {task.planId && (
            <Badge variant="outline" className="text-4xs font-mono py-px px-1.5 border-purple-200/50 bg-purple-50/20 text-purple-700 dark:border-purple-400/10 dark:text-purple-300">
              <ClipboardList className="h-2.5 w-2.5 mr-0.5 inline" /> {planTitle}
            </Badge>
          )}
          {task.filePath && (
            <Badge variant="outline" className="text-4xs font-mono py-px px-1.5 border-amber-200/50 bg-amber-50/20 text-amber-700 dark:border-amber-400/10 dark:text-amber-300" title={task.filePath}>
              <FileText className="h-2.5 w-2.5 mr-0.5 inline" /> {task.filePath.split('/').pop()}
            </Badge>
          )}
          {(!task.agentId && !task.planId && !task.filePath) && (
            <button
              type="button"
              onClick={() => onOpenLinks(task)}
              className="text-4xs text-slate-400 hover:text-cyan-500 font-medium underline flex items-center gap-0.5 cursor-pointer"
            >
              <Link className="h-2.5 w-2.5" /> Asociază Legături
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-white/5">
        <span className="text-4xs text-slate-400 font-mono">
          {new Date(task.updatedAt).toLocaleTimeString()}
        </span>
        <div className="flex gap-1.5">
          {(!isEditing && (task.agentId || task.planId || task.filePath)) && (
            <button
              type="button"
              onClick={() => onOpenLinks(task)}
              className="text-4xs text-slate-400 hover:text-cyan-500 font-medium border border-border px-1.5 py-0.5 rounded bg-slate-50 dark:bg-white/5"
            >
              Edit Link
            </button>
          )}
          <div className="flex rounded border border-border bg-slate-50 dark:bg-white/5 overflow-hidden">
            {task.status !== 'todo' && (
              <button
                type="button"
                onClick={() => onMove('left')}
                className="hover:bg-slate-200 dark:hover:bg-white/10 px-1 py-0.5 border-r border-border transition-colors cursor-pointer"
                title="Mută la stânga"
              >
                <ArrowLeft className="h-3 w-3" />
              </button>
            )}
            {task.status !== 'done' && (
              <button
                type="button"
                onClick={() => onMove('right')}
                className="hover:bg-slate-200 dark:hover:bg-white/10 px-1 py-0.5 transition-colors cursor-pointer"
                title="Mută la dreapta"
              >
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

