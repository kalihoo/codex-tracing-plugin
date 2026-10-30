import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { DemoSessionIdSchema, DemoStore, HostBoundSnapshotSchema, HostUnboundSnapshotSchema, type DemoSnapshot, type HostBoundSnapshot, type HostUnboundSnapshot } from './demo';
import { LocalEventStore } from './collector';
import { z } from 'zod';

export const UI_URI = 'ui://session-lens/l0-v1.html';
export type ServerOptions = { dataRoot?: string | undefined };
export function createServer(html: string, options: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: 'session-lens', version: '0.1.3-l0' });
  const store = new DemoStore();
  const dataRoot = options.dataRoot ?? process.env.PLUGIN_DATA;
  const eventStore = dataRoot ? new LocalEventStore(dataRoot) : null;
  const result = (snapshot: DemoSnapshot) => ({
    content: [{ type: 'text' as const, text: `合成示例会话 ${snapshot.sessionId}；版本 ${snapshot.revision}；采集已关闭；Codex 宿主能力尚未验证。` }],
    structuredContent: { ...snapshot },
  });
  registerAppResource(server, 'session-lens-demo', UI_URI, { description: 'Session Lens L0 合成数据界面；不采集真实会话。' }, async () => ({
    contents: [{ uri: UI_URI, mimeType: RESOURCE_MIME_TYPE, text: html,
      _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } } } }],
  }));
  registerAppTool(server, 'open_session', {
    title: '在当前对话中打开 Session Lens',
    description: '在 Codex 当前对话的侧栏中打开本地 Session Lens。默认不采集；用户可选择记录本机生命周期事件名称、时间及派生的 SHA-256 隔离键，不保存原始会话 ID、消息、工具输入输出或 Token。',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: {
      ui: { resourceUri: UI_URI },
      'openai/ui': { entrypoints: [{ type: 'thread' }] },
    },
  }, async (_args, extra) => hostResult(await hostSnapshot(extra)));
  registerAppTool(server, 'read_session', {
    title: '刷新当前会话事件',
    description: '读取当前 Codex 线程的本地生命周期事件元数据；不读取消息或工具输入输出。',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async (_args, extra) => hostResult(await hostSnapshot(extra)));
  registerAppTool(server, 'record_prompt_submit', {
    title: '记录当前会话事件',
    description: '由 Codex UserPromptSubmit hook 调用；只记事件名和时间，线程绑定取自宿主注入的 threadId，不接收提示词内容，也不向模型返回额外文本。',
    inputSchema: {},
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async (_args, extra) => {
    const threadId = codexThreadId(extra);
    if (!threadId || !eventStore) return { content: [] };
    await eventStore.recordPromptSubmit(threadId);
    return { content: [] };
  });
  registerAppTool(server, 'set_collection', {
    title: '设置当前会话采集',
    description: '仅为当前 Codex 线程开启或暂停本地事件元数据采集。L0 保存事件名称、观察时间及派生的 SHA-256 隔离键；不保存原始会话 ID、消息内容、工具输入输出或 Token。',
    inputSchema: { enabled: z.boolean() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async ({ enabled }, extra) => {
    const threadId = codexThreadId(extra);
    if (!threadId) return hostResult(await hostSnapshot(extra));
    if (!eventStore) return hostResult(await hostSnapshot(extra));
    await eventStore.setEnabled(threadId, enabled);
    return hostResult(await hostSnapshot(extra));
  });
  registerAppTool(server, 'open_demo', {
    title: '打开 Session Lens 合成数据示例',
    description: '在 L0 界面查看指定的合成示例会话。不会绑定或采集当前 Codex 对话；宿主侧栏能力尚未完成验收。',
    inputSchema: { sessionId: DemoSessionIdSchema },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: UI_URI } },
  }, async ({ sessionId }) => result(store.read(sessionId)));
  registerAppTool(server, 'read_demo', {
    description: '重新读取同一份合成示例快照，不会新增事件，也不会读取宿主或磁盘。',
    inputSchema: { sessionId: DemoSessionIdSchema },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async ({ sessionId }) => result(store.read(sessionId)));
  registerAppTool(server, 'advance_demo', {
    description: '显示某个合成示例会话中预设的第二条事件。只修改进程内存，版本最高为 1；不会采集真实事件。',
    inputSchema: { sessionId: DemoSessionIdSchema },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async ({ sessionId }) => result(store.advance(sessionId)));
  return server;

  async function hostSnapshot(extra: { _meta?: Record<string, unknown> | undefined; sessionId?: string | undefined }): Promise<HostBoundSnapshot | HostUnboundSnapshot> {
    const threadId = codexThreadId(extra);
    const identityMetadataKinds = identityKinds(extra._meta);
    const identityProbe = {
      mcpTransportSessionIdPresent: typeof extra.sessionId === 'string' && extra.sessionId.length > 0,
      identityMetadataKinds,
    };
    if (!threadId) return HostUnboundSnapshotSchema.parse({
      schemaVersion: 1, mode: 'host-unbound', sessionBinding: 'unavailable',
      collectionEnabled: false, coverage: 'unavailable', events: [],
      identityProbe: { ...identityProbe, codexThreadIdPresent: false },
    });
    const captured = await eventStore?.read(threadId);
    return HostBoundSnapshotSchema.parse({
      schemaVersion: 1, mode: 'host-bound', sessionBinding: 'codex-thread-id',
      collectionEnabled: captured?.collectionEnabled ?? false, captureAvailable: Boolean(eventStore),
      coverage: 'unavailable', events: captured?.events ?? [],
      identityProbe: { ...identityProbe, codexThreadIdPresent: true },
    });
  }

  function hostResult(snapshot: HostBoundSnapshot | HostUnboundSnapshot) {
    const text = snapshot.mode === 'host-unbound'
      ? 'Session Lens 未检测到可绑定的 Codex 线程。原始 metadata 不会返回或保存，采集保持关闭。'
      : !snapshot.captureAvailable
        ? '已识别当前 Codex 线程，但本地插件数据目录不可用。'
        : snapshot.collectionEnabled
          ? `已读取 ${snapshot.events.length} 条本地事件元数据；不含会话 ID 或内容。`
          : '已识别当前 Codex 线程。采集默认关闭，尚未读取或保存会话内容。';
    return { content: [{ type: 'text' as const, text }], structuredContent: snapshot };
  }
}

function codexThreadId(extra: { _meta?: Record<string, unknown> | undefined }): string | null {
  const value = extra._meta?.threadId;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function identityKinds(metadata: Record<string, unknown> | undefined): ('thread' | 'conversation' | 'session')[] {
  const keys = Object.keys(metadata ?? {});
  return (['thread', 'conversation', 'session'] as const).filter((kind) =>
    keys.some((key) => new RegExp(`(?:${kind}).*?(?:id|identifier)|(?:id|identifier).*?(?:${kind})`, 'i').test(key)));
}
