# Phase 5.3 - Autonomous Project Mode

Status: planned
Created: 2026-06-20
Depends on: Phase 4.4B, Phase 5.1, Phase 5.2

## Objective

Enable NiClaw to handle bounded project objectives autonomously while preserving policy gates, human approval for risky actions, patch review, and memory updates.

Example objective:

```text
Resolve all TypeScript errors.
```

NiClaw should create tasks, create workspaces, plan, execute safe checks, generate patches, request approvals when needed, apply approved patches, validate, and update memory.

## 5.3.1 - Autonomous Objective Model

Add:

- [ ] `AutonomousObjective`
- [ ] `AutonomousRun`
- [ ] `AutonomousRunStep`
- [ ] `AutonomousRunBudget`
- [ ] `AutonomousRunPolicy`
- [ ] `AutonomousRunReport`

Fields must include:

- [ ] objective text;
- [ ] scope;
- [ ] allowed repos/projects;
- [ ] blocked paths;
- [ ] time budget;
- [ ] command budget;
- [ ] patch budget;
- [ ] approval requirements;
- [ ] rollback plan;
- [ ] status.
- [ ] provenance metadata: `createdBy`, `createdAt`, `updatedAt`, `sourceTaskId`, `sourceWorkspaceId`, `sourcePatchId`, `sourceAgentId`, `sourceDecisionId`, `sourceEventId`.

## 5.3.2 - Safe Objective Intake

- [ ] Add objective creation endpoint.
- [ ] Require explicit scope.
- [ ] Require explicit allowed projects.
- [ ] Require policy classification.
- [ ] Refuse destructive or broad objectives without user confirmation.
- [ ] Store objective and all derived tasks.

Host API endpoints:

- [ ] `POST /api/autonomous/objectives`
- [ ] `GET /api/autonomous/objectives`
- [ ] `GET /api/autonomous/objectives/:id`
- [ ] `POST /api/autonomous/objectives/:id/start`
- [ ] `POST /api/autonomous/objectives/:id/pause`
- [ ] `POST /api/autonomous/objectives/:id/resume`
- [ ] `POST /api/autonomous/objectives/:id/cancel`

## 5.3.3 - Task Generation

- [ ] Convert objective into task list.
- [ ] Create one workspace per task.
- [ ] Link tasks through dependencies.
- [ ] Assign agents through Phase 5.2 engine.
- [ ] Link generated tasks to Knowledge Graph.
- [ ] Preserve objective provenance on every generated task and workspace.

## 5.3.4 - Execution Loop

Implement bounded loop:

- [ ] inspect current state;
- [ ] choose next task;
- [ ] gather context;
- [ ] run safe commands;
- [ ] generate patch;
- [ ] run validation;
- [ ] request approval when policy requires;
- [ ] apply approved patch;
- [ ] update graph and memory;
- [ ] proceed to next task or stop.
- [ ] preserve provenance for each autonomous run step.

Stop conditions:

- [ ] budget exceeded;
- [ ] repeated failure threshold reached;
- [ ] policy block;
- [ ] user pause/cancel;
- [ ] no progress detected;
- [ ] objective complete.

## 5.3.5 - Policy And Approval Gates

- [ ] Safe read commands can auto-run.
- [ ] Build/test commands can auto-run if allowlisted.
- [ ] File writes require patch preview.
- [ ] Dependency changes require approval.
- [ ] Environment changes require approval.
- [ ] Network calls require approval unless explicitly allowed.
- [ ] Destructive commands remain blocked or require explicit one-time approval.

## 5.3.6 - Patch Strategy

- [ ] Generate small patches.
- [ ] Validate each patch.
- [ ] Keep patch provenance.
- [ ] Link patch to objective, task, agent, file, and validation result.
- [ ] Allow user to approve/reject patch.
- [ ] Never silently apply risky patches.

## 5.3.7 - Desktop UI

- [ ] Add Autonomous Mode screen.
- [ ] Add objective creation form.
- [ ] Add scope selector.
- [ ] Add budget controls.
- [ ] Add run timeline.
- [ ] Add task breakdown panel.
- [ ] Add agent assignment panel.
- [ ] Add patch approval queue.
- [ ] Add pause/resume/cancel controls.

## 5.3.8 - Android UI

- [ ] Show autonomous runs.
- [ ] Show current status and blockers.
- [ ] Allow approve/deny policy gates.
- [ ] Allow pause/cancel.
- [ ] Do not expose raw secrets or raw internal prompts.

## 5.3.9 - Hermes Awareness

- [ ] Hermes receives objective start event.
- [ ] Hermes receives task progress.
- [ ] Hermes receives blockers.
- [ ] Hermes receives approval needed events.
- [ ] Hermes can answer "what is autonomous mode doing now?"

## 5.3.10 - Memory And Graph Updates

- [ ] Every autonomous run writes final report.
- [ ] Every completed task updates Brain and SecondBrain.
- [ ] Knowledge Graph links objective, tasks, patches, files, decisions, validations, and memory notes.
- [ ] Provenance fields are written for objective, generated tasks, workspaces, patches, decisions, validations, and final memory notes.
- [ ] Failed runs record exact failure reason and next suggested action.

## Validation Scenario

Use a bounded, non-destructive objective first:

```text
Analyze TypeScript errors and create a patch plan without applying changes.
```

Then validate controlled write flow:

```text
Fix one selected TypeScript error in an allowed file and stop after validation.
```

Checks:

- [ ] objective created;
- [ ] task list generated;
- [ ] workspace created per task;
- [ ] agents assigned;
- [ ] commands run through policy engine;
- [ ] patch generated;
- [ ] approval requested;
- [ ] approved patch applied;
- [ ] validation run;
- [ ] memory updated;
- [ ] graph updated;
- [ ] Hermes reports accurate status.

## Done Definition

Phase 5.3 is complete when NiClaw can execute a bounded project objective through autonomous task decomposition, agent orchestration, policy-gated execution, patch review, validation, and memory/graph updates.
