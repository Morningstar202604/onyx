# 安全政策 / Security Policy

## 支持的版本 / Supported versions

| 版本 / Version | 支持状态 / Supported |
| --- | --- |
| 1.2.x（最新 / latest） | ✅ 受支持 / supported |
| 1.1.x | ✅ 受支持 / supported（仅安全修复 / security fixes only） |
| 1.0.x | ❌ 不再支持 / end of support |

## 报告漏洞 / Reporting a vulnerability

**请勿在公开渠道（Issue / 讨论区）披露安全漏洞细节。**

**Please do not disclose vulnerability details in public channels (issues / discussions).**

请通过以下任一方式私下报告（report privately via any of）：

1. 仓库维护者邮箱 / maintainer e-mail：在仓库 About 页面查看（view the "About" section of the repo）；
2. GitHub Security Advisory（若仓库已启用 / if enabled on the repository）。

报告时请包含 / Please include:

- 漏洞类型与影响（如 RCE / XSS / 信息泄露 / 注入等）与严重程度评估；
- 复现步骤（最小示例）；
- 受影响的版本范围；
- 如已有修复建议，一并附上。

- Vulnerability type, impact (RCE / XSS / information disclosure / injection, etc.) and severity;
- Steps to reproduce (minimal example);
- Affected version range;
- A suggested fix, if you have one.

## 处理流程 / Handling process

1. 确认收到并评估：5 个工作日内回复 / We acknowledge within 5 business days;
2. 修复与测试：在修复就绪后发布安全更新，并记入 [CHANGELOG.md](CHANGELOG.md) / We ship a fix and record it in the changelog;
3. 披露：修复发布后再公开，保障用户有足够升级时间 / We disclose after the fix is out, so users have time to upgrade.

## 安全设计原则 / Security design principles

Onyx 本身奉行最小暴露：无官方服务器、不上传数据、不遥测、内置供应商协议化（地址与密钥用户自填）。你提交的代码也应遵循：

Onyx is minimal-exposure by design: no official servers, no uploads, no telemetry, protocol-based built-in providers. Your contributions should follow:

- 不在代码/文档/Issue 中硬编码任何密钥（never hardcode any credential in code, docs, or issues）；
- 不引入新的网络外发链路（no new outbound telemetry / phone-home paths）；
- 处理用户输入（提示词、文件、远端命令）时做好边界校验（validate boundaries when handling user input: prompts, files, remote commands）。
