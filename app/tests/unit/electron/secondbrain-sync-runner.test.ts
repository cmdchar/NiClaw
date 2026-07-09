import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncRunnerService } from '../../../electron/services/secondbrain-sync-runner';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

vi.mock('../../../electron/services/mesh-publisher', () => {
  return {
    meshPublisher: {
      publishEvent: vi.fn()
    }
  };
});

describe('SyncRunnerService', () => {
  let tempDir: string;
  let runner: any; // Use any to override private SCRIPT_PATH for testing
  let fakeScriptPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'niclaw-test-sync-'));
    fakeScriptPath = join(tempDir, 'fake-sync.ps1');
    await writeFile(fakeScriptPath, 'Write-Host "Syncing..."; Start-Sleep -Seconds 1; Write-Host "Done"; exit 0', 'utf8');

    runner = new SyncRunnerService();
    // Override the readonly path for testing
    Object.defineProperty(runner, 'SCRIPT_PATH', { value: fakeScriptPath });
    // Lower timeout for tests
    Object.defineProperty(runner, 'TIMEOUT_MS', { value: 2000 });
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch { /* ignore */ }
    vi.clearAllMocks();
  });

  it('runs successfully and updates state', async () => {
    expect(runner.getState().status).toBe('idle');
    const promise = runner.runSync();
    expect(runner.getState().status).toBe('running');
    await promise;
    expect(runner.getState().status).toBe('succeeded');
    expect(runner.getState().logTail).toContain('Syncing...');
    expect(runner.getState().logTail).toContain('Done');
    expect(runner.getState().pendingSync).toBe(false);
  });

  it('rejects concurrent runs (single-flight lock)', async () => {
    const promise1 = runner.runSync();
    await expect(runner.runSync()).rejects.toThrow('Sync is already running');
    await promise1;
  });

  it('fails safely if script is missing', async () => {
    await rm(fakeScriptPath);
    await expect(runner.runSync()).rejects.toThrow(/Not a file|ENOENT/);
    expect(runner.getState().status).toBe('failed');
  });

  it('times out hanging scripts', async () => {
    await writeFile(fakeScriptPath, 'Start-Sleep -Seconds 10', 'utf8');
    await expect(runner.runSync()).rejects.toThrow('Sync process timed out');
    expect(runner.getState().status).toBe('failed');
  });

  it('bounds log tail size', async () => {
    // Generate 150 lines of output
    const script = '1..150 | ForEach-Object { Write-Host "Line $_" }; exit 0';
    await writeFile(fakeScriptPath, script, 'utf8');
    await runner.runSync();
    const state = runner.getState();
    expect(state.logTail.length).toBeLessThanOrEqual(100);
    // Should contain the last lines
    expect(state.logTail.find((l: string) => l === 'Line 150')).toBeTruthy();
    expect(state.logTail.find((l: string) => l === 'Line 1')).toBeFalsy();
  });
});
