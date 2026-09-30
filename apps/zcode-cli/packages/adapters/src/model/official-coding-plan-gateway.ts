import { resolveRuntimeZCodeEndpointOrigin } from "@onyx/shared";
import type { EnvRecord } from "./model-execution.js";

/**
 * 官方 Coding Plan 的模型请求经 ZCode 平台网关发送。
 *
 * Onyx 已移除 Z.ai / BigModel 官方订阅套餐：不内置任何官方模型端点，
 * 网关包装函数保留为透明透传（不重写任何请求），用户自建 provider 与第三方模型服务不受影响。
 */
export interface OfficialCodingPlanGatewayRoute {
  /** 官方模型端点（含路径），仅 https。 */
  readonly providerEndpoint: string;
  /** 对应的网关端点路径，相对 ZCode 平台 origin。 */
  readonly gatewayPath: string;
}

export const OFFICIAL_CODING_PLAN_GATEWAY_ROUTES: readonly OfficialCodingPlanGatewayRoute[] = [];

export interface OfficialCodingPlanGatewayDecision {
  /** 是否命中官方端点并改为经网关发送。 */
  readonly viaGateway: boolean;
  /** 实际发送的 URL；未命中时与入参一致。 */
  readonly url: string;
}

export type OfficialCodingPlanGatewayFetch = typeof globalThis.fetch;

const ROOT_PATH = "/";
const HOST_HEADER = "host";
const HTTPS_DEFAULT_PORT = "443";

const GATEWAY_PATH_BY_PROVIDER_ENDPOINT: ReadonlyMap<string, string> = new Map(
  OFFICIAL_CODING_PLAN_GATEWAY_ROUTES.map((route) => [
    endpointKey(new URL(route.providerEndpoint)),
    route.gatewayPath,
  ]),
);

export function resolveOfficialCodingPlanGatewayUrl(
  requestUrl: string,
  env: EnvRecord = process.env,
): OfficialCodingPlanGatewayDecision {
  const parsed = parseHttpsUrl(requestUrl);
  if (!parsed) {
    return { viaGateway: false, url: requestUrl };
  }
  const gatewayPath = GATEWAY_PATH_BY_PROVIDER_ENDPOINT.get(endpointKey(parsed));
  if (!gatewayPath) {
    return { viaGateway: false, url: requestUrl };
  }
  const gatewayUrl = new URL(gatewayPath, resolveRuntimeZCodeEndpointOrigin(env));
  gatewayUrl.search = parsed.search;
  return { viaGateway: true, url: gatewayUrl.href };
}

/**
 * 包装模型 provider 的 fetch：命中官方端点时发往网关端点，其余请求原样交给下层 fetch。
 * 应放在用户 HTTP 代理 fetch 之前，使 httpProxy / noProxy 规则按实际发送的网关地址判定。
 */
export function createOfficialCodingPlanGatewayFetch(options: {
  env?: EnvRecord;
  fetch: OfficialCodingPlanGatewayFetch;
}): OfficialCodingPlanGatewayFetch {
  return async (input, init) => {
    const requestUrl = readRequestUrl(input);
    if (!requestUrl) {
      return await options.fetch(input, init);
    }
    const decision = resolveOfficialCodingPlanGatewayUrl(requestUrl, options.env);
    if (!decision.viaGateway) {
      return await options.fetch(input, init);
    }
    // 显式 Host 头会指向官方模型端点的主机，改为经网关发送后由 fetch 按实际 URL 重新计算。
    const gatewayInput = withUrl(input, decision.url);
    if (gatewayInput instanceof Request) {
      gatewayInput.headers.delete(HOST_HEADER);
    }
    return await options.fetch(gatewayInput, withoutHostHeader(init));
  };
}

function withoutHostHeader(
  init: Parameters<OfficialCodingPlanGatewayFetch>[1],
): Parameters<OfficialCodingPlanGatewayFetch>[1] {
  if (!init?.headers) {
    return init;
  }
  const headers = new Headers(init.headers);
  if (!headers.has(HOST_HEADER)) {
    return init;
  }
  headers.delete(HOST_HEADER);
  return { ...init, headers };
}

function readRequestUrl(input: Parameters<OfficialCodingPlanGatewayFetch>[0]): string | undefined {
  try {
    if (input instanceof Request) {
      return input.url;
    }
    if (input instanceof URL) {
      return input.href;
    }
    return new URL(String(input)).href;
  } catch {
    return undefined;
  }
}

function withUrl(
  input: Parameters<OfficialCodingPlanGatewayFetch>[0],
  url: string,
): Parameters<OfficialCodingPlanGatewayFetch>[0] {
  if (input instanceof Request) {
    return new Request(url, input);
  }
  if (input instanceof URL) {
    return new URL(url);
  }
  return url;
}

function parseHttpsUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function endpointKey(url: URL): string {
  const effectivePort = url.port || HTTPS_DEFAULT_PORT;
  return `${url.protocol}//${url.hostname.toLowerCase()}:${effectivePort}${normalizedPath(url.pathname)}`;
}

function normalizedPath(pathname: string): string {
  if (pathname === ROOT_PATH) {
    return ROOT_PATH;
  }
  return pathname.replace(/\/+$/u, "") || ROOT_PATH;
}
