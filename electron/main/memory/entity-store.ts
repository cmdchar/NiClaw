import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { getOpenClawConfigDir } from '../../utils/paths';

export interface MemoryEntity {
  id: string;
  type: 'person' | 'project' | 'decision' | 'fact';
  label: string;
  content: string;
  tags: string[];
  lastUpdated: string;
}

export class EntityStore {
  private memoryPath = join(getOpenClawConfigDir(), 'memory-entities.json');

  async saveEntity(entity: MemoryEntity): Promise<void> {
    const entities = await this.getAllEntities();
    entities[entity.id] = { ...entity, lastUpdated: new Date().toISOString() };
    await writeFile(this.memoryPath, JSON.stringify(entities, null, 2));
  }

  async getEntity(id: string): Promise<MemoryEntity | undefined> {
    const entities = await this.getAllEntities();
    return entities[id];
  }

  async getAllEntities(): Promise<Record<string, MemoryEntity>> {
    try {
      const data = await readFile(this.memoryPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async query(text: string): Promise<MemoryEntity[]> {
    const entities = Object.values(await this.getAllEntities());
    const query = text.toLowerCase();
    return entities.filter(e =>
      e.label.toLowerCase().includes(query) ||
      e.content.toLowerCase().includes(query) ||
      e.tags.some(t => t.toLowerCase().includes(query))
    );
  }
}

export const entityStore = new EntityStore();
