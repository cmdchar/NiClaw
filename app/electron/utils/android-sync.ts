import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { getDataDir } from './paths';

export interface AndroidPairedDevice {
  id: string;
  name: string;
  platform: string;
  permissions: string[];
  createdAt: string;
  lastSeenAt?: string;
  lastSyncAt?: string;
  remoteAddress?: string;
  userAgent?: string;
}

interface AndroidDeviceRecord extends AndroidPairedDevice {
  tokenHash: string;
}

interface AndroidPairingChallenge {
  codeHash: string;
  createdAt: string;
  expiresAt: string;
}

interface AndroidSyncEvent {
  id: string;
  type: string;
  source: string;
  deviceId?: string;
  createdAt: string;
  payload?: unknown;
}

interface AndroidSyncState {
  version: 1;
  devices: AndroidDeviceRecord[];
  pairing?: AndroidPairingChallenge;
  events: AndroidSyncEvent[];
}

export interface AndroidPairingResult {
  token: string;
  device: AndroidPairedDevice;
}

export interface AndroidSyncSnapshot {
  devices: AndroidPairedDevice[];
  pairing?: {
    createdAt: string;
    expiresAt: string;
    active: boolean;
  };
  events: AndroidSyncEvent[];
}

interface RequestMetadata {
  remoteAddress?: string;
  userAgent?: string;
}

const DEFAULT_PERMISSIONS = ['status:read', 'board:read', 'agents:read', 'tasks:read', 'sync:write', 'events:write'];
const MAX_EVENTS = 100;

function androidSyncStatePath(): string {
  return join(getDataDir(), 'android-sync', 'state.json');
}

function nowIso(): string {
  return new Date().toISOString();
}

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizePairingCode(code: string): string {
  return code.replace(/[\s-]+/g, '').trim();
}

function sanitizeString(value: unknown, fallback: string, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, maxLength);
}

