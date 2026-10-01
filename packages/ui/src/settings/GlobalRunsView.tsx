import { useEffect } from "react";
import type { IZCodeAgentService } from "@onyx/services";
import type { ZCodeAutomationRunOutcome } from "@onyx/shared";
import { useZCodeIntl } from "@/i18n/index.js";
import { Button } from "@/components/ui/button.js";
import { useAutomationManagementStore } from "@/store/automationManagementStore.js";
import { formatDateTime } from "./automationFormat.js";
import { cn } from "@/components/lib/utils.js";

interface GlobalRunsViewProps {
  agentService: IZCodeAgentService;
}

const OUTCOME_ORDER: ZCodeAutomationRunOutcome[] = ["running", "succeeded", "failed", "stopped"];

function statusKey(outcome: ZCodeAutomationRunOutcome | undefined): string {
  return outcome && OUTCOME_ORDER.includes(outcome) ? outcome : "running";
}

/**
 * 跨 workspace 全局运行监控：聚合所有工作区的自动化运行，按创建时间倒序。
 * 数据来自 automation_runs 单库（workspace_key 列聚合），不依赖远端服务。
 */
export function GlobalRunsView({ agentService }: GlobalRunsViewProps) {
  const { intl } = useZCodeIntl();
  const globalRuns = useAutomationManagementStore((state) => state.globalRuns);
  const loadGlobalRuns = useAutomationManagementStore((state) => state.loadGlobalRuns);

  useEffect(() => {
    void loadGlobalRuns(agentService);
  }, [agentService, loadGlobalRuns]);

  const runs = globalRuns.runs ?? [];

  return (
    <div className="flex flex-col gap-3" data-testid="global-runs-view">
      <div className="flex items-center justify-between">
        <p className="text-ui-base leading-5 text-foreground-subtlest">
          {intl.formatMessage({ id: "automations.runs.global.description" })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={globalRuns.status === "loading"}
          onClick={() => void loadGlobalRuns(agentService, true)}
        >
          {globalRuns.status === "loading"
            ? intl.formatMessage({ id: "automations.refreshing" })
            : intl.formatMessage({ id: "automations.refresh" })}
        </Button>
      </div>

      {globalRuns.status === "error" ? (
        <div className="rounded-lg border border-border bg-background p-4 text-ui-base text-foreground-subtle">
          {globalRuns.error}
        </div>
      ) : null}

      {runs.length === 0 && globalRuns.status !== "loading" ? (
        <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center text-ui-base text-foreground-subtle">
          {intl.formatMessage({ id: "automations.runs.empty" })}
        </div>
      ) : null}

      {runs.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <table className="w-full text-left text-ui-sm">
            <thead className="border-b border-border bg-background-alt text-ui-xs uppercase tracking-wide text-foreground-subtle">
              <tr>
                <th className="px-3 py-2 font-medium">{intl.formatMessage({ id: "automations.runs.col.triggered" })}</th>
                <th className="px-3 py-2 font-medium">{intl.formatMessage({ id: "automations.runs.col.trigger" })}</th>
                <th className="px-3 py-2 font-medium">{intl.formatMessage({ id: "automations.runs.col.status" })}</th>
                <th className="px-3 py-2 font-medium">{intl.formatMessage({ id: "automations.runs.col.workspace" })}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.runId} className="border-b border-border/60 last:border-b-0 hover:bg-hover">
                  <td className="px-3 py-2 text-foreground-subtle">
                    {formatDateTime(run.scheduledAt ?? run.createdAt)}
                  </td>
                  <td className="px-3 py-2">{run.trigger}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-ui-xs font-medium",
                        run.outcome === "failed"
                          ? "bg-red-500/10 text-red-600"
                          : run.outcome === "succeeded"
                            ? "bg-green-500/10 text-green-600"
                            : run.outcome === "stopped"
                              ? "bg-gray-500/10 text-foreground-subtle"
                              : "bg-blue-500/10 text-blue-600",
                      )}
                    >
                      {intl.formatMessage({ id: `automations.runs.status.${statusKey(run.outcome)}` })}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-ui-xs text-foreground-subtle">
                    {run.workspaceKey}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
