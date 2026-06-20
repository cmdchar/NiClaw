import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileText,
  FolderGit2,
  GitBranch,
  RefreshCw,
  Server,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { hostApiFetch } from '@/lib/host-api';
import { cn } from '@/lib/utils';
import { TaskWorkspacePanel } from './components/TaskWorkspacePanel';
import { Task } from '@/types/orchestrator-workspace';

interface GitStatusSnapshot {
  isGit: boolean;
  branch?: string;
  dirty?: boolean;
  changedFiles?: number;
  lastCommit?: string;
  error?: string;
}

interface DevProjectSnapshot {
  name: string;
  path: string;
  markers: string[];
  kind: string;
  git: GitStatusSnapshot;
}

interface WorkspaceRootScan {
  path: string;
  exists: boolean;
  error?: string;
}

interface DevWorkspaceScanResponse {
  success: boolean;
  generatedAt: string;
  roots: WorkspaceRootScan[];
  projects: DevProjectSnapshot[];
  error?: string;
}

interface DevVaultFolderStatus {
  name: string;
  path: string;
  exists: boolean;
}

interface CommandCenterStatus {
  generatedAt: string;
  host: {
    platform: string;
    hostname: string;
    uptimeSeconds: number;
    nodeVersion: string;
    electron: boolean;
    cpuCount: number;
    memoryTotalBytes: number;
    memoryFreeBytes: number;
  };
  gateway: {
    status: unknown;
    health: unknown;
  };
  openclaw: unknown;
  vault: {
    rootPath: string;
    statePath: string;
    folders: DevVaultFolderStatus[];
    agentRules: DevVaultFolderStatus[];
  };
  logsDir: string;
}

interface CommandCenterStatusResponse {
  success: boolean;
  status?: CommandCenterStatus;
  error?: string;
}

interface CommandCenterTask {
  line: number;
  text: string;
  checked: boolean;
}

interface CommandCenterTasksResponse {
  success: boolean;
  path?: string;
  exists?: boolean;
  tasks: CommandCenterTask[];
  error?: string;
}

interface CommandCenterLog {
  name: string;
  path: string;
  updatedAt: string;
  preview: string;
}

interface CommandCenterLogsResponse {
  success: boolean;
  logs: CommandCenterLog[];
  error?: string;
}

interface CommandCenterReport {
  name: string;
  path: string;
  updatedAt: string;
  size: number;
}

interface CommandCenterReportsResponse {
  success: boolean;
  reports: CommandCenterReport[];
  error?: string;
}

interface CreateReportResponse {
  success: boolean;
  report?: {
    path: string;
  };
  error?: string;
}

type LoadResult<T> = {
  data: T | null;
  error: string | null;
};

