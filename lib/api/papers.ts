import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type {
  Paper,
  PapersResponse,
  PaperSearchResponse,
} from '@/lib/types';

// ─── Get paginated papers ───────────────────────────────────────

export function usePapers(params?: {
  page?: number;
  limit?: number;
  keyword?: string;
  author?: string;
  yearFrom?: number;
  yearTo?: number;
  sort?: 'newest' | 'oldest' | 'downloads';
  myOrgs?: boolean;
  topic?: string;
  enabled?: boolean;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<PapersResponse>({
    queryKey: ['papers', params],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PapersResponse>('/papers', {
        params: {
          page,
          limit,
          keyword: params?.keyword || undefined,
          author: params?.author || undefined,
          yearFrom: params?.yearFrom || undefined,
          yearTo: params?.yearTo || undefined,
          sort: params?.sort || undefined,
          myOrgs: params?.myOrgs ? 'true' : undefined,
          topic: params?.topic || undefined,
        },
      });
      return data;
    },
    enabled: params?.enabled ?? true,
  });
}

// ─── Get papers by organization ──────────────────────────────────

export function useOrgPapers(
  orgId: string | undefined,
  params?: { page?: number; limit?: number; sort?: 'newest' | 'oldest' | 'downloads' },
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<PapersResponse>({
    queryKey: ['papers', 'org', orgId, params],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PapersResponse>('/papers', {
        params: {
          page,
          limit,
          organizationId: orgId,
          sort: params?.sort || undefined,
        },
      });
      return data;
    },
    enabled: !!orgId,
  });
}

// ─── Get single paper ───────────────────────────────────────────

export function usePaper(id: string | undefined) {
  return useQuery<Paper>({
    queryKey: ['papers', id],
    queryFn: async () => {
      const { data } = await axiosInstance.get<Paper>(`/papers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// ─── Elasticsearch paper search ─────────────────────────────────

export function useSearchPapers(params?: {
  q?: string;
  title?: string;
  author?: string;
  tags?: string;
  tagMode?: 'any' | 'all';
  yearFrom?: number;
  yearTo?: number;
  sort?: 'relevance' | 'newest' | 'oldest' | 'downloads';
  topic?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const q = params?.q ?? '';
  const hasCriteria =
    q.trim().length > 0 ||
    !!params?.title?.trim() ||
    !!params?.author?.trim() ||
    !!params?.tags?.trim() ||
    params?.yearFrom !== undefined ||
    params?.yearTo !== undefined;

  return useQuery<PaperSearchResponse>({
    queryKey: ['papers', 'search', params],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaperSearchResponse>('/search', {
        params: {
          q,
          type: 'papers',
          title: params?.title || undefined,
          author: params?.author || undefined,
          tags: params?.tags || undefined,
          tagMode: params?.tagMode || undefined,
          yearFrom: params?.yearFrom || undefined,
          yearTo: params?.yearTo || undefined,
          sort: params?.sort || undefined,
          topic: params?.topic || undefined,
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
        },
      });
      return data;
    },
    enabled: (params?.enabled ?? true) && hasCriteria,
  });
}

// ─── Download paper (increment count + trigger browser download) ──

/**
 * Returns the backend GET URL that streams the paper file with
 * Content-Disposition: attachment.  Opening this URL triggers a
 * real browser download without any CORS or blob issues.
 */
export function getPaperDownloadUrl(paperId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return `${base}/papers/${paperId}/download`;
}

export function useDownloadPaper() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (paperId: string) => {
      // Primary approach: open the backend GET endpoint directly.
      // The server returns Content-Disposition: attachment which
      // makes the browser download instead of navigate.
      const url = getPaperDownloadUrl(paperId);

      // Use a hidden iframe to trigger the download without
      // navigating away from the current page.
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);

      // Clean up the iframe after a reasonable delay
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch { /* already removed */ }
      }, 60000);

      // Also fire the POST to ensure query cache is invalidated
      // (the GET above already incremented the count on the server)
      return { paperId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}

// ─── Toggle save paper ──────────────────────────────────────────

export function useToggleSavePaper() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (paperId: string) => {
      const { data } = await axiosInstance.post<{ saved: boolean; savedPapers: string[] }>(
        `/users/saved-papers/${paperId}`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savedPapers'] });
    },
  });
}

// ─── Get multiple papers by IDs ─────────────────────────────────

export function usePapersByIds(ids: string[]) {
  return useQuery<Paper[]>({
    queryKey: ['papers', 'byIds', ids],
    queryFn: async () => {
      const results = await Promise.all(
        ids.map((id) => axiosInstance.get<Paper>(`/papers/${id}`).then((r) => r.data))
      );
      return results;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Get related papers for a post (ES-based) ──────────────────

export function useRelatedPapers(postId: string | undefined) {
  return useQuery<{ papers: Paper[] }>({
    queryKey: ['papers', 'related', postId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ papers: Paper[] }>('/papers/related', {
        params: { postId, limit: 5 },
      });
      return data;
    },
    enabled: !!postId,
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Enrich paper metadata from DOI ─────────────────────────────

export function useEnrichDoi() {
  return useMutation({
    mutationFn: async (doi: string) => {
      const { data } = await axiosInstance.post('/papers/enrich-doi', { doi });
      return data as { title: string; authors: string[]; abstract: string | null; year: number | null; journal: string | null; keywords: string[]; doi: string };
    },
  });
}

// ─── Get saved papers ───────────────────────────────────────────

export function useSavedPapers(enabled = true) {
  return useQuery<Paper[]>({
    queryKey: ['savedPapers'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<Paper[]>('/users/saved-papers');
      return data;
    },
    enabled,
  });
}

// ─── Bulk import papers from CSV ────────────────────────────────

export function useBulkImportPapers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      organizationId,
    }: {
      file: File;
      organizationId?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (organizationId) formData.append('organizationId', organizationId);
      const { data } = await axiosInstance.post('/papers/bulk-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as {
        created: number;
        skipped: number;
        errors: { row: number; reason: string }[];
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['papers'] });
    },
  });
}
