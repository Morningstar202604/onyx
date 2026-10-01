import { createRoot } from "react-dom/client";
import type { ResourceUsageSnapshot, StorageManagementBridge } from "@onyx/shared";
import "@onyx/ui/styles.css";
import {
  ResourceManagerApp,
  ZCodeIntlProvider,
  applyUiFontSizePx,
  loadUiFontSizePx,
  subscribeToUiFontSizeStorageChanges,
} from "@onyx/ui";
import type { RemoteResourceSnapshot } from "@onyx/ui";

declare global {
  interface Window {
    resourceManager?: {
      getSnapshot: () => Promise<ResourceUsageSnapshot>;
      getRemoteSnapshot: () => Promise<RemoteResourceSnapshot | null>;
      onRemoteResourceSample: (
        listener: (snapshot: RemoteResourceSnapshot | null) => void,
      ) => () => void;
      setSamplingActive: (active: boolean) => void;
      storage?: StorageManagementBridge;
    };
  }
}

type Theme = "light" | "dark" | "zai-light" | "zai-dark" | "system";

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme === "dark" || theme === "zai-dark" ? "dark" : "light";
}

function applyResourceManagerTheme(): void {
  const savedTheme = (localStorage.getItem("zcode-theme") as Theme | null) ?? "zai-dark";
  const resolvedTheme = resolveTheme(savedTheme);
  const appliedTheme =
    savedTheme === "system"
      ? resolvedTheme === "dark"
        ? "zai-dark"
        : "zai-light"
      : savedTheme === "dark"
        ? "zai-dark"
        : savedTheme === "light"
          ? "zai-light"
          : savedTheme;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.classList.toggle("theme-zai-light", appliedTheme === "zai-light");
  document.documentElement.classList.toggle("theme-zai-dark", appliedTheme === "zai-dark");
}

applyResourceManagerTheme();
// 资源管理器不创建主窗口的 Zustand store，text-ui-* 无法自动获得持久化基准。
// 首屏前显式应用，运行中再由 storage 事件同步，且不改变 html font-size 或接入业务 Host。
applyUiFontSizePx(loadUiFontSizePx());
subscribeToUiFontSizeStorageChanges();

const root = document.getElementById("root");
if (root) {
  const rm = window.resourceManager;
  const rootElement = createRoot(root);
  let currentRemote: RemoteResourceSnapshot | null = null;
  const render = () => {
    rootElement.render(
      // 语言沿用主窗口写入 localStorage 的偏好；不接 settingService，避免独立窗口再起一份 RPC。
      <ZCodeIntlProvider>
        <ResourceManagerApp
          setSamplingActive={rm?.setSamplingActive}
          getSnapshot={rm ? () => rm.getSnapshot() : undefined}
          remoteSnapshot={currentRemote}
          remoteTargetLabel={currentRemote ? "remote" : undefined}
          storage={rm?.storage}
        />
      </ZCodeIntlProvider>,
    );
  };
  // 推送优先（main 每轮样本即推），轮询兜底由 main IPC 查询承担。
  const unsubscribe = rm?.onRemoteResourceSample((snapshot) => {
    currentRemote = snapshot;
    render();
  });
  window.addEventListener("beforeunload", () => unsubscribe?.(), { once: true });
  void rm?.getRemoteSnapshot().then((snapshot) => {
    currentRemote = snapshot;
    render();
  });
  render();
}
