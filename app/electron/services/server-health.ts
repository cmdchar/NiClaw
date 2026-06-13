import os from 'node:os';
import type { HostApiContext } from '../api/context';
import { getLogsDir, getOpenClawStatus } from '../utils/paths';
import { ensureDevVault } from './dev-vault-service';

export interface CommandCenterStatus {
  generatedAt: string;
  host: {
    platform: NodeJS.Platform;
    hostname: string;
    uptimeSeconds: number;
    nodeVersion: string;
    electron: boolean;
    cpuCount: number;
    memoryTotalBytes: number;
    memoryFreeBytes: number;
  };
  gateway: {
    status: unknown;
    health: unknown;
  };
  openclaw: unknown;
  vault: Awaited<ReturnType<typeof ensureDevVault>>;
  logsDir: string;
}

export async function buildCommandCenterStatus(ctx: HostApiContext): Promise<CommandCenterStatus> {
  const [vault, gatewayHealth] = await Promise.all([
    ensureDevVault(),
    ctx.gatewayManager.checkHealth({ probe: false }).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    host: {
      platform: process.platform,
      hostname: os.hostname(),
      uptimeSeconds: Math.round(os.uptime()),
      nodeVersion: process.version,
      electron: Boolean(process.versions?.electron),
      cpuCount: os.cpus().length,
      memoryTotalBytes: os.totalmem(),
      memoryFreeBytes: os.freemem(),
    },
    gateway: {
      status: ctx.gatewayManager.getStatus(),
      health: gatewayHealth,
    },
    openclaw: getOpenClawStatus(),
    vault,
    logsDir: getLogsDir(),
  };
}

