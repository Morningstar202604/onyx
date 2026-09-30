import { useEffect } from "react";
import type { AppSettings } from "@onyx/shared";
import { useServices } from "@/hooks/useServices.js";
import { useOffPeakTaskStore } from "@/store/offPeakTaskStore.js";

/** 两个闲时入口共享初始化/连接/Registry 通知边界，不在组件中另存资格。 */
export function useOffPeakEligibility(
  settings: AppSettings | null | undefined,
  registryRevision: number | undefined,
): void {
  const { offPeakTaskService } = useServices();
  const initialize = useOffPeakTaskStore((state) => state.initialize);
  const refresh = useOffPeakTaskStore((state) => state.refreshCodingPlanSupport);
  // 官方 providerFamilyDomain 账号体系已移除：不再按账号家庭域计算资格，
  // 仅以 Registry 版本变化作为失效信号触发一次本地支持性检查。
  const freshnessKey = settings ? String(registryRevision ?? 0) : undefined;

  useEffect(() => {
    void initialize({ offPeakTaskService });
  }, [initialize, offPeakTaskService]);

  useEffect(() => {
    if (freshnessKey === undefined) return;
    // Settings 变化只是失效信号；ProviderSettings View revision 来自 Registry 已完成发布。
    // 相同 key 的双入口通知由 Store 去重。
    void refresh(offPeakTaskService, freshnessKey);
  }, [freshnessKey, offPeakTaskService, refresh]);
}
