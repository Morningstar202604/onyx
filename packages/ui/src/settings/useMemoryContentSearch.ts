import { useEffect, useRef, useState } from "react";
import type { ProjectMemorySearchHit } from "@onyx/services";

/**
 * 记忆全文检索：输入变化后 300ms 防抖调用 onSearch，
 * 以请求序号丢弃过期结果，避免竞态。
 */
export function useMemoryContentSearch(
  searchQuery: string,
  selectedWorkspaceId: string | undefined,
  onSearch?: (query: string, workspaceId: string) => Promise<ProjectMemorySearchHit[]>,
): { contentHits: ProjectMemorySearchHit[]; searching: boolean } {
  const [contentHits, setContentHits] = useState<ProjectMemorySearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    if (!onSearch) {
      return;
    }
    const query = searchQuery.trim();
    if (!query) {
      setContentHits([]);
      setSearching(false);
      return;
    }
    if (!selectedWorkspaceId) {
      return;
    }
    setSearching(true);
    const requestId = ++searchRequestRef.current;
    const timer = window.setTimeout(() => {
      void onSearch(query, selectedWorkspaceId)
        .then((hits) => {
          if (searchRequestRef.current === requestId) {
            setContentHits(hits);
            setSearching(false);
          }
        })
        .catch(() => {
          if (searchRequestRef.current === requestId) {
            setContentHits([]);
            setSearching(false);
          }
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, selectedWorkspaceId, onSearch]);

  return { contentHits, searching };
}
