import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AgentMeshService } from '../../services/agentMeshService';
import { AgentMeshStatus, AgentEvent, NodeStatus } from '../../types/agentMesh';

export function AgentMesh() {
  const [status, setStatus] = useState<AgentMeshStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      setRefreshing(true);
      const data = await AgentMeshService.fetchMeshStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch Agent Mesh status', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSmokeTest = async (nodeId: string) => {
    await AgentMeshService.runSmokeTest(nodeId);
    fetchStatus(); // Refresh status after smoke test
  };

  const getStatusColor = (nodeStatus: string) => {
    switch (nodeStatus) {
      case 'online': return 'bg-green-500 hover:bg-green-600';
      case 'offline': return 'bg-red-500 hover:bg-red-600';
      case 'degraded': return 'bg-yellow-500 hover:bg-yellow-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    if (eventType.includes('failed') || eventType.includes('error')) return 'destructive';
    if (eventType.includes('completed') || eventType.includes('success')) return 'default';
    if (eventType.includes('started') || eventType.includes('running')) return 'secondary';
    return 'outline';
  };

  const renderNodeCard = (node: NodeStatus) => {
    let detailText = typeof node.details === 'string' ? node.details : JSON.stringify(node.details || {});
    if (detailText === '{}') detailText = 'No details available';
    
    return (
      <Card key={node.id} className="bg-slate-900/40 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-semibold">{node.label}</CardTitle>
            <Badge className={getStatusColor(node.status)}>{node.status}</Badge>
          </div>
          <CardDescription className="text-xs truncate" title={detailText}>
            {detailText}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mt-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="text-[10px] h-6 px-2"
              disabled={node.status === 'offline' || node.status === 'auth_required' || !['openclaw-bridge', 'openhuman-core', 'codex', 'hermes', 'telegram-hermes', 'mesh'].includes(node.id)}
              onClick={() => handleSmokeTest(node.id)}
            >
              {node.status === 'offline' ? 'API Pending' : (node.status === 'auth_required' ? 'Auth Needed' : 'Run Smoke Test')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading && !status) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground animate-pulse">Initializing Agent Mesh connection...</p>
      </div>
    );
  }

  // Group nodes by section according to real API IDs
  const infraNodes = status?.nodes.filter(n => ['niclaw-local', 'vm-niclaw', 'superhermes-api', 'superhermes-web', 'niclaw-host-api'].includes(n.id)) || [];
  const hermesDashboardNodes = status?.nodes.filter(n => ['hermes-dashboard'].includes(n.id)) || [];
  const telegramHermesNodes = status?.nodes.filter(n => ['telegram-hermes', 'hermes'].includes(n.id)) || [];
  const agentNodes = status?.nodes.filter(n => ['openclaw-bridge', 'openhuman-core', 'codex'].includes(n.id)) || [];
  const memoryNodes = status?.nodes.filter(n => ['secondbrain-openclaw-memory'].includes(n.id)) || [];

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4 bg-slate-950/50">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Mesh</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and coordinate the multi-agent distributed topology across NiClaw and SuperHermes.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {refreshing && <span className="text-xs text-muted-foreground animate-pulse">Syncing...</span>}
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={refreshing}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {status?.error ? (
          <div className="flex flex-col items-center justify-center h-64 border border-slate-800 rounded-lg bg-slate-900/20">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Agent Mesh Unavailable</h2>
            <p className="text-muted-foreground uppercase tracking-wider text-sm font-bold">STATUS: {status.error}</p>
            <p className="text-xs text-slate-500 mt-4 max-w-md text-center">
              SuperHermes Gateway endpoint is not responding or not configured. 
              Real nodes and events will be displayed once the backend contract is fulfilled.
            </p>
          </div>
        ) : (
          <>
            {/* Top infrastructure row */}
            {infraNodes.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Infrastructure & Control</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {infraNodes.map(renderNodeCard)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-6">
                {hermesDashboardNodes.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Hermes Dashboard</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {hermesDashboardNodes.map(renderNodeCard)}
                    </div>
                  </div>
                )}

                {telegramHermesNodes.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Telegram Hermes</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {telegramHermesNodes.map(renderNodeCard)}
                    </div>
                  </div>
                )}
                
                {memoryNodes.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">SecondBrain Memory</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {memoryNodes.map(renderNodeCard)}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 flex flex-col gap-6">
                {agentNodes.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Agent Runtimes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {agentNodes.map(renderNodeCard)}
                    </div>
                  </div>
                )}

                <Separator className="bg-slate-800 my-1" />

                <div className="flex-1 flex flex-col min-h-[300px]">
                  <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Latest Agent Events</h2>
                  <div className="flex-1 bg-slate-900/20 border border-slate-800/60 rounded-md p-4 overflow-y-auto space-y-3">
                    {!status?.latestEvents || status.latestEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No events recorded yet.
                      </p>
                    ) : (
                      status.latestEvents.map((event: AgentEvent) => (
                        <Card key={event.event_id} className="bg-slate-900/60 border-slate-800/60 shadow-none">
                          <CardContent className="p-3 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{event.agent_name}</span>
                                <Badge variant={getEventBadgeColor(event.event_type)} className="text-[10px] h-4 px-1.5 py-0">
                                  {event.event_type}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300">{event.summary}</p>
                            
                            {(event.workspace || (event.memory_refs && event.memory_refs.length > 0)) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                {event.workspace && (
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                    <span className="font-medium">Workspace:</span> {event.workspace}
                                  </div>
                                )}
                                {event.memory_refs && event.memory_refs.length > 0 && (
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                    <span className="font-medium text-blue-400">Memory:</span> {event.memory_refs.join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
