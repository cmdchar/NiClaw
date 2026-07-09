import { resolveRuntime } from '../electron/bootstrap/runtime-resolver';
import { bootstrapNodeDaemon } from '../electron/bootstrap/node-bootstrap';

const runtime = resolveRuntime();

if (runtime === 'electron') {
  console.warn('[ClawX] Warning: Starting Node daemon entrypoint but runtime resolved to electron. Forcing runtime to node.');
  process.env.NICLAW_RUNTIME = 'node';
}

bootstrapNodeDaemon().catch(err => {
  console.error('Fatal error starting NiClaw Host Daemon:', err);
  process.exit(1);
});
