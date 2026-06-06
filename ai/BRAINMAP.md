# BRAINMAP - ClawX (niclaw)

## 1) Project Overview
ClawX is a React 19 + TypeScript + Vite desktop application packaged with Electron, serving as a GUI for the OpenClaw AI agent orchestration platform.

## 1.1) Principal Product Direction - NiClaw Spatial AI OS
- Confirmed direction as of 2026-05-31: evolve NiClaw into a functional **2.5D Spatial AI Operating System**.
- Target workspace: Explorer + Spatial Canvas + Command Palette + Inspector/AI Assistant + Console/Events/Agent Logs + Workspace Map + Plan Mode + Agent Harness + BoardAI + Kanban + Code Review.
- Implementation principle: real Host API-backed state/actions first; visual 2.5D/isometric polish second. Android acts as companion control plane for status, approvals, plan execution, BoardAI sync, and voice commands.

## 2) Key Build Commands
- `pnpm run init`: Installs dependencies and downloads UV.
- `pnpm run prep:win-binaries`: Downloads bundled Windows node/uv binaries.
- `pnpm run package:win`: Builds the Vite application and bundles it into a Windows executable using electron-builder.
- Current validation baseline (2026-05-30): `pnpm run typecheck` passes, `pnpm run lint:check` passes with warnings only, `pnpm run build:vite` passes, `pnpm run package:win` generated `release/NiClaw-0.4.4-win-x64.exe`, and `mobile/android-kotlin/gradlew.bat assembleDebug` generated `mobile/android-kotlin/app/build/outputs/apk/debug/app-debug.apk`.

## 3) Main Artifact Folders
- `electron/`: Core Electron main process files.
- `src/`: React frontend source code.
  - `src/pages/Portal/`: Unified In-App Agent Portal interface (`index.tsx`).
  - `src/pages/SpatialOS/`: First-pass 2.5D Spatial AI OS shell (`index.tsx`) with real Host API/stores for agents, gateway health, BoardAI status, and recent logs. Route: `/spatial`.
- `mobile/android-kotlin/`: Native Kotlin Android voice assistant companion app, featuring a modular 5-tab `BottomNavigationView` system (`ChatFragment`, `AgentsFragment` with REST client CRUD, `SpatialFragment` for plan details and approval controls, `PortalFragment` with text-zoom/audio-mute/address HUD, and `SettingsFragment` with control panel restarts and nested bot channels configuration).
- `shared/jarvis-server/`: Lightweight Node/Express TS server, routing commands between Android client, Gemini, and OpenClaw, containing simple intent mapping skills.
- `scripts/`: Custom build scripts for downloading runtimes, bundling OpenClaw plugins, and running Electron Builder.

## 4) Remote Headless Host API Scheme
- **Host API Address**: `http://10.10.1.219:13210` (Remote Access enabled; binds automatically to `0.0.0.0` when running headlessly via `CLAWX_HEADLESS=1` or `HEADLESS=true`).
- **Authentication**: Bearer Token, persistent `gatewayToken`, or `?token=` query parameter using a custom pre-shared key defined in `CLAWX_API_TOKEN` environment variable.
- **Service Deployment**: Managed via background systemd service `clawx-ai-os.service` running inside virtual framebuffer `xvfb-run` under headless mode (`CLAWX_HEADLESS=1`).
- **Dynamic File Deployment**: Features `POST /api/agents/write-workspace-file` to let the Visual Builder compile and write swarm coordination rules (`AGENTS.md`) directly into agent workspaces on `vm-niclaw` dynamically.
- **Dynamic Visual Swarm Run**: Features `POST /api/swarm/run` (on port `3000`) to execute visual DAG flows (Gemini queries, custom JS sandbox scripts, logic branching routers, local CLI commands) live on the VM guest.
- **Agent MCP Tool Mapping**: Visual Builder Agent nodes persist `mcpServers` (`name`, `command`, `args`) in node data and sync that list through `/api/agents` create/update into OpenClaw agent config.
- **BoardAI Host API**:
  - `GET /api/board/status`: reads local BoardAI sync status, probes the public board URL, and returns snapshot counts from `ai/BOARD_BRAINMAP.json`.
  - `POST /api/board/sync`: regenerates `ai/BOARD_BRAINMAP.json` from the current `ai/BRAINMAP.md`, refreshes local metadata/revision, and publishes the new snapshot to the real BoardAI API (`PUT /api/boards/:id`) when `BOARD_AI_TOKEN`/`BOARDAI_TOKEN` or `%USERPROFILE%\.boardai-vault\config.json` token is available.
  - Generator: `electron/utils/board-brainmap.ts` builds deterministic section/item nodes and orthogonal arrows with a balanced three-column layout.
