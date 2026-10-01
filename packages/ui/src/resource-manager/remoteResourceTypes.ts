/**
 * 远端机器整体资源样本（与 packages/server/src/remote/remoteResourceSampler.ts
 * 的 RemoteResourceSnapshot 同构；UI 不依赖 server 运行时，本地声明避免跨层 import）。
 */
export interface RemoteResourceSnapshot {
  os: string;
  arch: string;
  /** 逻辑 CPU 核数。 */
  cpuCores: number;
  memTotalMb: number;
  memAvailableMb: number;
  memUsedMb: number;
  /** 根分区磁盘（字节）。 */
  diskTotalBytes: number;
  diskAvailableBytes: number;
  diskUsedBytes: number;
}
