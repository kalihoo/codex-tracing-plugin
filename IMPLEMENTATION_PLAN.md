# Session Lens Implementation Plan

**Goal:** Build a local-first Codex plugin that observes an explicitly enabled conversation, explains execution and task flow, measures duration and host-reported token usage, and exports a self-contained HTML report.

**Architecture:** A TypeScript plugin packages lifecycle hooks, an MCP server, a shared React interface and report renderer. Hooks append sanitized, versioned events to plugin-owned local data; the MCP service normalizes them into SQLite and exposes read, workflow-edit and export operations.

**Tech stack:** Node.js 24 LTS, TypeScript, pnpm, MCP TypeScript SDK and ext-apps, React/Vite, React Flow/ELK, SQLite via better-sqlite3, Zod, Vitest and Playwright.

## Global constraints

- First release targets the Codex desktop app on macOS.
- Collection is local, opt-in per session, sanitized before persistence, and fail-open.
- No cloud service, account, cross-session ranking, billing, or execution engine.
- Unknown coverage, usage, timing and causal links remain explicitly unknown.
- Never approximate reported token usage from text length or attribute session totals to individual tools.
- The first gate must demonstrate current-session binding, a Codex-hosted side-panel surface, live updates, and at least one authoritative real token counter.
- If any first-gate requirement cannot be demonstrated, stop and report the evidence before building later phases.

## Tasks

### Task 1: L0 feasibility and plugin shell

Create a minimal installable local plugin. Add a no-op, fail-open lifecycle hook configuration and a versioned event contract. Implement the smallest MCP server and UI resource needed to inspect captured events in the Codex desktop app. Validate the current Codex version against two concurrent sessions, discover and document the actual per-thread transcript or usage source without exposing its contents in reports, and test live UI updates in a 360–800 px host surface. Do not enable or trust the hook in the user's real session; use a disposable test session and synthetic fixtures until the user performs host trust/install actions.

**Gate:** pass only if Codex desktop renders the app in the requested right-side surface, the correct two sessions remain isolated, refresh shows new events, and actual input/output token fields can be read with a documented source and scope. Otherwise stop after producing the minimal plugin, a compatibility matrix, and reproducible evidence of each blocker.

### Task 2: Event capture, normalization and local storage

After Task 1 passes, implement command hooks for `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`, `Stop`, `Interrupt`, and `SessionEnd`. Persist atomic per-event spool files under the plugin data directory, then ingest idempotently into SQLite. Add source-versioned adapters for documented hook fields and the validated host usage source. Apply redaction before disk writes; enforce per-content limits; record truncation, parse errors and missing lifecycle events. Keep hooks fail-open and avoid tool rewrites or approval decisions.

### Task 3: Execution graph, workflow and analysis

Build session header, execution/task/analysis views, searchable invocation tree, nested subprocess navigation, duration timeline and node detail. Use one deterministic projection layer for UI and exports. Implement interval-union active time, exclusive span time, known wait time and unknown gaps. Preserve parent/child totals without double counting; handle interruptions, retries, long-running commands and polls. Provide a revisioned workflow model with execution links and safe message-based editing through MCP tools.

### Task 4: Export, package and release checks

Create a versioned `ReportBundle` and export offline HTML plus JSON using the same calculations and graph components as the UI. Escape untrusted content and embed assets locally. Add opt-in, retention and delete controls, install/trust/uninstall documentation, a compatibility matrix, and release packaging for macOS arm64. Verify offline rendering, 10,000 events / 1,000 spans, report/UI metric parity, and clean install behavior.

## Acceptance coverage

- Parallel spans, child agents, retries, background commands and poll de-duplication.
- Missing starts/ends, interrupted turns, out-of-order events, process restart and duplicate replay.
- Cumulative usage snapshots, reset boundaries, cached-input subsets and parent/child usage scope.
- Concurrent session isolation; malicious HTML/script and secret-shaped strings.
- Offline report with zero external asset requests and metrics equal to the exported snapshot.
- Side panel, theme, keyboard access and layouts at 360, 420, 720 and 800 px in the actual Codex desktop host.
