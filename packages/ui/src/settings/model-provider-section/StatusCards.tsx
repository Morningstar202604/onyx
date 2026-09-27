import { useZCodeIntl } from "@/i18n/IntlProvider.js";

export function ModelProviderLoadingCard({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-border bg-surface-raised px-4 py-6 text-center">
      <span className="text-ui-base text-foreground-subtle">{loadingLabel}</span>
    </div>
  );
}

export function PresetProviderPlaceholderCard({ displayName }: { displayName: string }) {
  const { intl } = useZCodeIntl();
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-6 text-center">
      <span className="text-ui-base font-medium text-foreground">{displayName}</span>
      <span className="text-ui-sm text-foreground-subtle">
        {intl.formatMessage({ id: "settings.modelProvider.placeholder" })}
      </span>
    </div>
  );
}
