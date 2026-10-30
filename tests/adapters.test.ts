import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/app-server-usage.json';
import hook from './fixtures/hook-session-start.json';
import { parseAppServerUsage, parseHookIdentity } from '../src/adapters';

describe('evidenced source adapters (synthetic input only)', () => {
  it('retains exact cumulative counters and their subset semantics', () => {
    expect(parseAppServerUsage(fixtures[1], 'fixture-alpha')).toMatchObject({
      status: 'reported', sessionId: 'fixture-alpha', scope: 'thread',
      aggregation: 'cumulative-snapshot', counters: {
        inputTokens: 2200, outputTokens: 300, totalTokens: 2500,
        cachedInputTokens: 1000, reasoningOutputTokens: 75,
      },
    });
  });
  it('never passes another thread’s usage to the requested session', () => {
    expect(parseAppServerUsage(fixtures[0], 'fixture-beta')).toMatchObject({ status: 'unknown', reason: 'session-mismatch' });
    expect(JSON.stringify(parseAppServerUsage(fixtures[0], 'fixture-beta'))).not.toContain('900');
  });
  it.each([null, {}, { method: 'future/usage' }, { method: 'thread/tokenUsage/updated', params: { threadId: 'fixture-alpha', tokenUsage: null } }])('preserves unavailable input as unknown: %j', (input) => {
    expect(parseAppServerUsage(input, 'fixture-alpha')).toMatchObject({ status: 'unknown' });
  });
  it.each([-1, 1.2, Number.MAX_SAFE_INTEGER + 1, '2200'])('rejects invalid counter %s', (value) => {
    const input = structuredClone(fixtures[1]!);
    Object.assign(input.params.tokenUsage.total, { inputTokens: value });
    expect(parseAppServerUsage(input, 'fixture-alpha')).toMatchObject({ status: 'unknown', reason: 'invalid-source-shape' });
  });
  it('rejects missing input rather than estimating from text', () => {
    const input = structuredClone(fixtures[0]!);
    Reflect.deleteProperty(input.params.tokenUsage.total, 'inputTokens');
    Object.assign(input.params, { text: 'a'.repeat(10000) });
    expect(parseAppServerUsage(input, 'fixture-alpha')).toMatchObject({ status: 'unknown' });
  });
  it('rejects inconsistent cached input subsets', () => {
    const input = structuredClone(fixtures[0]!);
    input.params.tokenUsage.total.cachedInputTokens = 901;
    expect(parseAppServerUsage(input, 'fixture-alpha')).toMatchObject({ status: 'unknown' });
  });
  it('extracts only the documented hook identity, never a transcript path or content', () => {
    expect(parseHookIdentity({ ...hook, prompt: 'sk-synthetic-secret' })).toEqual({ sessionId: 'fixture-alpha', eventName: 'SessionStart' });
  });
  it('does not accept invented hook or rollout shapes', () => {
    expect(parseHookIdentity({ sessionId: 'fixture-alpha', event: 'start' })).toBeNull();
    expect(parseHookIdentity({ ...hook, hook_event_name: 'FutureEvent' })).toBeNull();
    expect(parseAppServerUsage({ type: 'event_msg', payload: { type: 'token_count' } }, 'fixture-alpha')).toMatchObject({ status: 'unknown' });
  });
});
