#!/usr/bin/env zx

const args = minimist(process.argv.slice(2), {
    boolean: ['dry-run'],
    string: ['target', 'expected-version'],
    default: {
        'dry-run': false
    }
});

const host = args.target || 'debian@100.78.81.89';
const expectedVersion = args['expected-version'];
let status = 'PASS';

function fail(msg) {
    console.log(chalk.red(`[FAIL] ${msg}`));
    status = 'FAIL';
}

function pass(msg) {
    console.log(chalk.green(`[PASS] ${msg}`));
}

async function ssh(cmd) {
    if (args['dry-run']) {
        console.log(`[DRY-RUN] ssh ${host} "${cmd.replace(/"/g, '\\"')}"`);
        // Return structured mock data based on the command so validation doesn't instantly fail
        if (cmd.includes('deployment-state.json')) {
            return { stdout: '{"currentVersion":"0.4.7"}', stderr: '', exitCode: 0 };
        }
        if (cmd.includes('readlink -f /opt/niclaw/current')) {
            return { stdout: '/opt/niclaw/releases/0.4.7', stderr: '', exitCode: 0 };
        }
        if (cmd.includes('manifest.json')) {
            return { stdout: '{"version":"0.4.7"}', stderr: '', exitCode: 0 };
        }
        if (cmd.includes('VERSION.txt')) {
            return { stdout: '0.4.7', stderr: '', exitCode: 0 };
        }
        if (cmd.includes('systemctl is-active')) {
            return { stdout: 'active', stderr: '', exitCode: 0 };
        }
        if (cmd.includes('MainPID')) {
            return { stdout: '12345', stderr: '', exitCode: 0 };
        }
        if (cmd.includes('readlink -f /proc/')) {
            return { stdout: '/opt/niclaw/releases/0.4.7/dist-electron/main/index.js', stderr: '', exitCode: 0 };
        }
        if (cmd.includes('cat /proc/')) {
            return { stdout: '/opt/niclaw/releases/0.4.7/dist-electron/main/index.js', stderr: '', exitCode: 0 };
        }
        if (cmd.includes('curl')) {
            return { stdout: '200', stderr: '', exitCode: 0 };
        }
        return { stdout: '/opt/niclaw/releases/0.4.7', stderr: '', exitCode: 0 };
    }
    try {
        const out = await $`ssh -o StrictHostKeyChecking=no ${host} ${cmd}`;
        return { stdout: out.stdout.trim(), stderr: out.stderr.trim(), exitCode: 0 };
    } catch (err) {
        return { stdout: err.stdout ? err.stdout.trim() : '', stderr: err.stderr ? err.stderr.trim() : '', exitCode: err.exitCode || 1 };
    }
}

console.log(`?? Running Deep Verification on NiClaw VM (${host})`);

if (args['dry-run']) {
    console.log('?? Dry-run mode active. Returning simulated positive assertions.');
}

// 1. Read deployment-state.json
const resState = await ssh('cat /opt/niclaw/deployment-state.json');
if (resState.exitCode !== 0) {
    fail('deployment-state.json missing or unreadable');
    process.exit(1);
}
let state;
try {
    state = JSON.parse(resState.stdout);
    if (expectedVersion) {
        state.currentVersion = expectedVersion;
        pass(`Using overridden expectedVersion: ${state.currentVersion}`);
    } else {
        pass(`Parsed deployment-state.json (currentVersion: ${state.currentVersion})`);
    }
} catch {
    fail('deployment-state.json contains invalid JSON');
    process.exit(1);
}

// 2. Resolve /opt/niclaw/current
const resSym = await ssh('readlink -f /opt/niclaw/current');
if (resSym.exitCode !== 0) {
    fail(`Could not resolve /opt/niclaw/current`);
    process.exit(1);
}
const currentTarget = resSym.stdout;
const expectedTarget = `/opt/niclaw/releases/${state.currentVersion}`;
if (currentTarget !== expectedTarget) {
    fail(`Symlink mismatch! /opt/niclaw/current -> ${currentTarget} (Expected: ${expectedTarget})`);
} else {
    pass(`Symlink /opt/niclaw/current -> ${currentTarget}`);
}

