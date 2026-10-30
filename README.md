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

After installing the local plugin, run `pnpm probe:host-isolation` to verify thread binding against the installed Codex App Server. It creates two concurrent ephemeral threads, starts no model turn, prints only binding/status booleans and event counts, and does not persist thread IDs or content. This protocol probe does not render the MCP App UI.

After `pnpm package:local` has generated the sanitized `work/package/session-lens` directory, register the repository as a local Codex marketplace and install the plugin for a new local chat:

```sh
codex plugin marketplace add /absolute/path/to/session-lens
codex plugin add session-lens@session-lens-local
codex plugin list --json
```

The repository includes `.agents/plugins/marketplace.json` pointing only to the sanitized build output, so Codex does not copy `.git`, `node_modules`, browser logs, source or tests into its plugin cache. Restart the desktop app after registering the marketplace, then use a new local chat to test the `open_session` thread entrypoint. The L0 panel intentionally reports that the thread identity, lifecycle stream, and token source are unavailable; it does not show fixture usage or capture content. The separate `open_demo` tool and standalone preview remain synthetic protocol demonstrations. Lifecycle hooks are still untrusted and do not supply data.

Packaging targets macOS `bsdtar`: archive ownership is normalized to uid/gid 0 and root/root, and extended attributes, ACLs, AppleDouble metadata and pre-existing `._*` sidecar files are excluded. `tests/package.test.ts` exercises the real packaging script with synthetic sidecar and xattr files on macOS and inspects all archive headers. Hook tests use independently created OS temporary directories, so `pnpm test` also works before an ignored `work/` directory exists. The packaging verification tests require `python3` for archive inspection and macOS `xattr` for the synthetic metadata fixture.

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) preserves full supplied license and copyright files for the complete installed production dependency closure, conservatively covering both bundles and tree-shaken production packages. Packaging regenerates and includes it. After changing dependencies, run `node scripts/generate-third-party-notices.mjs` and commit the refreshed file with the lockfile.

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
- `open_session`: Codex thread-side-panel entrypoint. The standard entrypoint call has empty arguments, while Codex App Server injects the current thread ID into MCP tool-call metadata under `threadId`. Session Lens binds only when that exact field is a nonempty string, returns no identifier, and keeps collection off. Other identity-like metadata keys do not establish a binding.
- `open_demo`: render one explicitly named fixture session. `read_demo`: reread it. `advance_demo`: reveal its second predefined fixture event in memory. The latter two are app-visible tools; refresh is manual, not a proven push/live feed. No tool accepts a real session ID.

All UI assets are embedded in the resource. Its CSP declares no external connect/resource domains. React renders untrusted labels as text. No cloud service, account, billing, execution engine, ranking, real session capture, or persistent storage exists. Consequently no personal collection can be enabled here; a later collector must require per-session opt-in and sanitize before persistence. The hook itself cannot stop, approve, rewrite, or add context.

## Source evidence and token scope

The [official App Server docs](https://learn.chatgpt.com/docs/app-server) describe `thread/tokenUsage/updated`. The [Codex App Server MCP processor](https://github.com/openai/codex/blob/main/codex-rs/app-server/src/request_processors/mcp_processor.rs) injects the current thread ID into MCP tool-call metadata as `threadId`; the local CLI call and `pnpm probe:host-isolation` confirmed the binding path with two concurrent ephemeral threads. The probe prints no IDs, starts no model turns, and writes no thread data. Exact usage field types were generated from the installed CLI with `codex app-server generate-ts --out work/protocol`; three unmodified generated types and a method excerpt are retained under `evidence/codex-0.162.0-alpha.17.2/`. Synthetic fixtures match that installed shape, including `total`, `last`, `inputTokens`, `outputTokens`, `cachedInputTokens`, `cacheWriteInputTokens`, `reasoningOutputTokens`, and `totalTokens`. The adapter selects the **thread's total snapshot**. It never adds successive cumulative snapshots, adds subsets a second time, estimates from text, or distributes thread totals to tools. These are schema-backed synthetic values, not a real authoritative usage observation. `provenance: synthetic-fixture` is mandatory for parsed reported counters in this L0 contract.

The [official Hooks docs](https://learn.chatgpt.com/docs/hooks) document `session_id`, `hook_event_name`, and nullable `transcript_path`; subagent hook IDs refer to the parent session. No live path or content was inspected. Rollout JSONL is **unstable** and is **not implemented as an input adapter**. A JSONL-shaped object is rejected as unknown; the example transcript path in the hook fixture is invented synthetic data and never read.

The [official packaging docs](https://developers.openai.com/plugins/build/plugins) describe the portable layout, local marketplaces and hook trust. The [MCP extension docs](https://developers.openai.com/plugins/build/extensions) describe thread entrypoints that open MCP Apps within a conversation. The [MCP Apps spec](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md#thread-entrypoint) states that the entrypoint tool receives `{}` as arguments. Codex App Server separately supplies the thread context in `_meta.threadId` for MCP tool calls.

## Manual host validation still required

The plugin is installed and enabled in the local Codex CLI profile. An ephemeral `codex exec` call returned `host-bound`, and `pnpm probe:host-isolation` created two concurrent ephemeral App Server threads; each MCP tool call bound to its own thread context while collection stayed off. CLI did not render the MCP App, and these zero-event calls do not prove event-level UI isolation. A real `turn.completed.usage` counter appeared for a separate isolated CLI turn, but the plugin cannot read that parent turn's usage. See [sanitized host-test evidence](evidence/local-codex-host-test.json).

The native thread panel still needs to be opened in the desktop app to record actual host rendering. The binding path is verified, but the installed local plugin's hook is a no-op and remains untrusted. A Codex right-side **browser preview** is separate from the plugin's MCP Apps surface. Standalone Chromium width screenshots are in `evidence/`; they do not prove host layout behavior.

To clear L0, record actual Codex-hosted evidence of all four conditions: the requested MCP Apps side-panel surface; two disposable real sessions bound and isolated with their own event records; a new real event visible after refresh; and at least one authoritative input/output token counter with source and scope. Preserve only sanitized evidence, then rerun the gate. Stop if any condition remains unproven; do not start Tasks 2–4.
