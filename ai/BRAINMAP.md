# BRAINMAP - ClawX (niclaw)

## 1) Project Overview
ClawX is a React 19 + TypeScript + Vite desktop application packaged with Electron, serving as a GUI for the OpenClaw AI agent orchestration platform.

## 2) Key Build Commands
- `pnpm run init`: Installs dependencies and downloads UV.
- `pnpm run prep:win-binaries`: Downloads bundled Windows node/uv binaries.
- `pnpm run package:win`: Builds the Vite application and bundles it into a Windows executable using electron-builder.

## 3) Main Artifact Folders
- `electron/`: Core Electron main process files.
- `src/`: React frontend source code.
  - `src/pages/Portal/`: Unified In-App Agent Portal interface (`index.tsx`).
- `mobile/android-kotlin/`: Native Kotlin Android voice assistant companion app (implements Romanian STT/TTS loop and direct Android OS Intents for hardware/app executions).
- `shared/jarvis-server/`: Lightweight Node/Express TS server, routing commands between Android client, Gemini, and OpenClaw, containing simple intent mapping skills.
- `scripts/`: Custom build scripts for downloading runtimes, bundling OpenClaw plugins, and running Electron Builder.

## 4) Remote Headless Host API Scheme
- **Host API Address**: `http://10.10.1.219:13210` (Remote Access enabled)
- **Authentication**: Bearer Token or `?token=` query parameter using a custom pre-shared key defined in `CLAWX_API_TOKEN` environment variable.
- **Service Deployment**: Managed via background systemd service `clawx-ai-os.service` running inside virtual framebuffer `xvfb-run` under headless mode (`CLAWX_HEADLESS=1`).
- **Dynamic File Deployment**: Features `POST /api/agents/write-workspace-file` to let the Visual Builder compile and write swarm coordination rules (`AGENTS.md`) directly into agent workspaces on `vm-niclaw` dynamically.

## 5) Embedded Agent Portal Connections
- Mapped client ports and URLs rendered inside the sandboxed hardware-accelerated iframe dashboard container:
  * **OpenClaw Dashboard**: `http://<IP>:18789/?token=<token>` (active workspace engine, pre-authenticated using pre-shared host key)
  * **OpenHuman Core**: `http://<IP>:7788` (cognitive semantic hub, local Chat UI served on VM port 7788 linked to local agent API)
  * **Hermes Console**: `http://<IP>:7789` (local inference playground and chat console served on VM port 7789 linked to OpenRouter/DeepSeek Hermes agent)
  * **Gemini Console**: `https://aistudio.google.com` (Google AI Studio)
