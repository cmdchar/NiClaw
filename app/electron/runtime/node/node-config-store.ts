import fs from 'fs';
import path from 'path';
import type { ConfigStore } from '../interfaces/config-store';

export class NodeConfigStore implements ConfigStore {
  private configPath: string;
  private data: Record<string, any>;

  constructor(userDataPath: string) {
    this.configPath = path.join(userDataPath, 'config.json');
    this.data = this.loadConfig();
  }

  private loadConfig(): Record<string, any> {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (e) {
      console.warn('Failed to load config:', e);
    }
    return {};
  }

  private saveConfig(): void {
    try {
      fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    const value = this.data[key];
    return value !== undefined ? value as T : defaultValue as T;
  }

  set(key: string, value: any): void {
    this.data[key] = value;
    this.saveConfig();
  }

  has(key: string): boolean {
    return key in this.data;
  }

  delete(key: string): void {
    delete this.data[key];
    this.saveConfig();
  }
}
