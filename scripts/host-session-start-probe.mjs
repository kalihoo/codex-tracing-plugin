import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), '..');
const outputPath = process.env.SESSION_LENS_PROBE_RESULT;

if (process.argv[2] === '--hook') {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const event = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const result = {
      validJson: true,
      isSessionStart: event.hook_event_name === 'SessionStart',
      sessionIdPresent: typeof event.session_id === 'string' && event.session_id.length > 0,
      transcriptPathPresent: typeof event.transcript_path === 'string' && event.transcript_path.length > 0,
      cwdPresent: typeof event.cwd === 'string' && event.cwd.length > 0,
      sourcePresent: typeof event.source === 'string' && event.source.length > 0,
    };
    if (!outputPath) process.exitCode = 2;
    else writeFileSync(outputPath, `${JSON.stringify(result)}\n`, { mode: 0o600 });
  } catch {
    process.exitCode = 1;
  }
  process.exit();
}

const probeRoot = mkdtempSync(join(repoRoot, 'work', 'session-start-probe-'));
const codexHome = join(probeRoot, 'codex-home');
const resultPath = join(probeRoot, 'result.json');
mkdirSync(codexHome, { recursive: true, mode: 0o700 });

let child;
let lines;
let diagnostics;
let summary;
let nextId = 1;
const pending = new Map();
const hookDiagnostics = { sessionStartMentioned: false, hookFailureMentioned: false };

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
  const hookCommand = `${process.execPath} ${scriptPath} --hook`;
  const hookConfig = `hooks.SessionStart=[{hooks=[{type="command",command="${hookCommand}",timeout=3}]}]`;
  child = spawn('codex', ['--dangerously-bypass-hook-trust', 'app-server', '--stdio', '-c', hookConfig], {
    cwd: '/private/tmp',
    env: { ...process.env, CODEX_HOME: codexHome, SESSION_LENS_PROBE_RESULT: resultPath },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  lines = createInterface({ input: child.stdout });
  diagnostics = createInterface({ input: child.stderr });
  diagnostics.on('line', (line) => {
    if (/SessionStart/i.test(line)) hookDiagnostics.sessionStartMentioned = true;
    if (/hook.{0,40}(failed|failure|error)|failed.{0,40}hook/i.test(line)) hookDiagnostics.hookFailureMentioned = true;
  });
  lines.on('line', (line) => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    if (message.id === undefined || !pending.has(message.id)) return;
    const waiter = pending.get(message.id);
    clearTimeout(waiter.timer);
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(String(message.error.message ?? 'App Server request failed')));
    else waiter.resolve(message.result);
  });

  await request('initialize', {
    clientInfo: { name: 'session-lens-hook-probe', version: '1.0.0' },
    capabilities: {},
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'initialized', params: {} })}\n`);
  await request('thread/start', { cwd: '/private/tmp', ephemeral: true });

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && !summary) {
    try { summary = JSON.parse(readFileSync(resultPath, 'utf8')); } catch {}
    if (!summary) await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  console.log(JSON.stringify({
    status: summary ? 'hook-event-observed' : 'hook-event-not-observed',
    ephemeralThreadStarted: true,
    modelTurnStarted: false,
    hookDiagnostics,
    result: summary ?? null,
    rawEventFieldsReturnedOrPersisted: false,
  }));
  if (!summary?.isSessionStart || !summary?.sessionIdPresent) process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({
    status: 'probe-failed',
    error: error instanceof Error ? error.message : 'unknown error',
    rawEventFieldsReturnedOrPersisted: false,
  }));
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((resolveExit) => child.once('exit', resolveExit));
    child.kill('SIGTERM');
    await Promise.race([exited, new Promise((resolveTimeout) => setTimeout(resolveTimeout, 3000))]);
    if (child.exitCode === null && child.signalCode === null) {
      const killed = new Promise((resolveExit) => child.once('exit', resolveExit));
      child.kill('SIGKILL');
      await Promise.race([killed, new Promise((resolveTimeout) => setTimeout(resolveTimeout, 1000))]);
    }
  }
  lines?.close();
  diagnostics?.close();
  for (const waiter of pending.values()) {
    clearTimeout(waiter.timer);
    waiter.reject(new Error('Probe stopped'));
  }
  pending.clear();
  rmSync(probeRoot, { recursive: true, force: true });
}
