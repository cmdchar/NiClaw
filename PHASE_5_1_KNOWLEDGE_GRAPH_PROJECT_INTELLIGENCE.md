# Phase 5.1 - Knowledge Graph And Project Intelligence

Status: planned
Created: 2026-06-20
Depends on: Phase 4.4B, Phase 4.6, Phase 5.0

## Objective

Build a real project intelligence layer over NiClaw so the system can explain relationships between tasks, patches, files, decisions, agents, workspace events, and memory notes.

NiClaw must be able to answer:

- why an endpoint exists;
- which task introduced a file;
- when a file last changed through NiClaw;
- which patch produced a modification;
- which agent made or reviewed a decision;
- which memory note documents the outcome.

## 5.1.0 - Provenance Contract

Knowledge Graph must treat provenance metadata as first-class input.

Every graphable object should preserve:

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

- [ ] Prefer explicit provenance fields over inferred relationships.
- [ ] Use inference only when explicit provenance is missing.
- [ ] Mark inferred edges as `confidence: "inferred"`.
- [ ] Mark explicit provenance edges as `confidence: "proven"`.
- [ ] Store the reason when provenance is unknown.
- [ ] Never store raw secrets, tokens, or full internal prompts as provenance.

## 5.1.1 - Graph Domain Model

Add graph node types:

- [ ] `TaskNode`
- [ ] `WorkspaceNode`
- [ ] `WorkspaceEventNode`
- [ ] `PatchNode`
- [ ] `FileNode`
- [ ] `DecisionNode`
- [ ] `AgentNode`
- [ ] `MemoryNoteNode`
- [ ] `EndpointNode`
- [ ] `BuildArtifactNode`

Add graph edge types:

- [ ] `TASK_CREATED_WORKSPACE`
- [ ] `WORKSPACE_EMITTED_EVENT`
- [ ] `TASK_PRODUCED_PATCH`
- [ ] `PATCH_TOUCHED_FILE`
- [ ] `TASK_RECORDED_DECISION`
- [ ] `AGENT_EXECUTED_STEP`
- [ ] `AGENT_REVIEWED_PATCH`
- [ ] `TASK_UPDATED_MEMORY`
- [ ] `FILE_EXPOSES_ENDPOINT`
- [ ] `BUILD_INCLUDED_ARTIFACT`

## 5.1.2 - Graph Storage

- [ ] Choose initial storage path compatible with Electron Host API.
- [ ] Prefer appendable JSONL plus indexed JSON snapshots for MVP.
- [ ] Keep graph storage local-first.
- [ ] Add migration/version metadata.
- [ ] Do not require a heavy external graph database for MVP.
- [ ] Leave optional adapter boundary for later Graphify or graph database integration.

Suggested files:

- `app/electron/services/project-graph/types.ts`
- `app/electron/services/project-graph/project-graph-store.ts`
- `app/electron/services/project-graph/project-graph-indexer.ts`
- `app/electron/services/project-graph/project-graph-query.ts`

## 5.1.3 - Indexers

Implement indexers from real sources:

- [ ] TaskEventStore events.
- [ ] Workspace events.
- [ ] Patch history.
- [ ] Files touched records.
- [ ] Decision records.
- [ ] Agent activity events.
- [ ] SecondBrain notes.
- [ ] Command Center project scans.
- [ ] Host API route registry where practical.

No mock graph edges are allowed. Missing data must be represented as missing.

## 5.1.4 - Query API

Add Host API endpoints:

- [ ] `GET /api/project-graph/status`
- [ ] `POST /api/project-graph/reindex`
- [ ] `GET /api/project-graph/nodes/:id`
- [ ] `GET /api/project-graph/related/:id`
- [ ] `GET /api/project-graph/file?path=...`
- [ ] `GET /api/project-graph/task/:taskId`
- [ ] `POST /api/project-graph/search`
- [ ] `POST /api/project-graph/explain`

Rules:

- [ ] Token-protect mutating endpoints.
- [ ] Do not expose raw secrets from files, logs, env, or memory notes.
- [ ] Return provenance for every answer.

## 5.1.5 - Explain Layer

- [ ] Build deterministic explain responses first.
- [ ] Add optional LLM summarization only after provenance is available.
- [ ] Always include source nodes/edges in responses.
- [ ] If the system cannot prove a relationship, it must say so.

Example response shape:

```json
{
  "answer": "This endpoint was introduced by task T-123.",
  "confidence": "proven",
  "sources": [
    { "type": "task", "id": "T-123" },
    { "type": "patch", "id": "P-456" },
    { "type": "file", "path": "electron/api/routes/android.ts" }
  ]
}
```

## 5.1.6 - Desktop UI

- [ ] Add Project Intelligence panel.
- [ ] Add file relationship view.
- [ ] Add task lineage view.
- [ ] Add patch provenance view.
- [ ] Add "Why does this exist?" action for files/endpoints/tasks.
- [ ] Show graph edges as inspectable facts, not decorative visuals.

## 5.1.7 - Android UI

- [ ] Add read-only Project Intelligence screen.
- [ ] Show task/file/agent relationship summaries.
- [ ] Add search.
- [ ] Keep mutation disabled on Android MVP.

## 5.1.8 - Brain Sync

- [ ] Write graph reindex summaries to Brain.
- [ ] Link completed tasks to memory notes.
- [ ] Link memory notes back to task IDs.
- [ ] Ensure SecondBrain sync preserves graph-relevant metadata.

## Validation

- [ ] Create a task that touches a file.
- [ ] Generate a patch.
- [ ] Complete task.
- [ ] Reindex graph.
- [ ] Query by file path.
- [ ] Confirm task, patch, agent, and memory relationships are returned.
- [ ] Run Desktop typecheck/build.
- [ ] Run Android build if Android UI changed.

## Done Definition

Phase 5.1 is complete when NiClaw can answer project lineage questions from real stored events and memory, with source-backed graph relationships.
