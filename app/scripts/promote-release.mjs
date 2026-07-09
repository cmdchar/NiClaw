#!/usr/bin/env zx
import fs from 'fs';
import path from 'path';
import tar from 'tar';
import crypto from 'crypto';

const ROOT = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(ROOT, 'release');
const RELEASES_JSON = path.join(RELEASE_DIR, 'releases.json');

console.log('📦 Promoting release metadata...');

// 1. Read package version
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

const BUNDLE_NAME = `niclaw-vm-bundle-${version}.tar.gz`;
const BUNDLE_PATH = path.join(RELEASE_DIR, BUNDLE_NAME);
const SHA_PATH = path.join(RELEASE_DIR, `niclaw-vm-bundle-${version}.sha256`);

if (!fs.existsSync(BUNDLE_PATH)) {
    console.error(`❌ Bundle not found: ${BUNDLE_PATH}`);
    process.exit(1);
}

if (!fs.existsSync(SHA_PATH)) {
    console.error(`❌ Checksum not found: ${SHA_PATH}`);
    process.exit(1);
}

// 2. Read checksum
const shaOutput = fs.readFileSync(SHA_PATH, 'utf8').trim();
const expectedSha256 = shaOutput.split(' ')[0];

// Recalculate checksum to validate it actually matches
const fileBuffer = fs.readFileSync(BUNDLE_PATH);
const hashSum = crypto.createHash('sha256');
hashSum.update(fileBuffer);
const actualSha256 = hashSum.digest('hex');

if (expectedSha256 !== actualSha256) {
    console.error(`❌ Checksum mismatch! Expected ${expectedSha256}, got ${actualSha256}`);
    process.exit(1);
}

// 3. Extract manifest.json and VERSION.txt from the tarball
let manifestContent = '';
let versionTxtContent = '';
await tar.t({
    file: BUNDLE_PATH,
    onentry: entry => {
        if (entry.path === 'manifest.json') {
            const chunks = [];
            entry.on('data', c => chunks.push(c));
            entry.on('end', () => {
                manifestContent = Buffer.concat(chunks).toString('utf8');
            });
        }
        if (entry.path === 'build/VERSION.txt') {
            const chunks = [];
            entry.on('data', c => chunks.push(c));
            entry.on('end', () => {
                versionTxtContent = Buffer.concat(chunks).toString('utf8').trim();
            });
        }
    }
});

if (!manifestContent) {
    console.error('❌ Could not read internal manifest.json from tarball.');
    process.exit(1);
}

if (!versionTxtContent) {
    console.error('❌ Could not read build/VERSION.txt from tarball.');
    process.exit(1);
}

const manifest = JSON.parse(manifestContent);

// 4. Validate metadata match
if (manifest.artifactType !== 'vm-bundle') {
    console.error(`❌ Invalid artifactType in internal manifest: ${manifest.artifactType}`);
    process.exit(1);
}

if (manifest.version !== version) {
    console.error(`❌ Version mismatch between manifest (${manifest.version}) and package.json (${version})`);
    process.exit(1);
}

if (versionTxtContent !== version) {
    console.error(`❌ Version mismatch between VERSION.txt (${versionTxtContent}) and package.json (${version})`);
    process.exit(1);
}

// 5. Check releases.json immutability BEFORE overwriting anything
let releases = {};
if (fs.existsSync(RELEASES_JSON)) {
    releases = JSON.parse(fs.readFileSync(RELEASES_JSON, 'utf8'));
}

const existingRelease = releases[version];
if (existingRelease) {
    if (existingRelease.status === 'approved') {
        console.error(`❌ Cannot overwrite an existing approved release entry for version ${version}`);
        process.exit(1);
    }
    
    if (existingRelease.status === 'candidate') {
        const oldManifestPath = path.join(RELEASE_DIR, existingRelease.manifestPath);
        if (fs.existsSync(oldManifestPath)) {
            const oldManifest = JSON.parse(fs.readFileSync(oldManifestPath, 'utf8'));
            if (oldManifest.sha256 !== actualSha256) {
                console.error(`❌ Candidate already exists with a different checksum. Fail closed.`);
                process.exit(1);
            }
        }
    }
}

// 6. Enhance manifest with external release metadata
manifest.sha256 = actualSha256;
manifest.requirements = {
    nodeVersion: ">=20.0.0",
    pnpmVersion: ">=9.0.0"
};

const externalManifestPath = path.join(RELEASE_DIR, `niclaw-vm-bundle-${version}.manifest.json`);
fs.writeFileSync(externalManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`✅ Generated external release manifest: ${externalManifestPath}`);

// 7. Update releases.json
releases[version] = {
    status: "candidate",
    artifactPath: BUNDLE_NAME,
    checksumPath: `niclaw-vm-bundle-${version}.sha256`,
    manifestPath: `niclaw-vm-bundle-${version}.manifest.json`,
    createdAt: existingRelease ? existingRelease.createdAt : new Date().toISOString(),
    promotedAt: null,
    rejectedAt: null,
    notesPath: null
};

fs.writeFileSync(RELEASES_JSON, JSON.stringify(releases, null, 2), 'utf8');
console.log(`✅ Updated releases.json. Version ${version} marked as candidate.`);
