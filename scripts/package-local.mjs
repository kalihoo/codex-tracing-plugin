import { cp, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const stage = resolve('work/package/session-lens');
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
for (const file of ['plugin.json', 'mcp.json', '.codex-plugin', '.mcp.json', 'hooks', 'dist', 'README.md', 'compatibility.json', 'evidence']) {
  await cp(file, resolve(stage, file), { recursive: true });
}
const packed = spawnSync('tar', ['-czf', resolve('session-lens-l0.tgz'), '-C', resolve('work/package'), 'session-lens'], { stdio: 'inherit' });
if (packed.status !== 0) throw new Error('Local plugin archive failed');
console.log('Created session-lens-l0.tgz. Requires Node 24 on PATH. Not installed; host L0 gates remain blocked.');
