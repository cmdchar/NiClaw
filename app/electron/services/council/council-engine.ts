import { CouncilMemory, CouncilSession, CouncilOutput, DecisionRecord } from './council-memory';
import { AgentProvider } from './council-runtime';
import { v4 as uuidv4 } from 'uuid';

export class CouncilEngine {
  private memory: CouncilMemory;
  private provider: AgentProvider;

  constructor(memory: CouncilMemory, provider: AgentProvider) {
    this.memory = memory;
    this.provider = provider;
  }

  async runSession(question: string, linkedTaskId: string | null = null): Promise<CouncilSession> {
    const session: CouncilSession = {
      id: uuidv4(),
      question,
      status: 'running',
      linkedTaskId,
      outputs: [],
      votes: [],
      proposedDecisionId: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    this.memory.addCouncilSession(session);

    // 1. Strategist
    const strategistPrompt = `Role: Strategist
You are framing the problem and defining the core objectives.
Context / Question: ${question}
Output a brief summary of the strategy.`;
    const stratResult = await this.provider.execute(strategistPrompt);
    this.appendOutput(session, 'Strategist', stratResult.output);

    // 2. Architect
    const architectPrompt = `Role: Architect
You are designing the technical approach based on the Strategist's framing.
Question: ${question}
Strategist Strategy: ${stratResult.output}
Output a concrete implementation path.`;
    const archResult = await this.provider.execute(architectPrompt);
    this.appendOutput(session, 'Architect', archResult.output);

    // 3. Reviewer
    const reviewerPrompt = `Role: Reviewer
You are analyzing risks and tradeoffs of the Architect's path.
Architect Path: ${archResult.output}
Output a critical review.`;
    const revResult = await this.provider.execute(reviewerPrompt);
    this.appendOutput(session, 'Reviewer', revResult.output);

    // 4. QA
    const qaPrompt = `Role: QA
You are defining verification steps for the proposed solution.
Architect Path: ${archResult.output}
Review: ${revResult.output}
Output the necessary QA checks.`;
    const qaResult = await this.provider.execute(qaPrompt);
    this.appendOutput(session, 'QA', qaResult.output);

    // Synthesize Decision
    const decision: DecisionRecord = {
      id: uuidv4(),
      title: `Council Decision for ${question.substring(0, 30)}...`,
      rationale: `Based on architect path: ${archResult.output}`,
      status: 'proposed',
      options: [],
      consequences: [],
      linkedTaskIds: linkedTaskId ? [linkedTaskId] : [],
      createdAt: new Date().toISOString(),
      decidedAt: null,
      supersedesDecisionId: null
    };
    
    this.memory.addDecisionRecord(decision);

    session.proposedDecisionId = decision.id;
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    
    this.memory.updateCouncilSession(session);
    return session;
  }

  private appendOutput(session: CouncilSession, role: string, content: string) {
    const output: CouncilOutput = {
      id: uuidv4(),
      role,
      agentId: `agent-${role.toLowerCase()}`,
      summary: `${role} output`,
      content: content || 'No output generated',
      createdAt: new Date().toISOString()
    };
    session.outputs.push(output);
    this.memory.updateCouncilSession(session);
  }
}
