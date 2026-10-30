import { readFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const json = (file: string): Record<string, unknown> => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;

describe('local-only plugin wiring', () => {
  it('uses portable manifests and an explicit Codex compatibility layout', () => {
    expect(json('plugin.json')).toMatchObject({ name: 'session-lens', extensions: { 'com.openai': { hooks: './hooks/hooks.json', requires_local_executor: true } } });
    expect(json('.codex-plugin/plugin.json')).toMatchObject({ name: 'session-lens', mcpServers: './.mcp.json', hooks: './hooks/hooks.json' });
    expect(json('mcp.json')).toMatchObject({ mcpServers: { session_lens: { type: 'stdio', command: 'node', args: ['${PLUGIN_ROOT}/dist/server.mjs'], cwd: '${PLUGIN_ROOT}' } } });
    expect(json('.mcp.json').mcpServers).toEqual(json('mcp.json').mcpServers);
  });
  it.each(['not-json', '{"session_id":"fixture-alpha","prompt":"sk-synthetic"}', ''])('hook fails open without input parsing, output, or persistence: %s', (input) => {
    const temp = mkdtempSync(resolve('work/hook-test-'));
    try {
      const result = spawnSync('/bin/sh', [resolve('hooks/noop.sh')], { input, encoding: 'utf8', cwd: temp, env: { PLUGIN_DATA: temp, PATH: '/usr/bin:/bin' }, timeout: 1000 });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
      expect(readdirSync(temp)).toEqual([]);
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });
  it('configures only an explicitly no-op lifecycle hook', () => {
    const hooks = json(join('hooks', 'hooks.json'));
    expect(hooks).toMatchObject({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: '/bin/sh "${PLUGIN_ROOT}/hooks/noop.sh"' }] }] } });
    expect(Object.keys(hooks.hooks as object)).toEqual(['SessionStart']);
  });
});