function sanitizePayload(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.slice(0, 2000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((entry) => sanitizePayload(entry, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
      if (/token|secret|password|key|credential/i.test(key)) {
        out[key] = '[redacted]';
      } else {
        out[key] = sanitizePayload(entry, depth + 1);
      }
    }
    return out;
  }
  return String(value).slice(0, 500);
}

function toPublicDevice(device: AndroidDeviceRecord): AndroidPairedDevice {
  return {
    id: device.id,
    name: device.name,
    platform: device.platform,
    permissions: device.permissions,
    createdAt: device.createdAt,
    lastSeenAt: device.lastSeenAt,
    lastSyncAt: device.lastSyncAt,
    remoteAddress: device.remoteAddress,
    userAgent: device.userAgent,
  };
}

function freshState(): AndroidSyncState {
  return { version: 1, devices: [], events: [] };
}

async function readAndroidSyncState(): Promise<AndroidSyncState> {
  try {
    const raw = await readFile(androidSyncStatePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AndroidSyncState>;
    return {
      version: 1,
      devices: Array.isArray(parsed.devices) ? parsed.devices.filter((device) => Boolean(device?.tokenHash)) : [],
      pairing: parsed.pairing,
      events: Array.isArray(parsed.events) ? parsed.events.slice(-MAX_EVENTS) : [],
    };
  } catch {
    return freshState();
  }
}

async function writeAndroidSyncState(state: AndroidSyncState): Promise<void> {
  const filePath = androidSyncStatePath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function createAndroidPairingChallenge(ttlMs = 10 * 60 * 1000): Promise<{ code: string; expiresAt: string }> {
  const state = await readAndroidSyncState();
  const code = String(randomInt(100000, 1000000));
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  state.pairing = {
    codeHash: hashSecret(code),
    createdAt,
    expiresAt,
  };

  await writeAndroidSyncState(state);
  return { code, expiresAt };
}

export async function pairAndroidDevice(params: {
  code: string;
  deviceName?: string;
  deviceId?: string;
  platform?: string;
  remoteAddress?: string;
  userAgent?: string;
}): Promise<AndroidPairingResult> {
  const state = await readAndroidSyncState();
  const normalizedCode = normalizePairingCode(params.code || '');
  const challenge = state.pairing;

  if (!challenge || Date.parse(challenge.expiresAt) < Date.now()) {
    throw new Error('Pairing code expired or missing');
  }

  if (!normalizedCode || !hashEquals(hashSecret(normalizedCode), challenge.codeHash)) {
    throw new Error('Invalid pairing code');
  }

  const token = `nca_${randomBytes(32).toString('hex')}`;
  const timestamp = nowIso();
  const deviceId = sanitizeString(params.deviceId, `android-${randomBytes(8).toString('hex')}`, 120);
  const existing = state.devices.find((device) => device.id === deviceId);
  const nextDevice: AndroidDeviceRecord = {
    id: deviceId,
    name: sanitizeString(params.deviceName, existing?.name || 'Android Companion', 120),
    platform: sanitizeString(params.platform, existing?.platform || 'android', 80),
    permissions: existing?.permissions?.length ? existing.permissions : DEFAULT_PERMISSIONS,
    createdAt: existing?.createdAt || timestamp,
    lastSeenAt: timestamp,
    lastSyncAt: existing?.lastSyncAt,
    remoteAddress: params.remoteAddress,
    userAgent: params.userAgent,
    tokenHash: hashSecret(token),
  };

  state.devices = [nextDevice, ...state.devices.filter((device) => device.id !== deviceId)].slice(0, 20);
  state.pairing = undefined;
  await writeAndroidSyncState(state);

  return { token, device: toPublicDevice(nextDevice) };
}

export async function validateAndroidSyncToken(
  token: string,
  metadata: RequestMetadata = {},
): Promise<AndroidPairedDevice | null> {
  if (!token || !token.startsWith('nca_')) return null;

  const state = await readAndroidSyncState();
  const tokenHash = hashSecret(token);
  const device = state.devices.find((candidate) => hashEquals(candidate.tokenHash, tokenHash));
  if (!device) return null;

  device.lastSeenAt = nowIso();
  if (metadata.remoteAddress) device.remoteAddress = metadata.remoteAddress;
  if (metadata.userAgent) device.userAgent = metadata.userAgent;
  await writeAndroidSyncState(state);
  return toPublicDevice(device);
}

export async function markAndroidDeviceSynced(deviceId?: string): Promise<AndroidPairedDevice | null> {
  if (!deviceId) return null;

  const state = await readAndroidSyncState();
  const device = state.devices.find((candidate) => candidate.id === deviceId);
  if (!device) return null;

  device.lastSyncAt = nowIso();
  await writeAndroidSyncState(state);
  return toPublicDevice(device);
}

export async function recordAndroidSyncEvent(params: {
  type: string;
  source?: string;
  deviceId?: string;
  payload?: unknown;
}): Promise<AndroidSyncEvent> {
  const state = await readAndroidSyncState();
  const event: AndroidSyncEvent = {
    id: `android-event-${Date.now()}-${randomBytes(4).toString('hex')}`,
    type: sanitizeString(params.type, 'event', 80),
    source: sanitizeString(params.source, 'android', 80),
    deviceId: params.deviceId,
    createdAt: nowIso(),
    payload: sanitizePayload(params.payload),
  };

  state.events = [...state.events, event].slice(-MAX_EVENTS);
  await writeAndroidSyncState(state);
  return event;
}

export async function getAndroidSyncSnapshot(): Promise<AndroidSyncSnapshot> {
  const state = await readAndroidSyncState();
  return {
    devices: state.devices.map(toPublicDevice),
    pairing: state.pairing
      ? {
          createdAt: state.pairing.createdAt,
          expiresAt: state.pairing.expiresAt,
          active: Date.parse(state.pairing.expiresAt) >= Date.now(),
        }
      : undefined,
    events: state.events.slice(-20),
  };
}
