# Codex App Server attachment recheck — 2026-10-30

## Result

No documented or discoverable connection from the Session Lens MCP subprocess to the active desktop thread's App Server stream was found. The collector remains disabled. This is a bounded negative observation, not proof that Codex has no private internal IPC path.

## Read-only desktop process inspection

- Inspected the current ChatGPT desktop process and its 52 descendants (53 processes total) using process names and `lsof` Unix/TCP endpoint metadata.
- The scan found no recognizable App Server control socket name and no TCP listener in that process tree matching the inspected endpoints. Endpoint paths, remote addresses, thread IDs, and conversation content were not emitted or saved.
- The scan may miss private IPC channels without recognizable socket names. It did not read desktop memory, attach to internal sockets, or inspect session files.

## Protocol evidence

- The [Codex App Server documentation](https://learn.chatgpt.com/docs/app-server) defines `thread/tokenUsage/updated` as a usage update for the active thread and describes clients reading notifications from their active transport stream. A separate MCP server receiving `threadId` metadata does not thereby join that stream.
- The same documentation says `thread/read` reads stored metadata without resuming or subscribing to the thread; clients must start or resume a thread and keep reading notifications from that connection's active transport. Resuming the user's active desktop thread from a second App Server writer previously failed with an active-writer conflict, recorded in [local-codex-host-test.json](local-codex-host-test.json).
- The documented `account/usage/read` surface returns account-level lifetime and daily token-activity summaries. Its scope and granularity do not establish per-thread input/output usage for Session Lens.
- A separate ephemeral CLI turn exposed input/output counts to its own caller. That result was not delivered to the Session Lens MCP UI and cannot satisfy the current-session usage gate.

## Consequence

The remaining L0 gates require a host-supported event/usage bridge or another verified source that identifies the same live conversation and scope. The App Server data shape alone, a separate server process, account-wide summaries, and synthetic fixtures are insufficient. Do not enable capture or begin L1–L4 until the live event and authoritative session-usage paths are verified.
