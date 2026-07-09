#!/usr/bin/env zx

/**
 * sync-versions.mjs
 * 
 * Single Source of Truth Alignment.
 * Reads the version from app/package.json and propagates it to:
 * 1. Android build.gradle (versionCode and versionName)
 * 2. build/VERSION.txt (for the VM bundle and metadata)
 */

import 'zx/globals';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const PKG_JSON_PATH = path.join(ROOT, 'package.json');
const ANDROID_GRADLE_PATH = path.join(ROOT, 'mobile', 'android-kotlin', 'app', 'build.gradle');
const BUILD_DIR = path.join(ROOT, 'build');
const VERSION_TXT_PATH = path.join(BUILD_DIR, 'VERSION.txt');

// 1. Read single source of truth
const pkgJsonStr = fs.readFileSync(PKG_JSON_PATH, 'utf8');
const pkgJson = JSON.parse(pkgJsonStr);
const version = pkgJson.version; // e.g., '0.4.4'

// Strict SemVer validation
const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const match = version.match(semverRegex);

if (!match) {
    echo`❌ Error: Invalid semantic version in package.json: ${version}`;
    process.exit(1);
}

const major = parseInt(match[1], 10);
const minor = parseInt(match[2], 10);
const patch = parseInt(match[3], 10);

if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    echo`❌ Error: Failed to parse version numbers from: ${version}`;
    process.exit(1);
}

echo`🔄 Syncing version: ${version} across ecosystem...`;

// Calculate Android versionCode: major * 10000 + minor * 100 + patch
// Example: 0.4.4 -> 404
const versionCode = major * 10000 + minor * 100 + patch;

// 2. Update Android build.gradle
if (fs.existsSync(ANDROID_GRADLE_PATH)) {
    let gradleContent = fs.readFileSync(ANDROID_GRADLE_PATH, 'utf8');
    
    // Narrowly scoped replacement to ensure we only replace exactly what we expect
    if (!/versionCode\s+\d+/.test(gradleContent)) {
        echo`❌ Error: Could not find 'versionCode' in build.gradle`;
        process.exit(1);
    }
    if (!/versionName\s+"[^"]+"/.test(gradleContent)) {
        echo`❌ Error: Could not find 'versionName' in build.gradle`;
        process.exit(1);
    }

    gradleContent = gradleContent.replace(
        /(versionCode\s+)\d+/,
        `$1${versionCode}`
    );
    
    gradleContent = gradleContent.replace(
        /(versionName\s+)"[^"]+"/,
        `$1"${version}"`
    );
    
    fs.writeFileSync(ANDROID_GRADLE_PATH, gradleContent, 'utf8');
    echo`✅ Updated Android build.gradle (versionCode: ${versionCode}, versionName: "${version}")`;
} else {
    echo`❌ Error: Android build.gradle not found at ${ANDROID_GRADLE_PATH}`;
    process.exit(1);
}

// 3. Write VERSION.txt for VM Artifact
if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
}
fs.writeFileSync(VERSION_TXT_PATH, version, 'utf8');
echo`✅ Written ${VERSION_TXT_PATH}`;
