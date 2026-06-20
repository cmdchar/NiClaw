# Phase 4.7 - VM Runtime Deployment And Hardening

Status: planned
Created: 2026-06-20

## Objective

Make `vm-niclaw` a reliable runtime host for NiClaw services, Hermes, SuperHermes, OpenHuman, OpenClaw, SecondBrain sync, and public/Tailscale endpoints.

## Services To Verify

- NiClaw Host API / headless service
- SuperHermes API
- Hermes dashboard
- Telegram Hermes watcher
- OpenHuman console/core
- OpenClaw gateway
- code-server / Open Code
- Obsidian/SecondBrain sync jobs
- Tailscale Serve routes

## Tasks

### 4.7.1 - VM Service Inventory

- [ ] SSH to `vm-niclaw`.
- [ ] List systemd services.
- [ ] List listening ports.
- [ ] List Tailscale serve config.
- [ ] List env files.
- [ ] Mask secrets in notes.

Acceptance:

- [ ] Runtime inventory documented.

### 4.7.2 - Health Endpoints

- [ ] Verify each service has health endpoint or fallback probe.
- [ ] Add missing health endpoint if needed.
- [ ] Standardize response shape.

Acceptance:

- [ ] Mesh can probe every major service.

### 4.7.3 - Startup Order

- [ ] Identify dependencies.
- [ ] Add systemd dependencies where needed.
- [ ] Ensure memory import happens before Hermes starts.
- [ ] Ensure required env files exist.

Acceptance:

- [ ] VM reboot leaves all core services healthy.

### 4.7.4 - Deployment Script

Create/update scripts:

- [ ] sync selected NiClaw files to VM.
- [ ] restart affected services.
- [ ] run smoke tests.
- [ ] rollback if smoke fails where practical.

Potential file:

- `app/scripts/deploy-vm-niclaw.ps1`

Acceptance:

- [ ] One command can deploy controlled backend changes to VM.

### 4.7.5 - Logs And Diagnostics

- [ ] Centralize service log paths.
- [ ] Add log preview endpoint with redaction.
- [ ] Add journalctl helpers.
- [ ] Add service status summary.

Acceptance:

- [ ] Desktop can show VM diagnostics without exposing secrets.

### 4.7.6 - Tailscale Routes

- [ ] Verify public/internal URLs.
- [ ] Verify TLS.
- [ ] Verify no service exposes unauthenticated sensitive endpoints.

Acceptance:

- [ ] Tailscale endpoints work and are documented.

## Done Definition

- [ ] VM services survive reboot.
- [ ] Deployment path is repeatable.
- [ ] Mesh reports runtime health.
- [ ] Logs are inspectable safely.

