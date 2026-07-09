import Store from 'electron-store';
import type { ConfigStore } from '../interfaces/config-store';

// We initialize store lazy to allow import without immediate side effects if needed,
// but for electron we can just instantiate it.
let electronStore: Store;

function getStore(): Store {
  if (!electronStore) {
    const StoreClass = (Store as any).default || Store;
    electronStore = new StoreClass();
  }
  return electronStore;
}

export class ElectronConfigStore implements ConfigStore {
  get<T>(key: string, defaultValue?: T): T {
    const store = getStore();
    return defaultValue !== undefined 
      ? store.get(key, defaultValue) as T 
      : store.get(key) as T;
  }

  set(key: string, value: any): void {
    getStore().set(key, value);
  }

  has(key: string): boolean {
    return getStore().has(key);
  }

  delete(key: string): void {
    getStore().delete(key);
  }
}
