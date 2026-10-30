import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs one harmless model turn in an ephemeral local App Server thread. Trust
// bypass is invocation-scoped; plugin data is redirected to a temporary folder.
const cwd = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = await mkdtemp(join(tmpdir(), 'session-lens-appserver-hook-'));
const child = spawn('codex', ['--dangerously-bypass-hook-trust', 'app-server', '--stdio'], {
  cwd,
  env: { ...process.env, PLUGIN_DATA: dataRoot },
  stdio: ['pipe', 'pipe', 'ignore'],
});
const lines = createInterface({ input: child.stdout });
const pending = new Map();
let nextId = 1;
let currentThreadId = null;
let completeTurn;
let completionTimer;
const turnDone = new Promise((resolveTurn) => {
  completeTurn = resolveTurn;
});
let usageNotificationCount = 0;
const notificationCounts = new Map();

lines.on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (message.id !== undefined && pending.has(message.id)) {
    const item = pending.get(message.id);
    clearTimeout(item.timer);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(`Codex RPC failed: ${item.method}`));
    else item.resolve(message.result);
    return;
  }
  if (typeof message.method === 'string') {
    notificationCounts.set(message.method, (notificationCounts.get(message.method) ?? 0) + 1);
  }
  if (message.method === 'turn/completed' && message.params?.threadId === currentThreadId) completeTurn(message.params);
  if (message.method === 'thread/tokenUsage/updated') usageNotificationCount += 1;
});

function request(method, params, timeoutMs = 20_000) {
  const id = nextId++;
  return new Promise((resolveRequest, rejectRequest) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rejectRequest(new Error(`Codex RPC timed out: ${method}`));
    }, timeoutMs);
    pending.set(id, { resolve: resolveRequest, reject: rejectRequest, timer, method });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

let stage = 'initialize';
try {
  await request('initialize', {
    clientInfo: { name: 'session-lens-hook-probe', version: '0.1.0' },
    capabilities: {},
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'initialized', params: {} })}\n`);

  stage = 'start-ephemeral-thread';
  const started = await request('thread/start', { cwd, ephemeral: true });
  currentThreadId = started.thread.id;

  stage = 'check-mcp-server';
  const list = await request('mcpServerStatus/list', { threadId: currentThreadId, serverName: 'session_lens', detail: 'full' });
  const server = list.data?.find((item) => item.name === 'session_lens');
  if (!server || server.runtimeStatus !== 'connected') throw new Error('session_lens MCP server is not connected');

  stage = 'opt-in-ephemeral-thread';
  const enabled = await request('mcpServer/tool/call', {
    threadId: currentThreadId,
    server: 'session_lens',
    tool: 'set_collection',
    arguments: { enabled: true },
  });
  if (enabled.structuredContent?.collectionEnabled !== true) throw new Error('collection opt-in failed');

  stage = 'send-harmless-prompt';
  await request('turn/start', {
    threadId: currentThreadId,
    input: [{ type: 'text', text: 'Session Lens disposable hook test. Reply with OK only.' }],
  }, 30_000);
  await Promise.race([
    turnDone,
    new Promise((_, reject) => {
      completionTimer = setTimeout(() => reject(new Error('turn completion timed out')), 120_000);
    }),
  ]);

  stage = 'read-hook-result';
  const read = await request('mcpServer/tool/call', {
    threadId: currentThreadId,
    server: 'session_lens',
    tool: 'read_session',
    arguments: {},
  });
  const snapshot = read.structuredContent;
  let directToolEventCount = null;
  if ((snapshot?.events?.length ?? 0) === 0) {
    await request('mcpServer/tool/call', {
      threadId: currentThreadId,
      server: 'session_lens',
      tool: 'record_prompt_submit',
      arguments: {},
    });
    const afterDirectCall = await request('mcpServer/tool/call', {
      threadId: currentThreadId,
      server: 'session_lens',
      tool: 'read_session',
      arguments: {},
    });
    directToolEventCount = afterDirectCall.structuredContent?.events?.length ?? null;
  }
  const result = {
    status: snapshot?.events?.length === 1 && snapshot.events[0].hookEventName === 'UserPromptSubmit' ? 'hook-event-observed' : 'hook-event-missing',
    mcpServerConnected: true,
    optInApplied: snapshot?.collectionEnabled === true,
    eventCountAfterPrompt: snapshot?.events?.length ?? null,
    eventNames: snapshot?.events?.map((event) => event.hookEventName) ?? [],
    directMcpToolEventCount: directToolEventCount,
    notificationMethodNames: [...notificationCounts.keys()].sort(),
    tokenUsageNotificationCount: usageNotificationCount,
    ephemeralThread: true,
    rawThreadIdPrintedOrPersisted: false,
    promptTextPrintedOrPersisted: false,
    temporaryDataRemovedAfterProbe: true,
  };
  console.log(JSON.stringify(result));
  if (result.status !== 'hook-event-observed') process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({
    status: 'failed', stage,
    failure: error instanceof Error ? error.message.replace(/Codex RPC failed: .+/, 'Codex RPC failed').replace(/Codex RPC timed out: .+/, 'Codex RPC timed out') : 'unknown',
    rawThreadIdPrintedOrPersisted: false,
    promptTextPrintedOrPersisted: false,
  }));
  process.exitCode = 1;
} finally {
  clearTimeout(completionTimer);
  child.kill('SIGTERM');
  lines.close();
  await rm(dataRoot, { recursive: true, force: true });
}
