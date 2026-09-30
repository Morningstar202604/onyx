import { isApiKeyAccess, type ProviderApiType, type ProviderFallbackGateway } from "@onyx/provider";
import {
  getProviderFormLabel,
  type ProviderSettingsFormProvider,
} from "@/lib/providerSettingsFormTypes.js";

export interface ProviderDraftValues {
  nameValue: string;
  apiFormat: ProviderApiType;
  baseUrlValue: string;
  apiKeyValue: string;
  fallbackGateways: ProviderFallbackGateway[];
}

/** 保存前清理：剔除空 baseUrl 的占位行；空数组不落库（等同未配置）。 */
export function normalizeFallbackGateways(
  gateways: readonly ProviderFallbackGateway[] | null | undefined,
): ProviderFallbackGateway[] | undefined {
  const cleaned = (gateways ?? [])
    .filter((gateway) => gateway.baseUrl.trim().length > 0)
    .map((gateway) => ({
      baseUrl: gateway.baseUrl.trim(),
      ...(gateway.apiKey?.trim() ? { apiKey: gateway.apiKey.trim() } : {}),
    }));
  return cleaned.length === 0 ? undefined : cleaned;
}

function fallbackGatewaysEqual(
  left: readonly ProviderFallbackGateway[] | null | undefined,
  right: readonly ProviderFallbackGateway[] | null | undefined,
): boolean {
  const normalizedLeft = normalizeFallbackGateways(left) ?? [];
  const normalizedRight = normalizeFallbackGateways(right) ?? [];
  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every((gateway, index) => {
    const other = normalizedRight[index]!;
    return gateway.baseUrl === other.baseUrl && gateway.apiKey === other.apiKey;
  });
}

function normalizeConfiguredBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, "");
  if (!normalized) return "";

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return normalized;
    const marker = `${parsed.protocol}//${parsed.host}`;
    const duplicateIndex = normalized.indexOf(marker, marker.length);
    if (duplicateIndex < 0) return normalized;
    const firstUrl = normalized.slice(0, duplicateIndex).replace(/\/+$/, "");
    const secondUrl = normalized.slice(duplicateIndex).replace(/\/+$/, "");
    // 旧设置页曾把完整 Base URL 再作为 path 拼接；仅折叠两段完全相同的安全形态。
    return firstUrl === secondUrl ? firstUrl : normalized;
  } catch {
    return normalized;
  }
}

export function resolvePendingProviderDraftSave({
  provider,
  draft,
  readOnlyEndpoints,
  nameConfirmed = false,
}: {
  provider: ProviderSettingsFormProvider;
  draft: ProviderDraftValues;
  readOnlyEndpoints?: boolean;
  nameConfirmed?: boolean;
  now: () => number;
}): ProviderSettingsFormProvider | null {
  const label = draft.nameValue.trim();
  const baseURL = normalizeConfiguredBaseUrl(draft.baseUrlValue);
  // ID 和默认协议只用于空配置的表单展示，不是用户覆盖；脏检查与表单初始化必须同源。
  // 名称只在 Enter/失焦确认；连接的闲时保存、测试和卸载不能夹带未确认的名称。
  const labelChanged = nameConfirmed && label !== getProviderFormLabel(provider);
  const typeChanged =
    !readOnlyEndpoints && draft.apiFormat !== (provider.config.api?.type ?? "anthropic-messages");
  const urlChanged = !readOnlyEndpoints && baseURL !== (provider.config.api?.baseUrl ?? "");
  const keyChanged =
    isApiKeyAccess(provider.config.access) &&
    draft.apiKeyValue !== (provider.config.access.apiKey ?? "");
  const gatewaysChanged =
    !readOnlyEndpoints &&
    !fallbackGatewaysEqual(draft.fallbackGateways, provider.config.api?.fallbackGateways);
  if (!labelChanged && !typeChanged && !urlChanged && !keyChanged && !gatewaysChanged) return null;

  // 表单只拥有名称、连接类型、地址和 Key；重建整个 api 会删除隐藏 headers，
  // 保存 Effective 对象又会把继承字段物化。分别在各自基线上只应用修改过的叶子。
  const apiChanges = {
    ...(typeChanged || (urlChanged && !provider.config.api?.type) ? { type: draft.apiFormat } : {}),
    ...(urlChanged ? { baseUrl: baseURL || undefined } : {}),
    ...(gatewaysChanged ? { fallbackGateways: normalizeFallbackGateways(draft.fallbackGateways) } : {}),
  };
  const api =
    typeChanged || urlChanged || gatewaysChanged
      ? { ...provider.config.api, ...apiChanges }
      : provider.config.api;
  const access =
    keyChanged && isApiKeyAccess(provider.config.access)
      ? { ...provider.config.access, apiKey: draft.apiKeyValue }
      : provider.config.access;
  const config = {
    ...provider.config,
    access,
    api,
  };

  const personalConfig = {
    ...provider.personalConfig,
    ...(keyChanged && isApiKeyAccess(provider.config.access)
      ? {
          access: {
            ...provider.personalConfig.access,
            type: provider.config.access.type,
            apiKey: draft.apiKeyValue,
          },
        }
      : {}),
    ...(typeChanged || urlChanged || gatewaysChanged
      ? { api: { ...provider.personalConfig.api, ...apiChanges } }
      : {}),
  };

  if (!labelChanged && JSON.stringify(config) === JSON.stringify(provider.config)) {
    return null;
  }
  return {
    ...provider,
    ...(labelChanged ? { providerName: label || null, providerNameUpdate: label || null } : {}),
    config,
    personalConfig,
  };
}
