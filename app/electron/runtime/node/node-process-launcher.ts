import { fork } from 'child_process';
import type { GatewayProcess, ProcessLauncher, ProcessLaunchOptions } from '../interfaces/process-launcher';
import { EventEmitter } from 'events';

export class NodeProcessLauncher implements ProcessLauncher {
  fork(modulePath: string, args: string[] = [], options: ProcessLaunchOptions = {}): GatewayProcess {
    const child = fork(modulePath, args, {
      env: options.env,
      cwd: options.cwd,
      stdio: options.stdio as any
    });

    const wrapper = new EventEmitter() as GatewayProcess;
    wrapper.pid = child.pid;
    wrapper.stdout = child.stdout;
    wrapper.stderr = child.stderr;
    
    wrapper.kill = () => {
      return child.kill();
    };
    
    wrapper.postMessage = (message: any) => {
      child.send(message);
    };

    child.on('message', (msg) => wrapper.emit('message', msg));
    child.on('exit', (code) => wrapper.emit('exit', code));
    child.on('spawn', () => wrapper.emit('spawn'));

    return wrapper;
  }
}
