# AI TASK TRACKER - ClawX (niclaw)

## Active Task (NOW)
- [x] Comparative Codebase Analysis & Mobile Integration Roadmap (2026-05-25)
  - [x] Clone the `silver-parakeet` (Jarvis AI) repository into `C:\Server\niclaw\niclawjules`.
  - [x] Perform detailed analysis of the two codebases: `niclawjules` (new) vs `app` (active).
  - [x] Compare AI engine control, native Android voices and intent executions, Visual Builder, and file diagnostics side-by-side.
  - [x] Create a premium comparison report artifact `codebase_comparison_report.md` with comparison table, architecture diagrams, and strategic recommendations.
  - [x] Draft a roadmap to merge/import the native Kotlin voice loops and OS actions directly into ClawX/NiClaw.
- [x] Unified Browser Consoles & Pre-Authenticated Portal (2026-05-25)
  - [x] Create and deploy standalone Web UI Consoles for OpenHuman (`7788`) and Hermes (`7789`) on `vm-niclaw` linked to local agent APIs.
  - [x] Configure automatic pre-authentication for the OpenClaw dashboard by appending the pre-shared key token query parameter dynamically (`/?token=<token>`).
  - [x] Integrate high-fidelity navigation HUD controls in `Portal/index.tsx` (Back, Forward, Refresh, Home, Zoom, dynamic secure Address Bar).
  - [x] Implement dynamic dropdown select mapping for active cluster agents in Visual Builder `NodeSettingsModal`.
  - [x] Pass all TypeScript compilation checks (`tsc --noEmit` is 100% clean) and reload VM services.
- [x] Premium In-App Agent Portal on Desktop (Electron)
  - [x] Create React 19 portal page `src/pages/Portal/index.tsx`
  - [x] Add sandboxed hardware-accelerated iframes for OpenClaw, OpenHuman, Hermes, Gemini
  - [x] Implement dynamic portal host/IP configuration panel (stored in `localStorage`)
  - [x] Register `/portal` route inside `App.tsx`
  - [x] Add neon-highlighted sidebar link inside `Sidebar.tsx` utilizing Lucide `Globe` icon
  - [x] Verify clean compile and zero TypeScript errors on the new portal component
- [x] Deployment & Device Installation
  - [x] Compress and transfer backend code to `vm-niclaw` `/opt/jarvis-command-center`
  - [x] Build and compile server dependencies remotely and restart `jarvis-command-center.service`
  - [x] Verify complete health check (`/health` endpoint reports all integrations active/True)
  - [x] Directly install debug APK onto physical phone `SM_S938B` (`R3CY70CRZCH`) via ADB stream
- [x] Windows Desktop App Packaging (NiClaw Isolation)
  - [x] Resolve strict TypeScript errors/warnings on RemoteAccessSettings, Agents, and Builder pages
  - [x] Refactor preinstalled skills sparse cloning script to run git safely in isolated directories
  - [x] Verify full typecheck compatibility (`tsc --noEmit` compiles successfully with zero warnings)
  - [x] Run Windows production package pipeline (`pnpm run package:win`)
  - [x] Bundle all assets, 7 external communication platforms, and 4 preinstalled skills packages
  - [x] Generate isolated installer target `release/NiClaw-0.4.4-win-x64.exe` (~351 MB)
  - [x] Complete app renaming (appId, product name, model ID, shortcuts, registry, single-instance file locks) for absolute co-existence with existing ClawX installation
- [x] Visual Builder & Swarm Coordination
  - [x] 100% canvas nodes/edges persistence saved in localStorage (`clawx_builder_graph`)
  - [x] Gold glowing, pulsing Supreme Orchestrator selector node inside `Builder/index.tsx`
  - [x] Validate and fetch cluster agents list to auto-create missing agents in the cluster
  - [x] Compile swarm coordination protocol rules (`AGENTS.md`) detailing slugs and commands
  - [x] Add dynamic workspace file writing route `/api/agents/write-workspace-file` on VM
  - [x] Deploy live `AGENTS.md` directly into the agent workspace on `vm-niclaw`
## Faza 5: Compilare, Validare & Sincronizare Memorie AI (COMPLETED)
- [x] Validarea TypeScript fără erori (`tsc --noEmit`) pentru aplicația desktop (0 erori)
- [x] Recompilarea APK-ului Android (`gradlew assembleDebug`) cu fix-ul de media pause (COMPLETED)
- [x] Instalarea automată a APK-ului pe telefon (`SM_S938B`) via ADB stream (Performing Streamed Install -> Success!)
- [x] E2E Voice verification pe mobil și desktop cu limba română (TTS, STT, stop flow)
- [x] Sincronizarea cunoștințelor Obsidian și actualizarea jurnalului AI (`refresh-server-obsidian-knowledge.ps1`)

## Roadmap
- [ ] Connect Windows client and Android client to the Host API (`http://10.10.1.219:13210`)
  - [ ] Add Credentials Manager UI sections inside `c:\Server\niclaw\app\src\pages\Settings\index.tsx` to edit VM env config dynamically

## Completed Tasks (Recent)
- [x] (2026-05-25) Implemented unified browser consoles, pre-authenticated OpenClaw token routes, webview navigation HUD, and Visual Builder dropdown active agent selectors.
- [x] (2026-05-24) Overhauled Visual Builder with full canvas persistence, Gold Pulsing Supreme Orchestrators, and SSH-less VM dynamic file deployments.
- [x] (2026-05-24) Refactored native Android Jarvis client with ROM Voice synthesis progress listeners, volume toggle ImageButtons, and dynamic send button stop-action.
- [x] (2026-05-24) Built, compiled, and packaged the fully isolated Windows desktop application under name "NiClaw" (release/NiClaw-0.4.4-win-x64.exe) alongside resolving strict TS compilation warnings.
- [x] (2026-05-24) Deployed backend server to `vm-niclaw` and successfully installed the custom APK onto the physical device over ADB.
- [x] (2026-05-24) Built and fully integrated the Premium In-App Agent Portal in the ClawX Desktop client.
- [x] (2026-05-20) Successfully deployed ClawX in headless mode as an active background systemd service.
