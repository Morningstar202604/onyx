# Onyx 插件开发指南

> 面向要在 Onyx 上开发插件（技能/运行时）的开发者。本文档基于 Onyx 当前源码事实整理（2026-09-30），插件生命周期 API 与发现路径以代码为准，改动时请同步核对 `packages/services/src/plugins/` 与 `apps/zcode-cli/packages/`。

## 1. 插件是什么

Onyx 插件 = **一组技能（Skills）+ 可选运行时（Runtime）**：

- **技能**：以 Markdown 形式描述能力的指令文件（`SKILL.md`），带 YAML frontmatter（`name` / `description`）。模型根据 frontmatter 在会话中路由是否使用该技能。
- **运行时**：可选。需要真实执行能力的插件（如浏览器控制、文档解析）会带独立进程/MCP server，技能文件负责触发，运行时负责执行。

官方内置插件随安装包本地 seed 分发（`apps/zcode-cli/packages/` 下以 `@onyx/*-plugin` npm 包形式存在），**没有远端插件市场**（Onyx 无服务器架构：插件市场 `source` 为空，商店不发起远端刷新）。

## 2. 技能放置路径（发现机制）

Onyx 按以下路径发现技能（沿工作区 worktree 逐级向上 + 用户级两根）：

| 作用域 | 主目录 | 兼容目录（fallback） |
| --- | --- | --- |
| 工作区 | `.onyx/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md`（仅当同层 `.onyx/skills` 无该技能时） |
| 用户级 | `~/.onyx/skills/<name>/SKILL.md` | `~/.agents/skills/<name>/SKILL.md` |
| 官方内置 | 随安装包 seed 分发 | — |

放置到上述任意目录后，设置页「技能管理」即可列出并启停；`ISkillsService` 支持 `copyToCommon`（复制到通用目录）、`removeFromCommon`、`deleteSkill`（仅 workspace/user 作用域）。

## 3. SKILL.md 规范

```markdown
---
name: <技能名（英文短横线）>
description: "<触发条件描述：何时、对什么任务使用本技能。用英文描述更利于模型路由，多语言可加中文补充。>"
---

# <技能标题>

<正文：技能的能力边界、工作流程、禁忌与降级路径。正文会被完整加载进模型上下文，务必精炼。>
```

参考官方样例：`apps/zcode-cli/packages/browser-use-plugin/skills/control-browser/SKILL.md`。

要点：
- `name` 全仓唯一（与已装插件/技能冲突会拒绝加载）。
- `description` 是路由关键：写清"何时用/何时不用"，不要空泛。
- 正文**不要**承诺不存在的运行时能力；运行时缺失时技能应写明降级路径。

## 4. 插件包结构（官方内置参考）

```
@onyx/<name>-plugin/
├── package.json          # name: @onyx/<name>-plugin, main 指向 runtime 入口
├── skills/               # 技能目录：<skill-name>/SKILL.md
├── docs/                 # 插件自带文档（SKILL.md 可引用）
├── src/                  # 运行时源码（可选；如 MCP server）
├── scripts/build.mjs     # 构建：产出 dist 供 seed 打包
└── README.md
```

官方内置插件清单（`packages/shared/src/plugin-marketplaces.ts` 的 `DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS`）：browser-use、image-search、documents、pdf、presentations、spreadsheets、node-repl-host（宿主，不露给用户）、skill-creator、plugin-creator、onyx-guide。

## 5. 插件生命周期 API

插件管理事实源在 zcode-cli 进程，经 `IPluginManagementService`（`packages/services/src/plugins/pluginManagement.ts`）暴露，UI 经设置页调用：

| API | 作用 |
| --- | --- |
| `listPlugins` / `getPluginsOverview` | 列出已装插件与概览 |
| `installPlugin` / `uninstallPlugin` / `updatePlugin` | 安装/卸载/更新 |
| `setPluginEnabled` | 启停（即时生效） |
| `validatePlugin` / `describePlugin` | 校验与描述 |
| `configurePlugin` / `resetPluginConfig` | 配置读写 |
| `restoreBuiltinPlugin` | 恢复内置插件默认状态 |
| `addPluginMarketplace` / `removePluginMarketplace` / `updatePluginMarketplace` | 市场源管理（Onyx 仅本地 seed，无远端源） |

## 6. 最小示例模板

见 `docs/onyx-plugin-template/`（本仓库内可直接照抄的骨架）：一个零运行时的纯技能插件 + 一个带 MCP 运行时的插件骨架。

## 7. 边界与已知限制

- **无远端市场**：Onyx 无服务器架构，插件全部本地分发/安装；`source` 为空的市场不会发起远端请求。
- **权限体系未落地**（P1）：当前插件按"技能 + 运行时"运行，尚无 per-plugin 权限声明/授权界面；插件可信边界 = 用户安装行为本身。
- **运行时依赖**：需要 npm 依赖的运行时插件按 npm 包构建；纯技能插件无依赖即可运行。
- **安装位置**：安装/卸载写 `~/.onyx` 插件目录（agent 进程热更新运行态），Host 不持有副本。

## 8. 快速开始（三步）

1. 复制模板：`cp -r docs/onyx-plugin-template ~/.onyx/skills/my-first-plugin`
2. 编辑 `skills/my-first-plugin/SKILL.md` 的 frontmatter 与正文
3. 在设置页「技能管理」中看到并启用；或在对话中让模型按 description 使用

> 也可用内置 **plugin-creator** 技能：设置页/对话中触发，让 Onyx 向导式生成插件骨架。
