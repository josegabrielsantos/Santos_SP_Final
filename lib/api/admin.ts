import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type { UserDetail, ModerationLogsResponse } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalPapers: number;
  totalOrgs: number;
  activeUsers: number;
  totalAdmins: number;
  recentSignups: number;
  postsThisMonth: number;
}

export interface UsersResponse {
  users: UserDetail[];
  total: number;
  page: number;
  pages: number;
}

// ─── Admin organizations (all, including inactive) ─────────────

export interface AdminOrg {
  _id: string;
  name: string;
  slug: string;
  avatar: string | null;
  description: string | null;
  memberCount: number;
  postCount: number;
  isActive: boolean;
}

export interface AdminOrgsResponse {
  organizations: AdminOrg[];
  total: number;
  page: number;
  pages: number;
}

export function useAdminOrganizations(params?: { page?: number; limit?: number; search?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<AdminOrgsResponse>({
    queryKey: ['admin', 'organizations', { page, limit, search: params?.search }],
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminOrgsResponse>('/admin/organizations', {
        params: { page, limit, search: params?.search },
      });
      return data;
    },
  });
}

// ─── Dashboard stats ────────────────────────────────────────────

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminStats>('/admin/stats');
      return data;
    },
  });
}

// ─── All users (with search) ────────────────────────────────────

export function useAdminUsers(params?: { page?: number; limit?: number; search?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;

  return useQuery<UsersResponse>({
    queryKey: ['admin', 'users', { page, limit, search: params?.search }],
    queryFn: async () => {
      const { data } = await axiosInstance.get<UsersResponse>('/admin/users', {
        params: { page, limit, search: params?.search },
      });
      return data;
    },
  });
}

// ─── Update user role ───────────────────────────────────────────

export function useUpdateUserRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'user' | 'website_admin' }) => {
      const { data } = await axiosInstance.patch(`/admin/users/${userId}/role`, { role });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

// ─── Toggle user active ────────────────────────────────────────

export function useToggleUserActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await axiosInstance.patch(`/admin/users/${userId}/deactivate`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

// ─── Admin analytics charts ─────────────────────────────────────

export interface AdminCharts {
  postsOverTime: { month: string; count: number }[];
  papersOverTime: { month: string; count: number }[];
  registrationsOverTime: { month: string; count: number }[];
  postTypeDistribution: { type: string; count: number }[];
  topTags: { tag: string; count: number }[];
  orgsByActivity: { name: string; postCount: number }[];
}

export function useAdminCharts() {
  return useQuery<AdminCharts>({
    queryKey: ['admin', 'charts'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminCharts>('/admin/analytics');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Create organization (admin) ────────────────────────────────

export function useAdminCreateOrg() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      ownerId: string;
      avatar?: string | null;
      bannerImage?: string | null;
    }) => {
      const { data } = await axiosInstance.post('/organizations', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

// ─── Deactivate / reactivate organization (admin) ──────────────

export function useAdminDeactivateOrg() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data } = await axiosInstance.patch(`/admin/organizations/${orgId}/deactivate`);
      return data as { _id: string; isActive: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'moderation-logs'] });
    },
  });
}

// ─── Hard delete organization (admin) ──────────────────────────

export function useAdminHardDeleteOrg() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data } = await axiosInstance.delete(`/admin/organizations/${orgId}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'moderation-logs'] });
    },
  });
}

// ─── Hide / unhide post (admin) ─────────────────────────────────

export function useAdminToggleHidePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason?: string }) => {
      const { data } = await axiosInstance.patch(`/admin/posts/${postId}/hide`, { reason });
      return data as { message: string; status: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'moderation-logs'] });
    },
  });
}

// ─── Delete post (admin) ────────────────────────────────────────

export function useAdminDeletePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason?: string }) => {
      const { data } = await axiosInstance.delete(`/admin/posts/${postId}`, { data: { reason } });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'moderation-logs'] });
    },
  });
}

// ─── Hide / unhide comment (admin) ──────────────────────────────

export function useAdminToggleHideComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, reason }: { commentId: string; reason?: string }) => {
      const { data } = await axiosInstance.patch(`/admin/comments/${commentId}/hide`, { reason });
      return data as { message: string; isHidden: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['replies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'moderation-logs'] });
    },
  });
}

// ─── Delete comment (admin) ─────────────────────────────────────

export function useAdminDeleteComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, reason }: { commentId: string; reason?: string }) => {
      const { data } = await axiosInstance.delete(`/admin/comments/${commentId}`, { data: { reason } });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: ['replies'] });
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'moderation-logs'] });
    },
  });
}

// ─── Ban / unban user (admin) ───────────────────────────────────

export function useAdminToggleBan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const { data } = await axiosInstance.patch(`/admin/users/${userId}/ban`, { reason });
      return data as { _id: string; isBanned: boolean; banReason: string | null };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'moderation-logs'] });
    },
  });
}

// ─── Elasticsearch reindex (admin) ──────────────────────────────

export function useReindex() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post<{ message: string }>('/admin/reindex');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['search'] });
      qc.invalidateQueries({ queryKey: ['papers'] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Moderation logs ────────────────────────────────────────────

export function useModerationLogs(params?: { page?: number; limit?: number; action?: string; targetType?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 30;

  return useQuery<ModerationLogsResponse>({
    queryKey: ['admin', 'moderation-logs', { page, limit, action: params?.action, targetType: params?.targetType }],
    queryFn: async () => {
      const { data } = await axiosInstance.get<ModerationLogsResponse>('/admin/moderation-logs', {
        params: { page, limit, action: params?.action, targetType: params?.targetType },
      });
      return data;
    },
  });
}
