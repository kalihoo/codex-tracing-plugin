import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

await mkdir('work', { recursive: true });
const directory = await mkdtemp(resolve('work/isolated-stdio-'));
let client;
let stderr = '';
try {
  assert.equal(/\bprocess\.env\b/.test(await readFile('dist/ui.js', 'utf8')), false, 'Browser bundle must not require the Node environment global');
  // Bundle works without node_modules, sources, user profile, or fixture files.
  await cp('dist', directory, { recursive: true });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [resolve(directory, 'server.mjs')], cwd: directory,
    env: { PATH: '/usr/bin:/bin' }, stderr: 'pipe' });
  client = new Client({ name: 'session-lens-stdio-smoke', version: '1' });
  transport.stderr?.on('data', (chunk) => { stderr += String(chunk); });
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), ['advance_demo', 'open_demo', 'open_session', 'read_demo']);
  const entrypoint = tools.tools.find((tool) => tool.name === 'open_session');
  assert.deepEqual(entrypoint?._meta?.['openai/ui']?.entrypoints, [{ type: 'thread' }]);
  const host = await client.callTool({ name: 'open_session', arguments: {} });
  assert.deepEqual(host.structuredContent, { schemaVersion: 1, mode: 'host-unbound',
    sessionBinding: 'unavailable', collectionEnabled: false, coverage: 'unavailable', events: [] });
  const read = async (name, sessionId) => {
    const result = await client.callTool({ name, arguments: { sessionId } });
    assert.equal(result.isError, undefined);
    return result.structuredContent;
  };
  const alpha0 = await read('open_demo', 'fixture-alpha');
  assert.equal(alpha0.revision, 0);
  assert.equal(alpha0.usage.counters.totalTokens, 1000);
  await read('advance_demo', 'fixture-alpha');
  const [alpha1, beta0] = await Promise.all([read('read_demo', 'fixture-alpha'), read('read_demo', 'fixture-beta')]);
  assert.equal(alpha1.revision, 1);
  assert.equal(alpha1.events.length, 2);
  assert.equal(alpha1.usage.counters.totalTokens, 2500);
  assert.equal(beta0.revision, 0);
  assert.equal(beta0.usage.status, 'unknown');
  const resource = await client.readResource({ uri: 'ui://session-lens/l0-v1.html' });
  const html = resource.contents[0].text;
  assert.equal(resource.contents[0].mimeType, 'text/html;profile=mcp-app');
  assert.match(html, /Session Lens/);
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]*(?:src|href)=["']https?:/);
  await mkdir('work/preview', { recursive: true });
  await writeFile('work/preview/index.html', html);
  const report = { schemaVersion: 1, status: 'passed', scope: 'local stdio MCP only',
    bundledWithoutNodeModules: true, sessions: 2, isolated: true,
    codexThreadEntrypointAdvertised: true, actualHostSessionBinding: false,
    refreshEventCounts: [alpha0.events.length, alpha1.events.length],
    cumulativeTotals: [alpha0.usage.counters.totalTokens, alpha1.usage.counters.totalTokens],
    unknownUsagePreserved: true, uiResourceMimeType: resource.contents[0].mimeType,
    externalAssetElements: 0, hostEvidence: false };
  await writeFile('evidence/stdio-smoke.json', `${JSON.stringify(report, null, 2)}\n`);
  assert.equal(stderr, '');
  console.log('PASS: bundled stdio MCP; 2 synthetic sessions isolated; refresh 1→2 events; cumulative 1000→2500; unknown usage; inline UI. No host proof.');
} finally {
  await client?.close();
  await rm(directory, { recursive: true, force: true });
}
