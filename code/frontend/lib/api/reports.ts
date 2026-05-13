import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

// ─── Submit a report ────────────────────────────────────────────

interface SubmitReportPayload {
  targetType: 'post' | 'user';
  targetId: string;
  reason: string;
  details?: string;
}

export function useSubmitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitReportPayload) => {
      const { data } = await axiosInstance.post('/reports', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Report submitted. Our team will review it.');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error;
      if (msg === 'You have already reported this.') {
        toast.info('You have already reported this.');
      } else {
        toast.error(msg || 'Failed to submit report.');
      }
    },
  });
}

// ─── Org reports (for org admins) ───────────────────────────────

interface OrgReportsResponse {
  reports: any[];
  total: number;
  openCount: number;
  page: number;
  limit: number;
}

export function useOrgReports(orgId: string | undefined, params?: { status?: string; page?: number }) {
  const status = params?.status || 'all';
  const page = params?.page || 1;

  return useQuery<OrgReportsResponse>({
    queryKey: ['organizations', orgId, 'reports', { status, page }],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/organizations/${orgId}/reports`, {
        params: { status, page, limit: 20 },
      });
      return data;
    },
    enabled: !!orgId,
  });
}

// ─── Admin reports (for super admin) ────────────────────────────

interface AdminReportsResponse {
  reports: any[];
  total: number;
  openCount: number;
  page: number;
  limit: number;
}

export function useAdminReports(params?: { status?: string; targetType?: string; page?: number }) {
  const status = params?.status || 'all';
  const targetType = params?.targetType || 'all';
  const page = params?.page || 1;

  return useQuery<AdminReportsResponse>({
    queryKey: ['admin', 'reports', { status, targetType, page }],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/admin/reports', {
        params: { status, targetType, page, limit: 20 },
      });
      return data;
    },
  });
}

// ─── Update a report ────────────────────────────────────────────

interface UpdateReportPayload {
  reportId: string;
  status?: 'action_taken' | 'dismissed';
  reviewNote?: string;
  actionTaken?: string;
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, ...body }: UpdateReportPayload) => {
      const { data } = await axiosInstance.patch(`/reports/${reportId}`, body);
      return data;
    },
    onSuccess: () => {
      // Invalidate all report queries
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast.success('Report updated.');
    },
  });
}
