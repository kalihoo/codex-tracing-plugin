# Session Lens（会话观察器）— L0 接入验证原型

Session Lens 面向 Codex 用户，目标是在侧栏查看会话执行链路、任务耗时和 Token 用量，并导出离线 HTML 复盘报告。当前代码仍是 **L0 接入验证原型**：支持中文和英文界面切换，展示会话绑定状态与合成示例；真实会话事件采集、实时刷新、真实 Token 用量和报告导出尚未实现。请查看[兼容性与验收状态](compatibility.json)及[分层实施计划](IMPLEMENTATION_PLAN.md)。

## 当前状态

- UI 默认使用简体中文，可在右上角切换英文；侧栏布局按 360–800px 适配。
- 用户已确认在一个新建的本地 Codex 聊天中打开 `open_session` 后，Session Lens 面板实际显示。这个用户确认只证明入口和面板可见；没有保存独立截图，也不代表已接入实时事件或真实 Token 用量。
- 插件能识别经 Codex MCP tool-call metadata 提供的当前 `threadId`，但不会显示或持久化该 ID，也不会采集会话内容。
- 合成数据预览和协议刷新仅用于验证 UI 与 MCP 工具链路，不代表宿主采集能力。
- **L0 尚未通过**：真实会话事件刷新、两个桌面会话的真实事件隔离及由宿主交付到面板的权威 Token 用量仍未验证。L1–L4 按计划保持门控。

此原型不包含后台采集器、持久化数据库、团队或云服务、计费、工作流执行引擎，也不会读取 Codex transcript。生命周期 hook 是静默 no-op，且没有被信任；采集保持关闭。

## 本地构建和检查

要求 Node.js 24 与 pnpm 11。

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm smoke
pnpm package:local
```

`pnpm check` 运行严格 TypeScript 检查、构建 UI 和 Node stdio 服务，并执行 Vitest。`pnpm smoke` 在没有 `node_modules` 的打包副本上通过真实 MCP 协议做合成数据冒烟测试，并生成 `work/preview/index.html`；它不会打开真实聊天或读取宿主状态。`pnpm package:local` 会生成 `session-lens-l0.tgz`。

要查看独立合成预览，可运行：

```sh
python3 -m http.server 4175 --bind 127.0.0.1 --directory work/preview
```

浏览 `http://127.0.0.1:4175/` 可查看 `fixture-alpha`，`http://127.0.0.1:4175/?fixture=beta` 可查看用量未知的示例。该网页是独立预览，不是 Codex MCP Apps 宿主。

## 安装到本地 Codex

先运行 `pnpm package:local` 生成经过净化的构建目录，然后将仓库注册为本地 marketplace 并安装：

```sh
codex plugin marketplace add /absolute/path/to/session-lens
codex plugin add session-lens@session-lens-local
codex plugin list --json
```

安装或更新后，重启 Codex 桌面端并在**新聊天**中打开 `open_session` 入口。验证中文版本时，请先用当前代码重新运行 `pnpm package:local`，再重新加载或安装更新后的本地插件。插件市场目录只指向净化后的 `work/package/session-lens`，不会把 `.git`、`node_modules`、源代码测试目录或浏览器日志带入插件缓存。

### 提供的工具

- `open_session`：在当前 Codex 聊天中打开 Session Lens；展示会话绑定状态，不读取或采集聊天内容、生命周期事件或 Token 用量。
- `open_demo`：打开预设合成示例，不绑定当前聊天。
- `read_demo`：重新读取同一份内存中的合成快照。
- `advance_demo`：显示预设的第二条合成事件；不采集真实事件。

## 技术与证据

插件采用 TypeScript、React/Vite 与官方 MCP TypeScript SDK。入口和 UI 资源使用 MCP Apps thread entrypoint。当前 UI 资源不请求外部域名，用户内容按普通文本渲染。

本次界面本地化使用简体中文作为默认语言，并提供英语切换。完整的 UI 与浏览器宽度验证记录见[中文界面验收记录](evidence/i18n-browser-checks.md)。独立浏览器验证只能证明预览 UI 的文案和响应式布局，不能代替 Codex 桌面端证据。

技术栈版本、宿主实测范围、事件/Token 来源和 L0 阻塞项见[兼容性记录](compatibility.json)、[宿主复测记录](evidence/l0-host-recheck-2026-10-30.md)与[本地 Codex 测试记录](evidence/local-codex-host-test.json)。官方资料：[Codex App Server](https://learn.chatgpt.com/docs/app-server)、[Hooks](https://learn.chatgpt.com/docs/hooks)、[插件打包](https://developers.openai.com/plugins/build/plugins)、[MCP 扩展](https://developers.openai.com/plugins/build/extensions)。

`THIRD_PARTY_NOTICES.md` 收录生产依赖所需的许可证和版权文本。变更依赖后，请运行 `node scripts/generate-third-party-notices.mjs` 并随锁文件提交更新后的 notices。
