import { useCallback, useEffect, useState } from 'react';
import type { CouncilSession, DecisionRecord } from '@/types/council';
import { hostApiFetch } from '@/lib/host-api';
import { CouncilSessionView } from './CouncilSessionView';
import { Button } from '@/components/ui/button';

export function CouncilHarness({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<CouncilSession[]>([]);
  const [decisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res: any = await hostApiFetch('/api/council/sessions');
      if (res?.success && res?.sessions) {
        setSessions(res.sessions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleStartCouncil = async () => {
    if (!question.trim()) return;
    setBusy(true);
    try {
      await hostApiFetch('/api/council/sessions', {
        method: 'POST',
        body: JSON.stringify({ question })
      });
      setQuestion('');
      await fetchState();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptDecision = async (id: string) => {
    try {
      await hostApiFetch('/api/council/decision/accept', {
        method: 'POST',
        body: JSON.stringify({ decisionId: id })
      });
      await fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectDecision = async (id: string) => {
    try {
      await hostApiFetch('/api/council/decision/reject', {
        method: 'POST',
        body: JSON.stringify({ decisionId: id })
      });
      await fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-5">Loading council...</div>;

  return (
    <div className="flex h-full flex-col min-h-0 bg-slate-900 overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
        <h2 className="text-lg font-semibold text-white">Council (Decision Engine)</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs text-white hover:bg-white/10">
          ← Back to Map
        </Button>
      </div>
      <div className="flex-1 p-4">
        <CouncilSessionView
          sessions={sessions}
          decisions={decisions}
          createCouncilForm={
            <div className="flex flex-col gap-2">
              <input 
                className="w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-sm outline-none text-white focus:border-blue-500"
                placeholder="What is the mission or question?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
              <button 
                className="self-end rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white uppercase tracking-wider disabled:opacity-50"
                onClick={handleStartCouncil}
                disabled={busy || !question.trim()}
              >
                {busy ? "Running..." : "Start Council"}
              </button>
            </div>
          }
          onAcceptDecision={handleAcceptDecision}
          onRejectDecision={handleRejectDecision}
        />
      </div>
    </div>
  );
}
