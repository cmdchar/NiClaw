# Phase 4.9 - Security, Policy, And Secrets Audit

Status: planned
Created: 2026-06-20

## Objective

Audit NiClaw before finalization to ensure secrets, tokens, Host API access, Android pairing, VM env files, command execution, and patch application are controlled.

## Scope

- Desktop renderer.
- Electron main/Host API.
- Android companion.
- VM services.
- SuperHermes/Hermes.
- Obsidian/SecondBrain sync.
- Build/release artifacts.

## Tasks

### 4.9.1 - Secret Scan

- [ ] Scan repo for known token patterns.
- [ ] Scan Android sources.
- [ ] Scan Desktop renderer.
- [ ] Scan Host API logs.
- [ ] Scan Brain/CHANGELOG docs for accidental secrets.

Do not print raw secrets in reports.

Acceptance:

- [ ] Findings are masked.
- [ ] Real secrets moved out of code/docs.

### 4.9.2 - Host API Auth Audit

- [ ] Verify all Host API routes pass global auth gate.
- [ ] Verify public exceptions are intentional.
- [ ] Verify Android pairing route is safe.
- [ ] Verify query token logging is masked.
- [ ] Verify renderer does not receive protected gateway tokens unnecessarily.

Acceptance:

- [ ] No sensitive endpoint unauthenticated.

### 4.9.3 - Android Security Audit

- [ ] Verify no hardcoded token fallback.
- [ ] Verify bearer header only.
- [ ] Verify no token logging.
- [ ] Verify network security config is scoped.
- [ ] Verify local storage does not expose more than required.

Acceptance:

- [ ] Android build has no hardcoded protected secret.

### 4.9.4 - Policy Engine Audit

- [ ] Test forbidden commands.
- [ ] Test dangerous commands.
- [ ] Test safe commands.
- [ ] Test secret path reads.
- [ ] Test diff validation.
- [ ] Test patch approval flow.

Acceptance:

- [ ] Dangerous actions require approval or are blocked.

### 4.9.5 - VM Env Audit

- [ ] List env files.
- [ ] Check permissions.
- [ ] Check service users.
- [ ] Ensure tokens are server-side only.
- [ ] Ensure public endpoints do not leak env names/values.

Acceptance:

- [ ] VM secrets are not exposed through APIs/UI/logs.

### 4.9.6 - Build Artifact Audit

- [ ] Inspect packaged Desktop artifact for accidental env files.
- [ ] Inspect APK for obvious hardcoded tokens.
- [ ] Verify debug logs do not leak secrets.

Acceptance:

- [ ] Artifacts are safe to distribute internally.

## Done Definition

- [ ] Security findings resolved or documented.
- [ ] No known secret leakage.
- [ ] Policy gate behavior verified.

