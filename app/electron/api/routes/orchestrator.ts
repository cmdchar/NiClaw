import { IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { HostApiContext } from '../context';
import { sendJson, requireJsonContentType } from '../route-utils';
import { taskOrchestrator } from '../../services/orchestrator/task-orchestrator';
import { taskEventStore } from '../../services/orchestrator/task-event-store';
import { policyEngine } from '../../services/orchestrator/policy-engine';
import { projectWorkspaceService } from '../../services/orchestrator/project-workspace-service';
import { projectDiscoveryService } from '../../services/orchestrator/project-discovery-service';
import { serviceRegistry } from '../../services/orchestrator/service-registry';
import { obsidianMemoryService } from '../../services/obsidian-memory';

export async function handleOrchestratorRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {

  // GET /api/orchestrator/projects
  if (url.pathname === '/api/orchestrator/projects' && req.method === 'GET') {
    const registry = await projectWorkspaceService.getRegistry();
    sendJson(res, 200, registry);
    return true;
  }

  // GET /api/orchestrator/health
  if (url.pathname === '/api/orchestrator/health' && req.method === 'GET') {
    const health = await serviceRegistry.getHealthStatus();
    sendJson(res, 200, { health });
    return true;
  }

  // GET /api/orchestrator/system-map
  if (url.pathname === '/api/orchestrator/system-map' && req.method === 'GET') {
    const health = await serviceRegistry.getHealthStatus();
    const systemMap = {
      root: 'Android Companion',
      nodes: health.map(h => ({
        id: h.service,
        status: h.status,
        uptime: 'N/A',
        endpoint: h.details || 'Internal',
        latencyMs: h.latency || 0,
        lastChecked: h.lastChecked
      }))
    };
    sendJson(res, 200, { systemMap });
    return true;
  }

  // GET /api/orchestrator/secondbrain/status
  if (url.pathname === '/api/orchestrator/secondbrain/status' && req.method === 'GET') {
    const stats = await obsidianMemoryService.getStats();
    const projects = await projectDiscoveryService.discoverProjects();
    
    sendJson(res, 200, {
      vaultStatus: stats.isConnected ? 'ONLINE' : 'OFFLINE',
      vaultPath: obsidianMemoryService.getVaultRoot(),
      filesIndexed: stats.fileCount,
      projectsLinked: projects.length,
      lastScan: stats.lastScan
    });
    return true;
  }

  // GET /api/orchestrator/audit
  if (url.pathname === '/api/orchestrator/audit' && req.method === 'GET') {
    const tasks = taskEventStore.getAllTasks();
    const auditLogs = tasks.map(t => {
      const approvalEvent = t.events.find(e => e.type === 'status_change' && e.data?.status === 'running');
      return {
        taskId: t.id,
        title: t.title,
        status: t.status,
        targetProject: t.targetProject,
        approvedBy: approvalEvent ? 'Human (Android)' : 'N/A',
        approvedAt: approvalEvent ? approvalEvent.timestamp : null,
        resultSummary: (t as any).resultSummary || 'N/A'
      };
    }).sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0));

    sendJson(res, 200, { audit: auditLogs });
    return true;
  }

  // GET /api/orchestrator/projects/discover
  if (url.pathname === '/api/orchestrator/projects/discover' && req.method === 'GET') {
    const projects = await projectDiscoveryService.discoverProjects();
    sendJson(res, 200, { projects });
    return true;
  }

  // GET /api/orchestrator/projects/search?q=
  if (url.pathname === '/api/orchestrator/projects/search' && req.method === 'GET') {
    const q = url.searchParams.get('q') || '';
    const projects = await projectDiscoveryService.searchProjects(q);
    sendJson(res, 200, { projects });
    return true;
  }

  // POST /api/orchestrator/projects/refresh-index
  if (url.pathname === '/api/orchestrator/projects/refresh-index' && req.method === 'POST') {
    const projects = await projectDiscoveryService.discoverProjects(true);
    sendJson(res, 200, { success: true, projects });
    return true;
  }

  // POST /api/orchestrator/projects
  if (url.pathname === '/api/orchestrator/projects' && req.method === 'POST') {
    if (!requireJsonContentType(req, res)) return true;
    try {
      const body = await parseBody(req);
      const project = await projectWorkspaceService.addProject(body);
      sendJson(res, 201, project);
    } catch (e: any) {
      sendJson(res, 400, { error: e.message });
    }
    return true;
  }

  // DELETE /api/orchestrator/projects/:id
  const projectMatch = url.pathname.match(/^\/api\/orchestrator\/projects\/([^/]+)$/);
  if (projectMatch && req.method === 'DELETE') {
    const projectId = projectMatch[1];
    try {
      const removed = await projectWorkspaceService.removeProject(projectId);
      if (removed) {
        sendJson(res, 200, { success: true });
      } else {
        sendJson(res, 404, { error: 'Project not found' });
      }
    } catch (e: any) {
      sendJson(res, 500, { error: e.message });
    }
    return true;
  }

  // GET /api/orchestrator/projects/:id/context
  const contextMatch = url.pathname.match(/^\/api\/orchestrator\/projects\/([^/]+)\/context$/);
  if (contextMatch && req.method === 'GET') {
    const projectId = contextMatch[1];
    const context = await projectDiscoveryService.getProjectContext(projectId);
    if (context) {
      sendJson(res, 200, context);
    } else {
      sendJson(res, 404, { error: 'Project not found in discovery index' });
    }
    return true;
  }

  // POST /api/orchestrator/projects/:id/mark-ready
  const markReadyMatch = url.pathname.match(/^\/api\/orchestrator\/projects\/([^/]+)\/mark-ready$/);
  if (markReadyMatch && req.method === 'POST') {
    const projectId = markReadyMatch[1];
    await projectDiscoveryService.setManualOverride(projectId, 'READY');
    sendJson(res, 200, { success: true, status: 'READY' });
    return true;
  }

  // POST /api/orchestrator/projects/:id/archive
  const archiveMatch = url.pathname.match(/^\/api\/orchestrator\/projects\/([^/]+)\/archive$/);
  if (archiveMatch && req.method === 'POST') {
    const projectId = archiveMatch[1];
    await projectDiscoveryService.setManualOverride(projectId, 'ARCHIVE');
    sendJson(res, 200, { success: true, status: 'ARCHIVE' });
    return true;
  }

  // GET /api/orchestrator/projects/:id/readiness
  const readinessMatch = url.pathname.match(/^\/api\/orchestrator\/projects\/([^/]+)\/readiness$/);
  if (readinessMatch && req.method === 'GET') {
    const projectId = readinessMatch[1];
    const projects = await projectDiscoveryService.discoverProjects();
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      sendJson(res, 200, { project: proj });
    } else {
      sendJson(res, 404, { error: 'Project not found' });
    }
    return true;
  }

  // POST /api/orchestrator/tasks
  if (url.pathname === '/api/orchestrator/tasks' && req.method === 'POST') {
    if (!requireJsonContentType(req, res)) return true;
    try {
      const body = await parseBody(req);
      const { title, userPrompt, targetProject } = body;
      
      if (!userPrompt) {
        sendJson(res, 400, { error: 'Missing required field: userPrompt' });
        return true;
      }

      const task = await taskOrchestrator.submitTask(title || 'New Task', userPrompt, targetProject || '');
      sendJson(res, 201, task);
    } catch (e: any) {
      sendJson(res, 500, { error: e.message });
    }
    return true;
  }

  // GET /api/orchestrator/tasks
  if (url.pathname === '/api/orchestrator/tasks' && req.method === 'GET') {
    const tasks = taskEventStore.getAllTasks();
    sendJson(res, 200, { tasks });
    return true;
  }

  // Policy Endpoints
  if (url.pathname === '/api/orchestrator/policy' && req.method === 'GET') {
    const status = await policyEngine.getStatus();
    sendJson(res, 200, status);
    return true;
  }

  if (url.pathname === '/api/orchestrator/policy/validate-plan' && req.method === 'POST') {
    const { taskId, projectId, plan } = await parseBody(req);
    const result = await policyEngine.evaluateExecutionPlan(taskId, projectId, plan);
    sendJson(res, 200, result);
    return true;
  }

  if (url.pathname === '/api/orchestrator/policy/validate-command' && req.method === 'POST') {
    const { command } = await parseBody(req);
    const result = await policyEngine.validateCommand(command);
    sendJson(res, 200, result);
    return true;
  }

  if (url.pathname === '/api/orchestrator/policy/validate-diff' && req.method === 'POST') {
    const { files } = await parseBody(req);
    const result = await policyEngine.validateDiff(files);
    sendJson(res, 200, result);
    return true;
  }

  // Task specific routes
  const taskMatch = url.pathname.match(/^\/api\/orchestrator\/tasks\/([^/]+)(\/(events|approve|cancel|retry|retry-execution|rollback|stop|diff|approve-patch|reject-patch))?$/);
  if (taskMatch) {
    const taskId = taskMatch[1];
    const action = taskMatch[3];

    if (req.method === 'GET') {
      if (action === 'events') {
        const events = taskEventStore.getEvents(taskId);
        sendJson(res, 200, { events });
        return true;
      }
      if (action === 'diff') {
        const events = taskEventStore.getEvents(taskId);
        const diffEvent = events.find(e => e.type === 'diff_generated');
        sendJson(res, 200, { diff: diffEvent?.data?.diff || '' });
        return true;
      }
      const task = taskEventStore.getTask(taskId);
      if (!task) {
        sendJson(res, 404, { error: 'Task not found' });
        return true;
      }
      sendJson(res, 200, task);
      return true;
    }


    if (action === 'approve' && req.method === 'POST') {
      // Fire-and-forget: start execution asynchronously, return immediately
      taskOrchestrator.approveTask(taskId).catch(err => {
        taskEventStore.addEvent(taskId, 'error', `Execution error: ${err.message}`);
        taskEventStore.updateTaskStatus(taskId, 'failed');
      });
      sendJson(res, 200, { success: true, message: 'Execution started asynchronously' });
      return true;
    }

    if (action === 'rollback' && req.method === 'POST') {
      taskEventStore.updateTaskStatus(taskId, 'waiting_rollback_approval' as any);
      taskEventStore.addAuditLog(taskId, 'ROLLBACK_REQUEST', 'user', undefined, undefined, 'Rollback requested, pending approval.');
      sendJson(res, 200, { success: true, message: 'Rollback requested' });
      return true;
    }

    if (action === 'stop' && req.method === 'POST') {
      taskEventStore.updateTaskStatus(taskId, 'failed');
      taskEventStore.addAuditLog(taskId, 'STOP_REQUEST', 'user', undefined, undefined, 'Task execution stopped by user.');
      sendJson(res, 200, { success: true, message: 'Task stopped' });
      return true;
    }

    if (action === 'approve-patch' && req.method === 'POST') {
      taskOrchestrator.commitPatch(taskId).catch(err => {
        taskEventStore.addEvent(taskId, 'error', `Commit error: ${err.message}`);
        taskEventStore.updateTaskStatus(taskId, 'failed');
      });
      sendJson(res, 200, { success: true, message: 'Patch approval received, committing changes' });
      return true;
    }

    if (action === 'reject-patch' && req.method === 'POST') {
      taskOrchestrator.rejectPatch(taskId).catch(err => {
        taskEventStore.addEvent(taskId, 'error', `Reject error: ${err.message}`);
      });
      sendJson(res, 200, { success: true, message: 'Patch rejected, changes discarded' });
      return true;
    }

    if (action === 'cancel' && req.method === 'POST') {
      await taskOrchestrator.cancelTask(taskId);
      sendJson(res, 200, { success: true });
      return true;
    }

    if ((action === 'retry' || action === 'retry-execution') && req.method === 'POST') {
      await taskOrchestrator.retryTask(taskId);
      sendJson(res, 200, { success: true });
      return true;
    }
  }

  return false;
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}
