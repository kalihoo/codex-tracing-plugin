# L0 App Server MCP hook probe — 2026-10-31

## Setup

- Local Codex CLI: `0.162.0-alpha.17.2`.
- `codex plugin list --json` reports `session-lens@session-lens-local` `0.1.3-l0` installed and enabled. The active config has `plugins."session-lens@session-lens-local".enabled = true`; the global `features.hooks` setting is unset, and `codex features list` reports `hooks` stable and enabled.
- The current coordinating chat exposes no Session Lens MCP tools. The user reported that the desktop `/hooks` view had no Session Lens entry or showed it as not installed; the earlier zero-event screenshot was from 0.1.1, and no new prompt had been submitted after enabling capture.

## Disposable App Server turn

Ran `pnpm probe:host-hook` against an ephemeral local App Server thread with invocation-only `--dangerously-bypass-hook-trust`. `PLUGIN_DATA` pointed to a temporary directory which the probe removed. The probe printed no prompt text or thread ID.

Observed:

- The `session_lens` MCP server was connected for the ephemeral thread.
- Calling `set_collection` for that thread succeeded.
- A harmless one-turn request completed and App Server emitted one `thread/tokenUsage/updated` notification.
- `read_session` after the turn returned **zero** `UserPromptSubmit` events.
- Calling `record_prompt_submit` directly through the same App Server MCP connection then produced **one** event in that thread. A separate no-model probe also confirmed zero events before the direct tool call and one after it.
- The MCP server, per-thread opt-in, direct tool write, and thread-bound read path therefore work in the local App Server test. Lifecycle hook delivery did not occur in this App Server probe.

## Interpretation and limit

This result does not prove that the Codex desktop app fails to dispatch plugin hooks. It does show that successful package installation, an enabled plugin, a connected MCP server, hook-trust bypass for one invocation, and a completed App Server turn are insufficient to produce an event in this CLI App Server test. Desktop hook discovery, user review/trust, invocation, side-panel refresh, and two-desktop-chat isolation remain unverified. The observed token notification belongs to the disposable App Server thread and was not delivered to the Session Lens UI.

Reproduce the disposable turn with `pnpm probe:host-hook`. The probe intentionally makes one real model request; do not run it as a routine build check.

## Desktop install-path clarification

The initial local install was verified with `codex plugin add`, which confirms the CLI profile only. The [official plugin packaging guide](https://developers.openai.com/plugins/build/plugins) distinguishes CLI marketplace registration from desktop installation: lifecycle-hook plugins must be manually installed in Codex desktop, and a repo marketplace at `.agents/plugins/marketplace.json` is surfaced from the repository in the desktop Plugins Directory. Therefore, the CLI install/list output and this App Server probe cannot establish that the desktop hook was installed or loaded.

The repository marketplace points to the sanitized `work/package/session-lens` build. The user most recently reported that `/hooks` had no Session Lens entry or showed it as not installed, and that no new prompt had yet been sent after enabling capture. No desktop marketplace installation or reload is confirmed. The missing trigger means no new event was expected in that check; the missing hook entry remains unresolved. The next desktop test must open this repository, restart Codex, install Session Lens from the **Session Lens local testing** source in Plugins Directory, review/trust `UserPromptSubmit`, enable collection, then send and refresh a new prompt.

These steps are documented from the current official packaging guide, but the coordinating surface cannot perform the app UI installation or trust action. Until the user completes that desktop flow and confirms the hook appears and records an event, L0 remains blocked.
