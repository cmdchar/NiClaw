export type CouncilSessionStatus = 'running' | 'completed';
export type CouncilVoteDecision = 'approve' | 'reject' | 'abstain';
export type DecisionStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

export interface CouncilOutput {
  id: string;
  role: string;
  agentId: string;
  summary: string;
  content: string;
  createdAt: string;
}

export interface CouncilVote {
  id: string;
  role: string;
  agentId: string;
  decision: CouncilVoteDecision;
  rationale: string;
  createdAt: string;
}

export interface DecisionRecord {
  id: string;
  title: string;
  rationale: string;
  status: DecisionStatus;
  options: string[];
  consequences: string[];
  linkedTaskIds: string[];
  createdAt: string;
  decidedAt: string | null;
  supersedesDecisionId: string | null;
}

export interface CouncilSession {
  id: string;
  question: string;
  status: CouncilSessionStatus;
  linkedTaskId: string | null;
  outputs: CouncilOutput[];
  votes: CouncilVote[];
  proposedDecisionId: string | null;
  createdAt: string;
  completedAt: string | null;
}
