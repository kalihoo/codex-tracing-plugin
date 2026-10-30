import { build } from 'esbuild';
await build({ entryPoints: ['src/index.ts'], outfile: 'dist/server.mjs', bundle: true,
  platform: 'node', target: 'node24', format: 'esm',
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});
