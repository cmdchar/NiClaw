import { EventEmitter } from 'events';

export interface ProcessLaunchOptions {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  stdio?: ('ignore' | 'pipe' | 'inherit' | 'ipc')[];
}

export interface GatewayProcess extends EventEmitter {
  pid: number | undefined;
  stdout: NodeJS.ReadableStream | null;
  stderr: NodeJS.ReadableStream | null;
  kill(): boolean;
  postMessage(message: any): void;
}

export interface ProcessLauncher {
  fork(modulePath: string, args?: string[], options?: ProcessLaunchOptions): GatewayProcess;
}
