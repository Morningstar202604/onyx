import type { ZCodeAutomationUpdateParams } from "@onyx/shared";

/**
 * file-change 触发参数校验：pattern 必须非空，debounce 限定 500–60000ms。
 * 仅当 triggerKind=file-change 时生效；time 触发忽略（保留透传字段不校验）。
 */
export function assertValidFileChangeTriggerParams(
  params: ZCodeAutomationUpdateParams,
): void {
  if (params.triggerKind !== "file-change") {
    return;
  }
  if (
    params.fileChangePattern !== undefined &&
    params.fileChangePattern.trim().length === 0
  ) {
    throw new Error("file-change 触发需要非空的文件匹配 pattern");
  }
  if (
    params.fileChangeDebounceMs !== undefined &&
    (!Number.isInteger(params.fileChangeDebounceMs) ||
      params.fileChangeDebounceMs < 500 ||
      params.fileChangeDebounceMs > 60_000)
  ) {
    throw new Error("file-change 防抖窗口必须是 500-60000ms 的整数");
  }
}
