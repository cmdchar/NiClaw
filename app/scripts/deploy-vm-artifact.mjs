#!/usr/bin/env zx

const args = minimist(process.argv.slice(2), {
    boolean: ['dry-run', 'execute', 'rehearsal'],
    string: ['version', 'host'],
    default: {
        'dry-run': false,
        'execute': false,
        'rehearsal': false
    }
});

const host = args.host || 'debian@100.78.81.89';
const version = args.version;
const isDryRun = args['dry-run'] || !args.execute;

if (!version) {
    console.error('? Missing required argument: --version');
    process.exit(1);
}

const bundleName = `niclaw-vm-bundle-${version}.tar.gz`;
const localBundlePath = path.join(__dirname, '..', 'release', bundleName);

console.log(`?? Deploying NiClaw VM Artifact: v${version}`);

if (!fs.existsSync(localBundlePath) && !isDryRun) {
    console.error(`? Local bundle not found: ${localBundlePath}`);
    process.exit(1);
}

async function ssh(cmd) {
    if (isDryRun && cmd.includes('ls /opt/niclaw/releases')) {
        return { stdout: '0.4.4.staging\n0.4.5.staging\n0.4.6\n0.4.7', stderr: '', exitCode: 0 };
    }
    try {
        const out = await $`ssh.exe -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 ${host} ${cmd}`;
        return { stdout: out.stdout.trim(), stderr: out.stderr.trim(), exitCode: 0 };
    } catch (err) {
        return { stdout: err.stdout ? err.stdout.trim() : '', stderr: err.stderr ? err.stderr.trim() : '', exitCode: err.exitCode || 1 };
    }
}

async function getState() {
    if (isDryRun) {
        return {
            currentVersion: '0.4.7',
            previousVersion: '0.4.6',
            history: []
        };
    }
    const resState = await ssh('cat /opt/niclaw/deployment-state.json');
    if (resState.exitCode === 0) {
        return JSON.parse(resState.stdout);
    }
    return {
        currentVersion: '0.4.7',
        previousVersion: null,
        history: []
    };
}

if (isDryRun) {
    console.log(`\n--- DEPLOYMENT PLAN ---`);
    console.log(`1. SCP ${bundleName} -> /tmp/`);
    console.log(`2. Unpack to /opt/niclaw/releases/${version}`);
    console.log(`3. Run pnpm install & pnpm approve-builds better-sqlite3`);
    console.log(`4. Run Staging Boot Test (Ports 13299/18799)`);
    console.log(`5. Stop Services`);
    console.log(`6. Swap Symlink -> /opt/niclaw/current`);
    console.log(`7. Start Services`);
    console.log(`8. Verify with verify-vm-release.mjs (Automatic Rollback on Failure)`);
    console.log(`9. Commit deployment-state.json`);
    console.log(`10. Retention (Simulation only)`);
    
    console.log(`\n?? [DRY RUN] Staging Boot Test...`);
    console.log(`Executing isolated artifact environment variables:`);
    console.log(`  export CLAWX_PORT_CLAWX_HOST_API=13299`);
    console.log(`  export CLAWX_PORT_OPENCLAW_GATEWAY=18799`);
    console.log(`  export CLAWX_HEADLESS=1`);
    console.log(`  xvfb-run -a pnpm exec electron dist-electron/main/index.js --headless --user-data-dir=/tmp/niclaw-staging`);
    
    console.log(`? Waiting 15 seconds for staging to warm up...`);
    console.log(`  -> 13299 healthy`);
    console.log(`  -> 18799 healthy`);
    console.log(`? Staging Boot Test Passed! (Mocked)`);
    
    const state = await getState();
    const toKeep = [state.currentVersion, state.previousVersion];
    console.log(`\nRetention Simulation:`);
    const releasesRes = await ssh('ls /opt/niclaw/releases');
    if (releasesRes.exitCode === 0) {
        const releases = releasesRes.stdout.split('\n').filter(Boolean);
        for (const rel of releases) {
            if (!toKeep.includes(rel) && rel !== version) {
                console.log(`WOULD DELETE: ${rel}`);
            }
        }
    }
    console.log(`\n?? Dry-run completed. Pass --execute to run real deployment.`);
    process.exit(0);
}

