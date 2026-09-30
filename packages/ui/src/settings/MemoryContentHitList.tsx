import { Fragment, useEffect, useState } from "react";
import type { ProjectMemorySearchHit } from "@onyx/services";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { formatMemoryUpdatedAt } from "@/settings/memoryUpdatedAt.js";

/** 记忆全文检索的内容命中面板：文件名 + 命中行号 + 上下文片段 + 更新时间。 */
export function MemoryContentHitList({ hits }: { hits: ProjectMemorySearchHit[] }) {
  const { intl, locale } = useZCodeIntl();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  if (hits.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-2">
        <h4 className="text-ui-sm font-medium text-foreground">
          {intl.formatMessage(
            { id: "settings.memory.viewer.contentHits" },
            { count: hits.length },
          )}
        </h4>
      </div>
      {hits.map((hit, index) => (
        <Fragment key={`${hit.fileName}-${hit.snippetLine ?? 0}`}>
          {index > 0 ? <div className="h-px bg-border/50" aria-hidden="true" /> : null}
          <div className="flex min-w-0 items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ui-sm font-medium text-foreground">
                {hit.fileName}
                <span className="ml-2 text-ui-xs text-foreground-subtle">
                  {hit.label}
                  {hit.snippetLine
                    ? ` · ${intl.formatMessage(
                        { id: "settings.memory.viewer.contentHitLine" },
                        { line: hit.snippetLine },
                      )}`
                    : null}
                </span>
              </span>
              {hit.snippet ? (
                <span className="mt-0.5 block truncate text-ui-sm text-foreground-subtle">
                  {hit.snippet}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-ui-sm text-foreground-subtle">
              {formatMemoryUpdatedAt({
                formatMessage: intl.formatMessage,
                locale,
                now,
                updatedAt: hit.updatedAt,
              })}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
