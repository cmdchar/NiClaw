import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/types/orchestrator-workspace';

interface TaskListPanelProps {
  tasks: Task[];
  activeTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function TaskListPanel({ tasks, activeTaskId, onSelectTask, onRefresh, refreshing }: TaskListPanelProps) {
  return (
    <Card className="rounded-lg shadow-none flex flex-col h-full border-r border-y-0 border-l-0 rounded-none bg-muted/10">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 border-b px-4 shrink-0 bg-background/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold tracking-normal">Orchestrator Tasks</CardTitle>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">{tasks.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={refreshing} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
        {tasks.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-md mt-2">
            No agent tasks submitted.
          </div>
        ) : (
          tasks.map((task) => {
            const isActive = task.id === activeTaskId;
            return (
              <div 
                key={task.id} 
                className={`flex flex-col gap-1 rounded-md px-3 py-2 text-sm cursor-pointer border transition-colors ${
                  isActive 
                    ? 'bg-primary/10 border-primary/20 hover:bg-primary/15' 
                    : 'bg-background hover:bg-muted/50 border-transparent'
                }`}
                onClick={() => onSelectTask(task.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-medium truncate ${isActive ? 'text-primary' : ''}`}>
                    {task.title || 'Untitled Task'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={task.targetProject}>
                    {task.targetProject}
                  </span>
                  <Badge 
                    variant={task.status === 'failed' ? 'destructive' : task.status === 'completed' ? 'secondary' : 'default'} 
                    className={`text-[9px] h-4 px-1 rounded-sm uppercase tracking-wider ${isActive && task.status !== 'failed' ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    {task.status.replace('waiting_', '')}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
