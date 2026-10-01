# 贡献指南 / Contributing to Onyx

感谢你愿意参与 Onyx 的开发！无论提交代码、提 Issue、完善文档还是反馈使用体验，都欢迎。

Thanks for your interest in contributing to Onyx! Code, issues, docs, and usage feedback are all welcome.

---

## 快速开始 / Quick start

```bash
# 安装依赖并构建（一条命令）
pnpm bootstrap

# 质量门禁（提交前必须通过）
pnpm lint          # 0 warnings 0 errors
pnpm typecheck     # 0 errors
```

提交前请先跑 `pnpm lint` 与 `pnpm typecheck`，两者全绿再提交。

Run `pnpm lint` and `pnpm typecheck` before every commit — both must pass.

## 开发规范 / Development conventions

- **包管理**：仅用 pnpm workspace（Node.js 24.14.0，见 `mise.toml`）；
- **类型安全**：所有代码必须通过 `pnpm typecheck`，禁止 `any` 泄漏；
- **静态检查**：lint 目标为 0 warnings 0 errors，新代码不得引入 warning；
- **提交信息**：用中文或英文均可，遵循 `type(scope): summary` 格式（如 `feat(protocol): ...`、`fix(remote): ...`、`docs(website): ...`）；
- **测试**：新增能力建议在 `.e2e-tmp/` 提供可复跑冒烟脚本（不提交含密钥内容）；
- **不引入上游依赖**：Onyx 是无服务器项目，任何新能力不得依赖官方服务器 / 云服务 / 遥测链路；内置供应商一律协议化，地址与密钥由用户自填。

- **Package management**: pnpm workspace only (Node.js 24.14.0, see `mise.toml`);
- **Type safety**: everything must pass `pnpm typecheck`; no `any` leaks;
- **Lint**: 0 warnings / 0 errors is the target; new code must not add warnings;
- **Commit messages**: Chinese or English, `type(scope): summary` format (e.g. `feat(protocol): ...`);
- **Testing**: add reproducible smoke scripts under `.e2e-tmp/` (never commit secrets);
- **No upstream dependencies**: Onyx is serverless — no official servers, cloud services, or telemetry; built-in providers are protocol-based, endpoints and keys come from the user.

## 提 Issue / Reporting issues

- 描述环境（OS / Node 版本）、复现步骤、期望与实际行为；
- 若涉及模型供应商，说明端点类型（OpenAI 兼容 / 本地端点 / 国产模型）即可，**不要**在 Issue 中贴出你的 API Key；
- 安全漏洞请走 [SECURITY.md](SECURITY.md) 流程，不要公开细节。

- Describe environment (OS / Node version), steps to reproduce, expected vs actual behavior;
- Mention provider type (OpenAI-compatible / local endpoint / Chinese LLM) — **never** paste your API key in an issue;
- For security vulnerabilities, follow [SECURITY.md](SECURITY.md); do not disclose details publicly.

## 提 PR / Submitting PRs

1. Fork 并创建分支（如 `feat/xxx`、`fix/xxx`）；
2. 改动聚焦单一问题，保持提交可读；
3. 本地通过 `pnpm lint` + `pnpm typecheck`；
4. 在 PR 描述中说明改动动机与验证方式（含冒烟结果）；
5. 维护者 review 后合并。

1. Fork and branch (e.g. `feat/xxx`, `fix/xxx`);
2. Keep each PR focused on one problem;
3. Pass `pnpm lint` + `pnpm typecheck` locally;
4. Describe motivation and how you verified (include smoke results);
5. Maintainers review and merge.

## 行为准则 / Code of conduct

参见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) / See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Contributions are licensed under Apache-2.0 (see [LICENSE](LICENSE)). 贡献默认按 Apache-2.0 授权。
