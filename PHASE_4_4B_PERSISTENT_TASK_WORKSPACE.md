# Phase 4.4B - Persistent Task Workspace

Status: planned
Created: 2026-06-20
Scope: NiClaw app under `C:\Server\niclaw\app`

## Objective

Implement a persistent, inspectable workspace for each orchestrator task.

NiClaw must stop treating a task as a loose sequence of commands. Every task should become a durable workspace containing chat, plan, clarifications, execution steps, commands, logs, files touched, patches, decisions, review notes, artifacts, and final result.

This phase extends the existing orchestrator stack. Do not replace:

- `electron/services/orchestrator/task-event-store.ts`
- `electron/services/orchestrator/task-orchestrator.ts`
- `electron/services/orchestrator/policy-engine.ts`
- `electron/services/orchestrator/patch-harvester.ts`
- `electron/api/routes/orchestrator.ts`

## Existing Foundation

Already present in latest repo:

- Host API route group: `electron/api/routes/orchestrator.ts`
- Task store: `electron/services/orchestrator/task-event-store.ts`
- Orchestrator: `electron/services/orchestrator/task-orchestrator.ts`
- Policy engine: `electron/services/orchestrator/policy-engine.ts`
- Patch harvester: `electron/services/orchestrator/patch-harvester.ts`
- Project discovery/workspace services
- Codex/Hermes/OpenClaw/Remote Claude adapters
- Existing task endpoints under `/api/orchestrator/tasks`

This means Phase 4.4B is an extension, not a rewrite.

## Non-Negotiable Rules

- No mock data.
- No duplicate task/event store.
- No separate app.
- No destructive commands without Policy Engine.
- No direct command execution from UI.
- No secrets in logs, artifacts, events, or UI.
- No `.env`, key, credential, token, pem, private key reads unless explicitly approved.
- Preserve existing Android/Desktop functionality.
- Update Brain/TASKS/CHANGELOG after implementation.
- Run build/typecheck after each meaningful backend/UI slice.

## Data Model Target

### New Types

Add these types either in:

- `app/electron/services/orchestrator/workspace-types.ts`

or, if cleaner with existing code:

- `app/electron/services/orchestrator/types.ts`

Required types:

- `TaskWorkspace`
- `WorkspaceEvent`
- `WorkspaceCommand`
- `WorkspaceArtifact`
- `WorkspacePatch`
- `WorkspaceObservation`
- `WorkspaceFileReference`
- `WorkspaceDecision`
- `WorkspaceReviewNote`
- `WorkspaceClarification`

### Provenance Seed

Every new workspace type should include provenance fields where applicable:

- [ ] `createdBy`
- [ ] `createdAt`
- [ ] `updatedAt`
- [ ] `sourceTaskId`
- [ ] `sourceWorkspaceId`
- [ ] `sourcePatchId`
- [ ] `sourceAgentId`
- [ ] `sourceDecisionId`
- [ ] `sourceEventId`

Rules:

- [ ] Preserve provenance when events create commands, artifacts, patches, decisions, review notes, or clarifications.
- [ ] Use `sourceStatus: "unknown"` plus a reason only when the source cannot be determined.
- [ ] Do not expose protected secrets through provenance metadata.

### Persistent Layout

Use the existing command-center data root from `getDataDir()`:

```txt
command-center/
  tasks.json
  events/
    <taskId>.json
  reports/
  patches/
  workspaces/
    <taskId>/
      workspace.json
      artifacts/
      commands/
      patches/
      logs/
```

## Workspace Event Taxonomy

Extend, do not break, existing `TaskEvent` usage.

Add workspace event names:

```txt
workspace.created
workspace.observation.saved
workspace.file.listed
workspace.file.read
workspace.search.completed
workspace.command.requested
workspace.command.policy_checked
workspace.command.started
workspace.command.completed
workspace.command.blocked
workspace.command.failed
workspace.artifact.created
workspace.patch.generated
workspace.patch.review_requested
workspace.patch.approved
workspace.patch.rejected
workspace.patch.applied
workspace.review.note_added
```

Keep compatibility with existing events:

```txt
plan_generated
execution_started
execution_completed
diff_generated
patch_proposal_generated
approval_request
intent_ambiguous
status_change
error
```

