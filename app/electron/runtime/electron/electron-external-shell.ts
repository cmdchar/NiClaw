import { shell } from 'electron';
import type { ExternalShell } from '../interfaces/external-shell';

export class ElectronExternalShell implements ExternalShell {
  async openExternal(url: string): Promise<void> {
    await shell.openExternal(url);
  }

  showItemInFolder(fullPath: string): void {
    shell.showItemInFolder(fullPath);
  }
}
