import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import { dirname, join } from 'node:path';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { getDataDir } from '../../utils/paths';
import { runOpenClawDoctor, runOpenClawDoctorFix } from '../../utils/openclaw-doctor';
import { runBuildValidation, type BuildValidationProfile } from '../../utils/build-validation';
import { runShellCommand } from '../../utils/shell-execution';
import { syncBoardSnapshot } from './board';
import { getPort } from '../../utils/config';

type PlanStepKind = 'manual' | 'note' | 'host_api' | 'shell' | 'browser' | 'board_sync' | 'doctor_diagnose' | 'doctor_fix' | 'gateway_restart' | 'build_validation';
type PlanStatus = 'draft' | 'ready' | 'running' | 'completed' | 'blocked' | 'failed';
type PlanRunStatus = 'completed' | 'blocked' | 'failed';
type PlanEventLevel = 'info' | 'warning' | 'error';
type PlanApprovalAction = 'approve' | 'reject';
type PlanApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected' | 'consumed';

interface SpatialPlanStep {
  id: string;
  kind: PlanStepKind;
  title: string;
  detail?: string;
  status: 'pending' | 'completed' | 'blocked' | 'failed';
  requiresApproval: boolean;
  approvalStatus: PlanApprovalStatus;
  approvalUpdatedAt?: string;
  approvalNote?: string;
  validationProfile?: BuildValidationProfile;
}

interface SpatialPlanApproval {
  id: string;
  planId: string;
  stepId: string;
  action: PlanApprovalAction;
  ts: string;
  note?: string;
}

interface SpatialPlanEvent {
  id: string;
  runId: string;
  planId: string;
  stepId?: string;
  ts: string;
  level: PlanEventLevel;
  message: string;
}

interface SpatialPlanRun {
  id: string;
  planId: string;
  status: PlanRunStatus;
  startedAt: string;
  finishedAt: string;
  events: SpatialPlanEvent[];
}

interface SpatialPlan {
  id: string;
  title: string;
  objective: string;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  steps: SpatialPlanStep[];
  runs: SpatialPlanRun[];
  approvals: SpatialPlanApproval[];
}

interface PlansStore {
  plans: SpatialPlan[];
}

const ALL_STEP_KINDS: PlanStepKind[] = ['manual', 'note', 'host_api', 'shell', 'browser', 'board_sync', 'doctor_diagnose', 'doctor_fix', 'gateway_restart', 'build_validation'];
const SUPPORTED_EXECUTORS = new Set<PlanStepKind>(['manual', 'note', 'board_sync', 'doctor_diagnose', 'doctor_fix', 'gateway_restart', 'build_validation', 'shell', 'host_api', 'browser']);
const APPROVAL_REQUIRED_EXECUTORS = new Set<PlanStepKind>(['doctor_fix', 'gateway_restart', 'build_validation', 'shell']);

function plansPath(): string {
  return join(getDataDir(), 'spatial', 'plans.json');
}

async function readPlansStore(): Promise<PlansStore> {
  try {
    const raw = await readFile(plansPath(), 'utf8');
    const parsed = JSON.parse(raw) as PlansStore;
    return {
      plans: Array.isArray(parsed.plans)
        ? parsed.plans.map((plan) => ({
          ...plan,
          steps: Array.isArray(plan.steps) ? plan.steps.map(normalizeStep) : [],
          runs: Array.isArray(plan.runs) ? plan.runs : [],
          approvals: Array.isArray(plan.approvals) ? plan.approvals : [],
        }))
        : [],
    };
  } catch {
    return { plans: [] };
  }
}

