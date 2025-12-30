import { useEffect, useRef, useCallback, useState } from "react";

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  isLoading: boolean,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0.1, rootMargin = "100px" } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold,
      rootMargin,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold, rootMargin]);

  return { loadMoreRef };
}

export function usePagination<T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>,
  pageSize: number = 12
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const result = await fetchFn(page, pageSize);
      setItems(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error("Error loading more items:", error);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [fetchFn, page, pageSize, isLoading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setIsInitialLoading(true);
  }, []);

  return {
    items,
    hasMore,
    isLoading,
    isInitialLoading,
    loadMore,
    reset,
    setItems,
  };
}
