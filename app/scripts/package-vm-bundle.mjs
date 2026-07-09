#!/usr/bin/env zx

/**
 * package-vm-bundle.mjs
 * 
 * Creates a self-contained tarball for the VM, containing only the compiled 
 * runtime artifacts. Specifically EXCLUDES node_modules/ to prevent cross-platform
 * native dependency issues (e.g. sharp) between Windows and Debian VM.
 */

import 'zx/globals';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(ROOT, 'release');
const PKG_JSON_PATH = path.join(ROOT, 'package.json');
const STAGING_DIR = path.join(ROOT, 'build', 'tmp-vm-lock');

// Ensure we have a release directory
if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

// 1. Read single source of truth version
const pkgJsonStr = fs.readFileSync(PKG_JSON_PATH, 'utf8');
const pkgJson = JSON.parse(pkgJsonStr);
const version = pkgJson.version;

// Ensure electron exists in devDependencies
if (!pkgJson.devDependencies || !pkgJson.devDependencies.electron) {
    echo`❌ Error: Missing 'electron' in devDependencies of app/package.json`;
    process.exit(1);
}
const electronVersion = pkgJson.devDependencies.electron;

const BUNDLE_NAME = `niclaw-vm-bundle-${version}.tar.gz`;
const BUNDLE_PATH = path.join(RELEASE_DIR, BUNDLE_NAME);

echo`📦 Packaging VM Runtime Bundle: ${BUNDLE_NAME}...`;

// 2. Prepare staging directory
echo`🔄 Preparing staging directory for VM manifest generation...`;
if (fs.existsSync(STAGING_DIR)) {
    fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

// 3. Generate VM specific package.json in staging
const vmPkg = { ...pkgJson };
vmPkg.dependencies = { ...vmPkg.dependencies, electron: electronVersion, openclaw: 'file:./build/openclaw' };
vmPkg.scripts = { ...vmPkg.scripts, "start:vm": "electron dist-electron/main/index.js --headless" };
delete vmPkg.scripts.postinstall;
delete vmPkg.scripts.preinstall;
delete vmPkg.scripts.prepare;
vmPkg.niclawRuntimeTarget = "vm";

// Inject bounded pnpm onlyBuiltDependencies policy for safety
vmPkg.pnpm = {
    ...vmPkg.pnpm,
    onlyBuiltDependencies: ["electron", "better-sqlite3"]
};

fs.writeFileSync(path.join(STAGING_DIR, 'package.json'), JSON.stringify(vmPkg, null, 4), 'utf8');
echo`✅ Injected VM-specific package.json (electron ${electronVersion})`;

// Create safe .npmrc for VM to enforce the bounded build policy
const safeNpmrc = `
# Enforce bounded build policy for pnpm
only-built-dependencies=electron,better-sqlite3
`;
fs.writeFileSync(path.join(STAGING_DIR, '.npmrc'), safeNpmrc, 'utf8');

if (fs.existsSync(path.join(ROOT, '.npmrc'))) {
    const rootNpmrc = fs.readFileSync(path.join(ROOT, '.npmrc'), 'utf8');
    // Ensure we don't duplicate only-built-dependencies and omit secrets
    const filteredRootNpmrc = rootNpmrc
        .split(/\r?\n/)
        .filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0
                && !trimmed.startsWith('only-built-dependencies')
                && !trimmed.toLowerCase().includes('token')
                && !trimmed.toLowerCase().includes('secret');
        })
        .join('\n');
    if (filteredRootNpmrc) {
        fs.appendFileSync(path.join(STAGING_DIR, '.npmrc'), `\n${filteredRootNpmrc}\n`, 'utf8');
    }
}


// Isolate staging directory from parent workspace
fs.writeFileSync(path.join(STAGING_DIR, 'pnpm-workspace.yaml'), 'packages:\n  - "."\n  - "build/openclaw"\n', 'utf8');

// 3.5 Copy compiled artifacts to staging BEFORE generating lockfile
echo`🔄 Copying compiled artifacts to staging...`;
const sourceArtifacts = [
    'bin',
    'dist',
    'dist-electron',
    'build/openclaw',
    'build/VERSION.txt',
    'resources'
];

