# ClawX AI OS - Release Workflow

This document outlines the professional workflow for releasing new versions of the ClawX AI Operating System.

## Versioning Policy

ClawX follows **Semantic Versioning (SemVer)**:
-   **Major**: Breaking architectural changes.
-   **Minor**: New AI OS capabilities or agent roles.
-   **Patch**: Bug fixes and LLM provider updates.

## Step-by-Step Release Process

### 1. Preparation
Ensure all features are functionally complete and verified:
-   **Visual Builder**: Verify node persistence and cluster sync.
-   **Analytics**: Verify real-time token tracking.
-   **Mobile**: Verify QR pairing with `expo-camera`.

### 2. Version Bump
Update the version in `package.json`:
```bash
pnpm version patch # or minor/major
```

### 3. Production Build
Build the production assets and installers for all supported platforms:
```bash
pnpm build
# Then package for specific platforms
pnpm package:mac
pnpm package:win
pnpm package:linux
```
The build process will automatically generate `release/UPDATE_INFO.md`.

### 4. GitHub Release Integration
The AI OS is configured to check for updates directly from GitHub.
1.  Navigate to the [GitHub Releases](https://github.com/ValueCell-ai/ClawX/releases) page.
2.  Click "Draft a new release".
3.  Set the tag (e.g., `v0.5.1`) and title.
4.  **Upload Assets**: Drag and drop all files from the `release/` folder.
    -   Installers: `.dmg`, `.exe`, `.deb`, `.AppImage`.
    -   Metadata: `latest.yml`, `latest-linux.yml`, `latest-exe.yml`. **These are mandatory for auto-update.**
5.  Publish the release.

### 5. Post-Release Verification
Launch a previously installed version of ClawX. It should detect the update within seconds and show the "Update Available" prompt.

## Automated CI/CD
Future releases should be handled via GitHub Actions using the `.github/workflows/package-win-manual.yml` (and equivalent mac/linux) to ensure clean build environments.
