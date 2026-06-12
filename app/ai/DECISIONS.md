# DECISIONS - ClawX Architectural Decisions

## (2026-06-12) - Real Agent Mesh Contract and Secret Boundary
- SuperHermes API is the canonical real agent mesh gateway for Windows, Android, Telegram, and Antigravity UI work. Clients should consume `https://vm-niclaw.tail7a9097.ts.net:8002/api/mesh/*`.
- Hermes Dashboard protected APIs are called server-side only inside SuperHermes mesh adapters. Session tokens must never be returned to renderer/mobile clients, Telegram output, logs, or SecondBrain.
- `auth_required` is a valid real state, not a failure to hide. NiClaw Host API remains visible as `auth_required` until a safe gateway/token flow is wired.
- SuperHermes binds to `127.0.0.1:8002` because Tailscale Serve already owns the tailnet `:8002` listener and proxies to localhost; binding uvicorn to `0.0.0.0` conflicts after restart.

## (2026-06-11) - Shared Brain Architecture for Obsidian, Hermes, and OpenClaw
- The canonical full shared vault remains `D:\Onedrive\SecondBrain\secondBrain` locally and `/home/debian/secondBrain` on `vm-niclaw`.
- OpenClaw gets the full vault as direct workspace context through `workspace/secondbrain`, but semantic memory indexes only a curated safe core under `workspace/memory` to avoid slow indexing and secret exposure.
- Hermes/GBrain imports the same curated `workspace/memory` core before gateway startup; raw full-vault indexing is intentionally avoided because previous `mcp_gbrain_put_page` calls exceeded embedding context limits.
- Agent-written durable notes must live under `AI Inbox Runs/Agent Runtime Memory/` so the Windows sync can import VM notes before pushing the local vault back to the VM.

## (2026-06-11) - Repair Integrations, Do Not Remove Capabilities
- When Hermes/OpenClaw startup warnings come from misclassified config, keep the underlying feature if it is valid elsewhere. Modal remains a provider; only the invalid MCP server entry was removed.
- MCP servers that depend on project-local environment or generated clients should be launched through explicit wrappers that set the correct working directory. Dracarys MCP uses `/home/debian/.hermes/bin/dracarys-mcp-wrapper.sh` so Prisma and `.env.local` resolve from `/home/debian/Server/platform.dracarys.ro`.
- Build readiness requires both app compilation and runtime integration sanity: TypeScript/Vite/Android/Windows packaging must pass, and Hermes/OpenClaw/SecondBrain memory services must be checked separately.

## (2026-05-31) - No Loose Ends / Backend-First Rule
- Project rule confirmed by owner: never leave loose ends. If a feature needs backend/API support, implement or connect the real backend contract instead of leaving UI-only placeholders.
- `vm-niclaw` is an active backend/runtime target for this project; desktop and Android work must account for local Host API plus remote VM Host API deployment/smoke needs.
- Missing backend states may be shown only as temporary truth during implementation, not as a final feature state.

## (2026-05-31) - Principal Product Direction: 2.5D Spatial AI OS
- The project direction is now **NiClaw Spatial AI OS**, implemented as a functional 2.5D workspace first, not a premature full-3D experience.
- Desktop becomes the main operating surface: Explorer + Spatial Canvas + Command Palette + Inspector + Console/Logs + Plan Mode + Agent Harness + BoardAI/Kanban/Code Review.
- Android becomes the companion control plane: status, approvals, run/pause plans, BoardAI sync, and voice commands.
- All Spatial OS zones must connect to real Host API data/actions; mock-only or decorative status surfaces are explicitly out of scope.

## (2026-05-29) - BoardAI Sync Boundary
- Decided to expose BoardAI status and local sync through the Host API, but not to claim remote publication until the project has an explicit BoardAI publish endpoint/token.
- `POST /api/board/sync` increments local revision metadata and reports `remotePublishConfigured: false`, keeping the UI honest while preserving a clean integration point for a future real publish adapter.

## (2026-05-30) - BoardAI Token Source
- BoardAI publish credentials remain outside the repository: Host API reads env vars first, then `%USERPROFILE%\.boardai-vault\config.json`.
- This keeps Windows/Android UI secret-free while allowing local and remote Host API flows to publish through the official BoardAI API token contract.

## (2026-05-31) - BoardAI snapshot is generated from project memory
- `ai/BRAINMAP.md` is the canonical human-readable project map. `ai/BOARD_BRAINMAP.json` is a generated BoardAI transport snapshot.
- Every BoardAI sync regenerates the snapshot in the Host API before publish, so desktop, Android, and Plan Mode cannot publish stale static JSON.

## (2026-05-20) - Windows Bundled Runtimes
- Decided to use the project-shipped downloading scripts (`download-bundled-uv.mjs`, `download-bundled-node.mjs`) to retrieve Windows-specific python `uv` and `node` runtimes. This ensures offline autonomy when running the desktop app.
# 2026-05-31 - Spatial Plan risky actions require persisted approval
- Risky Plan actions must be blocked in the Host API before executor dispatch until a step-level approval is persisted.
- Approve/reject transitions are auditable and backend-authoritative; the renderer only reflects Host API responses.
- Risky approvals are one-shot: backend dispatch stores `approvalStatus=consumed`, and replay requires a new explicit approval.
- Connected risky executors are `doctor_fix`, `gateway_restart`, and `build_validation`.
- Build validation exposes named backend profiles only. The first profile is `typecheck`; arbitrary commands are rejected. Constrained shell execution still requires a dedicated policy before exposure.
