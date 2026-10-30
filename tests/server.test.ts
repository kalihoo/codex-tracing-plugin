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
    expect((await client.listTools()).tools.map((tool) => tool.name).sort()).toEqual(['advance_demo', 'open_demo', 'read_demo']);
  });
});
