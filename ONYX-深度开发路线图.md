# Onyx 深度开发路线图

> 生成时间：2026-09-30 · 基于对当前 main 源码（6c72362 之后）的功能盘点
> 范围：协议层、远程工作区、插件生态、自动化与 bots、记忆与技能体系（用户选定 5 大方向）
> 原则：**协议打底、自托管优先、轻量开箱即用、用户自建网关**（延续"无官方服务器"路线）

---

## 0. 总览

| 方向 | 现状成熟度 | 首要短板 | 推荐起点（P0） |
| --- | --- | --- | --- |
| ① 网关/协议层 | ★★★☆ 基础扎实 | 无多网关路由/能力协商 | ~~多网关 failover~~ ✅已实现 |
| ② 远程工作区 | ★★★☆ 可连接可用 | 无自动重连/同步性能/资源监控 | 断线自动重连 + 连接诊断 |
| ③ 插件生态 | ★★★☆ 管理完备 | 无第三方 SDK/市场/权限模型 | 插件 SDK + 本地导入 |
| ④ 自动化与 bots | ★★★☆ 管理面完备 | 通知聚合缺失 | ~~cron UI + 运行日志~~ ✅已有，+ 通知中心 ✅ |
| ⑤ 记忆与技能 | ★★☆☆ 有基础 | 无语义检索/分层/自动触发 | 记忆分层 UI + 技能管理 |

**依赖关系**：①是底座（所有模型能力走它），其余四方向并行；③的 SDK 可作为 ⑤ 技能市场的载体。

---

## 1. 网关/协议层深度开发（底座，P0 优先）

### 现状（源码盘点）
- 模型执行走 AI SDK：`@ai-sdk/openai-compatible`、`@ai-sdk/anthropic`（`apps/zcode-cli/packages/adapters/src/model/model-execution.ts`）
- 协议适配已有：`services/src/providers/api/`（apiJson、apiKeyHeaders、requestIdHeaders、nodeApiClient、nodeApiNetwork）
- 失败处理已有：failure-classifier、failure-tls、failure-provider-business-codes、empty-completion-retry、failure-inspection
- 流式与媒体：anthropic-stream-compat（流式兼容）、media-transform-policy（媒体变换）
- **缺口**：多网关路由/failover 无、重试策略简单、能力协商无、并发控制无、多模态管道未做深、用量统计无

### P0（1–2 周）—— ✅ 已完成（2026-09-30）
1. **多网关 failover** ✅：逻辑供应商支持配置最多 3 个备用网关（`api.fallbackGateways`，备用 key 可复用主 key）；主网关网络错误/429/5xx 时按序自动切换，4xx 语义错误不切换；请求 URL 与鉴权头自动重写（`gateway-failover.ts`，冒烟测试 4/4 通过）；UI 设置页新增"备用网关（故障切换）"编辑区
2. **统一重试策略** ✅（上游已具备，验证确认）：`retry-policy.ts`（可配 maxAttempts/baseDelay/backoff/jitter，环境变量 ONYX_MODEL_RETRY_*）+ `runner-retry.ts`（429 Retry-After / retry-after-ms 退避）；无需新增
3. **模型能力协商表** ✅：`model-capabilities.ts`（providerId+modelId → tool/vision/reasoning 能力表，含 OpenAI/Anthropic/DeepSeek/Kimi/通义/GLM/MiniMax/MiMo 规则）；模型设置页模型行新增能力徽标（视觉/推理/工具）

### P1（1–2 月）
4. **流式增强**：token 级进度、中断恢复、背压与节流
5. **多模态管道**：扩展 media-transform-policy——图片/PDF/音频统一转换（base64 / 远端 URL 白名单）
6. **并发与配额**：每供应商并发上限、请求队列、按 key 配额
7. **代理矩阵**：httpProxy / noProxy 细化到供应商粒度
8. **用量与成本统计**：token 计量、按供应商/模型汇总（本地 SQLite 存储，不上报）

### P2（远期）
9. **自定义协议适配器 SDK**：第三方按 schema 接入非 OpenAI 兼容协议
10. **智能路由**：按上下文窗口/成本/延迟自动选供应商；供应商健康度评分
11. **离线降级**：本地模型（Ollama / llama.cpp）接入

