import { Database, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMemorySyncStatus, useMemoryMutations } from '@/hooks/useMemory';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MemorySyncWidget() {
  const { syncStatus, loading, refresh } = useMemorySyncStatus();
  const { triggerSync, loading: syncing } = useMemoryMutations(refresh);

  if (loading && !syncStatus) {
    return <div className="h-8 w-8 animate-pulse bg-muted rounded-md" />;
  }

  if (!syncStatus) return null;

  const isRunning = syncStatus.status === 'running' || syncing;
  const isPending = syncStatus.pendingSync;
  const isFailed = syncStatus.status === 'failed';

  let icon = <Database className="h-4 w-4 text-muted-foreground" />;
  let tooltipText = 'Memory Sync Status';
  let colorClass = '';

  if (isRunning) {
    icon = <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    tooltipText = 'Syncing memory to VM...';
  } else if (isFailed) {
    icon = <AlertCircle className="h-4 w-4 text-red-500" />;
    tooltipText = `Sync Failed: ${syncStatus.lastError || 'Unknown error'}`;
    colorClass = 'text-red-500 border-red-500/20 bg-red-500/10';
  } else if (isPending) {
    icon = <Database className="h-4 w-4 text-yellow-500" />;
    tooltipText = 'Memory changed. Pending sync to VM.';
    colorClass = 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
  } else {
    icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
    tooltipText = syncStatus.lastFinishedAt 
      ? `Synced ${timeAgo(syncStatus.lastFinishedAt)}` 
      : 'In sync';
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`h-8 gap-2 transition-colors ${colorClass}`}
            onClick={triggerSync}
            disabled={isRunning}
          >
            {icon}
            <span className="hidden xl:inline text-xs font-medium">
              {isRunning ? 'Syncing...' : isPending ? 'Pending Sync' : 'Synced'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-sm font-medium">{tooltipText}</p>
          {!isRunning && <p className="text-xs text-muted-foreground mt-1">Click to manually sync memory to VM</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
