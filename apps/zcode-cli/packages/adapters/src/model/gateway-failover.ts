// ============================================================
// Gateway failover：逻辑供应商多网关故障切换
// ============================================================
// 主网关（ProviderApiConfig.baseUrl / gateways[0]）失败时按顺序尝试备用网关。
// 切换条件：网络错误（fetch reject / TLS）与可重试的 HTTP 状态（429 / >=500）。
// 4xx 业务错误（400/401/403 等）不切换——换网关不会修复配置/语义错误。
// 重放说明：LLM 请求为 POST，切换会重发请求体；429/5xx 表示服务端未成功处理，
// 网络错误表示请求未送达，这两类重放风险可控。此行为在 UI 配置处向用户说明。

import type { ProviderFallbackGateway } from "@onyx/provider";

type ProviderFetch = typeof globalThis.fetch;

const AUTHORIZATION_HEADER_NAME = "Authorization";
const X_API_KEY_HEADER_NAME = "x-api-key";

export interface GatewayFailoverOptions {
  /** 主网关 baseURL（AI SDK factory 指向它，与 gateways[0] 同源）。 */
  baseURL: string;
  /** 备用网关列表；为空时不做 failover，原样透传。 */
  gateways: readonly ProviderFallbackGateway[];
  /** 底层 fetch（已含代理、业务错误包装等）。 */
  fetch: ProviderFetch;
  /** 可选并发门（每供应商并发上限 + 队列）；提供时每次请求先 acquire 再发出。 */
  concurrencyGate?: {
    acquire(timeoutMs?: number): Promise<() => void>;
  };
}

export function createGatewayFailoverFetch(options: GatewayFailoverOptions): ProviderFetch {
  const fallbackGateways = options.gateways ?? [];
  if (fallbackGateways.length === 0) {
    return options.fetch;
  }

  // 主网关不在 fallbackGateways 列表中：构造 [主网关, ...备用] 完整切换序列。
  // 循环 currentIndex=0 为主（透传原 URL），1..n 为备用（重写 URL 与鉴权）。
  // 若备用与主地址同源视为重复配置，运行时切换无效但不破坏请求。
  const allGateways = [
    { baseUrl: options.baseURL },
    ...fallbackGateways,
  ] satisfies readonly ProviderFallbackGateway[];

  return async (input, init) => {
    const release =
      options.concurrencyGate === undefined ? undefined : await options.concurrencyGate.acquire();
    try {
      return await runFailover(input, init, options.fetch, allGateways);
    } finally {
      release?.();
    }
  };
}

interface ReplayableRequest {
  input: string | URL;
  init: RequestInit;
}

/**
 * 把输入规范化成可重放请求：Request 实例在进入切换循环前读一次 body
 * （ArrayBuffer），避免主网关网络失败后 Request.bodyUsed 变为 true 导致
 * 备用网关无法重放请求体。读取失败/已消费时返回 undefined（原样透传）。
 */
async function toReplayableRequest(
  input: Parameters<ProviderFetch>[0],
  init: Parameters<ProviderFetch>[1] | undefined,
): Promise<ReplayableRequest | undefined> {
  if (typeof Request !== "undefined" && input instanceof Request) {
    if (input.bodyUsed) return undefined;
    const body = await input.arrayBuffer();
    return {
      input: input.url,
      init: {
        body,
        cache: input.cache,
        credentials: input.credentials,
        headers: headerEntriesToObject(input.headers),
        integrity: input.integrity,
        keepalive: input.keepalive,
        method: input.method,
        mode: input.mode,
        redirect: input.redirect,
        referrer: input.referrer,
        signal: input.signal,
      },
    };
  }
  return { input: input as string | URL, init: { ...init } };
}

