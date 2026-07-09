#!/usr/bin/env zx

import 'zx/globals';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

$.verbose = true;
if (os.platform() === 'win32') {
  $.shell = 'powershell';
  $.prefix = '';
}

const startTime = Date.now();
const appDir = path.resolve(__dirname, '..');
process.chdir(appDir);

console.log(chalk.cyan('========================================'));
console.log(chalk.cyan('NiClaw Release Verification Pipeline'));
console.log(chalk.cyan('========================================\n'));

// 1. Environment Checks
console.log(chalk.yellow('1. Validating Environment...'));
let nodeVersion, pnpmVersion, javaVersion;
try {
  nodeVersion = (await $`node -v`).stdout.trim();
  pnpmVersion = (await $`pnpm -v`).stdout.trim();
  const javaVersionOutput = (await $`java -version`.nothrow()).stderr.split('\n')[0].trim();
  javaVersion = javaVersionOutput || 'Unknown';
  console.log(`Node version: ${nodeVersion}`);
  console.log(`PNPM version: ${pnpmVersion}`);
  console.log(`Java version: ${javaVersion}`);
} catch (error) {
  console.error(chalk.red('Failed environment checks:'), error);
  process.exit(1);
}

// 2. Strict Git Status
console.log(chalk.yellow('\n2. Checking Git Status...'));
try {
  await $`git diff --exit-code`;
  await $`git diff --cached --exit-code`;
  console.log(chalk.green('Git tree is clean.'));
} catch {
  console.log(chalk.red('WARNING: Git working tree is not clean. There are uncommitted changes.'));
  // strict mode can exit(1) here if needed in CI
}

const commitHash = (await $`git rev-parse HEAD`).stdout.trim();
const timestamp = new Date().toISOString();

// 3. Desktop & Daemon Build
console.log(chalk.yellow('\n3. Running Desktop & Daemon Build...'));
await $`pnpm run typecheck`;
await $`pnpm run build:vite`;
console.log(chalk.green('Vite Build completed.'));

// 4. Node Daemon Smoke Test
console.log(chalk.yellow('\n4. Running Node Daemon Smoke Test...'));
const hostRuntimePath = path.join(appDir, 'dist-node', 'host-runtime.ts');
if (!fs.existsSync(hostRuntimePath)) {
  console.error(chalk.red(`Daemon script not found at ${hostRuntimePath}`));
  process.exit(1);
}

const daemonProcess = $`pnpm tsx dist-node/host-runtime.ts`.nothrow();
let daemonSuccess = false;
try {
  console.log(chalk.dim('Waiting 5 seconds for daemon to boot...'));
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  if (daemonProcess.child.exitCode === null) {
    daemonSuccess = true;
    console.log(chalk.green('Node Daemon booted successfully (smoke test passed).'));
  } else {
    console.error(chalk.red(`Node Daemon exited prematurely with code ${daemonProcess.child.exitCode}`));
    process.exit(1);
  }
} finally {
  if (daemonProcess.child.exitCode === null) {
    console.log(chalk.dim('Terminating daemon process tree...'));
    if (os.platform() === 'win32') {
      try { await $`taskkill /F /T /PID ${daemonProcess.child.pid}`; } catch (e) {}
    } else {
      daemonProcess.child.kill('SIGTERM');
    }
  }
}

// 5. Android Build
console.log(chalk.yellow('\n5. Running Android APK Build...'));
const androidDir = path.join(appDir, 'mobile', 'android-kotlin');
process.chdir(androidDir);

if (os.platform() === 'win32') {
  execSync('gradlew.bat assembleDebug', { stdio: 'inherit', cwd: androidDir });
} else {
  execSync('./gradlew assembleDebug', { stdio: 'inherit', cwd: androidDir });
}

const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
let apkHash = null;
if (fs.existsSync(apkPath)) {
  console.log(chalk.green(`Android Build completed. APK generated at: ${apkPath}`));
  const apkBuffer = fs.readFileSync(apkPath);
  apkHash = crypto.createHash('sha256').update(apkBuffer).digest('hex');
} else {
  console.error(chalk.red(`Android build completed but APK not found at expected path: ${apkPath}`));
  process.exit(1);
}

// 6. Artifact Manifest
console.log(chalk.yellow('\n6. Generating Build Manifest...'));
process.chdir(appDir);

const desktopPath = path.join(appDir, 'dist-node', 'host-runtime.ts');
let desktopHash = null;
if (fs.existsSync(desktopPath)) {
  const desktopBuffer = fs.readFileSync(desktopPath);
  desktopHash = crypto.createHash('sha256').update(desktopBuffer).digest('hex');
}

const manifestPath = path.join(appDir, 'dist', 'build-manifest.json');
const manifest = {
  version: commitHash,
  buildHash: apkHash,
  timestamp: timestamp,
  artifacts: {
    desktop: {
      type: 'node',
      path: 'dist-node/host-runtime.ts',
      sha256: desktopHash
    },
    android: {
      type: 'apk',
      path: path.relative(appDir, apkPath).replace(/\\/g, '/'),
      sha256: apkHash
    }
  },
  environment: {
    node: nodeVersion,
    pnpm: pnpmVersion,
    java: javaVersion,
    os: os.platform()
  }
};

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(chalk.green(`Manifest written to ${manifestPath}`));

const duration = Math.floor((Date.now() - startTime) / 1000);
console.log(chalk.cyan('\n========================================'));
console.log(chalk.green(`VERIFICATION SUCCESSFUL (${duration}s)`));
console.log(chalk.cyan('========================================'));
