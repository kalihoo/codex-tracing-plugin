import type { SessionLensSnapshot } from '../demo';
import { formatStatus, formatTokens, messages, nextLanguage, type Language, type StatusKey } from './i18n';

type ViewProps = {
  snapshot: SessionLensSnapshot | null;
  status: StatusKey;
  revision?: number | string | undefined;
  busy: boolean;
  refresh: () => void;
  advance: () => void;
  setCollection?: (enabled: boolean) => void;
  language?: Language;
  onLanguageChange?: (language: Language) => void;
};

function formatObservedAt(value: string, language: Language): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium', timeStyle: 'medium',
  }).format(date);
}

function Header({ language, onLanguageChange, eyebrow, notice }: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  eyebrow: string;
  notice: string;
}) {
  const copy = messages[language];
  return <header>
    <div className="header-top">
      <p className="eyebrow">{eyebrow}</p>
      <button
        className="language-switch"
        type="button"
        aria-label={copy.languageButtonLabel}
        onClick={() => onLanguageChange(nextLanguage(language))}
      >{copy.languageButton}</button>
    </div>
    <h1>Session Lens</h1>
    <p className="notice">{notice}</p>
  </header>;
}

export function SessionLensView({ snapshot, status, revision, busy, refresh, advance, setCollection, language = 'zh-CN', onLanguageChange = () => {} }: ViewProps) {
  const copy = messages[language];
  const statusText = formatStatus(language, status, revision);

  if (!snapshot) return <main lang={language}>
    <Header language={language} onLanguageChange={onLanguageChange} eyebrow={copy.threadEyebrow} notice={copy.waitingNotice} />
    <section aria-label={copy.hostBindingStatus}>
      <h2>{copy.waitingTitle}</h2>
      <p>{copy.waitingDescription}</p>
      <p role="status" aria-live="polite">{statusText}</p>
    </section>
    <section aria-label={copy.unavailableUsage}>
      <h2>{copy.tokenUsageTitle}</h2>
      <dl><div><dt>{copy.inputTokens}</dt><dd>{copy.unavailable}</dd></div><div><dt>{copy.outputTokens}</dt><dd>{copy.unavailable}</dd></div><div><dt>{copy.source}</dt><dd>{copy.notConnected}</dd></div></dl>
    </section>
    <footer>Session Lens 0.1.3-l0 · {copy.footerNoCapture}</footer>
  </main>;

  if (snapshot.mode === 'host-bound') return <main lang={language}>
    <Header language={language} onLanguageChange={onLanguageChange} eyebrow={copy.threadEyebrow}
      notice={!snapshot.captureAvailable ? copy.boundNoticeDataUnavailable : snapshot.collectionEnabled ? copy.boundNoticeCollectionOn : copy.boundNotice} />
    <section aria-label={copy.hostBindingStatus}>
      <h2>{copy.boundTitle}</h2>
      <p>{copy.boundDescription}</p>
      <p role="status" aria-live="polite">{statusText}</p>
    </section>
    <section aria-label={copy.unavailableUsage}>
      <h2>{copy.tokenUsageTitle}</h2>
      <dl><div><dt>{copy.inputTokens}</dt><dd>{copy.unavailable}</dd></div><div><dt>{copy.outputTokens}</dt><dd>{copy.unavailable}</dd></div><div><dt>{copy.source}</dt><dd>{copy.notConnected}</dd></div></dl>
      <p className="muted">{copy.noRealUsage}</p>
    </section>
    <section aria-label={copy.collectionStatus}><h2>{copy.collectionStatus}</h2><p>{copy.noHostCapture}</p>
      {!snapshot.captureAvailable && <p role="alert">{copy.captureStorageUnavailable}</p>}
    </section>
    <section aria-label={copy.events}>
      <div className="section-heading"><h2>{copy.events} <span className="muted">{snapshot.events.length}</span></h2>
        <div className="actions">
          <button type="button" onClick={refresh} disabled={busy || !snapshot.captureAvailable}>{copy.refreshEvents}</button>
          <button type="button" onClick={() => setCollection?.(!snapshot.collectionEnabled)} disabled={busy || !snapshot.captureAvailable}>
            {snapshot.collectionEnabled ? copy.pauseCapture : copy.enableCapture}
          </button>
        </div>
      </div>
      <p>{copy.localCaptureExplanation}</p>
      <p className="muted">{copy.captureBindingUnverified}</p>
      <p className="muted">{copy.capturePauseNote}</p>
      <p role="status" aria-live="polite">{snapshot.collectionEnabled ? copy.captureEnabled : copy.capturePaused}</p>
      {snapshot.events.length === 0 ? <p className="muted">{copy.noObservedEvents}</p> : <ol>
        {snapshot.events.map((event) => <li key={event.id}>
          <strong>{copy.eventLabel(event.hookEventName)}</strong>
          <time dateTime={event.occurredAt}>{formatObservedAt(event.occurredAt, language)}</time>
        </li>)}
      </ol>}
    </section>
      <footer>Session Lens 0.1.3-l0 · {snapshot.collectionEnabled || snapshot.events.length > 0 ? copy.footerBoundMetadata : copy.footerBound}</footer>
  </main>;

  if (snapshot.mode === 'host-unbound') {
    const identityLabels = snapshot.identityProbe.identityMetadataKinds.map((kind) => copy.identityLabels[kind]);
    const identityMessage = identityLabels.length
      ? copy.detectedIdentity(identityLabels.join(copy.identityListSeparator))
      : copy.missingIdentity;
    const notice = identityLabels.length ? copy.unboundNoticeWithMetadata : copy.unboundNoticeWithoutMetadata;
    return <main lang={language}>
      <Header language={language} onLanguageChange={onLanguageChange} eyebrow={copy.threadEyebrow} notice={notice} />
      <section aria-label={copy.hostBindingStatus}>
        <h2>{copy.unboundTitle}</h2>
        <p>{identityMessage}{snapshot.identityProbe.mcpTransportSessionIdPresent ? ` ${copy.transportIdExplanation}` : ''}</p>
        <p>{copy.noLifecycleEvents}</p>
        <p role="status" aria-live="polite">{statusText}</p>
      </section>
      <section aria-label={copy.unavailableUsage}>
      <h2>{copy.tokenUsageTitle}</h2>
        <dl><div><dt>{copy.inputTokens}</dt><dd>{copy.unavailable}</dd></div><div><dt>{copy.outputTokens}</dt><dd>{copy.unavailable}</dd></div><div><dt>{copy.source}</dt><dd>{copy.notConnected}</dd></div></dl>
        <p className="muted">{copy.noEstimate}</p>
      </section>
      <section aria-label={copy.collectionStatus}><h2>{copy.collectionStatus}</h2><p>{copy.noEventsCollected}</p></section>
      <footer>Session Lens 0.1.3-l0 · {copy.footerUnbound}</footer>
    </main>;
  }

  const demo = snapshot.mode === 'synthetic-fixture' ? snapshot : null;
  const usage = demo?.usage;
  return <main lang={language}>
    <Header language={language} onLanguageChange={onLanguageChange} eyebrow={copy.demoEyebrow} notice={copy.demoNotice} />
    <section aria-label={copy.sessionDetails}>
      <h2>{demo ? copy.fixtureSessionLabel(demo.sessionId) : copy.waitingFixture}</h2>
      <p>{copy.binding}{copy.labelSeparator}{demo ? copy.fixtureUnverified : copy.unknown} · {copy.coverage}{copy.labelSeparator}{copy.fixtureCoverageUnknown}</p>
      <p role="status" aria-live="polite">{statusText}</p>
      <div className="actions">
        <button type="button" onClick={refresh} disabled={busy || !demo}>{copy.refresh}</button>
        <button type="button" onClick={advance} disabled={busy || !demo || demo.revision >= 1}>{copy.revealEvent}</button>
      </div>
      <p className="muted">{copy.fixtureExplanation}</p>
    </section>
    <section aria-label={copy.usageSnapshot}><h2>{copy.usageSnapshot}</h2>
      {usage?.status === 'reported' ? <>
        <dl><div><dt>{copy.inputTokens}</dt><dd>{formatTokens(usage.counters.inputTokens, language)}</dd></div>
          <div><dt>{copy.outputTokens}</dt><dd>{formatTokens(usage.counters.outputTokens, language)}</dd></div>
          <div><dt>{copy.totalTokens}</dt><dd>{formatTokens(usage.counters.totalTokens, language)}</dd></div></dl>
        <p>{copy.usageBreakdown(usage.counters.cachedInputTokens, usage.counters.reasoningOutputTokens)}</p>
        <p className="muted">{copy.syntheticUsageExplanation}</p>
      </> : <p>{copy.unknownUsage}</p>}
    </section>
    <section aria-label={copy.events}><h2>{copy.events} <span className="muted">{demo?.events.length ?? 0}</span></h2>
      <ol>{demo?.events.map((event) => <li key={event.id}>
        <strong>{copy.fixtureEventLabel(event.label)}</strong><p>{event.observedAt}</p>
        <p className="muted">{copy.occurrenceTime} · {copy.causalLink}</p>
      </li>)}</ol>
    </section>
      <footer>Session Lens 0.1.3-l0 · {copy.footerDemo}</footer>
  </main>;
}
