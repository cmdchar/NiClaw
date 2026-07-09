import { PathProvider } from '../runtime/interfaces/path-provider';
import { ConfigStore } from '../runtime/interfaces/config-store';
import { ProcessLauncher } from '../runtime/interfaces/process-launcher';
import { LifecycleManager } from '../runtime/interfaces/lifecycle-manager';
import { ExternalShell } from '../runtime/interfaces/external-shell';

export type RuntimeType = 'electron' | 'node';

export interface RuntimeContext {
  runtime: RuntimeType;
  pathProvider: PathProvider;
  configStore: ConfigStore;
  processLauncher: ProcessLauncher;
  lifecycleManager: LifecycleManager;
  externalShell: ExternalShell;
}

export function resolveRuntime(): RuntimeType {
  // 1. CLI flag
  const args = process.argv;
  const runtimeArgIndex = args.indexOf('--runtime');
  if (runtimeArgIndex !== -1 && args.length > runtimeArgIndex + 1) {
    const val = args[runtimeArgIndex + 1];
    if (val === 'node' || val === 'electron') {
      return val as RuntimeType;
    }
  }

  // 2. Environment variable
  if (process.env.NICLAW_RUNTIME) {
    if (process.env.NICLAW_RUNTIME === 'node' || process.env.NICLAW_RUNTIME === 'electron') {
      return process.env.NICLAW_RUNTIME as RuntimeType;
    }
  }

  // 3. Auto-detection fallback
  const isElectron = !!(process.versions && (process.versions as any).electron);
  return isElectron ? 'electron' : 'node';
}
