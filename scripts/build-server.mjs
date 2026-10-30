import { build } from 'esbuild';
await Promise.all([
  build({ entryPoints: ['src/index.ts'], outfile: 'dist/server.mjs', bundle: true,
    platform: 'node', target: 'node24', format: 'esm',
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  }),
  build({ entryPoints: ['src/capture-hook.ts'], outfile: 'dist/capture-hook.mjs', bundle: true,
    platform: 'node', target: 'node24', format: 'esm',
  }),
]);
