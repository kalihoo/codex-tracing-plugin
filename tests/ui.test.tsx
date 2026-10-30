import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DemoStore, SessionLensSnapshotSchema } from '../src/demo';
import { DemoController } from '../src/ui/controller';
import { nextLanguage } from '../src/ui/i18n';
import { SessionLensView } from '../src/ui/view';

describe('fixture UI', () => {
  it('switches between the default Chinese and English locales', () => {
    expect(nextLanguage('zh-CN')).toBe('en');
    expect(nextLanguage('en')).toBe('zh-CN');
  });

  it('renders the host-bound interface in Chinese by default with an English switch', () => {
    const snapshot = SessionLensSnapshotSchema.parse({ schemaVersion: 1, mode: 'host-bound', sessionBinding: 'codex-thread-id', collectionEnabled: false, coverage: 'unavailable', events: [], identityProbe: { mcpTransportSessionIdPresent: true, codexThreadIdPresent: true, identityMetadataKinds: ['thread'] } });
    const html = renderToStaticMarkup(<SessionLensView snapshot={snapshot} status="ready" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('已识别当前 Codex 会话');
    expect(html).toContain('输入 Token');
    expect(html).toContain('aria-label="切换为英文"');
    expect(html).not.toContain('Collection off');
    expect(html).not.toContain('No session data captured');
  });

  it('renders the interface in English when selected', () => {
    const snapshot = SessionLensSnapshotSchema.parse({ schemaVersion: 1, mode: 'host-bound', sessionBinding: 'codex-thread-id', collectionEnabled: false, coverage: 'unavailable', events: [], identityProbe: { mcpTransportSessionIdPresent: true, codexThreadIdPresent: true, identityMetadataKinds: ['thread'] } });
    const html = renderToStaticMarkup(<SessionLensView snapshot={snapshot} status="ready" busy={false} refresh={() => {}} advance={() => {}} language="en" onLanguageChange={() => {}} />);
    expect(html).toContain('Current Codex thread recognized');
    expect(html).toContain('Input tokens');
    expect(html).toContain('aria-label="Switch to Chinese"');
    expect(html).not.toContain('已识别当前 Codex 会话');
  });

  it('keeps the host waiting state distinct from the synthetic preview', () => {
    const html = renderToStaticMarkup(<SessionLensView snapshot={null} status="waiting-host" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('等待 Codex 宿主响应');
    expect(html).toContain('不可用');
    expect(html).not.toContain('Synthetic fixture');
    expect(html).not.toContain('fixture-alpha');
  });

  it('renders the native thread entrypoint as unbound and unavailable, never as fixture usage', async () => {
    const result = {
      structuredContent: { schemaVersion: 1, mode: 'host-unbound', sessionBinding: 'unavailable', collectionEnabled: false, coverage: 'unavailable', events: [], identityProbe: { mcpTransportSessionIdPresent: false, codexThreadIdPresent: false, identityMetadataKinds: [] } },
    };
    let calls = 0;
    const controller = new DemoController(async () => { calls++; return {}; });
    expect(() => controller.receive(result)).not.toThrow();
    await expect(controller.refresh()).rejects.toThrow('No fixture session is open');
    const html = renderToStaticMarkup(<SessionLensView snapshot={controller.current} status="host-unbound" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('未绑定当前会话');
    expect(html).toContain('未采集');
    expect(html).toContain('不可用');
    expect(html).not.toContain('fixture-alpha');
    expect(html).not.toContain('1000');
    expect(calls).toBe(0);
  });

  it('shows identity-like metadata key presence without treating it as a verified session binding', () => {
    const controller = new DemoController(async () => ({}));
    controller.receive({ structuredContent: { schemaVersion: 1, mode: 'host-unbound', sessionBinding: 'unavailable', collectionEnabled: false, coverage: 'unavailable', events: [], identityProbe: { mcpTransportSessionIdPresent: true, codexThreadIdPresent: false, identityMetadataKinds: ['thread'] } } });
    const html = renderToStaticMarkup(<SessionLensView snapshot={controller.current} status="host-unbound" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('检测到线程身份类 metadata 键名');
    expect(html).toContain('身份信息未验证');
    expect(html).toContain('尚未验证它们能否绑定当前会话');
    expect(html).toContain('诊断会检查身份 metadata 类别');
    expect(html).toContain('原始键名与标识值不会在界面展示或持久化');
    expect(html).not.toContain('sessionId');
  });

  it('explains metadata handling accurately in English too', () => {
    const snapshot = SessionLensSnapshotSchema.parse({ schemaVersion: 1, mode: 'host-unbound', sessionBinding: 'unavailable', collectionEnabled: false, coverage: 'unavailable', events: [], identityProbe: { mcpTransportSessionIdPresent: false, codexThreadIdPresent: false, identityMetadataKinds: ['thread'] } });
    const html = renderToStaticMarkup(<SessionLensView snapshot={snapshot} status="host-unbound" busy={false} refresh={() => {}} advance={() => {}} language="en" />);
    expect(html).toContain('Session-binding diagnostics inspect identity metadata categories');
    expect(html).toContain('raw key names and identifier values are not displayed or persisted');
  });

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

  it('shows a host-bound Codex thread without rendering its identifier or enabling collection', () => {
    const controller = new DemoController(async () => ({}));
    controller.receive({ structuredContent: { schemaVersion: 1, mode: 'host-bound', sessionBinding: 'codex-thread-id', collectionEnabled: false, coverage: 'unavailable', events: [], identityProbe: { mcpTransportSessionIdPresent: true, codexThreadIdPresent: true, identityMetadataKinds: ['thread'] } } });
    const html = renderToStaticMarkup(<SessionLensView snapshot={controller.current} status="host-bound" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('已识别当前 Codex 会话');
    expect(html).toContain('采集关闭');
    expect(html).not.toContain('synthetic-private-id');
    expect(html).not.toContain('threadId');
  });
  it('escapes malicious content and renders unavailable usage explicitly', () => {
    const snapshot = new DemoStore().read('fixture-beta');
    snapshot.events[0]!.label = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const html = renderToStaticMarkup(<SessionLensView snapshot={snapshot} status="ready" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('未知');
    expect(html).toContain('合成数据示例');
    expect(html).toContain('采集已关闭');
  });
  it('labels cached input and reasoning as subsets of cumulative thread totals', () => {
    const html = renderToStaticMarkup(<SessionLensView snapshot={new DemoStore().read('fixture-alpha')} status="ready" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('会话累计用量快照');
    expect(html).toContain('子项');
    expect(html).toContain('宿主能力待验证');
  });

  it('localizes synthetic fixture states and labels in Chinese', () => {
    const html = renderToStaticMarkup(<SessionLensView snapshot={new DemoStore().read('fixture-alpha')} status="ready" busy={false} refresh={() => {}} advance={() => {}} />);
    expect(html).toContain('示例会话 A');
    expect(html).not.toContain('fixture-alpha');
    expect(html).toContain('未验证');
    expect(html).toContain('初始合成快照');
    expect(html).not.toContain('unverified');
    expect(html).not.toContain('Synthetic initial snapshot');
  });
});
