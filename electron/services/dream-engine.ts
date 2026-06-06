import { join } from 'node:path';
import { readFile, writeFile, appendFile, stat } from 'node:fs/promises';
import { getOpenClawConfigDir } from '../utils/paths';
import { obsidianMemoryService } from './obsidian-memory';

export type MemoryClassification = 'Dream Seeds' | 'Knowledge' | 'Events' | 'Projects' | 'People' | 'Tasks' | 'Ideas';
export type ProposalType = 'suggested_note' | 'suggested_link' | 'suggested_insight' | 'suggested_project' | 'suggested_task';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'edited';

export interface RelevanceScore {
  relevance: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  ageDays: number;
  cluster: string;
  source: string;
}

export interface DreamSignal {
  id: string;
  timestamp: number;
  source: string;
  content: string;
  type: string;
  priority: number;
  processed: boolean;
  classification?: MemoryClassification;
  scoring?: RelevanceScore;
}

export interface ProposedItem {
  id: string;
  type: ProposalType;
  title: string;
  content: string;
  reasoning: string;
  status: ProposalStatus;
  timestamp: number;
}

export interface GraphNode {
  id: string;
  type: 'Note' | 'Project' | 'Person' | 'Idea' | 'Task' | 'Event';
  label: string;
  lastSeen?: string;
  timesSeen?: number;
  sourceTypes?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'references' | 'related_to' | 'blocks' | 'depends_on' | 'created_by' | 'inspired_by';
  strength?: number;
  lastSeen?: string;
  timesReinforced?: number;
  evidence?: string[];
}

export interface KnowledgeGraph {
  version: number;
  updatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DreamInsights {
  diary: Array<{ id: string; date: string; summary: string }>;
  suggestedConnections: Array<{ source: string; target: string; rationale: string }>;
  knowledgeGaps: string[];
  potentialProjects: string[];
  potentialTasks: string[];
  potentialResearchDirections: string[];
  dormantIdeasReactivated: string[];
  lastRunTimestamp: number;
}

export class HermesDreamEngine {
  private inboxPath: string;
  private insightsPath: string;
  private reviewQueuePath: string;
  private graphPath: string;

  constructor() {
    const configDir = getOpenClawConfigDir();
    this.inboxPath = join(configDir, 'dream-inbox.jsonl');
    this.insightsPath = join(configDir, 'dream-insights.json');
    this.reviewQueuePath = join(configDir, 'dream-review-queue.json');
    this.graphPath = join(configDir, 'dream-graph.json');
  }

  public async initBackups(): Promise<void> {
    const timestamp = Date.now();
    for (const p of [this.insightsPath, this.reviewQueuePath, this.graphPath]) {
      try {
        const s = await stat(p);
        if (s.isFile()) {
          const backupPath = p.replace(/\.json$/, `.backup.${timestamp}.json`);
          const data = await readFile(p);
          await writeFile(backupPath, data);
        }
      } catch {
        // ignore if not exists
      }
    }
  }

  // --- Base Utilities ---
  private async readJson<T>(path: string, fallback: T): Promise<T> {
    try {
      const s = await stat(path);
      if (!s.isFile()) return fallback;
      const data = await readFile(path, 'utf8');
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }

  private async writeJson<T>(path: string, data: T): Promise<void> {
    await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
  }

  // --- Inbox & Signals ---
  public async addSignal(content: string, type = 'dreamSeed', source = 'mobile', priority = 1): Promise<DreamSignal> {
    const signal: DreamSignal = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      source,
      content,
      type,
      priority,
      processed: false,
      classification: 'Dream Seeds',
      scoring: {
        relevance: 0.8,
        confidence: 0.7,
        ageDays: 0,
        cluster: 'Uncategorized',
        source: 'User Input'
      }
    };
    await appendFile(this.inboxPath, JSON.stringify(signal) + '\n', 'utf8');
    return signal;
  }

