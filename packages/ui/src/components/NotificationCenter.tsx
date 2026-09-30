/* eslint-disable react-refresh/only-export-components -- 通知中心面板是应用级固定组件。 */
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCircle2, AlertCircle, MessageSquareText, Info, Trash2 } from "lucide-react";
import type { NotificationHistoryEntry } from "@onyx/shared";
import { usePlatform } from "@/hooks/usePlatform.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { Button } from "@/components/ui/button.js";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { formatWorkflowTimestamp } from "@/lib/workflowObservationFormat.js";

const MAX_VISIBLE_ENTRIES = 50;

function statusIcon(status: NotificationHistoryEntry["status"]) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-4 text-success" aria-hidden="true" />;
    case "failed":
      return <AlertCircle className="size-4 text-danger" aria-hidden="true" />;
    case "permission_request":
    case "elicitation_request":
      return <MessageSquareText className="size-4 text-warning" aria-hidden="true" />;
    case "feedback_update":
      return <Info className="size-4 text-info" aria-hidden="true" />;
    default:
      return <Info className="size-4 text-info" aria-hidden="true" />;
  }
}

export function NotificationCenter() {
  const { intl } = useZCodeIntl();
  const platform = usePlatform();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<readonly NotificationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!platform.queryNotificationHistory) {
      return;
    }
    setLoading(true);
    try {
      setEntries(await platform.queryNotificationHistory());
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    if (open) {
      void refresh();
    }
  }, [open, refresh]);

  const handleClear = useCallback(async () => {
    if (!platform.clearNotificationHistory) {
      return;
    }
    await platform.clearNotificationHistory();
    setEntries([]);
  }, [platform]);

  const statusLabel = (status: NotificationHistoryEntry["status"]): string => {
    switch (status) {
      case "completed":
        return intl.formatMessage({ id: "notificationCenter.statusCompleted" });
      case "failed":
        return intl.formatMessage({ id: "notificationCenter.statusFailed" });
      case "permission_request":
        return intl.formatMessage({ id: "notificationCenter.statusPermission" });
      case "elicitation_request":
        return intl.formatMessage({ id: "notificationCenter.statusElicitation" });
      case "feedback_update":
        return intl.formatMessage({ id: "notificationCenter.statusFeedback" });
    }
  };

  if (!platform.queryNotificationHistory) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={intl.formatMessage({ id: "notificationCenter.title" })}
          title={intl.formatMessage({ id: "notificationCenter.title" })}
        >
          <Bell className="size-4" aria-hidden="true" />
          {entries.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-danger" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-input-border px-3 py-2">
          <span className="text-ui-base font-medium text-foreground">
            {intl.formatMessage({ id: "notificationCenter.title" })}
          </span>
          {entries.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-ui-sm"
              onClick={() => void handleClear()}
            >
              <Trash2 className="size-3" aria-hidden="true" />
              {intl.formatMessage({ id: "notificationCenter.clear" })}
            </Button>
          ) : null}
        </div>
        <ScrollArea className="max-h-96">
          {loading && entries.length === 0 ? (
            <div className="px-3 py-6 text-center text-ui-sm text-foreground-subtle">
              {intl.formatMessage({ id: "common.loading" })}
            </div>
          ) : entries.length === 0 ? (
            <div className="px-3 py-6 text-center text-ui-sm text-foreground-subtle">
              {intl.formatMessage({ id: "notificationCenter.empty" })}
            </div>
          ) : (
            <ul className="divide-y divide-input-border">
              {entries.slice(0, MAX_VISIBLE_ENTRIES).map((entry) => (
                <li key={entry.id} className="flex gap-2 px-3 py-2">
                  <div className="mt-0.5 shrink-0">{statusIcon(entry.status)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-ui-base text-foreground">{entry.title}</span>
                      <span className="shrink-0 text-ui-sm text-foreground-subtle">
                        {formatWorkflowTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <div className="mt-0.5 line-clamp-2 break-words text-ui-sm text-foreground-subtle">
                      {entry.body}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-ui-sm text-foreground-subtle">
                      <span className="rounded bg-surface px-1.5 py-0.5">{statusLabel(entry.status)}</span>
                      {!entry.delivered ? (
                        <span className="rounded bg-surface px-1.5 py-0.5">
                          {intl.formatMessage({ id: "notificationCenter.recordedOnly" })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
