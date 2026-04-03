import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';

// ---------- Types ----------

export interface AIInsight {
  summary: string | null;
  keyThemes: string[];
  researchGaps: string[];
  stats: {
    totalPosts: number;
    totalPapers: number;
    recentPosts: number;
    topOrg: string | null;
  };
  generatedAt: string | null;
  cached: boolean;
  reason?: string;
}

export interface RelatedPost {
  _id: string;
  title: string;
  type: string;
  authorName: string;
  organizationName: string;
  organizationId: string;
  topics: string[];
  tags: string[];
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  relevanceScore: number;
}

// ---------- Hooks ----------

export function useAIInsight(postId: string | undefined) {
  return useQuery<AIInsight>({
    queryKey: ['insights', 'ai', postId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<AIInsight>(`/insights/${postId}/summary`);
      return data;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!postId,
    retry: 1,
  });
}

export function useRelatedPosts(postId: string | undefined, limit = 5) {
  return useQuery<RelatedPost[]>({
    queryKey: ['insights', 'relatedPosts', postId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<RelatedPost[]>(`/insights/posts/${postId}/related`, {
        params: { limit },
      });
      return data;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!postId,
  });
}
