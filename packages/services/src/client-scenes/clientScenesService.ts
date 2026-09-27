import type { ClientScenesResponse, IClientScenesService } from "./clientScenes.js";

/**
 * Client Scenes 已随官方远端内容体系一并移除：
 * 不再请求 Z.ai 业务 API（原 /api/v1/client/scenes），
 * 统一返回本地空场景，前端各消费方（自动化模板目录等）自然降级为空态。
 */
export function createClientScenesService(): IClientScenesService {
  return {
    list: async (): Promise<ClientScenesResponse> => ({
      code: 0,
      msg: "ok",
      data: [],
    }),
  };
}
