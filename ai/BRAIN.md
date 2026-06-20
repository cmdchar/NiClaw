# NiClaw Brain

## Current State
- The Agent Mesh features are fully operational and unmocked.
- Windows Renderer and Android Client fetch mesh status via a secure local bridge (/api/agent-mesh/status).
- SuperHermes gateway Token is securely injected by the Windows Host API without exposing it to UI layers.
- Architecture allows dynamic visualization of SuperHermes node states and triggering smoke tests securely.

## Recent Changes
- **Phase 4.4C - Desktop Workspace UI COMPLETED** (2026-06-20)
  - Built `TaskWorkspacePanel.tsx` integrated into the `CommandCenter`.
  - Implemented `TaskTimeline.tsx` for structured chronologic visualization of tasks.
  - Implemented `WorkspaceArtifacts.tsx`, `WorkspacePatchReview.tsx`, and `ClarificationCard.tsx`.
- **Phase 4.4B Sprint 3 - Orchestrator And Patch Loop COMPLETED** (2026-06-20)
  - `task-orchestrator.ts` automatically creates Workspaces upon `submitTask`.
  - Upgraded Event Taxonomy (`workspace.file.read`, `workspace.command.started`, etc.) exposing `actionKind`, `actionType`, and `policyLevel`.
  - Hooked `workspace.plan.generated` and `workspace.patch.*` lifecycle events.
  - Wrapped actual executor CLI invocations in Workspace Execution tracking events and bound CLI large outputs to `WorkspaceArtifacts`.
- **Phase 4.4B Sprint 2 - Workspace Kernel And Policy Surface COMPLETED** (2026-06-20)
  - `workspace-kernel.ts` implemented offering robust and gated `listFiles`, `readFile`, `search`, and `runCommand`.
  - `policy-engine.ts` expanded with `classifyWorkspaceAction`.
  - Host API exposed via `/api/orchestrator/tasks/:taskId/workspace/*`.
- **Phase 4.4B Sprint 1 - Persistent Workspace Foundation COMPLETED** (2026-06-20)
  - `workspace-types.ts` defines `ProvenanceMetadata` explicitly.
  - `task-event-store.ts` extended to load/save `workspaces.json`.

## Next Steps
- **Phase 4.4D - Android Workspace Viewers**: Build Android Companion UI components to natively consume `GET /api/orchestrator/tasks/:taskId/workspace/*` and visualize the timeline.
- **Phase 2.9B – Real Codex CLI Sandbox**: Install `@openclaw/codex`, configure API key, invoke real CLI in sandbox.
- Android diff viewer UI for execution results
- Extend Android UI for deep agent diagnostics
- `tasks.json` write atomicity fix (EPERM race on Windows)
