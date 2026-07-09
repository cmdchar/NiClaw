/**
 * Persistent Storage
 * ConfigStore wrapper for application settings
 */

import { randomBytes } from 'crypto';
import { configStore, lifecycleManager } from '../runtime/runtime-factory';
import { resolveSupportedLanguage } from '../../shared/language';
import { getPort } from './config';

/**
 * Generate a random token for gateway authentication
 */
function generateToken(): string {
  return `clawx-${randomBytes(16).toString('hex')}`;
}

/**
 * Application settings schema
 */
export interface AppSettings {
  // General
  theme: 'light' | 'dark' | 'system';
  language: string;
  startMinimized: boolean;
  launchAtStartup: boolean;
  telemetryEnabled: boolean;
  machineId: string;
  hasReportedInstall: boolean;

  // Gateway
  gatewayAutoStart: boolean;
  gatewayPort: number;
  gatewayToken: string;
  proxyEnabled: boolean;
  proxyServer: string;
  proxyHttpServer: string;
  proxyHttpsServer: string;
  proxyAllServer: string;
  proxyBypassRules: string;

  // Update
  updateChannel: 'stable' | 'beta' | 'dev';
  autoCheckUpdate: boolean;
  autoDownloadUpdate: boolean;
  skippedVersions: string[];

  // UI State
  sidebarCollapsed: boolean;
  devModeUnlocked: boolean;

  // Presets
  selectedBundles: string[];
  enabledSkills: string[];
  disabledSkills: string[];

  // Remote Access (AI OS Bridge)
  remoteAccessEnabled: boolean;
  remoteAccessPort: number;
}

/**
 * Default settings
 */
function getSystemLocale(): string {
  try {
    return lifecycleManager.getLocale() || Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  }
}

function createDefaultSettings(): AppSettings {
  return {
    // General
    theme: 'system',
    language: resolveSupportedLanguage(getSystemLocale()),
    startMinimized: false,
    launchAtStartup: false,
    telemetryEnabled: false,
    machineId: '',
    hasReportedInstall: false,

    // Gateway
    gatewayAutoStart: true,
    gatewayPort: getPort('OPENCLAW_GATEWAY'),
    gatewayToken: generateToken(),
    proxyEnabled: false,
    proxyServer: '',
    proxyHttpServer: '',
    proxyHttpsServer: '',
    proxyAllServer: '',
    proxyBypassRules: '<local>;localhost;127.0.0.1;::1',

    // Update
    updateChannel: 'stable',
    autoCheckUpdate: true,
    autoDownloadUpdate: false,
    skippedVersions: [],

    // UI State
    sidebarCollapsed: false,
    devModeUnlocked: false,

    // Presets
    selectedBundles: ['productivity', 'developer'],
    enabledSkills: [],
    disabledSkills: [],

    // Remote Access (AI OS Bridge)
    remoteAccessEnabled: false,
    remoteAccessPort: 13210,
  };
}

let initialized = false;
function initializeStore() {
  if (initialized) return;
  initialized = true;
  const defaults = createDefaultSettings();
  
  // Backwards compatibility logic or default application for electron-store
  // Actually, since electron-store takes defaults on creation, we should just populate 
  // missing keys here.
  for (const [key, value] of Object.entries(defaults)) {
    if (!configStore.has(key)) {
      configStore.set(key, value);
    }
  }
}


/**
 * Get a setting value
 */
export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  initializeStore();
  return configStore.get(key) as AppSettings[K];
}

/**
 * Set a setting value
 */
export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  initializeStore();
  configStore.set(key, value);
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<AppSettings> {
  initializeStore();
  const defaults = createDefaultSettings();
  const result: any = {};
  for (const key of Object.keys(defaults)) {
    result[key] = configStore.get(key);
  }
  return result as AppSettings;
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<void> {
  initializeStore();
  const defaults = createDefaultSettings();
  for (const [key, value] of Object.entries(defaults)) {
    configStore.set(key, value);
  }
}

/**
 * Export settings to JSON
 */
export async function exportSettings(): Promise<string> {
  const allSettings = await getAllSettings();
  return JSON.stringify(allSettings, null, 2);
}

/**
 * Import settings from JSON
 */
export async function importSettings(json: string): Promise<void> {
  initializeStore();
  try {
    const settings = JSON.parse(json);
    for (const [key, value] of Object.entries(settings)) {
      configStore.set(key, value);
    }
  } catch {
    throw new Error('Invalid settings JSON');
  }
}