## Implementation Tasks

## Sprint Execution Plan

Execute Phase 4.4B in three strict sprint slices. Do not start `PHASE_4_4C_DESKTOP_WORKSPACE_UI.md` until Sprint 3 is complete and backend contracts are stable.

### Sprint 1 - Persistent Workspace Foundation

Includes:

- `4.4B.1 - Workspace Types`
- `4.4B.2 - TaskEventStore Extension`

Objective:

- [ ] `workspace.json` exists for each task workspace.
- [ ] `workspace.created` event exists.
- [ ] Workspace persistence survives reload.
- [ ] Provenance fields exist on persistent workspace objects.
- [ ] Legacy tasks without workspaces still load.

Validation:

- [ ] Create a task.
- [ ] Confirm workspace directory exists under `command-center/workspaces/<taskId>`.
- [ ] Confirm `workspace.json` exists.
- [ ] Confirm event store records `workspace.created`.
- [ ] Restart/reload and confirm workspace still loads.
- [ ] Run Desktop typecheck.

### Sprint 2 - Workspace Kernel And Policy Surface

Includes:

- `4.4B.3 - Workspace Kernel MVP`
- `4.4B.4 - Host API Routes`
- `4.4B.6 - Policy Integration`

Objective:

- [ ] `read` works through Workspace Kernel.
- [ ] `list` works through Workspace Kernel.
- [ ] `search` works through Workspace Kernel.
- [ ] `runCommand` works only through Policy Engine.
- [ ] Artifacts are persisted.
- [ ] Blocked commands emit durable events.
- [ ] No direct UI command execution exists.

Validation:

- [ ] List files in an allowed project path.
- [ ] Read an allowed file.
- [ ] Search allowed files.
- [ ] Run one safe command.
- [ ] Attempt one dangerous command and confirm policy block.
- [ ] Confirm command artifacts/events are persisted.
- [ ] Run Desktop typecheck.

### Sprint 3 - Orchestrator And Patch Loop

Includes:

- `4.4B.5 - Orchestrator Integration`
- `4.4B.8 - Patch Integration`

Objective:

- [ ] Task creates workspace automatically.
- [ ] Orchestrator steps write workspace events.
- [ ] Patch generation writes workspace patch record.
- [ ] Review request writes review event.
- [ ] Patch approval/rejection is persisted.
- [ ] Task to Workspace to Events to Patch to Review flow works end-to-end.

Validation:

- [ ] Create task.
- [ ] Generate plan.
- [ ] Execute one safe workspace action.
- [ ] Generate patch.
- [ ] Request review.
- [ ] Approve or reject patch.
- [ ] Confirm full timeline is persisted.
- [ ] Run Desktop typecheck and Vite build.

### 4.4B.1 - Workspace Types

Owner: Codex

Files:

- `app/electron/services/orchestrator/workspace-types.ts`
- optionally `app/electron/services/orchestrator/types.ts`

Tasks:

- [ ] Add `TaskWorkspace`.
- [ ] Add `WorkspaceEvent`.
- [ ] Add `WorkspaceCommand`.
- [ ] Add `WorkspaceArtifact`.
- [ ] Add `WorkspacePatch`.
- [ ] Add `WorkspaceObservation`.
- [ ] Add `WorkspaceFileReference`.
- [ ] Add `WorkspaceDecision`.
- [ ] Add `WorkspaceReviewNote`.
- [ ] Add `WorkspaceClarification`.
- [ ] Add shared provenance metadata fields for persistent workspace objects.
- [ ] Ensure types support JSON persistence.
- [ ] Ensure no renderer-only/browser types leak into Electron services.

Acceptance:

- [ ] Typecheck passes.
- [ ] No existing orchestrator type usage breaks.

### 4.4B.2 - TaskEventStore Extension

Owner: Codex

Files:

- `app/electron/services/orchestrator/task-event-store.ts`

Tasks:

