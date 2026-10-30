import { z } from 'zod';

export const CODEX_SOURCE_VERSION = '0.162.0-alpha.17.2';
export const SessionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const TokenCountersSchema = z.strictObject({
  totalTokens: count, inputTokens: count, cachedInputTokens: count,
  cacheWriteInputTokens: count, outputTokens: count, reasoningOutputTokens: count,
}).refine((value) => value.cachedInputTokens <= value.inputTokens
  && value.cacheWriteInputTokens <= value.inputTokens
  && value.reasoningOutputTokens <= value.outputTokens,
{ message: 'Cached input and reasoning output are subsets, never additional totals' });

const usageBase = {
  schemaVersion: z.literal(1), sessionId: SessionIdSchema,
  source: z.literal('codex-app-server'), sourceVersion: z.literal(CODEX_SOURCE_VERSION),
  scope: z.literal('thread'), aggregation: z.literal('cumulative-snapshot'),
};

export const UsageObservationSchema = z.discriminatedUnion('status', [
  z.strictObject({ ...usageBase, status: z.literal('reported'),
    // Reported refers to the parsed counter shape. This L0 adapter is fixture-only.
    provenance: z.literal('synthetic-fixture'), turnId: SessionIdSchema,
    counters: TokenCountersSchema }),
  z.strictObject({ ...usageBase, status: z.literal('unknown'),
    reason: z.enum(['unavailable', 'session-mismatch', 'invalid-source-shape']) }),
]);
export type UsageObservation = z.infer<typeof UsageObservationSchema>;

export const EventEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1), id: SessionIdSchema, sessionId: SessionIdSchema,
  source: z.literal('synthetic'), sourceVersion: z.literal('1'),
  kind: z.enum(['session-start', 'usage-snapshot', 'fixture-event']),
  observedAt: z.iso.datetime(), occurredAt: z.iso.datetime().nullable(),
  parentEventId: SessionIdSchema.nullable(), label: z.string().max(4000),
  coverage: z.literal('unknown'), usage: UsageObservationSchema,
}).refine((event) => event.usage.sessionId === event.sessionId,
  { message: 'Event and usage must belong to the same session' });
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export function unknownUsage(sessionId: string, reason: 'unavailable' | 'session-mismatch' | 'invalid-source-shape' = 'unavailable'): UsageObservation {
  return UsageObservationSchema.parse({
    schemaVersion: 1, sessionId, source: 'codex-app-server',
    sourceVersion: CODEX_SOURCE_VERSION, scope: 'thread',
    aggregation: 'cumulative-snapshot', status: 'unknown', reason,
  });
}
