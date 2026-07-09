export interface ConfigStore {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
  delete(key: string): void;
}
