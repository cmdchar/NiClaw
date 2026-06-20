# Phase 4.6 - SecondBrain And Memory Unification

Status: planned
Created: 2026-06-20

## Objective

Make Obsidian/SecondBrain the shared memory layer for NiClaw, Hermes, OpenClaw, OpenHuman, Android, and Codex/Antigravity implementation records.

Every meaningful system change, task completion, agent decision, and deployment should be written into memory in a consistent way.

## Existing Baseline

- Obsidian routes exist.
- SecondBrain mirror to `vm-niclaw` exists historically.
- OpenClaw workspace memory exists.
- Hermes/GBrain memory import exists historically.
- Brain files exist under `app/ai`.

## Target Memory Surfaces

```txt
C:\Server\niclaw\app\ai\
vm-niclaw:/home/debian/secondBrain
vm-niclaw:/home/debian/.openclaw/workspace/memory
vm-niclaw:/home/debian/.openclaw/workspace-openhuman/memory
Hermes/GBrain import
```

## Tasks

### 4.6.1 - Memory Path Audit

- [ ] Identify local Obsidian vault path.
- [ ] Identify VM `secondBrain` path.
- [ ] Identify OpenClaw memory path.
- [ ] Identify OpenHuman memory path.
- [ ] Identify Hermes/GBrain import path.
- [ ] Document all paths.

Acceptance:

- [ ] No assumptions remain about memory locations.

### 4.6.2 - Memory Event Contract

Define memory records:

- [ ] `implementation_log`
- [ ] `task_summary`
- [ ] `decision`
- [ ] `deployment`
- [ ] `agent_activity`
- [ ] `incident`
- [ ] `runbook`

Acceptance:

- [ ] Consistent markdown frontmatter or JSON metadata.

### 4.6.3 - NiClaw Memory Writer

Files likely:

- `app/electron/services/memory-writer.ts`
- `app/electron/api/routes/obsidian.ts`

Tasks:

- [ ] Add safe write endpoint for implementation logs.
- [ ] Add task completion memory writer.
- [ ] Add deployment result memory writer.
- [ ] Add agent decision memory writer.
- [ ] Block path traversal.
- [ ] Avoid secrets.

Acceptance:

- [ ] Task completion can create/update a SecondBrain note.

### 4.6.4 - Sync Local To VM

- [ ] Locate existing sync script.
- [ ] Verify it still works.
- [ ] Add manual Host API trigger if safe.
- [ ] Add status endpoint.
- [ ] Add last sync timestamp.

Acceptance:

- [ ] Local memory reaches `vm-niclaw:/home/debian/secondBrain`.

### 4.6.5 - OpenClaw/OpenHuman Memory Refresh

- [ ] Verify memory core sync to OpenClaw workspace.
- [ ] Verify memory core sync to OpenHuman workspace.
- [ ] Verify index refresh command.
- [ ] Verify no huge vault indexing.

Acceptance:

- [ ] OpenClaw/OpenHuman memory indexes are clean after sync.

### 4.6.6 - Hermes/GBrain Import

- [ ] Verify import service/hook.
- [ ] Trigger import after memory sync.
- [ ] Record import result.

Acceptance:

- [ ] Hermes sees updated memory after sync.

### 4.6.7 - UI Status

- [ ] Desktop shows memory sync status.
- [ ] Android shows memory sync status.
- [ ] Mesh reports memory status.

Acceptance:

- [ ] User can see whether brain is current.

## Done Definition

- [ ] One shared brain is operational.
- [ ] Changes are logged automatically.
- [ ] VM memory, OpenClaw memory, OpenHuman memory, and Hermes memory are synchronized.

