import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectHookEventFromStdin, LocalEventStore } from '../src/collector';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function createStore() {
  const root = await mkdtemp(join(tmpdir(), 'session-lens-collector-'));
  roots.push(root);
  return { root, store: new LocalEventStore(root) };
}

describe('explicitly enabled local lifecycle event capture', () => {
  it('does not persist lifecycle events until the exact session is enabled', async () => {
    const { root, store } = await createStore();
    const captured = await store.captureHookEvent({ session_id: 'thread-alpha', hook_event_name: 'UserPromptSubmit', prompt: 'private prompt' });
    const snapshot = await store.read('thread-alpha');

    expect(captured).toBe(false);
    expect(snapshot).toEqual({ collectionEnabled: false, events: [] });
    expect(await readdir(root)).toEqual([]);
  });

  it('captures only event metadata for the enabled session and isolates other sessions', async () => {
    const { root, store } = await createStore();
    await store.setEnabled('thread-alpha', true);
    const captured = await store.captureHookEvent({
      session_id: 'thread-alpha', hook_event_name: 'UserPromptSubmit',
      prompt: 'private prompt text', cwd: '/Users/private/project', model: 'private-model',
    });
    const otherSessionCaptured = await store.captureHookEvent({
      session_id: 'thread-beta', hook_event_name: 'PostToolUse',
      tool_name: 'Bash', tool_input: 'private command', tool_output: 'private output',
    });
    const alpha = await store.read('thread-alpha');
    const beta = await store.read('thread-beta');
    const persisted = await readAllFiles(root);

    expect(captured).toBe(true);
    expect(otherSessionCaptured).toBe(false);
    expect(alpha.collectionEnabled).toBe(true);
    expect(alpha.events).toHaveLength(1);
    expect(alpha.events[0]).toMatchObject({ hookEventName: 'UserPromptSubmit' });
    expect(alpha.events[0]?.occurredAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(beta).toEqual({ collectionEnabled: false, events: [] });
    expect(persisted).not.toContain('thread-alpha');
    expect(persisted).not.toContain('private prompt text');
    expect(persisted).not.toContain('/Users/private/project');
    expect(persisted).not.toContain('private-model');
    expect(persisted).not.toContain('private command');
    expect(persisted).not.toContain('private output');
    expect(persisted).toContain('UserPromptSubmit');
  });

  it('stops recording after the current session is paused', async () => {
    const { store } = await createStore();
    await store.setEnabled('thread-alpha', true);
    expect(await store.captureHookEvent({ session_id: 'thread-alpha', hook_event_name: 'PreToolUse' })).toBe(true);
    await store.setEnabled('thread-alpha', false);
    expect(await store.captureHookEvent({ session_id: 'thread-alpha', hook_event_name: 'PostToolUse' })).toBe(false);

    const snapshot = await store.read('thread-alpha');
    expect(snapshot.collectionEnabled).toBe(false);
    expect(snapshot.events.map((event) => event.hookEventName)).toEqual(['PreToolUse']);
  });

  it('discards hook payloads larger than one MiB before parsing or storing them', async () => {
    const { root, store } = await createStore();
    await store.setEnabled('thread-alpha', true);
    const oversized = JSON.stringify({ session_id: 'thread-alpha', hook_event_name: 'UserPromptSubmit', prompt: 'x'.repeat(1024 * 1024) });
    const source = (async function* () { yield Buffer.from(oversized); })();

    expect(await collectHookEventFromStdin(root, source)).toBe(false);
    expect((await store.read('thread-alpha')).events).toEqual([]);
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