- [ ] Add workspace directory initialization: `command-center/workspaces`.
- [ ] Add `createWorkspace(taskId, projectId, projectPath)`.
- [ ] Add `getWorkspace(taskId)`.
- [ ] Add `saveWorkspace(taskId, workspace)`.
- [ ] Add `addWorkspaceEvent(taskId, eventType, message, data?)`.
- [ ] Add `saveWorkspaceArtifact(taskId, artifact)`.
- [ ] Add safe JSON write using existing `safeWrite`.
- [ ] Ensure workspace creation is idempotent.
- [ ] Ensure legacy tasks without workspace still load.

Acceptance:

- [ ] Creating a task can create a workspace.
- [ ] Reloading app preserves workspace JSON.
- [ ] Existing `tasks.json` remains backward compatible.

### 4.4B.3 - Workspace Kernel MVP

Owner: Codex

New file:

- `app/electron/services/orchestrator/workspace-kernel.ts`

Dependencies:

- `task-event-store.ts`
- `policy-engine.ts`
- `project-discovery-service.ts`
- Node `fs/promises`
- Node `child_process`

Supported actions:

- [ ] `createWorkspace(taskId)`
- [ ] `getWorkspace(taskId)`
- [ ] `listFiles(taskId, relativePath)`
- [ ] `readFile(taskId, relativePath)`
- [ ] `search(taskId, query, glob?)`
- [ ] `runCommand(taskId, command, cwd?)`
- [ ] `inspectGitDiff(taskId)`
- [ ] `saveObservation(taskId, observation)`
- [ ] `saveArtifact(taskId, artifact)`
- [ ] `createPatchRecord(taskId, patch)`

Safety:

- [ ] Resolve target project path from task/project discovery.
- [ ] Block path traversal.
- [ ] Block reads outside project root.
- [ ] Block secret-like files by default.
- [ ] Run `PolicyEngine.validateCommand` before command execution.
- [ ] Emit `workspace.command.blocked` when policy blocks.
- [ ] Capture stdout/stderr as artifacts.
- [ ] Truncate huge outputs in event payloads.
- [ ] Store full output in artifact files.
- [ ] Redact token/secret patterns before writing event summaries.

Acceptance:

- [ ] Safe file list works.
- [ ] Safe file read works.
- [ ] Search works.
- [ ] Safe command produces event + stdout/stderr artifact.
- [ ] Forbidden command is blocked and persisted as event.

### 4.4B.4 - Host API Routes

Owner: Codex

File:

- `app/electron/api/routes/orchestrator.ts`

Add routes under existing orchestrator task path:

```txt
GET  /api/orchestrator/tasks/:taskId/workspace
GET  /api/orchestrator/tasks/:taskId/workspace/events
GET  /api/orchestrator/tasks/:taskId/workspace/artifacts
POST /api/orchestrator/tasks/:taskId/workspace/files/list
POST /api/orchestrator/tasks/:taskId/workspace/files/read
POST /api/orchestrator/tasks/:taskId/workspace/search
POST /api/orchestrator/tasks/:taskId/workspace/command
POST /api/orchestrator/tasks/:taskId/workspace/observation
POST /api/orchestrator/tasks/:taskId/workspace/patch
```

Tasks:

- [ ] Reuse existing Host API auth gate.
- [ ] Reuse `requireJsonContentType` for mutating POSTs.
- [ ] Return structured JSON only.
- [ ] Do not stream raw command output directly.
- [ ] Return artifact references for large outputs.
- [ ] Return 404 for missing task/workspace.
- [ ] Return 403 for policy/path violations.

Acceptance:

- [ ] Routes compile.
- [ ] Routes do not conflict with existing task route regex.
- [ ] Typecheck passes.

### 4.4B.5 - TaskOrchestrator Integration

Owner: Codex

File:

- `app/electron/services/orchestrator/task-orchestrator.ts`

Tasks:

- [ ] On `submitTask`, create workspace immediately.
- [ ] On project discovery, update workspace project metadata.
- [ ] On plan generation, persist plan in workspace.
- [ ] Emit `workspace.created`.
- [ ] Emit `workspace.observation.saved` for discovered context.
- [ ] Emit workspace command events around CLI adapter execution.
- [ ] Attach changed files to workspace `filesTouched`.
- [ ] Attach patch proposal to workspace patches.
- [ ] Keep existing old events for compatibility.

Acceptance:

- [ ] Existing task create/approve flow still works.
- [ ] Workspace timeline has meaningful events.
- [ ] Patch harvesting still works.
- [ ] Policy violation still blocks task.