// 1 & 2: SCP and unpack
console.log(`📦 Uploading bundle...`);
await $`cd release && scp.exe -q -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 ${bundleName} ${bundleName}.sha256 ${host}:/tmp/`;

console.log(`🔬 Verifying checksum...`);
const resSha = await ssh(`cd /tmp && sha256sum -c ${bundleName}.sha256`);
if (resSha.exitCode !== 0) {
    console.error(`❌ Checksum mismatch! Deployment aborted.`);
    console.error(resSha.stderr || resSha.stdout);
    process.exit(1);
}

console.log(`📦 Unpacking on VM...`);
await ssh(`mkdir -p /opt/niclaw/releases/${version}`);
await ssh(`tar -xzf /tmp/${bundleName} -C /opt/niclaw/releases/${version}`);
await ssh(`rm /tmp/${bundleName}`);

// 3: PNPM install
console.log(`?? Installing production dependencies...`);
await ssh(`cd /opt/niclaw/releases/${version} && pnpm install --prod --ignore-scripts`);

console.log(`?? Installing openclaw production dependencies...`);
await ssh(`cd /opt/niclaw/releases/${version}/build/openclaw && pnpm install --prod --ignore-scripts --ignore-workspace`);

console.log(`?? Approving native builds (allowlist)...`);
await ssh(`cd /opt/niclaw/releases/${version} && pnpm approve-builds better-sqlite3`);

const electronVerOutput = await ssh(`cd /opt/niclaw/releases/${version} && node -e "console.log(require('./package.json').dependencies.electron.replace(/[^0-9.]/g, ''))"`);
const electronVer = electronVerOutput.stdout;
console.log(`?? Rebuilding native modules for Electron v${electronVer}...`);
await ssh(`cd /opt/niclaw/releases/${version} && npm_config_runtime=electron npm_config_target=${electronVer} npm_config_disturl=https://electronjs.org/headers pnpm rebuild`);

// 4: Staging Boot Test
console.log(`?? Running Staging Boot Test...`);
const stagingScript = `
cd /opt/niclaw/releases/${version}
export CLAWX_PORT_CLAWX_HOST_API=13299
export CLAWX_PORT_OPENCLAW_GATEWAY=18799
export CLAWX_HEADLESS=1
export CLAWX_API_TOKEN="staging-token-123"
xvfb-run -a pnpm exec electron dist-electron/main/index.js --headless --user-data-dir=/tmp/niclaw-staging > /tmp/staging-boot.log 2>&1 &
echo $! > /tmp/staging-boot.pid
`.trim();

const scriptB64 = Buffer.from(stagingScript).toString('base64');
await ssh(`echo ${scriptB64} | base64 -d > /tmp/run-staging.sh && bash /tmp/run-staging.sh`);

console.log(`⏳ Waiting 30 seconds for staging to warm up...`);
await sleep(30000);

