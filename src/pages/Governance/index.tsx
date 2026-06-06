import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Check, X, Undo, Clock, AlertTriangle } from 'lucide-react';
import { hostApiFetch } from '@/lib/host-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MemoryChange {
  id: string;
  timestamp: string;
  candidateId: string;
  action: string;
  targetPath: string;
  status: string;
  approvedAt: string | null;
  executedAt: string | null;
  rolledBackAt: string | null;
  snapshotId: string | null;
  contentPreview: string;
  diffPreview: string;
  error: string | null;
}

export default function GovernancePage() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<MemoryChange[]>([]);
  const [logs, setLogs] = useState<MemoryChange[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qRes = await hostApiFetch<{ success: boolean; result: MemoryChange[] }>('/api/memory/governance/queue');
      if (qRes.success) setQueue(qRes.result);

      const lRes = await hostApiFetch<{ success: boolean; result: MemoryChange[] }>('/api/memory/governance/log');
      if (lRes.success) setLogs(lRes.result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'rollback') => {
    try {
      const endpoint = action === 'rollback' ? `/api/memory/rollback/${id}` : `/api/memory/governance/${id}/${action}`;
      await hostApiFetch<{ success: boolean }>(endpoint, { method: 'POST' });
      await fetchData();
    } catch (e) {
      console.error(`Failed to ${action} ${id}`, e);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'executed': return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Executed</Badge>;
      case 'pending': return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Pending</Badge>;
      case 'rolled_back': return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Rolled Back</Badge>;
      case 'rejected': return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Rejected</Badge>;
      case 'failed': return <Badge className="bg-red-600/20 text-red-600 border-red-600/30">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-base text-foreground">
      <div className="flex items-center justify-between p-6 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 ring-1 ring-purple-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Memory Governance</h1>
            <p className="text-sm text-muted-foreground">Approve, reject, and rollback Vault modifications.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <Clock className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 p-6">
        
        {/* Pending Queue */}
        <div className="flex flex-col rounded-xl border border-border/50 bg-surface-card overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-black/5 dark:bg-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Pending Actions ({queue.length})</h2>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {queue.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                <Check className="h-8 w-8 mb-2 opacity-50" />
                <p>No pending writes</p>
              </div>
            )}
            <div className="space-y-4">
              {queue.map(q => (
                <div key={q.id} className="p-4 rounded-lg border border-border/50 bg-surface-base space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{q.action}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{q.targetPath}</span>
                    </div>
                    {renderStatusBadge(q.status)}
                  </div>
                  <div className="text-sm bg-black/5 dark:bg-white/5 p-3 rounded font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                    {q.diffPreview || q.contentPreview}
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleAction(q.id, 'reject')}>
                      <X className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button variant="outline" size="sm" className="text-green-500 hover:bg-green-500/10 hover:text-green-600 border-green-500/20" onClick={() => handleAction(q.id, 'approve')}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Approve & Write
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="flex flex-col rounded-xl border border-border/50 bg-surface-card overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-black/5 dark:bg-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Action History</h2>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                <Clock className="h-8 w-8 mb-2 opacity-50" />
                <p>No history found</p>
              </div>
            )}
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="p-3 rounded-lg border border-border/50 bg-surface-base flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{log.action}</span>
                      {renderStatusBadge(log.status)}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate max-w-sm">
                      {log.targetPath}
                    </div>
                    {log.error && (
                      <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" /> {log.error}
                      </div>
                    )}
                  </div>
                  <div>
                    {log.status === 'executed' && log.snapshotId && (
                      <Button variant="outline" size="sm" className="text-orange-500 hover:bg-orange-500/10" onClick={() => handleAction(log.id, 'rollback')}>
                        <Undo className="mr-1 h-3.5 w-3.5" /> Rollback
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
