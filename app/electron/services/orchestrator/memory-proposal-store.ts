import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { pathProvider } from '../../runtime/runtime-factory';

export interface MemoryProposal {
  id: string;
  sourceAgent: string;
  confidence: number;
  affectedFile: string;
  proposedContent: string;
  status: 'pending' | 'approved' | 'rejected' | 'committed' | 'failed';
  timestamp: string;
}

export class MemoryProposalStore {
  private db: Database.Database;

  constructor() {
    const userDataPath = pathProvider.getUserDataPath();
    const storeDir = join(userDataPath, 'clawx');
    if (!existsSync(storeDir)) {
      mkdirSync(storeDir, { recursive: true });
    }
    const dbPath = join(storeDir, 'memory-proposals.sqlite');
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        sourceAgent TEXT NOT NULL,
        confidence REAL NOT NULL,
        affectedFile TEXT NOT NULL,
        proposedContent TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        error TEXT,
        committedAt TEXT,
        rejectedAt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
    `);
    
    // Attempt to add columns if they don't exist (basic migration for existing DB)
    try { this.db.exec('ALTER TABLE proposals ADD COLUMN error TEXT;'); } catch (e) { /* ignore if exists */ }
    try { this.db.exec('ALTER TABLE proposals ADD COLUMN committedAt TEXT;'); } catch (e) { /* ignore if exists */ }
    try { this.db.exec('ALTER TABLE proposals ADD COLUMN rejectedAt TEXT;'); } catch (e) { /* ignore if exists */ }
  }

  public insertProposal(proposal: MemoryProposal): void {
    const stmt = this.db.prepare(`
      INSERT INTO proposals (id, sourceAgent, confidence, affectedFile, proposedContent, status, timestamp)
      VALUES (@id, @sourceAgent, @confidence, @affectedFile, @proposedContent, @status, @timestamp)
    `);
    stmt.run(proposal);
  }

  public getProposals(status?: string): MemoryProposal[] {
    if (status) {
      const stmt = this.db.prepare(`SELECT * FROM proposals WHERE status = ? ORDER BY timestamp DESC`);
      return stmt.all(status) as MemoryProposal[];
    }
    const stmt = this.db.prepare(`SELECT * FROM proposals ORDER BY timestamp DESC`);
    return stmt.all() as MemoryProposal[];
  }

  public getProposalById(id: string): MemoryProposal | undefined {
    const stmt = this.db.prepare(`SELECT * FROM proposals WHERE id = ?`);
    return stmt.get(id) as MemoryProposal | undefined;
  }

  public updateProposalStatus(
    id: string, 
    status: 'pending' | 'approved' | 'rejected' | 'committed' | 'failed', 
    error?: string
  ): void {
    const timestamp = new Date().toISOString();
    if (status === 'committed') {
      const stmt = this.db.prepare(`UPDATE proposals SET status = ?, committedAt = ?, error = NULL WHERE id = ?`);
      stmt.run(status, timestamp, id);
    } else if (status === 'rejected') {
      const stmt = this.db.prepare(`UPDATE proposals SET status = ?, rejectedAt = ? WHERE id = ?`);
      stmt.run(status, timestamp, id);
    } else if (status === 'failed') {
      const stmt = this.db.prepare(`UPDATE proposals SET status = ?, error = ? WHERE id = ?`);
      stmt.run(status, error || null, id);
    } else {
      const stmt = this.db.prepare(`UPDATE proposals SET status = ? WHERE id = ?`);
      stmt.run(status, id);
    }
  }
}

let _instance: MemoryProposalStore | null = null;
export function getMemoryProposalStore(): MemoryProposalStore {
  if (!_instance) { _instance = new MemoryProposalStore(); }
  return _instance;
}
