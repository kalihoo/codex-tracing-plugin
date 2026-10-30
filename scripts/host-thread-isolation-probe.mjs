import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Creates two ephemeral App Server threads, makes no model turns, and prints no IDs or content.
const cwd = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn('codex', ['app-server', '--stdio'], { cwd, stdio: ['pipe', 'pipe', 'ignore'] });
const lines = createInterface({ input: child.stdout });
const pending = new Map();
let nextId = 1;
lines.on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (message.id === undefined || !pending.has(message.id)) return;
  const { resolve: resolveRequest, reject, timer } = pending.get(message.id);
  clearTimeout(timer);
  pending.delete(message.id);
  if (message.error) reject(new Error(String(message.error.message ?? 'App Server request failed')));
  else resolveRequest(message.result);
});

function request(method, params) {
  const id = nextId++;
  return new Promise((resolveRequest, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout waiting for ${method}`));
    }, 15000);
    pending.set(id, { resolve: resolveRequest, reject, timer });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

try {
  await request('initialize', {
    clientInfo: { name: 'session-lens-isolation-probe', version: '1.0.0' },
    capabilities: {},
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'initialized', params: {} })}\n`);
  const start = async () => {
    const result = await request('thread/start', { cwd, ephemeral: true });
    return result.thread.id;
  };
  const [threadA, threadB] = await Promise.all([start(), start()]);
  const callOpenSession = async (threadId) => {
    const list = await request('mcpServerStatus/list', { threadId, serverName: 'session_lens', detail: 'full' });
    const server = list.data?.find((item) => item.name === 'session_lens');
    if (!server || server.runtimeStatus !== 'connected') throw new Error('Session Lens MCP server is not connected for a test thread');
    const result = await request('mcpServer/tool/call', {
      threadId, server: 'session_lens', tool: 'open_session', arguments: {},
    });
    return { snapshot: result.structuredContent, runtimeStatus: server.runtimeStatus };
  };
  const [callA, callB] = await Promise.all([callOpenSession(threadA), callOpenSession(threadB)]);
  const summary = {
    ephemeralThreadsCreated: 2,
    distinctThreadContexts: threadA !== threadB,
    callsRanConcurrently: true,
    first: {
      mode: callA.snapshot.mode,
      sessionBinding: callA.snapshot.sessionBinding,
      codexThreadIdPresent: callA.snapshot.identityProbe.codexThreadIdPresent,
      collectionEnabled: callA.snapshot.collectionEnabled,
      eventCount: callA.snapshot.events.length,
      runtimeStatus: callA.runtimeStatus,
    },
    second: {
      mode: callB.snapshot.mode,
      sessionBinding: callB.snapshot.sessionBinding,
      codexThreadIdPresent: callB.snapshot.identityProbe.codexThreadIdPresent,
      collectionEnabled: callB.snapshot.collectionEnabled,
      eventCount: callB.snapshot.events.length,
      runtimeStatus: callB.runtimeStatus,
    },
    rawThreadIdsReturnedOrPersisted: false,
    modelTurnStarted: false,
  };
  console.log(JSON.stringify(summary));
  if (!summary.distinctThreadContexts
    || summary.first.mode !== 'host-bound' || summary.second.mode !== 'host-bound'
    || !summary.first.codexThreadIdPresent || !summary.second.codexThreadIdPresent
    || summary.first.eventCount !== 0 || summary.second.eventCount !== 0) process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  lines.close();
}
