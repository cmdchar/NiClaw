import { app } from 'electron';
import type { LifecycleManager } from '../interfaces/lifecycle-manager';

export class ElectronLifecycleManager implements LifecycleManager {
  onBeforeQuit(callback: () => void | Promise<void>): void {
    app.on('before-quit', async (e) => {
      await callback();
    });
  }

  requestSingleInstanceLock(): boolean {
    return app.requestSingleInstanceLock();
  }

  onSecondInstance(callback: (commandLine: string[], workingDirectory: string) => void): void {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      callback(commandLine, workingDirectory);
    });
  }

  quit(): void {
    app.quit();
  }

  getAppVersion(): string {
    return app.getVersion();
  }

  getAppName(): string {
    return app.getName();
  }

  getLocale(): string {
    try {
      if (app.isReady()) {
        return app.getLocale?.() || '';
      }
    } catch {}
    return '';
  }
}

export const electronLifecycleManager = new ElectronLifecycleManager();
