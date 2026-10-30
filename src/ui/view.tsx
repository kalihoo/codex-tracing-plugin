import type { DemoSnapshot } from '../demo';
export function SessionLensView({ snapshot, status, busy, refresh, advance }: { snapshot: DemoSnapshot | null; status: string; busy: boolean; refresh: () => void; advance: () => void }) {
  const usage = snapshot?.usage;
  return <main>
    <header><p className="eyebrow">L0 · Synthetic fixture</p><h1>Session Lens</h1>
      <p className="notice">Host gates unverified · Collection off</p></header>
    <section aria-label="Session details">
      <h2>{snapshot?.sessionId ?? 'Waiting for fixture'}</h2>
      <p>Binding: {snapshot?.currentSessionBinding ?? 'unverified'} · Coverage: unknown</p>
      <p role="status" aria-live="polite">{status}</p>
      <div className="actions">
        <button type="button" onClick={refresh} disabled={busy || !snapshot}>Refresh</button>
        <button type="button" onClick={advance} disabled={busy || !snapshot || snapshot.revision >= 1}>Reveal fixture event</button>
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
    <section aria-label="Fixture events"><h2>Events <span className="muted">{snapshot?.events.length ?? 0}</span></h2>
      <ol>{snapshot?.events.map((event) => <li key={event.id}>
        <strong>{event.label}</strong><p>{event.observedAt}</p>
        <p className="muted">Occurrence time: unknown · Causal link: unknown</p>
      </li>)}</ol>
    </section>
    <footer>Session Lens 0.1.0-l0 · Local protocol demo · Gate blocked</footer>
  </main>;
}
