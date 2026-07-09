import { MemoryProposal } from '@/hooks/useMemory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle, Clock, Check, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

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

interface MemoryProposalCardProps {
  proposal: MemoryProposal;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}

export function MemoryProposalCard({ proposal, onApprove, onReject, isProcessing }: MemoryProposalCardProps) {
  const isPending = proposal.status === 'pending';

  return (
    <Card className={`overflow-hidden transition-all ${isPending ? 'border-primary/20 shadow-md' : 'opacity-70'}`}>
      <CardHeader className="bg-muted/30 pb-3 pt-4 px-4 border-b flex flex-row items-start justify-between space-y-0">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-background">
              {proposal.sourceAgent}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(proposal.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm break-all">{proposal.affectedFile}</h4>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {proposal.status === 'pending' && <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Pending</Badge>}
          {proposal.status === 'committed' && <Badge variant="secondary" className="bg-green-500/10 text-green-500"><CheckCircle className="h-3 w-3 mr-1"/> Committed</Badge>}
          {proposal.status === 'rejected' && <Badge variant="secondary" className="bg-gray-500/10 text-gray-500"><XCircle className="h-3 w-3 mr-1"/> Rejected</Badge>}
          {proposal.status === 'failed' && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1"/> Failed</Badge>}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="bg-zinc-950 p-4 text-zinc-300 overflow-x-auto text-sm font-mono max-h-60 overflow-y-auto">
          <pre className="whitespace-pre-wrap">{proposal.proposedContent}</pre>
        </div>
        {proposal.error && (
          <div className="p-3 bg-red-500/10 text-red-500 text-xs border-t border-red-500/20">
            <strong>Error:</strong> {proposal.error}
          </div>
        )}
      </CardContent>
      
      {isPending && (
        <CardFooter className="bg-muted/10 p-3 flex justify-end gap-2 border-t">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Confidence: <span className="font-medium text-foreground">{Math.round(proposal.confidence * 100)}%</span>
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={() => onReject(proposal.id)}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-1.5" />
            Reject
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onApprove(proposal.id)}
            disabled={isProcessing}
          >
            <Check className="h-4 w-4 mr-1.5" />
            Approve
          </Button>
        </CardFooter>
      )}
      {!isPending && (proposal.committedAt || proposal.rejectedAt) && (
        <CardFooter className="bg-muted/10 p-2 border-t flex justify-between text-xs text-muted-foreground">
          <span>Processed {timeAgo(proposal.committedAt || proposal.rejectedAt!)}</span>
        </CardFooter>
      )}
    </Card>
  );
}
