import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { hostApiFetch } from '@/lib/host-api';
import { toast } from 'sonner';

interface ClarificationCardProps {
  taskId: string;
  onResolved: () => void;
}

export function ClarificationCard({ taskId, onResolved }: ClarificationCardProps) {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      await hostApiFetch(`/api/orchestrator/tasks/${taskId}/clarify`, {
        method: 'POST',
        body: JSON.stringify({ answer }),
      });
      toast.success('Clarification submitted');
      onResolved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/10">
      <h3 className="font-semibold mb-2">Agent Needs Clarification</h3>
      <p className="text-sm text-muted-foreground mb-4">
        The agent has paused execution and requires your input to proceed. Please provide an answer below.
      </p>
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your clarification here..."
        className="mb-3"
        rows={4}
      />
      <Button onClick={handleSubmit} disabled={loading || !answer.trim()}>
        Submit Clarification
      </Button>
    </div>
  );
}
