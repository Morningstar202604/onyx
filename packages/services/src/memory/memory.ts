import { ServiceChannels } from "@onyx/shared";
import { createServiceDescriptor } from "../descriptors.js";

export const PROJECT_MEMORY_PREVIEW_LIMIT_EXCEEDED_ERROR_CODE =
  "PROJECT_MEMORY_PREVIEW_LIMIT_EXCEEDED";
export const PROJECT_MEMORY_FILE_CHANGED_ERROR_CODE = "PROJECT_MEMORY_FILE_CHANGED";

export interface ProjectMemoryFileSummary {
  name: string;
  /** 已由 MemoryService 校验并限制在本地 Project Memory 根目录内的实际路径。 */
  path: string;
  kind: "index" | "item";
  size: number;
  updatedAt: number;
}

export interface ProjectMemoryWorkspaceSummary {
  id: string;
  label: string;
  updatedAt: number;
  files: ProjectMemoryFileSummary[];
}

export interface ProjectMemorySearchHit {
  workspaceId: string;
  label: string;
  fileName: string;
  path: string;
  kind: "index" | "item";
  updatedAt: number;
  /** 是否因文件名匹配（未读内容）。 */
  matchedInName: boolean;
  /** 内容命中时：命中行上下文片段。 */
  snippet?: string;
  /** 内容命中时：命中行号（1 起）。 */
  snippetLine?: number;
}

export interface ProjectMemorySearchParams {
  query: string;
  /** 限定单个 workspace；缺省搜索全部。 */
  workspaceId?: string;
  /** 最大命中数，默认 50。 */
  limit?: number;
}

export interface IMemoryService {
  /** 列出当前本地 profile 中可查看的 Project Memory。 */
  listProjectMemories(): Promise<ProjectMemoryWorkspaceSummary[]>;

  /** 全文关键词检索 Project Memory（文件名 + 内容），按命中优先级排序。 */
  searchProjectMemories(params: ProjectMemorySearchParams): Promise<ProjectMemorySearchHit[]>;

  /** 原样读取一个 Project Memory Markdown 文件。 */
  readProjectMemoryFile(params: {
    workspaceId: string;
    fileName: string;
  }): Promise<{ content: string; updatedAt: number }>;

  /** 新建或覆盖一个 Project Memory Markdown 文件（内容 ≤ 256 KiB）。 */
  writeProjectMemoryFile(params: {
    workspaceId: string;
    fileName: string;
    content: string;
  }): Promise<void>;

  /** 删除一个 Project Memory Markdown 文件（仅限项目记忆根目录内，越界拒绝）。 */
  deleteProjectMemoryFile(params: {
    workspaceId: string;
    fileName: string;
  }): Promise<void>;
}

export const IMemoryService = createServiceDescriptor<IMemoryService>(ServiceChannels.Memory);
