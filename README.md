# Session Lens（会话观察器）— L0 接入验证原型

Session Lens 面向 Codex 用户，目标是在侧栏查看会话执行链路、任务耗时和 Token 用量，并导出离线 HTML 复盘报告。当前代码仍是 **L0 接入验证原型**：支持中文和英文界面切换；用户在侧栏明确开启后，插件尝试本地记录 `UserPromptSubmit` 的事件名称和观察时间，并可刷新查看。此阶段不保存消息、工具输入输出或 Token 用量，不计算任务耗时，也不导出正式报告。0.1.3 将 hook 改为调用同一 MCP 连接中的线程绑定记录工具，且不向每条用户消息注入额外文本；本地模拟隔离已通过，Codex 桌面端的信任、调用与实时刷新仍待复测。请查看[兼容性与验收状态](compatibility.json)及[分层实施计划](IMPLEMENTATION_PLAN.md)。

## 当前状态

- UI 默认使用简体中文，可在右上角切换英文；侧栏布局按 360–800px 适配。
- 用户已确认在一个新建的本地 Codex 聊天中打开 `open_session` 后，Session Lens 面板实际显示。这个用户确认只证明入口和面板可见；没有保存独立截图，也不代表已接入实时事件或真实 Token 用量。
- 插件能识别经 Codex MCP tool-call metadata 提供的当前 `threadId`，但不会显示或持久化该 ID。采集默认关闭；用户开启后，设计上仅记录 hook 事件名称和观察时间。
- 合成数据预览和协议刷新仅用于验证 UI 与 MCP 工具链路，不代表宿主采集能力。
- **L0 尚未通过**：真实会话事件刷新、两个桌面会话的真实事件隔离及由宿主交付到面板的权威 Token 用量仍未验证。L1–L4 按计划保持门控。

此原型不包含后台采集器、持久化数据库、团队或云服务、计费、工作流执行引擎，也不会读取 Codex transcript。当前源码将 `UserPromptSubmit` 接到本地 `session_lens` MCP server 的 `record_prompt_submit` 工具；hook 不传提示词，只让服务器从同一次宿主工具调用的 `threadId` 取得线程绑定，避免在采集路径中假设 hook `session_id` 与 MCP `threadId` 相等。记录工具不返回文本，避免给每条用户消息添加无关上下文。Codex 仍要求用户审阅并信任更新后的 hook 定义；MCP hook 只使用已连接的服务器，因此测试前先在该会话打开侧栏。真实桌面事件交付仍待宿主验收，不能把合成输入的本地 smoke 结果当作真实宿主采集证明。

## 本地构建和检查

要求 Node.js 24 与 pnpm 11。

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm smoke
pnpm package:local
```

`pnpm check` 运行严格 TypeScript 检查、构建 UI 与 Node stdio MCP server，并执行 Vitest。`pnpm smoke` 在没有 `node_modules` 的打包副本上通过真实 MCP 协议与合成宿主线程 metadata 做本地冒烟测试，并生成 `work/preview/index.html`；它不会打开真实聊天或读取宿主状态。`pnpm package:local` 会生成 `session-lens-l0.tgz`。

要查看独立合成预览，可运行：

```sh
python3 -m http.server 4175 --bind 127.0.0.1 --directory work/preview
```

浏览 `http://127.0.0.1:4175/` 可查看 `fixture-alpha`，`http://127.0.0.1:4175/?fixture=beta` 可查看用量未知的示例。该网页是独立预览，不是 Codex MCP Apps 宿主。

## 安装到本地 Codex 桌面端

先运行 `pnpm package:local`，生成经过净化的 `work/package/session-lens`。仓库中的 `.agents/plugins/marketplace.json` 已将本地插件目录指向这个构建结果。该目录是**仓库级** marketplace：

1. 在 Codex 桌面端打开本仓库根目录 `session-lens`，并重启 Codex 桌面端。
2. 打开 **Plugins Directory**，选择 **Session Lens local testing** 来源并安装 Session Lens。
3. 在新聊天中打开 `open_session`。在 `/hooks` 中确认 `UserPromptSubmit` 已出现，审阅并信任当前 hook 定义。
4. 打开侧栏、手动开启该聊天采集，再发送一条新的无敏感测试消息并刷新面板。