- **Spatial Plan Host API**:
  - `GET /api/plans`: lists persisted Spatial plans.
  - `POST /api/plans`: creates a persisted plan.
  - `PUT /api/plans/:id`: updates a persisted plan.
  - `POST /api/plans/:id/run`: creates a backend run and run events. Executors support `manual`, `note`, safe real `board_sync`, read-only `doctor_diagnose`, approval-gated `doctor_fix`, approval-gated `gateway_restart`, and approval-gated `build_validation`; unsupported executor kinds are reported as `blocked`.
  - `GET /api/plans/:id/events`: returns persisted run events.
  - Storage: Host API user data `spatial/plans.json`, so local desktop and `vm-niclaw` host deployments can share the same contract shape.
  - `board_sync` calls the shared `syncBoardSnapshot()` service also used by `/api/board/sync`, preserving one real BoardAI regeneration and publish implementation.
  - `doctor_diagnose` calls the existing read-only `runOpenClawDoctor()` service.
  - `POST /api/plans/:planId/steps/:stepId/approval`: persists `approve` or `reject` for risky steps and appends an audit record.
  - Risky step kinds (`doctor_fix`, `gateway_restart`, `build_validation`, `shell`) are blocked until approved. Connected risky executors call `runOpenClawDoctorFix()`, `ctx.gatewayManager.restart()`, and the structured build validation runner.
  - Build validation accepts named backend profiles only. Current allowlist: `validationProfile: "typecheck"` -> `pnpm run typecheck`, executed with `spawn`, `shell: false`, timeout, and bounded output.
  - Risky approvals are one-shot: executor dispatch stores `approvalStatus=consumed`, so a second run blocks until a new explicit approval is persisted.
  - Deployed and smoke-tested on `vm-niclaw` on 2026-05-31: persisted Doctor diagnose completed with `exit=0`; BoardAI Plan publish completed successfully; Gateway restart completed once and replay blocked; typecheck completed with `exit=0` and replay blocked with `approvalStatus=consumed`.

## 5) Embedded Agent Portal Connections
- Mapped client ports and URLs rendered inside the sandboxed hardware-accelerated iframe dashboard container:
  * **OpenClaw Dashboard**:
    - HTTP: `http://<IP>:18789/?token=<token>`
    - HTTPS: `https://<host>/?token=<token>` (Mapped to port 443 via Tailscale Serve)
  * **OpenHuman Core**:
    - HTTP: `http://<IP>:7788`
    - HTTPS: `https://<host>:10000` (Proxied to 7788 via Tailscale Serve, serving the official **OpenHuman Web Interface** and proxying `/rpc` requests to the native Rust Core daemon on port `17788`. Custom chat route `/chat` maps E2E messages directly to the OpenClaw Gateway on port `18789` under the `agent:openhuman` session slug).
  * **Hermes Console**:
    - HTTP: `http://<IP>:7789`
    - HTTPS: `https://<host>:8443` (Proxied to 7789 via Tailscale Serve, running a custom mobile-responsive Inference chat console. Custom chat route `/chat` maps E2E messages directly to the OpenClaw Gateway on port `18789` under the `agent:hermes` session slug).
  * **Open Code (VS Code)**:
    - HTTP: `http://<IP>:8080`
    - HTTPS: `https://<host>:8000` (Proxied to port 8080 via Tailscale Serve, running passwordless `code-server` in the secure Tailnet context)
  * **Gemini Console**: `https://aistudio.google.com` (Google AI Studio)
  * **BoardAI Brainmap**: `https://board.private-driver.ro/?board=728273ef-9709-4f1c-a77e-ab7086bfeff3` (generated project brainmap from `ai/BRAINMAP.md`; current revision/counts are read from `ai/BOARD_SYNC_STATUS.json`; Windows and Android Portal expose live status + regeneration/publish controls)
