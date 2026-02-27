import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type {
  Post,
  PostsResponse,
  CreatePostPayload,
  PaperMetadata,
} from '@/lib/types';

// ─── Get paginated posts (public feed) ──────────────────────────

export function usePosts(params?: { page?: number; limit?: number; tag?: string; type?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<PostsResponse>({
    queryKey: ['posts', { page, limit, tag: params?.tag, type: params?.type }],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PostsResponse>('/posts', {
        params: { page, limit, tag: params?.tag, type: params?.type },
      });
      return data;
    },
  });
}

// ─── Get a single post ──────────────────────────────────────────

export function usePost(id: string | undefined) {
  return useQuery<Post>({
    queryKey: ['posts', id],
    queryFn: async () => {
      const { data } = await axiosInstance.get<Post>(`/posts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// ─── Featured posts ─────────────────────────────────────────────

export function useFeaturedPosts() {
  return useQuery<Post[]>({
    queryKey: ['posts', 'featured'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<Post[]>('/posts/featured');
      return data;
    },
  });
}

// ─── Create post ────────────────────────────────────────────────

export function useCreatePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      const { data } = await axiosInstance.post<Post>('/posts', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Update post ────────────────────────────────────────────────

export function useUpdatePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreatePostPayload> & { id: string }) => {
      const { data } = await axiosInstance.put<Post>(`/posts/${id}`, payload);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['posts', vars.id] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Delete post ────────────────────────────────────────────────

export function useDeletePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/posts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Toggle like ────────────────────────────────────────────────

export function useToggleLike() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await axiosInstance.post<{ liked: boolean; likeCount: number }>(
        `/posts/${postId}/like`
      );
      return data;
    },
    onSuccess: (_data, postId) => {
      qc.invalidateQueries({ queryKey: ['posts', postId] });
      // Optimistic or invalidate list
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Report post ────────────────────────────────────────────────

export function useReportPost() {
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await axiosInstance.post(`/posts/${postId}/report`);
      return data;
    },
  });
}

// ─── Vote poll ──────────────────────────────────────────────────

export function useVotePoll() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, optionIds }: { postId: string; optionIds: string[] }) => {
      const { data } = await axiosInstance.post(`/posts/${postId}/vote`, { optionIds });
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['posts', vars.postId] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Close poll ─────────────────────────────────────────────────

export function useClosePoll() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await axiosInstance.post(`/posts/${postId}/close-poll`);
      return data;
    },
    onSuccess: (_data, postId) => {
      qc.invalidateQueries({ queryKey: ['posts', postId] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Parse PDF metadata ─────────────────────────────────────────

export function useParsePdf() {
  return useMutation({
    mutationFn: async (fileUrl: string) => {
      const { data } = await axiosInstance.post<PaperMetadata>('/papers/parse-pdf', { fileUrl });
      return data;
    },
  });
}
