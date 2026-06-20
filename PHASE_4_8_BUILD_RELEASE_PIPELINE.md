# Phase 4.8 - Build And Release Pipeline

Status: planned
Created: 2026-06-20

## Objective

Make NiClaw buildable, packageable, and releasable for Desktop and Android with consistent verification.

## Outputs

- Desktop build artifacts.
- Android APK.
- Release notes.
- Build logs.
- Version metadata.

## Tasks

### 4.8.1 - Build Inventory

- [ ] Inspect `app/package.json`.
- [ ] Inspect Electron builder config.
- [ ] Inspect Android Gradle config.
- [ ] Document Desktop build command.
- [ ] Document Android build command.
- [ ] Document required Node/Java/Android SDK versions.

Acceptance:

- [ ] Build prerequisites are explicit.

### 4.8.2 - Desktop Build

Commands:

```powershell
cd C:\Server\niclaw\app
pnpm run typecheck
pnpm run build:vite
pnpm run package:win
```

Tasks:

- [ ] Run typecheck.
- [ ] Run Vite/Electron build.
- [ ] Run Windows package if environment supports it.
- [ ] Record artifact path.
- [ ] Record warnings.

Acceptance:

- [ ] Desktop build artifact exists or blocker documented.

### 4.8.3 - Android Build

Commands:

```powershell
cd C:\Server\niclaw\app\mobile\android-kotlin
.\gradlew.bat assembleDebug
```

Tasks:

- [ ] Build debug APK.
- [ ] Optionally configure release signing later.
- [ ] Record APK path.
- [ ] Archive APK.

Acceptance:

- [ ] APK builds.

### 4.8.4 - Automated Verification Script

Create:

- `VERIFY_NICLAW.ps1` in root or `app/scripts`.

It should run:

- [ ] git status.
- [ ] Desktop typecheck.
- [ ] Desktop build.
- [ ] Android build.
- [ ] optional endpoint smoke if Host API running.

Acceptance:

- [ ] One script produces verification report.

### 4.8.5 - Release Notes

- [ ] Generate release notes from Brain/CHANGELOG.
- [ ] Include Desktop changes.
- [ ] Include Android changes.
- [ ] Include VM changes.
- [ ] Include known limitations.

Acceptance:

- [ ] Release notes are ready before packaging.

## Done Definition

- [ ] Desktop build process is repeatable.
- [ ] Android build process is repeatable.
- [ ] Verification script exists.
- [ ] Release notes exist.

