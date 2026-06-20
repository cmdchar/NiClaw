import { useState } from 'react';
import { WorkspacePatch } from '@/types/orchestrator-workspace';
import { Button } from '@/components/ui/button';
import { hostApiFetch } from '@/lib/host-api';
import { toast } from 'sonner';
import { Check, X, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkspacePatchReviewProps {
  taskId: string;
  patches: WorkspacePatch[];
  onReviewCompleted: () => void;
}

export function WorkspacePatchReview({ taskId, patches, onReviewCompleted }: WorkspacePatchReviewProps) {
  const [loading, setLoading] = useState(false);

  if (!patches || patches.length === 0) {
    return null;
  }

  // Usually there's only one active patch per task
  const activePatch = patches[patches.length - 1];

  const handleAction = async (action: 'apply-patch' | 'reject-patch' | 'approve-patch') => {
    setLoading(true);
    try {
      const result = await hostApiFetch<{ message?: string }>(`/api/orchestrator/tasks/${taskId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success(result.message || 'Action successful');
      onReviewCompleted();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold flex items-center gap-2">
            Workspace Patch 
            <Badge variant="outline" className="bg-white dark:bg-slate-900">{activePatch.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">{new Date(activePatch.createdAt).toLocaleString()}</div>
        </div>
        <p className="text-sm mb-3"><strong>Target:</strong> {activePatch.targetFile}</p>
        
        <div className="bg-slate-950 p-4 rounded-md text-slate-50 font-mono text-xs whitespace-pre overflow-x-auto max-h-[400px] mb-4">
          {activePatch.diff || 'No diff content'}
        </div>

        <div className="flex items-center gap-3">
          {activePatch.status === 'proposed' && (
            <>
              <Button onClick={() => handleAction('apply-patch')} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <ArrowUpRight className="h-4 w-4" /> Apply Locally
              </Button>
              <Button onClick={() => handleAction('reject-patch')} disabled={loading} variant="destructive" className="gap-2">
                <X className="h-4 w-4" /> Reject Patch
              </Button>
            </>
          )}

          {activePatch.status === 'approved' && (
            <>
              <Button onClick={() => handleAction('approve-patch')} disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Check className="h-4 w-4" /> Commit to Repo
              </Button>
              <Button onClick={() => handleAction('reject-patch')} disabled={loading} variant="destructive" className="gap-2">
                <X className="h-4 w-4" /> Discard Local Changes
              </Button>
            </>
          )}

          {(activePatch.status === 'applied' || activePatch.status === 'rejected') && (
            <p className="text-sm text-muted-foreground">This patch has been {activePatch.status}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
