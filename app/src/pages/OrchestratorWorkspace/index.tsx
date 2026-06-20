import { useEffect, useState, useCallback } from 'react';
import { TaskListPanel } from './TaskListPanel';
import { AgentActivityPanel } from './AgentActivityPanel';
import { TaskWorkspacePanel } from '@/pages/CommandCenter/components/TaskWorkspacePanel';
import { hostApiFetch } from '@/lib/host-api';
import { Task } from '@/types/orchestrator-workspace';
import { Briefcase } from 'lucide-react';

export function OrchestratorWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await hostApiFetch<{ tasks: Task[] }>('/api/orchestrator/tasks');
      if (res && res.tasks) {
        setTasks(res.tasks.sort((a, b) => b.createdAt - a.createdAt));
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleRefreshTasks = () => {
    setRefreshing(true);
    fetchTasks();
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Left Panel: Task List */}
      <div className="w-[300px] shrink-0 h-full border-r flex flex-col z-10 bg-background shadow-[1px_0_10px_rgba(0,0,0,0.05)]">
        <div className="p-4 border-b flex items-center gap-2 shrink-0 bg-muted/20">
          <Briefcase className="h-5 w-5 text-primary" />
          <h1 className="font-semibold tracking-tight text-lg">Workspace</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <TaskListPanel 
            tasks={tasks}
            activeTaskId={activeTaskId}
            onSelectTask={setActiveTaskId}
            onRefresh={handleRefreshTasks}
            refreshing={refreshing || loading}
          />
        </div>
      </div>

      {/* Center Panel: Active Task Workspace */}
      <div className="flex-1 min-w-0 h-full flex flex-col bg-background z-0 relative">
        {activeTaskId ? (
          <TaskWorkspacePanel 
            key={activeTaskId} // Force remount when switching tasks to reset its internal state
            taskId={activeTaskId} 
            onBack={() => setActiveTaskId(null)} 
          />
        ) : (
          <div className="flex items-center justify-center h-full flex-col text-muted-foreground gap-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Briefcase className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p>Select a task from the list to view its workspace.</p>
          </div>
        )}
      </div>

      {/* Right Panel: Agent Activity */}
      <div className="w-[280px] shrink-0 h-full border-l flex flex-col z-10 bg-background shadow-[-1px_0_10px_rgba(0,0,0,0.05)]">
        <AgentActivityPanel />
      </div>
    </div>
  );
}
