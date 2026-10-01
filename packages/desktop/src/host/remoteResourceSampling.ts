/* eslint-disable max-lines -- 采样循环与生命周期收敛在同一模块，保持单一职责。 */
import { HostResponseTypes } from "@onyx/shared";
import type { IRemoteBackend, RemoteResourceSnapshot } from "@onyx/server/remote";

export interface RemoteResourceSamplingOptions {
  /** 已连通的远端 backend（SSH / WSL / Docker）。 */
  backend: IRemoteBackend;
  /** 脱敏后的远程目标标识，用于 main 侧按连接归并样本。 */
  targetLabel: string;
  postMessage(message: unknown): void;
  /** 采样间隔；默认 3000ms。 */
  intervalMs?: number;
  /** 单次采样超时；默认 5000ms。 */
  timeoutMs?: number;
}

export interface RemoteResourceSamplingHandle {
  /** 立即采样一次（不受定时器约束），用于首屏/手动刷新。 */
  sampleNow(): Promise<RemoteResourceSnapshot | null>;
  dispose(): void;
}

/**
 * 远端机器整体资源采样（机器级 CPU/内存/磁盘，区别于 CLI 进程树遥测）。
 * backend.exec 跑一次性探测命令（nproc + /proc/meminfo + df），解析后经
 * postMessage 上报 main；断连/平台不支持/命令失败时静默跳过（返回 null），
 * 不打断采样循环。连接释放时 dispose 收口定时器。
 */
export function createRemoteResourceSampling(
  options: RemoteResourceSamplingOptions,
): RemoteResourceSamplingHandle {
  const intervalMs = options.intervalMs ?? 3_000;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const { backend, postMessage, targetLabel } = options;
  let timer: ReturnType<typeof setInterval> | undefined;
  let disposed = false;

  const sampleAndReport = async (): Promise<RemoteResourceSnapshot | null> => {
    if (disposed) return null;
    try {
      // 延迟 import，避免 host 常驻进程在本地模式下加载 ssh2 依赖链。
      const { createRemoteResourceSampler } = await import("@onyx/server/remote");
      const sampler = createRemoteResourceSampler({ backend, timeoutMs });
      const snapshot = await sampler.sample();
      if (snapshot && !disposed) {
        postMessage({
          type: HostResponseTypes.RemoteResourceSample,
          targetLabel,
          snapshot,
        });
      }
      return snapshot;
    } catch {
      return null;
    }
  };

  timer = setInterval(() => {
    void sampleAndReport();
  }, intervalMs);

  return {
    sampleNow: sampleAndReport,
    dispose: () => {
      disposed = true;
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    },
  };
}
