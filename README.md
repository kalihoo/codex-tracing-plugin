# Session Lens — L0 feasibility shell

**L0 gate: blocked.** This local plugin is a synthetic protocol/UI demo, not a session recorder. Tasks 2–4 have not started. See [compatibility.json](compatibility.json) for machine-readable gate results and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the scope.

The first release targets Codex desktop on macOS. The observed environment is macOS **26.5.1 build 25F80 arm64**, Codex CLI **0.162.0-alpha.17.2**, Node **24.7.0**, pnpm **11.25.0**. The desktop bundle at `/Applications/ChatGPT.app` reports version **26.1007.71326**, build **20398**; this is the ChatGPT desktop bundle containing the Codex CLI, not an independently detected Codex application version.

## Build and exercise locally

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm smoke
pnpm package:local
```

`pnpm check` runs strict TypeScript checks, bundles the React/Vite UI and Node stdio server, and runs Vitest. `pnpm smoke` launches a copy of the bundle without `node_modules`, drives the real MCP protocol through the SDK, and writes the served UI to `work/preview/index.html`. It never opens a real chat or reads host state. `pnpm package:local` creates `session-lens-l0.tgz` with a self-contained server; Node 24 must be on the desktop launch environment's PATH.

To view the standalone synthetic preview:

```sh
python3 -m http.server 4175 --bind 127.0.0.1 --directory work/preview
```

Open `http://127.0.0.1:4175/` for `fixture-alpha`, or `http://127.0.0.1:4175/?fixture=beta` for explicit unknown usage. Standalone preview is clearly labeled and uses only in-memory fixtures. It is not an MCP Apps host. The real resource uses the MCP Apps bridge when embedded in an iframe.

## Plugin layout and tools

- `plugin.json` / `mcp.json`: official portable Agent Plugins layout with local stdio transport.
- `.codex-plugin/plugin.json` / `.mcp.json`: explicit supported Codex compatibility layout. OpenAI settings match the portable manifest; the portable extension is authoritative when present.
- `hooks/hooks.json` / `hooks/noop.sh`: a single no-op SessionStart command, silent exit 0, no stdin parsing and no file reads or writes.
- `src/contracts.ts`: strict version-1 `EventEnvelope` and `UsageObservation` schemas and inferred TypeScript types. Unknown usage contains a reason, not zero counters. Timing and causal links stay null/unknown.
- `src/adapters.ts`: caller-supplied synthetic values only. Parses the evidenced App Server notification and documented hook identity. Never opens `transcript_path` or a socket.
- `open_demo`: render one explicitly named fixture session. `read_demo`: reread it. `advance_demo`: reveal its second predefined fixture event in memory. The latter two are app-visible tools; refresh is manual, not a proven push/live feed. No tool accepts a real session ID.

All UI assets are embedded in the resource. Its CSP declares no external connect/resource domains. React renders untrusted labels as text. No cloud service, account, billing, execution engine, ranking, real session capture, or persistent storage exists. Consequently no personal collection can be enabled here; a later collector must require per-session opt-in and sanitize before persistence. The hook itself cannot stop, approve, rewrite, or add context.

## Source evidence and token scope

The [official App Server docs](https://learn.chatgpt.com/docs/app-server) describe `thread/tokenUsage/updated`. Exact field types were generated from the installed CLI with `codex app-server generate-ts --out work/protocol`; three unmodified generated types and a method excerpt are retained under `evidence/codex-0.162.0-alpha.17.2/`. Synthetic fixtures match that installed shape, including `total`, `last`, `inputTokens`, `outputTokens`, `cachedInputTokens`, `cacheWriteInputTokens`, `reasoningOutputTokens`, and `totalTokens`. The adapter selects the **thread's total snapshot**. It never adds successive cumulative snapshots, adds subsets a second time, estimates from text, or distributes thread totals to tools. These are schema-backed synthetic values, not a real authoritative usage observation. `provenance: synthetic-fixture` is mandatory for parsed reported counters in this L0 contract.

The [official Hooks docs](https://learn.chatgpt.com/docs/hooks) document `session_id`, `hook_event_name`, and nullable `transcript_path`; subagent hook IDs refer to the parent session. No live path or content was inspected. Rollout JSONL is **unstable** and is **not implemented as an input adapter**. A JSONL-shaped object is rejected as unknown; the example transcript path in the hook fixture is invented synthetic data and never read.

The [official packaging docs](https://developers.openai.com/plugins/build/plugins) describe the portable layout, Codex fallback, local distribution and hook trust. The [desktop-only docs](https://developers.openai.com/plugins/deploy/desktop-only) document local stdio launch with `${PLUGIN_ROOT}`. The [UI docs](https://developers.openai.com/plugins/build/chatgpt-ui) describe MCP Apps resources and compatible hosts; they do not establish a persistent right-side Codex session surface for this plugin.

## Manual host validation still required

Nothing was installed into a user profile, no hook was trusted, no Codex configuration was changed, and no new chat was created. A Codex right-side **browser preview** was observed by the coordinating agent, including synthetic reveal/refresh, but it is separate from the plugin's MCP Apps surface. Standalone Chromium width screenshots are in `evidence/`; they do not prove host layout behavior.

After explicitly authorizing manual installation, use the desktop's supported local plugin/marketplace flow against the unpacked package root. Keep hooks untrusted for the UI test: the no-op hook supplies no data and is not required to use the demo. The package includes neither a marketplace registration nor a profile/config mutation script. Do not infer successful installation from a local build or archive.

To clear L0, record actual Codex-hosted evidence of all four conditions: the requested MCP Apps side-panel surface; two disposable real sessions bound and isolated; a new real event visible after refresh; and at least one authoritative input/output token counter with source and scope. The current shell intentionally lacks a real collector and cannot clear the latter conditions by changing a fixture ID. Real-source wiring requires separate authorization and an evidenced supported route. Preserve only sanitized evidence, then rerun the gate. Stop if any condition remains unproven; do not start Tasks 2–4.
