import { app } from 'electron';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { logger } from './logger';

const SHELL_COMMAND_TIMEOUT_MS = 60_000;
const MAX_SHELL_OUTPUT_BYTES = 1 * 1024 * 1024; // 1 MB

export interface ShellExecutionResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
  cwd: string;
  durationMs: number;
  error?: string;
  timedOut?: boolean;
}

const SHELL_COMMAND_ALLOWLIST = [
  'git status',
  'git diff',
  'git log',
  'pnpm run lint',
  'pnpm run build',
  'npm run lint',
  'npm run build',
  'pm2 status',
  'pm2 show',
  'systemctl status clawx-ai-os.service',
  'systemctl status openclaw-gateway.service',
  'systemctl status hermes-gateway.service',
  'systemctl status hermes-dashboard.service',
  'systemctl status openhuman-core.service',
  'systemctl status jarvis-command-center.service',
];

function isCommandAllowed(commandLine: string): boolean {
  const normalized = commandLine.trim().replace(/\s+/g, ' ');
  return SHELL_COMMAND_ALLOWLIST.some((prefix) => {
    if (normalized === prefix) return true;
    if (normalized.startsWith(prefix + ' ')) return true;
    return false;
  });
}

function parseCommandLine(cmd: string): string[] {
  const args: string[] = [];
  let current = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === ' ' && !inDoubleQuote && !inSingleQuote) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) {
    args.push(current);
  }
  return args;
}

function appendOutput(current: string, data: Buffer | string): string {
  if (Buffer.byteLength(current) >= MAX_SHELL_OUTPUT_BYTES) return current;
  const chunk = typeof data === 'string' ? Buffer.from(data) : data;
  const remaining = MAX_SHELL_OUTPUT_BYTES - Buffer.byteLength(current);
  return current + chunk.subarray(0, remaining).toString();
}

export async function runShellCommand(commandLine: string): Promise<ShellExecutionResult> {
  const startedAt = Date.now();
  const cwd = app.getAppPath();

  if (!isCommandAllowed(commandLine)) {
    return {
      success: false,
      exitCode: null,
      stdout: '',
      stderr: '',
      command: commandLine,
      cwd,
      durationMs: Date.now() - startedAt,
      error: `Command "${commandLine}" is not allowlisted under the Spatial OS Shell execution policy.`,
    };
  }

  const parts = parseCommandLine(commandLine);
  if (parts.length === 0) {
    return {
      success: false,
      exitCode: null,
      stdout: '',
      stderr: '',
      command: commandLine,
      cwd,
      durationMs: Date.now() - startedAt,
      error: 'Empty command line',
    };
  }

  const executable = parts[0];
  const args = parts.slice(1);

  let spawnExecutable = executable;
  if (process.platform === 'win32') {
    if (executable === 'pnpm') spawnExecutable = 'pnpm.cmd';
    if (executable === 'npm') spawnExecutable = 'npm.cmd';
    if (executable === 'pm2') spawnExecutable = 'pm2.cmd';
  }

  logger.info(`Running Spatial OS shell execution command="${commandLine}"`);

  return await new Promise<ShellExecutionResult>((resolve) => {
    const child = spawn(spawnExecutable, args, {
      cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result: Omit<ShellExecutionResult, 'durationMs'>) => {
      if (settled) return;
      settled = true;
      resolve({
        ...result,
        durationMs: Date.now() - startedAt,
      });
    };

    const timeout = setTimeout(() => {
      logger.error(`Shell execution command="${commandLine}" timed out after ${SHELL_COMMAND_TIMEOUT_MS}ms`);
      child.kill();
      finish({
        success: false,
        exitCode: null,
        stdout,
        stderr,
        command: commandLine,
        cwd,
        timedOut: true,
        error: `Timed out after ${SHELL_COMMAND_TIMEOUT_MS}ms`,
      });
    }, SHELL_COMMAND_TIMEOUT_MS);

    child.stdout?.on('data', (data) => {
      stdout = appendOutput(stdout, data);
    });

    child.stderr?.on('data', (data) => {
      stderr = appendOutput(stderr, data);
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      logger.error(`Failed to spawn shell execution command="${commandLine}":`, error);
      finish({
        success: false,
        exitCode: null,
        stdout,
        stderr,
        command: commandLine,
        cwd,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      logger.info(`Shell execution command="${commandLine}" exited with code ${code ?? 'null'}`);
      finish({
        success: code === 0,
        exitCode: code,
        stdout,
        stderr,
        command: commandLine,
        cwd,
      });
    });
  });
}
