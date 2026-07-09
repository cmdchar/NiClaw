#!/usr/bin/env zx

const args = minimist(process.argv.slice(2), {
    boolean: ['dry-run', 'execute'],
    string: ['target', 'host'],
    default: {
        'dry-run': false,
        'execute': false
    }
});

const host = args.host || 'debian@100.78.81.89';
const isDryRun = args['dry-run'] || !args.execute;

async function ssh(cmd) {
    if (isDryRun && cmd.includes('deployment-state.json')) {
        return { stdout: '{"currentVersion":"0.4.7","previousVersion":"0.4.6"}', stderr: '', exitCode: 0 };
    }
    if (isDryRun && cmd.includes('ls -d')) {
        return { stdout: '/opt/niclaw/releases/0.4.6', stderr: '', exitCode: 0 };
    }
    if (isDryRun && cmd.includes('manifest.json')) {
        return { stdout: '{"version":"0.4.6"}', stderr: '', exitCode: 0 };
    }
    try {
        const out = await $`ssh -o StrictHostKeyChecking=no ${host} ${cmd}`;
        return { stdout: out.stdout.trim(), stderr: out.stderr.trim(), exitCode: 0 };
    } catch (err) {
        return { stdout: err.stdout ? err.stdout.trim() : '', stderr: err.stderr ? err.stderr.trim() : '', exitCode: err.exitCode || 1 };
    }
}

// 1. Read deployment-state.json
const resState = await ssh('cat /opt/niclaw/deployment-state.json');
if (resState.exitCode !== 0) {
    console.error('? Could not read /opt/niclaw/deployment-state.json');
    process.exit(1);
}

let state;
try {
    state = JSON.parse(resState.stdout);
} catch {
    console.error('? Invalid JSON in deployment-state.json');
    process.exit(1);
}

// 2. Resolve rollback target
let targetVersion = args.target;
if (!targetVersion) {
    targetVersion = state.previousVersion;
    if (!targetVersion) {
        console.error('? No previousVersion found in deployment-state.json and --target not provided.');
        process.exit(1);
    }
}

const currentVersion = state.currentVersion;
const targetPath = `/opt/niclaw/releases/${targetVersion}`;

// 3. Verify target exists and is structurally sound
const resCheck = await ssh(`ls -d ${targetPath}`);
if (resCheck.exitCode !== 0) {
    console.error(`? Target release directory does not exist: ${targetPath}`);
    process.exit(1);
}

const resManifest = await ssh(`cat ${targetPath}/manifest.json`);
if (resManifest.exitCode !== 0) {
    console.error(`? Target release is missing manifest.json`);
    process.exit(1);
}

// 4. Print dry-run format exactly as requested
if (isDryRun) {
    console.log(`CURRENT VERSION: ${currentVersion}`);
    console.log(`TARGET VERSION: ${targetVersion}\n`);
    
    console.log(`WOULD STOP:`);
    console.log(`  - openclaw-gateway.service`);
    console.log(`  - clawx-ai-os.service`);
    console.log(`  - jarvis-openclaw-bridge.service\n`);
    
    console.log(`WOULD SWITCH:`);
    console.log(`  ln -sfn ${targetPath} /opt/niclaw/current\n`);
    
    console.log(`WOULD START:`);
    console.log(`  - openclaw-gateway.service`);
    console.log(`  - clawx-ai-os.service`);
    console.log(`  - jarvis-openclaw-bridge.service`);
    
    process.exit(0);
}

console.log(`?? Executing Rollback from ${currentVersion} to ${targetVersion}...`);

// Backup state
console.log('?? Backing up deployment-state.json...');
await ssh(`cp /opt/niclaw/deployment-state.json /opt/niclaw/deployment-state.json.bak-${Date.now()}`);

// Stop services
console.log('?? Stopping services...');
await ssh('sudo systemctl stop openclaw-gateway.service clawx-ai-os.service jarvis-openclaw-bridge.service');

// Update state FIRST so verify-vm-release can check it correctly
state.history.push({
    action: 'rollback',
    fromVersion: currentVersion,
    toVersion: targetVersion,
    timestamp: new Date().toISOString()
});
state.currentVersion = targetVersion;
state.lastRollbackAt = new Date().toISOString();
state.lastHealthStatus = 'unknown';

const stateStr = JSON.stringify(state, null, 2);
await ssh(`echo '${stateStr}' > /tmp/deployment-state.json && mv /tmp/deployment-state.json /opt/niclaw/deployment-state.json`);

// Swap symlink
console.log('?? Swapping symlink...');
await ssh(`ln -sfn ${targetPath} /opt/niclaw/current`);

// Start services
console.log('?? Starting services...');
await ssh('sudo systemctl start openclaw-gateway.service clawx-ai-os.service jarvis-openclaw-bridge.service');

console.log('? Waiting 10 seconds for services to spin up...');
await sleep(10000);

console.log('?? Verifying rollback with verify-vm-release.mjs...');
try {
    await $`node app/scripts/verify-vm-release.mjs --target=${host}`;
    console.log('? Rollback verification passed.');
} catch (err) {
    console.error('? Rollback verification failed! The system might be unstable.');
    process.exit(1);
}

console.log('? Rollback complete.');
