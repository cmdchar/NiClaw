# NiClaw Complete Implementation Roadmap

Status: FROZEN
Created: 2026-06-20
Root: `C:\Server\niclaw`
App: `C:\Server\niclaw\app`

## Goal

Finish NiClaw as an Agent Operating System where Desktop, Android, Host API, Hermes, OpenClaw, SuperHermes, Obsidian/SecondBrain, and `vm-niclaw` operate as one connected system.

Every feature must be backed by real APIs/state. No mocks, no fake fallback data, no disconnected UI.

## Freeze Policy

ROADMAP STATUS = FROZEN.

Do not add phases, reorganize documents, or introduce new architectural paradigms unless one of these conditions appears:

- [ ] real architectural blocker;
- [ ] newly discovered technical constraint;
- [ ] major product direction change.

Default action from this point: execute the roadmap, starting with the 4.4B foundation.

## Current Baseline

Already implemented or partially implemented:

- Native NiClaw Desktop app under `app`.
- Host API under `app/electron/api`.
- Native Kotlin Android companion under `app/mobile/android-kotlin`.
- Dev Command Center phase 1.
- Android Sync repair.
- Secure Android pairing/token bridge.
- Agent Mesh backend through SuperHermes.
- Hermes/OpenHuman/Obsidian/SecondBrain integrations partially deployed on `vm-niclaw`.
- Orchestrator foundation:
  - `task-event-store.ts`
  - `task-orchestrator.ts`
  - `policy-engine.ts`
  - `patch-harvester.ts`
  - `/api/orchestrator/*`

## Phase Order

Execute in this order:

1. `PHASE_4_4A_UNIFIED_ORCHESTRATOR_WORKSPACE.md`
2. `PHASE_4_4B_PERSISTENT_TASK_WORKSPACE.md`
3. `PHASE_4_4C_DESKTOP_WORKSPACE_UI.md`
4. `PHASE_4_4D_ANDROID_WORKSPACE_CONTROL.md`
5. `PHASE_4_5_AGENT_COMMUNICATION_HERMES_MESH.md`
6. `PHASE_4_6_SECOND_BRAIN_MEMORY_UNIFICATION.md`
7. `PHASE_4_7_VM_RUNTIME_DEPLOYMENT_HARDENING.md`
8. `PHASE_4_8_BUILD_RELEASE_PIPELINE.md`
9. `PHASE_4_9_SECURITY_POLICY_AUDIT.md`
10. `PHASE_5_0_PRODUCTION_READINESS.md`
11. `PHASE_5_1_KNOWLEDGE_GRAPH_PROJECT_INTELLIGENCE.md`
12. `PHASE_5_2_MULTI_AGENT_PLANNING_ENGINE.md`
13. `PHASE_5_3_AUTONOMOUS_PROJECT_MODE.md`

## Impact Milestones

Track progress by capability milestones, not only by phase numbers.

### Milestone 1 - NiClaw Workspace OS

Reached after:

- `PHASE_4_4A_UNIFIED_ORCHESTRATOR_WORKSPACE.md`
- `PHASE_4_4B_PERSISTENT_TASK_WORKSPACE.md`
- `PHASE_4_4C_DESKTOP_WORKSPACE_UI.md`

Expected capability: NiClaw has a real unified workspace where tasks, planning, execution, logs, patches, and review live in one persistent working surface.

### Milestone 2 - Connected Agent Ecosystem

Reached after:

- `PHASE_4_5_AGENT_COMMUNICATION_HERMES_MESH.md`
- `PHASE_4_6_SECOND_BRAIN_MEMORY_UNIFICATION.md`

Expected capability: Hermes, Memory, Workspace, Desktop, Android, and `vm-niclaw` share real state and status.

### Milestone 3 - Project Intelligence Platform

Reached after:

- `PHASE_5_1_KNOWLEDGE_GRAPH_PROJECT_INTELLIGENCE.md`
- `PHASE_5_2_MULTI_AGENT_PLANNING_ENGINE.md`

