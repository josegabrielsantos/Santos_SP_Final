import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';

export interface OrgAnalytics {
  postsOverTime: { month: string; count: number }[];
  topPosts: { _id: string; title: string; likeCount: number; commentCount: number }[];
  typeBreakdown: { type: string; count: number }[];
  topTags: { tag: string; count: number }[];
}

export interface PublicTrends {
  papersByYear: { year: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  papersByOrg: { name: string; count: number }[];
}

export function useOrgAnalytics(orgId: string | undefined) {
  return useQuery<OrgAnalytics>({
    queryKey: ['analytics', 'org', orgId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<OrgAnalytics>(`/analytics/orgs/${orgId}`);
      return data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicTrends() {
  return useQuery<PublicTrends>({
    queryKey: ['analytics', 'trends'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PublicTrends>('/analytics/trends');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface TopicCount {
  topic: string;
  count: number;
}

export function useTopicCounts() {
  return useQuery<TopicCount[]>({
    queryKey: ['analytics', 'topics'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<TopicCount[]>('/analytics/topics');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
