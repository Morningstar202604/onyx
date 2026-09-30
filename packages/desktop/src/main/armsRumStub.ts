/**
 * ARMS RUM no-op stub。
 *
 * Onyx 已彻底移除 @arms/rum-electron 遥测 SDK：所有上报方法均为 no-op，
 * 不初始化、不采集、不产生任何网络请求。此模块仅保留与 SDK 兼容的方法签名，
 * 使既有遥测调用点在不改动业务代码的前提下整体失效。
 */

type ArmsRumReporterRequest = (
  context: unknown,
  bundle: { events?: unknown[] },
) => unknown;

type ArmsRumReporter = { request: ArmsRumReporterRequest };

interface ArmsRumClientStub {
  useReporter: (reporter: ArmsRumReporter) => void;
}

interface ArmsRumConfigStub {
  env: string;
  properties: Record<string, unknown>;
}

export interface ArmsRumInitOptions {
  enable?: boolean;
  version?: string;
  endpoint?: string;
  env?: string;
  autoInject?: boolean;
  browserCollectors?: Record<string, unknown>;
  app?: Record<string, unknown>;
  user?: Record<string, unknown>;
  sessionConfig?: Record<string, unknown>;
  spaMode?: boolean;
  parseViewName?: (url: string) => string;
  collectors?: Record<string, unknown>;
}

const noop = (..._args: unknown[]): void => undefined;

const client: ArmsRumClientStub = {
  useReporter: noop,
};

const config: ArmsRumConfigStub = { env: "local", properties: {} };

export const armsRumStub = {
  client,
  init: (): Promise<void> => Promise.resolve(),
  sendCustom: (_payload: unknown): void => undefined,
  sendEvent: (_event: unknown): void => undefined,
  setConfig: (_key: unknown, _value?: unknown): void => undefined,
  getConfig: (): ArmsRumConfigStub => config,
};

export default armsRumStub;
