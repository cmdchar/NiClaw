# Phase 4.4A - Unified Orchestrator Workspace

Status: planned
Created: 2026-06-20

## Objective

Create one Desktop workspace view where the operator can see the active task, chat, planner state, clarifications, agent status, command activity, patches, logs, and approvals without jumping between disconnected screens.

This phase prepares the UI shell and data contract. It does not yet require the full Persistent Task Workspace kernel from 4.4B.

## Existing Inputs

- `/api/orchestrator/workspace`
- `/api/orchestrator/tasks`
- `/api/orchestrator/tasks/:id/events`
- `/api/orchestrator/agents/activity`
- `/api/orchestrator/health`
- `/api/orchestrator/audit`
- `/api/command-center/*`

## Target UI

```txt
Unified Orchestrator Workspace
  Header: health, active task, refresh
  Left: task list / queues
  Center: active task timeline
  Right: agent activity / approvals
  Bottom: logs, artifacts, patch summary
```

## Implementation Tasks

### 4.4A.1 - Inventory Existing UI

- [ ] Inspect `app/src/pages/CommandCenter/index.tsx`.
- [ ] Inspect `app/src/pages/SpatialOS/index.tsx`.
- [ ] Inspect existing stores under `app/src/stores`.
- [ ] Identify whether the workspace view belongs in Command Center, SpatialOS, or a new route.
- [ ] Record chosen route in Brain.

Acceptance:

- [ ] Decision documented.
- [ ] No UI files modified yet.

### 4.4A.2 - Define Frontend Data Contract

- [ ] Define `OrchestratorWorkspaceState`.
- [ ] Define `ActiveTaskViewModel`.
- [ ] Define `AgentActivityCard`.
- [ ] Define `ApprovalQueueItem`.
- [ ] Define `TimelineItem`.
- [ ] Keep types in frontend-local file unless backend shared types already exist.

Preferred file:

- `app/src/types/orchestrator-workspace.ts`

Acceptance:

- [ ] Types compile.
- [ ] No backend dependency imported into renderer directly.

### 4.4A.3 - Add Workspace Shell

Preferred files:

- `app/src/pages/CommandCenter/index.tsx`
- or `app/src/pages/OrchestratorWorkspace/index.tsx`

Tasks:

- [ ] Add shell layout.
- [ ] Add task list panel.
- [ ] Add active task panel.
- [ ] Add agent activity panel.
- [ ] Add logs/patch lower panel.
- [ ] Add refresh control.
- [ ] Add honest empty states.
- [ ] Use existing UI components/style.

Acceptance:

- [ ] Page renders without mock data.
- [ ] No layout overlap at desktop width.
- [ ] Typecheck passes.

### 4.4A.4 - Connect Existing APIs

Tasks:

- [ ] Load `/api/orchestrator/workspace`.
- [ ] Load `/api/orchestrator/tasks`.
- [ ] Load `/api/orchestrator/agents/activity`.
- [ ] Load events for selected task.
- [ ] Show waiting clarifications.
- [ ] Show waiting patch reviews.
- [ ] Show waiting commits.
- [ ] Handle loading/error states.

Acceptance:

- [ ] UI uses real API responses only.
- [ ] Empty state is honest if no tasks exist.

### 4.4A.5 - Approval Actions

Only wire actions already supported by backend:

- [ ] Approve task.
- [ ] Answer clarification.
- [ ] Apply patch.
- [ ] Reject patch.
- [ ] Stop task.

Routes:

- `POST /api/orchestrator/tasks/:id/approve`
- `POST /api/orchestrator/tasks/:id/clarify`
- `POST /api/orchestrator/tasks/:id/apply-patch`
- `POST /api/orchestrator/tasks/:id/reject-patch`
- `POST /api/orchestrator/tasks/:id/stop`

Acceptance:

- [ ] Actions refresh workspace state after completion.
- [ ] Errors are visible.
- [ ] No destructive action is hidden behind a generic button.

### 4.4A.6 - Validation

- [ ] Run `pnpm run typecheck`.
- [ ] Run `pnpm run build:vite`.
- [ ] Update Brain/TASKS/CHANGELOG.

## Done Definition

- [ ] Operator has one real workspace screen for orchestrator state.
- [ ] Existing backend APIs feed it.
- [ ] Existing approval routes are usable.
- [ ] No new backend kernel required yet.

