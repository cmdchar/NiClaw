import { processLauncher } from '../runtime/runtime-factory';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { logger } from './logger';

const BUILD_VALIDATION_TIMEOUT_MS = 180_000;
const MAX_BUILD_VALIDATION_OUTPUT_BYTES = 2 * 1024 * 1024;

export type BuildValidationProfile = 'typecheck';

export interface BuildValidationResult {
  profile: BuildValidationProfile;
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
  cwd: string;
  durationMs: number;
  timedOut?: boolean;
  error?: string;
}

const BUILD_VALIDATION_PROFILES: Record<BuildValidationProfile, { script: string }> = {
  typecheck: { script: 'typecheck' },
};

function appendOutput(current: string, data: Buffer | string): string {
  if (Buffer.byteLength(current) >= MAX_BUILD_VALIDATION_OUTPUT_BYTES) return current;
  const chunk = typeof data === 'string' ? Buffer.from(data) : data;
  const remaining = MAX_BUILD_VALIDATION_OUTPUT_BYTES - Buffer.byteLength(current);
  return current + chunk.subarray(0, remaining).toString();
}

export async function runBuildValidation(profile: BuildValidationProfile): Promise<BuildValidationResult> {
  const config = BUILD_VALIDATION_PROFILES[profile];
  const cwd = process.cwd();
  const command = `pnpm run ${config.script}`;
  const startedAt = Date.now();

  if (!existsSync(path.join(cwd, 'package.json'))) {
    return {
      profile,
      success: false,
      exitCode: null,
      stdout: '',
      stderr: '',
      command,
      cwd,
      durationMs: Date.now() - startedAt,
      error: `package.json not found in ${cwd}`,
    };
  }

  const executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  logger.info(`Running build validation profile="${profile}" command="${command}" cwd="${cwd}"`);

  return await new Promise<BuildValidationResult>((resolve) => {
    const child = spawn(executable, ['run', config.script], {
      cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result: Omit<BuildValidationResult, 'durationMs'>) => {
      if (settled) return;
      settled = true;
      resolve({
        ...result,
        durationMs: Date.now() - startedAt,
      });
    };

    const timeout = setTimeout(() => {
      logger.error(`Build validation profile="${profile}" timed out after ${BUILD_VALIDATION_TIMEOUT_MS}ms`);
      child.kill();
      finish({
        profile,
        success: false,
        exitCode: null,
        stdout,
        stderr,
        command,
        cwd,
        timedOut: true,
        error: `Timed out after ${BUILD_VALIDATION_TIMEOUT_MS}ms`,
      });
    }, BUILD_VALIDATION_TIMEOUT_MS);

    child.stdout?.on('data', (data) => {
      stdout = appendOutput(stdout, data);
    });

    child.stderr?.on('data', (data) => {
      stderr = appendOutput(stderr, data);
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      logger.error(`Failed to spawn build validation profile="${profile}":`, error);
      finish({
        profile,
        success: false,
        exitCode: null,
        stdout,
        stderr,
        command,
        cwd,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      logger.info(`Build validation profile="${profile}" exited with code ${code ?? 'null'}`);
      finish({
        profile,
        success: code === 0,
        exitCode: code,
        stdout,
        stderr,
        command,
        cwd,
      });
    });
  });
}