更新插件时先运行 `pnpm package:local`，然后重启桌面端；如果已安装副本仍显示旧版本，请在 Plugins Directory 卸载后重新安装。每个测试聊天都要分别开启采集并发送一条新消息。没有在开启后发送新消息时，事件数保持为零是预期结果；如果插件在 Plugins Directory 中未安装，或 `/hooks` 没有 `UserPromptSubmit`，先完成桌面端安装与 hook 信任，再测事件。

**CLI 安装不是桌面端安装的替代品。** `codex plugin marketplace add` 和 `codex plugin add` 管理的是 CLI marketplace/profile；CLI 中列出插件或 hook，不证明 Codex 桌面端已安装并加载该插件。官方打包文档要求含生命周期 hook 的插件通过 Codex 桌面端手动安装；repo marketplace 需从已打开的仓库中进入 Plugins Directory。插件本地安装后，Codex 仍要求用户审阅并信任 hook。此 marketplace 只指向净化后的构建结果，不会把 `.git`、`node_modules`、测试目录或浏览器日志带入插件缓存。

可用 `codex plugin marketplace add` / `codex plugin add` 单独做 CLI 侧的兼容性诊断，但不要据此记录桌面安装或桌面 hook 验收通过。验证中文版本时，也要先重新运行 `pnpm package:local`，再从桌面端本地来源更新插件。

### 本地 App Server hook 诊断

`pnpm probe:host-hook` 会在 Codex 本地 App Server 中启动一次临时线程，开启该线程的采集并提交一条简短测试消息。它会使用一次性 `--dangerously-bypass-hook-trust`，不会写入持久信任；事件数据写入临时目录并在退出时删除。该命令会发起一次真实 Codex 模型请求，只应由开发者手动运行。它不验证桌面侧栏、桌面 hook 信任或桌面会话隔离。

### 提供的工具

- `open_session`：在当前 Codex 聊天中打开 Session Lens；展示当前会话绑定状态与本地事件摘要。
- `read_session`：仅供侧栏调用，刷新当前会话的本地 hook 事件元数据。
- `set_collection`：仅供侧栏调用，按当前 Codex 线程开启或暂停本地事件元数据采集。
- `record_prompt_submit`：仅供宿主生命周期 hook 调用；按同一工具调用的宿主线程 ID 记录一次事件名和时间，不接收提示词。
- `open_demo`：打开预设合成示例，不绑定当前聊天。
- `read_demo`：重新读取同一份内存中的合成快照。
- `advance_demo`：显示预设的第二条合成事件；不采集真实事件。

## 技术与证据

插件采用 TypeScript、React/Vite 与官方 MCP TypeScript SDK。入口和 UI 资源使用 MCP Apps thread entrypoint。当前 UI 资源不请求外部域名，用户内容按普通文本渲染。

落盘的数据含随机事件 ID、hook 事件名称、观察时间和由宿主线程标识派生的 SHA-256 隔离键，目录和文件设置为用户私有权限。MCP lifecycle hook 不接收提示词，原始线程 ID、消息、工具输入输出不会落盘。当前仅注册 `UserPromptSubmit`，不会因为事件名而推断工具调用、完成状态或任务耗时。暂停时会阻止后续事件记录，已经开始的本地写入仍可能完成。插件自身没有 token 订阅接口，因此真实用量保持“不可用”。

本次界面本地化使用简体中文作为默认语言，并提供英语切换。完整的 UI 与浏览器宽度验证记录见[中文界面验收记录](evidence/i18n-browser-checks.md)。独立浏览器验证只能证明预览 UI 的文案和响应式布局，不能代替 Codex 桌面端证据。

技术栈版本、宿主实测范围、事件/Token 来源和 L0 阻塞项见[兼容性记录](compatibility.json)、[宿主复测记录](evidence/l0-host-recheck-2026-10-30.md)与[本地 Codex 测试记录](evidence/local-codex-host-test.json)。官方资料：[Codex App Server](https://learn.chatgpt.com/docs/app-server)、[Hooks](https://learn.chatgpt.com/docs/hooks)、[插件打包与桌面安装](https://developers.openai.com/plugins/build/plugins)、[MCP 扩展](https://developers.openai.com/plugins/build/extensions)。

`THIRD_PARTY_NOTICES.md` 收录生产依赖所需的许可证和版权文本。变更依赖后，请运行 `node scripts/generate-third-party-notices.mjs` 并随锁文件提交更新后的 notices。