Expected capability: NiClaw can understand project lineage, assign specialized agents, explain changes, and route context based on real provenance.

### Milestone 4 - Autonomous Agent OS

Reached after:

- `PHASE_5_3_AUTONOMOUS_PROJECT_MODE.md`

Expected capability: NiClaw can run bounded autonomous project objectives through planning, task creation, workspace execution, policy gates, patch review, validation, and memory updates.

## Global Rule - Provenance Everywhere

Every persistent object added from Phase 4.4B onward must carry provenance metadata where applicable:

- `createdBy`
- `createdAt`
- `updatedAt`
- `sourceTaskId`
- `sourceWorkspaceId`
- `sourcePatchId`
- `sourceAgentId`
- `sourceDecisionId`
- `sourceEventId`

Rules:

- [ ] Do not create anonymous durable records unless the source is genuinely unknown.
- [ ] If provenance is unknown, store `sourceStatus: "unknown"` with a reason.
- [ ] Preserve provenance when writing Brain, SecondBrain, graph nodes, patches, artifacts, agent assignments, autonomous run steps, and release reports.
- [ ] Expose provenance in read APIs where useful, but never expose protected secrets or raw internal prompts.
- [ ] Knowledge Graph must consume provenance fields instead of relying only on later inference.

## Ownership Rule

Codex should own:

- Backend Host API.
- Orchestrator services.
- Event store.
- Policy engine.
- Workspace kernel.
- VM deployment scripts.
- Build/release validation.
- Brain updates.

Antigravity should own, after backend contracts stabilize:

- Desktop UI panels.
- Android UI/client screens.
- Visual polish.
- Read-only views before mutating flows.

Avoid simultaneous edits to the same files unless explicitly coordinated.

## Global Done Definition

NiClaw is complete when:

- [ ] Desktop can create, inspect, execute, review, and complete tasks through the unified workspace.
- [ ] Android can see the same task state and perform approved controls.
- [ ] All agents report status and activity to Hermes/SuperHermes/NiClaw.
- [ ] Hermes on Telegram is aware of the ecosystem state.
- [ ] Obsidian/SecondBrain records major changes and task outcomes.
- [ ] `vm-niclaw` services start cleanly after reboot.
- [ ] Host API endpoints are token-protected.
- [ ] No protected secrets are exposed to renderer/mobile clients.
- [ ] Windows build passes.
- [ ] Android build passes.
- [ ] VM smoke tests pass.
- [ ] Manual E2E flow passes.
- [ ] Knowledge Graph can explain task, patch, file, decision, agent, and memory relationships.
- [ ] Multi-Agent Planning Engine can assign Planner, Research, Executor, Reviewer, Memory, and Deployment roles.
- [ ] Autonomous Project Mode can run bounded project objectives through task creation, workspace execution, patch review, approvals, and memory updates.

## Global Validation Commands

Desktop:

```powershell
cd C:\Server\niclaw\app
pnpm run typecheck
pnpm run build:vite
```

Android:

```powershell
cd C:\Server\niclaw\app\mobile\android-kotlin
.\gradlew.bat assembleDebug
```

Git/status:

```powershell
cd C:\Server\niclaw
git status --short
```

## Required Brain Updates After Each Phase

Update:

- `app/ai/BRAIN.md`
- `app/ai/TASKS.md`
- `app/ai/CHANGELOG_AI.md`
- optionally `app/ai/BRAINMAP.md`

Each update must include:

- files changed;
- endpoints added/changed;
- validation commands;
- known limitations;
- next phase handoff.

## Strategic Dependency Note

`PHASE_4_4B_PERSISTENT_TASK_WORKSPACE.md` is the foundation for the rest of the roadmap. Do not skip it. Later phases rely on durable workspace events, command artifacts, patch history, decisions, and review notes.
