import { getDefaultConfigPath, updateUiLocaleInFileConfig } from "@zcode/adapters/config";
import type { SessionEvent } from "@zcode/contracts";
import type { ZCodeAppOptions } from "@zcode/bootstrap";
import { DEFAULT_LOCALE, type SupportedLocale } from "@zcode/i18n";
import type { TuiRequestPermission } from "@zcode/tui";
import type { GlobalOptions } from "@zcode/shared-types";
import { createCommandCenter, parseSlashCommand } from "./command-center.js";
import type { CommandCenterApp } from "./command-center.js";
import { resolveDisplayLocale } from "./locale.js";
import { createCliHeadlessBrowserRuntime } from "./headless-browser.js";
// 复用防御式 runtime 读取：subscribeEvents 不在 app 的静态类型面上，
// 两处各写一份「怎么把它读出来」就会在方法改名时只修好一处。
import { readRuntimeEventSubscriber } from "./runtime-event-subscriber.js";
import { createTuiSessionEventRelay } from "./tui-session-event-relay.js";
import { attachTuiAppQueries, readTuiSessionMetadata } from "./tui-prompt-handler-queries.js";
