import { readFile } from 'node:fs/promises';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server';

const script = await readFile(new URL('./ui.js', import.meta.url), 'utf8');
const style = await readFile(new URL('./session-lens.css', import.meta.url), 'utf8');
// Only controlled build artifacts are embedded here. Fixture labels travel as
// structured tool results and are rendered by React as text, never HTML.
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session Lens L0</title><style>${style}</style></head><body><div id="root"></div><script>${script.replaceAll('</script', '<\\/script')}</script></body></html>`;
await createServer(html).connect(new StdioServerTransport());
