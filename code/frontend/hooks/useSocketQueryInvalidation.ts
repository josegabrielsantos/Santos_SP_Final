'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from './useSocket';

// Listen to a socket event and invalidate the given query keys
export function useSocketQueryInvalidation<T = unknown>(
  event: string,
  getQueryKeys: (data: T) => unknown[][],
  options?: {
    skip?: (data: T) => boolean;
  }
) {
  const queryClient = useQueryClient();

  useSocketEvent<T>(event, (data) => {
    if (options?.skip?.(data)) return;
    const keys = getQueryKeys(data);
    for (const key of keys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  });
}
