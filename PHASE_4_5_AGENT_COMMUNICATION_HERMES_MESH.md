# Phase 4.5 - Agent Communication, Hermes Awareness, And Mesh Reporting

Status: partial (v1 complete)
Created: 2026-06-20

## Objective

All agents must communicate status and activity to Hermes/SuperHermes/NiClaw. When the user talks to Hermes on Telegram, Hermes must be aware of the ecosystem: active tasks, agent status, workspace events, Android sync state, Desktop state, SecondBrain status, and VM runtime health.

## Existing Baseline

- SuperHermes mesh endpoints exist.
- Agent Mesh UI exists/partially exists.
- Hermes dashboard exists on `vm-niclaw`.
- Telegram context consumes mesh in some form.
- NiClaw Host API bridge to mesh was secured.
- Android Sync endpoints exist.

## Target Architecture

```txt
Agent / Tool / Desktop / Android
  -> Host API / SuperHermes API
  -> Mesh Event Store
  -> Hermes Context Provider
  -> Telegram Hermes
```

## Tasks

### 4.5.1 - Mesh Contract Audit

- [ ] Inspect SuperHermes API source on `vm-niclaw`.
- [ ] List existing endpoints.
- [ ] List event schema.
- [ ] List auth rules.
- [ ] Verify `niclaw-host-api` status.
- [ ] Verify Hermes dashboard status.
- [ ] Verify OpenHuman status.
- [ ] Verify OpenClaw status.

Acceptance:

- [ ] Written endpoint/event contract in Brain or root doc.

### 4.5.2 - Agent Status Event Schema

Define event types:

- [ ] `agent.status`
- [ ] `agent.task.started`
- [ ] `agent.task.progress`
- [ ] `agent.task.completed`
- [ ] `agent.task.failed`
- [ ] `agent.workspace.event`
- [ ] `agent.memory.updated`
- [ ] `agent.approval.required`
- [ ] `agent.patch.ready`

Acceptance:

- [ ] Schema is JSON and documented.
- [ ] No secrets in event payload.

### 4.5.3 - NiClaw Host API Mesh Publisher

Files likely:

- `app/electron/api/routes/agent-mesh.ts`
- new `app/electron/services/mesh-publisher.ts`

Tasks:

- [ ] Add server-side mesh publisher.
- [ ] Publish orchestrator task events to mesh.
- [ ] Publish workspace command events to mesh.
- [ ] Publish patch review events to mesh.
- [ ] Publish Android pairing/sync state summaries.
- [ ] Retry safely on mesh unavailable.
- [ ] Do not block local task execution on mesh failure.

Acceptance:

- [ ] Mesh receives real NiClaw task status events.

### 4.5.4 - Hermes Context Provider

On `vm-niclaw`:

- [x] Add context endpoint or context assembler for Hermes.
- [x] Include active tasks.
- [x] Include recent workspace events.
- [x] Include agent health.
- [x] Include memory sync status.
- [x] Include Android sync devices.
- [x] Include current blocked approvals.

Acceptance:

- [ ] Telegram Hermes can answer "what is happening in NiClaw?" from real state.

### 4.5.5 - Desktop Agent Activity Cards

- [ ] Render mesh events in Desktop.
- [ ] Show active agent cards.
- [ ] Show last action.
- [ ] Show current task.
- [ ] Show blocked/approval state.

Acceptance:

- [ ] Agent activity is understandable without raw logs.

### 4.5.6 - Android Agent Activity

- [ ] Extend Android agents/status screen to show mesh summary.
- [ ] Show active task status.
- [ ] Show blocked approvals.

Acceptance:

- [ ] Android sees same mesh state.

### 4.5.7 - Validation

- [ ] Host API typecheck/build.
- [ ] SuperHermes service restart on VM.
- [ ] Mesh endpoint smoke.
- [ ] Telegram Hermes context smoke.
- [ ] Android build if touched.

## Done Definition

- [ ] All major NiClaw agents report status/events.
- [ ] Hermes on Telegram has real ecosystem awareness.
- [ ] Desktop and Android show same activity state.

