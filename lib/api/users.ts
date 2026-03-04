import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type { UserDetail, PostsResponse, OrgListItem } from '@/lib/types';

// ─── Get user by ID ─────────────────────────────────────────────

export function useUser(userId: string | undefined) {
  return useQuery<UserDetail>({
    queryKey: ['users', userId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<UserDetail>(`/users/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

// ─── Get user's organizations (member/admin) ────────────────────

export function useUserOrganizations(userId: string | undefined) {
  return useQuery<OrgListItem[]>({
    queryKey: ['users', userId, 'organizations'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<OrgListItem[]>(
        `/users/${userId}/organizations`
      );
      return data;
    },
    enabled: !!userId,
  });
}

// ─── Get user's followed organizations ──────────────────────────

export function useUserFollowedOrganizations(userId: string | undefined) {
  return useQuery<OrgListItem[]>({
    queryKey: ['users', userId, 'followed-organizations'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<OrgListItem[]>(
        `/users/${userId}/followed-organizations`
      );
      return data;
    },
    enabled: !!userId,
  });
}

// ─── Get user's posts ───────────────────────────────────────────

export function useUserPosts(userId: string | undefined, params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<PostsResponse>({
    queryKey: ['users', userId, 'posts', { page, limit }],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PostsResponse>(
        `/users/${userId}/posts`,
        { params: { page, limit } }
      );
      return data;
    },
    enabled: !!userId,
  });
}
