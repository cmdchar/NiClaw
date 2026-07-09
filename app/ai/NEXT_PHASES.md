# NiClaw Next Phases
**Date:** 2026-06-21
**Purpose:** Outlines the remaining implementation steps for NiClaw.

## 1. Phase 4.7: VM Runtime Deployment Hardening
**Priority:** High (Next Immediate Phase)
**Goal:** Harden the remote execution environment on `vm-niclaw` to ensure reliability and fault tolerance.
**Scope:**
- **Hermes & SuperHermes:** Ensure robust startup lifecycles, crash recovery, and state resumption.
- **OpenClaw & OpenHuman:** Containerize or establish systemd services for consistent execution.
- **Service Health:** Implement heartbeat checks, auto-restarts, and connection retries to the Host API over Tailscale.
- **Log Rotation:** Prevent disk-space exhaustion from verbose agent logs.

## 2. Phase 4.8: Build Release Pipeline
**Priority:** Medium
**Goal:** Automate the packaging and distribution of NiClaw components.
**Scope:**
- Implement rigorous CI/CD for the Electron Desktop App.
- Automate Android APK builds and distribution.
- Establish staging vs. production deployment environments.

## 3. Phase 4.9: Security Policy Audit
**Priority:** Medium
**Goal:** System-wide review of security perimeters before production release.
**Scope:**
- Audit `MEMORY_API_TOKEN` scoping and backend validation logic.
- Verify Tailscale IP constraints and Host API middleware.
- Ensure no credential or token leakage in logging.

## 4. Phase 5.x: Project Intelligence & Autonomy
**Priority:** Future
**Goal:** Shift NiClaw from a Reactive OS to an Autonomous Intelligence Engine.
**Phases:**
- **5.0 Production Readiness:** Final bug sweeps and performance tuning.
- **5.1 Knowledge Graph Project Intelligence:** Re-integrate Graphify to visually map code, types, and dependencies within the Workspace.
- **5.2 Multi-Agent Planning Engine:** Allow agents to construct DAG-based execution plans dynamically.
- **5.3 Autonomous Project Mode:** Enable supervised, long-running agentic loops without constant human prompting (while respecting the Memory Arbiter constraints).
