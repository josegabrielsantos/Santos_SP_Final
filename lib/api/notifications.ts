import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type { NotificationsResponse } from '@/lib/types';

// ─── Get notifications (infinite / paginated, 10 per page) ─────

export function useNotifications() {
  return useInfiniteQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const page = (pageParam as number) ?? 1;
      const { data } = await axiosInstance.get<NotificationsResponse>('/notifications', {
        params: { page, limit: 10 },
      });
      return data;
    },
    initialPageParam: 1 as number,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    refetchInterval: 30_000, // poll every 30 seconds
  });
}

// ─── Get unread count ───────────────────────────────────────────

export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ count: number }>('/notifications/unread-count');
      return data;
    },
    refetchInterval: 15_000, // poll every 15 seconds
  });
}

// ─── Summary endpoint (unread count + latest notifications) ─────

export function useNotificationSummary() {
  return useQuery<{ unreadCount: number; notifications: import('@/lib/types').Notification[] }>({
    queryKey: ['notifications', 'summary'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/notifications/summary');
      return data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ─── Mark notifications as read ─────────────────────────────────

export function useMarkNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { notificationIds?: string[]; all?: boolean }) => {
      const { data } = await axiosInstance.post('/notifications/mark-read', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
