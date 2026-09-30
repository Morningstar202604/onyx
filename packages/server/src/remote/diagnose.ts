// ============================================================
// 远程连接诊断：分步检测目标环境，定位连接失败环节
// ============================================================
// 步骤：环境探测（detect）→ 命令执行连通性 → 可选的网络出站探测。
// 每步返回 ok/detail；诊断不建立完整 RPC 会话，失败不影响已有连接。

import type { RemoteTarget } from "@onyx/shared";
import type { IRemoteBackend } from "./backend.js";
import { createRemoteBackend } from "./create-backend.js";

export interface RemoteDiagnosticStep {
  name: string;
  ok: boolean;
  detail: string;
  durationMs: number;
}

export interface RemoteDiagnosticResult {
  ok: boolean;
  targetKind: RemoteTarget["kind"];
  steps: readonly RemoteDiagnosticStep[];
}

const DIAGNOSE_EXEC_TIMEOUT_MS = 10_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`超时（${timeoutMs}ms）`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runStep(
  name: string,
  run: () => Promise<string>,
): Promise<RemoteDiagnosticStep> {
  const startedAt = Date.now();
  try {
    const detail = await run();
    return { name, ok: true, detail, durationMs: Date.now() - startedAt };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    };
  }
}

/** 对目标做分步诊断；backend 可注入（测试用），缺省按 target 创建并在结束时释放。 */
export async function diagnoseRemoteConnection(
  target: RemoteTarget,
  options?: { backend?: IRemoteBackend },
): Promise<RemoteDiagnosticResult> {
  let ownedBackend: IRemoteBackend | undefined;
  const backend = options?.backend ?? (ownedBackend = await createRemoteBackend(target));

  const steps: RemoteDiagnosticStep[] = [];
  try {
    steps.push(
      await runStep("环境探测", async () => {
        const env = await withTimeout(backend.detect(), DIAGNOSE_EXEC_TIMEOUT_MS);
        return `平台=${env.platform} 架构=${env.arch}`;
      }),
    );

    const connectionProbe = steps.at(-1)!;
    if (connectionProbe.ok) {
      steps.push(
        await runStep("命令执行连通性", async () => {
          const stream = await withTimeout(
            backend.exec('printf "onyx-diagnose-ok"'),
            DIAGNOSE_EXEC_TIMEOUT_MS,
          );
          const output = await withTimeout(readAllStdout(stream), DIAGNOSE_EXEC_TIMEOUT_MS);
          const trimmed = output.trim();
          if (trimmed.includes("onyx-diagnose-ok")) {
            return "远端命令可执行，通道正常";
          }
          return `远端有输出但未识别（${trimmed.slice(0, 80) || "空"}）`;
        }),
      );
    }
  } finally {
    if (ownedBackend) {
      try {
        await ownedBackend.dispose();
      } catch {
        // 诊断收尾失败不影响结果。
      }
    }
  }

  return {
    ok: steps.every((step) => step.ok),
    targetKind: target.kind,
    steps,
  };
}

function readAllStdout(stream: {
  stdout: NodeJS.ReadableStream;
  onClose(callback: (code: number) => void): { dispose(): void };
}): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };
    stream.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    stream.stdout.on("error", (error) => {
      finish(() => reject(error));
    });
    stream.onClose(() => {
      finish(() => resolve(output));
    });
  });
}
