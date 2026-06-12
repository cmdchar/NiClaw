# NiClaw Spatial AI OS

NiClaw is a next-generation local AI orchestrator and spatial UI framework. It is designed to host, manage, and render AI agents dynamically. The ecosystem consists of a Windows Electron Host API (the gateway), a Windows Renderer UI (the spatial desktop), and an Android Mobile Companion (Jarvis/NiClaw Mobile).

## Architecture Overview

NiClaw bridges the gap between hardware execution and human interaction by delegating complex runtime orchestration to the SuperHermes mesh (running securely on isolated VMs) while providing a real-time, interactive, and spatial UI on Windows and Android.

### 1. Windows Host API (Electron Backend)
Located in pp/electron/:
- Acts as the secure local gateway.
- Exposes local endpoints for the Renderer and Mobile clients (http://10.10.1.219:13210).
- Provides secure proxies to the SuperHermes Agent Mesh using stored gatewayToken credentials, ensuring no secrets leak to the client layer.
- Handles system integrations, memory syncing (Obsidian SecondBrain), and local process management.

### 2. Windows Renderer (Spatial UI)
Located in pp/src/:
- Built with React, Vite, and TailwindCSS.
- Offers a spatial desktop interface where users can interact with agents (e.g., OpenClaw, Codex, OpenHuman).
- Dynamically visualizes the Agent Mesh health and routes all cross-VM data securely via the Host API.

### 3. Android Mobile Companion (Jarvis / NiClaw Mobile)
Located in pp/mobile/android-kotlin/:
- A native Kotlin Android app for remote interaction.
- Communicates directly with the Windows Host API on the local network.
- Features native UI for Mesh Status, Smoke Tests, and secure token-based authentication via ApiClient.

## Development & Build

### Prerequisites
- Node.js (v18+)
- pnpm (latest)
- Android Studio / JDK 17 (for mobile build)
- TailwindCSS

### Running the Windows Client
`ash
cd app
pnpm install
pnpm run dev
`

### Typechecking the Frontend
`ash
cd app
pnpm run typecheck
`

### Building the Android App
`ash
cd app/mobile/android-kotlin
./gradlew assembleDebug
`
The output APK will be available in pp/build/outputs/apk/debug/.

## Agent Mesh Security Model
The SuperHermes Agent Mesh aggregator runs on a remote VM (m-niclaw). To probe the local Windows Host API without requiring manual token injection, NiClaw provides an Auth Bridge (/api/agent-mesh/status). 
Clients (Renderer & Android) fetch the Mesh Status from the local Host API, which securely injects the gatewayToken before hitting the VM. This guarantees that UI clients never hold sensitive mesh administrative credentials.

## Memory & SecondBrain
NiClaw extensively uses local markdown documents for AI context execution (i/BRAIN.md, i/TASKS.md) and syncs telemetry to a global SecondBrain vault. All AI models operate strictly under the "No-Mock Rule": all data must be pulled from real backend endpoints or the memory vault, not mocked in UI.
