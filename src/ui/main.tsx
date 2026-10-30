import { App } from '@modelcontextprotocol/ext-apps';
import { createRoot } from 'react-dom/client';
import { DemoStore } from '../demo';
import { DemoController } from './controller';
import { type Language, type StatusKey } from './i18n';
import { SessionLensView } from './view';
import './style.css';

const root = createRoot(document.getElementById('root')!);
const app = new App({ name: 'Session Lens L0', version: '0.1.0-l0' }, {});
const preview = window.parent === window;
const previewStore = preview ? new DemoStore() : null;
const controller = new DemoController(async (name, sessionId) => {
  if (previewStore) return { structuredContent: name === 'advance_demo' ? previewStore.advance(sessionId) : previewStore.read(sessionId) };
  return app.callServerTool({ name, arguments: { sessionId } });
});
let busy = false;
let language: Language = 'zh-CN';
let status: StatusKey = preview ? 'standalone-preview' : 'waiting-host';
let revision: number | undefined;
function render() {
  document.documentElement.lang = language;
  root.render(<SessionLensView snapshot={controller.current} status={status} revision={revision} language={language}
    onLanguageChange={(next) => { language = next; render(); }} busy={busy}
    refresh={() => { void run('refresh'); }} advance={() => { void run('advance'); }} />);
}
async function run(action: 'refresh' | 'advance') {
  if (busy) return;
  busy = true;
  status = 'refreshing';
  render();
  try {
    await controller[action]();
    revision = controller.current?.mode === 'synthetic-fixture' ? controller.current.revision : undefined;
    status = 'fixture-revision';
  } catch { status = 'refresh-unavailable'; }
  finally { busy = false; render(); }
}
app.ontoolresult = (result) => {
  try {
    controller.receive(result);
    status = controller.current?.mode === 'host-unbound'
      ? 'host-unbound'
      : controller.current?.mode === 'host-bound'
        ? 'host-bound'
        : 'demo-ready';
  }
  catch { status = 'invalid-snapshot'; }
  render();
};
app.onhostcontextchanged = (context) => {
  if (context.theme === 'dark' || context.theme === 'light') document.documentElement.dataset.theme = context.theme;
};
render();
if (previewStore) {
  const fixture = new URLSearchParams(window.location.search).get('fixture') === 'beta' ? 'fixture-beta' : 'fixture-alpha';
  controller.receive({ structuredContent: previewStore.read(fixture) });
  render();
} else {
  void app.connect(undefined, { timeout: 5000 }).then(() => {
    const theme = app.getHostContext()?.theme;
    if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
  }).catch(() => { status = 'bridge-unavailable'; render(); });
}
