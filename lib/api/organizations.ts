import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type {
  Organization,
  OrgListItem,
  OrgsResponse,
  OrgMembersResponse,
  PostsResponse,
} from '@/lib/types';

// ─── List organisations ─────────────────────────────────────────

export function useOrganizations(params?: { page?: number; limit?: number; search?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<OrgsResponse>({
    queryKey: ['organizations', { page, limit, search: params?.search }],
    queryFn: async () => {
      const { data } = await axiosInstance.get<OrgsResponse>('/organizations', {
        params: { page, limit, search: params?.search },
      });
      return data;
    },
  });
}

// ─── Get single org ─────────────────────────────────────────────

export function useOrganization(idOrSlug: string | undefined) {
  return useQuery<Organization>({
    queryKey: ['organizations', idOrSlug],
    queryFn: async () => {
      const { data } = await axiosInstance.get<Organization>(`/organizations/${idOrSlug}`);
      return data;
    },
    enabled: !!idOrSlug,
  });
}

// ─── Org posts ──────────────────────────────────────────────────

export function useOrgPosts(orgId: string | undefined, params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<PostsResponse>({
    queryKey: ['organizations', orgId, 'posts', { page, limit }],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PostsResponse>(`/organizations/${orgId}/posts`, {
        params: { page, limit },
      });
      return data;
    },
    enabled: !!orgId,
  });
}

// ─── Org members ────────────────────────────────────────────────

export function useOrgMembers(orgId: string | undefined) {
  return useQuery<OrgMembersResponse>({
    queryKey: ['organizations', orgId, 'members'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<OrgMembersResponse>(
        `/organizations/${orgId}/members`
      );
      return data;
    },
    enabled: !!orgId,
  });
}

// ─── Request to join ────────────────────────────────────────────

export function useRequestJoin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data } = await axiosInstance.post(`/organizations/${orgId}/join`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// ─── Approve join ───────────────────────────────────────────────

export function useApproveJoin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      const { data } = await axiosInstance.post(
        `/organizations/${orgId}/join/${userId}/approve`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// ─── Reject join ────────────────────────────────────────────────

export function useRejectJoin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      const { data } = await axiosInstance.post(
        `/organizations/${orgId}/join/${userId}/reject`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// ─── Leave org ──────────────────────────────────────────────────

export function useLeaveOrg() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data } = await axiosInstance.post(`/organizations/${orgId}/leave`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// ─── Follow / unfollow org ──────────────────────────────────────

export function useFollowOrg() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data } = await axiosInstance.post(`/organizations/${orgId}/follow`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// ─── Unfollow org ───────────────────────────────────────────────

export function useUnfollowOrg() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data } = await axiosInstance.post(`/organizations/${orgId}/unfollow`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// ─── Promote / demote admin ─────────────────────────────────────

export function usePromoteAdmin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      const { data } = await axiosInstance.put(
        `/organizations/${orgId}/admins/${userId}/promote`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useDemoteAdmin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      const { data } = await axiosInstance.put(
        `/organizations/${orgId}/admins/${userId}/demote`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
