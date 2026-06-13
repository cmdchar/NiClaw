# CHANGELOG - ClawX AI Updates

## (2026-06-13) - Dev Command Center Phase 1 Native Module
- Added native `/command-center` route and sidebar entry inside NiClaw Desktop.
- Added Host API route handler `electron/api/routes/command-center.ts` with real endpoints for status, projects, git repositories, tasks, logs, reports, inbox entry creation, and report generation.
- Added defensive services for workspace scanning, git monitoring, server health, local dev-vault management, and command-center report generation.
- Added `src/pages/CommandCenter/index.tsx` dashboard that consumes real Host API data only and shows honest empty/error states.
- Removed the local Agent Mesh fake status patch that forced `niclaw-host-api` to `online`; mesh status now remains backend-authoritative.
- Verified `pnpm run typecheck` and `pnpm run build:vite` successfully on Windows.

## (2026-06-12) - SuperHermes Council Integration
- **Council Session & Decision Engine (Completed)**:
  - Migrated the SuperHermes decision engine natively to TypeScript/React inside NiClaw, eliminating the need for an external Python backend.
  - Implemented `CouncilEngine` with a multi-agent orchestrated workflow (Strategist, Architect, Reviewer, QA) that outputs to a decoupled `superhermes-state.json`.
  - Added Council APIs under `routes/council.ts` and registered them with the core HTTP server.
  - Added the Council visualization UI to the SpatialOS dashboard, routing to a new `CouncilHarness` view for reviewing and voting on council decisions.
  - All typecheck (`npm run typecheck`) and build steps (`npm run build:vite`) pass successfully.


## (2026-06-06) - Upstream Merge & UI Conflicts Resolution
- **Upstream Merge (Completed)**:
  - Fetched and merged `upstream/feature/ai-os-transformation-2031423738236411694` into local `feature/jarvis-mobile-integration` branch.
  - Resolved 8 critical merge conflicts in UI, layout, routing (`src/App.tsx`, `src/components/layout/Sidebar.tsx`), pages (`src/pages/Agents/index.tsx`, `src/pages/Builder/index.tsx`), and types/stores (`electron/api/routes/agents.ts`, `electron/utils/agent-config.ts`, `mobile/package.json`, `src/types/agent.ts`).
  - Preserved existing JARVIS Android integration, Spatial OS, Portal, and Governance routes while incorporating new OS Analytics and Execution Trace capabilities from the upstream AI OS transformation.
  - Successfully verified TypeScript types with `tsc --noEmit` and completed production build via `pnpm run build:vite`.
  - Pushed the merged commit to self-hosted repository `https://forgejo.dracarys.ro/ai-operator/NiClaw`.

## (2026-06-05) - Full Android Feature Parity: Dreams, Cron, Skills, Models & Headless Fixes
- **Obsidian Second Brain Vault Browser (Completed)**:
  - Added `electron/api/routes/obsidian.ts` with 6 endpoints: `GET /api/obsidian/status`, `GET /api/obsidian/browse?path=`, `GET /api/obsidian/read?path=`, `POST /api/obsidian/search`, `GET /api/obsidian/today`, `GET /api/obsidian/recent-journals`. Vault path from `OBSIDIAN_VAULT_PATH=/home/debian/secondBrain`. Directory traversal protected.
  - Registered `handleObsidianRoutes` in `electron/api/server.ts`.
  - Created `ObsidianFragment.kt` with pinned notes (Today, CENTRALBRAIN, NiClaw Brain, Projects, Runbooks), folder tree browser with breadcrumb, inline markdown reader, and full-text search with snippets.
  - Created `fragment_obsidian.xml` (purple theme) and `item_obsidian_entry.xml`.
  - Added `obsidianStatus`, `obsidianBrowse`, `obsidianRead`, `obsidianSearch`, `obsidianToday`, `obsidianRecentJournals` in `ApiClient.kt`.
  - Added `btnConfigureObsidian` (violet "🧠 Memorie Second Brain") in `fragment_settings.xml` and wired `SettingsFragment.kt`.
  - Deployed `obsidian.ts` + `server.ts` to `vm-niclaw`, `clawx-ai-os.service` restarted (active).
  - Desktop `tsc --noEmit` passes (0 errors). Android `gradlew assembleDebug` BUILD SUCCESSFUL (1m 37s). APK installed on `3650f58e` and archived to OneDrive.

