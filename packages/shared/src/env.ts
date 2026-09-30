import type { ZCodeRuntimeEnv } from "./runtimeEnv.js";

// 品牌迁移垫片：Onyx 接管后运行时环境变量统一为 ONYX_*。为不破坏既有部署与用户配置，
// 模块加载时把遗留的 ZCODE_* 值迁移到同名 ONYX_*（仅当新名尚未设置时）。
const LEGACY_ENV_PREFIX = "ZCODE_";
const BRANDED_ENV_PREFIX = "ONYX_";
function migrateLegacyZcodeEnv(env: NodeJS.ProcessEnv | undefined): void {
  if (!env) {
    return;
  }
  for (const key of Object.keys(env)) {
    if (!key.startsWith(LEGACY_ENV_PREFIX)) {
      continue;
    }
    const brandedKey = `${BRANDED_ENV_PREFIX}${key.slice(LEGACY_ENV_PREFIX.length)}`;
    if (!(brandedKey in env) && env[key] !== undefined) {
      env[brandedKey] = env[key];
    }
  }
}
if (typeof process !== "undefined") {
  migrateLegacyZcodeEnv(process.env);
}

export type ZCodeEnv = "test" | "production";
/** 安装包身份：决定应用名、app id、Electron 数据目录与更新策略；与后端环境 `ZCodeEnv` 是两个轴。 */
export type ZCodeProductFlavor = "production" | "preview";
export type ArmsRumEnv = "local" | "prod";

// 非构建环境（如 e2e 测试的 mocha）下 define 不存在，用 typeof 检查 + fallback 避免 ReferenceError
declare const __ONYX_ENV__: string;
declare const __ONYX_PRODUCT_FLAVOR__: string;

export function normalizeZCodeEnv(value: string | undefined): ZCodeEnv {
  return value?.trim().toLowerCase() === "production" ? "production" : "test";
}

export const ONYX_ENV = normalizeZCodeEnv(
  typeof __ONYX_ENV__ !== "undefined" ? __ONYX_ENV__ : undefined,
);

/**
 * 身份缺省跟随后端环境（test → preview，production → production）。
 * 桌面构建通过 `ONYX_PREVIEW_IDENTITY=1` 显式注入 preview，得到连接生产后端的 Preview 包；
 * 未注入 define 的 bundle（web、CLI、测试）沿用旧的单轴语义。
 */
export function normalizeZCodeProductFlavor(
  value: string | undefined,
  zcodeEnv: ZCodeEnv,
): ZCodeProductFlavor {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "production" || normalized === "preview") {
    return normalized;
  }
  return zcodeEnv === "production" ? "production" : "preview";
}

export const ONYX_PRODUCT_FLAVOR = normalizeZCodeProductFlavor(
  typeof __ONYX_PRODUCT_FLAVOR__ !== "undefined" ? __ONYX_PRODUCT_FLAVOR__ : undefined,
  ONYX_ENV,
);
export const ONYX_APP_VERSION_ENV = "ONYX_APP_VERSION" as const;
export const ONYX_BUILD_COMMIT_ID_ENV = "ONYX_BUILD_COMMIT_ID" as const;

// ── 运行时环境变量（不经过编译打包，启动时从 process.env 读取） ──
// 启用调试模式，值为 inspect-brk 的端口号，如 ONYX_DEBUG=9230
export const RUNTIME_ONYX_DEBUG =
  typeof process !== "undefined" ? process.env.ONYX_DEBUG : undefined;

// 遥测默认关闭：本项目已移除官方账号体系，默认不上报任何数据。
// 如需开启，显式设置环境变量 ONYX_TELEMETRY_ENABLED=true 或 1。
export const ONYX_TELEMETRY_ENABLED: boolean =
  typeof process !== "undefined"
    ? process.env.ONYX_TELEMETRY_ENABLED === "true" || process.env.ONYX_TELEMETRY_ENABLED === "1"
    : false;

/** 数仓事件上报端点：由运行时环境变量提供，未配置即停用，构建产物不内嵌。 */
export const ONYX_TELEMETRY_REPORT_ENDPOINT =
  typeof process !== "undefined" ? (process.env.ONYX_TELEMETRY_REPORT_ENDPOINT ?? "") : "";

/** ARMS RUM 接入端点：由运行时环境变量提供，未配置即停用，构建产物不内嵌。 */
export const ONYX_ARMS_RUM_ENDPOINT =
  typeof process !== "undefined" ? (process.env.ONYX_ARMS_RUM_ENDPOINT ?? "") : "";

/** 将本地运行态与编译期 ONYX_ENV 映射为 ARMS 控制台识别的上报环境标签 */
export function mapZCodeEnvToArmsRumEnv(runtimeEnv: ZCodeRuntimeEnv): ArmsRumEnv {
  return runtimeEnv !== "development" && ONYX_ENV === "production" ? "prod" : "local";
}
