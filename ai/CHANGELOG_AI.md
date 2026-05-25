# CHANGELOG - ClawX AI Updates

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