async function runFailover(
  input: Parameters<ProviderFetch>[0],
  init: Parameters<ProviderFetch>[1] | undefined,
  fetchImpl: ProviderFetch,
  allGateways: readonly ProviderFallbackGateway[],
): Promise<Response> {
  // 先规范化成可重放形式（Request body 预读为 ArrayBuffer）。
  const replay = await toReplayableRequest(input, init);
  if (!replay) {
    // Request 已消费等无法重放场景：原样透传，保持单网关语义。
    return fetchImpl(input, init);
  }

  let currentIndex = 0;
  // 记录每次尝试的失败：最后一次响应/错误在全部网关失败后抛出，
  // 保持与单网关一致的错误语义（调用方依赖分类器识别）。
  let lastResponse: Response | undefined;
  let lastError: unknown;

  for (;;) {
    const gateway = allGateways[currentIndex];
    const isPrimaryAttempt = currentIndex === 0;
    const rewritten = isPrimaryAttempt ? replay : rewriteReplay(replay, gateway);
    if (!rewritten) {
      // 备用网关 URL 无法解析：透传原始失败。
      if (lastError !== undefined) throw lastError;
      if (lastResponse !== undefined) return lastResponse;
      return fetchImpl(input, init);
    }

    try {
      const response = await fetchImpl(rewritten.input, rewritten.init);
      if (response.ok || !isSwitchableHttpStatus(response.status)) {
        return response;
      }
      lastResponse = response;
      await consumeBodyBestEffort(response);
    } catch (error) {
      if (!isSwitchableNetworkError(error)) {
        throw error;
      }
      lastError = error;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= allGateways.length) {
      if (lastError !== undefined) throw lastError;
      if (lastResponse !== undefined) return lastResponse;
      return fetchImpl(input, init);
    }
    currentIndex = nextIndex;
  }
}

function rewriteReplay(
  replay: ReplayableRequest,
  gateway: ProviderFallbackGateway,
): ReplayableRequest | undefined {
  const targetOrigin = safeOrigin(gateway.baseUrl);
  if (!targetOrigin) {
    return undefined;
  }

  const url = toUrl(replay.input);
  if (!url) {
    return undefined;
  }
  const rewrittenUrl = new URL(url.toString());
  const target = new URL(targetOrigin);
  // URL.host setter 会保留原端口（Node 行为），端口残留会把备用网关打成错误端口；
  // 显式重写 protocol + hostname 并清空 port 才能完整覆盖 origin。
  rewrittenUrl.protocol = target.protocol;
  rewrittenUrl.hostname = target.hostname;
  rewrittenUrl.port = target.port;

  const headers = mergeHeaders(replay.init.headers, gateway);
  return {
    input: rewrittenUrl.toString(),
    init: {
      ...replay.init,
      headers,
    },
  };
}

function headerEntriesToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function toUrl(input: RequestInfo | URL): URL | undefined {
  if (input instanceof URL) {
    return input;
  }
  try {
    return new URL(String(input));
  } catch {
    return undefined;
  }
}

function safeOrigin(baseUrl: string): string | undefined {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return undefined;
  }
}

function mergeHeaders(
  source: HeadersInit | undefined,
  gateway: ProviderFallbackGateway,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (source instanceof Headers) {
    source.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(source)) {
    for (const [key, value] of source) {
      result[key] = value;
    }
  } else if (source) {
    Object.assign(result, source);
  }
  applyGatewayAuth(result, gateway);
  return result;
}

function applyGatewayAuth(headers: Record<string, string>, gateway: ProviderFallbackGateway): void {
  if (gateway.headers) {
    for (const [key, value] of Object.entries(gateway.headers)) {
      headers[key] = value;
    }
  }
  if (gateway.apiKey) {
    headers[AUTHORIZATION_HEADER_NAME] = `Bearer ${gateway.apiKey}`;
    headers[X_API_KEY_HEADER_NAME] = gateway.apiKey;
  }
}

function isSwitchableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function isSwitchableNetworkError(error: unknown): boolean {
  // ProviderBusinessError 携带 responseStatus：429/5xx 视为可切换（带业务码的限流/服务端故障）。
  const record = asRecord(error);
  if (record?.isProviderBusinessError === true) {
    const responseStatus = record.responseStatus;
    return typeof responseStatus === "number" && isSwitchableHttpStatus(responseStatus);
  }
  // 其余异常（fetch reject、TLS、超时等）在网络层可切换。
  return true;
}

async function consumeBodyBestEffort(response: Response): Promise<void> {
  try {
    await response.arrayBuffer();
  } catch {
    // 释放连接失败不阻塞 failover。
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
