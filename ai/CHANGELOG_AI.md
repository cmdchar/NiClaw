# NiClaw AI Changelog

## 2026-06-20 – Phase 4.4C Desktop Workspace UI

### Completed
- **Phase 4.4C - Desktop Workspace UI**:
  - `TaskWorkspacePanel.tsx`: Added as the main wrapper for displaying an agent's workspace.
  - `TaskTimeline.tsx`: Implemented detailed chronological timeline of `workspace.*` events (commands, patches, execution bounds).
  - `WorkspaceArtifacts.tsx`: Implemented a UI to list workspace artifacts (stdout, stderr, execution payloads) with a sliding `Sheet` for quick preview.
  - `WorkspacePatchReview.tsx`: Added comprehensive UI for reviewing patches. Supports localized actions `apply-patch`, `reject-patch`, and `approve-patch` for repo committal.
  - `ClarificationCard.tsx`: UI surface to capture user response for `waiting_clarification` states.
  - `CommandCenter/index.tsx`: Integrated Orchestrator tasks into the main dev Command Center dashboard, acting as an entry point to the workspace panel.
  - `orchestrator.ts`: Added `/api/orchestrator/tasks/:taskId/workspace/artifacts/:artifactId/read` to stream specific artifact content on demand.

## 2026-06-20 – Phase 4.4B Sprint 1 - Persistent Workspace Foundation

### Completed
- **Phase 4.4B Sprint 3 - Orchestrator And Patch Loop**:
  - `task-orchestrator.ts`: Auto-creates a Workspace automatically on `submitTask`.
  - Added specific timeline tracking in Workspace Kernel (`workspace.file.listed`, `workspace.file.read`, `workspace.search.completed`, `workspace.command.started/completed/failed`).
  - Added structured metadata `actionKind`, `actionType`, `policyLevel` into `workspace-kernel` events to assist with Spatial UI graph visualization.
  - Linked Plan Generation into Workspace: Emits `workspace.plan.generated`.
  - Wrapped Execution in Workspace Events: Emits `workspace.execution.started/completed` framing the real execution, preserving the underlying command outputs into WorkspaceArtifacts.
  - PatchHarvester Integration: Emits `workspace.patch.generated`, extracts diff, and saves as `WorkspacePatch` to the active Workspace.
  - Patch Review states integrated: Local apply correctly updates `WorkspacePatch` state to `approved`/`rejected`/`applied`.
  - Retro-compatibility maintained by not stripping any old task events from the orchestrator logic.
- **Policy Engine Integration**: Added `classifyWorkspaceAction` into `policy-engine.ts` with action levels (`safe`, `medium`, `dangerous`, `blocked`), mapping explicitly to system commands and blocking destructive actions.
- **Host API Workspace Routes**: Exposed the Kernel operations via Host API on `GET /api/orchestrator/tasks/:taskId/workspace/*` and `POST` equivalents, returning structured JSON and enforcing validation constraints.
- **Artifact Persistence**: Implemented `saveWorkspaceArtifact` inside `TaskEventStore` to safely route large `stdout`/`stderr` outputs into persistent artifacts rather than overwhelming the memory graph.
- **Workspace Types Definition**: Created `workspace-types.ts` introducing `ProvenanceMetadata` explicitly and linking it to `TaskWorkspace`, `WorkspaceEvent`, `WorkspaceArtifact`, `WorkspacePatch`, and `WorkspaceDecision`.
- **TaskEventStore Extension**: Extended `task-event-store.ts` to manage workspaces via a new map and integrated save/load persistence in `workspaces.json`.
- **Workspace Creation Flow**: Added `createWorkspaceForTask` generating the initial `workspace.created` event securely tied to `taskId`.
- **Persistence Validation**: Created and successfully ran `workspace_persistence_test.ts` proving a created workspace and its creation event survive an application reload process intact.


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
