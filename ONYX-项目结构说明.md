# Onyx 项目结构说明（完整文件树 + 各文件/目录作用）

> 生成时间：2026-09-30 · 基于 `gitcode.com/badhope/onyx` main 分支（v1.0.0）
> 配套文件：`ONYX-完整文件树.txt`（全深度逐文件树，不含 node_modules/.git/构建产物）

---

## 0. 项目总览

**Onyx（黑曜石）** 是一个 **AI 编程工作台**，由 ZCode 深度定制而来：移除了官方账号、套餐、订阅与遥测体系，保留"配一个 OpenAI 兼容 API Key 即可开始干活"的纯净体验。

| 维度 | 说明 |
| --- | --- |
| 产品形态 | ① 浏览器 Web 客户端 ② Electron 桌面应用 ③ 终端 Agent CLI（TUI） |
| 核心能力 | 对话式智能体、模型自选（任意 OpenAI 兼容网关）、仓库感知、子智能体/钩子/命令、记忆与任务归档、插件商店 |
| 技术栈 | TypeScript、Node 24.14.0（`mise.toml` 锁定）、pnpm 10.33.2、React 19.2.7、Vite/rolldown（Web 与 renderer）、tsup（server 构建）、Electron（桌面）、Zustand（UI 状态）、oxlint/oxfmt（lint/format） |
| 仓库形态 | pnpm workspace 单体仓库：`packages/*` 12 个包 + `apps/zcode-cli`（自带子 workspace，17 个子包） |
| 协议 | Apache-2.0 |

**常用命令**（根目录执行）：`pnpm bootstrap`（装依赖+构建）· `pnpm dev:web`（Web+后端）· `pnpm dev:desktop`（桌面）· `pnpm typecheck` · `pnpm lint`

---

## 1. 分层架构与依赖方向

```
┌────────────────────────────────────────────────────────────────────────┐
│  用户形态层                                                              │
│  packages/web（Web 客户端入口）  packages/desktop（Electron 桌面）      │
│  apps/zcode-cli（终端 CLI / TUI，独立子 workspace）                     │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ 组装
┌───────────────────────────────▼────────────────────────────────────────┐
│  共享 UI 层：packages/ui（React 组件 / hooks / Zustand store）           │
│  规则：UI 经 hooks→accessor 访问服务，禁止直连服务端实现、禁止跨域导入   │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ 调用
┌───────────────────────────────▼────────────────────────────────────────┐
│  业务服务层：packages/services                                          │
│  会话 / 记忆 / 插件商店 / 技能 / 命令 / 钩子 / Git / 终端 / 子智能体     │
│  zcode-agent 运行时 / 广播 / 设置同步 / 遥测（仅本地）…                  │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ 依赖
┌───────────────────────────────▼────────────────────────────────────────┐
│  协议与基础设施层                                                       │
│  packages/shared（协议/类型/平台抽象）  packages/rpc（IPC 通信框架）     │
│  packages/server（HTTP / stdio 后端）  packages/client（Agent 客户端 SDK）│
│  packages/zcode-cua（Computer Use 占位，本构建 fail-closed）             │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ 调用
┌───────────────────────────────▼────────────────────────────────────────┐
│  模型供应层：packages/provider（抽象） + packages/provider-node（Node 实现）│
│  任意 OpenAI 兼容网关 / 内置 zcode-builtin 供应商配置 / 模型选择配置     │
└────────────────────────────────────────────────────────────────────────┘
```

**关键依赖规则**（来自 `AGENTS.md`）：
- `ui → services`（经 hooks/accessor）；`ui → shared`（类型与平台接口 `IPlatformService`）
- `server` 提供 HTTP（`entry-http.ts`）与 stdio（`entry-stdio.ts`）两种入口，`client` 是对应的 Agent 客户端 SDK
- Desktop main 进程经 stdio 与 Agent 运行时通信，协议定义在 `shared/zcode-protocol/`
- `apps/zcode-cli` 独立于上层 packages，自带 CLI 运行时（`cli/core/tui/…`）

---

## 2. 顶层目录与文件（一级树）

