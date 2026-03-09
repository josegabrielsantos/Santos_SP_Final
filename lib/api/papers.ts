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
        },
      });
      return data;
    },
    enabled: params?.enabled ?? true,
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
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
        },
      });
      return data;
    },
    enabled: (params?.enabled ?? true) && hasCriteria,
  });
}

// ─── Download paper (increment count + get URL) ─────────────────

export function useDownloadPaper() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (paperId: string) => {
      const response = await axiosInstance.post<Blob>(`/papers/${paperId}/download`, null, {
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'] as string | undefined;
      const matched = contentDisposition?.match(/filename="?([^\"]+)"?/i);
      const filename = matched?.[1] || 'paper.pdf';

      return { blob: response.data, filename };
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