for (const p of sourceArtifacts) {
    const src = path.join(ROOT, p);
    const dest = path.join(STAGING_DIR, p);
    if (!fs.existsSync(src)) {
        echo`❌ Error: Missing required path for VM bundle: ${p}. Did you run 'pnpm run package' first?`;
        process.exit(1);
    }
    fs.cpSync(src, dest, { recursive: true, force: true });
}

const linuxBinDir = path.join(STAGING_DIR, 'resources', 'bin', 'linux-x64');
if (fs.existsSync(linuxBinDir)) {
    for (const entry of fs.readdirSync(linuxBinDir)) {
        const candidate = path.join(linuxBinDir, entry);
        if (fs.statSync(candidate).isFile()) {
            fs.chmodSync(candidate, 0o755);
        }
    }
}

const localBinDir = path.join(STAGING_DIR, 'bin');
if (fs.existsSync(localBinDir)) {
    for (const entry of fs.readdirSync(localBinDir)) {
        const candidate = path.join(localBinDir, entry);
        if (fs.statSync(candidate).isFile()) {
            fs.chmodSync(candidate, 0o755);
        }
    }
}

// 4. Generate lockfile in staging
echo`🔄 Generating VM-specific lockfile...`;
import { execSync } from 'child_process';

try {
    execSync('pnpm install --lockfile-only --prod --ignore-scripts', { cwd: STAGING_DIR, stdio: 'inherit' });
    if (!fs.existsSync(path.join(STAGING_DIR, 'pnpm-lock.yaml'))) {
        throw new Error('pnpm-lock.yaml was not created');
    }
    echo`✅ Generated VM-specific pnpm-lock.yaml`;
} catch (e) {
    echo`❌ Failed to generate VM lockfile: ${e}`;
    process.exit(1);
}

// 5. Validate frozen-lockfile in a disposable temp directory
// echo`🔍 Validating frozen-lockfile compatibility...`;
// const DISPOSABLE_DIR = path.join(ROOT, 'build', 'tmp-vm-validate');
// if (fs.existsSync(DISPOSABLE_DIR)) fs.rmSync(DISPOSABLE_DIR, { recursive: true, force: true });
// fs.mkdirSync(DISPOSABLE_DIR, { recursive: true });
// fs.writeFileSync(path.join(DISPOSABLE_DIR, 'pnpm-workspace.yaml'), 'packages:\n  - "."\n  - "build/openclaw"\n', 'utf8');
// fs.copyFileSync(path.join(STAGING_DIR, 'package.json'), path.join(DISPOSABLE_DIR, 'package.json'));
// fs.cpSync(path.join(STAGING_DIR, 'build/openclaw'), path.join(DISPOSABLE_DIR, 'build/openclaw'), { recursive: true, force: true });
// fs.copyFileSync(path.join(STAGING_DIR, 'pnpm-lock.yaml'), path.join(DISPOSABLE_DIR, 'pnpm-lock.yaml'));
// if (fs.existsSync(path.join(STAGING_DIR, '.npmrc'))) {
//     fs.copyFileSync(path.join(STAGING_DIR, '.npmrc'), path.join(DISPOSABLE_DIR, '.npmrc'));
// }
// 
// try {
//     execSync('pnpm install --prod --frozen-lockfile --ignore-scripts --config.confirmModulesPurge=false', { 
//         cwd: DISPOSABLE_DIR, 
//         stdio: 'inherit',
//         env: { ...process.env, CI: 'true' }
//     });
//     echo`✅ Frozen-lockfile validation passed in disposable context`;
// } catch (e) {
//     echo`❌ Validation Error: pnpm install --frozen-lockfile failed in isolated VM manifest context`;
//     echo`Details: ${e}`;
//     process.exit(1);
// }
// 
// 6. Assemble remaining files into staging directory
let gitCommit = 'unknown';
try {
    const gitOutput = await $`git rev-parse HEAD`.quiet();
    gitCommit = gitOutput.stdout.trim();
} catch (e) {
    echo`⚠️  Could not retrieve git commit hash.`;
}

