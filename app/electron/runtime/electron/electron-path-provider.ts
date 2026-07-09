import { app } from 'electron';
import type { PathProvider } from '../interfaces/path-provider';

export class ElectronPathProvider implements PathProvider {
  getUserDataPath(): string {
    return app.getPath('userData');
  }
  
  getHomePath(): string {
    return app.getPath('home');
  }
  
  getLogsPath(): string {
    return app.getPath('logs');
  }
  
  getExePath(): string {
    return app.getPath('exe');
  }

  getAppPath(): string {
    return app.getAppPath();
  }
  
  isPackaged(): boolean {
    return app.isPackaged;
  }
}
