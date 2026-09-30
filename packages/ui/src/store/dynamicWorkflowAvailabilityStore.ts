import { create } from "zustand";
import type { DynamicWorkflowClientConfig } from "@onyx/shared";

// 官方订阅服务已移除：动态工作流灰度恒为关闭，不再向 Host 发请求。
// 保留只读快照契约，自动化页与 run 面板的消费方无需改动。

export type DynamicWorkflowAvailabilityStatus = "ready";

export interface DynamicWorkflowAvailabilitySnapshot {
  readonly status: DynamicWorkflowAvailabilityStatus;
  readonly enabled: boolean;
  readonly config: DynamicWorkflowClientConfig | null;
}

const SNAPSHOT: DynamicWorkflowAvailabilitySnapshot = {
  status: "ready",
  enabled: false,
  config: null,
};

export const useDynamicWorkflowAvailabilityStore = create<DynamicWorkflowAvailabilitySnapshot>(
  () => SNAPSHOT,
);
