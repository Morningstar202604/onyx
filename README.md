# Onyx — 属于你自己的 AI 编程工作台

<div align="center">
  <img src="docs/media/onyx-logo.png" alt="Onyx logo" width="128" height="128" />
</div>

<p align="center">
  <strong>无服务器 · 纯 API Key 直连 · 本地与国产模型即插即用</strong>
</p>

<p align="center">
  <a href="#readme">简体中文</a> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform" />
  <img src="https://img.shields.io/github/stars/X33834/onyx?style=social" alt="GitHub stars" />
  <img src="https://img.shields.io/github/issues/X33834/onyx?style=social" alt="GitHub issues" />
</p>

---

**Onyx** 是一个**去官方化、纯 API Key 直连**的 AI 编程工作台：打开即用，配一个 Key 就开始干活。没有登录墙、没有套餐、没有官方服务器——数据与工作区全部留在你自己的电脑上。

- 🔑 **任意 OpenAI 兼容网关即插即用**：服务商地址与密钥完全由你填写，不内置任何厂商账号；
- 🌐 **国产模型深度适配**：多网关故障自动切换（failover）、并发排队、推理模型正文恒空自动回退——云知声 u2-flash 等真实 API 端到端实测通过；
- 💾 **本地模型端点离线可用**：Ollama / llama.cpp / 任意 OpenAI 兼容 `/v1` 端点即插即用，断网也能继续干活；
- 🗄️ **无服务器架构**：全部能力本地运行，不上传、不遥测、不依赖任何官方服务器；
- 📡 **远程工作区**：SSH / WSL / Docker 连接、断线自动重连、增量同步、远端机器资源监控；
- ⏰ **自动化调度**：定时（cron）/ 文件变更 / Webhook / Git 事件触发，运行日志与跨工作区运行监控全部本机可查；
- 🧠 **记忆与技能**：分层记忆、全文关键词检索、冲突合并、技能自动触发；
- 🧩 **插件生态**：插件 SDK + 本地市场（断网可用），自建市场安装的插件自动贡献技能。

> 适合：独立开发者、程序员个人生产力、私有化部署、国内网络环境下的 AI 编程工作流。

---

## 界面预览

<div align="center">
  <img src="docs/screenshots/onyx-main.png" alt="Onyx 主界面" width="90%" />
</div>

| 会话视图 | 模型选择 |
| --- | --- |
| <img src="docs/screenshots/onyx-session.png" alt="会话视图" width="100%" /> | <img src="docs/screenshots/onyx-models.png" alt="模型选择" width="100%" /> |

---

## 为什么是 Onyx

| | 传统 AI 编程工具 | **Onyx** |
| --- | --- | --- |
| 登录 / 账号 | 需要账号与套餐 | **纯 API Key，无登录墙** |
| 官方服务器 | 依赖官方云端 | **无服务器，全部本地** |
| 模型 | 绑定官方模型 | **任意 OpenAI 兼容网关 / 本地端点 / 国产模型** |
| 数据 | 上云 | **留在你自己的电脑** |
| 离线 | 不可用 | **本地模型端点离线可用** |

---

## 快速开始（60 秒）

需要 Git、Node.js **24.14.0**、pnpm **10.33.2**（见 [mise.toml](mise.toml)）。

```bash
# 1. 克隆（任选一个镜像，代码完全一致）
git clone https://github.com/X33834/onyx.git
# 或 git clone https://gitee.com/badhope/onyx.git
# 或 git clone https://gitcode.com/badhope/onyx.git

# 2. 安装依赖并构建（一条命令完成）
pnpm bootstrap

# 3. 启动
pnpm dev:web
# 打开 http://localhost:5173
```

然后：**设置 → 模型供应商 → 新增供应商**，填入你的网关地址与 API Key（本地端点填 `http://localhost:11434/v1` 之类的 Ollama / llama.cpp 地址即可），在输入框选好模型，开干。

---

## 深度能力（路线图 P0 → P2 全部落地并实测）

- **协议层**：多网关 failover、统一重试、能力协商保守默认、并发门（默认 8）、推理正文回退（国产模型 content 恒空场景）；
- **自动化**：cron 定时任务、文件变更 / Webhook / Git 事件触发、运行日志、通知中心、跨工作区全局运行监控；
- **远程**：SSH / WSL / Docker 工作区、断线自动重连、连接诊断、增量同步、远端机器级资源监控 UI；
- **记忆**：分层记忆、全文关键词检索、冲突合并、技能自动触发；
- **插件**：插件 SDK、本地市场（file / directory / git / url 源）、技能随本地市场自动分发。

详细交付记录见 [ONYX-深度开发路线图.md](ONYX-深度开发路线图.md)（含云知声真实 API 端到端实测与缺陷修复表）。

---

## 开发

```bash
# 桌面端（Electron）
pnpm dev:desktop

# Web（前端 + 后端）
pnpm dev:web

# 质量门禁（目标：0 warnings 0 errors）
pnpm lint
pnpm typecheck
```

常用环境变量：

| 变量 | 用途 |
| --- | --- |
| `ONYX_DATA_BASE_DIR` | 应用数据基目录（写入其下 `.onyx/`） |
| `ONYX_SERVER_WORKSPACE` | Web 后端工作区路径 |
| `ONYX_BUILTIN_PROVIDER_CONFIG_FILE` | 本地模型供应商配置路径 |

---

## 文档

| 文档 | 说明 |
| --- | --- |
| [README.en.md](README.en.md) | English readme |
| [ONYX-深度开发路线图.md](ONYX-深度开发路线图.md) | 深度开发路线图与实测记录 |
| [ONYX-插件开发指南.md](ONYX-插件开发指南.md) | 插件 SDK、本地市场、技能分发 |
| [CHANGELOG.md](CHANGELOG.md) | 变更日志 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献指南 |
| [SECURITY.md](SECURITY.md) | 安全政策 |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | 行为准则 |

---

## 镜像仓库

Onyx 同步到四个平台，任选其一克隆：

| 平台 | 地址 |
| --- | --- |
| GitHub | https://github.com/X33834/onyx |
| GitHub（镜像） | https://github.com/Morningstar202604/onyx |
| Gitee | https://gitee.com/badhope/onyx |
| GitCode | https://gitcode.com/badhope/onyx |

**喜欢 Onyx 的话，欢迎点个 Star ⭐** —— 你的支持是我们持续打磨的动力。

---

## 已知限制

- **会话内容不持久化**：会话数据存于运行内存，关闭页面或重启服务后，历史会话只剩标题，后续版本将补持久化；
- **模型配额**：模型调用取决于你的 API Key 余额；余额不足时界面会给出明确错误提示。

## 许可

Apache-2.0。第三方组件声明见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

---

_Onyx — 打磨每一个细节，为你自己的生产力工具。_
