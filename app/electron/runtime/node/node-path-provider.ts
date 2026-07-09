import os from 'os';
import path from 'path';
import type { PathProvider } from '../interfaces/path-provider';

export class NodePathProvider implements PathProvider {
  getUserDataPath(): string {
    return process.env.NICLAW_USER_DATA || path.join(os.homedir(), '.config', 'ClawX');
  }
  
  getHomePath(): string {
    return process.env.NICLAW_HOME || os.homedir();
  }
  
  getLogsPath(): string {
    return process.env.NICLAW_LOGS || path.join(this.getUserDataPath(), 'logs');
  }
  
  getExePath(): string {
    return process.execPath;
  }

  getAppPath(): string {
    return process.cwd();
  }
  
  isPackaged(): boolean {
    return process.env.NICLAW_PACKAGED === 'true';
  }
}
