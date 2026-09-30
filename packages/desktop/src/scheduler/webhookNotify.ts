import { deliverAutomationRunToWebhook } from "@onyx/services/node";
import type { ZCodeAutomation } from "@onyx/shared";

/**
 * 结果投递（Webhook，可选）：automation 配置了 webhookUrl 时，运行结束（成功/失败）
 * 后 POST 摘要。异步 fire-and-forget——投递失败只记日志，不阻塞/重试调度结算。
 */
export async function notifyWebhookRunResult(
  automation: ZCodeAutomation | null | undefined,
  runId: string,
  ok: boolean,
  log: (level: "warn", message: string) => void,
  sessionId?: string | null,
  error?: string,
): Promise<void> {
  if (!automation?.webhookUrl) return;
  const result = await deliverAutomationRunToWebhook(automation.webhookUrl, {
    event: "automation.run.completed",
    automationId: automation.automationId,
    title: automation.title,
    runId,
    ok,
    sessionId,
    error,
    ts: Date.now(),
  });
  if (!result.ok) {
    log("warn", `[webhook] 投递失败 automation=${automation.automationId} ${result.error ?? "unknown"}`);
  }
}
