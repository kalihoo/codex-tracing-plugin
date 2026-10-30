import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalEventStore } from '../src/collector';
import { createServer } from '../src/server';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(cleanups.splice(0).map((cleanup) => cleanup())); });

describe('host-bound event bridge', () => {
  it('requires explicit per-thread consent and refreshes only that thread event metadata', async () => {
    const dataRoot = await mkdtemp(join(tmpdir(), 'session-lens-host-session-'));
    const server = createServer('<!doctype html><html><body>host-session-ui</body></html>', { dataRoot });
    const client = new Client({ name: 'host-session-test-client', version: '1' }, {});
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    cleanups.push(async () => { await client.close(); await server.close(); await rm(dataRoot, { recursive: true, force: true }); });

    const tools = (await client.listTools()).tools.map((tool) => tool.name).sort();
    expect(tools).toContain('set_collection');
    expect(tools).toContain('read_session');
    const alphaMeta = { threadId: 'host-thread-alpha' };
    const betaMeta = { threadId: 'host-thread-beta' };
    const unconsented = await client.callTool({ name: 'open_session', arguments: {}, _meta: alphaMeta });
    expect(unconsented.structuredContent).toMatchObject({ mode: 'host-bound', collectionEnabled: false, events: [] });

    const enabled = await client.callTool({ name: 'set_collection', arguments: { enabled: true }, _meta: alphaMeta });
    expect(enabled.structuredContent).toMatchObject({ mode: 'host-bound', collectionEnabled: true, events: [] });
    const hookStore = new LocalEventStore(dataRoot);
    expect(await hookStore.captureHookEvent({
      session_id: 'host-thread-alpha', hook_event_name: 'UserPromptSubmit', prompt: 'sensitive prompt body',
    })).toBe(true);
    expect(await hookStore.captureHookEvent({
      session_id: 'host-thread-beta', hook_event_name: 'PostToolUse', tool_output: 'private output',
    })).toBe(false);

    const refreshed = await client.callTool({ name: 'read_session', arguments: {}, _meta: alphaMeta });
    const other = await client.callTool({ name: 'read_session', arguments: {}, _meta: betaMeta });
    expect(refreshed.structuredContent).toMatchObject({
      mode: 'host-bound', sessionBinding: 'codex-thread-id', collectionEnabled: true,
      events: [{ hookEventName: 'UserPromptSubmit' }],
    });
    expect(other.structuredContent).toMatchObject({ mode: 'host-bound', collectionEnabled: false, events: [] });
    const serialized = JSON.stringify([unconsented, enabled, refreshed, other]);
    expect(serialized).not.toContain('host-thread-alpha');
    expect(serialized).not.toContain('sensitive prompt body');
    expect(serialized).not.toContain('private output');
    const onDisk = await readAllFiles(dataRoot);
    expect(onDisk).not.toContain('host-thread-alpha');
    expect(onDisk).not.toContain('sensitive prompt body');
    expect(onDisk).not.toContain('private output');
  });
});

async function readAllFiles(dir: string): Promise<string> {
  let all = '';
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    all += entry.isDirectory() ? await readAllFiles(path) : await readFile(path, 'utf8');
  }
  return all;
}
