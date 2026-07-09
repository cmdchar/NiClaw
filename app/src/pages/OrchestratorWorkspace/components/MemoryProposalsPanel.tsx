import { useMemoryProposals, useMemoryMutations } from '@/hooks/useMemory';
import { MemoryProposalCard } from './MemoryProposalCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database } from 'lucide-react';

export function MemoryProposalsPanel() {
  const { proposals, status, setStatus, page, setPage, loading, refreshing, refresh } = useMemoryProposals();
  const { approve, reject, loading: processing } = useMemoryMutations(refresh);
  
  const statuses = ['pending', 'committed', 'rejected', 'failed'];

  const handleApprove = async (id: string) => {
    try {
      await approve(id);
    } catch (e) {
      // Error handled by hook
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reject(id);
    } catch (e) {
      // Error handled by hook
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="border-b bg-muted/10 px-6 py-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Database className="h-5 w-5" />
            <h2 className="text-lg font-semibold tracking-tight">Global Memory Proposals</h2>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing || loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          {statuses.map(s => (
            <Button
              key={s}
              variant={status === s ? "secondary" : "ghost"}
              size="sm"
              onClick={() => { setStatus(s); setPage(1); }}
              className={`capitalize ${status === s ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && proposals.length === 0 ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-foreground">No {status} proposals</p>
            <p className="text-sm">Agents haven't generated any memory proposals here.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto pb-8">
            {proposals.map(proposal => (
              <MemoryProposalCard 
                key={proposal.id} 
                proposal={proposal} 
                onApprove={handleApprove}
                onReject={handleReject}
                isProcessing={processing}
              />
            ))}
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t mt-8">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm font-medium">Page {page}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)}
                disabled={proposals.length < 20 || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
