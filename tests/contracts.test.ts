import { describe, expect, it } from 'vitest';
import { EventEnvelopeSchema, UsageObservationSchema } from '../src/contracts';

const unknownUsage = {
  schemaVersion: 1, status: 'unknown', sessionId: 'fixture-alpha',
  source: 'codex-app-server', sourceVersion: '0.162.0-alpha.17.2',
  scope: 'thread', aggregation: 'cumulative-snapshot', reason: 'unavailable',
};
const event = {
  schemaVersion: 1, id: 'fixture-event-1', sessionId: 'fixture-alpha',
  source: 'synthetic', sourceVersion: '1', kind: 'session-start',
  observedAt: '2026-10-30T00:00:00.000Z', occurredAt: null,
  parentEventId: null, label: 'Synthetic session', coverage: 'unknown', usage: unknownUsage,
};

describe('v1 contracts', () => {
  it('accepts explicit unknown usage, timing and causality without zeros', () => {
    expect(EventEnvelopeSchema.safeParse(event).success).toBe(true);
    expect(UsageObservationSchema.safeParse(unknownUsage).success).toBe(true);
  });
  it('rejects future versions and raw payload properties', () => {
    expect(EventEnvelopeSchema.safeParse({ ...event, schemaVersion: 2 }).success).toBe(false);
    expect(EventEnvelopeSchema.safeParse({ ...event, rawPrompt: 'secret' }).success).toBe(false);
  });
  it('rejects usage belonging to another session', () => {
    expect(EventEnvelopeSchema.safeParse({ ...event, usage: { ...unknownUsage, sessionId: 'fixture-beta' } }).success).toBe(false);
  });
  it('prevents tool attribution of thread totals', () => {
    expect(UsageObservationSchema.safeParse({ ...unknownUsage, scope: 'tool' }).success).toBe(false);
  });
});
