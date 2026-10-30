export type Language = 'zh-CN' | 'en';
import type { HookEventName } from '../contracts';

export type StatusKey =
  | 'standalone-preview'
  | 'waiting-host'
  | 'refreshing'
  | 'fixture-revision'
  | 'refresh-unavailable'
  | 'invalid-snapshot'
  | 'host-unbound'
  | 'host-bound'
  | 'host-capture-on'
  | 'host-capture-off'
  | 'demo-ready'
  | 'bridge-unavailable'
  | 'ready';

export type Copy = {
  languageButton: string;
  languageButtonLabel: string;
  threadEyebrow: string;
  demoEyebrow: string;
  waitingNotice: string;
  boundNotice: string;
  boundNoticeCollectionOn: string;
  boundNoticeDataUnavailable: string;
  unboundNoticeWithMetadata: string;
  unboundNoticeWithoutMetadata: string;
  demoNotice: string;
  hostBindingStatus: string;
  unavailableUsage: string;
  collectionStatus: string;
  sessionDetails: string;
  tokenUsageTitle: string;
  usageSnapshot: string;
  events: string;
  waitingTitle: string;
  waitingDescription: string;
  boundTitle: string;
  boundDescription: string;
  unboundTitle: string;
  detectedIdentity: (labels: string) => string;
  missingIdentity: string;
  transportIdExplanation: string;
  noLifecycleEvents: string;
  noHostCapture: string;
  noEventsCollected: string;
  localCaptureExplanation: string;
  captureBindingUnverified: string;
  capturePauseNote: string;
  captureStorageUnavailable: string;
  captureEnabled: string;
  capturePaused: string;
  enableCapture: string;
  pauseCapture: string;
  refreshEvents: string;
  noObservedEvents: string;
  eventLabel: (eventName: HookEventName) => string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  source: string;
  unavailable: string;
  notConnected: string;
  noRealUsage: string;
  noEstimate: string;
  binding: string;
  coverage: string;
  labelSeparator: string;
  fixtureUnverified: string;
  fixtureCoverageUnknown: string;
  fixtureSessionLabel: (sessionId: string) => string;
  fixtureEventLabel: (label: string) => string;
  unknown: string;
  waitingFixture: string;
  refresh: string;
  revealEvent: string;
  fixtureExplanation: string;
  usageBreakdown: (cachedInput: number, reasoningOutput: number) => string;
  syntheticUsageExplanation: string;
  unknownUsage: string;
  occurrenceTime: string;
  causalLink: string;
  identityLabels: Record<'thread' | 'conversation' | 'session', string>;
  identityListSeparator: string;
  footerNoCapture: string;
  footerBound: string;
  footerBoundMetadata: string;
  footerUnbound: string;
  footerDemo: string;
  status: Record<StatusKey, string>;
};

