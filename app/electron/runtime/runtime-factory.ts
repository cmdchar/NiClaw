import type { PathProvider } from './interfaces/path-provider';
import type { ConfigStore } from './interfaces/config-store';
import type { ProcessLauncher } from './interfaces/process-launcher';
import type { LifecycleManager } from './interfaces/lifecycle-manager';
import type { ExternalShell } from './interfaces/external-shell';

import { NodePathProvider } from './node/node-path-provider';
import { NodeConfigStore } from './node/node-config-store';
import { NodeProcessLauncher } from './node/node-process-launcher';
import { NodeLifecycleManager } from './node/node-lifecycle-manager';
import { NodeExternalShell } from './node/node-external-shell';

import { ElectronPathProvider } from './electron/electron-path-provider';
import { ElectronConfigStore } from './electron/electron-config-store';
import { ElectronProcessLauncher } from './electron/electron-process-launcher';
import { ElectronLifecycleManager } from './electron/electron-lifecycle-manager';
import { ElectronExternalShell } from './electron/electron-external-shell';

import { resolveRuntime, RuntimeContext } from '../bootstrap/runtime-resolver';

const runtimeType = resolveRuntime();

let _pathProvider: PathProvider;
let _configStore: ConfigStore;
let _processLauncher: ProcessLauncher;
let _lifecycleManager: LifecycleManager;
let _externalShell: ExternalShell;

if (runtimeType === 'electron') {
  _pathProvider = new ElectronPathProvider();
  _configStore = new ElectronConfigStore();
  _processLauncher = new ElectronProcessLauncher();
  _lifecycleManager = new ElectronLifecycleManager();
  _externalShell = new ElectronExternalShell();
} else {
  _pathProvider = new NodePathProvider();
  _configStore = new NodeConfigStore(_pathProvider.getUserDataPath());
  _processLauncher = new NodeProcessLauncher();
  _lifecycleManager = new NodeLifecycleManager(_pathProvider.getUserDataPath());
  _externalShell = new NodeExternalShell();
}

export const pathProvider = _pathProvider;
export const configStore = _configStore;
export const processLauncher = _processLauncher;
export const lifecycleManager = _lifecycleManager;
export const externalShell = _externalShell;

export const runtimeContext: RuntimeContext = Object.freeze({
  runtime: runtimeType,
  pathProvider,
  configStore,
  processLauncher,
  lifecycleManager,
  externalShell
});