async function loadEndpoint<T>(path: string): Promise<LoadResult<T>> {
  try {
    return { data: await hostApiFetch<T>(path), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringField(value: unknown, field: string): string | undefined {
  const candidate = asRecord(value)[field];
  return typeof candidate === 'string' ? candidate : undefined;
}

function boolField(value: unknown, field: string): boolean | undefined {
  const candidate = asRecord(value)[field];
  return typeof candidate === 'boolean' ? candidate : undefined;
}

function formatDate(value?: string): string {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatBytes(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function compactJson(value: unknown): string {
  if (value == null) return 'n/a';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function statusBadgeClass(state?: string, ok?: boolean): string {
  if (ok || state === 'running' || state === 'online' || state === 'ready') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (state === 'starting' || state === 'degraded' || state === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  if (state === 'stopped' || state === 'offline' || ok === false || state === 'error') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  return 'border-border bg-muted/40 text-muted-foreground';
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="flex min-h-[104px] items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tracking-normal">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={detail}>
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[96px] items-center justify-center rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function CommandCenter() {
  const [statusResponse, setStatusResponse] = useState<CommandCenterStatusResponse | null>(null);
  const [projectsResponse, setProjectsResponse] = useState<DevWorkspaceScanResponse | null>(null);
  const [tasksResponse, setTasksResponse] = useState<CommandCenterTasksResponse | null>(null);
  const [orchestratorTasks, setOrchestratorTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [logsResponse, setLogsResponse] = useState<CommandCenterLogsResponse | null>(null);
  const [reportsResponse, setReportsResponse] = useState<CommandCenterReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const fetchCommandCenter = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    setErrors([]);

    const [statusResult, projectsResult, tasksResult, orchTasksResult, logsResult, reportsResult] = await Promise.all([
      loadEndpoint<CommandCenterStatusResponse>('/api/command-center/status'),
      loadEndpoint<DevWorkspaceScanResponse>('/api/command-center/projects'),
      loadEndpoint<CommandCenterTasksResponse>('/api/command-center/tasks'),
      loadEndpoint<{ tasks: Task[] }>('/api/orchestrator/tasks'),
      loadEndpoint<CommandCenterLogsResponse>('/api/command-center/logs'),
      loadEndpoint<CommandCenterReportsResponse>('/api/command-center/reports'),
    ]);

    const nextErrors = [
      statusResult.error || statusResult.data?.error,
      projectsResult.error || projectsResult.data?.error,
      tasksResult.error || tasksResult.data?.error,
      orchTasksResult.error,
      logsResult.error || logsResult.data?.error,
      reportsResult.error || reportsResult.data?.error,
    ].filter((message): message is string => Boolean(message));

    if (statusResult.data) setStatusResponse(statusResult.data);
    if (projectsResult.data) setProjectsResponse(projectsResult.data);
    if (tasksResult.data) setTasksResponse(tasksResult.data);
    if (orchTasksResult.data) setOrchestratorTasks(orchTasksResult.data.tasks);
    if (logsResult.data) setLogsResponse(logsResult.data);
    if (reportsResult.data) setReportsResponse(reportsResult.data);
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void fetchCommandCenter();
  }, [fetchCommandCenter]);

  const createReport = async () => {
    setReportBusy(true);
    try {
      const response = await hostApiFetch<CreateReportResponse>('/api/command-center/report', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!response.success) {
        throw new Error(response.error || 'Report generation failed');
      }
      toast.success('Command Center report generated');
      await fetchCommandCenter();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setReportBusy(false);
    }
  };

  const status = statusResponse?.status ?? null;
  const projects = projectsResponse?.projects ?? [];
  const tasks = tasksResponse?.tasks ?? [];
  const logs = logsResponse?.logs ?? [];
  const reports = reportsResponse?.reports ?? [];

  const gitProjects = useMemo(() => projects.filter((project) => project.git.isGit), [projects]);
  const dirtyProjects = useMemo(() => gitProjects.filter((project) => project.git.dirty), [gitProjects]);
  const missingVaultFolders = status?.vault.folders.filter((folder) => !folder.exists) ?? [];
  const missingAgentRules = status?.vault.agentRules.filter((rule) => !rule.exists) ?? [];
  const gatewayState = stringField(status?.gateway.status, 'state') || stringField(status?.gateway.status, 'status') || 'unknown';
  const gatewayReady = boolField(status?.gateway.status, 'gatewayReady') ?? boolField(status?.gateway.health, 'ok');
  const openclawState = stringField(status?.openclaw, 'state') || stringField(status?.openclaw, 'status') || 'unknown';
  const activeTasks = tasks.filter((task) => !task.checked);

  if (loading && !status && projects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading Command Center...
        </div>
      </div>
    );
  }

  if (selectedTaskId) {
    return <TaskWorkspacePanel taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-normal">Dev Command Center</h1>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            Last scan: {formatDate(status?.generatedAt || projectsResponse?.generatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={fetchCommandCenter} disabled={refreshing || reportBusy}>
            <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={createReport} disabled={reportBusy || refreshing}>
            <FileText className="mr-2 h-4 w-4" />
            Report
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 flex gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 space-y-1">
            {errors.map((error, index) => (
              <p key={`${error}-${index}`} className="break-words">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Server className="h-4 w-4" />}
          label="Host"
          value={status?.host.hostname || 'unknown'}
          detail={`${status?.host.platform || 'n/a'} · ${status?.host.cpuCount ?? 0} CPU · ${formatBytes(status?.host.memoryFreeBytes)} free`}
        />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Gateway"
          value={gatewayState}
          detail={gatewayReady === undefined ? compactJson(status?.gateway.health) : `ready=${String(gatewayReady)}`}
        />
        <MetricCard
          icon={<FolderGit2 className="h-4 w-4" />}
          label="Projects"
          value={String(projects.length)}
          detail={`${gitProjects.length} git repos · ${dirtyProjects.length} dirty`}
        />
        <MetricCard
          icon={<Bot className="h-4 w-4" />}
          label="Vault"
          value={`${status?.vault.folders.filter((folder) => folder.exists).length ?? 0}/${status?.vault.folders.length ?? 0}`}
          detail={`${missingAgentRules.length} missing agent rule files`}
        />
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="space-y-4">
            <Card className="rounded-lg shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base tracking-normal">Detected Workspaces</CardTitle>
                <Badge variant="outline">{projects.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {projects.length === 0 ? (
                  <EmptyState text="No development workspaces detected." />
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <div className="grid grid-cols-[minmax(160px,1.1fr)_120px_120px_90px] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                      <span>Project</span>
                      <span>Type</span>
                      <span>Branch</span>
                      <span className="text-right">Changes</span>
                    </div>
                    <div className="max-h-[390px] overflow-y-auto">
                      {projects.map((project) => (
                        <div
                          key={project.path}
                          className="grid grid-cols-[minmax(160px,1.1fr)_120px_120px_90px] gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium" title={project.name}>
                              {project.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground" title={project.path}>
                              {project.path}
                            </div>
                          </div>
                          <span className="truncate text-muted-foreground">{project.kind}</span>
                          <span className="truncate text-muted-foreground">
                            {project.git.branch || (project.git.isGit ? 'unknown' : 'not git')}
                          </span>
                          <span className={cn('text-right tabular-nums', project.git.dirty && 'text-amber-300')}>
                            {project.git.isGit ? project.git.changedFiles ?? 0 : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base tracking-normal">Git Monitor</CardTitle>
                <Badge className={statusBadgeClass(dirtyProjects.length > 0 ? 'warning' : 'ready')}>
                  {dirtyProjects.length > 0 ? `${dirtyProjects.length} dirty` : 'clean'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {gitProjects.length === 0 ? (
                  <EmptyState text="No git repositories found in the scanned roots." />
                ) : (
                  gitProjects.slice(0, 12).map((project) => (
                    <div key={project.path} className="flex items-center gap-3 rounded-md border p-3">
                      <GitBranch className={cn('h-4 w-4 shrink-0', project.git.dirty ? 'text-amber-300' : 'text-emerald-300')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">{project.name}</span>
                          <Badge variant="outline" className="shrink-0">
                            {project.git.branch || 'unknown'}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground" title={project.git.lastCommit || project.path}>
                          {project.git.error || project.git.lastCommit || project.path}
                        </p>
                      </div>
                      <div className="w-16 shrink-0 text-right text-sm tabular-nums">
                        {project.git.changedFiles ?? 0}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-lg shadow-none">
              <CardHeader className="space-y-0 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base tracking-normal">Runtime</CardTitle>
                  <Badge className={statusBadgeClass(gatewayState, gatewayReady)}>
                    {gatewayState}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                  <span className="text-muted-foreground">OpenClaw</span>
                  <span className="truncate" title={compactJson(status?.openclaw)}>
                    {openclawState}
                  </span>
                  <span className="text-muted-foreground">Node</span>
                  <span>{status?.host.nodeVersion || 'n/a'}</span>
                  <span className="text-muted-foreground">Electron</span>
                  <span>{status?.host.electron ? 'yes' : 'no'}</span>
                  <span className="text-muted-foreground">Logs</span>
                  <span className="truncate" title={status?.logsDir}>
                    {status?.logsDir || 'n/a'}
                  </span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Vault root</span>
                    <span>{missingVaultFolders.length} missing folders</span>
                  </div>
                  <p className="truncate rounded-md bg-muted/40 px-2 py-1 text-xs" title={status?.vault.rootPath}>
                    {status?.vault.rootPath || 'n/a'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base tracking-normal">Agent Rules</CardTitle>
                <Badge className={statusBadgeClass(missingAgentRules.length > 0 ? 'warning' : 'ready')}>
                  {missingAgentRules.length > 0 ? 'missing' : 'ready'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {(status?.vault.agentRules ?? []).map((rule) => (
                  <div key={rule.path} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    {rule.exists ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                    )}
                    <span className="min-w-0 flex-1 truncate" title={rule.path}>
                      {rule.name}
                    </span>
                    <Badge variant="outline">{rule.exists ? 'present' : 'missing'}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base tracking-normal">Agent Tasks</CardTitle>
                <Badge variant="outline">{orchestratorTasks.length} total</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {orchestratorTasks.length === 0 ? (
                  <EmptyState text="No agent tasks submitted." />
                ) : (
                  orchestratorTasks.slice(0, 8).map((task) => (
                    <div 
                      key={task.id} 
                      className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{task.title}</span>
                        <Badge variant={task.status === 'failed' ? 'destructive' : 'outline'} className="text-[10px]">
                          {task.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{task.targetProject}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base tracking-normal">Inbox Tasks</CardTitle>
                <Badge variant="outline">{activeTasks.length} open</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.length === 0 ? (
                  <EmptyState text="No tasks found in the Command Center inbox." />
                ) : (
                  tasks.slice(0, 5).map((task) => (
                    <div key={`${task.line}-${task.text}`} className="flex gap-2 rounded-md border px-3 py-2 text-sm">
                      <span className={cn('mt-0.5 h-4 w-4 shrink-0 rounded border', task.checked && 'border-emerald-400 bg-emerald-400/20')} />
                      <span className={cn('min-w-0 flex-1 break-words', task.checked && 'text-muted-foreground line-through')}>
                        {task.text}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base tracking-normal">Logs</CardTitle>
                <Badge variant="outline">{logs.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {logs.length === 0 ? (
                  <EmptyState text="No Host API logs were found." />
                ) : (
                  logs.slice(0, 5).map((log) => (
                    <div key={log.path} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-medium" title={log.path}>
                          {log.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(log.updatedAt)}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 break-words text-xs text-muted-foreground">
                        {log.preview || 'No preview available.'}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base tracking-normal">Reports</CardTitle>
                <Badge variant="outline">{reports.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {reports.length === 0 ? (
                  <EmptyState text="No Command Center reports generated yet." />
                ) : (
                  reports.slice(0, 6).map((report) => (
                    <div key={report.path} className="rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate font-medium" title={report.path}>
                          {report.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(report.size)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(report.updatedAt)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
