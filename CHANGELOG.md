# Changelog

## [1.0.0] - 2026-09-28

### 🎉 Onyx 首发版

Onyx（黑曜石）—— 属于自己的 AI 编程工作台。基于 ZCode 深度定制，彻底移除官方账号、套餐、订阅与遥测体系，打开即是工作台，配一个 API Key 就能开始干活。

### ✨ 新增（相对上游定制）

- **纯 API Key 直连**：移除官方账号/OAuth/套餐体系，任意 OpenAI 兼容网关即插即用
- **去官方化**：清除官方界面、登录墙、套餐入口、遥测上报，打开直进主界面
- **官方链路深度清理**：删除官方登录命令（`login`/`logout`）、官方账号 Provider Registry、
  账号配置协议（providerUpdateAccountConfig）、RemoteUsage 遥测上报——全库构建修复
- **品牌全面 Onyx 化**：产品名、CLI 命令（`onyx`）、窗口/标签标题、错误提示、文档与截图全部统一
- **设置页简单优先**：常用项直接展示，复杂配置（钩子/规则）收进高级折叠，默认简单定义
- **12 个 Agnes 模型预配置**：flash/pro/image/video 系列开箱即用

### 🚀 核心能力

- 对话式智能体：思考 → 查阅仓库 → 执行命令 → 产出结果，全流程可视化
- 子智能体 / 钩子 / 命令：为重复工作定义自动化
- 记忆与任务归档：跨会话记住偏好，任务自动整理
- 工具分组变更、模型 IO 全量留存、保持唤醒等深度开关

### 🔧 质量

- lint 0 errors / typecheck 全绿
- **全量构建通过**（shared/provider/services/web/desktop/zcode-cli 全包）
- 端到端会话链路验证跑通（completedSuccess + 完整回复）

### ⚠️ 已知限制

- 会话内容暂不持久化：关闭页面或重启服务后，历史会话只剩标题（持久化排期后续版本）
- 模型配额取决于 API Key 余额；余额不足时界面给出明确错误提示

### 📦 发布形态

- Web：`pnpm dev:web` → `http://localhost:5173`
- CLI：`onyx` 命令（TUI / `onyx --web`）
- 桌面（Electron）：`pnpm dev:desktop`
