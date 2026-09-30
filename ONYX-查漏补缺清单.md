# Onyx 横向查漏补缺清单

> 全栈（底层 → 上层）横向扫描与补完记录，2026-09-30。基于源码事实整理，随代码演进更新。

## 已补完（本轮）

| 项 | 位置 | 处理 |
| --- | --- | --- |
| README 品牌独立表述 | `README.md` / `README.en.md` | 删除"由 ZCode 深度定制而来"，改为 Onyx 独立表述（无登录墙/无官方账号/数据本机） |
| CLI 官方 OAuth 登录选项 | `apps/zcode-cli/packages/cli/src/command-center/login-flow.ts` | 删除 zai-coding-plan / bigmodel-coding-plan 两个官方账号 OAuth 选项（官方账号体系已砍，OAuth base 置空）；保留 zai/bigmodel **api-key 手动输入**路径（自填密钥用户仍可用） |
| 上游供应商注释 | `packages/desktop/src/main/browserView/browserPlaywrightLocatorExecutor.ts` | "z.ai 输入框" → "上游供应商输入框" |

## 有意保留（内部标识，非用户可见）

- `bigmodel` / `zai` 协议标识：`BUILTIN_MODEL_PROVIDER_IDS`（account:bigmodel-* 等）、`codingPlanWebview` 的 provider 类型、`reasoning-history-normalization` 历史数据归一化——是**内部协议/历史数据兼容标识**，改动会破坏既有配置与历史会话。
- `conversationShareService` 中"Onyx 无官方服务器"说明性注释。

## 待拍板（耦合深，未擅自删）

| 项 | 现状 | 说明 |
| --- | --- | --- |
| off-peak 闲时调度 | 依赖官方账号（providerFamily zai/bigmodel、personal/team access） | 自填 key 用户无官方配额，功能失去意义；但已深度集成（OffPeakEditView / AutomationDesignPrimitives / TaskListItem / App）——删除需整体评估 |
| CLI 单包 tsc 基线错误 | `cli-types.ts`（InspectZCodeSkillOptions）、`prompt-command.ts`（loadDotenv/providerRuntimeHeadersPort） | 生产构建走 esbuild/tsup 不查类型；未改动文件，非本次引入 |

## 已知基线（上游自带，保留）

- desktop main tsc 22 文件报错（生产 esbuild 不查类型），历次对比零新增。
- renderer 基线：desktopBrowserPlatformBridge / desktopPlatform（window.zcode TS2339）等。

## 深度开发 P1 候选（路线图）

协议层（并发/多模态/用量统计）、远程（增量同步/资源监控/多连接）、插件（权限体系/事件钩子）、自动化（触发面/投递面）、记忆（语义检索/自动触发）——见 `ONYX-深度开发路线图.md`。
