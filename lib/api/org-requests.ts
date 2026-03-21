import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type { OrgRequest, OrgRequestsResponse, OrgRequestStatus } from '@/lib/types';

// ─── User: submit request ────────────────────────────────────────

export function useCreateOrgRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      orgName: string;
      orgDescription?: string;
      orgAvatar?: string | null;
      orgBannerImage?: string | null;
    }) => {
      const { data } = await axiosInstance.post<OrgRequest>('/org-requests', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-requests', 'mine'] });
    },
  });
}

// ─── User: get my requests ───────────────────────────────────────

export function useMyOrgRequests() {
  return useQuery<{ requests: OrgRequest[] }>({
    queryKey: ['org-requests', 'mine'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/org-requests/mine');
      return data;
    },
  });
}

// ─── User: get single request ────────────────────────────────────

export function useMyOrgRequest(id: string | undefined) {
  return useQuery<OrgRequest>({
    queryKey: ['org-requests', 'mine', id],
    queryFn: async () => {
      const { data } = await axiosInstance.get<OrgRequest>(`/org-requests/mine/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// ─── User: update request ────────────────────────────────────────

export function useUpdateMyOrgRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      orgName?: string;
      orgDescription?: string;
      orgAvatar?: string | null;
      orgBannerImage?: string | null;
    }) => {
      const { data } = await axiosInstance.put<OrgRequest>(`/org-requests/mine/${id}`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['org-requests', 'mine'] });
      qc.invalidateQueries({ queryKey: ['org-requests', 'mine', variables.id] });
    },
  });
}

// ─── User: add message ──────────────────────────────────────────

export function useAddRequesterMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { data } = await axiosInstance.post<OrgRequest>(`/org-requests/mine/${id}/messages`, { body });
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['org-requests', 'mine', variables.id] });
    },
  });
}

// ─── Admin: list all requests ────────────────────────────────────

export function useAdminOrgRequests(params?: {
  page?: number;
  limit?: number;
  status?: OrgRequestStatus | '';
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<OrgRequestsResponse>({
    queryKey: ['org-requests', 'admin', { page, limit, status: params?.status }],
    queryFn: async () => {
      const { data } = await axiosInstance.get<OrgRequestsResponse>('/org-requests/all', {
        params: {
          page,
          limit,
          status: params?.status || undefined,
        },
      });
      return data;
    },
  });
}

// ─── Admin: get single request ───────────────────────────────────

export function useAdminOrgRequest(id: string | undefined) {
  return useQuery<OrgRequest>({
    queryKey: ['org-requests', 'admin', id],
    queryFn: async () => {
      const { data } = await axiosInstance.get<OrgRequest>(`/org-requests/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// ─── Admin: approve ──────────────────────────────────────────────

export function useApproveOrgRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<OrgRequest>(`/org-requests/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-requests'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

// ─── Admin: reject ───────────────────────────────────────────────

export function useRejectOrgRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await axiosInstance.post<OrgRequest>(`/org-requests/${id}/reject`, { reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-requests'] });
    },
  });
}

// ─── Admin: send message ─────────────────────────────────────────

export function useAdminSendMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { data } = await axiosInstance.post<OrgRequest>(`/org-requests/${id}/messages`, { body });
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['org-requests', 'admin', variables.id] });
      qc.invalidateQueries({ queryKey: ['org-requests', 'admin'] });
    },
  });
}

// ─── Admin: pending count (for badge) ────────────────────────────

export function useOrgRequestPendingCount() {
  return useQuery<{ count: number }>({
    queryKey: ['org-requests', 'pending-count'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/org-requests/pending-count');
      return data;
    },
    refetchInterval: 30_000,
  });
}
