import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DemoStore } from '../src/demo';
import { DemoController } from '../src/ui/controller';
import { SessionLensView } from '../src/ui/view';

describe('fixture UI', () => {
  it('refreshes the bound synthetic session after a new event arrives', async () => {
    const store = new DemoStore();
    const calls: string[] = [];
    const controller = new DemoController(async (name, sessionId) => { calls.push(`${name}:${sessionId}`); return { structuredContent: store.read(sessionId) }; });
    controller.receive({ structuredContent: store.read('fixture-alpha') });
    store.advance('fixture-alpha');
    await controller.refresh();
    expect(calls).toEqual(['read_demo:fixture-alpha']);
    expect(controller.current).toMatchObject({ revision: 1, events: [expect.anything(), expect.anything()] });
  });
  it('rejects mismatched, malformed or regressing updates without losing the bound snapshot', async () => {
    const store = new DemoStore();
    const controller = new DemoController(async () => ({ structuredContent: store.read('fixture-beta') }));
    controller.receive({ structuredContent: store.advance('fixture-alpha') });
    await expect(controller.refresh()).rejects.toThrow();
    expect(() => controller.receive({ structuredContent: store.read('fixture-alpha') })).not.toThrow();
    expect(controller.current).toMatchObject({ sessionId: 'fixture-alpha', revision: 1 });
    expect(() => controller.receive({ structuredContent: { sessionId: 'fixture-alpha' } })).toThrow();
  });
  it('does not call a tool without an explicit initial fixture binding', async () => {
    let calls = 0;
    const controller = new DemoController(async () => { calls++; return {}; });
    await expect(controller.refresh()).rejects.toThrow();
    expect(calls).toBe(0);
  });
  it('escapes malicious content and renders unavailable usage explicitly', () => {
    const snapshot = new DemoStore().read('fixture-beta');
    snapshot.events[0]!.label = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const html = renderToStaticMarkup(<SessionLensView snapshot={snapshot} status="Ready" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('Unknown');
    expect(html).toContain('Synthetic fixture');
    expect(html).toContain('Collection off');
  });
  it('labels cached input and reasoning as subsets of cumulative thread totals', () => {
    const html = renderToStaticMarkup(<SessionLensView snapshot={new DemoStore().read('fixture-alpha')} status="Ready" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('Cumulative thread snapshot');
    expect(html).toContain('subset');
    expect(html).toContain('Host gates unverified');
  });
});