  public async getInbox(): Promise<DreamSignal[]> {
    try {
      const s = await stat(this.inboxPath);
      if (!s.isFile()) return [];
      const data = await readFile(this.inboxPath, 'utf8');
      return data.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try { return JSON.parse(line) as DreamSignal; } 
          catch { return null; }
        })
        .filter(s => s !== null) as DreamSignal[];
    } catch {
      return [];
    }
  }

  // --- Review Queue ---
  public async getReviewQueue(): Promise<ProposedItem[]> {
    return this.readJson<ProposedItem[]>(this.reviewQueuePath, []);
  }

  public async updateProposalStatus(id: string, status: ProposalStatus, newContent?: string): Promise<boolean> {
    const queue = await this.getReviewQueue();
    const item = queue.find(q => q.id === id);
    if (!item) return false;
    
    item.status = status;
    if (newContent !== undefined) {
      item.content = newContent;
      if (status !== 'approved' && status !== 'rejected') {
        item.status = 'edited';
      }
    }
    
    // In a full implementation, if status === 'approved', write to Obsidian!
    // But currently we keep it strict READ-ONLY for the Vault.
    
    await this.writeJson(this.reviewQueuePath, queue);
    return true;
  }

  // --- Graph Layer ---
  public async getGraph(): Promise<KnowledgeGraph> {
    return this.readJson<KnowledgeGraph>(this.graphPath, { version: 1, updatedAt: new Date().toISOString(), nodes: [], edges: [] });
  }

  // --- Insights & Diary ---
  public async getInsights(): Promise<DreamInsights> {
    return this.readJson<DreamInsights>(this.insightsPath, {
      diary: [],
      suggestedConnections: [],
      knowledgeGaps: [],
      potentialProjects: [],
      potentialTasks: [],
      potentialResearchDirections: [],
      dormantIdeasReactivated: [],
      lastRunTimestamp: 0
    });
  }

  public async getDreamDiaryContent(): Promise<string> {
    try {
      const diaryPath = join(obsidianMemoryService.getVaultRoot(), 'DREAMS.md');
      const s = await stat(diaryPath);
      if (s.isFile()) {
        return await readFile(diaryPath, 'utf8');
      }
    } catch {
      // ignore
    }
    return '';
  }

  // --- Core Dreaming Cycle ---
  public async triggerDreamCycle(): Promise<DreamInsights> {
    const inbox = await this.getInbox();
    const unprocessed = inbox.filter(s => !s.processed);
    
    const recentNotes = await obsidianMemoryService.listRecentNotes(5);
    
    // 1. Generate Mock Insights
    const insights: DreamInsights = {
      diary: [{
        id: `diary_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        summary: `Consolidated ${unprocessed.length} signals.`
      }],
      suggestedConnections: [],
      knowledgeGaps: ['Lipsa unei reprezentări graf orientate pe relații dintre note.'],
      potentialProjects: ['Interactive Knowledge Graph'],
      potentialTasks: ['Define graph extraction prompt for Hermes'],
      potentialResearchDirections: ['AI Memory Consolidation Techniques'],
      dormantIdeasReactivated: [],
      lastRunTimestamp: Date.now()
    };

    if (unprocessed.length > 0) {
      insights.suggestedConnections.push({
        source: 'Spatial AI OS',
        target: 'BoardAI',
        rationale: 'Potential semantic overlap found during consolidation.'
      });
      insights.dormantIdeasReactivated.push(unprocessed[0].content.substring(0, 30));
    }

    await this.writeJson(this.insightsPath, insights);

    // 2. Generate Mock Review Queue Items
    const queue = await this.getReviewQueue();
    if (unprocessed.length > 0) {
      queue.push({
        id: `prop_${Date.now()}`,
        type: 'suggested_note',
        title: 'New Insight from Dream',
        content: `Reflecting on: ${unprocessed[0].content}`,
        reasoning: 'Extracted an actionable concept from today’s dream seeds.',
        status: 'pending',
        timestamp: Date.now()
      });
      await this.writeJson(this.reviewQueuePath, queue);
    }

    // 3. Update Graph
    const graph = await this.getGraph();
    const nowIso = new Date().toISOString();
    
    if (graph.nodes.length === 0) {
      // Seed some initial nodes
      graph.nodes.push({ id: 'n1', type: 'Project', label: 'Hermes Dream Engine', lastSeen: nowIso, timesSeen: 1 });
      graph.nodes.push({ id: 'n2', type: 'Note', label: 'Spatial AI', lastSeen: nowIso, timesSeen: 1 });
      graph.edges.push({ source: 'n1', target: 'n2', type: 'related_to', strength: 0.1, lastSeen: nowIso, timesReinforced: 1 });
    } else {
      // V3: Increment existing nodes for demonstration
      graph.nodes.forEach(n => {
        n.timesSeen = (n.timesSeen || 0) + 1;
        n.lastSeen = nowIso;
      });
      graph.edges.forEach(e => {
        e.timesReinforced = (e.timesReinforced || 0) + 1;
        e.strength = Math.min((e.strength || 0.1) + 0.1, 1.0);
        e.lastSeen = nowIso;
      });
    }

    // Add new nodes for recent signals
    if (unprocessed.length > 0) {
      const newNodeId = `n_${Date.now()}`;
      graph.nodes.push({ 
        id: newNodeId, 
        type: 'Idea', 
        label: unprocessed[0].content.substring(0, 20),
        lastSeen: nowIso,
        timesSeen: 1,
        sourceTypes: ['dreamSeed']
      });
      graph.edges.push({ 
        source: newNodeId, 
        target: 'n1', 
        type: 'inspired_by',
        strength: 0.1,
        lastSeen: nowIso,
        timesReinforced: 1,
        evidence: [unprocessed[0].id]
      });
    }
    graph.updatedAt = nowIso;
    await this.writeJson(this.graphPath, graph);

    // 4. Mark inbox processed
    const processedInbox = inbox.map(s => ({ ...s, processed: true }));
    await writeFile(this.inboxPath, processedInbox.map(s => JSON.stringify(s)).join('\n') + '\n', 'utf8');

    return insights;
  }
}

export const hermesDreamEngine = new HermesDreamEngine();
