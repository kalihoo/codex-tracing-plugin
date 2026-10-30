import type { SessionLensSnapshot } from '../demo';
export function SessionLensView({ snapshot, status, busy, refresh, advance }: { snapshot: SessionLensSnapshot | null; status: string; busy: boolean; refresh: () => void; advance: () => void }) {
  if (!snapshot) return <main>
    <header><p className="eyebrow">L0 · Codex thread entrypoint</p><h1>Session Lens</h1>
      <p className="notice">Collection off · waiting for host</p></header>
    <section aria-label="Host response status">
      <h2>等待 Codex 宿主响应</h2>
      <p>尚未收到会话绑定或事件快照。当前没有读取或保存会话内容。</p>
      <p role="status" aria-live="polite">{status}</p>
    </section>
    <section aria-label="Unavailable usage">
      <h2>Token 用量</h2>
      <dl><div><dt>输入</dt><dd>不可用</dd></div><div><dt>输出</dt><dd>不可用</dd></div><div><dt>来源</dt><dd>未连接</dd></div></dl>
    </section>
    <footer>Session Lens 0.1.0-l0 · No session data captured</footer>
  </main>;

  if (snapshot?.mode === 'host-unbound') return <main>
    <header><p className="eyebrow">L0 · Codex thread entrypoint</p><h1>Session Lens</h1>
      <p className="notice">Collection off · host identity unavailable</p></header>
    <section aria-label="Host binding status">
      <h2>未绑定当前会话</h2>
      <p>此页面已打开，但传给 MCP 入口工具的参数不包含会话标识。本版本也未连接生命周期事件流，因此不会读取或保存此对话内容。</p>
      <p role="status" aria-live="polite">{status}</p>
    </section>
    <section aria-label="Unavailable usage">
      <h2>Token 用量</h2>
      <dl><div><dt>输入</dt><dd>不可用</dd></div><div><dt>输出</dt><dd>不可用</dd></div><div><dt>来源</dt><dd>未连接</dd></div></dl>
      <p className="muted">不使用字符数估算，也不展示合成计数。</p>
    </section>
    <section aria-label="Collection status"><h2>采集状态</h2><p>未采集任何事件。Hooks 仍未获信任，内容采集保持关闭。</p></section>
    <footer>Session Lens 0.1.0-l0 · No session data captured</footer>
  </main>;

  const demo = snapshot?.mode === 'synthetic-fixture' ? snapshot : null;
  const usage = demo?.usage;
  return <main>
    <header><p className="eyebrow">L0 · Synthetic fixture</p><h1>Session Lens</h1>
      <p className="notice">Host gates unverified · Collection off</p></header>
    <section aria-label="Session details">
      <h2>{demo?.sessionId ?? 'Waiting for fixture'}</h2>
      <p>Binding: {demo?.currentSessionBinding ?? 'unverified'} · Coverage: unknown</p>
      <p role="status" aria-live="polite">{status}</p>
      <div className="actions">
        <button type="button" onClick={refresh} disabled={busy || !demo}>Refresh</button>
        <button type="button" onClick={advance} disabled={busy || !demo || demo.revision >= 1}>Reveal fixture event</button>
      </div>
      <p className="muted">Two predefined snapshots only. Refresh reads state; reveal advances this fixture. No real chat is being observed.</p>
    </section>
    <section aria-label="Usage snapshot"><h2>Cumulative thread snapshot</h2>
      {usage?.status === 'reported' ? <>
        <dl><div><dt>Input</dt><dd>{usage.counters.inputTokens.toLocaleString('en-US')}</dd></div>
          <div><dt>Output</dt><dd>{usage.counters.outputTokens.toLocaleString('en-US')}</dd></div>
          <div><dt>Total</dt><dd>{usage.counters.totalTokens.toLocaleString('en-US')}</dd></div></dl>
        <p>Cached input: {usage.counters.cachedInputTokens} (input subset). Reasoning output: {usage.counters.reasoningOutputTokens} (output subset).</p>
        <p className="muted">Synthetic values in the evidenced App Server shape. Never summed across snapshots or attributed to tools.</p>
      </> : <p>Unknown — no usage counter available. No estimate.</p>}
    </section>
    <section aria-label="Fixture events"><h2>Events <span className="muted">{demo?.events.length ?? 0}</span></h2>
      <ol>{demo?.events.map((event) => <li key={event.id}>
        <strong>{event.label}</strong><p>{event.observedAt}</p>
        <p className="muted">Occurrence time: unknown · Causal link: unknown</p>
      </li>)}</ol>
    </section>
    <footer>Session Lens 0.1.0-l0 · Local protocol demo · Gate blocked</footer>
  </main>;
}
