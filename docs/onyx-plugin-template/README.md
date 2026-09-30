# Onyx 插件最小模板

复制本目录到目标位置后改改即用（详见仓库根 `ONYX-插件开发指南.md`）。

放置位置（二选一）：
- 工作区：`<workspace>/.onyx/skills/my-first-plugin/`
- 用户级：`~/.onyx/skills/my-first-plugin/`

目录结构：

```
my-first-plugin/
├── skills/
│   └── my-first-plugin/
│       └── SKILL.md      # 技能定义（frontmatter + 正文）
└── README.md             # 插件说明（可选）
```

## skills/my-first-plugin/SKILL.md

```markdown
---
name: my-first-plugin
description: "Use when the user asks for <你的能力描述>。触发条件写清楚，模型据此路由。"
---

# <能力标题>

<正文：做什么、怎么做、何时不做、降级路径。>
```

要点：
- `name` 用英文短横线，全仓唯一。
- `description` 写"何时用/何时不用"，不要空泛。
- 正文精炼；不承诺不存在的运行时能力。

## 带运行时的插件（进阶）

需要执行能力的插件按 npm 包结构构建（参考官方 `@onyx/browser-use-plugin`）：

```
@onyx/my-runtime-plugin/
├── package.json      # main 指向 runtime 入口（如 dist/mcp/server.js）
├── skills/<name>/SKILL.md
├── src/              # 运行时源码（如 MCP server）
└── scripts/build.mjs
```

纯技能插件无需任何构建步骤，复制即用。
