# Phase 5.0 - Production Readiness

Status: planned
Created: 2026-06-20
Replaces: `PHASE_5_0_FINAL_QA_ACCEPTANCE.md`

## Objective

Bring NiClaw to a stable production-ready baseline before advanced Agent Operating System phases begin.

Production readiness means Desktop, Android, Host API, Hermes Mesh, SecondBrain, and `vm-niclaw` can run a real end-to-end workflow without mocks, exposed secrets, or undocumented manual steps.

## 5.0.1 - Desktop Runtime Readiness

- [ ] Start NiClaw Desktop from a clean state.
- [ ] Confirm Host API starts and responds.
- [ ] Confirm Remote Access can be enabled.
- [ ] Confirm Settings loads without renderer errors.
- [ ] Confirm Command Center loads real data only.
- [ ] Confirm Orchestrator Workspace loads.
- [ ] Confirm no fatal console errors in normal flows.

## 5.0.2 - Android Runtime Readiness

- [ ] Build Android companion.
- [ ] Install APK on emulator or phone.
- [ ] Set Host API URL.
- [ ] Generate Android pairing code from Desktop.
- [ ] Pair Android device.
- [ ] Test connection.
- [ ] Run Sync Now.
- [ ] Confirm Board, Agents, Tasks, and Workspace state render from real Host API responses.

## 5.0.3 - Task Workspace Readiness

- [ ] Create a task.
- [ ] Confirm workspace is created.
- [ ] Confirm planner event is recorded.
- [ ] Confirm clarification appears when required.
- [ ] Answer clarification.
- [ ] Approve plan.
- [ ] Run safe command.
- [ ] Confirm command event and artifact are persisted.
- [ ] Generate patch.
- [ ] Review patch.
- [ ] Apply or reject patch.
- [ ] Confirm final result and task completion event.

## 5.0.4 - Agent Mesh Readiness

- [ ] Confirm all configured agents report health.
- [ ] Confirm active task events appear in the mesh.
- [ ] Confirm Hermes receives ecosystem context.
- [ ] Ask Telegram Hermes for current NiClaw status.
- [ ] Confirm Telegram answer reflects real system state.
- [ ] Confirm no mesh endpoint exposes protected tokens or secret env names.

## 5.0.5 - Memory Readiness

- [ ] Complete a task.
- [ ] Confirm local Brain is updated.
- [ ] Confirm SecondBrain note or log is updated.
- [ ] Sync memory to `vm-niclaw`.
- [ ] Refresh OpenClaw/OpenHuman memory.
- [ ] Refresh Hermes/GBrain import if configured.
- [ ] Confirm memory update is searchable from the relevant agent path.

## 5.0.6 - VM Runtime Readiness

- [ ] Restart relevant services.
- [ ] Reboot VM if acceptable.
- [ ] Confirm services recover automatically.
- [ ] Confirm Tailscale endpoints work.
- [ ] Confirm mesh health is all green or deviations are documented.
- [ ] Confirm logs do not contain raw secrets.

## 5.0.7 - Build And Release Readiness

- [ ] Run Desktop typecheck.
- [ ] Run Desktop production build.
- [ ] Run Android debug build.
- [ ] Archive artifacts.
- [ ] Generate release notes.
- [ ] Document exact artifact paths.

## 5.0.8 - Security Readiness

- [ ] Run secret scan.
- [ ] Confirm no hardcoded Android tokens.
- [ ] Confirm Host API auth.
- [ ] Confirm dangerous commands require approval or are blocked.
- [ ] Confirm no destructive command can be triggered remotely without policy approval.
- [ ] Confirm renderer/mobile clients cannot access protected server tokens.

## Validation Commands

```powershell
cd C:\Server\niclaw\app
pnpm run typecheck
pnpm run build:vite
```

```powershell
cd C:\Server\niclaw\app\mobile\android-kotlin
.\gradlew.bat assembleDebug
```

```powershell
cd C:\Server\niclaw
git status --short
```

## Production Readiness Checklist

- [ ] Desktop functional.
- [ ] Android functional.
- [ ] Host API secured.
- [ ] Orchestrator task workspace functional.
- [ ] Workspace event store persistent.
- [ ] Patch review functional.
- [ ] Agent Mesh functional.
- [ ] Hermes Telegram aware of ecosystem.
- [ ] SecondBrain memory unified.
- [ ] VM runtime stable.
- [ ] Builds pass.
- [ ] Security audit pass.
- [ ] Brain, Tasks, and Changelog up to date.

## Readiness Report Required

Create a readiness report with:

- files changed;
- endpoints available;
- services running;
- build results;
- Android APK path;
- Desktop artifact path;
- VM service status;
- memory sync status;
- security findings;
- known limitations;
- next maintenance tasks.

## Done Definition

NiClaw is production-ready when every checklist item is complete or explicitly documented as deferred with reason.