const manifest = {
    version: version,
    gitCommit: gitCommit,
    buildDate: new Date().toISOString(),
    artifactType: 'vm-bundle'
};
fs.writeFileSync(path.join(STAGING_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');



// 7. Create the tarball using node-tar
import * as tar from 'tar';

const includedPaths = [
    'bin/',
    'dist/',
    'dist-electron/',
    'build/openclaw/',
    'build/VERSION.txt',
    'manifest.json',
    'package.json',
    'pnpm-lock.yaml',
    '.npmrc',
    'resources/'
];

try {
    cd(ROOT); // tar relative path calculations
    const relativeBundlePath = `release/${BUNDLE_NAME}`;
    const linuxRuntimeBinPrefix = 'resources/bin/linux-x64/';
    
    // Explicit exclusions for safety
      const filter = (pathStr, stat) => {
          if (pathStr.includes('node_modules/') || pathStr.endsWith('node_modules')) return false;
          if (pathStr.includes('.env')) return false;
        if (pathStr.includes('/logs/') || pathStr.startsWith('logs/')) return false;
        if (pathStr.endsWith('.db')) return false;
        if (pathStr.endsWith('.sqlite')) return false;
        if ((pathStr.startsWith(linuxRuntimeBinPrefix) || pathStr.startsWith('bin/')) && stat.isFile()) {
            stat.mode = (stat.mode & ~0o777) | 0o755;
        }
        return true;
    };
    
    await tar.c(
        {
            gzip: true,
            file: relativeBundlePath,
            filter: filter,
            cwd: STAGING_DIR
        },
        includedPaths
    );
    
    // 8. Generate SHA256 sum using Node crypto
    const fileBuffer = fs.readFileSync(BUNDLE_PATH);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    
    // Format compatible with `sha256sum -c`
    const hashOutput = `${hex}  ${BUNDLE_NAME}\n`;
    const hashFilePath = path.join(RELEASE_DIR, `niclaw-vm-bundle-${version}.sha256`);
    fs.writeFileSync(hashFilePath, hashOutput, 'utf8');
    
    echo`✅ VM Bundle created successfully: ${BUNDLE_PATH}`;
    echo`✅ Checksum written to: ${hashFilePath}`;
    
    // 9. Final Validation of Tarball Contents
    echo`🔍 Validating bundle contents...`;
    const contents = [];
    await tar.t({
        file: relativeBundlePath,
        onentry: entry => contents.push(entry.path)
    });
    
    const requiredFiles = ['manifest.json', 'package.json', 'pnpm-lock.yaml', 'build/VERSION.txt'];
    for (const req of requiredFiles) {
        if (!contents.some(c => c.includes(req))) {
            throw new Error(`Missing ${req} in bundle!`);
        }
    }
    
    if (!contents.some(c => c.includes('dist-electron/main/index.js'))) {
        throw new Error(`Missing compiled entrypoint dist-electron/main/index.js in bundle!`);
    }
    if (!contents.includes('resources/bin/linux-x64/uv')) {
        throw new Error('Missing executable Linux uv binary in bundle: resources/bin/linux-x64/uv');
    }
    if (!contents.includes('bin/openclaw')) {
        throw new Error('Missing executable openclaw wrapper in bundle: bin/openclaw');
    }

    await tar.t({
        file: relativeBundlePath,
        onentry: entry => {
            if ((entry.path.startsWith(linuxRuntimeBinPrefix) || entry.path.startsWith('bin/')) && entry.type === 'File' && (entry.mode & 0o111) === 0) {
                throw new Error(`Linux runtime binary is not executable in bundle: ${entry.path}`);
            }
        }
    });
    
    for (const file of contents) {
          if (file.includes('node_modules/') || file.endsWith('node_modules')) {
              throw new Error(`Forbidden node_modules found in bundle: ${file}`);
          }
        if (file.endsWith('.env') || file.includes('.env.')) {
            throw new Error(`Forbidden .env file found in bundle: ${file}`);
        }
        if (file.includes('/logs/') || file.startsWith('logs/')) {
            throw new Error(`Forbidden logs dir found in bundle: ${file}`);
        }
    }
    echo`✅ Bundle validation passed. No forbidden files found, all required files present.`;
    
} catch (error) {
    echo`❌ Failed to create VM bundle: ${error}`;
    process.exit(1);
}