### 4.4B.6 - Policy Engine Classification

Owner: Codex

File:

- `app/electron/services/orchestrator/policy-engine.ts`

Tasks:

- [ ] Add `classifyWorkspaceAction(action)`.
- [ ] Add action levels:
  - `safe`
  - `medium`
  - `dangerous`
  - `blocked`
- [ ] Map file reads/lists/searches as safe unless path is sensitive.
- [ ] Map test/build commands as medium.
- [ ] Map package installs, file writes, env changes as dangerous.
- [ ] Map destructive commands as blocked.
- [ ] Map git push/deploy as blocked.
- [ ] Return explanation for every non-safe classification.

Acceptance:

- [ ] `npm test` or `pnpm run typecheck` classifies as medium/allowed.
- [ ] `git reset --hard` classifies as blocked.
- [ ] `.env` read/write is blocked unless explicit future approval flow exists.

### 4.4B.7 - Desktop Workspace Timeline UI

Owner: Antigravity or Codex, but not both on same files at once.

Preferred files:

- `app/src/components/orchestrator/TaskWorkspacePanel.tsx`
- `app/src/components/orchestrator/TaskTimeline.tsx`
- `app/src/components/orchestrator/WorkspaceCommandLog.tsx`
- `app/src/components/orchestrator/WorkspaceArtifacts.tsx`
- `app/src/components/orchestrator/WorkspacePatchReview.tsx`
- `app/src/components/orchestrator/ClarificationCard.tsx`

Possible integration file:

- `app/src/pages/CommandCenter/index.tsx`

Tasks:

- [ ] Add task detail panel.
- [ ] Load `GET /api/orchestrator/tasks/:taskId/workspace`.
- [ ] Show timeline.
- [ ] Show command cards.
- [ ] Show artifact list.
- [ ] Show files touched.
- [ ] Show clarification card if present.
- [ ] Show patch review state if present.
- [ ] Add refresh button.
- [ ] No mock states.

Acceptance:

- [ ] Existing Command Center still loads.
- [ ] Empty workspace displays honest empty state.
- [ ] Real workspace events render as timeline items.

### 4.4B.8 - Patch Review In Workspace

Owner: Codex

Files:

- `app/electron/services/orchestrator/patch-harvester.ts`
- `app/electron/services/orchestrator/task-orchestrator.ts`
- `app/electron/services/orchestrator/workspace-kernel.ts`
- Desktop UI component from 4.4B.7

Tasks:

- [ ] Link patch proposal to workspace.
- [ ] Store patch metadata in `workspaces/<taskId>/patches`.
- [ ] Emit `workspace.patch.generated`.
- [ ] Emit `workspace.patch.review_requested`.
- [ ] Emit approve/reject/apply events.
- [ ] UI reads patch from workspace first, old route as fallback only if needed.

Acceptance:

- [ ] Patch appears in workspace timeline.
- [ ] Patch approval still uses existing safe apply/commit flows.

### 4.4B.9 - Android Read-Only Workspace View

Owner: Antigravity preferred, after backend stabilizes.

Files:

- `app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt`
- new or existing Android task/workspace fragment

Tasks:

- [ ] Add API methods for workspace fetch.
- [ ] Show active task.
- [ ] Show timeline.
- [ ] Show command status.
- [ ] Show clarification status.
- [ ] Show patch status.
- [ ] No write/approve actions in first Android slice.

Acceptance:

- [ ] Android build passes.
- [ ] Android displays same workspace state as Desktop.

### 4.4B.10 - Android Actions

Owner: Antigravity or Codex, after 4.4B.9.

Tasks:

- [ ] Add clarify response action.
- [ ] Add approve patch action.
- [ ] Add reject patch action.
- [ ] Add sync/refresh action.
- [ ] Add loading/error states.
- [ ] Do not expose tokens.

Acceptance:

- [ ] Android can answer clarification.
- [ ] Android can approve/reject patch through Host API.
- [ ] Desktop timeline updates after Android action.

### 4.4B.11 - Tests And Validation

Owner: Codex

Commands:

```powershell
cd C:\Server\niclaw\app
pnpm run typecheck
pnpm run build:vite
```

