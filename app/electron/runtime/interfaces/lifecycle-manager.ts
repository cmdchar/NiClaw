export interface LifecycleManager {
  onBeforeQuit(callback: () => void | Promise<void>): void;
  requestSingleInstanceLock(): boolean;
  onSecondInstance(callback: (commandLine: string[], workingDirectory: string) => void): void;
  quit(): void;
  getAppVersion(): string;
  getAppName(): string;
  getLocale(): string;
}
