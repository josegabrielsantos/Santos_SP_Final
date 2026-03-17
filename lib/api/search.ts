import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type { PaperSearchHit } from '@/lib/types';

export interface SuggestResult {
  _id: string;
  title: string;
  type: 'post' | 'paper';
}

export interface PostSearchHit {
  _id: string;
  score: number;
  title: string;
  bodyText?: string;
  tags?: string[];
  type?: string;
  publishedAt?: string;
  authorId?: { _id: string; displayName: string };
  organizationId?: { _id: string; name: string; slug: string } | null;
  highlight: Record<string, string[]>;
}

export interface SearchResponse {
  posts?: { total: number; hits: PostSearchHit[] };
  papers?: { total: number; hits: PaperSearchHit[] };
}

export function useSearch(params: {
  q: string;
  type?: 'all' | 'posts' | 'papers';
  sort?: string;
  author?: string;
  yearFrom?: string;
  yearTo?: string;
  tags?: string;
  enabled?: boolean;
}) {
  return useQuery<SearchResponse>({
    queryKey: ['search', params],
    queryFn: async () => {
      const { enabled: _enabled, ...queryParams } = params;
      const { data } = await axiosInstance.get<SearchResponse>('/search', {
        params: queryParams,
      });
      return data;
    },
    staleTime: 30_000,
    enabled: !!params.q && params.enabled !== false,
  });
}

export function useSuggest(q: string) {
  return useQuery<SuggestResult[]>({
    queryKey: ['suggest', q],
    queryFn: async () => {
      const { data } = await axiosInstance.get<SuggestResult[]>('/search/suggest', {
        params: { q, type: 'all' },
      });
      return data;
    },
    staleTime: 10_000,
    enabled: q.length >= 2,
  });
}
