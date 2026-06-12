import { CouncilMemory, CouncilVote, CouncilVoteDecision, DecisionRecord } from './council-memory';
import { v4 as uuidv4 } from 'uuid';

export class CouncilVoting {
  private memory: CouncilMemory;

  constructor(memory: CouncilMemory) {
    this.memory = memory;
  }

  submitVote(sessionId: string, role: string, decision: CouncilVoteDecision, rationale: string): CouncilVote | null {
    const session = this.memory.getSessionById(sessionId);
    if (!session) {
      return null;
    }

    const vote: CouncilVote = {
      id: uuidv4(),
      role,
      agentId: `agent-${role.toLowerCase()}`,
      decision,
      rationale,
      createdAt: new Date().toISOString()
    };

    session.votes.push(vote);
    this.memory.updateCouncilSession(session);
    return vote;
  }

  evaluateDecision(decisionId: string): DecisionRecord | null {
    const decision = this.memory.getDecisionById(decisionId);
    if (!decision) {
      return null;
    }

    // In a more complex system, this would evaluate votes across all sessions
    // linked to this decision. For now, it's just a placeholder for the user
    // or automated reviewer to accept/reject.
    return decision;
  }

  acceptDecision(decisionId: string): DecisionRecord | null {
    const decision = this.memory.getDecisionById(decisionId);
    if (!decision) return null;
    decision.status = 'accepted';
    decision.decidedAt = new Date().toISOString();
    this.memory.updateDecisionRecord(decision);
    return decision;
  }

  rejectDecision(decisionId: string): DecisionRecord | null {
    const decision = this.memory.getDecisionById(decisionId);
    if (!decision) return null;
    decision.status = 'rejected';
    decision.decidedAt = new Date().toISOString();
    this.memory.updateDecisionRecord(decision);
    return decision;
  }
}
