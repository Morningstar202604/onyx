// ============================================================
// 远端资源采样：通过 IRemoteBackend.exec 采集远端 CPU/内存/磁盘
// ============================================================
// 纯解析部分与命令构造分离，便于单测（喂模拟 stdout 验证解析）。
// 采样在连接建立后执行一次快照命令；非 Linux/macOS 平台返回 null（UI 显示"暂不支持"）。
// 说明：远端无监控常驻进程，采样为"即时快照"语义；连续监控由调用方定时采样实现。

import type { IRemoteBackend } from "./backend.js";

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

/** 返回可被 collectRemoteResourceSnapshot 解析的完整探测命令（一次 exec 多行输出）。 */
export function buildRemoteResourceProbeCommand(osName: string): string | null {
  if (osName === "linux") {
    // 行序固定：os / arch / cores / memTotal_kB / memAvailable_kB / df_root
    return [
      "printf 'os:'; uname -s",
      "printf 'arch:'; uname -m",
      "printf 'cores:'; nproc",
      "awk '/MemTotal/ {print \"memtotal:\"$2} /MemAvailable/ {print \"memavail:\"$2}' /proc/meminfo",
      "df -P / | tail -1 | awk '{print \"disk:\"$2\":\"$4}'",
    ].join("\n");
  }
  if (osName === "darwin") {
    return [
      "printf 'os:'; uname -s",
      "printf 'arch:'; uname -m",
      "printf 'cores:'; sysctl -n hw.ncpu",
      "printf 'memtotal:'$(( $(sysctl -n hw.memsize) / 1024 ))", // kB
      "printf 'disk:'; df -k / | tail -1 | awk '{print $2\":\"$4}'",
    ].join("\n");
  }
  return null;
}

/** 解析探测命令 stdout 为结构化快照；无法识别/缺行时返回 null。 */
export function parseRemoteResourceProbeOutput(
  stdout: string,
  osName: string,
): RemoteResourceSnapshot | null {
  const fields = new Map<string, string>();
  for (const line of stdout.split("\n")) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key && value) fields.set(key, value);
  }
  const os = fields.get("os");
  const arch = fields.get("arch");
  const coresText = fields.get("cores");
  const memTotalText = fields.get("memtotal");
  const diskText = fields.get("disk");
  if (!os || !arch || !coresText || !memTotalText || !diskText) return null;

  const cores = Number(coresText);
  const memTotalKb = Number(memTotalText);
  const memAvailableKb = osName === "darwin" ? undefined : Number(fields.get("memavail"));
  const diskParts = diskText.split(":");
  if (
    !Number.isFinite(cores) ||
    cores < 1 ||
    !Number.isFinite(memTotalKb) ||
    memTotalKb <= 0 ||
    diskParts.length < 2
  ) {
    return null;
  }
  const diskTotalBlocks = Number(diskParts[0]);
  const diskAvailableBlocks = Number(diskParts[1]);
  if (!Number.isFinite(diskTotalBlocks) || !Number.isFinite(diskAvailableBlocks)) return null;

  const blockSize = osName === "darwin" ? 1024 : 1024;
  const diskTotalBytes = Math.round(diskTotalBlocks * blockSize);
  const diskAvailableBytes = Math.round(diskAvailableBlocks * blockSize);
  const diskUsedBytes = Math.max(0, diskTotalBytes - diskAvailableBytes);
  const memTotalMb = Math.round(memTotalKb / 1024);
  const memAvailableMb =
    memAvailableKb === undefined ? Math.round(memTotalMb * 0.5) : Math.round(memAvailableKb / 1024);
  return {
    os,
    arch,
    cpuCores: cores,
    memTotalMb,
    memAvailableMb,
    memUsedMb: Math.max(0, memTotalMb - memAvailableMb),
    diskTotalBytes,
    diskAvailableBytes,
    diskUsedBytes,
  };
}

export interface RemoteResourceSampler {
  /** 即时采样一次；连接断开/命令失败/平台不支持返回 null。 */
  sample(): Promise<RemoteResourceSnapshot | null>;
}

export function createRemoteResourceSampler(options: {
  backend: IRemoteBackend;
  timeoutMs?: number;
}): RemoteResourceSampler {
  return {
    async sample() {
      try {
        const environment = await options.backend.detect();
        const command = buildRemoteResourceProbeCommand(environment.platform);
        if (!command) return null;
        const stream = await options.backend.exec(command);
        const chunks: Buffer[] = [];
        for await (const chunk of stream.stdout) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
          if (chunks.length > 32) break; // 防御：异常输出只取前 32KB
        }
        const stdout = Buffer.concat(chunks).toString("utf8");
        return parseRemoteResourceProbeOutput(stdout, environment.platform);
      } catch {
        return null;
      }
    },
  };
}
