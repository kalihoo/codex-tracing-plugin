import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawnSync } from 'node:child_process';

await mkdir('work', { recursive: true });
const directory = await mkdtemp(resolve('work/isolated-stdio-'));
let client;
let stderr = '';
try {
  assert.equal(/\bprocess\.env\b/.test(await readFile('dist/ui.js', 'utf8')), false, 'Browser bundle must not require the Node environment global');
  // Bundle works without node_modules, sources, user profile, or fixture files.
  await cp('dist', directory, { recursive: true });
  const pluginData = join(directory, 'plugin-data');
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [resolve(directory, 'server.mjs')], cwd: directory,
    env: { PATH: '/usr/bin:/bin', PLUGIN_DATA: pluginData }, stderr: 'pipe' });
  client = new Client({ name: 'session-lens-stdio-smoke', version: '1' });
  transport.stderr?.on('data', (chunk) => { stderr += String(chunk); });
  await client.connect(transport);
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), ['advance_demo', 'open_demo', 'open_session', 'read_demo', 'read_session', 'set_collection']);
  const entrypoint = tools.tools.find((tool) => tool.name === 'open_session');
  assert.deepEqual(entrypoint?._meta?.['openai/ui']?.entrypoints, [{ type: 'thread' }]);
  const host = await client.callTool({ name: 'open_session', arguments: {} });
  assert.deepEqual(host.structuredContent, { schemaVersion: 1, mode: 'host-unbound',
    sessionBinding: 'unavailable', collectionEnabled: false, coverage: 'unavailable', events: [],
    identityProbe: { mcpTransportSessionIdPresent: false, codexThreadIdPresent: false, identityMetadataKinds: [] } });
  const alphaMeta = { threadId: 'smoke-thread-alpha' };
  const bound = await client.callTool({ name: 'open_session', arguments: {}, _meta: alphaMeta });
  assert.deepEqual(bound.structuredContent, { schemaVersion: 1, mode: 'host-bound', sessionBinding: 'codex-thread-id',
    collectionEnabled: false, captureAvailable: true, coverage: 'unavailable', events: [],
    identityProbe: { mcpTransportSessionIdPresent: false, identityMetadataKinds: ['thread'], codexThreadIdPresent: true } });
  const enabled = await client.callTool({ name: 'set_collection', arguments: { enabled: true }, _meta: alphaMeta });
  assert.equal(enabled.structuredContent.collectionEnabled, true);
  const hook = spawnSync(process.execPath, [resolve(directory, 'capture-hook.mjs')], {
    input: JSON.stringify({ session_id: 'smoke-thread-alpha', hook_event_name: 'UserPromptSubmit', prompt: 'private prompt' }),
    encoding: 'utf8', env: { PATH: '/usr/bin:/bin', PLUGIN_DATA: pluginData }, timeout: 5000,
  });
  assert.equal(hook.status, 0);
  assert.equal(hook.stdout, '');
  assert.equal(hook.stderr, '');
  const refreshed = await client.callTool({ name: 'read_session', arguments: {}, _meta: alphaMeta });
  assert.equal(refreshed.structuredContent.events.length, 1);
  assert.equal(refreshed.structuredContent.events[0].hookEventName, 'UserPromptSubmit');
  assert.doesNotMatch(JSON.stringify(refreshed), /smoke-thread-alpha|private prompt/);
  const beta = await client.callTool({ name: 'read_session', arguments: {}, _meta: { threadId: 'smoke-thread-beta' } });
  assert.equal(beta.structuredContent.collectionEnabled, false);
  assert.deepEqual(beta.structuredContent.events, []);
  const stored = await readFilesRecursively(pluginData);
  assert.doesNotMatch(stored, /smoke-thread-alpha|private prompt/);
  const paused = await client.callTool({ name: 'set_collection', arguments: { enabled: false }, _meta: alphaMeta });
  assert.equal(paused.structuredContent.collectionEnabled, false);
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
  const report = { schemaVersion: 1, status: 'passed', scope: 'local stdio MCP plus a synthetic metadata-only hook payload',
    bundledWithoutNodeModules: true, sessions: 2, isolated: true, explicitCaptureOptIn: true,
    hookPayloadContentPersisted: false, hookEventMetadataRefreshed: true,
    codexThreadEntrypointAdvertised: true, actualHostSessionBinding: false,
    refreshEventCounts: [alpha0.events.length, alpha1.events.length],
    cumulativeTotals: [alpha0.usage.counters.totalTokens, alpha1.usage.counters.totalTokens],
    unknownUsagePreserved: true, uiResourceMimeType: resource.contents[0].mimeType,
    externalAssetElements: 0, hostEvidence: false };
  await writeFile('evidence/stdio-smoke.json', `${JSON.stringify(report, null, 2)}\n`);
  assert.equal(stderr, '');
  console.log('PASS: bundled stdio MCP; explicit per-thread metadata opt-in; synthetic hook event refreshed; 2 sessions isolated; fixture usage and UI. No host proof.');
} finally {
  await client?.close();
  await rm(directory, { recursive: true, force: true });
}

async function readFilesRecursively(directory) {
  let contents = '';
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    contents += entry.isDirectory() ? await readFilesRecursively(path) : await readFile(path, 'utf8');
  }
  return contents;
}
