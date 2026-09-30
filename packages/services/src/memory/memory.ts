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

export interface IMemoryService {
  /** 列出当前本地 profile 中可查看的 Project Memory。 */
  listProjectMemories(): Promise<ProjectMemoryWorkspaceSummary[]>;

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
