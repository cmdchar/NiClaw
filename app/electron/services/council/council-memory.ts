import * as fs from 'fs';
import * as path from 'path';

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

export interface SuperHermesState {
  councilSessions: CouncilSession[];
  decisionRecords: DecisionRecord[];
}

export class CouncilMemory {
  private stateFilePath: string;
  private state: SuperHermesState;

  constructor(dataDirectory: string) {
    this.stateFilePath = path.join(dataDirectory, 'superhermes-state.json');
    this.state = this.loadState();
  }

  private loadState(): SuperHermesState {
    if (fs.existsSync(this.stateFilePath)) {
      try {
        const data = fs.readFileSync(this.stateFilePath, 'utf-8');
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse superhermes-state.json, starting fresh', e);
      }
    }
    return {
      councilSessions: [],
      decisionRecords: [],
    };
  }

  public saveState(): void {
    try {
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save superhermes-state.json', e);
    }
  }

  public getState(): SuperHermesState {
    return this.state;
  }

  public addCouncilSession(session: CouncilSession): void {
    this.state.councilSessions.push(session);
    this.saveState();
  }

  public updateCouncilSession(session: CouncilSession): void {
    const idx = this.state.councilSessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      this.state.councilSessions[idx] = session;
      this.saveState();
    }
  }

  public addDecisionRecord(decision: DecisionRecord): void {
    this.state.decisionRecords.push(decision);
    this.saveState();
  }

  public updateDecisionRecord(decision: DecisionRecord): void {
    const idx = this.state.decisionRecords.findIndex((d) => d.id === decision.id);
    if (idx !== -1) {
      this.state.decisionRecords[idx] = decision;
      this.saveState();
    }
  }

  public getSessionById(id: string): CouncilSession | undefined {
    return this.state.councilSessions.find((s) => s.id === id);
  }

  public getDecisionById(id: string): DecisionRecord | undefined {
    return this.state.decisionRecords.find((d) => d.id === id);
  }
}