```text
onyx/
├── .agents/skills/            # 仓库内置的 AI 协作技能包
│   │                          #   agent-browser / ai-elements / architecture-governance
│   │                          #   dep-refs / dogfood / electron / feature-boundary-planner
│   │                          #   react-best-practices（AI 开发时遵守）
├── apps/
│   └── zcode-cli/             # 终端 Agent CLI（TUI + 可选 SEA 单文件打包），见 §3
├── config/
│   ├── default.json           # 随客户端分发的内置默认配置（反馈入口/社群链接等）
│   ├── provider/zcode-builtin.json  # 内置模型供应商配置（OpenAI 兼容网关）
│   └── README.md              # 配置来源与回退规则说明
├── docs/
│   ├── media/                 # logo、演示 GIF、演示视频（f1~f4 截屏、onyx-demo.gif）
│   ├── screenshots/           # README 界面截图（main/models/session）
│   └── index.html             # 项目介绍落地页（深色主题单页）
├── harness/
│   └── remote/                # 远程工作区容器：Dockerfile + build.sh + README
├── packages/                  # 主 workspace 的 12 个包，见 §4
├── patches/                   # pnpm patchedDependencies：
│   │                          #   @ai-sdk/anthropic、@ai-sdk/openai-compatible、
│   │                          #   @arms/rum-electron 的本地补丁
├── public/
│   ├── logo/icons/            # Web 客户端用图标
│   └── icon_512@2x.png        # 应用图标
├── scripts/                   # 构建/开发/分发/架构检查脚本，见 §5
├── third-party/               # 第三方组件治理：
│   ├── native-search/         # 原生搜索工具的 licenses + sources.json
│   ├── runtime/               # 打包用 Node 运行时许可证（22/24）
│   ├── upstream/              # 上游组件许可证明细（哈希文件）
│   └── inventory.json 等      # 组件清单 / npm overrides / copied / embedded
├── .vscode/                   # 编辑器配置：launch/tasks/settings + 开发辅助脚本
├── .husky/                    # git hooks（pre-commit/pre-push 等）
├── AGENTS.md                  # AI 开发协作约定（规范/命令/架构红线，AI 改代码前必读）
├── architecture-policy.yaml   # 架构约束策略（与 scripts/architecture 配合检查）
├── .architecture-baseline.json
├── DESIGN.md                  # UI 设计规范（改 UI 前必读）
├── CONTEXT.md                 # 插件商店领域词汇表（改商店 UI 前必读）
├── CHANGELOG.md               # 版本变更记录
├── README.md / README.en.md   # 中/英项目说明
├── package.json               # 根 workspace：脚本入口 + 依赖
├── pnpm-workspace.yaml        # workspace 定义（packages/* + apps/zcode-cli 及子目录）
├── pnpm-lock.yaml             # 依赖锁文件
├── tsconfig.base.json         # 共享 TS 编译配置
├── mise.toml                  # 工具版本锁定（node 24.14.0 / pnpm 10.33.2）+ 任务定义
├── .nvmrc / .npmrc            # Node 版本 / npm 配置（registry、hoisted linker）
├── .env.example               # 环境变量参考（线上地址、CDN、OAuth client id 等）
├── .env.development / .env.production  # 环境占位（线上地址由 shared resolver 提供）
├── .oxlintrc.json / .oxfmtrc.json      # oxlint 规则 / oxfmt 格式配置
├── knip.json                  # 未使用依赖/导出检查配置
├── .release-it.mjs            # 发版工具配置
├── .gitignore / .gitattributes / .dockerignore / .prettierignore
├── LICENSE                    # Apache-2.0
├── NOTICE.md                  # 声明文件
├── THIRD-PARTY-NOTICES.md     # 第三方组件声明（2MB 明细）
├── onyx-logo.png              # 品牌 Logo
```

---

## 3. apps/zcode-cli —— 终端 Agent CLI

独立子 workspace（自带 `pnpm-workspace.yaml`、`turbo.json`、17 个子包）。默认产物是普通 Node CLI bundle（`dist/zcode.cjs`，Node 24.14.0 直接运行），SEA（single executable application）为可选打包路径。CLI 具备 TUI（终端交互界面）、插件体系（`~/.zcode/cli/plugins` 下缓存/数据/市场目录）。

