import { ModelSelectionFacade, type ProviderRegistryFacadeSource } from "@onyx/provider";
import { resolveLegacyReasoningLevel } from "./legacy-reasoning-level.js";

/** Host 与受管理 Worker 共用身份分类；官方账号分类已移除，全部视为普通供应商。 */
export function createNodeModelSelectionFacade(
  source: ProviderRegistryFacadeSource,
): ModelSelectionFacade {
  return new ModelSelectionFacade(
    source,
    (_providerId) => "ordinary" as const,
    resolveLegacyReasoningLevel,
  );
}
