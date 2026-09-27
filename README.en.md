# Onyx

<div align="center">
  <img src="public/logo/icons/512x512.png" alt="Onyx" width="128" height="128" />
</div>
<p align="center">
  <strong>Your own AI coding workspace</strong>
</p>
<p align="center">
  <a href="README.md">简体中文</a> | English
</p>

> Onyx is deeply customized from ZCode: the official account, plans, subscriptions,
> and telemetry systems are fully removed. It keeps only a clean experience —
> plug in an API key and start working. No login wall, straight into the workspace.

---

## Screenshots

<div align="center">
  <img src="docs/screenshots/onyx-main.png" alt="Onyx main interface" width="90%" />
</div>

| Conversation view | Model picker |
| --- | --- |
| <img src="docs/screenshots/onyx-session.png" alt="Conversation view" width="100%" /> | <img src="docs/screenshots/onyx-models.png" alt="Model picker" width="100%" /> |

## 🎬 Demo

<div align="center">
  <img src="docs/media/onyx-demo.gif" alt="Onyx demo" width="80%" />
</div>

<p align="center">
  <a href="docs/media/onyx-test-video.mp4">▶ Watch the full demo video (15s, MP4)</a>
</p>

## What it is

Onyx is an **AI coding workspace** with both a web interface and a terminal agent:

- **Conversational agent**: describe a task; the agent thinks, inspects the repo, runs commands, and produces results;
- **Bring-your-own-model**: any OpenAI-compatible gateway works with a plain API key; switch models freely;
- **Repo-aware**: reads project structure and file contents, grounds suggestions in real code;
- **Subagents / hooks / commands**: automate repetitive workflows;
- **Memory & task archive**: preferences persist across sessions; tasks auto-archive.

## Quick start

### 1. Install dependencies

Requires Git, Node.js **24.14.0**, and pnpm **10.33.2** (see [mise.toml](mise.toml)):

```bash
pnpm bootstrap
```

`pnpm bootstrap` installs workspace dependencies, prepares local runtime assets, and builds.

### 2. Start

```bash
pnpm dev:web
```

Starts the web dev server (default `http://localhost:5173`) and the backend (default `http://localhost:3030`). Open the former in a browser.

### 3. Configure your API key

Go to **Settings → Model Providers**, add your provider and API key (any OpenAI-compatible gateway), then pick a model in the composer and start.

## Development

```bash
# Desktop (Electron)
pnpm dev:desktop

# Web (frontend + backend)
pnpm dev:web

# Quality gates
pnpm lint            # static check (target: 0 warnings)
pnpm typecheck       # full type check
```

Useful environment variables:

| Variable | Purpose |
| --- | --- |
| `ZCODE_DATA_BASE_DIR` | App data base directory (writes into `.zcode/` under it) |
| `ZCODE_SERVER_WORKSPACE` | Web backend workspace path |
| `ZCODE_BUILTIN_PROVIDER_CONFIG_FILE` | Local model-provider config file |

## Known limitations

- **Sessions are not persisted**: conversation data lives in runtime memory; after closing the page or restarting the service, past sessions keep only their titles. Persistence is planned for a future release.
- **Model quota**: model calls depend on your API key balance; insufficient balance surfaces as a clear error in the UI.

## License

Apache-2.0. Third-party notices in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

---

_Onyx — polished down to the last detail, for your own productivity._
