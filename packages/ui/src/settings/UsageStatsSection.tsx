import { AppUsagePanel } from "@/settings/usage-stats/AppUsagePanel.js";

export type UsageStatsSectionTab = "app";

export function UsageStatsSection({
  activeTab,
  providerSourcesLoading,
  workspaceIdentity,
  workspacePath,
}: {
  activeTab: UsageStatsSectionTab;
  providerSourcesLoading: boolean;
  workspaceIdentity?: string;
  workspacePath?: string;
}) {
  void providerSourcesLoading;
  void workspaceIdentity;
  void workspacePath;
  void activeTab;
  return <AppUsagePanel />;
}
