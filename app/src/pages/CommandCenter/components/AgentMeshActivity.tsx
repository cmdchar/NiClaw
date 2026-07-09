import { Bot, Clock, AlertTriangle, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types/orchestrator-workspace';

interface AgentMeshActivityProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
}

export function AgentMeshActivity({ tasks, onSelectTask }: AgentMeshActivityProps) {
  const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'failed');
  
  if (activeTasks.length === 0) {
    return (
      <Card className="rounded-lg shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base tracking-normal">Agent Mesh Activity</CardTitle>
          <Badge variant="outline">0 active</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[96px] items-center justify-center rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No agents active on mesh.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base tracking-normal">Agent Mesh Activity</CardTitle>
        <Badge variant="outline">{activeTasks.length} active</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeTasks.slice(0, 8).map((task) => (
          <div 
            key={task.id}
            onClick={() => onSelectTask(task.id)}
            className="flex flex-col gap-2 rounded-md border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{task.executor || 'Agent'}</span>
              </div>
              {task.status === 'running' || task.status === 'started' || task.status === 'active' ? (
                <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  <PlayCircle className="mr-1 h-3 w-3" /> running
                </Badge>
              ) : task.status === 'waiting_approval' || task.status.includes('blocked') ? (
                <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300 animate-pulse">
                  <AlertTriangle className="mr-1 h-3 w-3" /> waiting approval
                </Badge>
              ) : (
                <Badge variant="outline">{task.status}</Badge>
              )}
            </div>
            
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" title={task.title}>{task.title}</p>
              <p className="text-xs text-muted-foreground truncate">{task.targetProject}</p>
            </div>
            
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(task.updatedAt).toLocaleTimeString()}
              </span>
              {task.taskType && <span className="uppercase text-[10px] tracking-wider">{task.taskType}</span>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
