import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type { UserDetail } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
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

// ─── Delete organization (admin) ────────────────────────────────

export function useAdminDeleteOrg() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      await axiosInstance.delete(`/admin/organizations/${orgId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}
