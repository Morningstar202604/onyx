import { resolveZaiBusinessBaseUrl } from "@zcode/shared";

// 官方 Client Scenes 远端内容已移除，URL 定义一并删除；ZAI_API_HOST 仅供残留业务接口使用。
export const ZAI_API_HOST = resolveZaiBusinessBaseUrl(process.env);
