# Phase 5.2 - Multi-Agent Planning Engine

Status: planned
Created: 2026-06-20
Depends on: Phase 4.4B, Phase 4.5, Phase 5.1

## Objective

Upgrade NiClaw from task execution to true agent orchestration.

The orchestrator must decide:

- who works;
- what each agent works on;
- when each agent works;
- what context each agent receives;
- what each agent must report back to Hermes and TaskEventStore.

## 5.2.1 - Agent Role Model

Define explicit role contracts:

- [ ] Planner Agent: breaks objectives into phases and task workspaces.
- [ ] Research Agent: inspects repo, docs, web or VM context when allowed.
- [ ] Executor Agent: performs approved workspace actions.
- [ ] Reviewer Agent: reviews patch, risk, tests, and policy impact.
- [ ] Memory Agent: writes Brain/SecondBrain summaries and graph metadata.
- [ ] Deployment Agent: handles build, release, VM/service checks.
- [ ] Hermes Coordinator: receives status, broadcasts ecosystem state, answers user status questions.

Suggested files:

- `app/electron/services/orchestrator/agent-roles.ts`
- `app/electron/services/orchestrator/planning-engine.ts`
- `app/electron/services/orchestrator/context-router.ts`
- `app/electron/services/orchestrator/agent-assignment-store.ts`

## 5.2.2 - Agent Capability Registry

- [ ] Register each agent capability.
- [ ] Include allowed tools/actions.
- [ ] Include risk level per capability.
- [ ] Include runtime location: local desktop, vm-niclaw, Hermes, OpenClaw, Antigravity/manual.
- [ ] Include status endpoint or heartbeat source.
- [ ] Include context limits and memory access level.

No agent may receive secrets unless explicitly authorized by server-side policy.

## 5.2.3 - Planning Protocol

Add planning stages:

- [ ] objective intake;
- [ ] context gather;
- [ ] risk classification;
- [ ] task decomposition;
- [ ] agent assignment;
- [ ] execution order;
- [ ] dependency graph;
- [ ] approval gates;
- [ ] validation plan;
- [ ] memory update plan.

Each stage must emit TaskEventStore events.

Each emitted planning object must preserve provenance:

- [ ] `createdBy`
- [ ] `createdAt`
- [ ] `sourceTaskId`
- [ ] `sourceWorkspaceId`
- [ ] `sourceAgentId`
- [ ] `sourceDecisionId`
- [ ] `sourceEventId`

## 5.2.4 - Context Router

- [ ] Build minimal context bundles per agent.
- [ ] Include only needed files, events, graph nodes, and memory notes.
- [ ] Strip secrets.
- [ ] Track which context was sent to which agent.
- [ ] Record context provenance in TaskEventStore.
- [ ] Record graph provenance for every context bundle if Phase 5.1 is available.
- [ ] Keep context bundle IDs linkable to assignments, decisions, and review notes.

## 5.2.5 - Host API

Add endpoints:

- [ ] `GET /api/orchestrator/agents/roles`
- [ ] `GET /api/orchestrator/agents/capabilities`
- [ ] `POST /api/orchestrator/tasks/:taskId/plan`
- [ ] `POST /api/orchestrator/tasks/:taskId/assign`
- [ ] `GET /api/orchestrator/tasks/:taskId/assignments`
- [ ] `POST /api/orchestrator/tasks/:taskId/dispatch`
- [ ] `POST /api/orchestrator/tasks/:taskId/review`

Mutating endpoints must remain token-protected and policy-gated.

## 5.2.6 - Hermes Mesh Integration

- [ ] Every assignment emits Hermes status.
- [ ] Every agent starts with a status event.
- [ ] Every agent completion/failure emits status.
- [ ] Hermes can answer "who is working on what now?"
- [ ] Hermes can answer "what did each agent do?"

## 5.2.7 - Desktop UI

- [ ] Add Agent Assignment panel to workspace.
- [ ] Show agent roles and current task.
- [ ] Show context bundle summary.
- [ ] Show blocked/waiting/running/done states.
- [ ] Show reviewer verdicts.
- [ ] Add manual reassignment control behind policy gate.

## 5.2.8 - Android UI

- [ ] Show read-only agent assignments.
- [ ] Show running/waiting/done states.
- [ ] Allow approve/deny only for policy-approved gates.
- [ ] Do not expose raw prompts, tokens, or secret-bearing context.

## Validation

- [ ] Create one task that needs research, execution, review, and memory update.
- [ ] Confirm planning engine assigns roles.
- [ ] Confirm each agent receives scoped context.
- [ ] Confirm Hermes status updates for every step.
- [ ] Confirm reviewer can block unsafe output.
- [ ] Confirm memory update occurs after completion.
- [ ] Run Desktop typecheck/build.
- [ ] Run Android build if Android UI changed.

## Done Definition

Phase 5.2 is complete when NiClaw can coordinate specialized agents through explicit assignments, scoped context, policy gates, and observable Hermes status.
