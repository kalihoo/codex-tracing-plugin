import { z } from 'zod';
import { CODEX_SOURCE_VERSION, SessionIdSchema, TokenCountersSchema, unknownUsage,
  UsageObservationSchema, type UsageObservation } from './contracts';

// Deliberately parses only synthetic values supplied by the caller. No file,
// socket, discovery, subscription, transcript, or host authorization exists here.
const appServerNotification = z.object({
  method: z.literal('thread/tokenUsage/updated'),
  params: z.object({ threadId: SessionIdSchema, turnId: SessionIdSchema,
    tokenUsage: z.object({ total: TokenCountersSchema, last: TokenCountersSchema,
      modelContextWindow: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable() }) }),
});

export function parseAppServerUsage(input: unknown, sessionId: string): UsageObservation {
  SessionIdSchema.parse(sessionId);
  const identity = z.object({ params: z.object({ threadId: SessionIdSchema }) }).safeParse(input);
  if (identity.success && identity.data.params.threadId !== sessionId) return unknownUsage(sessionId, 'session-mismatch');
  const result = appServerNotification.safeParse(input);
  if (!result.success) return unknownUsage(sessionId, input == null ? 'unavailable' : 'invalid-source-shape');
  return UsageObservationSchema.parse({
    schemaVersion: 1, sessionId, status: 'reported', provenance: 'synthetic-fixture',
    source: 'codex-app-server', sourceVersion: CODEX_SOURCE_VERSION,
    scope: 'thread', aggregation: 'cumulative-snapshot',
    turnId: result.data.params.turnId, counters: result.data.params.tokenUsage.total,
  });
}

const hookIdentity = z.object({
  session_id: SessionIdSchema,
  hook_event_name: z.enum(['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'PreToolUse',
    'PostToolUse', 'PermissionRequest', 'SubagentStart', 'SubagentStop', 'Stop',
    'Interrupt', 'PreCompact', 'PostCompact']),
});

export function parseHookIdentity(input: unknown): { sessionId: string; eventName: string } | null {
  const result = hookIdentity.safeParse(input);
  return result.success ? { sessionId: result.data.session_id, eventName: result.data.hook_event_name } : null;
}
