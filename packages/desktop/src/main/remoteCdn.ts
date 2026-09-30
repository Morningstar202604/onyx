import { ONYX_VERSION, type ZCodeEnv } from "@onyx/shared";

declare const __ONYX_CDN_BASE_URL__: string | undefined;
// Onyx 无官方 CDN：默认不配置远程资源下载源，由调用方回退到本地 bundled 资源。
const DEFAULT_CDN_BASE_URL = "";

export interface ResolveRemoteCdnOptions {
  env?: ZCodeEnv;
  locale?: string;
  timeZone?: string;
  overrideBaseUrl?: string;
  version?: string;
  now?: Date;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("CDN URL must use http or https");
  return value.replace(/\/+$/, "");
}

export function resolveRemoteCdnBaseUrls(options: ResolveRemoteCdnOptions = {}): string[] {
  const override = options.overrideBaseUrl?.trim();
  if (override) return [normalizeBaseUrl(override)];
  const baseUrl =
    process.env.ONYX_CDN_BASE_URL?.trim() ||
    (typeof __ONYX_CDN_BASE_URL__ === "undefined" ? "" : __ONYX_CDN_BASE_URL__) ||
    DEFAULT_CDN_BASE_URL;
  // Onyx 未配置 CDN：返回空列表，调用方应跳过远程资源下载，回退本地 bundled 资源。
  if (!baseUrl) return [];
  return [
    `${normalizeBaseUrl(baseUrl)}/zcode/electron/releases/${options.version ?? ONYX_VERSION}`,
  ];
}
