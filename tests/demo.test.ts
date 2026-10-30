import { describe, expect, it } from 'vitest';
import { DemoStore } from '../src/demo';

describe('fixture sessions', () => {
  it('isolates two independently advanced sessions', async () => {
    const store = new DemoStore();
    const [alpha, beta] = await Promise.all([
      Promise.resolve().then(() => store.advance('fixture-alpha')),
      Promise.resolve().then(() => store.read('fixture-beta')),
    ]);
    expect(alpha).toMatchObject({ sessionId: 'fixture-alpha', revision: 1 });
    expect(beta).toMatchObject({ sessionId: 'fixture-beta', revision: 0 });
    expect(JSON.stringify(beta)).not.toContain('fixture-alpha');
  });
  it('refresh returns new events, does not sum cumulative usage or mutate reads', () => {
    const store = new DemoStore();
    expect(store.read('fixture-alpha')).toMatchObject({ revision: 0, events: [expect.anything()], usage: { counters: { totalTokens: 1000 } } });
    store.advance('fixture-alpha');
    const refreshed = store.read('fixture-alpha');
    expect(refreshed).toMatchObject({ revision: 1, events: [expect.anything(), expect.anything()], usage: { counters: { totalTokens: 2500 } } });
    expect(store.read('fixture-alpha')).toEqual(refreshed);
    expect(store.read('fixture-beta')).toMatchObject({ usage: { status: 'unknown' } });
  });
  it('rejects real session IDs, has no implicit current session, and opts into no collection', () => {
    const store = new DemoStore();
    expect(() => store.read('unrecognized-real-id')).toThrow();
    expect(store.read('fixture-alpha')).toMatchObject({ mode: 'synthetic-fixture', currentSessionBinding: 'unverified', collectionEnabled: false, coverage: 'unknown' });
  });
  it('does not share state between server instances', () => {
    const first = new DemoStore();
    first.advance('fixture-alpha');
    expect(new DemoStore().read('fixture-alpha')).toMatchObject({ revision: 0 });
  });
});