- **Gateway RPC Proxy Endpoint (Completed)**:
  - Added `POST /api/gateway/rpc` route in [gateway.ts](file:///c:/Server/niclaw/app/electron/api/routes/gateway.ts) to forward arbitrary remote method execution calls (e.g. `doctor.memory.*`, `config.*`) from Android to `gatewayManager.rpc()`.
  - Deployed updated `gateway.ts` to `/home/debian/NiClaw` on `vm-niclaw` and restarted `clawx-ai-os.service`.
- **Headless Electron Crash Guards (Completed)**:
  - Patched [ipc-handlers.ts](file:///c:/Server/niclaw/app/electron/main/ipc-handlers.ts) to add null-safe guards for all `mainWindow` checks, preventing crashes when running headlessly on the VM (`CLAWX_HEADLESS=1`).
- **Skills Toggle Host API Endpoint (Completed)**:
  - Added `POST /api/skills/toggle` in [skills.ts](file:///c:/Server/niclaw/app/electron/api/routes/skills.ts) accepting `{ skillKey, enabled }` and dispatching `skills.update` RPC to the gateway.
- **Android Chat Status Indicator Fix (Completed)**:
  - Updated [ChatFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ChatFragment.kt) to use `backgroundTintList` instead of `setBackgroundColor`, preserving the circular shape of the status indicator.
- **Android Dreams Sub-Screen (Completed)**:
  - Created [DreamsFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/DreamsFragment.kt) with memory consolidation metrics cards (total/grounded/ungrounded memories, last consolidation timestamp), doctor action buttons (Backfill, Deduplicate, Repair, Reset Grounded, Reset Diary), phase/signal/diary containers, and config patch toggles.
  - Created layouts [fragment_dreams.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/fragment_dreams.xml), [item_dream_phase.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/item_dream_phase.xml), [item_dream_signal.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/item_dream_signal.xml), and [item_dream_diary.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/item_dream_diary.xml).
  - Wired `btnConfigureDreams` in [SettingsFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/SettingsFragment.kt) with back-stack fragment transaction.
- **Android Cron Jobs Sub-Screen (Completed)**:
  - Created [CronFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/CronFragment.kt) with job list, toggle Switch, manual trigger button, and status/schedule display.
  - Created layouts [fragment_cron.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/fragment_cron.xml) and [item_cron.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/item_cron.xml).
  - Added API helpers `getCronJobs`, `toggleCronJob`, `triggerCronJob` in [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt).
- **Android Skills Sub-Screen (Completed)**:
  - Created [SkillsFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/SkillsFragment.kt) with skill icon, version badge, name, description, source badge, and enable/disable Switch.
  - Created layouts [fragment_skills.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/fragment_skills.xml) and [item_skill.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/item_skill.xml).
  - Added API helpers `getSkillsQuickAccess`, `toggleSkill` in [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt).
- **Android Models/Providers Sub-Screen (Completed)**:
  - Created [ModelsFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ModelsFragment.kt) with provider accounts list, vendor icon mapping, default badge, enable/disable Switch, and "Set Default" button.
  - Created layouts [fragment_models.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/fragment_models.xml) and [item_model.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/item_model.xml).
  - Added API helpers `getProviderAccounts`, `getProviderVendors`, `getDefaultProviderAccount`, `setDefaultProviderAccount`, `toggleProviderAccount` in [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt).
- **Android Settings Navigation Expansion (Completed)**:
  - Added "Administrare Servicii" card with Cron, Skills, Models buttons and "Consolidare Memorie (Dreams)" button in [fragment_settings.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/fragment_settings.xml).
  - All new sub-screens navigate via fragment transactions with back-stack support.
- **Gateway RPC Client Helper (Completed)**:
  - Added generic `gatewayRpc` method in [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt) to dispatch arbitrary RPC calls through `POST /api/gateway/rpc`.
- **Validation & Deployment (Completed)**:
  - Desktop `pnpm run typecheck` passes with 0 errors.
  - Android `gradlew.bat clean assembleDebug` BUILD SUCCESSFUL (warnings only, 65s).
  - APK installed on phone `3650f58e` via ADB streamed install.
  - APK archived to `C:\Users\nicus\OneDrive\Documents\111SERVER\NiClaw-Companion.apk`.
  - Updated `gateway.ts` deployed to `vm-niclaw` and `clawx-ai-os.service` restarted (active).

## (2026-06-02) - Android Spatial Companion, Gated Shell, & Kanban OS
- **Tailscale HTTPS Host API Proxy & Android Companion Port Fix (Completed)**:
  - Configured a new Tailscale serve proxy on the VM: `https://vm-niclaw.tail7a9097.ts.net:13210` now securely proxies to local Host API port `13210`.
  - Modified [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt) to route HTTPS Host API calls to port `:13210` instead of the root domain (which was routed to the 18789 Gateway), ensuring 100% reachability of plans and actions from the phone.
  - Added active HTTP request logging middleware inside [server.ts](file:///c:/Server/niclaw/app/electron/api/server.ts) to log methods, paths, query tokens, and remote IPs.
  - Recompiled the Android Kotlin App with Gradle and copied the updated APK to the user's synced OneDrive safe folder: `C:\Users\nicus\OneDrive\Documents\111SERVER\NiClaw-Companion.apk`.
- **Spatial OS Host API & Browser Executors (Completed)**:
  - Added full implementation logic for `'host_api'` and `'browser'` plan step executors inside [plans.ts](file:///c:/Server/niclaw/app/electron/api/routes/plans.ts).
  - Configured `host_api` executor to dispatch local HTTP requests securely to the local API server using `hostApiToken` fetched dynamically from context.
  - Configured `browser` executor to run headless browser automation using native Electron `BrowserWindow` instances with sandbox constraints, returning evaluate results.
  - Added new quick plan buttons (`Create Host API Plan`, `Create Browser Plan`) in [index.tsx](file:///C:/Server/niclaw/app/src/pages/SpatialOS/index.tsx).
- **Spatial OS 2.5D Visual Shell Polish (Completed)**:
  - Refactored zone buttons in [index.tsx](file:///C:/Server/niclaw/app/src/pages/SpatialOS/index.tsx) to premium glassmorphic cards with subtle isometric 3D transform effect on hover.
  - Integrated custom neon pulsing glow state indicators for each canvas zone mapping dynamically to their operational status.
- **Agent Harness Panel Expansions (Completed)**:
  - Overhauled [AgentHarnessDetailsCard](file:///c:/Server/niclaw/app/src/pages/SpatialOS/index.tsx) layout to a responsive 3-column grid.
  - Added full support for manual approval gates toggles, active MCP server configuration lists (status pulses + cmd details), logs, and pause/resume buttons.
  - Synchronized [agents.ts](file:///c:/Server/niclaw/app/src/stores/agents.ts) Zustand store and [agent.ts](file:///c:/Server/niclaw/app/src/types/agent.ts) type schemas to enable clean validation and persistence on backend PUT configurations.
- **Gated Shell Executor (Completed)**:
  - Created [shell-execution.ts](file:///c:/Server/niclaw/app/electron/utils/shell-execution.ts) with strict allowlist and `shell: false` spawn controls to prevent command chaining.
  - Integrated shell executor into [plans.ts](file:///c:/Server/niclaw/app/electron/api/routes/plans.ts) and registered `shell` as a supported plan executor.
- **Kanban Task Board (Completed)**:
  - Built [tasks.ts](file:///c:/Server/niclaw/app/electron/api/routes/tasks.ts) for persistent tasks CRUD, registered in [server.ts](file:///c:/Server/niclaw/app/electron/api/server.ts).
  - Built frontend Zustand store [tasks.ts](file:///c:/Server/niclaw/app/src/stores/tasks.ts) and integrated a fully functional Kanban board inside [index.tsx](file:///c:/Server/niclaw/app/src/pages/SpatialOS/index.tsx) linked to plans, agents, and files.
- **Android Spatial Companion E2E Integration (Completed)**:
  - Swapped Channels tab with Spatial tab in [bottom_nav_menu.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/menu/bottom_nav_menu.xml) to keep a maximum of 5 bottom navigation items.
  - Integrated [SpatialFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/SpatialFragment.kt) in [MainActivity.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/MainActivity.kt) and added API helpers in [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt) for plan status, event logs, and step approval.
  - Added new REST client methods in [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt): `toggleAgentPause`, `getGatewayHealth`, `getTasks`, `createTask`, `updateTaskStatus`, and `deleteTask`.
  - Overhauled [fragment_spatial.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/fragment_spatial.xml) to incorporate:
    1. **System Health Metrics Card**: Live status fields for Gateway State, Transport Connection, RPC Router readiness, and BoardAI Reachability/Revision.
    2. **Agent Harness Card**: A vertical LinearLayout layout container to display live agents with pause/resume switches.
    3. **Kanban Task Board Card**: A segmented filter tab layout (To Do / In Progress / Done) showing tasks, with action buttons to move task status or delete tasks, plus a "+ Adaugă Task" creator button.
  - Created layouts [item_spatial_agent.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/item_spatial_agent.xml) for agent harness items, [item_spatial_task.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/item_spatial_task.xml) for Kanban task cards, and [dialog_spatial_task_editor.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/dialog_spatial_task_editor.xml) for the interactive add task popup.
  - Rewrote [SpatialFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/SpatialFragment.kt) to bind all new UI components, poll gateway health and BoardAI status dynamically, bind switches to trigger `toggleAgentPause`, and manage task CRUD & movement between columns.
  - Nested Channels configuration inside Settings: Added `Configurează Canale Bot` Card & Button in [fragment_settings.xml](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/res/layout/fragment_settings.xml) and wired [SettingsFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/SettingsFragment.kt) to load [ChannelsFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ChannelsFragment.kt) using dynamic transactions.
  - Fixed Kotlin textStyle compilation error by changing it to `.setTypeface(null, Typeface.BOLD)` in [SpatialFragment.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/SpatialFragment.kt).
- **Validation, VM Sync, and Memory Refresh**:
  - Removed unused import `AlertTriangle` in [index.tsx](file:///c:/Server/niclaw/app/src/pages/SpatialOS/index.tsx) to fix TypeScript compilation error.
  - Successfully compiled the Android APK (`gradlew.bat assembleDebug`).
  - Synced the updated `SpatialOS` source to `vm-niclaw` and restarted `clawx-ai-os.service`.
  - Refreshed local Obsidian Second Brain knowledge compilation.
- **Android Companion Token Mismatch & Timeout Resolution (Completed)**:
  - Aligned the phone's gateway token with the VM's active token `clawx-770a755f899751f446c3e7859443bc33` by updating the `JarvisPrefs.xml` file inside the app sandbox via ADB.
  - Modified [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt)'s `getBaseUrl` method to automatically force `https://` scheme on Host API port `13210` when the host domain ends with `.ts.net` (Tailscale), preventing protocol mismatches when the voice server runs on unencrypted WebSocket `ws://` on port `3000`.
  - Increased OkHttpClient's read timeout to 60 seconds in [ApiClient.kt](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/src/main/java/com/jarvis/ApiClient.kt) to support long-running VM executions (e.g. Doctor Diagnose which takes ~24 seconds) without triggering client-side timeouts.
  - Rebuilt the companion app, archived the updated `NiClaw-Companion.apk` to OneDrive, and installed it on the phone.
  - Successfully verified E2E plan execution on the physical phone over Tailscale HTTPS: triggered the `doctor_diagnose` plan, monitored progress, and saw the live execution logs render in the Spatial OS app console on completion.


## (2026-06-01) - Tailscale Connectivity & Secure Port Proxying Verified
- **Tailscale Port & Access Audited**:
  - Audited the active `tailscale serve` proxies on `vm-niclaw` (VM IP `100.78.81.89`), confirming `https://vm-niclaw.tail7a9097.ts.net` successfully proxies to internal OpenClaw Gateway port `18789`.
  - Verified OpenClaw binds to `0.0.0.0` (all network interfaces, including Tailscale) via `"bind": "lan"` in `openclaw.json`.
  - Smoke tested pre-authenticated connection over Tailscale `https://vm-niclaw.tail7a9097.ts.net/?token=clawx-770a755f899751f446c3e7859443bc33`, confirming HTTP 200 and warning-free, secure dashboard loading.
  - Audited secondary services: NousResearch Hermes Web UI (`:8443` -> `7789`), OpenHuman Web UI (`:10000` -> `7788`), and Open Code VS Code (`:8000` -> `8080`) are also fully active and reachable securely.

## (2026-06-01) - Modal API & GLM-5.1 Integration in Hermes & OpenClaw
- **Modal API & GLM-5.1 Integration**:
  - Configured custom provider `modal` (endpoint `https://api.us-west-2.modal.direct/v1` and static Bearer token `modalresearch_cW6iBts2...`) in both Hermes `config.yaml` and OpenClaw `openclaw.json`.
  - Configured `zai-org/GLM-5.1-FP8` as the primary default completions model for both Hermes and OpenClaw agents.
  - Declared `MODAL_API_KEY` in `/home/debian/.hermes/.env` and OpenClaw environment `/opt/jarvis-command-center/server/.env` on the VM guest.
  - Injected the Modal key directly into OpenClaw's local profile store `/home/debian/.openclaw/agents/main/agent/auth-profiles.json`.
  - Cleaned up stale plugin config entries in `openclaw.json` to prevent configuration warnings.
  - Restarted all VM guest systemd services (`hermes-dashboard`, `hermes-gateway`, `clawx-ai-os`, `openclaw-gateway`, and `jarvis-command-center`).
  - Verified OpenClaw models status via `openclaw models status` shows `modal` active, healthy, and warning-free.

## (2026-05-31) - BoardAI brainmap auto-regeneration before publish
- **Canonical Project Map**:
  - Added `electron/utils/board-brainmap.ts` to deterministically transform `ai/BRAINMAP.md` into BoardAI nodes and orthogonal arrows with balanced section layout.
  - Wired `electron/api/routes/board.ts` so every shared `syncBoardSnapshot()` call regenerates `ai/BOARD_BRAINMAP.json` before remote publish.
- **Shared Backend Path**:
  - Desktop Portal, Android Portal, direct `/api/board/sync`, and Spatial Plan `board_sync` continue to use one backend regeneration/publish contract.
- **VM Publish Smoke**:
  - Deployed scoped backend files to `vm-niclaw`; direct sync published revision `8`, Plan Mode sync published revision `9`.
  - Synced canonical memory to the VM and published final revision `10`. Current remote snapshot: `62` nodes, `60` arrows, public board reachable.

## (2026-05-31) - Spatial Plan allowlisted typecheck executor
- **Backend Validation Contract**:
  - Added `electron/utils/build-validation.ts` with structured `typecheck` profile, `spawn` without shell, timeout, and bounded stdout/stderr.
  - Connected approval-gated `build_validation` in `electron/api/routes/plans.ts`; arbitrary profiles remain blocked and approval is consumed after one dispatch.
- **Spatial UI and E2E**:
  - Added `Create Typecheck Plan` in `src/pages/SpatialOS/index.tsx` and asserted its visibility in the targeted Electron E2E.
- **VM Parity Repair and Smoke**:
  - Deployed the executor/UI to `vm-niclaw`. Initial remote typecheck exposed stale VM source/dependency drift; synced the validated local package lock, `@xyflow/react`, Agents store/page, Builder, and Remote Access settings.
  - Verified direct VM typecheck and Spatial Plan flow: `blocked -> approved -> completed(exit=0) -> consumed -> replay blocked`.
  - Recovered a blocked live VM restart through Proxmox VM `115` power-cycle, removed the stale gateway listener, reconnected through Host API `/api/gateway/start`, and reverified `running`, `connected`, `ready`, and OpenClaw `healthy`.

## (2026-05-31) - Spatial Plan gateway restart executor and one-shot approvals
- **Gateway Restart Executor**:
  - Added approval-gated `gateway_restart` in `electron/api/routes/plans.ts` through the existing `ctx.gatewayManager.restart()` backend path.
  - Added `Create Gateway Restart Plan` in `src/pages/SpatialOS/index.tsx` and covered its visibility in the targeted Electron E2E.
- **One-Shot Approval Hardening**:
  - Added `consumed` approval state. Risky executor dispatch consumes approval on success or failure, preventing accidental replay without a fresh explicit approval.
- **Validation and VM Smoke**:
  - `pnpm run typecheck`, `pnpm run lint:check` (51 existing warnings, 0 errors), `pnpm run build:vite`, `git diff --check`, and targeted Playwright Electron E2E pass.
  - Backed up and deployed the scoped backend/UI files to `/home/debian/NiClaw`, restarted `clawx-ai-os.service`, and verified `pending -> blocked -> approved -> completed -> consumed -> replay blocked`.
  - Verified Host API `13210`, Gateway `18789`, core process `running`, transport `connected`, RPC router `ready`, and OpenClaw health `healthy`.

## (2026-05-31) - Spatial Plan approval gates and Doctor fix executor implemented
- **Backend Approval Contract**:
  - Added persisted step-level `requiresApproval`, approval state, timestamps, notes, and audit records in `electron/api/routes/plans.ts`.
  - Added `POST /api/plans/:planId/steps/:stepId/approval` for explicit approve/reject actions.
  - Risky kinds are blocked before executor dispatch until approved.
- **Doctor Fix Executor**:
  - Connected approval-gated `doctor_fix` to the existing `runOpenClawDoctorFix()` backend service.
- **Spatial UI and E2E**:
  - Added Doctor Fix plan creation plus approve/reject controls in `src/pages/SpatialOS/index.tsx`.
  - Added targeted Electron navigation coverage in `tests/e2e/spatial-os-navigation.spec.ts`.
- **Validation and VM Smoke**:
  - `pnpm run typecheck`, `pnpm run lint:check` (51 existing warnings, 0 errors), `pnpm run build:vite`, and targeted Playwright E2E pass.
  - Deployed `plans.ts` to `vm-niclaw`; smoke verified `pending -> blocked -> approved -> rejected -> blocked` while intentionally avoiding repair execution.
  - Synced the Spatial route, sidebar entry, and page UI to `/home/debian/NiClaw`; remote Vite runtime reloaded and returned to healthy gateway state.
  - Corrected the Spatial Gateway health adapter to use the live `/api/gateway/health` capability contract. VM verification reports `ok=true`, process `running`, transport `connected`, RPC router `ready`, and OpenClaw health `healthy`.

## (2026-05-31) - Spatial Host API deployed and smoke-tested on vm-niclaw
- **Scoped VM Deploy**:
  - Backed up the previous Host API files under `/home/debian/NiClaw/.codex-backups/`.
  - Uploaded `electron/api/server.ts`, `electron/api/routes/board.ts`, and `electron/api/routes/plans.ts`, then restarted `clawx-ai-os.service`.
- **Remote Plan Smoke**:
  - Verified `GET /api/plans` persistence under `/home/debian/.config/clawx/spatial/plans.json`.
  - Created and ran a real `doctor_diagnose` plan on the VM; OpenClaw Doctor completed with `exit=0`.
  - Created and ran a real `board_sync` plan; BoardAI publish completed successfully.
- **BoardAI Metadata Fix**:
  - Normalized BoardAI status paths to the runtime project root on every status read and sync.
  - Verified live BoardAI revision `7`, `48` nodes, `15` arrows, reachable public board, and Linux paths under `/home/debian/NiClaw`.

## (2026-05-31) - Spatial Plan Mode Doctor diagnose executor implemented
- **Safe Read-Only Executor**:
  - Added `doctor_diagnose` to `electron/api/routes/plans.ts`, calling the existing `runOpenClawDoctor()` backend service.
  - Plan events persist Doctor exit code, duration, and error detail when present.
  - Kept configuration-changing Doctor `--fix` outside Plan Mode until explicit approval gates are implemented.
- **Spatial UI Quick Action**:
  - Added `Create Doctor Diagnose Plan` in `src/pages/SpatialOS/index.tsx`.
- **Validation**:
  - `pnpm run typecheck`, `pnpm run lint:check` (51 existing warnings, 0 errors), and `pnpm run build:vite` pass.

## (2026-05-31) - Spatial Plan Mode BoardAI executor implemented
- **Shared BoardAI Service**:
  - Extracted reusable `syncBoardSnapshot()` from `electron/api/routes/board.ts`, keeping one real BoardAI publish implementation.
- **Safe Real Plan Executor**:
  - Added `board_sync` to `electron/api/routes/plans.ts`; Plan Mode runs now persist success, warning, or failure events from the real BoardAI adapter.
- **Spatial UI Quick Action**:
  - Added `Create BoardAI Sync Plan` in `src/pages/SpatialOS/index.tsx`.
- **Validation**:
  - `pnpm run typecheck`, `pnpm run lint:check` (51 existing warnings, 0 errors), and `pnpm run build:vite` pass.

## (2026-05-31) - Spatial Plan Mode backend contract implemented
- **No Loose Ends Rule**:
  - Recorded owner rule: backend/API needs must be implemented or correctly wired, never left as final disconnected UI. `vm-niclaw` remains an active backend/runtime target.
- **Host API Plans Route**:
  - Added `electron/api/routes/plans.ts` and registered it in `electron/api/server.ts`.
  - New endpoints: `GET /api/plans`, `POST /api/plans`, `PUT /api/plans/:id`, `POST /api/plans/:id/run`, and `GET /api/plans/:id/events`.
  - Plans persist under Host API user data at `spatial/plans.json`, making the contract usable locally and on `vm-niclaw` when deployed there.
- **Spatial UI Wiring**:
  - `src/pages/SpatialOS/index.tsx` now creates, lists, and runs persisted backend plans.
  - Plan run events are shown in the Spatial console. Unsupported executor kinds are reported as blocked instead of simulated.
- **Validation**:
  - `pnpm run typecheck`, `pnpm run lint:check` (51 existing warnings, 0 errors), and `pnpm run build:vite` pass.

## (2026-05-31) - Spatial OS first desktop shell implemented
- **Desktop Route**:
  - Added `src/pages/SpatialOS/index.tsx` and registered `/spatial` in `src/App.tsx`.
  - Added `Spatial OS` navigation entry in `src/components/layout/Sidebar.tsx`.
- **Live 2.5D Shell**:
  - First pass includes Workspace Explorer, Spatial Canvas, Command Palette shell, Inspector, Workspace Map, and Terminal/Events/Agent Logs.
  - Uses real data paths only: `useAgentsStore`, `useGatewayStore`, `GET /api/gateway/health?probe=1`, `GET /api/board/status`, and `GET /api/logs?tailLines=32`.
  - Plan Mode, Kanban, and Code Review are marked as missing Host API contracts instead of using mock data.
- **Validation**:
  - `pnpm run typecheck` passes.
  - `pnpm run lint:check` passes with 51 existing warnings and 0 errors.
  - `pnpm run build:vite` passes with existing Vite chunk warnings only.

## (2026-05-31) - Principal 2.5D Spatial AI OS direction recorded
- **Direction Confirmed**:
  - Adopted `NiClaw Spatial AI OS` as the main implementation track for the project.
  - Chosen approach: build a functional 2.5D workspace first, inspired by AXIAL STUDIO/SAMS references, then add visual polish after real data/actions are wired.
- **Implementation Plan Captured**:
  - Desktop target: new `/spatial` route with Workspace Explorer, Spatial Canvas, Command Palette, Inspector, Console/Logs, Workspace Map, Plan Mode, Agent Harness, BoardAI, Kanban, and Code Review.
  - Android target: companion `Spatial` tab for status, approvals, plan control, BoardAI sync, and voice commands.
- **Guardrail**:
  - Every Spatial OS panel/zone must be backed by real Host API state or a clearly reported missing backend gap. No fake/demo-only behavior.

## (2026-05-30) - Windows and Android builds completed
- **Windows Build**:
  - Ran the full production packaging pipeline with `pnpm run package:win`.
  - Generated the current isolated NiClaw installer at `release/NiClaw-0.4.4-win-x64.exe` (351,091,280 bytes).
  - Build completed with warnings only: existing Vite chunk/dynamic-import warnings, OpenClaw bundle patch-skip notices, pnpm config deprecation text, and Node `DEP0190` warnings.
- **Android Build**:
  - Ran `mobile/android-kotlin/gradlew.bat assembleDebug`.
  - Confirmed the debug APK at `mobile/android-kotlin/app/build/outputs/apk/debug/app-debug.apk` (6,617,726 bytes).
  - Build completed with warnings only: Android Gradle Plugin 8.1.0 has not been tested with `compileSdk=34`, plus Gradle 9 deprecation notice.
- **Pre-Build Validation Context**:
  - BoardAI smoke verification remained healthy: remote board revision `5`, `48` nodes, and `15` arrows.
  - Prior validation baseline remains green: TypeScript typecheck passes and lint passes with warnings only.

## (2026-05-30) - BoardAI remote publish activated
- **Vault Discovery**:
  - Located the real BoardAI/whiteboard backend and vault tooling at `C:\Server\board\v1\whiteboard`.
  - Used the official BoardAI auth/API token flow to create a local integration token stored outside the repo in `%USERPROFILE%\.boardai-vault\config.json`.
- **Host API Publish Adapter**:
  - Updated `electron/api/routes/board.ts` to resolve BoardAI tokens from env first and local vault config second.
  - Added BOM-tolerant JSON reads for BoardAI status/config files.
  - `/api/board/sync` can now publish `ai/BOARD_BRAINMAP.json` to `PUT /api/boards/:id` with the real BoardAI contract.
- **Live Verification**:
  - Published the app brainmap to `board.private-driver.ro`; remote board now reports revision `5`, `48` nodes, and `15` arrows.
  - Validation: `pnpm run typecheck`, `pnpm run lint:check` (warnings only), `pnpm run build:vite`, and Android `gradlew.bat assembleDebug` pass.

## (2026-05-29) - BoardAI Live Controls on Windows and Android
- **Host API Board Routes**:
  - Added `electron/api/routes/board.ts` and registered it in `electron/api/server.ts`.
  - `GET /api/board/status` reads `ai/BOARD_SYNC_STATUS.json`, probes `board.private-driver.ro`, and summarizes `ai/BOARD_BRAINMAP.json` node/link counts.
  - `POST /api/board/sync` refreshes local BoardAI sync metadata and revision without pretending to publish remotely.
- **Windows Portal**:
  - `src/pages/Portal/index.tsx` now shows BoardAI reachability, revision, snapshot counts, last local sync, and explicit remote publish configuration state.
  - Added status refresh and local sync actions through `hostApiFetch`.
- **Android Portal**:
  - Added a `BoardAI` Portal tab, BoardAI status bar, `Status` and `Sync` controls, plus `ApiClient.getBoardStatus/syncBoard`.
- **Validation Results**:
  - `pnpm run typecheck`, `pnpm run lint:check`, `pnpm run build:vite`, and `mobile/android-kotlin/gradlew.bat assembleDebug` pass.

## (2026-05-29) - BoardAI Private Driver Portal Integration
- **BoardAI Portal Tab**:
  - Added `BoardAI Brainmap` as a first-class Agent Portal tab in `src/pages/Portal/index.tsx`.
  - Integrated the published project board URL from `ai/BOARD_SYNC_STATUS.json`: `https://board.private-driver.ro/?board=728273ef-9709-4f1c-a77e-ab7086bfeff3`.
  - Added a `Network` icon and live board chip so the project brainmap is accessible next to OpenClaw, OpenHuman, Hermes, Gemini, and Open Code.
- **Validation Results**:
  - `pnpm run typecheck` passes.
  - `pnpm run lint:check` passes with warnings only.
  - `pnpm run build:vite` passes.

## (2026-05-29) - Visual Builder Agent MCP Tool Mapping
- **AgentNodeV2 MCP Configuration**:
  - Added editable MCP server configuration to `src/pages/Builder/index.tsx` for Agent nodes, including server name, command, and args.
  - Agent cards now show an MCP tool count and compact server-name summary directly in the embedded parameter surface.
- **Agent Config Sync**:
  - Visual Builder save/deploy now syncs `mcpServers` into existing and newly created OpenClaw agents through `useAgentsStore.updateAgent/createAgent`.
  - `electron/api/routes/agents.ts` now accepts `mcpServers` on create/update and returns the updated snapshot after post-create metadata writes.
  - `electron/utils/agent-config.ts` now includes `mcpServers` in the host API `AgentSummary` shape.
- **DAG Runner Awareness**:
  - `shared/jarvis-server/core/dagRunner.ts` now carries MCP server metadata through agent node execution logs and outputs so server-side runs expose the configured tool surface.
- **Validation Results**:
  - `pnpm run typecheck` passes.
  - `pnpm run lint:check` passes with warnings only.
  - `pnpm run build:vite` passes; dev run compiles, then Electron exits because an existing app instance owns the single-instance lock.

## (2026-05-27) - Project Resume Baseline & Validation Cleanup
- **Session Resume / Repo Analysis**:
  - Re-read `AGENTS.md`, `ai/BRAIN.md`, `ai/TASKS.md`, and `ai/BRAINMAP.md` before continuing work in `C:\Server\niclaw\app`.
  - Confirmed active branch `feature/jarvis-mobile-integration` with pending Visual Builder V2, Portal, Jarvis server, and Android companion changes.
- **Lint / Typecheck Stabilization**:
  - Fixed ESLint errors in `src/pages/Portal/index.tsx`, `src/pages/Builder/index.tsx`, `shared/jarvis-server/core/dagRunner.ts`, `shared/jarvis-server/core/ai_engine.ts`, `electron/api/routes/agents.ts`, and `src/components/settings/RemoteAccessSettings.tsx`.
  - Updated `eslint.config.mjs` to ignore legacy Expo JS files under `mobile/**/*.js`, since this monorepo ESLint config only supports TS/TSX and parsed `mobile/App.js` JSX as invalid JavaScript.
- **Validation Results**:
  - `pnpm run typecheck` passes.
  - `pnpm run lint:check` passes with warnings only (`no-explicit-any` remains in existing dynamic integration surfaces).
  - `mobile/android-kotlin/gradlew.bat assembleDebug` passes with only the Android SDK XML version warning.
  - Added `**/.gradle/` to `.gitignore` so Android build cache folders do not pollute `git status`.

## (2026-05-27) - Hermes Obsidian Second Brain Integration & Sync Recovery
- **Hermes Obsidian Note-Taking Integration**:
  - Configured the environment variable `OBSIDIAN_VAULT_PATH=/home/debian/secondBrain` in the VM guest environments `/home/debian/.hermes/.env` and `/home/debian/hermes-agent/.env` to point directly to the remote Obsidian Second Brain mirror vault.
  - Successfully restarted the `hermes-gateway.service` systemd service on `vm-niclaw` to load the updated environment values, enabling the builtin `obsidian` note-taking skill instantly.
- **Direct DeepSeek Integration**:
  - Reconfigured the default model inside `/home/debian/.hermes/config.yaml` to connect directly to the official DeepSeek API (`https://api.deepseek.com/v1`) under the `custom` provider schema, using the direct API key (`sk-da37b1e1...`). This bypasses OpenRouter completely to reduce latency and eliminate free-tier daily key limits.
- **DeepSeek Integration**:
  - Set `deepseek/deepseek-chat` as the primary LLM model in `/home/debian/.hermes/config.yaml` to route all default bot inference requests through DeepSeek.
  - Updated the auxiliary Gemini credentials in `/home/debian/.hermes/config.yaml` to the version 2 keys to prevent title-generation authentication failures.
- **Sync Recovery and Permission Exclusions**:
  - Excluded the lock-prone Nextcloud staging directory `obsidian-nextcloud-stage` and the imported assets directory `imports` inside the `C:\Server\AI\sync-server-folder-to-vm.ps1` backup pipeline to circumvent active OS lock conflicts and `Permission denied` blockages.
  - Re-initiated the background streaming sync task safely to guarantee full server codebase parity on the VM.

## (2026-05-26) - Inline Remote VM Second Brain Sync Integration
- **Inlined VM Sync Automation**:
  - Integrated the recursive SCP sync logic of `sync-secondbrain-to-vm.ps1` directly inside the core memory compiler [refresh-server-obsidian-knowledge.ps1](file:///C:/Server/AI/refresh-server-obsidian-knowledge.ps1).
  - Encapsulated the VM guest sync sequence (`debian@10.10.1.219:/home/debian/secondBrain`) within an `Invoke-OptionalStep` block to ensure that any transient network or VM connectivity issues do not block other local and cloud sync routines (such as Nextcloud).
  - Verified the entire E2E automatic compilation and mirror execution successfully.

## (2026-05-26) - Remote VM Second Brain Mirror Sync
- **Obsidian Second Brain VM Integration**:
  - Engineered the PowerShell automation [sync-secondbrain-to-vm.ps1](file:///C:/Server/AI/sync-secondbrain-to-vm.ps1) to recursively push the entire local Obsidian Second Brain directory (`D:\Onedrive\SecondBrain\secondBrain`) to `/home/debian/secondBrain` on `vm-niclaw` remote guest using SCP.
  - Integrated the VM mirror sync step directly into the core knowledge compilation script [refresh-server-obsidian-knowledge.ps1](file:///C:/Server/AI/refresh-server-obsidian-knowledge.ps1).
  - Successfully verified execution, creating the target folders on the Debian VM guest and transferring all 553 knowledge vault nodes and folders (`SERVER Graph`, `Projects`, `Runbooks`, `Meta`, `Journals`) cleanly.

## (2026-05-26) - Visual Swarm Builder V2 (Advanced Visual AI IDE & Server-Side DAG Runner)
- **Advanced Visual AI IDE Upgrades**:
  - Re-engineered `src/pages/Builder/index.tsx` with custom interactive V2 nodes: `TriggerNodeV2` (Webhook & Cron configurations), `AgentNodeV2` (embedded LLM model selection and temperature sliders), `RouterNode` (If/Else logic paths with top/bottom binary handles), `CodeNode` (embedded custom JS editor textarea), `KnowledgeNodeV2`, and `ActionNodeV2`.
  - Added a **Retractable Swarm Debug Console** displaying logs, warnings, successes, and time tags.
- **Server-Side DAG Execution Engine (`dagRunner.ts`)**:
  - Created a robust async Directed Acyclic Graph (DAG) executor in `shared/jarvis-server/core/dagRunner.ts` that resolves dependencies topologically.
  - Implemented node executors: Trigger nodes, Agent nodes (calling Google Gemini), Router nodes (evaluating string and regex match decisions), Code nodes (sandboxed custom JavaScript execution using Node's native `vm` module), Knowledge nodes (injecting file system data), and Action nodes (executing Bash shell CLI commands or sending Telegram notifications).
  - Registered the `/api/swarm/run` POST route in `shared/jarvis-server/api/main.ts` to trigger visual workflow runs natively.
- **VM Deployment & E2E Integration**:
  - Successfully transferred code adjustments to `/opt/jarvis-command-center/server` on the Debian VM guest.
  - Compiled backend TypeScript (`tsc`) and successfully restarted `jarvis-command-center.service`.
  - Integrated dynamic backend visual flow run simulation within `index.tsx` (using `hostApiFetch` to execute graphs live on the VM with custom neon canvas glowing highlights and real-time execution logs).
- **TypeScript 100% Type-Safety**:
  - Fixed duplicate parameter declaration and unused Lucide icon imports, bringing the entire client and server project compilation to **0 errors and 0 warnings** (`pnpm run typecheck`).

## (2026-05-26) - Secure Gemini API Integration for Hermes
- **Hermes Agent Gemini Key Activation**:
  - Securely decrypted the local vault-backed `env:GEMINI_API_KEY` from the Windows DPAPI storage.
  - Injected `GOOGLE_API_KEY` and `GEMINI_API_KEY` variables securely into the `/home/debian/hermes-agent/.env` configuration on the `vm-niclaw` guest VM.
  - Restarted the background systemd service `hermes-dashboard.service` to apply changes and activate the native OpenAI-compatible Gemini endpoints instantly.

## (2026-05-25) - Android Companion App Complete Parity & Remote Diagnostic Systems
- **Remote Host API Gateway Alignment**:
  - Refactored `electron/api/server.ts` to automatically bind to `0.0.0.0:13210` on `vm-niclaw` when running headlessly (`CLAWX_HEADLESS=1`), opening the gateway to LAN/Tailscale.
  - Added robust authorization to accept dynamic session tokens, persistent `gatewayToken`, or custom environment `CLAWX_API_TOKEN` pre-shared keys.
- **Dynamic Portal Consoles Integration & Chat Playgrounds**:
  - Patched `/chat` routes in `consoles-server.js` (and deployed to the VM) to route Portal console chat messages directly to the OpenClaw Gateway on port `18789` under the correct agent slugs (`openhuman` and `hermes`), completing the E2E chat flow.
- **Android Settings Panel Expansion (Proxy & Diagnostics)**:
  - Extended `fragment_settings.xml` and `SettingsFragment.kt` with premium dark-neon Proxy configuration cards (HTTP/HTTPS host/port, Bypass rules) and Advanced switches (Auto-Start, Developer Mode).
  - Engineered an interactive log terminal in the mobile companion app that fetches remote VM logs (`GET /api/logs`) and executes "OpenClaw Doctor" (`POST /api/app/openclaw-doctor`) to diagnose/fix server issues directly from the phone.
- **Dynamic Channels Integration**:
  - Refactored `ChannelsFragment.kt` to load active accounts dynamically from the server via `ApiClient.getChannels()` and bind switches to toggle them on the server in real-time (`ApiClient.toggleChannel()`).
- **Compilation, Installation & Verification**:
  - Successfully compiled the Kotlin app (`gradlew assembleDebug` in 47s) and installed it over ADB stream onto the physical phone.
- **Chat Duplication Hotfix & Official Hermes Portal Restoration**:
  - Identified and fixed the Android duplicate chat message rendering bug in `MainActivity.kt` and `MessageAdapter.kt` by using `messageCache` as the single source of truth and calling standard RecyclerView `notifyItemInserted`/`notifyItemChanged` notifications, completely eliminating reference duplication.
  - Patched `consoles-server.js` by removing the mock `hermesApp` and `hermesHtml` to free up port `7789` on the VM guest.
  - Copied updated `consoles-server.js` to `/opt/jarvis-command-center/server/consoles-server.js` on `vm-niclaw` and restarted `jarvis-consoles.service`.
  - Re-enabled and started `hermes-dashboard.service` to bring back the official premium NousResearch Hermes Agent Web UI cleanly on port `7789` for the Agent Portal.
  - Compiled the updated Android app (`gradlew assembleDebug` in 55s) and successfully re-installed the fixed APK on the physical phone over ADB.

## (2026-05-25) - Complete Android Mobile Feature Parity & Dynamic Swarm Management
- **Full Architecture Overhaul to Fragments**:
  - Replaced the dual-container layout in `MainActivity.kt` with a premium five-tab `BottomNavigationView` routing system.
  - Implemented modular screen fragments: `ChatFragment`, `AgentsFragment`, `ChannelsFragment`, `PortalFragment`, and `SettingsFragment`.
- **Chat and Voice Session Persistence**:
  - Engineered a thread-safe message cache inside `MainActivity.kt` that preserves user-assistant conversation histories across fragment changes and lifecycle events.
  - Dynamic STT/TTS Romanian loop bindings allowing background responses to route cleanly into active chat interfaces.
- **Dynamic Portal & Native Controls**:
  - Upgraded browser controls: WebChromeClient progress loaders, clipboard Copy URL capabilities, client-side mute execution via injected JavaScript, and multi-step zoom indicators.
- **Swarm Agents CRUD Management (Phase 3 & 4)**:
  - Developed a standalone `ApiClient.kt` wrapper using OkHttp to consume the ClawX VM Gateway APIs directly.
  - Implemented dynamic listing of active cluster agents with beautiful glowing custom card UI, status badges, and edit/delete triggers.
  - Created a custom card dialog builder (`dialog_agent_editor.xml`) for inline agent creation and parameters tuning.
- **Gateway Control Panel & Channels System**:
  - Added dedicated Settings interface for host WS server url, dynamic ClawX secure tokens, and Assistant audio synthesis language.
  - Engineered a server command panel allowing the user to trigger gateway service restarts remotely.

## (2026-05-25) - Official OpenHuman Integration, VS Code Web (Open Code) & Fully-Functional Browser Console
- **Official OpenHuman Core Integration**:
  - Cloned the real, official **OpenHuman** repository (`https://github.com/tinyhumansai/openhuman.git`) under `/home/debian/openhuman` on `vm-niclaw`.
  - Built the official React frontend SPA statically: compiled assets directly to `/home/debian/openhuman/app/dist-web/` via `pnpm --filter openhuman-app build:web`.
  - Installed all required native compilation headers and compilers on the remote Debian VM: `pkg-config`, `libssl-dev`, `libasound2-dev` (ALSA), `clang`, `libclang-dev` (Clang/bindgen), `cmake`, `libx11-dev`, `libxtst-dev`, `libxdo-dev` (X11/enigo/rdev).
  - Successfully compiled the native Rust core daemon `openhuman-core` in release mode (`cargo build --release`).
  - Set up and enabled a native background systemd service `/etc/systemd/system/openhuman-core.service` binding port `17788` internally.
  - Refactored `consoles-server.js` (and `/opt/jarvis-command-center/server/consoles-server.js` on VM) to statically serve the compiled OpenHuman frontend assets on port `7788` and transparently proxy `POST /rpc` calls to the Rust core daemon on port `17788`.
- **Open Code (VS Code Server) Integration**:
  - Installed VS Code `code-server` natively on `vm-niclaw`.
  - Configured `/home/debian/.config/code-server/config.yaml` to run passwordless in the secure Tailnet boundary (`auth: none`, `bind-addr: 127.0.0.1:8080`).
  - Setup background Tailscale Serve proxy mapping secure port `8000` to HTTP `8080` (`https://vm-niclaw.tail7a9097.ts.net:8000/`).
  - Configured and enabled `code-server@debian` systemd daemon service; verified fully operational inside the Agent Portal workspace.
- **Fully-Functional Agent Portal Browser Console**:
  - Overhauled the desktop client Agent Portal (`src/pages/Portal/index.tsx`):
    - Replaced the static Address Bar with a fully editable `<form>` address input bar allowing users to type custom URLs or IPs and press Enter to navigate.
    - Added Lock/Unlock context security indicators based on active HTTPS protocols.
    - Added a **Developer Tools Console (DevTools)** toggle button inside the browser HUD, executing `webviewRef.current.openDevTools()` directly.
    - Added an **Audio Mute/Unmute** toggle button inside the HUD using `webviewRef.current.setAudioMuted(nextMute)`.
    - Added a quick **Copy URL** button to copy current tab URLs to the clipboard.
    - Registered the new **Open Code (VS Code)** agent tab in the `portalAgents` array mapping to port `8080` (HTTP) / `8000` (HTTPS).
  - Verified 100% clean TypeScript type-checking with **0 errors and 0 warnings** (`pnpm tsc --noEmit`).

## (2026-05-25) - NousResearch Hermes Dashboard & Secure HTTPS Agent Portal
- **Secure HTTPS Agent Portal**:
  - Configured full background Tailscale Serve HTTPS proxies on the VM for all core agent services:
    - `https://vm-niclaw.tail7a9097.ts.net/` -> OpenClaw Gateway (port 18789) mapped to root (port 443)
    - `https://vm-niclaw.tail7a9097.ts.net:8443/` -> NousResearch Hermes Dashboard (port 7789)
    - `https://vm-niclaw.tail7a9097.ts.net:10000/` -> OpenHuman Core (port 7788)
  - Updated React 19 Client Agent Portal (`Portal/index.tsx`) to detect HTTPS hosts and dynamically route standard HTTP ports (`7788`, `7789`) to their secure Tailscale proxies (`10000`, `8443`), resolving insecure browser context errors.
- **NousResearch Hermes Integration**:
  - Replaced the mock Express chat console with the real **NousResearch Hermes Agent Dashboard** (`https://github.com/NousResearch/hermes-agent.git`) on VM port 7789.
  - Setup a permanent systemd service `/etc/systemd/system/hermes-dashboard.service` on `vm-niclaw` to start and manage the official React 19 + FastAPI Hermes dashboard cleanly on boot.
  - Verified 100% functional navigation, authentic user interface loading, and zero TypeScript compilation errors.

## (2026-05-25) - Visual Builder Telegram Triggers & Actions Integration
- **Telegram Visual Builder Integration**:
  - Engineered direct support for Telegram triggers and actions within the ClawX AI OS Visual Builder (`src/pages/Builder/index.tsx`).
  - Added a **Telegram Msg Input** trigger item to the components palette utilizing the standard Lucide `Send` icon in distinct sky-blue (`text-sky-500`) typography, allowing users to trace chats directly from their Telegram channels/groups.
  - Added a **Telegram Message** action item to the components palette allowing agents to publish results back to Telegram.
  - Upgraded `TriggerNode` and `ActionNode` components to natively render the Telegram `Send` icon for sky-blue nodes.
  - Enhanced the `NodeSettingsModal` dialog:
    - Added the `send_telegram` option to the Actions dropdown selector.
    - Designed custom input descriptions and placeholders to guide users through specifying Telegram chat/channel IDs or usernames (`@mychannel`).
  - Upgraded the **Swarm Compiler** inside `handleDeploy`:
    - Added parsing rules to compile Telegram Actions (`send_telegram`) directly into executable local CLI routing directives in `AGENTS.md`.
    - Guided the Supreme Orchestrator to execute: `openclaw message send --channel telegram --target "<chat_id>" --message "<text>"`.
  - Verified 100% type safety and clean TypeScript compilation with **0 errors and 0 warnings** (`tsc --noEmit` is clean).

## (2026-05-25) - OpenClaw Tailscale & Remote Bind Resolution
- **OpenClaw Remote Access & HTTPS Serve Integration**:
  - Identified that the OpenClaw gateway service failed to listen externally because it was restricted by `gateway.bind` set to `"auto"` (which resolves to localhost `127.0.0.1`) and had unrecognized `listenAddress` flags causing service crashes.
  - Successfully patched `/home/debian/.openclaw/openclaw.json` on `vm-niclaw` (IP `100.78.81.89`) using custom Node script execution:
    - Set `"gateway.bind": "lan"` to permit listening on all network interfaces (equivalent to `0.0.0.0`).
    - Set `"gateway.mode": "local"` to comply with default configuration integrity validation constraints.
    - Set `"gateway.tailscale.mode": "off"` to run the standard HTTP gateway externally and let Tailscale route it seamlessly.
    - Enabled `"gateway.controlUi.allowInsecureAuth": true` to allow browser access to the console over plain-HTTP on the secure Tailscale IP.
    - Removed the unsupported `gateway.listenAddress` key which was triggering critical startup validation errors.
  - Restarted the user-level systemd service `openclaw-gateway.service` on the VM guest.
  - Identified that modern browsers block authentication in insecure HTTP contexts (due to disabled Web Crypto APIs on non-localhost/non-HTTPS connections).
  - Executed `sudo tailscale serve --bg 18789` on `vm-niclaw` to expose the local gateway port via securely-signed Tailscale HTTPS.
  - Verified remote connection and resolved trusted SSL mapping: `https://vm-niclaw.tail7a9097.ts.net/` is fully operational (`TcpTestSucceeded: True` on port `443` over Tailscale).

## (2026-05-25) - Android Kotlin Native Debug Compilation & Verification
- **Gradle Debug Compilation**:
  - Configured local environment variables: `JAVA_HOME` to `C:\Program Files\Android\Android Studio\jbr` and `ANDROID_HOME` to `C:\Users\nicus\AppData\Local\Android\Sdk`.
  - Executed `gradlew.bat assembleDebug` inside the Kotlin Native Android app project directory `c:\Server\niclaw\app\mobile\android-kotlin`.
  - Successfully compiled the application in **1m 14s** with 32 actionable tasks executed.
- **APK Verification**:
  - Located the generated debug APK file successfully at: [app-debug.apk](file:///c:/Server/niclaw/app/mobile/android-kotlin/app/build/outputs/apk/debug/app-debug.apk).
  - Verified compilation integrity and confirmed that the build process completed without errors.

## (2026-05-25) - Comparative Repository Analysis & Mobile Integration Roadmap
- **Jarvis Repository Integration**:
  - Cloned the `silver-parakeet` (Jarvis AI) repository from GitHub (`https://github.com/evelyn5877-bot/silver-parakeet.git`) into `C:\Server\niclaw\niclawjules`.
  - Explored and analyzed both codebases side-by-side (`niclawjules` vs `app`).
  - Evaluated architectural modularity, agent and AI control logic (Hermes/Gemini vs OpenClaw swarms), visual canvas builder execution, and file structure diagnostics.
  - Successfully copied and integrated the complete native **Kotlin Android voice companion app** from `niclawjules` into `C:\Server\niclaw\app\mobile\android-kotlin` to preserve the native Romanian speech STT/TTS loop and direct OS intents (flashlight, apps, calls) inside the active monorepo.
  - Copied and integrated the lightweight **Jarvis Node/Express TS server** from `niclawjules` into `C:\Server\niclaw\app\shared\jarvis-server` for intent mapping and OpenClaw proxy services.
- **Native Android & Voice Integration Discovery**:
  - Discovered a fully functional, high-fidelity Kotlin Native Android app inside the cloned repo that implements a Roman Voice synthesis / STT feedback loop (`SpeechRecognizer` and `TextToSpeech` configured for Romanian).
  - Identified native OS execution capabilities via custom intents (`open_app`, `open_url`, `toggle_flashlight`, `open_settings`, `make_call`).
  - Documented that the active workspace Expo companion app lacks voice feedback and direct OS execution controls.
- **Visual Builder Contrast & Convergence Strategy**:
  - Validated that the active workspace ClawX contains a supreme visual canvas builder (`@xyflow/react`) that persists graphs, handles auto-creation of agents, and dynamically deploys `AGENTS.md` protocols to the VM, which the cloned repo completely lacks.
  - Authored a premium comparison report artifact `codebase_comparison_report.md` detailing the side-by-side analysis, architectural workflows, and a concrete strategic integration plan to merge the Kotlin Native voice client directly into the ClawX/NiClaw network.

## (2026-05-25) - Portal Consoles, Pre-Authenticated Tokens & Visual Swarm Upgrades
- **In-App Portal Consoles (OpenHuman & Hermes)**:
  - Designed and hosted a stunning, glassmorphic **OpenHuman Chat Console & Semantic Hub** on port `7788` on the VM guest, utilizing high-fidelity Obsidian styling, active pulsing cognitive status, system specifications, and dynamic AJAX routing directly to `/jarvis/agents/openhuman/chat`.
  - Designed and hosted a premium, deep-purple **Hermes Inference Playground & Console** on port `7789` on the VM guest, featuring System Prompt editor, Temperature slider, Max Token limits, and active AJAX routing directly to `/jarvis/agents/hermes/chat`.
  - Configured a new systemd unit `/etc/systemd/system/jarvis-consoles.service` to automatically manage the lifecycle of these consoles in the background of `vm-niclaw` on startup.
- **Pre-Authenticated OpenClaw Tokens**:
  - Implemented automatic pre-authentication for the OpenClaw dashboard by dynamically appending the `CLAWX_API_TOKEN` (retrieved from `useSettingsStore` or falling back to the VM default) as a query parameter `/?token=<token>` onto the webview URL. This bypasses the manual authentication token entry screen entirely.
- **Webview Navigation HUD Controls**:
  - Engineered a premium, glassmorphic navigation HUD toolbar directly above the portal webview.
  - Implemented complete, responsive controls: Back (`goBack()`), Forward (`goForward()`), Refresh (`reload()`), Home (resets key and reloads tab home URL), Zoom Out, Zoom In, Zoom percentage indicator, and a sleek, read-only Address Bar showing the current secure URL dynamically via webview event listeners (`did-navigate` and `did-navigate-in-page`).
- **Visual Builder Swarm Agent Binding**:
  - Integrated active cluster agents dropdown selection within the Visual Builder's `NodeSettingsModal`. Double-clicking an `AgentNode` now populates a dropdown with the list of live active agents fetched from `useAgentsStore`. Selecting an agent automatically synchronizes the name/label, role, and description of the node, while still allowing a "Custom..." fallback option.
- **Compilation & Remote Deployment**:
  - Synced all modifications to the remote `vm-niclaw` codebase and successfully restarted the systemd service `clawx-ai-os.service`.
  - Verified 100% clean frontend TypeScript compilation with **0 errors and 0 warnings** (`pnpm tsc --noEmit`).
  - Compiled and built the updated debug APK for the Android client utilizing `gradlew.bat assembleDebug`. Compilation was completed successfully in 4m 41s, generating `app-debug.apk` at `app/build/outputs/apk/debug/app-debug.apk`.

## (2026-05-24) - Visual Builder Swarm Compiler & Romanian Voice Systems Integration
- **Visual Agent Swarm Compiler**:
  - Implemented 100% canvas persistent serialization in local storage (`clawx_builder_graph`) to auto-restore workspace layouts upon reload.
  - Added "Supreme Orchestrator" selector trigger inside custom `AgentNode` which styles the chosen node with golden-pulsing boundaries, star icons, and a glowing `Supreme` badge.
  - Built full compiler logic in `handleDeploy` that checks active agent lists on `vm-niclaw` and invokes `createAgent` store actions to automatically seed missing canvas nodes.
  - Compiled detailed swarm routing configurations in `AGENTS.md` specifying each sub-agent slug and detailing shell CLI routing rules: `openclaw agent --agent <slug> --message "<text>" --json`.
  - Added new dynamic `/api/agents/write-workspace-file` route on the Electron host backend to write the compiled `AGENTS.md` directly into workspaces on the remote VM, enabling instant SSH-less swarm deploys.
- **Android Jarvis Client Voice Systems Overhaul**:
  - Redesigned the prompt bar to expose the previously hidden `micButton` as a styled ImageButton using standard android drawables, alongside a persistent `volumeToggleButton`.
  - Integrated `isTtsEnabled` flag persisted in local `SharedPreferences` to toggle speech synthesis on/off, updating the neon speaker icon in real-time.
  - Configured native Android `TextToSpeech` with an `UtteranceProgressListener` and standard Romanian `Locale("ro", "RO")` voices.
  - Bound a dynamic stop-action to the `sendButton` that transforms it into a red neon `ic_media_pause` button when TTS is speaking. Clicking it instantly calls `tts.stop()`, cancels the active speech stream, and resets the button state safely.
  - Resolved `ic_media_stop` compilation error by gracefully binding `android.R.drawable.ic_media_pause` as a fully compatible media control drawable.
  - Successfully compiled the Android application and streamed the debug APK directly to the connected device `SM_S938B` over ADB with 100% success.
- **Strict TypeScript & Host Alignment**:
  - Exposed `openclaw` Externally: Synced gateway parameters inside `config-sync.ts` to propagate `--bind lan` (binding to `0.0.0.0`), exposing the internal orchestration server externally to all mobile and desktop devices.
  - Fixed strict type errors on React Flow state variables by shifting persistent loading structures into dedicated typed initializers.
  - Passed all TypeScript strict typechecks (`tsc --noEmit`) with 0 errors and 0 warnings.

## (2026-06-13) - Secure NiClaw Host API Bridge Completed
- Updated SuperHermes mesh config on VM to support `SUPERHERMES_NICLAW_HOST_API_TOKEN`/`CLAWX_API_TOKEN` server-side for authenticated Host API health checks.
- Patched `/home/debian/hermes-agent/SuperHermes-OS/apps/api/app/mesh.py` so the `niclaw-host-api` node uses an Authorization header internally, while `/api/mesh/status` returns only safe status/details.
- Added `SUPERHERMES_NICLAW_HOST_API_TOKEN` to `/etc/superhermes-api.env` from the existing VM Host API token source; file is permissioned `600` and output/logs redact token values.
- Verified `https://vm-niclaw.tail7a9097.ts.net:8002/api/mesh/status`: all mesh nodes report `online`, with `offline=0` and `degraded=0`; no token/header markers are exposed.
- Ran SuperHermes API tests successfully (`30 passed`) and a real `/api/mesh/smoke-tests` target `mesh-full-online` event completed.

## (2026-06-12) - Real Agent Mesh Backend Contract for Hermes/SuperHermes/NiClaw
- Added real SuperHermes mesh API on `vm-niclaw`: `/api/mesh/status`, `/api/mesh/events`, `/api/mesh/brain`, `/api/mesh/hermes-dashboard`, and `/api/mesh/smoke-tests` in `/home/debian/hermes-agent/SuperHermes-OS/apps/api/app/mesh.py`.
- Updated SuperHermes API config/router on VM (`app/config.py`, `app/main.py`) and added `tests/test_mesh_api.py`; API test suite passes: `30 passed`.
- Fixed SuperHermes systemd binding conflict with Tailscale Serve by adding `/etc/systemd/system/superhermes-api.service.d/20-localhost-bind.conf`, binding uvicorn to `127.0.0.1:8002` while keeping HTTPS exposure at `https://vm-niclaw.tail7a9097.ts.net:8002`.
- Updated `C:\Server\AI\get-telegram-hermes-ecosystem-context.ps1` so Telegram Hermes consumes the server-side mesh endpoints instead of directly extracting/exposing Hermes Dashboard session tokens.
- Updated `C:\Server\AI\watch-telegram-server-commands.ps1` memory refs to the new real mesh plan and restarted scheduled task `SERVER Telegram Command Watcher`.
- Wrote `Agent Mesh API Contract - Real Endpoints.md` to SecondBrain for Antigravity; contract explicitly forbids UI fallback mocks and defines real response states.

## (2026-06-11) - Shared Obsidian/SecondBrain Memory Repair on vm-niclaw
- Patched `C:\Server\AI\sync-secondbrain-to-vm.ps1` to replace failing `scp -r` mirroring with tar archive staging, remote safe swap, VM runtime-note import, and automatic OpenClaw memory-core regeneration.
- Patched `C:\Server\AI\refresh-server-obsidian-knowledge.ps1` to call the central VM sync script instead of duplicating the old `scp` logic; updated `sync-openclaw-secondbrain-context.ps1` default host to `vm-niclaw`.
- Added shared memory contract notes under `D:\Onedrive\SecondBrain\secondBrain\AI Inbox Runs\Agent Runtime Memory\{Shared,Hermes,OpenClaw}`.
- Repaired OpenClaw memory on `vm-niclaw`: switched embeddings to `ollama/all-minilm`, built curated safe memory core, verified `13/13 files`, `24 chunks`, `dirty=false`, and working semantic search.
- Recovered Hermes/GBrain local PGLite after WASM/runtime failure: imported the same memory core into GBrain (`13 pages`, `16 chunks`) and installed `/usr/local/bin/hermes-gbrain-import-secondbrain-core` as non-blocking `ExecStartPre` for `hermes-gateway.service`.
- Repaired Hermes MCP startup without removing functionality: kept Modal as a provider, removed only the invalid `mcp_servers.modal` entry, and wrapped Dracarys MCP with `/home/debian/.hermes/bin/dracarys-mcp-wrapper.sh` so it starts from `/home/debian/Server/platform.dracarys.ro` with Prisma/.env loaded correctly.
- Verified Hermes MCP handshakes for GBrain, BoardAI, and Dracarys after restart; Dracarys now initializes Prisma and connects instead of failing from the wrong working directory.
- Restored strict build readiness after the memory/MCP repairs: `pnpm run typecheck`, `pnpm run build:vite`, `mobile/android-kotlin/gradlew.bat assembleDebug`, and `pnpm run package:win` all pass.
- Generated current Windows installer artifact: `release/NiClaw-0.4.4-win-x64.exe` (`351,345,043` bytes, 2026-06-11 19:28:36 local).

## (2026-05-24) - Isolated NiClaw Windows Production Build & TypeScript Compiler Refactoring
- **NiClaw Windows Desktop Build**:
  - Successfully executed `pnpm run package:win` to bundle all Vite client assets, Electron main/preload structures, OpenClaw dependencies, 7 external communication plugins, and preinstalled skills into a premium standalone Windows installer.
  - Output target compiled perfectly: `release/NiClaw-0.4.4-win-x64.exe` (~351 MB).
  - Ensured absolute application co-existence: customized the installer `appId` (`app.niclaw.desktop`), `productName` (`NiClaw`), taskbar model ID, NSIS shortcuts, and process-instance mutex locks (`lockName: "niclaw"`). This guarantees 100% data isolation under `AppData/Roaming/niclaw` and prevents any interference, shortcuts overwriting, or data corruption with the user's active, pre-installed `ClawX` desktop application.
- **Robust Git Sparse Cloning for Skills Bundler**:
  - Refactored `scripts/bundle-preinstalled-skills.mjs` to switch `$.cwd` directly into the targeted temporary checkout subdirectory, executing `git init` locally and handling automatic removal of any pre-existing `origin` remotes inside a secure try-catch statement. This prevents Git from traversing parent directories and colliding with the root repository, correcting the critical `remote origin already exists` build error.
- **TypeScript Compiler & Strict Compilation Refactoring**:
  - Resolved all typescript type-check errors to achieve a 100% clean compilation under `strict` configuration and `noUnusedLocals: true`:
    - Cleaned up unused imports (`RefreshCw`, `Badge`) inside `src/components/settings/RemoteAccessSettings.tsx`.
    - Cleaned up unused `Activity` icon import inside `src/pages/Agents/index.tsx`.
    - Added explicit `mcpServers` option signature to `createAgent` and `updateAgent` definitions inside `src/stores/agents.ts` to sync type mappings with actual schema.
    - Cleaned up unused `Settings` and `useTranslation` imports as well as unused `t` variable declaration inside `src/pages/Builder/index.tsx`.

## (2026-05-24) - Premium In-App Agent Portal & Dynamic Host Configuration
- **In-App Agent Portal Implementation**:
  - Created a premium, glassmorphic React 19 component inside `src/pages/Portal/index.tsx` to serve as the unified Agent Portal dashboard.
  - Features real-time tab selections for OpenClaw (port `18789`), OpenHuman (port `7788`), Hermes Console (OpenRouter Keys), and Gemini Console (AI Studio).
  - Embeds standard HTML5 sandboxed iframes for dynamic local/remote dashboard rendering within the Electron container workspace.
  - Includes a dynamic config header to customize the portal target host/IP in real-time (stored in `localStorage`).
- **React Router & Sidebar Integration**:
  - Registered the `/portal` route inside `App.tsx` and mounted it under `MainLayout`.
  - Added a neon-highlighted **"Agent Portal"** tab to the navigation sidebar inside `Sidebar.tsx` utilizing a standard Lucide `Globe` icon.
- **Server Deployment & Physical ADB Installation**:
  - Successfully deployed the consolidated REST and Dynamic Config API backend code to the remote `vm-niclaw` VM under `/opt/jarvis-command-center`.
  - Ran remote dependency installations and production compiler passes, then restarted the background `jarvis-command-center.service` daemon.
  - Smoke-tested the live health endpoint locally via PowerShell and verified all provider adapters (OpenClaw, OpenHuman, DeepSeek, Hermes, Gemini) are reported as active and healthy.
  - Directly installed the compiled glowing neural HUD APK (`app-debug.apk`) onto the connected physical phone `SM_S938B` (serial `R3CY70CRZCH`) via ADB, confirming successful installation.

## (2026-05-20) - Remote LAN API Authorization Implementation
- **Host API Authentication Pre-Shared Token**:
  - Patched `electron/api/server.ts` to allow a pre-shared static API token via the `CLAWX_API_TOKEN` environment variable. If set, this overrides the default random 32-byte hex token generated per session.
  - Injected `Environment=CLAWX_API_TOKEN=35c6ae8e7a685718dfb4a45a1f2982d5` into the `/etc/systemd/system/clawx-ai-os.service` configuration file on the remote `vm-niclaw` guest VM.
  - Reloaded the systemd daemon and successfully restarted the service, bringing it online with the pre-shared token.
  - Verified remote connection and authorization capability from the Windows host workstation over the LAN using the pre-shared Bearer token (`http://10.10.1.219:13210/api/settings`), successfully bypassing the 401 Unauthorized block.

## (2026-05-20) - Headless Service Deployment & VM scaling to 16 GB RAM
- **Headless Application Polish**:
  - Patched `electron/main/ipc-handlers.ts` to add null-guards for `mainWindow` when running in headless mode (`CLAWX_HEADLESS=1`).
  - Pre-configured remote access settings inside the VM (`~/.config/clawx/settings.json`) to bind the Host API server to `0.0.0.0:13210` instead of local loopback.
- **Systemd Service Integration**:
  - Wrote a systemd service descriptor to `/etc/systemd/system/clawx-ai-os.service` to start ClawX automatically under virtual framebuffer emulation (`xvfb-run`).
  - Enabled and verified that the service successfully boots, compiles Electron components in development, and listens on port `13210` for remote control.
- **VM Hardware Scaling**:
  - Scale memory of VM `115` (`vm-niclaw`) on the Proxmox host (`10.10.1.250`) from 8 GB to **16 GB RAM** (`qm set 115 -memory 16384`).
  - Executed a clean power cycle (`qm stop 115 && qm start 115`) from the Proxmox host.
  - Verified that the Debian guest OS successfully detects the 16 GB allocation and that the systemd service auto-starts cleanly upon boot.

## (2026-05-20) - Windows Build & Proxmox VM Provisioning
- **ClawX Windows Build**:
  - Successfully compiled the Vite client and Electron main/preload builds.
  - Bundled 442 OpenClaw external packages, 33 extension packages, and 7 external plugins.
  - Fixed Windows `tar` compatibility issue in `bundle-preinstalled-skills.mjs` using Node's native `child_process.execSync` to target `C:\Windows\System32\tar.exe` when running under Windows environments.
  - Built, signed, and generated the final release installer at `release/ClawX-0.4.4-win-x64.exe` (~350 MB).
- **Proxmox VM Provisioning**:
  - Discovered and established direct LAN SSH routing to the Proxmox host at `10.10.1.250` (on bridge `vmbr1`).
  - Cloned the base template `debian12-template` (`9001`) to VMID `115` as `vm-niclaw` on target thin pool `storage-r10`.
  - Configured 4 vCPUs, 8 GB RAM (8192 MB), and disabled memory ballooning (`balloon: 0`).
  - Extended/resized root disk `scsi0` size to `80G`.
  - Upgraded guest network link `net0` to guest bridge `vmbr1`, setting fixed IP `10.10.1.219/24` (gw `10.10.1.1`), nameserver `1.1.1.1`, and DNS search domain `dracarys.ro`.
  - Automatically imported public SSH keys from `vm-openclaw` (`114`) to ensure immediate secure login.
  - Successfully booted `vm-niclaw` and verified fully active guest shell and SSH capability.

## (2026-05-20) - Initial Setup
- Created mandatory AI workspace folder and workflow files.
- Documented project-specific building routes and configurations.