```text
apps/zcode-cli/
├── packages/                  # 17 个子包（见下表）
├── scripts/                   # 构建 / SEA 打包 / 上传脚本
├── dependencies/              # 内部依赖编排
├── .husky/  .env.template  turbo.json  .release-it.json  skills-lock.json
├── AGENTS.md / README.md
└── package.json
```

| 子包 | 作用 |
| --- | --- |
| `cli` | CLI 主应用：命令解析与进程装配 |
| `core` | 可复用运行时逻辑：agent、browser-client、context、embedded-search、hooks 等 |
| `tui` | 终端 UI 层：审批面板、时间线、组件、命令面板等 |
| `contracts` | 协议契约：capabilities/commands/config/errors/events/hooks |
| `adapters` | 平台适配：auth/browser/commands/config/context/device/exec/fs |
| `i18n` | 国际化：locales / locale 解析 |
| `telemetry` | 本地遥测：agent-metrics、trace-runtime、error-sanitizer、model-api-recorder |
| `dynamic-workflow` | 动态工作流：analysis/compiler/engine/lowering/schema |
| `dynamic-workflow-runtime` | 动态工作流子进程运行时（child-entry/harness/protocol） |
| `node-repl-host` | 共享 node_repl MCP host：JS 执行面 + 领域桥（Browser Use 等） |
| `browser-use-plugin` | 以官方内置插件发布的 Browser Use skill 与 client runtime |
| `bundled-skills` | 随 CLI 打包分发的技能 |
| `superpowers-plugin` | 扩展技能插件（目录形式） |
| `shared-types` | 共享类型 |
| `swift-bridge` | Swift 互操作层（占位） |
| `bootstrap` | CLI 引导：custom-commands / builtin-prompt / builtin-workflow 等 |
| `debug` | 调试视图（React App：gantt 时间线等） |

---

## 4. packages/ —— 主 workspace 的 12 个包

### 4.1 packages/shared —— 共享协议与类型（最底层）
UI/服务/协议共用的类型、枚举与平台抽象，约 200+ 类型文件。关键子目录：
```text
packages/shared/src/
├── browser-use/               # Browser Use 协议与类型
├── node/                      # Node 侧工具
├── zcode-protocol/            # Agent 通信协议（stdin/stdout/stream 定义）
├── zcode-protocol-v4/         # 协议 v4（手机远控/恢复链路）
├── platform.ts                # IPlatformService 平台抽象（UI 依赖它而非 window.zcode）
├── telemetry.ts / usage-stats.ts / feedback.ts   # 本地遥测/用量/反馈类型
├── settings-sync.ts / remote-sync.ts / mcp-sync.ts / skill-sync.ts  # 各类同步协议
├── model-*.ts / providers.ts / custom-model-value.ts  # 模型选择与供应商类型
├── plugin-*.ts / skills-types.ts / subagents-types.ts # 插件/技能/子智能体类型
├── workspaceFileSearch.ts / workspaceFileEntriesCodec.ts / git.ts
├── validation.ts / errors.ts / config-schema.ts
└── …（大量共享类型：task-realtime、background-bash、conversation-share、desktopMenu 等）
```

### 4.2 packages/rpc —— IPC 通信框架
> desc: **VS Code style IPC communication abstraction framework**
```text
packages/rpc/src/
├── channelClient.ts / channelServer.ts / channels.ts   # 通道两端
├── proxy-channel.ts / delayedChannel.ts                # 代理/延迟通道
├── remote.ts                                           # 远端对象代理
├── protocol.ts / persistent-protocol.ts                # 协议与持久化协议
├── serialization.ts / buffer.ts / ipc.ts               # 序列化 / IPC
├── logging-middleware.ts / network-telemetry-middleware.ts
├── foundation.ts / index.ts
└── examples/                                            # demo:basic/proxy/messageport/remote
```

### 4.3 packages/provider / provider-node —— 模型供应商
- `provider`：供应商**抽象层** —— registry（注册表）、resolver（解析）、sources（配置来源）、config-service、facades、model-selection-config（模型选择配置）、config-overlay（覆盖合并）。
- `provider-node`：Node 端**具体实现** —— zcode-builtin 内置供应商源（下载/释放/缓存/远端同步 `zcode-builtin-*.ts`）、个人供应商配置仓库（`personal-provider-config-repository.ts`）、模型选择配置仓库与 facade、provider-config-runtime、runtime-paths。
- `model-option-map`：**模型选项映射**编译器 —— 把声明式选项 DSL 编译成模型选择映射（tokenizer/parser/compiler/evaluator/option-maps/merge-patch）。

