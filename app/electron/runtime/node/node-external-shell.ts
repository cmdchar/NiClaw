import { exec } from 'child_process';
import type { ExternalShell } from '../interfaces/external-shell';
import os from 'os';

export class NodeExternalShell implements ExternalShell {
  async openExternal(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let command: string;
      if (os.platform() === 'win32') {
        command = `start "" "${url}"`;
      } else if (os.platform() === 'darwin') {
        command = `open "${url}"`;
      } else {
        command = `xdg-open "${url}"`;
      }

      exec(command, (error) => {
        if (error) {
          console.warn(`Failed to open URL: ${url}`, error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  showItemInFolder(fullPath: string): void {
    let command: string;
    if (os.platform() === 'win32') {
      command = `explorer /select,"${fullPath}"`;
    } else if (os.platform() === 'darwin') {
      command = `open -R "${fullPath}"`;
    } else {
      command = `xdg-open "${path.dirname(fullPath)}"`; // Basic fallback for Linux
    }

    exec(command, (error) => {
      if (error) {
        console.warn(`Failed to show item in folder: ${fullPath}`, error);
      }
    });
  }
}

import path from 'path'; // Need to import path for the linux fallback above
