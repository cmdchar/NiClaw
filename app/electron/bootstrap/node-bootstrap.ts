import { bootstrapCoreServices, CoreServices } from './core-bootstrap';
import { setGlobalServices } from './service-registry';
import { GatewayManager } from '../gateway/manager';
import { logger } from '../utils/logger';

let coreServices: CoreServices | null = null;
let gatewayManager: GatewayManager | null = null;

export async function bootstrapNodeDaemon(): Promise<void> {
  logger.info('Starting NiClaw Node Daemon...');

  coreServices = await bootstrapCoreServices(false, {
    onGatewayAutoStartError: (error) => {
      logger.error('Gateway auto-start error:', error);
    },
    onCliInstalled: (installedPath) => {
      logger.info(`OpenClaw CLI installed at ${installedPath}`);
    }
  });

  setGlobalServices(coreServices);
  gatewayManager = coreServices.gatewayManager;

  const requestQuitOnSignal = (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    shutdown().catch(err => {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    });
  };

  process.once('SIGINT', () => requestQuitOnSignal('SIGINT'));
  process.once('SIGTERM', () => requestQuitOnSignal('SIGTERM'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception in daemon process:', error);
    // Best-effort Gateway cleanup
    try {
      void gatewayManager?.stop().catch(() => {});
    } catch {
      // ignore
    }
    setTimeout(() => {
      process.exit(1);
    }, 3000).unref();
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection in daemon process:', reason);
    try {
      void gatewayManager?.stop().catch(() => {});
    } catch {
      // ignore
    }
    setTimeout(() => {
      process.exit(1);
    }, 3000).unref();
  });
}

async function shutdown(): Promise<void> {
  if (coreServices) {
    coreServices.hostEventBus.closeAll();
    coreServices.hostApiServer?.close();
  }

  if (gatewayManager) {
    const stopPromise = gatewayManager.stop().catch((err) => {
      logger.warn('gatewayManager.stop() error during quit:', err);
    });
    
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), 5000);
    });

    const result = await Promise.race([stopPromise.then(() => 'stopped' as const), timeoutPromise]);
    
    if (result === 'timeout') {
      logger.warn('Gateway shutdown timed out; proceeding with forced quit');
      await gatewayManager.forceTerminateOwnedProcessForQuit().catch((err) => {
        logger.warn('Forced gateway termination failed after quit timeout:', err);
      });
    }
  }

  process.exit(0);
}
