import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Bot, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { hostApiFetch } from '@/lib/host-api';
import { AgentActivityCard } from '@/types/orchestrator-workspace';

export function AgentActivityPanel() {
  const [activities, setActivities] = useState<AgentActivityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await hostApiFetch<{ activity: AgentActivityCard[] }>('/api/orchestrator/agents/activity');
      if (res && res.activity) {
        setActivities(res.activity);
      }
    } catch (e) {
      console.error('Failed to fetch agent activity', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivity();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'offline': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'degraded': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="rounded-lg shadow-none flex flex-col h-full border-l border-y-0 border-r-0 rounded-none bg-muted/10">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 border-b px-4 shrink-0 bg-background/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold tracking-normal flex items-center gap-2">
            <Activity className="h-4 w-4" /> Agent Health
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && activities.length === 0 ? (
          <div className="flex justify-center p-4">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-4 border border-dashed rounded-md">
            No agents found.
          </div>
        ) : (
          activities.map((agent) => (
            <div key={agent.id} className="flex flex-col gap-2 rounded-md border p-3 bg-background">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium text-sm truncate">{agent.name}</span>
                </div>
                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 uppercase ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium mr-1">Role:</span> {agent.role}
              </div>
              <div className="text-xs text-muted-foreground truncate" title={agent.lastAction}>
                <span className="font-medium mr-1">State:</span> {agent.lastAction}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
