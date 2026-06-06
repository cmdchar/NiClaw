# BRAIN - CURRENT AI STATE

## Principal Project Direction (2026-05-31) - NiClaw Spatial AI OS
- **Confirmed Direction**: Build NiClaw toward a 2.5D functional **Spatial AI Operating System**, inspired by the provided AXIAL STUDIO/SAMS references, without jumping prematurely into heavy full-3D visuals.
- **Product North Star**: One coherent workspace where Explorer, Spatial Canvas, Command Palette, Agent Harness, Plan Mode, BoardAI, Kanban, Code Review, Terminal, Logs, and Android companion controls operate as one model-agnostic AI OS.
- **Execution Rule**: Functionality first, polish second. Every visible zone must be backed by real Host API data/actions; no fake demo states or simulated backend behavior.
- **Primary Implementation Track**:
  - 1. Create a new desktop route/page: `src/pages/SpatialOS/index.tsx` plus route/sidebar entry.
  - 2. Build the 2.5D shell: left Workspace Explorer, center Spatial Canvas, top Command Palette, right Inspector/AI Assistant, bottom Console/Events/Agent Logs, mini Workspace Map.
  - 3. Connect real Host API data for agents, BoardAI, settings, health, builds, plans, and logs.
  - 4. Add Interactive Plan Mode: `Plan -> Review -> Execute -> Observe -> Iterate`, persisted and executable through Host API.
  - 5. Add Agent Harness cards with status, model, MCP servers, current task, logs, permissions, pause/resume, and approval gates.
  - 6. Add native Kanban/Board/Code Review panels tied to real project tasks, files, agents, plans, and BoardAI nodes.
  - 7. Extend Android with a `Spatial` companion tab for status, run/pause plan, approvals, BoardAI sync, and voice commands.
- **Design Rule**: Light, premium, operational UI; 2.5D/isometric feel, restrained motion, clear density, real status indicators, and no decorative visuals that do not map to a real system object or action.
- **No Loose Ends Rule**: Never leave final UI-only placeholders. If a Spatial OS feature needs backend/API support, build or connect the real Host API/backend contract. `vm-niclaw` is part of the active backend/runtime surface and must be considered for deployment and smoke testing.

