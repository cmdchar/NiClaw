# NiClaw Brain

## Current State
- The Agent Mesh features are fully operational and unmocked.
- Windows Renderer and Android Client fetch mesh status via a secure local bridge (/api/agent-mesh/status).
- SuperHermes gateway Token is securely injected by the Windows Host API without exposing it to UI layers.
- Architecture allows dynamic visualization of SuperHermes node states and triggering smoke tests securely.

## Recent Changes
- **Phase 4.8E2B-CLOSEOUT - VM Bundle Port Override Local Fix COMPLETED / VM Validation BLOCKED** (2026-06-21)
  - Fixed VM bundle closeout blockers in `app/electron/main/index.ts`, `app/scripts/package-vm-bundle.mjs`, and `app/scripts/openclaw-bundle-config.mjs`.
  - Final local artifact checksum: `b5dc375a33e1f1d284c0f833b1a9df6fc48057405cadba1bf066a759d805ab82`.
  - Bundle validation confirms `.npmrc` is line-safe and `resources/bin/linux-x64/uv` is packaged as executable (`0755`).
  - VM validation is blocked because `vm-niclaw` and Proxmox Tailscale endpoints stopped completing SSH/HTTP handshakes; do not promote from this artifact until staging boot is re-run.
- **OpenClaw Bundle Patch Compatibility FIXED** (2026-06-21)
  - `bundle-openclaw.mjs` no longer emits stale skipped-patch warnings for current OpenClaw runtime files.
  - PTY hardening now applies to `bash-tools-*.js` and `supervisor-*.js`; workspace runner detects current `exec-*.js` `windowsHide` support.
- **Phase 4.4C - Desktop Workspace UI COMPLETED** (2026-06-20)
  - Built `TaskWorkspacePanel.tsx` integrated into the `CommandCenter`.
  - Implemented `TaskTimeline.tsx` for structured chronologic visualization of tasks.
  - Implemented `WorkspaceArtifacts.tsx`, `WorkspacePatchReview.tsx`, and `ClarificationCard.tsx`.
- **Phase 4.4B Sprint 3 - Orchestrator And Patch Loop COMPLETED** (2026-06-20)
  - `task-orchestrator.ts` automatically creates Workspaces upon `submitTask`.
  - Upgraded Event Taxonomy (`workspace.file.read`, `workspace.command.started`, etc.) exposing `actionKind`, `actionType`, and `policyLevel`.
  - Hooked `workspace.plan.generated` and `workspace.patch.*` lifecycle events.
  - Wrapped actual executor CLI invocations in Workspace Execution tracking events and bound CLI large outputs to `WorkspaceArtifacts`.
- **Phase 4.4B Sprint 2 - Workspace Kernel And Policy Surface COMPLETED** (2026-06-20)
  - `workspace-kernel.ts` implemented offering robust and gated `listFiles`, `readFile`, `search`, and `runCommand`.
  - `policy-engine.ts` expanded with `classifyWorkspaceAction`.
  - Host API exposed via `/api/orchestrator/tasks/:taskId/workspace/*`.
- **Phase 4.4B Sprint 1 - Persistent Workspace Foundation COMPLETED** (2026-06-20)
  - `workspace-types.ts` defines `ProvenanceMetadata` explicitly.
  - `task-event-store.ts` extended to load/save `workspaces.json`.

## Next Steps
- **Resume Phase 4.8E2B VM validation when Tailscale/SSH recovers**:
  1. Remove the partial `/tmp/niclaw-artifacts/niclaw-vm-bundle-0.4.6.tar.gz` on `vm-niclaw`.
  2. Re-transfer `app/release/niclaw-vm-bundle-0.4.6.tar.gz` and `.sha256`.
  3. Extract into a fresh staging path such as `/opt/niclaw/releases/0.4.6.portfix5.staging`.
  4. Install with isolated npm/pnpm cache, verify local `node_modules/.bin/electron`, `build/openclaw/node_modules/dotenv`, and executable `resources/bin/linux-x64/uv`.
  5. Boot with override ports `CLAWX_PORT_CLAWX_HOST_API=14220` and `CLAWX_PORT_OPENCLAW_GATEWAY=18792`.
  6. Verify 14220 returns expected auth behavior, 18792 health responds, logs show no `getPort`, `dotenv`, `EACCES`, or `EADDRINUSE` failures, then clean only the staging/test processes.
- **Phase 4.4D - Android Workspace Viewers**: Build Android Companion UI components to natively consume `GET /api/orchestrator/tasks/:taskId/workspace/*` and visualize the timeline.
- **Phase 2.9B – Real Codex CLI Sandbox**: Install `@openclaw/codex`, configure API key, invoke real CLI in sandbox.
- Android diff viewer UI for execution results
- Extend Android UI for deep agent diagnostics
- `tasks.json` write atomicity fix (EPERM race on Windows)
