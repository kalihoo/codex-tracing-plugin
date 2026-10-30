import { collectHookEventFromStdin } from './collector';

// Fail open: the collector discards the hook payload unless this exact session
// has explicitly enabled metadata-only capture in the local Session Lens UI.
await collectHookEventFromStdin(process.env.PLUGIN_DATA, process.stdin);
