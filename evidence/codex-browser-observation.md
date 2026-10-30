# Codex browser preview observation (not MCP Apps evidence)

On 2026-10-30 the coordinating/root agent opened `http://127.0.0.1:4175/` in the current Codex chat's right browser panel and observed the built synthetic UI. The subagent's own open request initially returned `queued` because its chat was hidden; that queue result was not counted as a render.

The first rendered bundle failed with `ReferenceError: process is not defined`. The failure was traced to React environment checks retained by Vite library mode, reproduced in standalone Chromium, and recorded in `browser-red.log` and `tdd-browser-bundle-red.txt`. Explicit production constant replacement fixed the bundle. Both the coordinating agent and standalone Chromium reloaded the rebuilt preview.

The coordinating agent reported successful display and interaction: reveal advanced fixture revision 0→1, event count 1→2, and cumulative total 1000→2500. The page displayed `Host gates unverified`, `Collection off`, and binding `unverified`. The agent's isolated browser screenshot is visible in the parent conversation; the restricted browser API did not provide a supported way to save that screenshot into this repository. Repository PNGs were captured independently in standalone Chromium and must not be described as Codex host screenshots.

This proves that a synthetic standalone page can render and refresh in a Codex browser panel. It does **not** prove MCP Apps rendering, a persistent plugin sidebar, current real-chat binding, real event ingestion, or a real authoritative token read. All L0 host requirements remain blocked.
