import { Activity, Play, CheckCircle, XCircle, Settings, FileText, Edit3 } from 'lucide-react';
import { WorkspaceEvent } from '@/types/orchestrator-workspace';
import { Badge } from '@/components/ui/badge';

interface TaskTimelineProps {
  events: WorkspaceEvent[];
}

function getIconForEventType(type: string) {
  if (type.includes('execution.started')) return <Play className="h-4 w-4 text-blue-400" />;
  if (type.includes('execution.completed')) return <CheckCircle className="h-4 w-4 text-emerald-400" />;
  if (type.includes('plan.generated')) return <FileText className="h-4 w-4 text-purple-400" />;
  if (type.includes('patch.generated')) return <Edit3 className="h-4 w-4 text-amber-400" />;
  if (type.includes('status_change')) return <Activity className="h-4 w-4 text-gray-400" />;
  if (type.includes('error') || type.includes('failed')) return <XCircle className="h-4 w-4 text-red-400" />;
  if (type.includes('command')) return <Settings className="h-4 w-4 text-slate-400" />;
  return <Activity className="h-4 w-4 text-gray-400" />;
}

export function TaskTimeline({ events }: TaskTimelineProps) {
  if (!events || events.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No timeline events yet.</div>;
  }

  return (
    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {events.map((event, idx) => (
        <div key={event.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 dark:bg-slate-800 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            {getIconForEventType(event.type)}
          </div>
          {/* Card */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between space-x-2 mb-1">
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm break-all">{event.type}</div>
              <time className="text-xs text-slate-500">{new Date(event.createdAt || event.updatedAt || Date.now()).toLocaleTimeString()}</time>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-sm whitespace-pre-wrap">{event.message}</div>
            
            {/* Metadata Badges */}
            {event.data && typeof event.data === 'object' && Object.keys(event.data).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {event.data.actionKind && <Badge variant="outline" className="text-xs">Action: {event.data.actionKind}</Badge>}
                {event.data.policyLevel && <Badge variant="outline" className="text-xs">Policy: {event.data.policyLevel}</Badge>}
                {event.data.executor && <Badge variant="secondary" className="text-xs">Executor: {event.data.executor}</Badge>}
                {event.data.success !== undefined && (
                  <Badge variant={event.data.success ? 'default' : 'destructive'} className="text-xs">
                    {event.data.success ? 'Success' : 'Failed'}
                  </Badge>
                )}
                {event.data.diffSize && <Badge variant="outline" className="text-xs">Diff size: {event.data.diffSize}</Badge>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
