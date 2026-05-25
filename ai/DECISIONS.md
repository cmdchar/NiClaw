# DECISIONS - ClawX Architectural Decisions

## (2026-05-20) - Windows Bundled Runtimes
- Decided to use the project-shipped downloading scripts (`download-bundled-uv.mjs`, `download-bundled-node.mjs`) to retrieve Windows-specific python `uv` and `node` runtimes. This ensures offline autonomy when running the desktop app.
