import { app, BrowserWindow, Notification } from "electron";
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import type { NotificationHistoryEntry, TaskNotificationPayload } from "@onyx/shared";
import { formatZodError, PlatformChannels, taskNotificationPayloadSchema } from "@onyx/shared";
import { getZCodeDataRootDir } from "@onyx/services/node";

const TASK_NOTIFICATION_DEDUPE_WINDOW_MS = 3000;
const MAX_ACTIVE_TASK_NOTIFICATIONS = 100;
const MAX_NOTIFICATION_HISTORY_ENTRIES = 200;
const recentTaskNotificationTimestamps = new Map<string, number>();
const activeTaskNotifications = new Set<Notification>();

let notificationHistory: NotificationHistoryEntry[] | null = null;

function notificationHistoryFile(): string {
  return join(getZCodeDataRootDir(), "v2", "notifications.jsonl");
}

function loadNotificationHistory(): NotificationHistoryEntry[] {
  if (notificationHistory) {
    return notificationHistory;
  }
  const file = notificationHistoryFile();
  const entries: NotificationHistoryEntry[] = [];
  try {
    if (existsSync(file)) {
      const raw = readFileSync(file, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as NotificationHistoryEntry;
          if (
            parsed &&
            typeof parsed.id === "string" &&
            typeof parsed.timestamp === "number" &&
            typeof parsed.taskId === "string" &&
            typeof parsed.title === "string" &&
            typeof parsed.body === "string" &&
            typeof parsed.delivered === "boolean"
          ) {
            entries.push(parsed);
          }
        } catch {
          // 单行损坏不影响其它条目。
        }
      }
    }
  } catch (error) {
    console.error("[notification-history] failed to load history:", error);
  }
  notificationHistory = entries;
  return entries;
}

function persistNotificationHistory(entries: NotificationHistoryEntry[]): void {
  const file = notificationHistoryFile();
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");
  } catch (error) {
    console.error("[notification-history] failed to persist history:", error);
  }
}

function appendNotificationHistory(
  entry: Omit<NotificationHistoryEntry, "id" | "timestamp">,
): void {
  const entries = loadNotificationHistory();
  const fullEntry: NotificationHistoryEntry = {
    ...entry,
    id: randomUUID(),
    timestamp: Date.now(),
  };
  entries.push(fullEntry);
  if (entries.length > MAX_NOTIFICATION_HISTORY_ENTRIES) {
    entries.splice(0, entries.length - MAX_NOTIFICATION_HISTORY_ENTRIES);
  }
  try {
    appendFileSync(notificationHistoryFile(), `${JSON.stringify(fullEntry)}\n`, "utf8");
  } catch (error) {
    console.error("[notification-history] failed to append history:", error);
  }
  // 文件增长后重写裁剪到上限（低频操作，数据量小）。
  if (entries.length >= MAX_NOTIFICATION_HISTORY_ENTRIES) {
    persistNotificationHistory(entries);
  }
}

export function listNotificationHistory(): readonly NotificationHistoryEntry[] {
  // 新到旧返回，方便 UI 直接渲染。
  return [...loadNotificationHistory()].reverse();
}

export function clearNotificationHistory(): void {
  notificationHistory = [];
  try {
    const file = notificationHistoryFile();
    if (existsSync(file)) {
      writeFileSync(file, "", "utf8");
    }
  } catch (error) {
    console.error("[notification-history] failed to clear history:", error);
  }
}

function isAnyAppWindowFocused() {
  return BrowserWindow.getAllWindows().some(
    (window) => !window.isDestroyed() && window.isFocused(),
  );
}

function shouldSuppressDuplicateTaskNotification(
  taskId: string,
  status: TaskNotificationPayload["status"],
  requestId?: string,
) {
  const now = Date.now();

  for (const [key, timestamp] of recentTaskNotificationTimestamps) {
    if (now - timestamp > TASK_NOTIFICATION_DEDUPE_WINDOW_MS) {
      recentTaskNotificationTimestamps.delete(key);
    }
  }

  // elicitation_request 和 permission_request 一样代表一次具体的人机阻塞请求。
  // 如果仍按 taskId 去重，同一任务连续 AskUserQuestion/计划确认会在 3 秒内漏掉第二条通知。
  const dedupeTarget =
    status === "permission_request" || status === "elicitation_request"
      ? requestId?.trim() || taskId
      : taskId;
  const dedupeKey = `${status}:${dedupeTarget}`;
  const lastTimestamp = recentTaskNotificationTimestamps.get(dedupeKey);
  if (lastTimestamp != null && now - lastTimestamp < TASK_NOTIFICATION_DEDUPE_WINDOW_MS) {
    return true;
  }

  recentTaskNotificationTimestamps.set(dedupeKey, now);
  return false;
}

