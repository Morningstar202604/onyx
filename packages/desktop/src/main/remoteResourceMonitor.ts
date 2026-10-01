import { BrowserWindow, ipcMain } from "electron";
import { PlatformChannels, type RemoteResourceSnapshotData } from "@onyx/shared";

const latestByTarget = new Map<string, { targetLabel: string; snapshot: RemoteResourceSnapshotData; receivedAt: number }>();

export interface RemoteResourceSampleMessage {
  type: string;
  targetLabel: string;
  snapshot: RemoteResourceSnapshotData;
}

/** host → main：按 target 归并最新远端资源样本（断连后自然不再更新）。 */
export function ingestRemoteResourceSample(message: RemoteResourceSampleMessage): void {
  const previous = latestByTarget.get(message.targetLabel);
  latestByTarget.set(message.targetLabel, {
    targetLabel: message.targetLabel,
    snapshot: message.snapshot,
    receivedAt: Date.now(),
  });
  // 资源管理器窗口开启时推送增量（renderer 轮询兜底，推送减少感知延迟）。
  for (const webContents of BrowserWindow.getAllWindows()
    .map((window) => window.webContents)
    .filter((webContents) => !webContents.isDestroyed())) {
    try {
      webContents.send(PlatformChannels.RemoteResourceSamplePushed, message);
    } catch {
      // 窗口在推送间隙销毁不阻塞归并。
    }
  }
  void previous;
}

export function getRemoteResourceSnapshot(
  targetLabel?: string,
): { targetLabel: string; snapshot: RemoteResourceSnapshotData; receivedAt: number } | null {
  if (targetLabel) {
    return latestByTarget.get(targetLabel) ?? null;
  }
  // 无目标参数返回最近一条（资源管理器单窗口场景）。
  let latest: { targetLabel: string; snapshot: RemoteResourceSnapshotData; receivedAt: number } | null = null;
  for (const entry of latestByTarget.values()) {
    if (!latest || entry.receivedAt > latest.receivedAt) latest = entry;
  }
  return latest;
}

export function registerRemoteResourceIpc(): void {
  ipcMain.handle(PlatformChannels.GetRemoteResourceSnapshot, (_event, targetLabel?: string) =>
    getRemoteResourceSnapshot(typeof targetLabel === "string" ? targetLabel : undefined),
  );
}

export function disposeRemoteResourceMonitor(): void {
  latestByTarget.clear();
}
