import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type Dependency = { path: string; dependencies?: Record<string, Dependency>; optionalDependencies?: Record<string, Dependency> };
type Member = { name: string; uid: number; gid: number; uname: string; gname: string; pax: Record<string, string> };
type Archive = { members: Member[]; notices: string | null };
let directory: string;
let archive: Archive;
let xattrAdded = false;

function productionPackages(): Map<string, string> {
  // Independent package-manager inventory, rather than the notice generator's traversal.
  const result = spawnSync('pnpm', ['list', '--prod', '--depth', 'Infinity', '--json'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  const roots = JSON.parse(result.stdout) as Dependency[];
  const packages = new Map<string, string>();
  function visit(node: Dependency) {
    for (const dependency of Object.values({ ...node.dependencies, ...node.optionalDependencies })) {
      const pkg = JSON.parse(readFileSync(join(dependency.path, 'package.json'), 'utf8')) as { name: string; version: string };
      packages.set(`${pkg.name}@${pkg.version}`, dependency.path);
      visit(dependency);
    }
  }
  roots.forEach(visit);
  return packages;
}

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'session-lens-package-test-'));
  for (const file of ['plugin.json', 'mcp.json', '.codex-plugin', '.mcp.json', 'hooks', 'README.md', 'IMPLEMENTATION_PLAN.md', 'compatibility.json', 'package.json', 'pnpm-lock.yaml']) {
    cpSync(resolve(file), join(directory, file), { recursive: true });
  }
  for (const folder of ['dist', 'evidence']) mkdirSync(join(directory, folder));
  const synthetic = join(directory, 'dist', 'synthetic.js');
  writeFileSync(synthetic, '// Synthetic archive test payload only.\n');
  if (process.platform === 'darwin') {
    const result = spawnSync('xattr', ['-w', 'com.sessionlens.synthetic', 'fixture-only', synthetic]);
    xattrAdded = result.status === 0;
    if (!xattrAdded) throw new Error('macOS xattr fixture could not be created');
  }
  symlinkSync(resolve('node_modules'), join(directory, 'node_modules'), 'dir');
  const packed = spawnSync(process.execPath, [resolve('scripts/package-local.mjs')], { cwd: directory, encoding: 'utf8' });
  if (packed.status !== 0) throw new Error(packed.stdout + packed.stderr);
  const inspect = spawnSync('python3', ['-c', `
import json, sys, tarfile
with tarfile.open(sys.argv[1], 'r:gz') as archive:
    members = archive.getmembers()
    notice = next((m for m in members if m.name == 'session-lens/THIRD_PARTY_NOTICES.md'), None)
    print(json.dumps({'members': [{'name': m.name, 'uid': m.uid, 'gid': m.gid, 'uname': m.uname, 'gname': m.gname, 'pax': m.pax_headers} for m in members], 'notices': archive.extractfile(notice).read().decode('utf8') if notice else None}))
`, join(directory, 'session-lens-l0.tgz')], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
  if (inspect.status !== 0) throw new Error(inspect.stderr);
  archive = JSON.parse(inspect.stdout) as Archive;
}, 20000);

afterAll(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });

describe('actual local distributable', () => {
  it('normalizes every owner header to neutral numeric and textual values', () => {
    expect(archive.members.length).toBeGreaterThan(0);
    expect(archive.members.every((member) => member.uid === 0 && member.gid === 0 && member.uname === 'root' && member.gname === 'root')).toBe(true);
  });
  it('excludes AppleDouble members and extended-attribute metadata, including a macOS xattr fixture', () => {
    if (process.platform === 'darwin') expect(xattrAdded).toBe(true);
    expect(archive.members.filter((member) => member.name.split('/').some((part) => part.startsWith('._')))).toEqual([]);
    expect(archive.members.flatMap((member) => Object.keys(member.pax)).filter((key) => /xattr|com\.apple|acl/i.test(key))).toEqual([]);
  });
  it('contains full license and copyright notices for the complete installed production closure', () => {
    expect(archive.notices).not.toBeNull();
    const notices = archive.notices ?? '';
    const packages = productionPackages();
    expect(packages.size).toBeGreaterThan(5);
    for (const [identity, path] of packages) {
      expect(notices, identity).toContain(identity);
      const licenses = readdirSync(path).filter((file) => /^(licen[cs]e|copying|notice|copyright)(\.|$)/i.test(file));
      expect(licenses.length, identity).toBeGreaterThan(0);
      for (const file of licenses) expect(notices, `${identity}/${file}`).toContain(readFileSync(join(path, file), 'utf8').trim());
    }
    expect(existsSync(resolve('THIRD_PARTY_NOTICES.md'))).toBe(true);
    expect(notices).toBe(readFileSync(resolve('THIRD_PARTY_NOTICES.md'), 'utf8'));
  });
});