const check13299 = await ssh(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:13299/api/orchestrator/health`);
const check13299_mem = await ssh(`curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer staging-token-123" http://127.0.0.1:13299/api/memory/inventory`);
const check13299_task = await ssh(`curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer staging-token-123" -H "Content-Type: application/json" -d '{"prompt":"staging test"}' http://127.0.0.1:13299/api/orchestrator/tasks`);
const check18799 = await ssh(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18799/health`);

let stagingPass = true;
if (check13299.stdout !== '200' && check13299.stdout !== '401') {
    console.error(`❌ Staging Host API /api/orchestrator/health failed (HTTP ${check13299.stdout})`);
    stagingPass = false;
}
if (check13299_mem.stdout !== '200') {
    console.error(`❌ Staging Host API /api/memory/inventory failed (HTTP ${check13299_mem.stdout})`);
    stagingPass = false;
}
if (check13299_task.stdout !== '201' && check13299_task.stdout !== '200' && check13299_task.stdout !== '400') {
    console.error(`❌ Staging Host API /api/orchestrator/tasks failed (HTTP ${check13299_task.stdout})`);
    stagingPass = false;
}
if (check18799.stdout !== '200' && check18799.stdout !== '401') {
    console.error(`❌ Staging Gateway failed on 18799 (HTTP ${check18799.stdout})`);
    stagingPass = false;
}

console.log(`?? Killing Staging Boot Test processes...`);
await ssh(`if [ -f /tmp/staging-boot.pid ]; then kill -9 \`cat /tmp/staging-boot.pid\`; rm /tmp/staging-boot.pid; fi`);
await ssh(`pkill -f 'dist-electron/main/index.js --headless --user-data-dir=/tmp/niclaw-staging' || true`);
await ssh(`pkill -f 'openclaw gateway --port 18799' || true`);

if (!stagingPass) {
    console.error(`❌ Staging Boot Test FAILED. Deployment aborted. Services were NOT touched.`);
    const log = await ssh(`tail -n 50 /tmp/staging-boot.log`);
    console.error(log.stdout);
    await ssh(`kill -9 $(cat /tmp/staging-boot.pid) || true`);
    process.exit(1);
}

console.log(`✅ Staging Boot Test Passed!`);
await ssh(`kill -9 $(cat /tmp/staging-boot.pid) || true`);

if (args.rehearsal) {
    console.log('\n🎭 REHEARSAL COMPLETE: Staging validation successful. Aborting before production mutation.');
    process.exit(0);
}

// 5-9: Actual rollout
console.log('?? Backing up deployment-state.json...');
await ssh(`cp /opt/niclaw/deployment-state.json /opt/niclaw/deployment-state.json.bak-${Date.now()} || true`);

const state = await getState();
const previousVersion = state.currentVersion;

console.log('🛑 Stopping live services...');
await ssh('sudo systemctl stop openclaw-gateway.service clawx-ai-os.service jarvis-openclaw-bridge.service');

console.log('🔄 Swapping symlink...');
await ssh(`sudo ln -sfn /opt/niclaw/releases/${version} /opt/niclaw/current`);

console.log('🚀 Starting live services...');
await ssh('sudo systemctl start openclaw-gateway.service clawx-ai-os.service jarvis-openclaw-bridge.service');

try {
    console.log('⏳ Waiting 10 seconds for services to spin up...');
    await sleep(10000);

    console.log('🩺 Verifying deployment with verify-vm-release.mjs...');
    await $`node scripts/verify-vm-release.mjs --target=${host} --expected-version=${version}`;
    console.log('✅ Deployment verification passed.');
    
    // Commit state
    state.history.push({
        action: 'deploy',
        fromVersion: previousVersion,
        toVersion: version,
        timestamp: new Date().toISOString()
    });
    state.previousVersion = previousVersion;
    state.currentVersion = version;
    state.lastDeployedAt = new Date().toISOString();
    state.lastHealthStatus = 'ok';

    const stateStr = JSON.stringify(state, null, 2);
    const stateB64 = Buffer.from(stateStr).toString('base64');
    await ssh(`echo ${stateB64} | base64 -d | sudo tee /opt/niclaw/deployment-state.json > /dev/null`);
    console.log('📝 Deployment state committed.');
} catch (err) {
    console.error('❌ Deployment verification failed! Initiating AUTOMATIC ROLLBACK...');
    console.error(err.stdout || err.stderr);
    try {
        await $`node scripts/rollback-vm-artifact.mjs --target=${previousVersion} --execute`;
        console.log('♻️ Automatic rollback completed. System restored to previous version.');
    } catch (rollbackErr) {
        console.error('🚨 CRITICAL: Automatic rollback failed!', rollbackErr.stdout || rollbackErr.stderr);
    }
    process.exit(1);
}

// 10: Retention Simulation
console.log(`\nRetention Policy:`);
const toKeep = [state.currentVersion, state.previousVersion];
const releasesRes = await ssh('ls /opt/niclaw/releases');
if (releasesRes.exitCode === 0) {
    const releases = releasesRes.stdout.split('\n').filter(Boolean);
    for (const rel of releases) {
        if (!toKeep.includes(rel)) {
            console.log(`WOULD DELETE: ${rel}`);
        }
    }
}

console.log(`\n?? Deployment of v${version} completed successfully!`);

