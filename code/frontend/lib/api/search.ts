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

export interface SearchParams {
  q: string;
  type?: 'all' | 'posts' | 'papers';
  // Paper filters
  sort?: string;
  author?: string;
  yearFrom?: string;
  yearTo?: string;
  tags?: string;
  tagMode?: string;
  title?: string;
  // Post filters
  postType?: string;
  postTags?: string;
  dateFrom?: string;
  dateTo?: string;
  // Topic filter (applies to both posts and papers)
  topic?: string;
  // Pagination
  page?: number;
  limit?: number;
  // Future: semantic search
  // semantic?: boolean;
  enabled?: boolean;
}

export function useSearch(params: SearchParams) {
  const hasQuery = !!params.q?.trim();
  const hasFilters =
    !!params.author?.trim() ||
    !!params.yearFrom?.trim() ||
    !!params.yearTo?.trim() ||
    !!params.tags?.trim() ||
    !!params.title?.trim() ||
    !!params.postType?.trim() ||
    !!params.postTags?.trim() ||
    !!params.dateFrom?.trim() ||
    !!params.dateTo?.trim() ||
    !!params.topic?.trim();

  return useQuery<SearchResponse>({
    queryKey: ['search', params],
    queryFn: async () => {
      const { enabled: _enabled, ...queryParams } = params;
      // Remove undefined/empty values
      const cleaned = Object.fromEntries(
        Object.entries(queryParams).filter(([, v]) => v !== undefined && v !== '')
      );
      const { data } = await axiosInstance.get<SearchResponse>('/search', {
        params: cleaned,
      });
      return data;
    },
    staleTime: 30_000,
    enabled: (hasQuery || hasFilters) && params.enabled !== false,
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
