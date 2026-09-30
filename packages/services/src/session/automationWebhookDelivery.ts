/**
 * 自动化结果投递：Webhook 渠道（P1）。
 * 用户为 automation 配置可选 webhookUrl 后，每次运行结束（成功/失败）由 scheduler
 * 回调本模块 POST 一份运行摘要。本地直连、无官方服务器；失败仅记日志不重试（避免
 * 对用户端点的风暴式重放）。
 */

/** 可选字段校验：undefined/null/空串视为"未配置"，放行。 */
export function isValidWebhookUrl(url: string | null | undefined): boolean {
  if (url === undefined || url === null || url === "") {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** 写库前领域层校验；非法时抛错拒绝持久化，不依赖 UI 兜底。 */
export function assertValidWebhookUrl(url: string | null | undefined): void {
  if (!isValidWebhookUrl(url)) {
    throw new Error("webhook URL 必须是 http(s) 地址");
  }
}

export interface WebhookDeliveryPayload {
  event: "automation.run.completed";
  automationId: string;
  title: string;
  runId: string;
  ok: boolean;
  sessionId?: string | null;
  error?: string;
  ts: number;
}

export interface WebhookDeliveryResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/** 投递运行摘要；10s 超时，非 2xx 视为失败。 */
export async function deliverAutomationRunToWebhook(
  webhookUrl: string,
  payload: WebhookDeliveryPayload,
): Promise<WebhookDeliveryResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return {
        ok: response.ok,
        status: response.status,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
