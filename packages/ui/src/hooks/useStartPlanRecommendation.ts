import { useCallback } from "react";
import type { ModelSelection } from "@zcode/shared";

/** 官方 Start Plan 推荐已移除：模型选择原样通过，不再干预套餐判断。 */
export function useStartPlanRecommendation(
  _view: unknown,
  _surface?: "subagent",
): (selection: ModelSelection) => Promise<ModelSelection | null> {
  return useCallback(async (selection: ModelSelection) => selection, []);
}