// 3. Validate manifest.json and VERSION.txt
const resManifest = await ssh(`cat ${currentTarget}/manifest.json`);
if (resManifest.exitCode !== 0) {
    fail(`manifest.json missing in ${currentTarget}`);
} else {
    try {
        const m = JSON.parse(resManifest.stdout);
        if (m.version !== state.currentVersion) {
            fail(`manifest.json version (${m.version}) mismatches deployment state (${state.currentVersion})`);
        } else {
            pass(`manifest.json version matches (${m.version})`);
        }
    } catch {
        fail('manifest.json contains invalid JSON');
    }
}

const resVersion = await ssh(`cat ${currentTarget}/build/VERSION.txt`);
if (resVersion.exitCode !== 0 || resVersion.stdout !== state.currentVersion) {
    fail(`VERSION.txt mismatch or missing. Got: ${resVersion.stdout}`);
} else {
    pass(`VERSION.txt matches (${state.currentVersion})`);
}

// 4. Verify processes are physically running out of current release
const services = ['clawx-ai-os.service', 'openclaw-gateway.service'];
for (const svc of services) {
    const resSvc = await ssh(`systemctl is-active ${svc}`);
    if (resSvc.stdout !== 'active') {
        fail(`Service inactive: ${svc} (status: ${resSvc.stdout})`);
        continue;
    }
    
    // Check main PID
    const resPid = await ssh(`systemctl show -p MainPID --value ${svc}`);
    const pid = resPid.stdout;
    if (!pid || pid === '0') {
        fail(`Could not find MainPID for ${svc}`);
        continue;
    }

    // Collect provenance signals
    const resCwd = await ssh(`readlink -f /proc/${pid}/cwd`);
    const resExe = await ssh(`readlink -f /proc/${pid}/exe`);
    const resCmd = await ssh(`cat /proc/${pid}/cmdline | xargs -0 echo`);
    
    const signals = [resCwd.stdout, resExe.stdout, resCmd.stdout];
    let isTainted = false;
    
    for (const signal of signals) {
        if (!signal) continue;
        if (signal.includes('.staging') || 
            signal.includes('/home/debian/NiClaw') || 
            (signal.includes('/opt/niclaw/releases/') && !signal.includes(state.currentVersion))) {
            isTainted = true;
            fail(`Process ${pid} (${svc}) is TAINTED! Signal references illegal path: ${signal}`);
        }
    }

    if (!isTainted) {
        if (signals.some(s => s && (s.includes(currentTarget) || s.includes('/opt/niclaw/current')))) {
            pass(`Service ${svc} provenance verified (cwd, exe, cmdline checked)`);
        } else {
            fail(`Process ${pid} (${svc}) has no definitive provenance to ${currentTarget}`);
        }
    }
}

// 5. Verify ports & health
const healthChecks = [
    { port: 13210, path: '/api/orchestrator/health' }, 
    { port: 18789, path: '/health' },
    { port: 18790, path: '/health' }
];

for (const check of healthChecks) {
    const resHealth = await ssh(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${check.port}${check.path}`);
    if (resHealth.exitCode === 0 && (resHealth.stdout === '200' || resHealth.stdout === '401' || resHealth.stdout === '404')) {
        pass(`Health endpoint responding: ${check.port}${check.path} (${resHealth.stdout})`);
    } else {
        fail(`Health endpoint failed: ${check.port}${check.path} (HTTP ${resHealth.stdout})`);
    }
}

console.log(`\n======================================`);
console.log(`VERIFICATION RESULT: ${status}`);
console.log(`======================================\n`);

if (status === 'FAIL') process.exit(1);
