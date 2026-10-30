import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { DemoSessionIdSchema, DemoStore, HostBoundSnapshotSchema, HostUnboundSnapshotSchema, type DemoSnapshot, type HostBoundSnapshot, type HostUnboundSnapshot } from './demo';

export const UI_URI = 'ui://session-lens/l0-v1.html';
export function createServer(html: string): McpServer {
  const server = new McpServer({ name: 'session-lens', version: '0.1.0-l0' });
  const store = new DemoStore();
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
    description: '在 Codex 当前对话的侧栏中打开本地 Session Lens。此 L0 原型仅显示宿主绑定状态；不会读取或采集对话内容、生命周期事件或 Token 用量。',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: {
      ui: { resourceUri: UI_URI },
      'openai/ui': { entrypoints: [{ type: 'thread' }] },
    },
  }, async (_args, extra) => {
    const metadataKeys = Object.keys(extra._meta ?? {});
    const identityMetadataKinds = (['thread', 'conversation', 'session'] as const).filter((kind) =>
      metadataKeys.some((key) => new RegExp(`(?:${kind}).*?(?:id|identifier)|(?:id|identifier).*?(?:${kind})`, 'i').test(key)));
    const mcpTransportSessionIdPresent = typeof extra.sessionId === 'string' && extra.sessionId.length > 0;
    const codexThreadIdPresent = typeof extra._meta?.threadId === 'string' && extra._meta.threadId.trim().length > 0;
    const identityProbe = { mcpTransportSessionIdPresent, identityMetadataKinds };
    const snapshot: HostBoundSnapshot | HostUnboundSnapshot = codexThreadIdPresent
      ? HostBoundSnapshotSchema.parse({
        schemaVersion: 1, mode: 'host-bound', sessionBinding: 'codex-thread-id',
        collectionEnabled: false, coverage: 'unavailable', events: [],
        identityProbe: { ...identityProbe, codexThreadIdPresent: true },
      })
      : HostUnboundSnapshotSchema.parse({
        schemaVersion: 1, mode: 'host-unbound', sessionBinding: 'unavailable',
        collectionEnabled: false, coverage: 'unavailable', events: [],
        identityProbe: { ...identityProbe, codexThreadIdPresent: false },
      });
    return {
      content: [{ type: 'text' as const, text: codexThreadIdPresent
        ? 'Session Lens 已识别 Codex 当前会话上下文。线程 ID 不会返回；采集保持关闭。'
        : 'Session Lens 未检测到 Codex 会话标识。仅返回身份类别和布尔状态；原始 metadata 键名与标识值不会返回或保存，采集保持关闭。' }],
      structuredContent: snapshot,
    };
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
}
