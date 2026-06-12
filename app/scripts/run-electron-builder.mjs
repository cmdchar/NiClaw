#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ELECTRON_BUILDER_BIN = process.platform === 'win32'
  ? path.join(ROOT, 'node_modules', '.bin', 'electron-builder.cmd')
  : path.join(ROOT, 'node_modules', '.bin', 'electron-builder');
const args = process.argv.slice(2);

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function spawnElectronBuilder() {
  if (process.platform === 'darwin') {
    const command = [
      'ulimit -n 65536 >/dev/null 2>&1 || ulimit -n 32768 >/dev/null 2>&1 || ulimit -n 16384 >/dev/null 2>&1 || true',
      `exec ${shellQuote(ELECTRON_BUILDER_BIN)}${args.length > 0 ? ` ${args.map(shellQuote).join(' ')}` : ''}`,
    ].join('; ');

    return spawn('/bin/bash', ['-lc', command], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });
  }

  return spawn(ELECTRON_BUILDER_BIN, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
}

const child = spawnElectronBuilder();
child.on('exit', (code, signal) => {
  if (code === 0) {
    // Generate UPDATE_INFO.md in the release folder
    const releaseDir = path.join(ROOT, 'release');
    if (!existsSync(releaseDir)) {
      mkdirSync(releaseDir, { recursive: true });
    }
    const updateInfo = `# ClawX AI OS Update Info\n\nLatest Release: https://github.com/ValueCell-ai/ClawX/releases\n\nBuild Timestamp: ${new Date().toISOString()}\n`;
    writeFileSync(path.join(releaseDir, 'UPDATE_INFO.md'), updateInfo);
    console.log('✅ Generated UPDATE_INFO.md in release/ folder');
  }

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
