import { Server } from 'node:http';
import { GatewayManager } from '../gateway/manager';
import { ClawHubService } from '../gateway/clawhub';
import { HostEventBus } from '../api/event-bus';
import { startHostApiServer } from '../api/server';

import { deviceOAuthManager } from '../utils/device-oauth';
import { browserOAuthManager } from '../utils/browser-oauth';
import { whatsAppLoginManager } from '../utils/whatsapp-login';
import { syncAllProviderAuthToRuntime } from '../services/providers/provider-runtime-sync';
import { extensionRegistry } from '../extensions/registry';
import { loadExtensionsFromManifest } from '../extensions/loader';
import { registerAllBuiltinExtensions } from '../extensions/builtin';
import { loadExternalMainExtensions } from '../extensions/_ext-bridge.generated';
import {
  ensureClawXContext,
  ensureClawXDefaultIdentity,
  repairClawXOnlyBootstrapFiles,
} from '../utils/openclaw-workspace';
import { autoInstallCliIfNeeded, generateCompletionCache, installCompletionToProfile } from '../utils/openclaw-cli';
import { getSetting } from '../utils/store';
import { logger } from '../utils/logger';
import { ensureBuiltinSkillsInstalled, ensurePreinstalledSkillsInstalled } from '../utils/skill-config';
import { CoreServices } from './types';

export interface BootstrapCallbacks {
  onGatewayAutoStartError?: (error: Error) => void;
  onCliInstalled?: (installedPath: string) => void;
}

export async function bootstrapCoreServices(isE2EMode: boolean, callbacks?: BootstrapCallbacks): Promise<CoreServices> {
  const gatewayManager = new GatewayManager();
  const clawHubService = new ClawHubService();
  const hostEventBus = new HostEventBus();

  // Register builtin extensions and load manifest
  registerAllBuiltinExtensions();
  loadExternalMainExtensions();
  void loadExtensionsFromManifest().catch((err) => {
    logger.warn('Failed to load extensions from manifest:', err);
  });

  // Basic API endpoints
  const hostApiServer = await startHostApiServer(hostEventBus);

  // Setup memory proposal watchers and memory governance initialization
  // (Usually managed via the route handlers implicitly, but can be explicit here)
  
  // Wire Gateway events to Host Event Bus
  gatewayManager.on('error', (error) => {
    hostEventBus.emit('gateway:error', { message: error.message });
  });

  gatewayManager.on('notification', (notification) => {
    hostEventBus.emit('gateway:notification', notification);
  });

  gatewayManager.on('gateway:health', (data) => {
    hostEventBus.emit('gateway:health', data);
  });

  gatewayManager.on('gateway:presence', (data) => {
    hostEventBus.emit('gateway:presence', data);
  });

  gatewayManager.on('chat:message', (data) => {
    hostEventBus.emit('gateway:chat-message', data);
  });

  gatewayManager.on('channel:status', (data) => {
    hostEventBus.emit('gateway:channel-status', data);
  });

  gatewayManager.on('exit', (code) => {
    hostEventBus.emit('gateway:exit', { code });
  });

  // OAuth managers wiring
  deviceOAuthManager.on('oauth:code', (payload) => {
    hostEventBus.emit('oauth:code', payload);
  });

  deviceOAuthManager.on('oauth:start', (payload) => {
    hostEventBus.emit('oauth:start', payload);
  });

  deviceOAuthManager.on('oauth:success', (payload) => {
    hostEventBus.emit('oauth:success', { ...payload, success: true });
  });

  deviceOAuthManager.on('oauth:error', (error) => {
    hostEventBus.emit('oauth:error', error);
  });

  browserOAuthManager.on('oauth:start', (payload) => {
    hostEventBus.emit('oauth:start', payload);
  });

  browserOAuthManager.on('oauth:code', (payload) => {
    hostEventBus.emit('oauth:code', payload);
  });

  browserOAuthManager.on('oauth:success', (payload) => {
    hostEventBus.emit('oauth:success', { ...payload, success: true });
  });

  browserOAuthManager.on('oauth:error', (error) => {
    hostEventBus.emit('oauth:error', error);
  });

  whatsAppLoginManager.on('qr', (data) => {
    hostEventBus.emit('channel:whatsapp-qr', data);
  });

  whatsAppLoginManager.on('success', (data) => {
    hostEventBus.emit('channel:whatsapp-success', data);
  });

  whatsAppLoginManager.on('error', (error) => {
    hostEventBus.emit('channel:whatsapp-error', error);
  });

  // Start Gateway automatically
  const gatewayAutoStart = await getSetting('gatewayAutoStart');
  if (!isE2EMode && gatewayAutoStart) {
    try {
      await syncAllProviderAuthToRuntime();
      logger.debug('Auto-starting Gateway...');
      await gatewayManager.start();
      logger.info('Gateway auto-start succeeded');
    } catch (error) {
      logger.error('Gateway auto-start failed:', error);
      if (callbacks?.onGatewayAutoStartError) {
        callbacks.onGatewayAutoStartError(error as Error);
      }
    }
  } else if (isE2EMode) {
    logger.info('Gateway auto-start skipped in E2E mode');
  } else {
    logger.info('Gateway auto-start disabled in settings');
  }

  // Merge ClawX context snippets into the workspace bootstrap files.
  if (!isE2EMode) {
    void ensureClawXContext().catch((error) => {
      logger.warn('Failed to merge ClawX context into workspace:', error);
    });
    
    // Auto-install skills
    void ensureBuiltinSkillsInstalled().catch((error) => {
      logger.warn('Failed to install builtin skills:', error);
    });
    void ensurePreinstalledSkillsInstalled().catch((error) => {
      logger.warn('Failed to install preinstalled skills:', error);
    });
  }

  // Auto-install openclaw CLI and shell completions
  if (!isE2EMode) {
    void autoInstallCliIfNeeded((installedPath) => {
      if (callbacks?.onCliInstalled) {
        callbacks.onCliInstalled(installedPath);
      }
    }).then(() => {
      generateCompletionCache();
      installCompletionToProfile();
    }).catch((error) => {
      logger.warn('CLI auto-install failed:', error);
    });
  }

  return {
    gatewayManager,
    clawHubService,
    hostEventBus,
    hostApiServer
  };
}
