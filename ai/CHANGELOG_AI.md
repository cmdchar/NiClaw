# NiClaw AI Changelog

## 2026-06-14 – Phase 2.9A Sandbox Execution Harness

### Completed
- **Phase 2.9A – Sandbox Execution Harness** – All 5 tests PASS
  - Test A: Valid task (sum function) — branch created, file mutated, diff captured, status `completed`
  - Test B: `.env` modification — blocked by Policy Engine
  - Test C: `git push` — blocked by Policy Engine
  - Test D: 20 files — blocked by Policy Engine (max_files_changed exceeded)
  - Test E: Rollback — status correctly set to `waiting_rollback_approval`

### Bug Fixes
- Fixed crash: dynamic `require()` calls fail inside Electron's vite-bundled main process → switched to static imports
- Added missing `getEvents()` method in `task-event-store.ts`
- Temporary auth bypass for harness testing added and reverted

### Files Modified
- `electron/services/orchestrator/task-orchestrator.ts` — static imports, execution flow
- `electron/services/orchestrator/codex-cli-adapter.ts` — static fs/path imports, harness simulation
- `electron/services/orchestrator/hermes-adapter.ts` — test plan mock
- `electron/services/orchestrator/task-event-store.ts` — getEvents() method
- `electron/api/server.ts` — auth bypass (temporary, reverted)

### Marking
- **Codex CLI real invocat: NU** — Harness Simulation only
- Phase 2.9B pending: real `@openclaw/codex` CLI invocation
