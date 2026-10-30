import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { DemoSessionIdSchema, DemoStore, HostBoundSnapshotSchema, HostUnboundSnapshotSchema, type DemoSnapshot, type HostBoundSnapshot, type HostUnboundSnapshot } from './demo';

export const UI_URI = 'ui://session-lens/l0-v1.html';
export function createServer(html: string): McpServer {
  const server = new McpServer({ name: 'session-lens', version: '0.1.0-l0' });
  const store = new DemoStore();
  const result = (snapshot: DemoSnapshot) => ({
    content: [{ type: 'text' as const, text: `Synthetic fixture ${snapshot.sessionId}; revision ${snapshot.revision}; collection off; all Codex host gates unverified.` }],
    structuredContent: { ...snapshot },
  });
  registerAppResource(server, 'session-lens-demo', UI_URI, { description: 'Synthetic Session Lens L0 UI; no host capture.' }, async () => ({
    contents: [{ uri: UI_URI, mimeType: RESOURCE_MIME_TYPE, text: html,
      _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } } } }],
  }));
  registerAppTool(server, 'open_session', {
    title: 'Open Session Lens in this conversation',
    description: 'Open the local Session Lens side panel for this Codex conversation. This L0 prototype displays host-binding status only; it does not read or collect conversation content, lifecycle events, or token usage.',
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
        ? 'Session Lens recognized the Codex thread context. The thread ID is not returned; collection remains off.'
        : 'Session Lens found no Codex thread ID metadata. Identity-like key categories were checked without reading key or value; collection remains off.' }],
      structuredContent: snapshot,
    };
  });
  registerAppTool(server, 'open_demo', {
    title: 'Open Session Lens synthetic demo',
    description: 'Inspect a chosen synthetic fixture session in the L0 UI. Does not bind to or collect the current Codex chat. Host side-panel support is unverified.',
    inputSchema: { sessionId: DemoSessionIdSchema },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: UI_URI } },
  }, async ({ sessionId }) => result(store.read(sessionId)));
  registerAppTool(server, 'read_demo', {
    description: 'Refresh the same synthetic fixture snapshot without adding an event. No host or disk reads.',
    inputSchema: { sessionId: DemoSessionIdSchema },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async ({ sessionId }) => result(store.read(sessionId)));
  registerAppTool(server, 'advance_demo', {
    description: 'Reveal the second predefined synthetic event in one fixture session. Changes process memory only and stops at revision 1. Never captures a real event.',
    inputSchema: { sessionId: DemoSessionIdSchema },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } },
  }, async ({ sessionId }) => result(store.advance(sessionId)));
  return server;
}
