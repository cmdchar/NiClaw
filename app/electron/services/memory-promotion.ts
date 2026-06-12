import { join } from 'node:path';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { getOpenClawConfigDir } from '../utils/paths';
import { hermesDreamEngine } from './dream-engine';

export type PromotionLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
export type PromotionType = 'idea' | 'task' | 'project' | 'note' | 'link' | 'knowledge_gap' | 'research_direction';
export type PromotionStatus = 'promoted' | 'accepted_for_future_write' | 'rejected';

export interface MemoryPromotion {
  id: string;
  sourceProposalId: string;
  level: PromotionLevel;
  type: PromotionType;
  title: string;
  content: string;
  confidence: number;
  promotionReason: string;
  status: PromotionStatus;
  createdAt: string;
}

export interface DreamPromotionsData {
  version: number;
  updatedAt: string;
  items: MemoryPromotion[];
}

export class MemoryPromotionService {
  private promotionsPath: string;

  constructor() {
    const configDir = getOpenClawConfigDir();
    this.promotionsPath = join(configDir, 'dream-promotions.json');
  }

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

  public async getPromotions(): Promise<DreamPromotionsData> {
    return this.readJson<DreamPromotionsData>(this.promotionsPath, {
      version: 1,
      updatedAt: new Date().toISOString(),
      items: []
    });
  }

  public async runPromotionCycle(): Promise<DreamPromotionsData> {
    const data = await this.getPromotions();
    const queue = await hermesDreamEngine.getReviewQueue();
    const approvedItems = queue.filter(q => q.status === 'approved');
    
    let changed = false;

    for (const item of approvedItems) {
      // Check if already promoted
      if (data.items.some(p => p.sourceProposalId === item.id)) {
        continue;
      }

      // Map proposal type to promotion type
      let pType: PromotionType = 'idea';
      if (item.type === 'suggested_task') pType = 'task';
      else if (item.type === 'suggested_project') pType = 'project';
      else if (item.type === 'suggested_note') pType = 'note';
      else if (item.type === 'suggested_link') pType = 'link';

      // Decide level based on type / logic
      // In a real AI implementation, we'd use an LLM for classification.
      let level: PromotionLevel = 'L2'; 
      if (pType === 'project' || pType === 'note') level = 'L3';

      data.items.push({
        id: `prom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        sourceProposalId: item.id,
        level,
        type: pType,
        title: item.title,
        content: item.content,
        confidence: 0.85,
        promotionReason: 'Approved by user via Dream Engine Review Queue.',
        status: 'promoted',
        createdAt: new Date().toISOString()
      });
      changed = true;
    }

    if (changed) {
      data.updatedAt = new Date().toISOString();
      await this.writeJson(this.promotionsPath, data);
    }

    return data;
  }

  public async updatePromotionStatus(id: string, status: PromotionStatus): Promise<boolean> {
    const data = await this.getPromotions();
    const item = data.items.find(p => p.id === id);
    if (!item) return false;

    item.status = status;
    if (status === 'accepted_for_future_write') {
      item.level = 'L4'; // Elevate to permanent memory candidate
    }
    
    data.updatedAt = new Date().toISOString();
    await this.writeJson(this.promotionsPath, data);
    return true;
  }
}

export const memoryPromotionService = new MemoryPromotionService();
