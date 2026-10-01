# Onyx — Your Own AI Coding Workspace

<div align="center">
  <img src="docs/media/onyx-logo.png" alt="Onyx logo" width="128" height="128" />
</div>

<p align="center">
  <strong>Serverless · BYO API Key · Local & Chinese LLM endpoints plug in instantly</strong>
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <a href="#readme">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform" />
  <img src="https://img.shields.io/github/stars/X33834/onyx?style=social" alt="GitHub stars" />
  <img src="https://img.shields.io/github/issues/X33834/onyx?style=social" alt="GitHub issues" />
</p>

---

**Onyx** is a **serverless, BYO-API-key AI coding workspace**: open it, plug in a key, and start working. No login wall, no subscription plans, no official backend servers — your data and workspaces stay on your own machine.

- 🔑 **Any OpenAI-compatible gateway, plug and play**: provider endpoints and keys are entirely yours; no built-in vendor accounts.
- 🌐 **Deep support for Chinese LLM providers**: multi-gateway failover, concurrency queuing, and automatic fallback when reasoning models return empty `content` — verified end-to-end against real APIs (e.g., Unisound u2-flash).
- 💾 **Local model endpoints, offline-ready**: Ollama / llama.cpp / any OpenAI-compatible `/v1` endpoint works out of the box — keep working without internet.
- 🗄️ **Serverless architecture**: everything runs locally; no uploads, no telemetry, no dependency on any official server. Your machine is the server.
- 📡 **Remote workspaces**: SSH / WSL / Docker, auto-reconnect, incremental sync, remote machine resource monitoring.
- ⏰ **Automation scheduling**: cron, file-change, Webhook and Git-event triggers; run logs and cross-workspace run monitoring, all queryable locally.
- 🧠 **Memory & skills**: layered memory, full-text keyword search, conflict merging, skill auto-triggering.
- 🧩 **Plugin ecosystem**: plugin SDK + local marketplace (offline-ready); plugins installed from your own marketplace contribute skills automatically.

> Great fit for: indie developers, programmer personal productivity, private/self-hosted deployment, and AI coding workflows in China's network environment.

---

## Screenshots

<div align="center">
  <img src="docs/screenshots/onyx-main.png" alt="Onyx main interface" width="90%" />
</div>

| Conversation view | Model picker |
| --- | --- |
| <img src="docs/screenshots/onyx-session.png" alt="Conversation view" width="100%" /> | <img src="docs/screenshots/onyx-models.png" alt="Model picker" width="100%" /> |

---

## Why Onyx

| | Traditional AI coding tools | **Onyx** |
| --- | --- | --- |
| Sign-up | Account & subscription required | **Plain API key, no login wall** |
| Backend | Relies on official cloud | **Serverless, fully local** |
| Models | Locked to vendor models | **Any OpenAI-compatible gateway / local / Chinese LLM endpoints** |
| Data | Uploaded to cloud | **Stays on your machine** |
| Offline | Unavailable | **Local endpoints keep you working offline** |

---

## Quick start (60 seconds)

Requires Git, Node.js **24.14.0**, and pnpm **10.33.2** (see [mise.toml](mise.toml)).

```bash
# 1. Clone (pick any mirror; code is identical)
git clone https://github.com/X33834/onyx.git
# or git clone https://gitee.com/badhope/onyx.git
# or git clone https://gitcode.com/badhope/onyx.git

# 2. Install dependencies and build (one command)
pnpm bootstrap

# 3. Start
pnpm dev:web
# Open http://localhost:5173
```

Then: **Settings → Model Providers → Add provider**, fill in your gateway URL and API key (for local endpoints, use e.g. `http://localhost:11434/v1` for Ollama / llama.cpp), pick a model in the composer, and start working.

---

## Deep capabilities (roadmap P0 → P2, all shipped and tested)

- **Protocol layer**: multi-gateway failover, unified retries, conservative capability negotiation, concurrency gate (default 8), reasoning-content fallback for models with empty `content`.
- **Automation**: cron schedules, file-change / Webhook / Git-event triggers, run logs, notification center, cross-workspace global run monitoring.
- **Remote**: SSH / WSL / Docker workspaces, auto-reconnect, connection diagnostics, incremental sync, remote machine resource monitoring UI.
- **Memory**: layered memory, full-text keyword search, conflict merging, skill auto-triggering.
- **Plugins**: plugin SDK, local marketplace (file / directory / git / url sources), skills distributed automatically with your marketplace.

See [ONYX-深度开发路线图.md](ONYX-深度开发路线图.md) for the full delivery record, including the end-to-end real-API verification and the list of defects found and fixed.

---

## Development

```bash
# Desktop (Electron)
pnpm dev:desktop

# Web (frontend + backend)
pnpm dev:web

# Quality gates (target: 0 warnings, 0 errors)
pnpm lint
pnpm typecheck
```

Useful environment variables:

| Variable | Purpose |
| --- | --- |
| `ONYX_DATA_BASE_DIR` | App data base directory (writes into `.onyx/` under it) |
| `ONYX_SERVER_WORKSPACE` | Web backend workspace path |
| `ONYX_BUILTIN_PROVIDER_CONFIG_FILE` | Local model-provider config file |

---

## Documentation

| Doc | Purpose |
| --- | --- |
| [README.md](README.md) | 简体中文 readme |
| [ONYX-深度开发路线图.md](ONYX-深度开发路线图.md) | Deep-development roadmap & verified delivery records |
| [ONYX-插件开发指南.md](ONYX-插件开发指南.md) | Plugin SDK, local marketplace, skill distribution |
| [CHANGELOG.md](CHANGELOG.md) | Changelog |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guide |
| [SECURITY.md](SECURITY.md) | Security policy |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Code of conduct |

---

## Mirrors

Onyx is synchronized across four platforms; clone from any of them:

| Platform | URL |
| --- | --- |
| GitHub | https://github.com/X33834/onyx |
| GitHub (mirror) | https://github.com/Morningstar202604/onyx |
| Gitee | https://gitee.com/badhope/onyx |
| GitCode | https://gitcode.com/badhope/onyx |

**If you find Onyx useful, give it a Star ⭐** — it keeps us polishing every detail.

---

## Known limitations

- **Sessions are not persisted**: conversation data lives in runtime memory; after closing the page or restarting the service, past sessions keep only their titles. Persistence is planned for a future release.
- **Model quota**: model calls depend on your API key balance; insufficient balance surfaces as a clear error in the UI.

## License

Apache-2.0. Third-party notices in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

---

_Onyx — polished down to the last detail, for your own productivity._
