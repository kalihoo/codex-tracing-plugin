# Session Lens L0 host recheck — 2026-10-30

## Result

L0 remains **blocked**. Local package checks pass, Codex thread identity binding is verified, and the user has confirmed that the Session Lens panel displayed after opening `open_session` in a separate fresh local Codex chat. No lifecycle event has reached Session Lens, and no authoritative real token usage has been delivered to its UI. L1–L4 remain gated.

## Current local verification

- `pnpm package:local` passed strict TypeScript checking, Vite/server builds, 53 tests across 7 files, stdio MCP smoke, and creation of a sanitized local package. The UI now defaults to Simplified Chinese and includes an English toggle; the refreshed Codex-hosted UI still needs a user check.
- The stdio smoke covers two synthetic sessions, refresh from one to two events, cumulative usage snapshots, unknown usage, and the inline UI. It explicitly provides no real-host proof.
- The local Codex CLI MCP call and two-thread App Server probe recorded in `local-codex-host-test.json` bind only to the exact Codex `threadId` metadata field. Both probe calls returned empty event lists and withheld raw IDs.
- The installed lifecycle hook is still a silent `SessionStart` no-op; hook trust is off and collection is disabled. No conversation content was read or persisted during this recheck.
- An isolated `codex exec --ephemeral --ignore-user-config` probe used a temporary `SessionStart` hook that was limited to recording field-presence booleans. The CLI announced `SessionStart`, but reported the hook as failed and produced no result marker. The same probe script parsed the synthetic hook fixture successfully. A read-only sandbox blocking the marker write is a plausible explanation, not a confirmed cause. This did not verify live hook payload delivery or the plugin hook. The short model turn displayed 8,559 tokens used.
- A follow-up disposable CLI run switched the probe's working directory to the writable ignored `work/` area. The temporary hook then received a real `SessionStart` JSON payload and recorded only booleans: valid JSON, `session_id`, `cwd`, and `source` were present; `transcript_path` was absent. This is one ephemeral CLI sample from a custom one-off hook, not proof that the installed plugin hook or desktop side panel receives events. No raw fields or persistent session files were retained. Codex displayed 9,004 tokens used for the short model turn.
- A separate no-model App Server probe used a temporary `CODEX_HOME`, an ephemeral `thread/start`, and the same allowlist-only hook with invocation-scoped trust bypass. The thread started, but no hook payload was observed. This only establishes that this App Server `thread/start` probe did not deliver the hook; it does not rule out hook delivery during a real turn.

## Desktop host observation

- The current Codex desktop thread is identified by the host tooling as a local active Codex thread. The current/original chat and the separate fresh test chat are distinct; inspection of this original chat does not reveal tools from the fresh chat.
- `codex plugin list --json` reports `session-lens@session-lens-local` installed and enabled at version `0.1.0-l0` in the local CLI profile. However, the current desktop chat's available MCP tool inventory contains no Session Lens tools, and the Codex MCP Apps surface still has zero tabs. The reason the already-running chat does not expose the plugin is unknown; this does not prove that a fresh chat or another Codex build would behave the same way.
- The user explicitly confirmed that the Session Lens thread entrypoint is not visible in the current chat. This confirms the current-chat activation check failed; it does not identify the cause or establish behavior in a fresh chat/build.
- In a separate fresh local Codex test chat, the user first confirmed the Session Lens entrypoint was visible and its thread record confirmed that `open_session` completed. The follow-up probe could not inspect that chat's MCP Apps tab. The user then explicitly confirmed that opening the entrypoint **displayed the Session Lens panel**. Count the panel-render requirement as passed based on user confirmation; no independent screenshot or tab inspection was available. Live events and real usage remain unverified.
- The `Codex MCP Apps` surface accessible to this coordinating chat currently has zero tabs. It is scoped to the original chat and is not evidence that the separately confirmed fresh-chat panel failed to render.
- The separate local browser preview at `http://127.0.0.1:4175/` is not an MCP App host render and is not counted as side-panel evidence.
- The registered `open_session` tool advertises a thread entrypoint. OpenAI's [plugin extension documentation](https://developers.openai.com/plugins/build/extensions) describes conversation panels as a place users can open an app beside a conversation, but does not document an API for mounting that entrypoint programmatically.
- OpenAI's [MCP server and UI quickstart](https://developers.openai.com/plugins/build/app-quickstart) describes MCP tools for both ChatGPT and Codex, with optional UI rendered in ChatGPT. It says ChatGPT implements MCP Apps and the UI works in other compatible hosts; it does not confirm the current Codex desktop build as a compatible renderer.
- OpenAI's [MCP Apps UI guide](https://developers.openai.com/plugins/build/chatgpt-ui) likewise says ChatGPT implements MCP Apps and frames other hosts as compatible-host implementations; it does not name the current Codex desktop build as a supported UI host. This is a documentation gap, not proof of incompatibility. Combined with the zero-tab surface and missing Session Lens tools in the current chat, Codex desktop UI support remains unverified.
- Read-only process/socket checks did not identify a desktop-owned App Server control endpoint. The documented default control-socket path was absent. This is an observation about this machine, not proof that no supported endpoint exists in every Codex build.

## Gate table

| Requirement | Result | Missing evidence |
|---|---|---|
| Codex MCP App side panel | Passed by user confirmation | The user confirmed the Session Lens panel displayed in a separate fresh local Codex chat after opening `open_session`; an independent screenshot/tab inspection is unavailable |
| Correct session binding | Partially verified | Thread ID binding passes; two real desktop App instances showing separate real events are still unverified |
| Live event refresh | Blocked | A real lifecycle event from this conversation appears in the actual plugin panel after refresh |
| Authoritative token counter | Blocked | A host usage observation reaches the plugin UI with source, scope, model, and session identity |

OpenAI's [Codex App Server documentation](https://learn.chatgpt.com/docs/app-server) lists `thread/tokenUsage/updated` for an active thread. The existence and documented shape of that notification do not establish that a third-party MCP App can subscribe to the running desktop thread. Session Lens has not observed that notification from the user's live thread.

## Next acceptance action

Rebuild and reload the now-localized plugin, then open `open_session` in a fresh local Codex chat to verify that Chinese is the default and that the EN/中文 switch works in the actual host. The panel itself has already been confirmed visible. Separately, continue validating correct thread binding, live event refresh, and a host-delivered real token counter; keep later phases gated until the remaining checks pass.

The successful CLI hook sample used a writable, ignored probe directory and a temporary one-off hook. It must not be interpreted as the installed plugin collecting session content. Hook sources remain untrusted in the user's persistent configuration and collection remains disabled.
