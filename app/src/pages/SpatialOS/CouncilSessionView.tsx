import type { ReactNode } from "react";
import type { CouncilSession, DecisionRecord } from "../../types/council";

export function CouncilSessionView({
  sessions,
  decisions,
  createCouncilForm,
  onAcceptDecision,
  onRejectDecision,
}: {
  sessions: CouncilSession[];
  decisions: DecisionRecord[];
  createCouncilForm: ReactNode;
  onAcceptDecision: (decisionId: string) => void;
  onRejectDecision: (decisionId: string) => void;
}) {
  // Use settings store or other stores if we need agents/tasks in the future
  const latest = sessions[0] ?? null;
  const decision = latest?.proposedDecisionId ? decisions.find((item) => item.id === latest.proposedDecisionId) ?? null : null;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] text-white">
      <div className="space-y-4">
        <div className="rounded-[26px] border border-white/20 bg-black/40 p-5 backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gray-400">Council Session</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{latest?.question ?? "Start a mission council"}</h3>
          <p className="mt-3 text-sm leading-7 text-gray-300">Strategist, Architect, Reviewer and QA produce role outputs, vote, then create a proposed decision for human acceptance.</p>
          {latest?.linkedTaskId ? <p className="mt-3 rounded-full bg-blue-500/10 px-3 py-2 text-xs text-blue-400">Linked task: {latest.linkedTaskId}</p> : null}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {(latest?.outputs ?? []).map((output) => {
            return (
              <div key={output.id} className="rounded-[24px] border border-white/20 bg-black/40 p-4 backdrop-blur-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{output.role}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gray-400">{output.agentId}</p>
                  </div>
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-green-400">output</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-300">{output.content}</p>
              </div>
            );
          })}
          {!latest ? <div className="rounded-[24px] border border-dashed border-white/20 bg-black/20 p-5 text-sm text-gray-400 backdrop-blur-md">No council session yet. Ask a question to generate role outputs and votes.</div> : null}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-[26px] border border-white/20 bg-black/40 p-5 backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gray-400">Start council</p>
          <div className="mt-4">{createCouncilForm}</div>
        </div>
        <div className="rounded-[26px] border border-white/20 bg-black/40 p-5 backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gray-400">Vote table</p>
          <div className="mt-3 space-y-2">
            {(latest?.votes ?? []).map((vote) => (
              <div key={vote.id} className="rounded-[18px] border border-white/20 bg-black/30 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{vote.role}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${vote.decision === "approve" ? "bg-green-500/10 text-green-400" : vote.decision === "reject" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>{vote.decision}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-300">{vote.rationale}</p>
              </div>
            ))}
            {!latest?.votes.length ? <p className="text-sm text-gray-400">Votes appear after the council finishes.</p> : null}
          </div>
        </div>
        {decision ? (
          <div className="rounded-[26px] border border-blue-500/20 bg-blue-500/10 p-5 backdrop-blur-md">
            <p className="text-[11px] uppercase tracking-[0.28em] text-blue-400">Proposed decision</p>
            <h4 className="mt-2 text-base font-semibold">{decision.title}</h4>
            <p className="mt-3 text-sm leading-6 text-gray-300">{decision.rationale}</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-full bg-green-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-50" disabled={decision.status !== "proposed"} onClick={() => onAcceptDecision(decision.id)} type="button">Accept</button>
              <button className="rounded-full border border-red-500/30 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-400 disabled:opacity-50 hover:bg-red-500/10" disabled={decision.status !== "proposed"} onClick={() => onRejectDecision(decision.id)} type="button">Reject</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
