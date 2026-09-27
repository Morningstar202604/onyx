/* eslint-disable max-lines -- Model Provider 详情页集中编排 API Key 表单与模型编辑；官方套餐/OAuth 区块已移除。 */
import { useEffect } from "react";
import type { ModelConnectivityResult } from "@zcode/shared";
import type { SavePersonalModelDraftInput } from "@zcode/provider";
import {
  getProviderFormApiKeyManagementUrl,
  type ProviderSettingsFormProvider,
} from "@/lib/providerSettingsFormTypes.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import type { ProviderSettingsView } from "@zcode/services";
import { useProviderSettingsView } from "@/hooks/useProviderSettingsView.js";
import type { ModelProviderNavItem } from "./constants.js";
import { InlineEditableProviderCard } from "./InlineEditableProviderCard.js";
import { ModelProviderLoadingCard, PresetProviderPlaceholderCard } from "./StatusCards.js";

export function ModelProviderSectionDetail({
  selectedNavItem,
  presetLoading,
  onSave,
  onAddPersonalModel,
  onSavePersonalModelDraft,
  onSetPersonalModelEnabled,
  onDeletePersonalModel,
  onDelete,
  onReorderProviderModels,
  onTestModel,
  onOpenApiKeyUrl,
  providerSettingsView: providerSettingsViewOverride,
}: {
  selectedNavItem: ModelProviderNavItem | null;
  presetLoading: boolean;
  onSave: (config: ProviderSettingsFormProvider) => void | Promise<void>;
  onAddPersonalModel?: (
    providerId: string,
    modelId: string,
    config: ProviderSettingsFormProvider["models"][number]["personalConfig"],
    useRecommendedConfig?: boolean,
  ) => Promise<unknown>;
  onSavePersonalModelDraft?: (input: SavePersonalModelDraftInput) => Promise<unknown>;
  onSetPersonalModelEnabled?: (
    providerId: string,
    modelId: string,
    enabled: boolean,
  ) => Promise<unknown>;
  onDeletePersonalModel?: (providerId: string, modelId: string) => Promise<unknown>;
  onDelete: (provider: ProviderSettingsFormProvider) => Promise<void>;
  onReorderProviderModels?: (providerId: string, modelIds: string[]) => Promise<void>;
  onTestModel: (providerId: string, modelId: string) => Promise<ModelConnectivityResult>;
  onOpenApiKeyUrl: (url: string) => void;
  providerSettingsView?: ProviderSettingsView | null;
}) {
  const { intl } = useZCodeIntl();
  const loadingLabel = intl.formatMessage({ id: "common.loading" });
  const selectedItemKey = selectedNavItem?.key ?? null;
  const rootProviderSettingsRead = useProviderSettingsView();
  const rootProviderSettingsView =
    rootProviderSettingsRead.state.status === "ready" ? rootProviderSettingsRead.state.view : null;
  const providerSettingsView = providerSettingsViewOverride ?? rootProviderSettingsView;
  // 所有详情共用同一套模型操作装配。
  const modelEditingProps = {
    onAddPersonalModel,
    onSavePersonalModelDraft,
    onSetPersonalModelEnabled,
    onDeletePersonalModel,
    settingsRevision: providerSettingsView?.revision,
  };

  useEffect(() => {
    // 切换选中项后重置本地编辑状态。
  }, [selectedItemKey]);

  if (!selectedNavItem) {
    // 官方预设 provider 已移除，仅剩自定义供应商。仍在加载时显示加载卡，否则显示空态引导。
    if (presetLoading) {
      return <ModelProviderLoadingCard loadingLabel={loadingLabel} />;
    }
    return (
      <p className="px-1 py-8 text-center text-ui-base text-foreground-subtle">
        {intl.formatMessage({ id: "settings.modelProvider.empty" })}
      </p>
    );
  }

  if (selectedNavItem.type === "preset") {
    if (!selectedNavItem.provider) {
      // 预置供应商配置尚未返回时明确显示 loading，避免把“还在下载”误判成未同步。
      if (presetLoading) {
        return <ModelProviderLoadingCard loadingLabel={loadingLabel} />;
      }
      return <PresetProviderPlaceholderCard displayName={selectedNavItem.displayName} />;
    }

    const presetProvider = selectedNavItem.provider;
    return (
      <InlineEditableProviderCard
        provider={presetProvider}
        onSave={onSave}
        {...modelEditingProps}
        onReorderModelIds={
          onReorderProviderModels
            ? (modelIds) => onReorderProviderModels(presetProvider.providerId, modelIds)
            : undefined
        }
        onTestModel={onTestModel}
        readOnlyEndpoints
        // 预置供应商名称承载固定 API Key 入口语义，只允许自定义供应商改名。
        nameEditable={false}
        headerVisible
        headerActionsVisible={undefined}
      />
    );
  }

  const customProvider = selectedNavItem.provider;
  const customApiKeyUrl = customProvider.templateId
    ? getProviderFormApiKeyManagementUrl(customProvider)
    : undefined;
  return (
    // 仅展示预设模板声明的入口，不根据地址猜测自定义 Provider 的 Key 控制台。
    <InlineEditableProviderCard
      provider={customProvider}
      onSave={onSave}
      {...modelEditingProps}
      onDelete={() => onDelete(customProvider)}
      onReorderModelIds={
        onReorderProviderModels
          ? (modelIds) => onReorderProviderModels(customProvider.providerId, modelIds)
          : undefined
      }
      onTestModel={onTestModel}
      presetApiKeyUrl={customApiKeyUrl}
      readOnlyEndpoints={false}
      nameEditable
      onOpenPresetApiKey={
        customApiKeyUrl
          ? () => {
              onOpenApiKeyUrl(customApiKeyUrl);
            }
          : undefined
      }
    />
  );
}
