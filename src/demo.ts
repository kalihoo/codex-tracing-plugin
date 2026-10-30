import { z } from 'zod';
import usageFixtures from '../tests/fixtures/app-server-usage.json';
import { parseAppServerUsage } from './adapters';
import { EventEnvelopeSchema, UsageObservationSchema, unknownUsage } from './contracts';

export const DemoSessionIdSchema = z.enum(['fixture-alpha', 'fixture-beta']);
export type DemoSessionId = z.infer<typeof DemoSessionIdSchema>;
export const DemoSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1), mode: z.literal('synthetic-fixture'),
  sessionId: DemoSessionIdSchema, revision: z.number().int().min(0).max(1),
  currentSessionBinding: z.literal('unverified'), collectionEnabled: z.literal(false),
  coverage: z.literal('unknown'), usage: UsageObservationSchema,
  events: z.array(EventEnvelopeSchema).min(1).max(2),
}).refine((snapshot) => snapshot.events.every((event) => event.sessionId === snapshot.sessionId)
  && snapshot.usage.sessionId === snapshot.sessionId,
{ message: 'Snapshot must contain only its requested session' });
export type DemoSnapshot = z.infer<typeof DemoSnapshotSchema>;

export const HostUnboundSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1), mode: z.literal('host-unbound'),
  sessionBinding: z.literal('unavailable'), collectionEnabled: z.literal(false),
  coverage: z.literal('unavailable'), events: z.tuple([]),
  identityProbe: z.strictObject({
    mcpTransportSessionIdPresent: z.boolean(),
    identityMetadataKinds: z.array(z.enum(['thread', 'conversation', 'session'])).max(3),
  }),
});
export type HostUnboundSnapshot = z.infer<typeof HostUnboundSnapshotSchema>;
export const SessionLensSnapshotSchema = z.discriminatedUnion('mode', [DemoSnapshotSchema, HostUnboundSnapshotSchema]);
export type SessionLensSnapshot = z.infer<typeof SessionLensSnapshotSchema>;

// Ephemeral fixtures only: no host discovery, user content or disk writes.
export class DemoStore {
  private revisions: Record<DemoSessionId, number> = { 'fixture-alpha': 0, 'fixture-beta': 0 };

  read(sessionId: string): DemoSnapshot {
    const id = DemoSessionIdSchema.parse(sessionId);
    const revision = this.revisions[id];
    const events = Array.from({ length: revision + 1 }, (_, index) => ({
      schemaVersion: 1, id: `${id}-event-${index}`, sessionId: id,
      source: 'synthetic', sourceVersion: '1', kind: 'usage-snapshot',
      observedAt: `2026-10-30T00:00:0${index}.000Z`, occurredAt: null,
      parentEventId: null, label: index === 0 ? 'Synthetic initial snapshot' : 'Synthetic refreshed snapshot',
      coverage: 'unknown', usage: id === 'fixture-alpha'
        ? parseAppServerUsage(usageFixtures[index], id) : unknownUsage(id),
    }));
    return DemoSnapshotSchema.parse({ schemaVersion: 1, mode: 'synthetic-fixture',
      sessionId: id, revision, currentSessionBinding: 'unverified', collectionEnabled: false,
      coverage: 'unknown', usage: events.at(-1)?.usage, events });
  }

  advance(sessionId: string): DemoSnapshot {
    const id = DemoSessionIdSchema.parse(sessionId);
    this.revisions[id] = 1;
    return this.read(id);
  }
}
