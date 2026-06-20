# Phase 4.4D - Android Workspace Control

Status: planned
Created: 2026-06-20
Depends on: Phase 4.4B and 4.4C

## Objective

Android companion must display and control the same Persistent Task Workspace state as Desktop, through the secured Host API pairing flow.

## Existing Android Baseline

- Native Kotlin app: `app/mobile/android-kotlin`
- `ApiClient.kt` supports Host API URL and Android pairing token.
- Android Sync screen exists.
- Host API Android pairing exists.

## Implementation Order

Read-only first. Mutating approvals second.

## Tasks

### 4.4D.1 - Android API Client Methods

File:

- `app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt`

Add:

- [ ] `getOrchestratorTasks`
- [ ] `getTaskWorkspace`
- [ ] `getTaskWorkspaceEvents`
- [ ] `getTaskWorkspaceArtifacts`
- [ ] `answerTaskClarification`
- [ ] `approveTask`
- [ ] `applyTaskPatch`
- [ ] `rejectTaskPatch`
- [ ] `stopTask`

Acceptance:

- [ ] Uses existing `buildRequest`.
- [ ] Uses bearer token only.
- [ ] No query token.

### 4.4D.2 - Android Workspace Fragment Read-Only

New files:

- `AndroidWorkspaceFragment.kt`
- `fragment_android_workspace.xml`

Tasks:

- [ ] Add task list.
- [ ] Add selected task status.
- [ ] Add timeline.
- [ ] Add commands summary.
- [ ] Add artifacts summary.
- [ ] Add patch status.
- [ ] Add refresh button.
- [ ] Add loading/error states.

Acceptance:

- [ ] Android can display the same active task state as Desktop.
- [ ] Android build passes.

### 4.4D.3 - Android Clarification Actions

- [ ] Render clarification question.
- [ ] Render options.
- [ ] Submit answer.
- [ ] Refresh task workspace after submit.

Acceptance:

- [ ] Desktop timeline updates after Android answer.

### 4.4D.4 - Android Patch Review Actions

- [ ] Show patch summary.
- [ ] Show risk level.
- [ ] Show files changed.
- [ ] Approve apply patch.
- [ ] Reject patch.
- [ ] Show confirmation for mutating actions.

Acceptance:

- [ ] Android can approve/reject patch through Host API.
- [ ] No destructive command can be triggered directly from Android.

### 4.4D.5 - Android Command Visibility

- [ ] Show command status.
- [ ] Show exit code.
- [ ] Show summary.
- [ ] Do not show full huge logs.
- [ ] Link artifact summary if available.

Acceptance:

- [ ] Timeline remains usable on small screens.

### 4.4D.6 - Navigation

- [ ] Add entry from Settings or Android Sync.
- [ ] Avoid bottom nav overflow.
- [ ] Preserve existing Command Center/Governance navigation.

Acceptance:

- [ ] Android build passes.
- [ ] Existing fragments still compile.

### 4.4D.7 - Validation

Commands:

```powershell
cd C:\Server\niclaw\app\mobile\android-kotlin
.\gradlew.bat assembleDebug
```

If Desktop touched:

```powershell
cd C:\Server\niclaw\app
pnpm run typecheck
pnpm run build:vite
```

Manual:

- [ ] Pair Android.
- [ ] Open workspace screen.
- [ ] See active task.
- [ ] See timeline.
- [ ] Answer clarification.
- [ ] Approve/reject patch.
- [ ] Confirm Desktop updates.

## Done Definition

- [ ] Android is a real control surface for persistent task workspace.
- [ ] Read-only state and safe approvals work.
- [ ] No exposed secrets.

