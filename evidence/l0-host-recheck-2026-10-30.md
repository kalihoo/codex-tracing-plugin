# Session Lens L0 host recheck — 2026-10-30

## Result

L0 remains **blocked**. Local package checks pass, Codex thread identity binding is verified, and the user has confirmed that the Session Lens panel displayed after opening `open_session` in a separate fresh local Codex chat. The user also confirmed that this refreshed host panel defaults to Simplified Chinese and its EN button switches to English. No lifecycle event has reached Session Lens, and no authoritative real token usage has been delivered to its UI. L1–L4 remain gated.

## Current local verification

- `pnpm package:local` on workspace version `0.1.1-l0` passed strict TypeScript checking, Vite/server/hook builds, 60 tests across 9 files, stdio MCP smoke, and creation of a sanitized local package. The UI defaults to Simplified Chinese and includes an English toggle; the user confirmed both behaviors in the installed `0.1.0-l0` Codex-hosted panel (see `i18n-browser-checks.md`).
- The stdio smoke covers two synthetic sessions, refresh from one to two events, cumulative usage snapshots, unknown usage, and the inline UI. It explicitly provides no real-host proof.
- The local Codex CLI MCP call and two-thread App Server probe recorded in `local-codex-host-test.json` bind only to the exact Codex `threadId` metadata field. Both probe calls returned empty event lists and withheld raw IDs.
- The updated `0.1.1-l0` package is now installed and enabled in the local Codex CLI profile. Its asynchronous, opt-in `UserPromptSubmit` hook is not yet trusted, so it has not been verified in the host. OpenAI's [hooks documentation](https://learn.chatgpt.com/docs/hooks) states that changed plugin hook definitions are skipped until a user reviews and trusts the exact definition. No real event or conversation content was read or persisted during this recheck.
- An isolated `codex exec --ephemeral --ignore-user-config` probe used a temporary `SessionStart` hook that was limited to recording field-presence booleans. The CLI announced `SessionStart`, but reported the hook as failed and produced no result marker. The same probe script parsed the synthetic hook fixture successfully. A read-only sandbox blocking the marker write is a plausible explanation, not a confirmed cause. This did not verify live hook payload delivery or the plugin hook. The short model turn displayed 8,559 tokens used.
- A follow-up disposable CLI run switched the probe's working directory to the writable ignored `work/` area. The temporary hook then received a real `SessionStart` JSON payload and recorded only booleans: valid JSON, `session_id`, `cwd`, and `source` were present; `transcript_path` was absent. This is one ephemeral CLI sample from a custom one-off hook, not proof that the installed plugin hook or desktop side panel receives events. No raw fields or persistent session files were retained. Codex displayed 9,004 tokens used for the short model turn.
- A separate no-model App Server probe used a temporary `CODEX_HOME`, an ephemeral `thread/start`, and the same allowlist-only hook with invocation-scoped trust bypass. The thread started, but no hook payload was observed. This only establishes that this App Server `thread/start` probe did not deliver the hook; it does not rule out hook delivery during a real turn.

## Desktop host observation

- The current Codex desktop thread is identified by the host tooling as a local active Codex thread. The current/original chat and the separate fresh test chat are distinct; inspection of this original chat does not reveal tools from the fresh chat.
- Before this update, `codex plugin list --json` reported `0.1.0-l0`; it now reports `0.1.1-l0` installed and enabled from the sanitized local package. The current desktop chat's available MCP tool inventory still belongs to the original chat; a new chat is needed to load the updated entrypoint. The changed hook remains untrusted pending review.
- The user explicitly confirmed that the Session Lens thread entrypoint is not visible in the current chat. This confirms the current-chat activation check failed; it does not identify the cause or establish behavior in a fresh chat/build.
- In a separate fresh local Codex test chat, the user first confirmed the Session Lens entrypoint was visible and its thread record confirmed that `open_session` completed. The follow-up probe could not inspect that chat's MCP Apps tab. The user then explicitly confirmed that opening the entrypoint **displayed the Session Lens panel**. Count the panel-render requirement as passed based on user confirmation; no independent screenshot or tab inspection was available. Live events and real usage remain unverified.
- After reloading the localized build in a fresh local Codex chat, the user explicitly confirmed the panel defaults to Chinese and the EN button switches it to English. Count localization in the actual host as user-confirmed; the automation surface could not produce an independent host screenshot.
- The `Codex MCP Apps` surface accessible to this coordinating chat currently has zero tabs. It is scoped to the original chat and is not evidence that the separately confirmed fresh-chat panel failed to render.
- The separate local browser preview at `http://127.0.0.1:4175/` is not an MCP App host render and is not counted as side-panel evidence.
- The registered `open_session` tool advertises a thread entrypoint. OpenAI's [plugin extension documentation](https://developers.openai.com/plugins/build/extensions) describes conversation panels as a place users can open an app beside a conversation, but does not document an API for mounting that entrypoint programmatically.
- OpenAI's [MCP server and UI quickstart](https://developers.openai.com/plugins/build/app-quickstart) describes MCP tools for both ChatGPT and Codex, with optional UI rendered in ChatGPT. It says ChatGPT implements MCP Apps and the UI works in other compatible hosts; it does not confirm the current Codex desktop build as a compatible renderer.
- OpenAI's [MCP Apps UI guide](https://developers.openai.com/plugins/build/chatgpt-ui) likewise says ChatGPT implements MCP Apps and frames other hosts as compatible-host implementations; it does not name the current Codex desktop build as a supported UI host. This remains a documentation gap. The user confirmed that the current tested desktop build did render the panel, while the coordinating chat's zero-tab surface and absent tools remain specific to that chat.
- Read-only process/socket checks did not identify a desktop-owned App Server control endpoint. The documented default control-socket path was absent. This is an observation about this machine, not proof that no supported endpoint exists in every Codex build.

## Gate table

| Requirement | Result | Missing evidence |
|---|---|---|
| Codex MCP App side panel | Passed by user confirmation | The user confirmed the Session Lens panel displayed in a separate fresh local Codex chat after opening `open_session`; an independent screenshot/tab inspection is unavailable |
| Correct session binding | Partially verified | Thread ID binding passes; two real desktop App instances showing separate real events are still unverified |
| Live event refresh | Blocked | A real lifecycle event from this conversation appears in the actual plugin panel after refresh |
| Authoritative token counter | Blocked | A host usage observation reaches the plugin UI with source, scope, model, and session identity |

OpenAI's [Codex App Server documentation](https://learn.chatgpt.com/docs/app-server) lists `thread/tokenUsage/updated` for an active thread and says clients consume lifecycle notifications from their active transport stream. The existence and documented shape of that notification do not establish that a third-party MCP App can subscribe to the running desktop thread. Session Lens has not observed that notification from the user's live thread.

## Next acceptance action

The localized host rendering and language switch are confirmed. The workspace now contains an opt-in, metadata-only `UserPromptSubmit` hook and a local MCP refresh path. The installed package has not yet been updated/trusted for this implementation, and a synthetic hook payload only verifies local code plumbing. Continue validating correct thread binding with a real event, live event refresh, and a host-delivered real token counter; keep later phases gated until those remaining checks pass.

The successful CLI hook sample used a writable, ignored probe directory and a temporary one-off hook. It must not be interpreted as the installed plugin collecting session content. Hook sources remain untrusted in the user's persistent configuration and collection remains disabled until the user reviews and enables the updated local plugin definition. The new workspace hook only writes metadata after explicit per-thread opt-in; actual `session_id` ↔ Codex `threadId` equality has not been demonstrated by a real event.
