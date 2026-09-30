import {
  type IMemoryService,
  type ProjectMemoryFileSummary,
  type ProjectMemorySearchHit,
  type ProjectMemoryWorkspaceSummary,
} from "./memory.js";
import { lstat, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { readProjectMemoryFileFromStableHandle } from "#src/memory/projectMemoryStableRead.js";
import { getZCodeDataRootDir } from "#src/paths.js";
import { mergeMemoryText } from "#src/memory/memoryMerge.js";

const PROJECT_MEMORY_INDEX_FILE_NAME = "MEMORY.md";
const PROJECT_MEMORY_DIRECTORY_NAME = "memory";
const PROJECT_KEY_SUFFIX_PATTERN = /^(.*)-[a-f0-9]{16}$/i;

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function getProjectMemoriesRoot(): string {
  return join(getZCodeDataRootDir(), "cli", "memories", "projects");
}

function isValidPathSegment(value: string): boolean {
  return (
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    basename(value) === value &&
    !value.includes("/") &&
    !value.includes("\\")
  );
}

function isProjectMemoryFileName(fileName: string): boolean {
  return (
    fileName === PROJECT_MEMORY_INDEX_FILE_NAME ||
    (fileName.endsWith(".md") && fileName !== PROJECT_MEMORY_INDEX_FILE_NAME)
  );
}

function resolveWorkspaceLabel(workspaceId: string): string {
  const slug = PROJECT_KEY_SUFFIX_PATTERN.exec(workspaceId)?.[1];
  return slug?.trim() || workspaceId;
}

async function isPlainDirectory(path: string): Promise<boolean> {
  try {
    const metadata = await lstat(path);
    return metadata.isDirectory() && !metadata.isSymbolicLink();
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

async function requirePlainDirectory(path: string): Promise<void> {
  const metadata = await lstat(path);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`Project Memory directory is not a regular directory: ${path}`);
  }
}

async function requireProjectMemoriesRoot(): Promise<string> {
  const projectsRoot = getProjectMemoriesRoot();
  // 只校验 workspace 子目录时，projectsRoot symlink 会让 list/read 跟随到本地数据目录外。
  await requirePlainDirectory(projectsRoot);
  return projectsRoot;
}

async function requireExactProjectMemoryFile(
  memoryRoot: string,
  fileName: string,
): Promise<string> {
  const memoryEntries = await readdir(memoryRoot, { withFileTypes: true });
  const fileEntry = memoryEntries.find((entry) => entry.name === fileName);
  const requestedFilePath = join(memoryRoot, fileName);
  if (!fileEntry) {
    // 文件确实不存在时继续透传原始 ENOENT；只有大小写别名能命中时才拒绝读取。
    await lstat(requestedFilePath);
    throw new Error(`Project Memory file name does not match exactly: ${fileName}`);
  }
  if (!fileEntry.isFile() || fileEntry.isSymbolicLink()) {
    throw new Error(`Project Memory file is not a regular file: ${fileName}`);
  }
  return requestedFilePath;
}

async function assertContainedProjectMemoryPath(
  projectsRoot: string,
  targetPath: string,
): Promise<void> {
  const projectsRootRealPath = await realpath(projectsRoot);
  const targetRealPath = await realpath(targetPath);
  const relativePath = relative(projectsRootRealPath, targetRealPath);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`Project Memory path is outside the local profile: ${targetPath}`);
  }
}

function compareProjectMemoryFiles(
  left: ProjectMemoryFileSummary,
  right: ProjectMemoryFileSummary,
): number {
  if (left.kind !== right.kind) {
    return left.kind === "index" ? -1 : 1;
  }
  return left.name.localeCompare(right.name, "en");
}

