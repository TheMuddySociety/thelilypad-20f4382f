import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

interface OptimisticState<T> {
  data: T;
  isOptimistic: boolean;
  error: Error | null;
}

interface UseOptimisticOptions<T> {
  onError?: (error: Error, rollbackData: T) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticUpdate<T>(
  initialData: T,
  options: UseOptimisticOptions<T> = {}
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
    error: null,
  });

  const update = useCallback(
    async (
      optimisticData: T,
      asyncOperation: () => Promise<T>
    ): Promise<boolean> => {
      const previousData = state.data;

      // Apply optimistic update immediately
      setState({
        data: optimisticData,
        isOptimistic: true,
        error: null,
      });

      try {
        const result = await asyncOperation();
        
        // Confirm with server data
        setState({
          data: result,
          isOptimistic: false,
          error: null,
        });

        if (options.successMessage) {
          toast({ title: options.successMessage });
        }

        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Operation failed");

        // Rollback to previous state
        setState({
          data: previousData,
          isOptimistic: false,
          error: err,
        });

        if (options.onError) {
          options.onError(err, previousData);
        }

        toast({
          title: options.errorMessage || "Something went wrong",
          description: err.message,
          variant: "destructive",
        });

        return false;
      }
    },
    [state.data, options]
  );

  const reset = useCallback((newData: T) => {
    setState({
      data: newData,
      isOptimistic: false,
      error: null,
    });
  }, []);

  return {
    data: state.data,
    isOptimistic: state.isOptimistic,
    error: state.error,
    update,
    reset,
  };
}

// Optimistic toggle for boolean states (like/follow)
export function useOptimisticToggle(
  initialState: boolean,
  options: UseOptimisticOptions<boolean> = {}
) {
  const { data, isOptimistic, update, reset } = useOptimisticUpdate(initialState, options);

  const toggle = useCallback(
    async (asyncOperation: () => Promise<boolean>) => {
      return update(!data, asyncOperation);
    },
    [data, update]
  );

  return {
    isActive: data,
    isOptimistic,
    toggle,
    reset,
  };
}

// Optimistic counter for numeric states (like count, follower count)
export function useOptimisticCounter(
  initialCount: number,
  options: UseOptimisticOptions<number> = {}
) {
  const { data, isOptimistic, update, reset } = useOptimisticUpdate(initialCount, options);

  const increment = useCallback(
    async (asyncOperation: () => Promise<number>) => {
      return update(data + 1, asyncOperation);
    },
    [data, update]
  );

  const decrement = useCallback(
    async (asyncOperation: () => Promise<number>) => {
      return update(Math.max(0, data - 1), asyncOperation);
    },
    [data, update]
  );

  const set = useCallback(
    async (value: number, asyncOperation: () => Promise<number>) => {
      return update(value, asyncOperation);
    },
    [update]
  );

  return {
    count: data,
    isOptimistic,
    increment,
    decrement,
    set,
    reset,
  };
}

// Optimistic list operations (add/remove items)
export function useOptimisticList<T extends { id: string }>(
  initialItems: T[],
  options: UseOptimisticOptions<T[]> = {}
) {
  const { data, isOptimistic, update, reset } = useOptimisticUpdate(initialItems, options);

  const addItem = useCallback(
    async (item: T, asyncOperation: () => Promise<T[]>) => {
      return update([...data, item], asyncOperation);
    },
    [data, update]
  );

  const removeItem = useCallback(
    async (itemId: string, asyncOperation: () => Promise<T[]>) => {
      return update(
        data.filter((item) => item.id !== itemId),
        asyncOperation
      );
    },
    [data, update]
  );

  const updateItem = useCallback(
    async (itemId: string, updates: Partial<T>, asyncOperation: () => Promise<T[]>) => {
      return update(
        data.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
        asyncOperation
      );
    },
    [data, update]
  );

  return {
    items: data,
    isOptimistic,
    addItem,
    removeItem,
    updateItem,
    reset,
  };
}