### 4.4 packages/services —— 业务服务层（40+ 模块）
```text
packages/services/src/
├── session / zcode-session        # 会话生命周期
├── zcode-agent                    # Agent 运行时
├── subagents                      # 子智能体
├── memory                         # 记忆
├── plugins / plugin-sync          # 插件与插件同步
├── skills / skill-sync            # 技能
├── commands / hooks               # 命令 / 钩子
├── git                            # Git 集成
├── terminal                       # 终端
├── process                        # 进程管理
├── bots / broadcast               # 机器人 / 广播
├── file / fs / fileWatcher        # 文件与监听
├── media-preview                  # 媒体预览
├── credential / device / system   # 凭据 / 设备 / 系统
├── settings-sync / client-config  # 设置同步 / 客户端配置
├── remote-sync                    # 远程同步
├── telemetry / usage-stats / feedback / conversation-telemetry
├── cua-permission-broker          # Computer Use 权限代理
├── mcp-sync                        # MCP 同步
├── prompt-attachment-transfer     # 附件传输
├── runtime-tools / storage / onboarding / window-controller
├── accessor.ts / collection.ts / descriptors.ts   # 服务访问器（UI 依赖）
├── node.ts / paths.ts / storage-startup.ts / memoryDiagnostics.ts
└── test/                          # 服务测试
```

### 4.5 packages/server —— Web 后端
```text
packages/server/src/
├── entry-http.ts                  # HTTP 入口（dev:web 时监听 :3030）
├── entry-stdio.ts / stdio*.ts      # stdio 入口（供 Agent/桌面进程通信）
├── http.ts                        # HTTP 服务装配
├── remote/                        # 远程工作区（容器/SSH/Docker broker）
├── bundledZCodeBuiltinProviderConfig.ts
├── hostCapability.ts / index.ts
├── build-remote.ts / buildRemoteValidation.ts   # 远程构建
└── tsup.config.ts / tsconfig.build.json
```

### 4.6 packages/client —— Agent 客户端 SDK
```text
packages/client/src/
├── index.ts / websocket.ts / messageport.ts     # 传输层
├── remoteServiceAccess.ts                        # 远端服务访问
├── rendererLoggingEnv.ts / globals.d.ts
```

### 4.7 packages/ui —— 共享 React UI（被 web/desktop renderer 使用）
```text
packages/ui/src/
├── app-shell / root / App.tsx / Root.tsx         # 应用骨架
├── components / lib                               # 通用组件与工具
├── hooks                                          # 服务访问 hooks（唯一入口）
├── store                                          # Zustand 状态
├── i18n / shortcuts / settings / settings-sync    # 国际化 / 快捷键 / 设置
├── workspace-file-tree / workspace-file-search / workspace-grouped-tasks
├── WorkspaceSidebar / WorkspaceHeaderSections
├── GitPane / GitActionMenu / GitBranchSwitcher / git-graph
├── ModelTrajectory*                               # 模型轨迹视图
├── chat-input-toolbar / prompt-editor / LexicalChatInput / mentions
├── command-center / quickpick / terminal / onboarding / feedback
├── remote-connection                              # 远程连接向导
├── resource-manager / workspace-file-tree
├── PreviewPane / previewPane*.tsx                 # 代码/图片/Markdown/PDF/Office/PPTX 预览
├── ToolCallBlocks / presentation / v4 / workers / browser-use / cua-permission
└── …（60+ 顶层组件文件：PermissionDialog、ElicitationDialog、DeveloperToolsPane 等）
```

### 4.8 packages/web —— Web 客户端入口
```text
packages/web/src/
├── main.tsx            # Vite 入口
├── share/              # 会话分享
├── communityUrl.ts     # 社群入口 URL
├── webThemeSeed.ts     # Web 主题
└── env.d.ts
```

