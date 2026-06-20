import { useState, useEffect, useCallback } from 'react';
import { Task, TaskWorkspace } from '@/types/orchestrator-workspace';
import { hostApiFetch } from '@/lib/host-api';
import { RefreshCw, ArrowLeft, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskTimeline } from './TaskTimeline';
import { WorkspaceArtifacts } from './WorkspaceArtifacts';
import { WorkspacePatchReview } from './WorkspacePatchReview';
import { ClarificationCard } from './ClarificationCard';

interface TaskWorkspacePanelProps {
  taskId: string;
  onBack: () => void;
}

export function TaskWorkspacePanel({ taskId, onBack }: TaskWorkspacePanelProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [workspace, setWorkspace] = useState<TaskWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [taskRes, wsRes] = await Promise.all([
        hostApiFetch<Task>(`/api/orchestrator/tasks/${taskId}`),
        hostApiFetch<TaskWorkspace>(`/api/orchestrator/tasks/${taskId}/workspace`).catch(() => null)
      ]);
      setTask(taskRes);
      if (wsRes && !('error' in wsRes)) {
        setWorkspace(wsRes as TaskWorkspace);
      }
    } catch (e) {
      console.error('Failed to fetch workspace data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return <div className="flex justify-center p-6"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!task) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <div className="text-red-500">Task not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b bg-muted/20 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} title="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{task.title || 'Untitled Task'}</h2>
              <Badge variant="outline">{task.status}</Badge>
              {task.executor && <Badge variant="secondary">{task.executor}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate max-w-xl">{task.userPrompt}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Needs Action Section */}
        {task.status === 'waiting_clarification' && (
          <ClarificationCard taskId={taskId} onResolved={handleRefresh} />
        )}
        
        {task.status === 'waiting_patch_review' && workspace && workspace.patches && workspace.patches.length > 0 && (
          <WorkspacePatchReview taskId={taskId} patches={workspace.patches} onReviewCompleted={handleRefresh} />
        )}

        {task.status === 'waiting_patch_approval' && workspace && workspace.patches && workspace.patches.length > 0 && (
          <WorkspacePatchReview taskId={taskId} patches={workspace.patches} onReviewCompleted={handleRefresh} />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column: Timeline */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Terminal className="h-4 w-4" /> Execution Timeline
            </h3>
            {workspace ? (
              <TaskTimeline events={workspace.events} />
            ) : (
              <div className="text-sm text-muted-foreground">Workspace not yet created.</div>
            )}
          </div>

          {/* Right Column: Artifacts */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Artifacts & Logs</h3>
            {workspace ? (
              <WorkspaceArtifacts taskId={taskId} artifacts={workspace.artifacts} />
            ) : (
              <div className="text-sm text-muted-foreground">No artifacts available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