### 验收标准
- P0：配置 2 个网关，拔掉主网关后请求自动切换，成功率 100%（同请求重放验证）；429 退避不违反限流
- P1：10 并发队列稳定无 OOM；图片/PDF 输入端到端可用
- P2：接入一个非 OpenAI 兼容协议 demo 供应商

---

## 2. 远程工作区增强

### 现状（源码盘点）
- 三后端：ssh-backend、docker-backend、WSL（detectEnv / docker-detect）
- 连接链路：connect.ts、handshake（握手）、create-backend、posixShell
- 部署链路：deploy.ts（tarGz）、remoteAsset*（预检/决策/安装器/网络）、remoteSyncWriteAccess（同步写）
- **缺口**：断线自动重连/会话恢复无、文件同步无增量、远端资源监控无、多连接管理弱

### P0
1. **断线自动重连**：心跳保活 + 指数退避重连 + 会话恢复（任务状态不丢）
2. **连接诊断**：连通性检测页（TCP/认证/版本/资源探测分步诊断）
3. **环境探测完善**：detectEnv 扩展（远端系统/工具链/磁盘空间探测）

### P1
4. **文件同步性能**：增量同步（mtime+hash）、忽略规则、双向冲突处理 UI
5. **远端资源监控**：CPU/内存/磁盘实时面板（复用 desktop 资源管理器模式）
6. **多连接管理**：连接列表/切换/断连清理

### P2
7. **混合工作区**：本地+远端文件混合挂载
8. **离线队列**：断网任务排队，重连后自动执行
9. **远端调试器**：attach 远端进程调试

### 验收标准
- P0：拔网线 30s 内自动重连成功，进行中任务恢复
- P1：10MB 目录增量同步 < 2s（首次除外）；资源面板数据准确
- P2：混合工作区文件访问与本地一致

---

## 3. 插件生态

### 现状（源码盘点）
- 管理：pluginsService、pluginManagementService、installedPluginRoots
- 同步：pluginSyncService（本地目录/归档同步）
- 市场：`onyx-plugins-official` 市场 id + 9 个内置插件（browser-use/image-search/documents/pdf/presentations/spreadsheets/node-repl-host/skill-creator/plugin-creator/onyx-guide）
- **缺口**：第三方插件 SDK 无、市场页无（本地 seed only）、权限模型无、贡献点少（无事件钩子）

### P0
1. **插件 SDK 与模板**：manifest 规范文档 + `create-onyx-plugin` 脚手架；贡献点：命令、工具、Provider 装饰
2. **本地导入**：目录 / zip 导入插件（复用 pluginSync），带依赖校验
3. **插件权限提示**：安装时声明权限（文件/网络/执行），安装确认页

### P1
4. **插件市场页**：自建静态市场（JSON 索引 + 本地打包分发，无官方服务器）
5. **插件更新**：版本检查与一键更新（复用更新源机制，可关）
6. **事件钩子贡献点**：插件订阅生命周期/会话/文件事件
7. **插件配置 UI**：设置页插件详情/配置表单

### P2
8. **跨端插件**：desktop 与 CLI 共享插件（复用 bundled-agents 分发路径）
9. **插件沙箱**：受限进程/权限隔离
10. **社区市场**：索引/评分/签名校验

### 验收标准
- P0：第三方按 SDK 模板 10 分钟产出可安装插件；导入即用
- P1：市场页断网可用（本地索引）；插件订阅事件正常
- P2：同一插件 desktop/CLI 行为一致

---

## 4. 自动化与 bots

### 现状（源码盘点）
- bots：botsService、channelRuntime、feishuChannelRuntime（飞书频道已内置）
- 调度：desktopCronScheduler（cron）、offPeakDispatchSettlement（错峰）
- 通知：broadcast / broadcastService
- **缺口**：cron UI 弱（代码级配置）、频道少、触发条件少、投递面窄、无运行日志回放