### 4.9 packages/desktop —— Electron 桌面应用
```text
packages/desktop/src/
├── main/               # Electron 主进程：窗口/原生操作/进程调度/消息转发
│   │                   #   desktopElectronApp / appLaunchCoordinator / autoUpdater
│   │                   #   desktopHostProcess / desktopCommandHandlers / desktopCronScheduler
│   │                   #   browserView / chrome*（浏览器数据管理）/ cua*（Computer Use 权限）
│   │                   #   desktop*Ipc*（各类 IPC 桥）/ databaseStartup* / telemetry*
├── host/               # 窗口级 Local Host（本地 workspace 共享）
├── preload/            # 预加载脚本
├── renderer/           # 渲染进程 UI（组装 packages/ui）
├── scheduler/          # 调度
├── shared/             # 桌面侧共享
├── bundled-agents/     # 内置 Agent 定义
├── bundled-tools/      # 内置工具
├── native/             # 原生模块
├── electron-builder.config.js / vite.config.ts / tsup.config.ts
└── tsconfig.{host,main,preload,renderer,scheduler}.json
```

### 4.10 其余包
| 包 | 作用 |
| --- | --- |
| `zcode-cua` | Computer Use 的 **API 兼容占位包**：本构建不附带 Computer Use，所有运行时面均报不可用并 fail-closed |
| `zcode-server-cli` | 服务端 CLI 工具（scripts + src） |
| `formal-proof` | 形式化证明演示页（React + Vite：main.ts / model.ts / styles.css） |

---

## 5. scripts/ —— 构建与治理脚本

| 脚本 | 作用 |
| --- | --- |
| `bootstrap.mjs` | 仓库引导：install + 资源准备 + 构建（`pnpm bootstrap` 入口） |
| `check-workspace-freshness.mjs` | 检查本地与 origin/main 基线新鲜度 |
| `build-zcode.mjs` / `build-desktop-agent-bytecode.mjs` / `build-desktop-agent-cli.mjs` | 各形态构建 |
| `compile-desktop-agent-bytecode.cjs` / `desktop-agent-bytecode-runtime.cjs` | Agent 字节码编译与运行时 |
| `native-search-tools-*.mjs` / `prepare-native-search-tools.mjs` | 原生搜索工具构建/打包/验证（含 Windows PE） |
| `dev-desktop-env.mjs` / `dev-desktop-remote-prod.mjs` | 桌面开发环境 |
| `architecture/` | 架构检查：`architecture-check.mjs check/report/baseline`，配 `architecture-policy.yaml` |
| `dependency-graph.mjs` / `dep-refs.mjs` | 依赖图 / 导出引用查询 |
| `clean.mjs` / `count-lines.sh` / `spawn-command.mjs` / `mise-run.mjs` | 工具链 |
| `generate-third-party-notices.mjs` / `third-party-*.mjs` / `licenses.mjs` | 第三方声明生成 |
| `deterministic-tar-archive.mjs` | 确定性 tar 归档（可复现构建） |
| `zcode-distribution/` | 分发：assets/installer/runner + smoke 测试 |
| `builtin-provider-config.mjs` / `intranetDefaults.mjs` | 内置供应商配置 / 内网默认值 |
| `dev/zcode-stdio-tap.mjs` | stdio 调试工具 |
| `release-it/` | 发版 changelog 生成 |

---

## 6. 常见修改入口（开发时从哪下手）

| 想改什么 | 去哪个包 |
| --- | --- |
| 界面/交互 | `packages/ui`（组件/hooks/store）+ `packages/web`（Web 入口）/ `packages/desktop/src/renderer`（桌面） |
| 会话/任务逻辑 | `packages/services`（session、zcode-session、zcode-agent、subagents、memory） |
| 插件商店 | `packages/services/plugins` + `packages/ui` 商店页 + 术语见 `CONTEXT.md` |
| 模型供应商/选择 | `packages/provider` + `packages/provider-node` + `model-option-map` |
| 后端接口 | `packages/server`（entry-http.ts） |
| Agent 通信协议 | `packages/shared/zcode-protocol` + `packages/rpc` |
| 终端 CLI | `apps/zcode-cli`（cli/core/tui） |
| 设计规范 | 改 UI 前读 `DESIGN.md`；AI 协作读 `AGENTS.md` |

> 完整逐文件树见 `ONYX-完整文件树.txt`。
