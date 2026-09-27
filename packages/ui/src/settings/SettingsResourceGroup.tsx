import type { ReactNode } from "react";

export { SettingsResourceGroupHeader } from "@/settings/SettingsResourceGroupHeader.js";

export function SettingsResourceList<T>({
  getKey,
  items,
  renderItem,
}: {
  getKey: (item: T) => string;
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl bg-surface">
      {items.map((item, index) => (
        <div key={getKey(item)}>
          {index > 0 ? <div className="h-px bg-border/50" aria-hidden="true" /> : null}
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
