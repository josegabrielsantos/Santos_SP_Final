import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type { Comment, CommentsResponse, RepliesResponse } from '@/lib/types';

// ─── Get top-level comments (cursor-based) ──────────────────────

export function useComments(postId: string | undefined) {
  return useInfiniteQuery<CommentsResponse>({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string | number> = { limit: 20 };
      if (pageParam) params.cursor = pageParam as string;
      const { data } = await axiosInstance.get<CommentsResponse>(
        `/posts/${postId}/comments`,
        { params }
      );
      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!postId,
  });
}

// ─── Get replies (cursor-based, oldest first) ───────────────────

export function useReplies(postId: string | undefined, commentId: string | undefined) {
  return useInfiniteQuery<RepliesResponse>({
    queryKey: ['replies', postId, commentId],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string | number> = { limit: 10 };
      if (pageParam) params.cursor = pageParam as string;
      const { data } = await axiosInstance.get<RepliesResponse>(
        `/posts/${postId}/comments/${commentId}/replies`,
        { params }
      );
      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!postId && !!commentId,
  });
}

// ─── Create comment / reply ─────────────────────────────────────

export function useCreateComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      body,
      parentCommentId,
    }: {
      postId: string;
      body: string;
      parentCommentId?: string;
    }) => {
      const { data } = await axiosInstance.post<Comment>(`/posts/${postId}/comments`, {
        body,
        parentCommentId,
      });
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.postId] });
      if (vars.parentCommentId) {
        qc.invalidateQueries({ queryKey: ['replies', vars.postId, vars.parentCommentId] });
      }
      // Bump comment count on the post
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Delete comment ─────────────────────────────────────────────

export function useDeleteComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      await axiosInstance.delete(`/posts/${postId}/comments/${commentId}`);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.postId] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Toggle comment like ────────────────────────────────────────

export function useToggleCommentLike() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      const { data } = await axiosInstance.post<{ liked: boolean; likeCount: number }>(
        `/posts/${postId}/comments/${commentId}/like`
      );
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.postId] });
    },
  });
}