export function createMemoryService(): IMemoryService {
  async function listProjectMemories(): Promise<ProjectMemoryWorkspaceSummary[]> {
    let projectsRoot: string;
    let projectEntries;
    try {
      projectsRoot = await requireProjectMemoriesRoot();
      projectEntries = await readdir(projectsRoot, { withFileTypes: true });
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }

    const workspaces: ProjectMemoryWorkspaceSummary[] = [];
    for (const projectEntry of projectEntries) {
      if (!projectEntry.isDirectory() || projectEntry.isSymbolicLink()) {
        continue;
      }

      const workspaceId = projectEntry.name;
      const workspaceRoot = join(projectsRoot, workspaceId);
      const memoryRoot = join(workspaceRoot, PROJECT_MEMORY_DIRECTORY_NAME);
      if (!(await isPlainDirectory(workspaceRoot)) || !(await isPlainDirectory(memoryRoot))) {
        continue;
      }

      let memoryEntries;
      try {
        memoryEntries = await readdir(memoryRoot, { withFileTypes: true });
      } catch (error) {
        // 目录检查后 Memory Agent 仍可能删除目录；catalog 快照只跳过已消失的 workspace。
        if (isNotFoundError(error)) {
          continue;
        }
        throw error;
      }
      const files: ProjectMemoryFileSummary[] = [];
      for (const memoryEntry of memoryEntries) {
        if (
          !memoryEntry.isFile() ||
          memoryEntry.isSymbolicLink() ||
          !isProjectMemoryFileName(memoryEntry.name)
        ) {
          continue;
        }

        const filePath = join(memoryRoot, memoryEntry.name);
        let fileMetadata;
        try {
          fileMetadata = await lstat(filePath);
        } catch (error) {
          // readdir 后事实文件可能被并发删除；它不再属于本次只读快照。
          if (isNotFoundError(error)) {
            continue;
          }
          throw error;
        }
        if (!fileMetadata.isFile() || fileMetadata.isSymbolicLink()) {
          continue;
        }
        files.push({
          name: memoryEntry.name,
          path: filePath,
          kind: memoryEntry.name === PROJECT_MEMORY_INDEX_FILE_NAME ? "index" : "item",
          size: fileMetadata.size,
          updatedAt: fileMetadata.mtimeMs,
        });
      }

      if (files.length === 0) {
        continue;
      }

      files.sort(compareProjectMemoryFiles);
      workspaces.push({
        id: workspaceId,
        label: resolveWorkspaceLabel(workspaceId),
        updatedAt: Math.max(...files.map((file) => file.updatedAt)),
        files,
      });
    }

    workspaces.sort(
      (left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id, "en"),
    );
    return workspaces;
  }

  async function readProjectMemoryFile(params: {
    workspaceId: string;
    fileName: string;
  }): Promise<{ content: string; updatedAt: number }> {
    if (
      !isValidPathSegment(params.workspaceId) ||
      !isValidPathSegment(params.fileName) ||
      !isProjectMemoryFileName(params.fileName)
    ) {
      throw new Error("Invalid Project Memory path");
    }

    const projectsRoot = await requireProjectMemoriesRoot();
    const workspaceRoot = join(projectsRoot, params.workspaceId);
    const memoryRoot = join(workspaceRoot, PROJECT_MEMORY_DIRECTORY_NAME);
    await requirePlainDirectory(workspaceRoot);
    await requirePlainDirectory(memoryRoot);

    // 大小写不敏感文件系统会让请求名称命中不同大小写的磁盘文件，绕过 catalog 白名单。
    const filePath = await requireExactProjectMemoryFile(memoryRoot, params.fileName);
    return readProjectMemoryFileFromStableHandle({
      fileName: params.fileName,
      filePath,
      validatePath: async () => {
        await requireProjectMemoriesRoot();
        await requirePlainDirectory(workspaceRoot);
        await requirePlainDirectory(memoryRoot);
        await requireExactProjectMemoryFile(memoryRoot, params.fileName);
        await assertContainedProjectMemoryPath(projectsRoot, filePath);
      },
    });
  }

  async function writeProjectMemoryFile(params: {
    workspaceId: string;
    fileName: string;
    content: string;
  }): Promise<void> {
    if (
      !isValidPathSegment(params.workspaceId) ||
      !isValidPathSegment(params.fileName) ||
      !isProjectMemoryFileName(params.fileName)
    ) {
      throw new Error("Invalid Project Memory path");
    }
    if (params.content.length > 256 * 1024) {
      throw new Error("Project Memory file content exceeds 256 KiB limit");
    }

    const projectsRoot = await requireProjectMemoriesRoot();
    const workspaceRoot = join(projectsRoot, params.workspaceId);
    const memoryRoot = join(workspaceRoot, PROJECT_MEMORY_DIRECTORY_NAME);
    await requirePlainDirectory(workspaceRoot);
    await requirePlainDirectory(memoryRoot);
    const targetPath = join(memoryRoot, params.fileName);
    // fileName 已校验为单段安全段；对已存在的根目录做真实路径包含性校验，防御越界。
    const memoryRootReal = await realpath(memoryRoot);
    const rel = relative(memoryRootReal, targetPath);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new Error(`Project Memory path is outside the local profile: ${targetPath}`);
    }
    // 冲突合并：同名记忆文件二次写入时按句子级去重合并，避免覆盖丢旧记忆。
    let content = params.content;
    try {
      const existing = await readFile(targetPath, "utf8");
      content = mergeMemoryText(existing, params.content);
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
    await writeFile(targetPath, content, "utf8");
  }

  async function deleteProjectMemoryFile(params: {
    workspaceId: string;
    fileName: string;
  }): Promise<void> {
    if (
      !isValidPathSegment(params.workspaceId) ||
      !isValidPathSegment(params.fileName) ||
      !isProjectMemoryFileName(params.fileName)
    ) {
      throw new Error("Invalid Project Memory path");
    }
    const projectsRoot = await requireProjectMemoriesRoot();
    const workspaceRoot = join(projectsRoot, params.workspaceId);
    const memoryRoot = join(workspaceRoot, PROJECT_MEMORY_DIRECTORY_NAME);
    await requirePlainDirectory(workspaceRoot);
    await requirePlainDirectory(memoryRoot);
    const filePath = await requireExactProjectMemoryFile(memoryRoot, params.fileName);
    await assertContainedProjectMemoryPath(projectsRoot, filePath);
    await rm(filePath, { force: false });
  }

  async function searchProjectMemories(params: {
    query: string;
    workspaceId?: string;
    limit?: number;
  }): Promise<ProjectMemorySearchHit[]> {
    const query = params.query.trim().toLocaleLowerCase();
    if (query.length === 0) {
      return [];
    }
    const limit = Math.max(1, Math.min(params.limit ?? 50, 200));

    // 枚举 workspace：与 listProjectMemories 同口径，支持 workspaceId 限定。
    const projectsRoot = await requireProjectMemoriesRoot();
    let projectEntries: Dirent[];
    try {
      projectEntries = await readdir(projectsRoot, { withFileTypes: true });
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }

    const hits: ProjectMemorySearchHit[] = [];
    for (const projectEntry of projectEntries) {
      if (
        !projectEntry.isDirectory() ||
        projectEntry.isSymbolicLink() ||
        (params.workspaceId !== undefined && projectEntry.name !== params.workspaceId)
      ) {
        continue;
      }

      const workspaceId = projectEntry.name;
      const workspaceRoot = join(projectsRoot, workspaceId);
      const memoryRoot = join(workspaceRoot, PROJECT_MEMORY_DIRECTORY_NAME);
      if (!(await isPlainDirectory(workspaceRoot)) || !(await isPlainDirectory(memoryRoot))) {
        continue;
      }

      let memoryEntries: Dirent[];
      try {
        memoryEntries = await readdir(memoryRoot, { withFileTypes: true });
      } catch (error) {
        if (isNotFoundError(error)) {
          continue;
        }
        throw error;
      }

      const label = resolveWorkspaceLabel(workspaceId);
      for (const memoryEntry of memoryEntries) {
        if (hits.length >= limit) {
          break;
        }
        if (
          !memoryEntry.isFile() ||
          memoryEntry.isSymbolicLink() ||
          !isProjectMemoryFileName(memoryEntry.name)
        ) {
          continue;
        }

        const filePath = join(memoryRoot, memoryEntry.name);
        let fileMetadata;
        try {
          fileMetadata = await lstat(filePath);
        } catch (error) {
          if (isNotFoundError(error)) {
            continue;
          }
          throw error;
        }
        if (!fileMetadata.isFile() || fileMetadata.isSymbolicLink()) {
          continue;
        }

        // 文件名命中：无需读内容。
        if (memoryEntry.name.toLocaleLowerCase().includes(query)) {
          hits.push({
            workspaceId,
            label,
            fileName: memoryEntry.name,
            path: filePath,
            kind: memoryEntry.name === PROJECT_MEMORY_INDEX_FILE_NAME ? "index" : "item",
            updatedAt: fileMetadata.mtimeMs,
            matchedInName: true,
          });
          continue;
        }

        // 内容命中：防御性跳过超大文件（写入侧已限 256 KiB）。
        if (fileMetadata.size > 1024 * 1024) {
          continue;
        }
        let content: string;
        try {
          content = await readFile(filePath, "utf8");
        } catch {
          // 并发删除/不可读文件跳过，不阻断整体检索。
          continue;
        }
        const lines = content.split("\n");
        const matchedLineIndex = lines.findIndex((line) =>
          line.toLocaleLowerCase().includes(query),
        );
        if (matchedLineIndex >= 0) {
          hits.push({
            workspaceId,
            label,
            fileName: memoryEntry.name,
            path: filePath,
            kind: memoryEntry.name === PROJECT_MEMORY_INDEX_FILE_NAME ? "index" : "item",
            updatedAt: fileMetadata.mtimeMs,
            matchedInName: false,
            snippet: buildSearchSnippet(lines[matchedLineIndex] ?? "", query.length),
            snippetLine: matchedLineIndex + 1,
          });
        }
      }
    }

    // 排序：文件名命中优先，其次更新时间倒序。
    hits.sort(
      (left, right) =>
        Number(left.matchedInName) - Number(right.matchedInName) ||
        right.updatedAt - left.updatedAt ||
        left.fileName.localeCompare(right.fileName, "en"),
    );
    return hits.slice(0, limit);
  }

  return {
    listProjectMemories,
    searchProjectMemories,
    readProjectMemoryFile,
    writeProjectMemoryFile,
    deleteProjectMemoryFile,
  };
}

/** 构建命中行上下文片段：命中词居中，两侧各保留约 60 字符，超长截断加省略号。 */
function buildSearchSnippet(line: string, queryLength: number): string {
  const normalized = line.toLocaleLowerCase();
  const index = normalized.indexOf(normalized.slice(0, Math.max(1, queryLength)).toLocaleLowerCase());
  const clampIndex = Math.max(0, index);
  const start = Math.max(0, clampIndex - 60);
  const end = Math.min(line.length, clampIndex + queryLength + 60);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < line.length ? "…" : "";
  return `${prefix}${line.slice(start, end).trim()}${suffix}`;
}
