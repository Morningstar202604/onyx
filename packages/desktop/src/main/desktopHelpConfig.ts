import { net } from "electron";
import {
  buildHelpAppConfigUrl,
  buildZCodeSourceHeadersFromContext,
  createHelpAppConfigReader,
  ONYX_ENV,
} from "@onyx/shared";

export function createDesktopHelpConfigReader(options: {
  resolveEndpointOrigin: () => Promise<string>;
  appVersion: string;
  deviceMid: string;
}) {
  const read = createHelpAppConfigReader({ fetchImpl: (input, init) => net.fetch(input, init) });
  return async () => {
    const endpointOrigin = await options.resolveEndpointOrigin();
    const url = buildHelpAppConfigUrl(
      endpointOrigin,
      options.appVersion,
      `${process.platform}-${process.arch}`,
    );
    // Onyx 未配置 endpoint：跳过远端请求，返回空帮助配置（UI 隐藏社群/反馈入口）。
    if (!url) {
      return { community_urls: {}, feedback_use_external_form: false };
    }
    return read(
      url,
      buildZCodeSourceHeadersFromContext({
        endpointOrigin,
        appVersion: options.appVersion,
        deviceMid: options.deviceMid,
        platform: process.platform,
        arch: process.arch,
        releaseChannel: ONYX_ENV,
        sourceTitle: "electron",
      }),
    );
  };
}
