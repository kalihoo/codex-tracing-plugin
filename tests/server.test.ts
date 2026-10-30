import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../src/server';
import { DemoSnapshotSchema } from '../src/demo';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(cleanups.splice(0).map((cleanup) => cleanup())); });

async function connect() {
  const server = createServer('<!doctype html><html><body>synthetic-ui</body></html>');
  const client = new Client({ name: 'synthetic-test-client', version: '1' }, {});
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  cleanups.push(async () => { await client.close(); await server.close(); });
  return client;
}

describe('real MCP protocol, synthetic data', () => {
  it('advertises a Codex thread-side-panel entrypoint with an explicit unbound state', async () => {
    const client = await connect();
    const tool = (await client.listTools()).tools.find((item) => item.name === 'open_session');
    expect(tool?._meta).toMatchObject({
      ui: { resourceUri: 'ui://session-lens/l0-v1.html' },
      'openai/ui': { entrypoints: [{ type: 'thread' }] },
    });
    expect(tool?.inputSchema).not.toHaveProperty('required');
    const result = await client.callTool({ name: 'open_session', arguments: {} });
    expect(result.structuredContent).toEqual({
      schemaVersion: 1, mode: 'host-unbound', sessionBinding: 'unavailable',
      collectionEnabled: false, coverage: 'unavailable', events: [],
      identityProbe: { mcpTransportSessionIdPresent: false, codexThreadIdPresent: false, identityMetadataKinds: [] },
    });
    expect(JSON.stringify(result.structuredContent)).not.toMatch(/fixture-alpha|inputTokens|outputTokens/);
  });

  it('does not bind arbitrary thread-like metadata keys and never echoes them', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'open_session', arguments: {}, _meta: { 'openai/threadId': 'synthetic-private-id' } });
    expect(result.structuredContent).toMatchObject({
      mode: 'host-unbound',
      identityProbe: { identityMetadataKinds: ['thread'] },
    });
    expect(JSON.stringify(result)).not.toContain('synthetic-private-id');
    expect(JSON.stringify(result)).not.toContain('openai/threadId');
  });

  it('binds to the Codex thread context without echoing the thread ID', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'open_session', arguments: {}, _meta: { threadId: 'synthetic-private-id' } });
    expect(result.structuredContent).toMatchObject({
      mode: 'host-bound', sessionBinding: 'codex-thread-id', collectionEnabled: false,
      identityProbe: { codexThreadIdPresent: true, identityMetadataKinds: ['thread'] },
    });
    expect(JSON.stringify(result)).not.toContain('synthetic-private-id');
    expect(JSON.stringify(result)).not.toContain('threadId');
  });

  it('advertises a resource-linked tool and a self-contained MCP Apps resource', async () => {
    const client = await connect();
    const tools = await client.listTools();
    expect(tools.tools.find((tool) => tool.name === 'open_demo')?._meta).toMatchObject({ ui: { resourceUri: 'ui://session-lens/l0-v1.html' } });
    const resource = await client.readResource({ uri: 'ui://session-lens/l0-v1.html' });
    expect(resource.contents[0]).toMatchObject({ mimeType: 'text/html;profile=mcp-app', text: expect.stringContaining('synthetic-ui'), _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } } } });
  });
  it('round-trips independent session refresh over tools/call', async () => {
    const client = await connect();
    const alpha = await client.callTool({ name: 'open_demo', arguments: { sessionId: 'fixture-alpha' } });
    expect(DemoSnapshotSchema.parse(alpha.structuredContent).revision).toBe(0);
    await client.callTool({ name: 'advance_demo', arguments: { sessionId: 'fixture-alpha' } });
    const [a, b] = await Promise.all(['fixture-alpha', 'fixture-beta'].map((sessionId) => client.callTool({ name: 'read_demo', arguments: { sessionId } })));
    expect(DemoSnapshotSchema.parse(a?.structuredContent)).toMatchObject({ revision: 1, usage: { counters: { totalTokens: 2500 } } });
    expect(DemoSnapshotSchema.parse(b?.structuredContent)).toMatchObject({ revision: 0, usage: { status: 'unknown' } });
  });
  it('refuses host session identifiers and does not expose a collector', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'open_demo', arguments: { sessionId: 'real-session' } });
    expect(result.isError).toBe(true);
    expect((await client.listTools()).tools.map((tool) => tool.name).sort()).toEqual(['advance_demo', 'open_demo', 'open_session', 'read_demo']);
  });
});
