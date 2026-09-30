// ============================================================
// 并发与配额（协议层 P1）：每供应商并发上限 + FIFO 请求队列
// ============================================================
// 独立于网络栈的轻量信号量：acquire 排队、release 放行，支持全局默认上限
// 与按供应商覆盖；队首等待超过 queueTimeoutMs 的请求被拒绝（配额保护），
// 由调用方按业务错误处理。无 OOM 风险：排队只持有 Promise，不缓冲请求体。

export interface ConcurrencyLimiterStats {
  active: number;
  queued: number;
  total: number;
  rejected: number;
}

export interface ConcurrencyLimiter {
  /** 排队等待一个并发槽位；超时返回 null。 */
  acquire(timeoutMs?: number): Promise<() => void>;
  stats(): ConcurrencyLimiterStats;
}

export interface ConcurrencyLimiterOptions {
  /** 同 provider 同时进行中的最大请求数。 */
  maxConcurrent: number;
  /** 队首默认等待上限（毫秒）；acquire 未显式传参时使用。 */
  queueTimeoutMs?: number;
}

interface Waiter {
  resolve: (release: () => void) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout> | null;
}

export function createConcurrencyLimiter(options: ConcurrencyLimiterOptions): ConcurrencyLimiter {
  if (!Number.isInteger(options.maxConcurrent) || options.maxConcurrent < 1) {
    throw new Error("maxConcurrent 必须是 >= 1 的整数");
  }
  const queueTimeoutMs = options.queueTimeoutMs ?? 30_000;
  let active = 0;
  let total = 0;
  let rejected = 0;
  const waiters: Waiter[] = [];

  const release = (): void => {
    active -= 1;
    const next = waiters.shift();
    if (next) {
      if (next.timeout) clearTimeout(next.timeout);
      active += 1;
      next.resolve(() => release());
    }
  };

  return {
    acquire(timeoutMs = queueTimeoutMs): Promise<() => void> {
      total += 1;
      if (active < options.maxConcurrent) {
        active += 1;
        return Promise.resolve(() => release());
      }
      return new Promise<() => void>((resolve, reject) => {
        const waiter: Waiter = {
          resolve,
          reject,
          timeout: null,
        };
        waiter.timeout = setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          rejected += 1;
          reject(new Error(`并发配额排队超时（${timeoutMs}ms）：provider 忙`));
        }, timeoutMs);
        waiters.push(waiter);
      });
    },
    stats() {
      return { active, queued: waiters.length, total, rejected };
    },
  };
}

/** 按 providerId 分发的并发门：每个 provider 独立限流器，共享统计接口。 */
export interface ProviderConcurrencyGate {
  acquire(providerId: string, timeoutMs?: number): Promise<() => void>;
  stats(providerId?: string): ConcurrencyLimiterStats;
}

export interface ProviderConcurrencyGateOptions {
  defaultMax?: number;
  perProvider?: Record<string, number>;
  queueTimeoutMs?: number;
}

export function createProviderConcurrencyGate(
  options: ProviderConcurrencyGateOptions = {},
): ProviderConcurrencyGate {
  const defaultMax = options.defaultMax ?? 8;
  const limiters = new Map<string, ConcurrencyLimiter>();
  const perProvider = options.perProvider ?? {};
  const queueTimeoutMs = options.queueTimeoutMs ?? 30_000;

  const limiterFor = (providerId: string): ConcurrencyLimiter => {
    let limiter = limiters.get(providerId);
    if (!limiter) {
      limiter = createConcurrencyLimiter({
        maxConcurrent: perProvider[providerId] ?? defaultMax,
        queueTimeoutMs,
      });
      limiters.set(providerId, limiter);
    }
    return limiter;
  };

  return {
    acquire(providerId, timeoutMs) {
      return limiterFor(providerId).acquire(timeoutMs);
    },
    stats(providerId) {
      if (providerId !== undefined) return limiterFor(providerId).stats();
      const merged: ConcurrencyLimiterStats = { active: 0, queued: 0, total: 0, rejected: 0 };
      for (const limiter of limiters.values()) {
        const s = limiter.stats();
        merged.active += s.active;
        merged.queued += s.queued;
        merged.total += s.total;
        merged.rejected += s.rejected;
      }
      return merged;
    },
  };
}

/** 便捷包装：acquire → 执行 fn → release；超时/排队拒绝时原样抛错。 */
export async function withConcurrencyLimit<T>(
  limiter: ConcurrencyLimiter,
  fn: () => Promise<T>,
  timeoutMs?: number,
): Promise<T> {
  const release = await limiter.acquire(timeoutMs);
  try {
    return await fn();
  } finally {
    release();
  }
}
