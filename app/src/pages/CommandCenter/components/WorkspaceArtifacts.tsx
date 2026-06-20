import { useState } from 'react';
import { WorkspaceArtifact } from '@/types/orchestrator-workspace';
import { FileCode, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { hostApiFetch } from '@/lib/host-api';
import { toast } from 'sonner';

interface WorkspaceArtifactsProps {
  taskId: string;
  artifacts: WorkspaceArtifact[];
}

export function WorkspaceArtifacts({ taskId, artifacts }: WorkspaceArtifactsProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<WorkspaceArtifact | null>(null);
  const [artifactContent, setArtifactContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!artifacts || artifacts.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No artifacts generated yet.</div>;
  }

  const handlePreview = async (artifact: WorkspaceArtifact) => {
    setSelectedArtifact(artifact);
    setLoading(true);
    setArtifactContent('');
    try {
      const result = await hostApiFetch<{ content: string }>(`/api/orchestrator/tasks/${taskId}/workspace/artifacts/${artifact.id}/read`);
      setArtifactContent(result.content || 'Empty file');
    } catch (e: any) {
      toast.error(e.message);
      setArtifactContent(`Failed to load artifact: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {artifacts.map((art) => (
          <div key={art.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
            <div className="flex items-center gap-3 overflow-hidden">
              {art.type.includes('log') ? <FileText className="h-5 w-5 text-slate-400 shrink-0" /> : <FileCode className="h-5 w-5 text-blue-400 shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" title={art.name}>{art.name}</p>
                <p className="text-xs text-muted-foreground truncate">{new Date(art.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => handlePreview(art)} title="Preview">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!selectedArtifact} onOpenChange={(open: boolean) => !open && setSelectedArtifact(null)}>
        <SheetContent className="sm:max-w-xl w-[90vw] flex flex-col">
          <SheetHeader>
            <SheetTitle>{selectedArtifact?.name}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-md text-slate-50 font-mono text-xs whitespace-pre mt-4">
            {loading ? 'Loading...' : artifactContent}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
