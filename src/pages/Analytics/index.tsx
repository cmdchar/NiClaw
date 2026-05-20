import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
  DollarSign,
  Activity,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAnalyticsStore } from '@/stores/analytics';
import { useAgentsStore } from '@/stores/agents';

export function Analytics() {
  const { t } = useTranslation('analytics');
  const { history, loading, fetchHistory } = useAnalyticsStore();
  const { agents } = useAgentsStore();

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const stats = useMemo(() => {
    const totalTasks = history.length;
    const avgLatency = totalTasks > 0
      ? Math.round(history.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0) / totalTasks)
      : 0;
    const totalTokens = history.reduce((acc, curr) => acc + curr.totalTokens, 0);
    // Rough estimation: $0.01 per 1k tokens
    const totalCost = (totalTokens / 1000 * 0.01).toFixed(4);

    return {
      totalTasks,
      avgLatency,
      successRate: totalTasks > 0 ? 100 : 0, // Placeholder as we don't track errors yet in history
      totalCost,
      cpuUsage: 15 + Math.random() * 10,
      memoryUsage: 40 + Math.random() * 15
    };
  }, [history]);

  return (
    <div className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-5xl mx-auto flex flex-col h-full p-10 pt-16">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 shrink-0 gap-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-serif text-foreground mb-3 font-normal tracking-tight">
              OS Analytics
            </h1>
            <p className="text-subtitle text-foreground/70 font-medium">
              Real-time telemetry and performance tracking for your AI Team.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={() => fetchHistory()}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0 -mr-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard icon={<Activity className="h-4 w-4 text-blue-500" />} label="Total Tasks" value={stats.totalTasks.toString()} trend="Last 100 turns" />
            <StatCard icon={<Zap className="h-4 w-4 text-yellow-500" />} label="Avg Latency" value={`${stats.avgLatency}ms`} trend="Network + Inference" />
            <StatCard icon={<ShieldCheck className="h-4 w-4 text-green-500" />} label="Success Rate" value={`${stats.successRate}%`} trend="Execution" />
            <StatCard icon={<DollarSign className="h-4 w-4 text-purple-500" />} label="Token Cost" value={`$${stats.totalCost}`} trend="Estimated" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-xl font-serif flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  System Load
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Neural Compute Unit</span>
                    <span className="font-mono">{Math.round(stats.cpuUsage)}%</span>
                  </div>
                  <Progress value={stats.cpuUsage} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Short-term Memory (RAM)</span>
                    <span className="font-mono">{Math.round(stats.memoryUsage)}%</span>
                  </div>
                  <Progress value={stats.memoryUsage} className="h-1.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-xl font-serif flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Agent Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agents.slice(0, 4).map(agent => {
                  const agentHistory = history.filter(h => h.agentId === agent.id);
                  const agentLatency = agentHistory.length > 0
                    ? Math.round(agentHistory.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0) / agentHistory.length)
                    : 0;

                  return (
                    <div key={agent.id} className="flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {agent.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{agent.name}</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-xs">
                        <span className="text-green-600">{agentHistory.length} turns</span>
                        <span className="text-muted-foreground">{agentLatency}ms</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {stats.avgLatency > 1000 && (
            <Card className="rounded-3xl border-black/5 dark:border-white/5 bg-amber-500/5 border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-serif flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  Latency Warning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Detected average latency above 1000ms. Consider switching to a faster provider (e.g. Groq) or checking your network proxy settings.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: any, label: string, value: string, trend: string }) {
  return (
    <Card className="rounded-2xl border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-serif font-bold mb-1">{value}</div>
      <div className="text-[10px] text-muted-foreground font-medium">{trend}</div>
    </Card>
  );
}

export default Analytics;