function retainTaskNotification(notification: Notification) {
  activeTaskNotifications.add(notification);

  if (activeTaskNotifications.size <= MAX_ACTIVE_TASK_NOTIFICATIONS) {
    return;
  }

  const oldestNotification = activeTaskNotifications.values().next().value;
  if (oldestNotification) {
    activeTaskNotifications.delete(oldestNotification);
  }
}

function releaseTaskNotification(notification: Notification) {
  activeTaskNotifications.delete(notification);
}

function focusTaskNotificationWindow(senderWindow: BrowserWindow) {
  if (senderWindow.isMinimized()) {
    senderWindow.restore();
  }

  if (!senderWindow.isVisible()) {
    senderWindow.show();
  }

  // macOS 点通知时如果窗口曾被隐藏/最小化，必须先恢复窗口，再激活 app，
  // 最后聚焦 BrowserWindow；否则 app.focus 抢到前台时没有可显示窗口，后续 focus 可能被系统忽略。
  if (process.platform === "darwin") {
    app.dock?.show();
    app.show();
    app.focus({ steal: true });
  }

  senderWindow.focus();
}

export function dispatchTaskNotification(options: {
  event: IpcMainEvent | IpcMainInvokeEvent;
  payload: unknown;
  logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void };
}): boolean {
  const result = taskNotificationPayloadSchema.safeParse(options.payload);
  if (!result.success) {
    options.logger.warn("[show-task-notification] invalid payload:", formatZodError(result.error));
    return false;
  }

  if (!Notification.isSupported()) {
    options.logger.warn("[show-task-notification] notification is not supported on this platform");
    return false;
  }

  const { taskId, status, requestId, title, body } = result.data;
  const notificationTitle = title.trim();
  const notificationBody = body.trim();
  if (!notificationTitle || !notificationBody) {
    // main process 没有 renderer 当前语言上下文，不能在这里兜底生成中文通知文案。
    // 通知文案必须由 renderer 侧按 i18n 生成后传入；缺失时直接拒绝展示，避免英文界面弹出中文硬编码。
    options.logger.warn("[show-task-notification] missing localized notification copy", {
      taskId,
      status,
      hasTitle: Boolean(notificationTitle),
      hasBody: Boolean(notificationBody),
    });
    return false;
  }

  // 窗口聚焦时不弹系统通知，但进入通知中心历史，避免任务状态丢失。
  if (isAnyAppWindowFocused()) {
    appendNotificationHistory({
      taskId,
      status,
      title: notificationTitle,
      body: notificationBody,
      delivered: false,
    });
    return false;
  }

  if (shouldSuppressDuplicateTaskNotification(taskId, status, requestId)) {
    return false;
  }

  const senderWindow = BrowserWindow.fromWebContents(options.event.sender);
  const notification = new Notification({
    title: notificationTitle,
    body: notificationBody,
    silent: true,
  });

  // Electron 原生 Notification 如果只存在于函数局部变量里，系统通知仍能显示，
  // 但主进程 JS 对象可能在用户点击前被回收，导致 click listener 丢失。
  // 这里显式持有对象，等点击/关闭后释放，保证“有通知”与“点击可唤起”属于同一生命周期。
  retainTaskNotification(notification);

  notification.once("click", () => {
    releaseTaskNotification(notification);

    if (!senderWindow || senderWindow.isDestroyed()) {
      options.logger.warn("[show-task-notification] click ignored: sender window is gone", {
        taskId,
      });
      return;
    }

    focusTaskNotificationWindow(senderWindow);
    senderWindow.webContents.send(PlatformChannels.TaskNotificationClick, taskId);
    options.logger.info("[show-task-notification] notification click handled", {
      taskId,
      windowId: senderWindow.id,
    });
  });
  notification.once("close", () => {
    releaseTaskNotification(notification);
  });

  notification.show();
  appendNotificationHistory({
    taskId,
    status,
    title: notificationTitle,
    body: notificationBody,
    delivered: true,
  });
  options.event.sender.send(PlatformChannels.TaskNotificationSound);
  return true;
}
