import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { useAppSelector } from '@/store/hooks';
import { AxiosError } from 'axios';
import type {
  Post,
  PostsResponse,
  CreatePostPayload,
  PaperMetadata,
  UserSummary,
} from '@/lib/types';

// ─── Helper: optimistically patch a Post inside every matching query cache ──

function patchPostInCache(
  qc: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (p: Post) => Post,
) {
  // Patch single-post query
  qc.setQueryData<Post>(['posts', postId], (old) => (old ? updater(old) : old));

  // Patch every PostsResponse list query (home feed, org posts, user posts …)
  qc.setQueriesData<PostsResponse>(
    { queryKey: ['posts'], exact: false },
    (old) => {
      if (!old?.posts) return old;
      return { ...old, posts: old.posts.map((p) => (p._id === postId ? updater(p) : p)) };
    },
  );

  // Also patch organization post lists
  qc.setQueriesData<PostsResponse>(
    { queryKey: ['organizations'], exact: false },
    (old) => {
      if (!old?.posts) return old;
      return { ...old, posts: old.posts.map((p) => (p._id === postId ? updater(p) : p)) };
    },
  );
}

// ─── Get paginated posts (public feed) ──────────────────────────

export function usePosts(params?: { page?: number; limit?: number; tag?: string; type?: string; sort?: 'hot' | 'new' | 'top' }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const sort = params?.sort ?? 'hot';

  return useQuery<PostsResponse>({
    queryKey: ['posts', { page, limit, tag: params?.tag, type: params?.type, sort }],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PostsResponse>('/posts', {
        params: { page, limit, tag: params?.tag, type: params?.type, sort },
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
  const user = useAppSelector((s) => s.auth.user);

  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      const { data } = await axiosInstance.post<Post>('/posts', payload);
      return data;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['posts'] });

      // Snapshot all posts queries for rollback
      const previousQueries = qc.getQueriesData<PostsResponse>({ queryKey: ['posts'], exact: false });

      // Build a temporary optimistic post
      if (user) {
        const tempId = `optimistic-${Date.now()}`;
        const optimisticPost: Post = {
          _id: tempId,
          title: payload.title || '',
          body: payload.body ?? null,
          bodyText: payload.bodyText || '',
          tags: payload.tags || [],
          authorId: { _id: user._id, displayName: user.displayName, avatar: user.avatar } as UserSummary,
          organizationId: null,
          status: 'published',
          likeCount: 0,
          commentCount: 0,
          likedBy: [],
          dislikedBy: [],
          mediaUrls: payload.mediaUrls || [],
          paperIds: [],
          poll: null,
          paperMetadata: payload.paperMetadata || null,
          type: payload.type || 'post',
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Insert at the top of every PostsResponse list
        qc.setQueriesData<PostsResponse>(
          { queryKey: ['posts'], exact: false },
          (old) => {
            if (!old?.posts) return old;
            return { ...old, posts: [optimisticPost, ...old.posts], total: old.total + 1 };
          },
        );
      }

      return { previousQueries };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback to previous state
      if (ctx?.previousQueries) {
        for (const [queryKey, data] of ctx.previousQueries) {
          qc.setQueryData(queryKey, data);
        }
      }
      const msg = _err instanceof AxiosError ? (_err.response?.data as { error?: string })?.error : 'Failed to create post. Please try again.';
      alert(msg || 'Failed to create post. Please try again.');
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      if (vars.organizationId) {
        qc.invalidateQueries({ queryKey: ['organizations'] });
      }
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
  const userId = useAppSelector((s) => s.auth.user?._id);

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await axiosInstance.post<{ liked: boolean; likeCount: number }>(
        `/posts/${postId}/like`
      );
      return data;
    },
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: ['posts'] });
      const snapshot = qc.getQueryData<Post>(['posts', postId]);
      if (userId) {
        patchPostInCache(qc, postId, (p) => {
          const alreadyLiked = p.likedBy.includes(userId);
          const newLikedBy = alreadyLiked
            ? p.likedBy.filter((id) => id !== userId)
            : [...p.likedBy, userId];
          const newDislikedBy = alreadyLiked
            ? p.dislikedBy
            : p.dislikedBy.filter((id) => id !== userId);
          return {
            ...p,
            likedBy: newLikedBy,
            dislikedBy: newDislikedBy,
            likeCount: newLikedBy.length - newDislikedBy.length,
          };
        });
      }
      return { snapshot };
    },
    onError: (err, postId, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(['posts', postId], ctx.snapshot);
      qc.invalidateQueries({ queryKey: ['posts'] });
      const msg = err instanceof AxiosError ? (err.response?.data as { error?: string })?.error : undefined;
      if (msg) alert(msg);
    },
    onSettled: (_data, _err, postId) => {
      qc.invalidateQueries({ queryKey: ['posts', postId] });
      qc.invalidateQueries({ queryKey: ['posts', 'recommended'] });
    },
  });
}

// ─── Toggle dislike ─────────────────────────────────────────────

export function useTogglePostDislike() {
  const qc = useQueryClient();
  const userId = useAppSelector((s) => s.auth.user?._id);

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await axiosInstance.post<{ liked: boolean; disliked: boolean; likeCount: number }>(
        `/posts/${postId}/dislike`
      );
      return data;
    },
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: ['posts'] });
      const snapshot = qc.getQueryData<Post>(['posts', postId]);
      if (userId) {
        patchPostInCache(qc, postId, (p) => {
          const alreadyDisliked = p.dislikedBy.includes(userId);
          const newDislikedBy = alreadyDisliked
            ? p.dislikedBy.filter((id) => id !== userId)
            : [...p.dislikedBy, userId];
          const newLikedBy = alreadyDisliked
            ? p.likedBy
            : p.likedBy.filter((id) => id !== userId);
          return {
            ...p,
            likedBy: newLikedBy,
            dislikedBy: newDislikedBy,
            likeCount: newLikedBy.length - newDislikedBy.length,
          };
        });
      }
      return { snapshot };
    },
    onError: (err, postId, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(['posts', postId], ctx.snapshot);
      qc.invalidateQueries({ queryKey: ['posts'] });
      const msg = err instanceof AxiosError ? (err.response?.data as { error?: string })?.error : undefined;
      if (msg) alert(msg);
    },
    onSettled: (_data, _err, postId) => {
      qc.invalidateQueries({ queryKey: ['posts', postId] });
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

// ─── Recommended posts (For You feed) ──────────────────────────

export function useRecommendedPosts(enabled = true) {
  return useQuery<{ posts: Post[]; isPersonalized: boolean }>({
    queryKey: ['posts', 'recommended'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/recommendations/posts');
      return data;
    },
    staleTime: 10 * 60 * 1000,   // 10 min — matches backend cache TTL
    gcTime: 15 * 60 * 1000,       // keep in memory 15 min after unmount
    refetchOnWindowFocus: false,   // switching tabs shouldn't re-fetch the feed
    enabled,
  });
}

// ─── Parse PDF metadata ─────────────────────────────────────────

export function useParsePdf() {
  return useMutation({
    mutationFn: async (fileUrl: string) => {
      const { data } = await axiosInstance.post<PaperMetadata>('/papers/parse-pdf', { fileUrl }, { timeout: 120000 });
      return data;
    },
  });
}