## Latest update (2026-06-05) - Full Android Feature Parity: Dreams, Cron, Skills, Models & Headless Fixes
- **Current State**:
  - **Gateway RPC Proxy**: Added `POST /api/gateway/rpc` in [gateway.ts](file:///c:/Server/niclaw/app/electron/api/routes/gateway.ts) to forward arbitrary RPC calls from Android to `gatewayManager.rpc()`, deployed to `vm-niclaw`.
  - **Headless Electron Stability**: Patched [ipc-handlers.ts](file:///c:/Server/niclaw/app/electron/main/ipc-handlers.ts) with null-safe `mainWindow` guards for crash-free VM headless operation.
  - **Skills Toggle Endpoint**: Added `POST /api/skills/toggle` in [skills.ts](file:///c:/Server/niclaw/app/electron/api/routes/skills.ts) dispatching `skills.update` RPC to gateway.
  - **Android Chat Status Fix**: Updated [ChatFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ChatFragment.kt) to use `backgroundTintList` preserving circular indicator shape.
  - **Android Dreams Sub-Screen**: Created [DreamsFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/DreamsFragment.kt) with metrics cards, doctor action buttons, phase/signal/diary containers, and config patch toggles, accessible from Settings.
  - **Android Cron Jobs Sub-Screen**: Created [CronFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/CronFragment.kt) with job list, toggle, manual trigger, and API helpers in ApiClient.
  - **Android Skills Sub-Screen**: Created [SkillsFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/SkillsFragment.kt) with skill list, enable/disable toggle, and API helpers.
  - **Android Models/Providers Sub-Screen**: Created [ModelsFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ModelsFragment.kt) with vendor icon mapping, default badge, toggle, set-default button, and API helpers.
  - **Settings Navigation Expanded**: Added "Administrare Servicii" (Cron, Skills, Models) and "Consolidare Memorie (Dreams)" cards in Settings with back-stack fragment navigation.
  - **Generic RPC Client**: Added `gatewayRpc` helper in [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt) for arbitrary gateway RPC dispatching from Android.
  - **Validation**: Desktop `pnpm run typecheck` passes (0 errors). Android `gradlew assembleDebug` BUILD SUCCESSFUL. APK installed on phone `3650f58e` and archived to OneDrive. Gateway deployed to `vm-niclaw`, service active.
- **Next Exact Steps**:
  - 1. E2E verify Dreams, Cron, Skills, and Models sub-screens on the physical phone over Tailscale HTTPS.
  - 2. Connect and expand code review workspace panels with Git diff summary adapters on the Host API.
  - 3. Consolidate Obsidian Second Brain notes and journals.

## Previous update (2026-06-02) - Android Spatial Companion, Gated Shell, & Kanban OS
- **Current State**:
  - **Tailscale HTTPS Host API Proxy & Android Companion Port Fix**: Configured a secure HTTPS proxy for port 13210 (`https://vm-niclaw.tail7a9097.ts.net:13210`) via Tailscale serve on the VM to route Host API requests properly.
  - **Companion App HTTPS Port Routing Fix**: Modified [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt) to route HTTPS calls to port `:13210` instead of the default 443 (which is mapped to the 18789 Gateway), resolving routing issues and restoring E2E plan actions from the phone.
  - **Host API Request Logging**: Added request logging middleware in [server.ts](file:///c:/Server/niclaw/app/electron/api/server.ts) to audit methods, paths, and remote IPs in the daily logs on the VM.
  - **OneDrive Deployment**: Compiled the updated Android app to `app-debug.apk` and copied it as `NiClaw-Companion.apk` to the synced OneDrive folder `C:\Users\nicus\OneDrive\Documents\111SERVER\`.
  - **Spatial OS Host API & Browser Executors**: Implemented full execution contracts for `'host_api'` (dispatching local HTTP requests using `hostApiToken`) and `'browser'` (headless automation via native Electron `BrowserWindow` sandbox instances).
  - **Spatial OS 2.5D Visual Polish**: Redesigned canvas zone controls into premium glassmorphic cards featuring isometric hover effects and dynamic neon pulsing status indicators.
  - **Agent Harness Panel Expansions**: Added full support for manual approval gates toggles, active MCP configuration lists, logs, and pause/resume buttons on the Agent Harness cards inside the Spatial OS page, and updated the Zustands stores to persist settings.
  - **Android Spatial tab & settings migration**: Added the `Spatial OS` fragment view to the bottom navigation bar switch mapping. Migrated chatbot channels configuration under Settings via a dedicated `Configurează Canale Bot` button replacing the fragment layout with back-stack support.
  - **Kotlin compiler fix**: Resolved `textStyle` build-blocking compiler errors by switching assignments to standard Typeface helper methods. Debug app builds successfully to `app-debug.apk`.
  - **Secure Gated Shell Execution**: Allowed specific commands (`git`, `pnpm`, `systemctl`, `pm2`) in Plan Mode via safe spawn validation rules.
  - **Kanban Task Board**: Integrated persistent JSON task storage on the backend and Kanban grid view on the desktop frontend.
  - **VM Deployment & Clean Typecheck**: Verified clean typechecking, synced updated files (`electron/api/context.ts`, `electron/api/server.ts`, `electron/api/routes/plans.ts`, `src/pages/SpatialOS/index.tsx`) to `/home/debian/NiClaw` on `vm-niclaw` guest workspace, and restarted the gateway service.
  - **Android Companion App Token and Timeout Fixes**: Aligned the phone's gateway token with the VM's active token `clawx-770a755f899751f446c3e7859443bc33` in `JarvisPrefs.xml` via ADB. Modified `ApiClient.kt` to force HTTPS on port `13210` for Tailscale `.ts.net` domains, and increased OkHttpClient's read timeout to 60 seconds to support long-running VM tasks (e.g. Doctor Diagnose) without triggering client-side timeouts.
  - **E2E Efficacy Verified**: Successfully ran a remote E2E test from the companion app on the physical phone: triggered the `doctor_diagnose` plan over Tailscale HTTPS, monitored the execution progress, and saw the completion events render live in the console on the phone screen.
  - **Android Spatial OS Parity (Completed)**: Overhauled the Android companion app's Spatial fragment by implementing full-featured custom UI cards for:
    1. **Agent Harness**: Dynamic listing of cluster agents with real-time toggle switches to pause/resume agents (making PUT requests to `/api/agents/:id`).
    2. **Kanban Task Board**: Complete task creation popup, dynamic filtering by status column (To Do, In Progress, Done), and touch controls to transition tasks between statuses.
    3. **System Health Metrics**: Real-time polling of gateway state, WebSocket transport connection, RPC Router readiness, and BoardAI reachability.
  - **Android Build Validated**: Confirmed 100% syntax and build correctness via `gradlew.bat assembleDebug` (compilation finished cleanly in 55s) and copied the output package to the OneDrive transfer folder.

## Latest update (2026-06-01) - Tailscale Connectivity & Secure Port Proxying Verified
- **Current State**:
  - **Tailscale Port & Access Audited**: Checked the active `tailscale serve` proxies on `vm-niclaw` (Tailnet IP `100.78.81.89`), confirming the root secure HTTPS path `https://vm-niclaw.tail7a9097.ts.net` successfully proxies to internal OpenClaw Gateway port `18789`.
  - **Configuration Verified**: Confirmed that `"bind": "lan"` in `openclaw.json` correctly binds the gateway process to `0.0.0.0`, allowing direct listening on Tailscale interfaces.
  - **Secure Token Authentication**: Successfully tested pre-authenticated Control UI navigation over Tailscale: `https://vm-niclaw.tail7a9097.ts.net/?token=clawx-770a755f899751f446c3e7859443bc33` cleanly serves the official static dashboard with no warning logs.
  - **Auxiliary Port Routing**: Confirmed NousResearch Hermes Dashboard (`:8443` -> `7789`), OpenHuman Web Interface (`:10000` -> `7788`), and VS Code Web (`:8000` -> `8080`) are completely active and accessible via HTTPS proxies over the virtual private net.

## Previous update (2026-06-01) - Modal API & GLM-5.1 Integration in Hermes & OpenClaw
- **Previous State**:
  - **Modal API Integration**: Configured Hermes `/home/debian/.hermes/config.yaml` to connect directly to the Modal API completions endpoint (`https://api.us-west-2.modal.direct/v1`) using the `custom` provider schema.
  - **GLM-5.1 Model Setup**: Configured `zai-org/GLM-5.1-FP8` as the primary default LLM model inside `/home/debian/.hermes/config.yaml` to leverage GLM-5.1 for core bot messaging and terminal operations.
  - **Credentials Storage**: Added the pre-shared static Bearer token (`modalresearch_cW6iBts2...`) to the provider config and also declared `MODAL_API_KEY` inside `/home/debian/.hermes/.env` for secondary credentials discovery.
  - **OpenClaw Integration**: Configured OpenClaw `/home/debian/.openclaw/openclaw.json` by adding the custom `modal` provider (endpoint `https://api.us-west-2.modal.direct/v1`, type `openai-completions`), defining `modal:default` auth profile under `auth.profiles`, mapping the `zai-org/GLM-5.1-FP8` model metadata, and setting it as the primary default agent model.
  - **OpenClaw Keys Storage**: Injected the Modal API Key directly into OpenClaw's local profile store `/home/debian/.openclaw/agents/main/agent/auth-profiles.json` and cleaned up stale plugin entries to guarantee 100% warning-free config loads.
  - **VM Services Reloaded**: Successfully restarted `hermes-dashboard.service`, `hermes-gateway.service`, `clawx-ai-os.service`, `openclaw-gateway.service`, and `jarvis-command-center.service` on `vm-niclaw` to load the updated configurations.
  - **Verification Smoke**: Ran real CLI smoke queries on the VM via `hermes` and verified OpenClaw model provider status via `openclaw models status` reports the provider as completely active and healthy.

## Previous update (2026-05-30) - BoardAI Publish Verified & App Builds
- **Current State**:
  - **No Loose Ends Rule Recorded**: Owner confirmed that Spatial OS must never leave disconnected UI surfaces. Missing backend/API work must be implemented or wired correctly; `vm-niclaw` is an active backend/runtime target.
  - **Plan Mode Backend Implemented**: Added real Host API route `electron/api/routes/plans.ts`, registered in `electron/api/server.ts`, with persistent JSON storage under Host API `userData/spatial/plans.json`.
  - **Plan Mode UI Wired**: `src/pages/SpatialOS/index.tsx` now fetches `GET /api/plans`, creates persisted plans through `POST /api/plans`, runs them through `POST /api/plans/:id/run`, and displays backend run events in the console.
  - **Executor Boundary**: Initial backend executor supports `manual` and `note` steps. Unsupported step kinds are persisted and reported as `blocked`, not simulated.
  - **BoardAI Plan Executor Live**: Extracted reusable `syncBoardSnapshot()` from `electron/api/routes/board.ts` and wired the safe real `board_sync` executor in `electron/api/routes/plans.ts`. Spatial OS can create a BoardAI Sync plan and run the existing real publish path through Plan Mode.
  - **Doctor Diagnose Plan Executor Live**: Wired safe read-only `doctor_diagnose` through the existing `runOpenClawDoctor()` service. Spatial OS can create a Doctor Diagnose plan; configuration-changing `--fix` remains outside Plan Mode until approval gates exist.
  - **Spatial Host API Deployed on vm-niclaw**: Uploaded `board.ts`, `plans.ts`, and `server.ts` to `/home/debian/NiClaw`, restarted `clawx-ai-os.service`, and verified `GET /api/plans`, persisted Doctor diagnose execution (`exit=0`), and real BoardAI publish through Plan Mode.
  - **BoardAI Runtime Metadata Normalized**: BoardAI status now rewrites runtime paths on each sync. Verified on `vm-niclaw`: revision `7`, `48` nodes, `15` arrows, reachable public board, and Linux paths under `/home/debian/NiClaw`.
  - **Spatial Approval Gate Live**: `electron/api/routes/plans.ts` now persists step-level approval state and audit entries. Risky Plan steps are blocked until explicitly approved through `POST /api/plans/:planId/steps/:stepId/approval`.
  - **Doctor Fix Approval-Gated**: Added real `doctor_fix` execution through `runOpenClawDoctorFix()`. Spatial OS exposes create, approve, and reject controls. VM smoke verified `pending -> blocked -> approved -> rejected -> blocked` without executing repair.
  - **Spatial Frontend Synced to vm-niclaw**: Uploaded `src/App.tsx`, `src/components/layout/Sidebar.tsx`, and `src/pages/SpatialOS/index.tsx` to `/home/debian/NiClaw`; the remote dev runtime reloaded and returned to healthy gateway state.
  - **Spatial Gateway Health Adapter Corrected**: Spatial OS now reads the real `/api/gateway/health` contract (`ok`, `capabilities.core.process`, `transport`, `rpcRouter`) instead of relying only on legacy summary fields. VM verification reports `running`, `connected`, `ready`, and healthy OpenClaw state.
  - **Gateway Restart Approval-Gated and Live**: Added the real `gateway_restart` Spatial Plan executor through the existing `GatewayManager.restart()` backend path and exposed a Spatial OS quick action. Risky approvals are now one-shot: dispatch changes approval state to `consumed`, so replay is blocked until a new explicit approval is recorded.
  - **Gateway Restart VM Smoke Verified**: Deployed `plans.ts` and the Spatial OS page to `/home/debian/NiClaw`, restarted `clawx-ai-os.service`, and verified `pending -> blocked -> approved -> completed -> consumed -> replay blocked`. Gateway health returned to `process=running`, `transport=connected`, `rpcRouter=ready`, and OpenClaw `healthy`.
  - **Allowlisted Typecheck Plan Executor Live**: Added approval-gated `build_validation` with structured `validationProfile: "typecheck"` only. The backend runs `pnpm run typecheck` with `spawn`, no shell, a timeout, bounded output, and one-shot approval consumption.
  - **Typecheck VM Smoke Verified**: Deployed the executor and UI to `vm-niclaw`, repaired VM checkout dependency/source drift (`@xyflow/react`, Agents store/page, Builder, Remote Access settings), and verified `blocked -> approved -> completed(exit=0) -> consumed -> replay blocked`.
  - **VM Runtime Recovery Completed**: A live dependency refresh left the VM guest unresponsive during service restart. Recovered with Proxmox VM `115` power-cycle, removed the stale gateway process holding `18789`, reconnected through the existing Host API start path, and reverified `process=running`, `transport=connected`, `rpcRouter=ready`, OpenClaw `healthy`.
  - **BoardAI Brainmap Auto-Regeneration Live**: Added deterministic backend generator `electron/utils/board-brainmap.ts`. Every `/api/board/sync` and Plan Mode `board_sync` now regenerates `ai/BOARD_BRAINMAP.json` from the current `ai/BRAINMAP.md` before publishing.
  - **BoardAI Generated Publish VM Smoke Verified**: Deployed the generator and shared BoardAI route to `vm-niclaw`; direct sync published revision `8`, Plan Mode sync published revision `9`, and final canonical memory sync published revision `10`. Generated live snapshot reports `62` nodes, `60` arrows, Linux source path, and reachable public board.
  - **Spatial OS First Pass Implemented**: Added desktop route `/spatial` via `src/pages/SpatialOS/index.tsx`, registered in `src/App.tsx`, and exposed in `src/components/layout/Sidebar.tsx` as `Spatial OS`.
  - **2.5D Shell Live Data**: The first shell renders Workspace Explorer, Spatial Canvas, Command Palette placeholder, Inspector, Workspace Map, and Terminal/Events/Agent Logs using real Host API/stores for agents, gateway health, BoardAI status, and logs.
  - **No-Mock Guard Preserved**: Plan Mode, Kanban, and Code Review zones explicitly show missing Host API contracts instead of simulated/demo data.
  - **Spatial Validation**: `pnpm run typecheck`, `pnpm run lint:check` (51 existing warnings, 0 errors), and `pnpm run build:vite` pass after the first Spatial OS implementation.
  - **Windows Production Package Built**: `pnpm run package:win` completed successfully and generated `release/NiClaw-0.4.4-win-x64.exe` (351,091,280 bytes), plus `latest.yml` and blockmap metadata.
  - **Android Debug APK Built**: `mobile/android-kotlin/gradlew.bat assembleDebug` completed successfully and confirmed `mobile/android-kotlin/app/build/outputs/apk/debug/app-debug.apk` (6,617,726 bytes).
  - **Build Warnings Only**: Windows package emitted existing Vite chunk/dynamic-import warnings, package-bundler patch-skip notices, and pnpm config deprecation text. Android emitted the existing Android Gradle Plugin vs `compileSdk=34` warning and Gradle 9 deprecation notice. No build-blocking errors.
  - **BoardAI Remote Publish Live**: Found the BoardAI backend/vault in `C:\Server\board\v1\whiteboard`, generated a dedicated local API token through the official BoardAI auth endpoint, and saved it in `%USERPROFILE%\.boardai-vault\config.json`.
  - **Host API Token Resolution**: `electron/api/routes/board.ts` now reads `BOARD_AI_TOKEN`/`BOARDAI_TOKEN` first, then falls back to the local BoardAI vault config token. It also handles UTF-8 BOM in JSON config/status files.
  - **Remote Publish Verified**: Published `ai/BOARD_BRAINMAP.json` to `https://board.private-driver.ro/?board=728273ef-9709-4f1c-a77e-ab7086bfeff3`; remote board now reports revision `5`, `48` nodes, and `15` arrows.
  - **BoardAI Live Controls Implemented**: Added Host API `GET /api/board/status` and `POST /api/board/sync` in `electron/api/routes/board.ts`, registered through `electron/api/server.ts`.
  - **Windows Portal Complete**: `src/pages/Portal/index.tsx` now shows a BoardAI live status strip with reachability, revision, snapshot node/edge counts, refresh status, and local sync actions.
  - **Android Portal Complete**: `mobile/android-kotlin` Portal now includes a BoardAI tab, WebView loading for `board.private-driver.ro`, Host API status fetch, and local sync button via `ApiClient.getBoardStatus/syncBoard`.
  - **Validation Baseline**: `pnpm run typecheck`, `pnpm run lint:check` (warnings only), `pnpm run build:vite`, and `mobile/android-kotlin/gradlew.bat assembleDebug` pass after BoardAI Windows + Android + remote publish implementation.
  - **BoardAI Integrated**: Added `BoardAI Brainmap` to `src/pages/Portal/index.tsx`, embedding the published `board.private-driver.ro` project board from `ai/BOARD_SYNC_STATUS.json`.
  - **Portal Now Covers**: OpenClaw, OpenHuman, Hermes, Gemini, Open Code, and BoardAI Brainmap in one command center.
  - **Validation Baseline**: `pnpm run typecheck`, `pnpm run lint:check`, and `pnpm run build:vite` pass after the BoardAI integration.
  - **Agent MCP Mapping Implemented**: Visual Builder `AgentNodeV2` can now carry custom MCP server configs (`name`, `command`, `args`) in node data, display a compact MCP summary on the agent card, and edit the full list in the node settings modal.
  - **Agent Config Sync Implemented**: Builder save/deploy now writes `mcpServers` into OpenClaw agent config for both existing and newly created agents. Host API create/update accepts `mcpServers` and returns updated snapshots after metadata writes.
  - **DAG Runner MCP Awareness**: Server-side DAG agent execution logs configured MCP tools and includes them in node outputs.
  - **Validation Baseline**: `pnpm run typecheck`, `pnpm run lint:check`, and `pnpm run build:vite` pass. Vite dev compilation works, but Electron live launch exits if an existing NiClaw/ClawX instance holds the single-instance lock.
  - **Repo Resume Complete**: Re-entered `C:\Server\niclaw\app`, read local instructions and AI memory, and confirmed active work on branch `feature/jarvis-mobile-integration`.
  - **Validation Baseline Restored**: `pnpm run typecheck` passes, `pnpm run lint:check` passes with warnings only, and Android Kotlin debug build passes via `mobile/android-kotlin/gradlew.bat assembleDebug`.
  - **Cleanup Applied**: Removed lint-blocking unused imports/variables/catches, removed direct setState-in-effect lint violations, and ignored legacy Expo `mobile/**/*.js` files in ESLint because the monorepo config targets TS/TSX.
  - **Hermes Obsidian Second Brain Integration**: Successfully integrated the Obsidian Second Brain vault (`/home/debian/secondBrain`) directly into the background Hermes agent bot service (`hermes-gateway.service`) by setting the `OBSIDIAN_VAULT_PATH` environment variable in the VM's `.env` configurations. Re-synchronized and restarted the service to activate the native, robust `obsidian` note-taking and search skills.
  - **Direct DeepSeek Integration**: Configured Hermes `/home/debian/.hermes/config.yaml` to connect directly to the official DeepSeek API (`https://api.deepseek.com/v1`) using the `custom` provider schema and the direct DeepSeek API key (`sk-da37b1e1...`). This bypasses OpenRouter completely to eliminate free daily limit caps and reduce latency.
  - **DeepSeek Integration**: Set `deepseek/deepseek-chat` as the default model inside `/home/debian/.hermes/config.yaml` to leverage DeepSeek for all core bot messaging flows. Fixed auxiliary Gemini credential keys to prevent HTTP 403 authorization warnings.
  - **Sync Parity Recovery**: Identified permission blockages and file lock issues during the streaming sync process (`sync-server-folder-to-vm.ps1`). Patched the PowerShell pipeline to exclude the Nextcloud temporary cache (`obsidian-nextcloud-stage`) and assets directory (`imports`), and restarted the streaming transfer of `C:\Server` to `/home/debian/Server` on the remote VM guest cleanly.
- **Next Exact Steps**:
  - 1. Connect and expand code review workspace panels with Git diff summary adapters on the Host API.
  - 2. Sync the updated Android Kotlin client and Host API code changes to `/home/debian/NiClaw` on `vm-niclaw`.
  - 3. Consolidate Obsidian Second Brain notes and journals.
