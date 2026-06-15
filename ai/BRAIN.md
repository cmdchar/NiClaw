# NiClaw Brain

## Current State
- The Agent Mesh features are fully operational and unmocked.
- Windows Renderer and Android Client fetch mesh status via a secure local bridge (/api/agent-mesh/status).
- SuperHermes gateway Token is securely injected by the Windows Host API without exposing it to UI layers.
- Architecture allows dynamic visualization of SuperHermes node states and triggering smoke tests securely.

## Recent Changes
- **Phase 2.9A – Sandbox Execution Harness COMPLETED** (2026-06-14)
  - All 5 tests PASS: valid mutation, .env block, git push block, 20-file block, rollback
  - Sandbox at `C:\Server\sandbox\codex-safety-test` with proper git init + main branch
  - Branch creation, file mutation, git commit, diff capture all validated
  - Fixed: static imports in `task-orchestrator.ts` and `codex-cli-adapter.ts` (dynamic require crash in Electron bundle)
  - Fixed: added missing `getEvents()` method in `task-event-store.ts`
  - Auth bypass for harness testing was added and reverted
- Created a secure Agent Mesh proxy in the Host API.
- Registered proxy in `server.ts`.
- Replaced direct VM fetch calls with `hostApiFetch`.
- Refactored Android's `ApiClient.kt` to use `Context` and securely target the Host API bridge.

## Next Steps
- **Phase 2.9B – Real Codex CLI Sandbox**: Install `@openclaw/codex`, configure API key, invoke real CLI in sandbox
- Android diff viewer UI for execution results
- Extend Android UI for deep agent diagnostics
- `tasks.json` write atomicity fix (EPERM race on Windows)
