import { cp, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { writeThirdPartyNotices } from './generate-third-party-notices.mjs';
writeThirdPartyNotices();
const stage = resolve('work/package/session-lens');
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
for (const file of ['plugin.json', 'mcp.json', '.codex-plugin', '.mcp.json', 'hooks', 'dist', 'README.md', 'IMPLEMENTATION_PLAN.md', 'compatibility.json', 'evidence', 'THIRD_PARTY_NOTICES.md']) {
  await cp(file, resolve(stage, file), { recursive: true, filter: (source) => !basename(source).startsWith('._') });
}
// macOS bsdtar: neutralize ownership without changing filesystem ownership,
// and suppress both pax xattrs and copyfile/AppleDouble metadata.
const packed = spawnSync('tar', ['--uid', '0', '--gid', '0', '--uname', 'root', '--gname', 'root',
  '--no-mac-metadata', '--no-xattrs', '--no-acls',
  '-czf', resolve('session-lens-l0.tgz'), '-C', resolve('work/package'), 'session-lens'],
{ stdio: 'inherit', env: { ...process.env, COPYFILE_DISABLE: '1' } });
if (packed.status !== 0) throw new Error('Local plugin archive failed');
console.log('Created session-lens-l0.tgz. Requires Node 24 on PATH. Not installed; host L0 gates remain blocked.');