export const messages: Record<Language, Copy> = {
  'zh-CN': {
    languageButton: 'EN',
    languageButtonLabel: '切换为英文',
    threadEyebrow: 'L0 · Codex 会话入口',
    demoEyebrow: 'L0 · 合成数据示例',
    waitingNotice: '未采集 · 等待宿主连接',
    boundNotice: '已识别线程 · 采集关闭',
    boundNoticeCollectionOn: '已识别线程 · 本地元数据采集中',
    boundNoticeDataUnavailable: '已识别线程 · 本地存储不可用',
    unboundNoticeWithMetadata: '未采集 · 身份信息未验证',
    unboundNoticeWithoutMetadata: '未采集 · 未检测到宿主标识',
    demoNotice: '宿主能力待验证 · 采集已关闭',
    hostBindingStatus: '宿主绑定状态',
    unavailableUsage: '用量不可用',
    collectionStatus: '采集状态',
    sessionDetails: '会话详情',
    tokenUsageTitle: 'Token 用量',
    usageSnapshot: '会话累计用量快照',
    events: '事件',
    waitingTitle: '等待 Codex 宿主响应',
    waitingDescription: '尚未收到会话绑定或事件快照。当前没有读取或保存会话内容。',
    boundTitle: '已识别当前 Codex 会话',
    boundDescription: 'Codex App Server 提供当前线程标识用于绑定。本地保存派生的 SHA-256 隔离键；原始线程 ID 不落盘。',
    unboundTitle: '未绑定当前会话',
    detectedIdentity: (labels) => `检测到${labels}身份类 metadata 键名；尚未验证它们能否绑定当前会话。`,
    missingIdentity: '未检测到名称对应线程、对话或会话标识的 metadata 键。',
    transportIdExplanation: 'MCP 传输 session ID 仅用于传输，不代表 Codex 对话标识。',
    noLifecycleEvents: '当前未绑定到具体会话，因此不会读取或保存会话事件及对话内容。绑定诊断会检查身份 metadata 类别；原始键名与标识值不会在界面展示或持久化。',
    noHostCapture: '当前只记录事件名称与时间；消息、工具输入输出和 Token 未采集。',
    noEventsCollected: '尚未采集任何事件。采集只在侧栏手动开启后记录新的事件元数据。',
    localCaptureExplanation: '启用后仅在本机记录事件名称和时间，并保存派生的 SHA-256 隔离键；原始会话 ID、消息、工具输入输出和 Token 不落盘。',
    captureBindingUnverified: '插件无法验证 Codex 是否已信任并运行该 hook，也无法确认 hook 的 session_id 是否对应侧栏线程；没有记录不代表没有事件发生。',
    capturePauseNote: '暂停会阻止后续 hook 开始记录；已经开始的异步事件写入仍可能完成。',
    captureStorageUnavailable: '插件本地数据目录不可用，无法启用事件记录。',
    captureEnabled: '当前会话的事件元数据采集已开启。',
    capturePaused: '当前会话采集已暂停。已有本地事件仍保留。',
    enableCapture: '开启本地事件记录',
    pauseCapture: '暂停记录',
    refreshEvents: '刷新事件',
    noObservedEvents: '暂无事件。开启记录后发送一条新消息，再刷新查看。',
    eventLabel: (eventName) => ({
      SessionStart: '会话开始', SessionEnd: '会话结束', UserPromptSubmit: '用户提交消息',
      PreToolUse: '工具调用开始', PostToolUse: '工具调用结束', PermissionRequest: '权限请求',
      SubagentStart: '子代理开始', SubagentStop: '子代理结束', Stop: '轮次结束',
      Interrupt: '执行中断', PreCompact: '上下文压缩前', PostCompact: '上下文压缩后',
    }[eventName]),
    inputTokens: '输入 Token',
    outputTokens: '输出 Token',
    totalTokens: '总 Token',
    source: '来源',
    unavailable: '不可用',
    notConnected: '未连接',
    noRealUsage: '当前版本尚未接入真实 usage 通知；不使用字符数估算。',
    noEstimate: '不使用字符数估算，也不展示合成计数。',
    binding: '会话绑定',
    coverage: '覆盖范围',
    labelSeparator: '：',
    fixtureUnverified: '未验证',
    fixtureCoverageUnknown: '未知',
    fixtureSessionLabel: (sessionId) => ({ 'fixture-alpha': '示例会话 A', 'fixture-beta': '示例会话 B' }[sessionId] ?? '合成示例会话'),
    fixtureEventLabel: (label) => ({
      'Synthetic initial snapshot': '初始合成快照',
      'Synthetic refreshed snapshot': '刷新后的合成快照',
    }[label] ?? label),
    unknown: '未知',
    waitingFixture: '等待示例数据',
    refresh: '刷新',
    revealEvent: '显示示例事件',
    fixtureExplanation: '仅包含两份预设快照。刷新只读取状态；显示事件只推进示例数据。不会观察真实会话。',
    usageBreakdown: (cachedInput, reasoningOutput) => `缓存输入：${formatTokens(cachedInput, 'zh-CN')}（属于输入 Token 的子项）；推理输出：${formatTokens(reasoningOutput, 'zh-CN')}（属于输出 Token 的子项）。`,
    syntheticUsageExplanation: '基于 App Server 数据形状的合成值。不会跨快照求和，也不会归因到工具。',
    unknownUsage: '未知 · 没有可用的 usage 计数，不做估算。',
    occurrenceTime: '发生时间：未知',
    causalLink: '因果关系：未知',
    identityLabels: { thread: '线程', conversation: '对话', session: '会话' },
    identityListSeparator: '、',
    footerNoCapture: '未采集会话内容',
    footerBound: '已绑定宿主上下文 · 未采集会话内容',
    footerBoundMetadata: '已绑定宿主上下文 · 仅记录事件元数据',
    footerUnbound: '未绑定宿主 · 未采集会话内容',
    footerDemo: '本地协议演示 · 宿主验收未通过',
    status: {
      'standalone-preview': '独立合成数据预览 · 未连接宿主桥接',
      'waiting-host': '正在等待 MCP Apps 宿主',
      refreshing: '正在刷新示例数据…',
      'fixture-revision': '示例数据版本 {revision} · 宿主能力待验证',
      'refresh-unavailable': '无法刷新示例数据，已保留上次有效快照。',
      'invalid-snapshot': '已拒绝无效或不匹配的示例快照。',
      'host-unbound': '侧栏已打开 · 无法验证会话身份 · 采集关闭',
      'host-bound': '已识别 Codex 会话 · 采集关闭',
      'host-capture-on': '本地事件元数据采集中 · 内容与 Token 未采集',
      'host-capture-off': '已识别 Codex 会话 · 采集关闭',
      'demo-ready': '合成示例已就绪 · 宿主能力待验证',
      'bridge-unavailable': 'MCP Apps 桥接不可用，宿主验收仍未通过。',
      ready: '已就绪',
    },
  },
  en: {
    languageButton: '中文',
    languageButtonLabel: 'Switch to Chinese',
    threadEyebrow: 'L0 · Codex conversation entrypoint',
    demoEyebrow: 'L0 · Synthetic data preview',
    waitingNotice: 'Collection off · waiting for host',
    boundNotice: 'Thread recognized · collection off',
    boundNoticeCollectionOn: 'Thread recognized · local metadata capture on',
    boundNoticeDataUnavailable: 'Thread recognized · local storage unavailable',
    unboundNoticeWithMetadata: 'Collection off · identity unverified',
    unboundNoticeWithoutMetadata: 'Collection off · host identity unavailable',
    demoNotice: 'Host gates unverified · collection off',
    hostBindingStatus: 'Host binding status',
    unavailableUsage: 'Unavailable usage',
    collectionStatus: 'Collection status',
    sessionDetails: 'Session details',
    tokenUsageTitle: 'Token usage',
    usageSnapshot: 'Cumulative thread usage snapshot',
    events: 'Events',
    waitingTitle: 'Waiting for Codex host response',
    waitingDescription: 'No session binding or event snapshot has arrived. Session content has not been read or saved.',
    boundTitle: 'Current Codex thread recognized',
    boundDescription: 'Codex App Server provides the current thread identity for binding. A derived SHA-256 isolation key is stored locally; the raw thread ID is not.',
    unboundTitle: 'Not bound to the current conversation',
    detectedIdentity: (labels) => `Detected metadata key names related to ${labels}; their ability to bind this conversation is unverified.`,
    missingIdentity: 'No metadata key name matching a thread, conversation, or session identifier was detected.',
    transportIdExplanation: 'The MCP transport session ID is for transport only; it does not identify a Codex conversation.',
    noLifecycleEvents: 'This view is not bound to a specific conversation, so it does not read or save conversation events or content. Session-binding diagnostics inspect identity metadata categories; raw key names and identifier values are not displayed or persisted.',
    noHostCapture: 'Only event names and timestamps are recorded; messages, tool inputs/outputs, and tokens are not collected.',
    noEventsCollected: 'No events have been collected. New event metadata is recorded only after capture is enabled in the sidebar.',
    localCaptureExplanation: 'When enabled, only event names, timestamps, and a derived SHA-256 isolation key are stored locally. The raw session ID, messages, tool inputs/outputs, and tokens are not saved.',
    captureBindingUnverified: 'Session Lens cannot verify whether Codex trusted and ran this hook or whether its session_id matches the sidebar thread; no records do not prove no event occurred.',
    capturePauseNote: 'Pausing stops later hooks from starting capture; an asynchronous event write already in progress may still finish.',
    captureStorageUnavailable: 'The plugin local data directory is unavailable, so event recording cannot be enabled.',
    captureEnabled: 'Local event metadata capture is enabled for this thread.',
    capturePaused: 'Capture is paused for this thread. Existing local events are retained.',
    enableCapture: 'Enable local event capture',
    pauseCapture: 'Pause capture',
    refreshEvents: 'Refresh events',
    noObservedEvents: 'No events yet. Enable capture, send a new message, then refresh.',
    eventLabel: (eventName) => ({
      SessionStart: 'Session started', SessionEnd: 'Session ended', UserPromptSubmit: 'User message submitted',
      PreToolUse: 'Tool call started', PostToolUse: 'Tool call finished', PermissionRequest: 'Permission requested',
      SubagentStart: 'Subagent started', SubagentStop: 'Subagent stopped', Stop: 'Turn finished',
      Interrupt: 'Interrupted', PreCompact: 'Before compaction', PostCompact: 'After compaction',
    }[eventName]),
    inputTokens: 'Input tokens',
    outputTokens: 'Output tokens',
    totalTokens: 'Total tokens',
    source: 'Source',
    unavailable: 'Unavailable',
    notConnected: 'Not connected',
    noRealUsage: 'Real usage notifications are not connected in this version; character counts are not used as estimates.',
    noEstimate: 'No character-based estimates or synthetic counters are shown.',
    binding: 'Binding',
    coverage: 'Coverage',
    labelSeparator: ': ',
    fixtureUnverified: 'Unverified',
    fixtureCoverageUnknown: 'Unknown',
    fixtureSessionLabel: (sessionId) => sessionId,
    fixtureEventLabel: (label) => label,
    unknown: 'Unknown',
    waitingFixture: 'Waiting for fixture',
    refresh: 'Refresh',
    revealEvent: 'Reveal fixture event',
    fixtureExplanation: 'Two predefined snapshots only. Refresh reads state; revealing an event advances the fixture. No real conversation is observed.',
    usageBreakdown: (cachedInput, reasoningOutput) => `Cached input: ${formatTokens(cachedInput, 'en')} (input subset); reasoning output: ${formatTokens(reasoningOutput, 'en')} (output subset).`,
    syntheticUsageExplanation: 'Synthetic values in the App Server data shape. Snapshots are not summed or attributed to tools.',
    unknownUsage: 'Unknown · no usage counter is available. No estimate.',
    occurrenceTime: 'Occurrence time: unknown',
    causalLink: 'Causal link: unknown',
    identityLabels: { thread: 'thread', conversation: 'conversation', session: 'session' },
    identityListSeparator: ', ',
    footerNoCapture: 'No session data captured',
    footerBound: 'Bound to host context · No session data captured',
    footerBoundMetadata: 'Bound to host context · Event metadata only',
    footerUnbound: 'Not bound to host · No session data captured',
    footerDemo: 'Local protocol demo · Host gate blocked',
    status: {
      'standalone-preview': 'Standalone synthetic preview · No host bridge',
      'waiting-host': 'Waiting for MCP Apps host',
      refreshing: 'Refreshing fixture…',
      'fixture-revision': 'Fixture revision {revision} · host gates unverified',
      'refresh-unavailable': 'Fixture refresh unavailable. Last valid snapshot retained.',
      'invalid-snapshot': 'Rejected invalid or mismatched fixture snapshot.',
      'host-unbound': 'Sidebar opened · session identity unavailable · collection off',
      'host-bound': 'Codex conversation context recognized · collection off',
      'host-capture-on': 'Local event metadata capture on · no content or tokens captured',
      'host-capture-off': 'Codex conversation context recognized · collection off',
      'demo-ready': 'Synthetic fixture ready · host gates unverified',
      'bridge-unavailable': 'MCP Apps bridge unavailable. Host gate remains blocked.',
      ready: 'Ready',
    },
  },
};

export function formatStatus(language: Language, key: StatusKey, revision?: number | string): string {
  const message = messages[language].status[key];
  return key === 'fixture-revision' ? message.replace('{revision}', String(revision ?? 'unknown')) : message;
}

export function nextLanguage(language: Language): Language {
  return language === 'zh-CN' ? 'en' : 'zh-CN';
}

export function formatTokens(value: number, language: Language): string {
  return new Intl.NumberFormat(language === 'zh-CN' ? 'zh-CN' : 'en-US').format(value);
}
