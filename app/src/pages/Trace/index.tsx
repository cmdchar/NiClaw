import { useEffect, useState } from 'react';
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Trace() {
  const [loading, setLoading] = useState(false);

  const fetchTraces = async () => {
    setLoading(true);
    // In a real implementation, we'd list all active executions
    // For now we'll simulate the observability view
    setTimeout(() => setLoading(false), 500);
  };

  useEffect(() => {
    void fetchTraces();
  }, []);

  return (
    <div className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-5xl mx-auto flex flex-col h-full p-10 pt-16">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 shrink-0 gap-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-serif text-foreground mb-3 font-normal tracking-tight flex items-center gap-4">
              <Activity className="h-12 w-12 text-primary" />
              Execution Trace
            </h1>
            <p className="text-subtitle text-foreground/70 font-medium">
              Deep observability into your AI OS execution graphs.
            </p>
          </div>
          <button
            onClick={fetchTraces}
            className="h-10 px-6 rounded-full bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-all"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0 -mr-2 space-y-6">
          {/* Active Graph Simulation */}
          <Card className="rounded-3xl border-primary/20 bg-primary/5 overflow-hidden">
            <CardHeader className="border-b border-primary/10 py-4 px-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary text-primary-foreground animate-pulse">Running</Badge>
                <CardTitle className="text-lg">Visual Workflow v1.0.0</CardTitle>
              </div>
              <span className="font-mono text-xs opacity-50">exec_171458294</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-black/5 dark:divide-white/5">
                <TraceItem
                  status="completed"
                  label="Discord Message Trigger"
                  type="trigger"
                  time="12ms"
                  output='{ "content": "Hello AI OS" }'
                />
                <TraceItem
                  status="running"
                  label="Strategic Planner"
                  type="agent"
                  time="840ms..."
                  input='{ "query": "Hello AI OS" }'
                />
                <TraceItem
                  status="pending"
                  label="Knowledge Retrieval"
                  type="knowledge"
                />
                <TraceItem
                  status="pending"
                  label="Final Response Action"
                  type="action"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TraceItem({ status, label, type, time, input, output }: { status: 'completed' | 'running' | 'failed' | 'pending', label: string, type: string, time?: string, input?: string, output?: string }) {
  return (
    <div className="p-6 flex items-start gap-4 hover:bg-black/[0.02] transition-colors">
      <div className="mt-1">
        {status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        {status === 'running' && <RefreshCw className="h-5 w-5 text-primary animate-spin" />}
        {status === 'failed' && <AlertCircle className="h-5 w-5 text-destructive" />}
        {status === 'pending' && <Clock className="h-5 w-5 text-muted-foreground opacity-30" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{label}</span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono py-0">{type}</Badge>
          </div>
          {time && <span className="font-mono text-xs text-muted-foreground">{time}</span>}
        </div>

        {input && (
          <div className="mt-2 space-y-1">
            <span className="text-[9px] uppercase font-bold text-muted-foreground">Input</span>
            <pre className="p-3 rounded-xl bg-black/5 dark:bg-white/5 font-mono text-[11px] overflow-x-auto">{input}</pre>
          </div>
        )}

        {output && (
          <div className="mt-2 space-y-1">
            <span className="text-[9px] uppercase font-bold text-green-600">Output</span>
            <pre className="p-3 rounded-xl bg-green-500/5 border border-green-500/10 font-mono text-[11px] overflow-x-auto text-green-700 dark:text-green-400">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default Trace;
