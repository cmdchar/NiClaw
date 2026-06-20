# Phase 4.4C - Desktop Persistent Workspace UI

Status: planned
Created: 2026-06-20
Depends on: Phase 4.4B backend workspace model and routes

## Objective

Expose the Persistent Task Workspace in NiClaw Desktop as a real working surface: timeline, command history, artifacts, files touched, patch review, clarifications, observations, and final result.

## Backend Dependencies

Expected endpoints:

- `GET /api/orchestrator/tasks/:taskId/workspace`
- `GET /api/orchestrator/tasks/:taskId/workspace/events`
- `GET /api/orchestrator/tasks/:taskId/workspace/artifacts`
- `POST /api/orchestrator/tasks/:taskId/workspace/files/list`
- `POST /api/orchestrator/tasks/:taskId/workspace/files/read`
- `POST /api/orchestrator/tasks/:taskId/workspace/search`
- `POST /api/orchestrator/tasks/:taskId/workspace/command`
- `POST /api/orchestrator/tasks/:taskId/workspace/observation`
- `POST /api/orchestrator/tasks/:taskId/workspace/patch`

## Files To Add

Preferred:

- `app/src/components/orchestrator/TaskWorkspacePanel.tsx`
- `app/src/components/orchestrator/TaskTimeline.tsx`
- `app/src/components/orchestrator/WorkspaceCommandLog.tsx`
- `app/src/components/orchestrator/WorkspaceArtifacts.tsx`
- `app/src/components/orchestrator/WorkspacePatchReview.tsx`
- `app/src/components/orchestrator/ClarificationCard.tsx`
- `app/src/components/orchestrator/WorkspaceFilesTouched.tsx`

## Tasks

### 4.4C.1 - Read-Only Workspace Panel

- [ ] Add `TaskWorkspacePanel`.
- [ ] Accept `taskId`.
- [ ] Load workspace endpoint.
- [ ] Render task metadata.
- [ ] Render status.
- [ ] Render final result if present.
- [ ] Add loading/error/empty states.

Acceptance:

- [ ] Works with real workspace JSON.
- [ ] No mock data.

### 4.4C.2 - Timeline

- [ ] Add timeline component.
- [ ] Group events by type.
- [ ] Render command started/completed/failed/blocked.
- [ ] Render file read/list/search.
- [ ] Render observation saved.
- [ ] Render patch generated/reviewed/applied.
- [ ] Render clarification requested/answered.

Acceptance:

- [ ] Timeline remains readable with 100+ events.
- [ ] Long payloads are summarized.

### 4.4C.3 - Commands And Logs

- [ ] Add command list.
- [ ] Show command, cwd, exit code, duration.
- [ ] Link stdout/stderr artifacts.
- [ ] Show policy result.
- [ ] Show blocked command reason.

Acceptance:

- [ ] No raw huge output in main UI.
- [ ] Artifacts are referenced, not duplicated.

### 4.4C.4 - Artifacts Panel

- [ ] List artifacts.
- [ ] Show artifact type.
- [ ] Show size/date.
- [ ] Open text artifacts in existing file preview system if possible.
- [ ] Prevent opening sensitive artifact types.

Acceptance:

- [ ] Artifact list renders real files.
- [ ] Missing artifacts degrade gracefully.

### 4.4C.5 - Patch Review Panel

- [ ] Show patch summary.
- [ ] Show files changed.
- [ ] Show risk level.
- [ ] Show policy validation result.
- [ ] Show diff preview.
- [ ] Wire approve/reject/apply to existing safe backend routes.

Acceptance:

- [ ] Patch review is in same task workspace.
- [ ] Existing patch flow still works.

### 4.4C.6 - Clarification Card

- [ ] Show question.
- [ ] Show reason.
- [ ] Show options if present.
- [ ] Allow answer submission.
- [ ] Refresh workspace after submit.

Acceptance:

- [ ] Clarification flow works from workspace UI.

### 4.4C.7 - Validation

- [ ] Run `pnpm run typecheck`.
- [ ] Run `pnpm run build:vite`.
- [ ] Update Brain/TASKS/CHANGELOG.

## Done Definition

- [ ] Desktop can inspect the complete persistent workspace for a task.
- [ ] Timeline, commands, artifacts, patch review, clarification, and final result are visible.
- [ ] No fake UI states.

