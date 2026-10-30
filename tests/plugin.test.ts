import { readFileSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectHookEventFromStdin } from '../src/collector';

const json = (file: string): Record<string, unknown> => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;

describe('local-only plugin wiring', () => {
  it('presents the local plugin listing in Chinese', () => {
    expect(json('plugin.json').extensions).toMatchObject({ 'com.openai': { interface: { displayName: 'Session Lens（会话观察器 · L0）', shortDescription: '查看当前 Codex 线程；采集需手动开启，且仅记录事件元数据' } } });
    expect(json('.codex-plugin/plugin.json').interface).toMatchObject({ displayName: 'Session Lens（会话观察器 · L0）', shortDescription: '查看当前 Codex 线程；采集需手动开启，且仅记录事件元数据' });
  });

  it('uses portable manifests and an explicit Codex compatibility layout', () => {
    expect(json('plugin.json')).toMatchObject({ name: 'session-lens', extensions: { 'com.openai': { hooks: './hooks/hooks.json', requires_local_executor: true } } });
    expect(json('.codex-plugin/plugin.json')).toMatchObject({ name: 'session-lens', mcpServers: './.mcp.json', hooks: './hooks/hooks.json' });
    expect(json('mcp.json')).toMatchObject({ mcpServers: { session_lens: { type: 'stdio', command: 'node', args: ['${PLUGIN_ROOT}/dist/server.mjs'], cwd: '${PLUGIN_ROOT}' } } });
    expect(json('.mcp.json').mcpServers).toEqual(json('mcp.json').mcpServers);
    expect(json('.agents/plugins/marketplace.json')).toMatchObject({ name: 'session-lens-local', plugins: [{ name: 'session-lens', source: { source: 'local', path: './work/package/session-lens' } }] });
  });
  it.each(['not-json', '{"prompt":"sk-synthetic"}', ''])('hook fails open on invalid lifecycle input: %s', async (input) => {
    const temp = await mkdtemp(join(tmpdir(), 'session-lens-hook-test-'));
    try {
      const source = (async function* () { yield Buffer.from(input); })();
      expect(await collectHookEventFromStdin(temp, source)).toBe(false);
      expect(await readdir(temp)).toEqual([]);
    } finally { await rm(temp, { recursive: true, force: true }); }
  });
  it('configures only the opt-in, asynchronous user-prompt metadata hook', () => {
    const hooks = json(join('hooks', 'hooks.json'));
    expect(hooks).toMatchObject({ hooks: { UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node "${PLUGIN_ROOT}/dist/capture-hook.mjs"', async: true, timeout: 1 }] }] } });
    expect(Object.keys(hooks.hooks as object)).toEqual(['UserPromptSubmit']);
  });
});