### P0 —— ✅ 已完成（2026-09-30）
1. **cron 定时任务 UI** ✅（上游已具备，验证确认）：AutomationsSection/AutomationEditView 完整（创建/编辑/启停/模板/下次触发预览），无需新增
2. **运行日志** ✅（上游已具备，验证确认）：AutomationService.listRuns + SavedWorkflowRunHistoryPanel 运行历史面板，无需新增
3. **通知中心** ✅（本轮新增）：桌面通知本地历史（~/.onyx/v2/notifications.jsonl，上限 200，窗口聚焦时"仅记录不弹出"）；IPC 查询/清空；UI 铃铛入口 + 通知面板（状态图标/时间/仅记录标记/清空/空态）；zh/en 文案；desktop main tsc 零新增错误

### P1
4. **触发条件扩展**：文件变更、Git 事件（push/commit）、命令完成、定时+条件组合
5. **投递渠道**：邮件 / Webhook / 飞书（已有）可选
6. **bot 频道扩展**：Slack / DingTalk / 终端内 bot（复用 channelRuntime 接口）
7. **失败重试**：bot 执行失败重试策略 + 告警

### P2
8. **自动化模板库**：预设场景（日报/巡检/发布）一键生成
9. **跨工作区编排**：多工作区串并行
10. **运行回放**：逐步回放执行轨迹（复用 taskRealtimeBus 轨迹数据）

### 验收标准
- P0：UI 建一个每分钟任务，运行日志完整可查；通知中心零丢失
- P1：Git 事件触发成功率 100%；Webhook 投递成功
- P2：模板生成 1 分钟完成；跨工作区编排正确

---

## 5. 记忆与技能体系

### 现状（源码盘点）
- 记忆：memoryService、projectMemoryStableRead（项目级稳定读取）
- 技能：skillsService、skillDiscoveryWalk（技能发现/扫描）
- 钩子：hooksService、workspaceHookConfigMutation（工作区钩子配置）
- **缺口**：记忆无分层（会话/项目/全局无 UI）、无语义检索（关键词级）、技能无市场/自动触发弱、钩子事件少

### P0
1. **记忆分层与 UI**：会话/项目/全局三级记忆，设置页可查看/编辑/删除（复用 memoryService 存储）
2. **技能管理**：技能列表/启停/来源（内置/用户目录/插件）
3. **技能创建向导**：基于 skill-creator 的引导式创建（名称/描述/指令/触发词）

### P1
4. **语义检索**：本地 embedding（复用本地模型或内置轻量向量库）提升记忆召回
5. **记忆衰减与冲突合并**：同主题新旧记忆合并策略
6. **技能自动触发**：关键词/模式匹配自动唤起技能
7. **钩子事件扩展**：会话开始/结束、文件读写、工具调用等事件 → 工作区钩子动作

### P2
8. **跨设备记忆同步**：自托管同步（无官方服务器，用户自建端点）
9. **技能市场**：技能打包分发（复用插件市场机制）
10. **个性化工作流**：基于使用模式生成推荐流程

### 验收标准
- P0：三级记忆增删改查闭环；技能启停即时生效
- P1：语义检索 Top-5 命中率提升（对比关键词基线）；冲突合并无重复
- P2：自托管同步两端一致；技能市场安装即用

---

## 6. 优先级与节奏建议

| 周次 | 主攻 | 配合 |
| --- | --- | --- |
| 1–2 | ① P0（failover/重试/能力协商） | ④ P0 起步（cron UI） |
| 3–4 | ② P0（重连/诊断） | ⑤ P0（记忆分层/技能管理） |
| 5–6 | ③ P0（SDK/导入/权限） | ① P1（流式/多模态） |
| 7–8 | ④ P1（触发/投递） | ② P1（同步/监控） |
| 9–12 | ① P2 / ③ P1 / ⑤ P1 | 持续回归 |

**节奏原则**：每个 P0 独立提交、独立验收；所有功能默认离线可用、不上报、不自带官方服务器依赖；新增用户可见入口走 UI 向导而非代码配置。

## 7. 总验收标准
1. 断网状态下：多网关切换、远程重连、插件导入、cron 执行、记忆读写全部可用（除显式依赖网络的投递）
2. 新增功能全部可配置化，默认值不指向任何第三方服务器
3. `pnpm typecheck` / `pnpm lint` 0 错误；desktop main/renderer 相对基线零新增错误
4. 每个 P0 交付带验收用例清单（见各方向验收标准）
