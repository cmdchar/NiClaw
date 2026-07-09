import type { LifecycleManager } from '../interfaces/lifecycle-manager';

export class NodeLifecycleManager implements LifecycleManager {
  private quitHandlers: Array<() => void | Promise<void>> = [];

  onBeforeQuit(callback: () => void | Promise<void>): void {
    this.quitHandlers.push(callback);
    // Bind to process signals
    if (this.quitHandlers.length === 1) {
      process.on('SIGINT', () => this.handleQuit());
      process.on('SIGTERM', () => this.handleQuit());
    }
  }

  private async handleQuit() {
    for (const handler of this.quitHandlers) {
      await handler();
    }
    process.exit(0);
  }

  requestSingleInstanceLock(): boolean {
    // In node, typically handled by PID file or a port lock.
    // For now we'll return true to allow execution.
    return true; 
  }

  onSecondInstance(callback: (commandLine: string[], workingDirectory: string) => void): void {
    // Not typically implemented out of the box for node daemons without IPC.
  }

  quit(): void {
    this.handleQuit();
  }

  getAppVersion(): string {
    return process.env.npm_package_version || 'unknown';
  }

  getAppName(): string {
    return 'OpenClaw';
  }

  getLocale(): string {
    const env = process.env;
    return env.LC_ALL || env.LC_MESSAGES || env.LANG || env.LANGUAGE || 'en-US';
  }
}

export const nodeLifecycleManager = new NodeLifecycleManager();
