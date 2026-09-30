/**
 * 记忆冲突合并（记忆 P1）：同主题（同名文件）再次写入时按句子级去重合并，
 * 保留旧记忆不丢。策略：incoming 的句子若已在 existing 中出现（去空白后
 * 精确相同）则跳过，否则追加到末尾。不做词频相似度比较，避免跨主题误合并。
 */
export function mergeMemoryText(existing: string, incoming: string): string {
  if (existing.trim().length === 0) return incoming;
  if (incoming.trim().length === 0) return existing;
  const existingNormalized = normalizeMemorySentences(existing);
  const existingSet = new Set(existingNormalized);
  const kept: string[] = [];
  for (const sentence of normalizeMemorySentences(incoming)) {
    if (!existingSet.has(sentence) && !kept.includes(sentence)) {
      kept.push(sentence);
    }
  }
  if (kept.length === 0) return existing;
  const separator = existing.endsWith("\n") ? "" : "\n";
  return `${existing}${separator}${kept.join("\n")}`;
}

function normalizeMemorySentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.match(/[^。！？.!?]+[。！？.!?]*/g) ?? [line])
    .map((part) => part.replace(/[\s\u3000]+/g, " ").trim())
    .filter((part) => part.length > 0);
}