async function writePlansStore(store: PlansStore): Promise<void> {
  const filePath = plansPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function normalizeStep(input: Partial<SpatialPlanStep>, index: number): SpatialPlanStep {
  const kind = input.kind && ALL_STEP_KINDS.includes(input.kind)
    ? input.kind
    : 'manual';
  const requiresApproval = APPROVAL_REQUIRED_EXECUTORS.has(kind);
  return {
    id: input.id || newId('step'),
    kind,
    title: typeof input.title === 'string' && input.title.trim()
      ? input.title.trim()
      : `Step ${index + 1}`,
    detail: typeof input.detail === 'string' ? input.detail.trim() : undefined,
    status: input.status || 'pending',
    requiresApproval,
    approvalStatus: requiresApproval
      ? input.approvalStatus === 'approved' || input.approvalStatus === 'rejected' || input.approvalStatus === 'consumed'
        ? input.approvalStatus
        : 'pending'
      : 'not_required',
    approvalUpdatedAt: requiresApproval ? input.approvalUpdatedAt : undefined,
    approvalNote: requiresApproval && typeof input.approvalNote === 'string' ? input.approvalNote.trim() : undefined,
    validationProfile: kind === 'build_validation' && input.validationProfile === 'typecheck'
      ? input.validationProfile
      : undefined,
  };
}

function buildSnapshot(store: PlansStore) {
  return {
    success: true,
    plans: store.plans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    storage: {
      path: plansPath(),
    },
  };
}

async function runPlan(plan: SpatialPlan, ctx: HostApiContext): Promise<SpatialPlanRun> {
  const startedAt = nowIso();
  const runId = newId('run');
  const events: SpatialPlanEvent[] = [];
  let hasBlockedStep = false;
  let hasFailedStep = false;

  if (plan.steps.length === 0) {
    hasBlockedStep = true;
    events.push({
      id: newId('event'),
      runId,
      planId: plan.id,
      ts: nowIso(),
      level: 'warning',
      message: 'Plan has no steps. Add executable manual/note steps before running.',
    });
  }

  const nextSteps: SpatialPlanStep[] = [];
  for (const step of plan.steps) {
    if (step.requiresApproval && step.approvalStatus !== 'approved') {
      hasBlockedStep = true;
      const nextStep = { ...step, status: 'blocked' as const };
      events.push({
        id: newId('event'),
        runId,
        planId: plan.id,
        stepId: step.id,
        ts: nowIso(),
        level: 'warning',
        message: `Step "${step.title}" requires explicit approval before execution. Current approval status: ${step.approvalStatus}.`,
      });
      nextSteps.push(nextStep);
      continue;
    }

    if (!SUPPORTED_EXECUTORS.has(step.kind)) {
      hasBlockedStep = true;
      const nextStep = { ...step, status: 'blocked' as const };
      events.push({
        id: newId('event'),
        runId,
        planId: plan.id,
        stepId: step.id,
        ts: nowIso(),
        level: 'warning',
        message: `Step "${step.title}" needs executor contract for kind "${step.kind}".`,
      });
      nextSteps.push(nextStep);
      continue;
    }

    if (step.kind === 'board_sync') {
      try {
        const result = await syncBoardSnapshot();
        const nextStep = { ...step, status: 'completed' as const };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: result.published ? 'info' : 'warning',
          message: `BoardAI sync completed: ${result.message}`,
        });
        nextSteps.push(nextStep);
      } catch (error) {
        hasFailedStep = true;
        const nextStep = { ...step, status: 'failed' as const };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'error',
          message: `BoardAI sync failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        nextSteps.push(nextStep);
      }
      continue;
    }

    if (step.kind === 'doctor_diagnose') {
      try {
        const result = await runOpenClawDoctor();
        const nextStep = { ...step, status: result.success ? 'completed' as const : 'failed' as const };
        if (!result.success) hasFailedStep = true;
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: result.success ? 'info' : 'error',
          message: `OpenClaw Doctor diagnose ${result.success ? 'completed' : 'failed'}: exit=${result.exitCode ?? 'null'}, duration=${result.durationMs}ms${result.error ? `, error=${result.error}` : ''}`,
        });
        nextSteps.push(nextStep);
      } catch (error) {
        hasFailedStep = true;
        const nextStep = { ...step, status: 'failed' as const };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'error',
          message: `OpenClaw Doctor diagnose failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        nextSteps.push(nextStep);
      }
      continue;
    }

    if (step.kind === 'doctor_fix') {
      try {
        const result = await runOpenClawDoctorFix();
        const nextStep = { ...step, status: result.success ? 'completed' as const : 'failed' as const, approvalStatus: 'consumed' as const, approvalUpdatedAt: nowIso() };
        if (!result.success) hasFailedStep = true;
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: result.success ? 'info' : 'error',
          message: `OpenClaw Doctor fix ${result.success ? 'completed' : 'failed'}: exit=${result.exitCode ?? 'null'}, duration=${result.durationMs}ms${result.error ? `, error=${result.error}` : ''}`,
        });
        nextSteps.push(nextStep);
      } catch (error) {
        hasFailedStep = true;
        const nextStep = { ...step, status: 'failed' as const, approvalStatus: 'consumed' as const, approvalUpdatedAt: nowIso() };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'error',
          message: `OpenClaw Doctor fix failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        nextSteps.push(nextStep);
      }
      continue;
    }

    if (step.kind === 'gateway_restart') {
      try {
        await ctx.gatewayManager.restart();
        const gatewayStatus = ctx.gatewayManager.getStatus();
        const nextStep = { ...step, status: 'completed' as const, approvalStatus: 'consumed' as const, approvalUpdatedAt: nowIso() };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'info',
          message: `OpenClaw Gateway restart completed: state=${gatewayStatus.state}, port=${gatewayStatus.port ?? 'n/a'}.`,
        });
        nextSteps.push(nextStep);
      } catch (error) {
        hasFailedStep = true;
        const nextStep = { ...step, status: 'failed' as const, approvalStatus: 'consumed' as const, approvalUpdatedAt: nowIso() };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'error',
          message: `OpenClaw Gateway restart failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        nextSteps.push(nextStep);
      }
      continue;
    }

    if (step.kind === 'build_validation') {
      if (!step.validationProfile) {
        hasBlockedStep = true;
        const nextStep = { ...step, status: 'blocked' as const };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'warning',
          message: `Build validation step "${step.title}" is blocked because its validation profile is not allowlisted.`,
        });
        nextSteps.push(nextStep);
        continue;
      }
      try {
        const result = await runBuildValidation(step.validationProfile);
        const nextStep = { ...step, status: result.success ? 'completed' as const : 'failed' as const, approvalStatus: 'consumed' as const, approvalUpdatedAt: nowIso() };
        if (!result.success) hasFailedStep = true;
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: result.success ? 'info' : 'error',
          message: `Build validation "${result.profile}" ${result.success ? 'completed' : 'failed'}: exit=${result.exitCode ?? 'null'}, duration=${result.durationMs}ms${result.error ? `, error=${result.error}` : ''}`,
        });
        nextSteps.push(nextStep);
      } catch (error) {
        hasFailedStep = true;
        const nextStep = { ...step, status: 'failed' as const, approvalStatus: 'consumed' as const, approvalUpdatedAt: nowIso() };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'error',
          message: `Build validation failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        nextSteps.push(nextStep);
      }
      continue;
    }

    if (step.kind === 'shell') {
      try {
        const cmd = step.detail || '';
        const result = await runShellCommand(cmd);
        const nextStep = {
          ...step,
          status: result.success ? ('completed' as const) : ('failed' as const),
          approvalStatus: 'consumed' as const,
          approvalUpdatedAt: nowIso(),
        };
        if (!result.success) hasFailedStep = true;
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: result.success ? 'info' : 'error',
          message: `Shell command "${result.command}" ${result.success ? 'completed' : 'failed'}: exit=${result.exitCode ?? 'null'}, duration=${result.durationMs}ms${result.error ? `, error=${result.error}` : ''}`,
        });
        if (result.stdout) {
          events.push({
            id: newId('event'),
            runId,
            planId: plan.id,
            stepId: step.id,
            ts: nowIso(),
            level: 'info',
            message: `[stdout] ${result.stdout}`,
          });
        }
        if (result.stderr) {
          events.push({
            id: newId('event'),
            runId,
            planId: plan.id,
            stepId: step.id,
            ts: nowIso(),
            level: result.success ? 'info' : 'warning',
            message: `[stderr] ${result.stderr}`,
          });
        }
        nextSteps.push(nextStep);
      } catch (error) {
        hasFailedStep = true;
        const nextStep = {
          ...step,
          status: 'failed' as const,
          approvalStatus: 'consumed' as const,
          approvalUpdatedAt: nowIso(),
        };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'error',
          message: `Shell command execution failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        nextSteps.push(nextStep);
      }
      continue;
    }

    if (step.kind === 'host_api') {
      try {
        const detail = step.detail || '';
        let method = 'GET';
        let path = '';
        let body: any = undefined;

        try {
          const parsed = JSON.parse(detail);
          if (parsed && typeof parsed === 'object') {
            method = (parsed.method || 'GET').toUpperCase();
            path = parsed.path || '';
            body = parsed.body;
          }
        } catch {
          const firstLine = detail.split('\n')[0].trim();
          const match = firstLine.match(/^(GET|POST|PUT|DELETE)\s+(\S+)/i);
          if (match) {
            method = match[1].toUpperCase();
            path = match[2];
            const remaining = detail.slice(firstLine.length).trim();
            if (remaining) {
              try {
                body = JSON.parse(remaining);
              } catch {
                body = remaining;
              }
            }
          }
        }

        if (!path) {
          throw new Error('Host API path is empty or could not be parsed from step detail');
        }

        if (!path.startsWith('/')) {
          path = '/' + path;
        }

        const port = getPort('CLAWX_HOST_API');
        const url = `http://127.0.0.1:${port}${path}`;
        const token = (ctx as any).hostApiToken || '';

        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'info',
          message: `Dispatching Host API request: ${method} ${path}`,
        });

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
        });

        const responseText = await response.text();
        let responseJson: any = null;
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          responseJson = responseText;
        }

        const success = response.ok;
        const nextStep = { ...step, status: success ? ('completed' as const) : ('failed' as const) };
        if (!success) hasFailedStep = true;

        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: success ? 'info' : 'error',
          message: `Host API response status: ${response.status} (${response.statusText})`,
        });

        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: success ? 'info' : 'warning',
          message: `[response] ${typeof responseJson === 'object' ? JSON.stringify(responseJson) : responseJson}`,
        });

        nextSteps.push(nextStep);
      } catch (error) {
        hasFailedStep = true;
        const nextStep = { ...step, status: 'failed' as const };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'error',
          message: `Host API dispatch failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        nextSteps.push(nextStep);
      }
      continue;
    }

    if (step.kind === 'browser') {
      let win: any = null;
      try {
        const detail = step.detail || '';
        let url = '';
        let evaluateScript = 'document.title';

        try {
          const parsed = JSON.parse(detail);
          if (parsed && typeof parsed === 'object') {
            url = parsed.url || '';
            evaluateScript = parsed.evaluate || 'document.title';
          }
        } catch {
          url = detail.trim();
        }

        if (!url) {
          throw new Error('Browser automation URL is empty or could not be parsed');
        }

        if (!/^https?:\/\//i.test(url)) {
          url = 'http://' + url;
        }

        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'info',
          message: `Starting headless browser. Loading URL: ${url}`,
        });

        const { BrowserWindow } = await import('electron');
        
        win = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          }
        });

        await new Promise<void>((resolve, reject) => {
          if (!win) return reject(new Error('Browser instance is null'));
          
          const handleDomReady = () => {
            cleanup();
            resolve();
          };

          const handleFail = (event: any, errorCode: number, errorDescription: string) => {
            cleanup();
            reject(new Error(`Failed to load URL: ${errorDescription} (code: ${errorCode})`));
          };

          const cleanup = () => {
            win?.webContents.off('dom-ready', handleDomReady);
            win?.webContents.off('did-fail-load', handleFail);
          };

          win.webContents.once('dom-ready', handleDomReady);
          win.webContents.once('did-fail-load', handleFail);

          win.loadURL(url).catch((err: any) => {
            cleanup();
            reject(err);
          });
        });

        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'info',
          message: `Page loaded successfully. Executing evaluation script...`,
        });

        const result = await win.webContents.executeJavaScript(evaluateScript);
        
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'info',
          message: `Evaluation result: ${typeof result === 'object' ? JSON.stringify(result) : String(result)}`,
        });

        const nextStep = { ...step, status: 'completed' as const };
        nextSteps.push(nextStep);
      } catch (error) {
        hasFailedStep = true;
        const nextStep = { ...step, status: 'failed' as const };
        events.push({
          id: newId('event'),
          runId,
          planId: plan.id,
          stepId: step.id,
          ts: nowIso(),
          level: 'error',
          message: `Browser automation failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        nextSteps.push(nextStep);
      } finally {
        if (win) {
          try {
            win.destroy();
          } catch {
            // ignore
          }
        }
      }
      continue;
    }

    const nextStep = { ...step, status: 'completed' as const };
    events.push({
      id: newId('event'),
      runId,
      planId: plan.id,
      stepId: step.id,
      ts: nowIso(),
      level: 'info',
      message: `Step "${step.title}" acknowledged by Spatial Plan backend.`,
    });
    nextSteps.push(nextStep);
  }

  plan.steps = nextSteps;

  const finishedAt = nowIso();
  const status: PlanRunStatus = hasFailedStep ? 'failed' : hasBlockedStep ? 'blocked' : 'completed';
  plan.status = status;
  plan.updatedAt = finishedAt;

  return {
    id: runId,
    planId: plan.id,
    status,
    startedAt,
    finishedAt,
    events,
  };
}

