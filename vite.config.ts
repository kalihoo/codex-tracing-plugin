import { defineConfig } from 'vite';

export default defineConfig({
  // Library mode leaves environment constants to the library consumer unless
  // replaced explicitly. The embedded browser has no Node `process` global.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    emptyOutDir: true,
    lib: { entry: 'src/ui/main.tsx', name: 'SessionLens', formats: ['iife'], fileName: () => 'ui.js' },
    cssCodeSplit: false,
    sourcemap: false,
    minify: true,
  },
});
