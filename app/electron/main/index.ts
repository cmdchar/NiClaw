import { resolveRuntime } from '../bootstrap/runtime-resolver';

const runtime = resolveRuntime();
if (runtime === 'node') {
  console.error('[ClawX] Fatal: Cannot start Electron entrypoint with NICLAW_RUNTIME=node. Please use the Node daemon entrypoint (pnpm tsx dist-node/host-runtime.ts).');
  throw new Error('Trace index.ts import');
}

// We use a top-level import here so Vite correctly bundles the module.
// The runtime check above still runs, but any top-level execution in electron-bootstrap
// will also occur. Since index.ts is only for Electron, this is fine.
import { mainWindow, gatewayManager } from '../bootstrap/electron-bootstrap';

export { mainWindow, gatewayManager };