export async function handlePlanRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/plans' && req.method === 'GET') {
    sendJson(res, 200, buildSnapshot(await readPlansStore()));
    return true;
  }

  if (url.pathname === '/api/plans' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        title?: string;
        objective?: string;
        steps?: Array<Partial<SpatialPlanStep>>;
      }>(req);
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const objective = typeof body.objective === 'string' ? body.objective.trim() : '';
      if (!title || !objective) {
        sendJson(res, 400, { success: false, error: 'title and objective are required' });
        return true;
      }

      const timestamp = nowIso();
      const plan: SpatialPlan = {
        id: newId('plan'),
        title,
        objective,
        status: 'ready',
        createdAt: timestamp,
        updatedAt: timestamp,
        steps: (body.steps || []).map(normalizeStep),
        runs: [],
        approvals: [],
      };
      const store = await readPlansStore();
      store.plans.push(plan);
      await writePlansStore(store);
      sendJson(res, 200, buildSnapshot(store));
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/plans/') && req.method === 'PUT') {
    try {
      const planId = decodeURIComponent(url.pathname.slice('/api/plans/'.length));
      const body = await parseJsonBody<{
        title?: string;
        objective?: string;
        steps?: Array<Partial<SpatialPlanStep>>;
      }>(req);
      const store = await readPlansStore();
      const plan = store.plans.find((item) => item.id === planId);
      if (!plan) {
        sendJson(res, 404, { success: false, error: 'Plan not found' });
        return true;
      }
      if (typeof body.title === 'string' && body.title.trim()) plan.title = body.title.trim();
      if (typeof body.objective === 'string' && body.objective.trim()) plan.objective = body.objective.trim();
      if (Array.isArray(body.steps)) plan.steps = body.steps.map(normalizeStep);
      if (!Array.isArray(plan.approvals)) plan.approvals = [];
      plan.status = 'ready';
      plan.updatedAt = nowIso();
      await writePlansStore(store);
      sendJson(res, 200, buildSnapshot(store));
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/plans/') && req.method === 'POST') {
    const suffix = url.pathname.slice('/api/plans/'.length);
    const parts = suffix.split('/').filter(Boolean);
    if (parts.length === 4 && parts[1] === 'steps' && parts[3] === 'approval') {
      try {
        const planId = decodeURIComponent(parts[0]);
        const stepId = decodeURIComponent(parts[2]);
        const body = await parseJsonBody<{ action?: PlanApprovalAction; note?: string }>(req);
        if (body.action !== 'approve' && body.action !== 'reject') {
          sendJson(res, 400, { success: false, error: 'action must be approve or reject' });
          return true;
        }
        const store = await readPlansStore();
        const plan = store.plans.find((item) => item.id === planId);
        const step = plan?.steps.find((item) => item.id === stepId);
        if (!plan || !step) {
          sendJson(res, 404, { success: false, error: 'Plan step not found' });
          return true;
        }
        if (!step.requiresApproval) {
          sendJson(res, 400, { success: false, error: 'Step does not require approval' });
          return true;
        }
        const timestamp = nowIso();
        const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : undefined;
        step.approvalStatus = body.action === 'approve' ? 'approved' : 'rejected';
        step.approvalUpdatedAt = timestamp;
        step.approvalNote = note;
        step.status = 'pending';
        plan.status = 'ready';
        plan.updatedAt = timestamp;
        if (!Array.isArray(plan.approvals)) plan.approvals = [];
        plan.approvals.unshift({
          id: newId('approval'),
          planId,
          stepId,
          action: body.action,
          ts: timestamp,
          note,
        });
        plan.approvals = plan.approvals.slice(0, 50);
        await writePlansStore(store);
        sendJson(res, 200, { success: true, plan, plans: buildSnapshot(store).plans });
      } catch (error) {
        sendJson(res, 500, { success: false, error: String(error) });
      }
      return true;
    }
    if (parts.length === 2 && parts[1] === 'run') {
      try {
        const planId = decodeURIComponent(parts[0]);
        const store = await readPlansStore();
        const plan = store.plans.find((item) => item.id === planId);
        if (!plan) {
          sendJson(res, 404, { success: false, error: 'Plan not found' });
          return true;
        }
        plan.status = 'running';
        const run = await runPlan(plan, ctx);
        plan.runs.unshift(run);
        plan.runs = plan.runs.slice(0, 20);
        await writePlansStore(store);
        sendJson(res, 200, { success: true, plan, run, plans: buildSnapshot(store).plans });
      } catch (error) {
        sendJson(res, 500, { success: false, error: String(error) });
      }
      return true;
    }
  }

  if (url.pathname.startsWith('/api/plans/') && req.method === 'GET') {
    const suffix = url.pathname.slice('/api/plans/'.length);
    const parts = suffix.split('/').filter(Boolean);
    if (parts.length === 2 && parts[1] === 'events') {
      const planId = decodeURIComponent(parts[0]);
      const store = await readPlansStore();
      const plan = store.plans.find((item) => item.id === planId);
      if (!plan) {
        sendJson(res, 404, { success: false, error: 'Plan not found' });
        return true;
      }
      sendJson(res, 200, {
        success: true,
        events: plan.runs.flatMap((run) => run.events),
      });
      return true;
    }
  }

  return false;
}
