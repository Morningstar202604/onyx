// scheduler 进程内的文件变更触发（file-change automation）。
// 职责：为每个 enabled 的 file-change 自动化递归 watch workspacePath，
// 事件按 pattern 过滤 + 防抖后写 nextRunAt=now 唤醒调度（复用 claimDue 派发链路）。
// 只监听文件事件、不参与 cron 到期计算；scheduler tick 每次对账注册表。

import { watch, type FSWatcher } from "node:fs";
import type { ZCodeAutomation } from "@onyx/shared";

/** 默认忽略的目录段：避免 node_modules / .git 高频噪音，pattern 可精确匹配任意路径。 */
const IGNORED_PATH_SEGMENTS = ["node_modules", ".git", ".onyx"];

interface WatcherState {
  watcher: FSWatcher;
  timer: NodeJS.Timeout | null;
  workspacePath: string;
  pattern: string;
  debounceMs: number;
  /** 事件到达后已进入防抖窗口的自动化记录时间戳，用于日志。 */
  lastEventAt: number;
}

export interface FileChangeTriggerPort {
  /** 文件变更事件防抖到期后回调：写 nextRunAt=now 并唤醒 tick。 */
  requestDispatch(automationId: string, filePath: string): Promise<void>;
  log(level: "info" | "warn" | "error", message: string): void;
}

/** 把 glob pattern（相对 workspacePath）编译为正则；非法 pattern 返回 null。 */
export function compileGlobPattern(pattern: string): RegExp | null {
  try {
    let source = pattern.trim();
    if (source.length === 0) {
      return null;
    }
    // 去掉前导 ./ 与末尾 /。
    source = source.replace(/^\.\//, "").replace(/\/+$/, "");
    let out = "";
    let index = 0;
    while (index < source.length) {
      const char = source[index];
      if (char === "*") {
        if (source[index + 1] === "*") {
          // ** 跨目录贪婪匹配（含零个目录段）。
          out += "(?:.*)";
          index += 2;
          // ** 后紧跟 / 时允许整段可选。
          if (source[index] === "/") {
            out += "/?";
            index += 1;
          }
        } else {
          out += "[^/]*";
          index += 1;
        }
      } else if (char === "?") {
        out += "[^/]";
        index += 1;
      } else if (char === "{") {
        const close = source.indexOf("}", index + 1);
        if (close === -1) {
          return null;
        }
        const alternatives = source
          .slice(index + 1, close)
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part.length > 0);
        if (alternatives.length === 0) {
          return null;
        }
        out += `(?:${alternatives.map(escapeRegExp).join("|")})`;
        index = close + 1;
      } else if (char === "[") {
        const close = source.indexOf("]", index + 1);
        if (close === -1) {
          return null;
        }
        out += source.slice(index, close + 1);
        index = close + 1;
      } else {
        out += escapeRegExp(char);
        index += 1;
      }
    }
    return new RegExp(`^${out}$`);
  } catch {
    return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class FileChangeTriggerRegistry {
  private readonly watchers = new Map<string, WatcherState>();
  private readonly port: FileChangeTriggerPort;
  private readonly matcherCache = new Map<string, RegExp | null>();

  constructor(port: FileChangeTriggerPort) {
    this.port = port;
  }

  /** 全量对账：按当前 automations 对齐 watcher 注册表（新增/更新/移除）。 */
  sync(automations: readonly ZCodeAutomation[]): void {
    const wanted = new Map<string, ZCodeAutomation>();
    for (const automation of automations) {
      if (automation.triggerKind === "file-change" && automation.enabled) {
        wanted.set(automation.automationId, automation);
      }
    }

    // 移除已不存在的 watcher。
    for (const automationId of this.watchers.keys()) {
      if (!wanted.has(automationId)) {
        this.teardown(automationId);
      }
    }

    // 新增 / 更新。
    for (const [automationId, automation] of wanted) {
      const existing = this.watchers.get(automationId);
      const debounceMs = automation.fileChangeDebounceMs ?? 5000;
      const pattern = automation.fileChangePattern ?? "**";
      if (
        existing &&
        existing.workspacePath === automation.workspacePath &&
        existing.pattern === pattern &&
        existing.debounceMs === debounceMs
      ) {
        continue;
      }
      if (existing) {
        this.teardown(automationId);
      }
      const compiled = this.matcherCache.get(pattern);
      if (compiled === undefined) {
        const result = compileGlobPattern(pattern);
        this.matcherCache.set(pattern, result);
        if (result === null) {
          this.port.log("warn", `[file-change] invalid pattern skipped automation=${automationId} pattern=${pattern}`);
          continue;
        }
      } else if (compiled === null) {
        this.port.log("warn", `[file-change] invalid pattern skipped automation=${automationId} pattern=${pattern}`);
        continue;
      }
      this.watchOne(automation);
    }
  }

  private watchOne(automation: ZCodeAutomation): void {
    const pattern = automation.fileChangePattern ?? "**";
    const compiled = this.matcherCache.get(pattern);
    if (!compiled) {
      return;
    }
    const workspacePath = automation.workspacePath;
    let watcher: FSWatcher;
    try {
      watcher = watch(workspacePath, { recursive: true }, (_event, rawFileName) => {
        this.handleChange(automation, rawFileName?.toString() ?? "", compiled);
      });
    } catch (error) {
      this.port.log(
        "warn",
        `[file-change] watch failed automation=${automation.automationId} path=${workspacePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
    watcher.on("error", (error) => {
      this.port.log("warn", `[file-change] watcher error automation=${automation.automationId}: ${error instanceof Error ? error.message : String(error)}`);
    });
    this.watchers.set(automation.automationId, {
      watcher,
      timer: null,
      workspacePath,
      pattern,
      debounceMs: automation.fileChangeDebounceMs ?? 5000,
      lastEventAt: 0,
    });
    this.port.log("info", `[file-change] watching automation=${automation.automationId} path=${workspacePath} pattern=${pattern}`);
  }

  private handleChange(
    automation: ZCodeAutomation,
    rawFileName: string,
    compiled: RegExp,
  ): void {
    const relative = rawFileName.replace(/\\/g, "/");
    if (
      !relative ||
      IGNORED_PATH_SEGMENTS.some((segment) => relative.split("/").includes(segment)) ||
      !compiled.test(relative)
    ) {
      return;
    }
    const state = this.watchers.get(automation.automationId);
    if (!state) {
      return;
    }
    state.lastEventAt = Date.now();
    if (state.timer) {
      return;
    }
    state.timer = setTimeout(() => {
      const current = this.watchers.get(automation.automationId);
      if (current) {
        current.timer = null;
      }
      void this.port
        .requestDispatch(automation.automationId, relative)
        .catch((error) => {
          this.port.log(
            "warn",
            `[file-change] dispatch failed automation=${automation.automationId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    }, state.debounceMs);
  }

  /** 移除单个 watcher（含待触发定时器）。 */
  teardown(automationId: string): void {
    const state = this.watchers.get(automationId);
    if (!state) {
      return;
    }
    if (state.timer) {
      clearTimeout(state.timer);
    }
    state.watcher.close();
    this.watchers.delete(automationId);
  }

  /** 进程退出前清理全部 watcher。 */
  dispose(): void {
    for (const automationId of this.watchers.keys()) {
      this.teardown(automationId);
    }
    this.matcherCache.clear();
  }
}