If Android touched:

```powershell
cd C:\Server\niclaw\app\mobile\android-kotlin
.\gradlew.bat assembleDebug
```

Manual test:

- [ ] Create orchestrator task.
- [ ] Confirm workspace folder created.
- [ ] Confirm `workspace.created` event exists.
- [ ] Run file list.
- [ ] Run file read.
- [ ] Run search.
- [ ] Run safe command.
- [ ] Confirm stdout/stderr artifacts exist.
- [ ] Run forbidden command and confirm blocked event.
- [ ] Generate patch proposal.
- [ ] Confirm patch appears in workspace.
- [ ] Approve/reject patch through existing flow.
- [ ] Confirm UI timeline updates.

### 4.4B.12 - Brain And Documentation

Owner: Codex

Files:

- `app/ai/BRAIN.md`
- `app/ai/TASKS.md`
- `app/ai/CHANGELOG_AI.md`
- optionally `app/ai/BRAINMAP.md`

Tasks:

- [ ] Add implementation summary.
- [ ] Add endpoints created.
- [ ] Add validation commands and results.
- [ ] Add known limitations.
- [ ] Add next steps for Android/Desktop continuation.

## Coordination Plan

### Codex Owns

- Backend types.
- TaskEventStore extension.
- Workspace Kernel.
- Host API routes.
- Policy integration.
- Orchestrator integration.
- Validation.
- Brain updates.

### Antigravity Owns

Only after backend endpoints are stable:

- Desktop timeline UI, if assigned.
- Android workspace read-only UI.
- Android approve/clarify actions.

### Files Antigravity Should Avoid Until Backend Stabilizes

- `app/electron/services/orchestrator/task-event-store.ts`
- `app/electron/services/orchestrator/task-orchestrator.ts`
- `app/electron/services/orchestrator/policy-engine.ts`
- `app/electron/services/orchestrator/workspace-kernel.ts`
- `app/electron/services/orchestrator/workspace-types.ts`
- `app/electron/api/routes/orchestrator.ts`

## Prompt For Antigravity

Use this only after Codex completes 4.4B.1 through 4.4B.6.

```txt
You are working in C:\Server\niclaw\app.

Implement the UI/client side for Phase 4.4B Persistent Task Workspace.

Do not modify backend orchestrator files unless explicitly asked.
Do not create mock data.
Do not create a separate app.
Use existing NiClaw design patterns.

Backend endpoints are expected under:
- GET /api/orchestrator/tasks/:taskId/workspace
- GET /api/orchestrator/tasks/:taskId/workspace/events
- GET /api/orchestrator/tasks/:taskId/workspace/artifacts

Your scope:
1. Inspect current Command Center / orchestrator UI safely.
2. Add a task detail workspace panel.
3. Render real timeline events.
4. Render real command/artifact/patch sections.
5. Add loading/error/empty states.
6. If working Android, add read-only workspace view first.

Do not touch:
- electron/services/orchestrator/task-event-store.ts
- electron/services/orchestrator/task-orchestrator.ts
- electron/services/orchestrator/policy-engine.ts
- electron/api/routes/orchestrator.ts

Run:
- pnpm run typecheck
- pnpm run build:vite

If Android files are touched:
- .\gradlew.bat assembleDebug from mobile/android-kotlin

Update the relevant Brain/TASKS note with what changed.
```

## Known Risks

- Existing orchestrator route has a broad task route regex. New workspace routes must be placed carefully to avoid accidental matching.
- Existing event type union is narrow. Extending it incorrectly can break typecheck.
- Command execution must not bypass Policy Engine.
- Large stdout/stderr must be artifact files, not event payloads.
- Android should be read-only first to avoid unsafe remote approvals before the backend model stabilizes.

## Done Definition

Phase 4.4B is done when:

- [ ] Every orchestrator task has a persistent workspace.
- [ ] Workspace events survive app restart.
- [ ] Commands produce structured events and artifacts.
- [ ] Policy Engine gates command execution.
- [ ] Patch review is linked to workspace.
- [ ] Desktop can inspect task workspace timeline.
- [ ] Android can at least read workspace state.
- [ ] Builds pass.
- [ ] Brain/TASKS/CHANGELOG are updated.
