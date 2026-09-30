// scheduler 进程内的 Git 引用变更触发（git-event automation）。
// 监听工作区 .git 的 refs/heads 与 HEAD、packed-refs：任何 commit/push 都会更新引用，
// 防抖到期后把对应 automation 的 next_run_at 写为 now 唤醒调度（复用 file-change 派发路径）。
import { existsSync } from "node:fs";
import { watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import type { ZCodeAutomation } from "@onyx/shared";

const GIT_DIR = ".git";
/** git-event 与 file-change 各自独立防抖计时器，避免跨类型干扰。 */
interface GitEventWatcherState {
  timer: ReturnType<typeof setTimeout> | null;
  pendingFile: string | null;
}

export class GitEventTriggerRegistry {
  private readonly watchers = new Map<string, GitEventWatcherState>();
  private readonly fsWatchers = new Map<string, FSWatcher>();

  constructor(
    private readonly options: {
      requestDispatch: (automationId: string, filePath: string) => Promise<void>;
      log: (level: "info" | "warn", message: string) => void;
    },
  ) {}

  /** 全量对账：新增/更新 watcher，移除已不存在的。 */
  async sync(automations: Array<Pick<ZCodeAutomation, "automationId" | "enabled" | "workspacePath" | "fileChangeDebounceMs" | "triggerKind">>): Promise<void> {
    const wanted = new Map<string, Pick<ZCodeAutomation, "automationId" | "enabled" | "workspacePath" | "fileChangeDebounceMs" | "triggerKind">>();
    for (const automation of automations) {
      if (automation.triggerKind !== "git-event" || !automation.enabled) continue;
      wanted.set(automation.automationId, automation);
    }
    for (const automationId of this.watchers.keys()) {
      if (!wanted.has(automationId)) this.teardown(automationId);
    }
    for (const [automationId, automation] of wanted) {
      const existing = this.watchers.get(automationId);
      if (!existing) {
        this.watch(automationId, automation);
      } else if (automation.fileChangeDebounceMs !== undefined) {
        // 防抖变化只影响后续计时，无需重建 watcher。
        this.watchers.set(automationId, existing);
      }
    }
  }

  private watch(
    automationId: string,
    automation: Pick<ZCodeAutomation, "automationId" | "workspacePath" | "fileChangeDebounceMs">,
  ): void {
    const gitDir = join(automation.workspacePath, GIT_DIR);
    if (!existsSync(gitDir)) {
      this.options.log("warn", `[git-event] ${automationId} 无 .git 目录，跳过监听 path=${automation.workspacePath}`);
      return;
    }
    this.watchers.set(automationId, { timer: null, pendingFile: null });
    const debounceMs = automation.fileChangeDebounceMs ?? 5000;

    const arm = (filePath: string): void => {
      const state = this.watchers.get(automationId);
      if (!state) return;
      state.pendingFile = filePath;
      if (state.timer) clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        const current = this.watchers.get(automationId);
        if (!current || !current.pendingFile) return;
        const path = current.pendingFile;
        current.pendingFile = null;
        current.timer = null;
        this.options.log("info", `[git-event] dispatch automation=${automationId} ref=${path}`);
        void this.options.requestDispatch(automationId, path).catch(() => {});
      }, debounceMs);
    };

    const targets = [join(gitDir, "refs", "heads"), join(gitDir, "HEAD"), join(gitDir, "packed-refs")];
    const watchTargets = targets.filter((target) => existsSync(target));
    for (const target of watchTargets) {
      let watcher: FSWatcher;
      try {
        watcher = watch(target, { recursive: target.endsWith("heads") }, () => arm(target));
      } catch (error) {
        this.options.log("warn", `[git-event] ${automationId} 监听失败 target=${target} ${String(error)}`);
        continue;
      }
      this.fsWatchers.set(`${automationId}:${target}`, watcher);
    }
    this.options.log(
      "info",
      `[git-event] watching automation=${automationId} path=${gitDir} targets=${watchTargets.length} debounce=${debounceMs}ms`,
    );
  }

  private teardown(automationId: string): void {
    const state = this.watchers.get(automationId);
    if (state?.timer) clearTimeout(state.timer);
    this.watchers.delete(automationId);
    for (const key of this.fsWatchers.keys()) {
      if (key.startsWith(`${automationId}:`)) {
        const watcher = this.fsWatchers.get(key);
        watcher?.close();
        this.fsWatchers.delete(key);
      }
    }
  }

  dispose(): void {
    for (const automationId of this.watchers.keys()) this.teardown(automationId);
    this.watchers.clear();
  }
}
