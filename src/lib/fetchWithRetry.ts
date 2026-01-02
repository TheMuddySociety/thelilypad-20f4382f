import { getErrorMessage, getErrorStatus, errorContains } from "./errorUtils";

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableStatuses?: number[];
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getExponentialDelay = (attempt: number, baseDelay: number, maxDelay: number): number => {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = delay * 0.1 * Math.random();
  return Math.min(delay + jitter, maxDelay);
};

export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, retryableStatuses } = {
    ...defaultOptions,
    ...options,
  };

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchFn();
      return result;
    } catch (error: unknown) {
      lastError = error;

      // Check if we should retry
      const status = getErrorStatus(error);
      const isRetryable =
        (error instanceof TypeError) || // Network errors
        errorContains(error, "network") ||
        errorContains(error, "fetch") ||
        (status !== undefined && retryableStatuses.includes(status));

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = getExponentialDelay(attempt, baseDelay, maxDelay);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }

  throw lastError || new Error("Request failed after retries");
}

// Wrapper for Supabase queries with retry
export async function supabaseWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: { status?: number; code?: number; message?: string } | null }>
): Promise<{ data: T | null; error: { status?: number; code?: number; message?: string } | null }> {
  return fetchWithRetry(async () => {
    const result = await queryFn();
    
    // Don't retry on auth errors or client errors
    if (result.error) {
      const status = result.error.status ?? result.error.code;
      if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        return result; // Return error without retrying
      }
      if (status !== undefined && (status >= 500 || status === 408 || status === 429)) {
        throw { ...result.error, status };
      }
    }
    
    return result;
  });
}
