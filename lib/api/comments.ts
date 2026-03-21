import { useMutation, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { useAppSelector } from '@/store/hooks';
import { AxiosError } from 'axios';
import type { Comment, CommentsResponse, RepliesResponse, Post } from '@/lib/types';

// ─── Helpers: patch a comment by id across all infinite-query pages ──

function patchCommentsPages(
  pages: CommentsResponse[],
  commentId: string,
  updater: (c: Comment) => Comment,
): CommentsResponse[] {
  return pages.map((page) => ({
    ...page,
    comments: page.comments.map((c) => (c._id === commentId ? updater(c) : c)),
  }));
}

function patchRepliesPages(
  pages: RepliesResponse[],
  commentId: string,
  updater: (c: Comment) => Comment,
): RepliesResponse[] {
  return pages.map((page) => ({
    ...page,
    replies: page.replies.map((c) => (c._id === commentId ? updater(c) : c)),
  }));
}

export type CommentSort = 'top' | 'new' | 'old';

// ─── Get top-level comments (page-based, sortable) ─────────────

export function useComments(postId: string | undefined, sort: CommentSort = 'top') {
  return useInfiniteQuery<CommentsResponse>({
    queryKey: ['comments', postId, sort],
    queryFn: async ({ pageParam }) => {
      const page = (pageParam as number) ?? 1;
      const params: Record<string, string | number> = { limit: 20, page, sort };
      const { data } = await axiosInstance.get<CommentsResponse>(
        `/posts/${postId}/comments`,
        { params }
      );
      return data;
    },
    initialPageParam: 1 as number,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: !!postId,
  });
}

// ─── Get replies (page-based, sortable) ─────────────────────────

export function useReplies(postId: string | undefined, commentId: string | undefined, sort: CommentSort = 'top') {
  return useInfiniteQuery<RepliesResponse>({
    queryKey: ['replies', postId, commentId, sort],
    queryFn: async ({ pageParam }) => {
      const page = (pageParam as number) ?? 1;
      const params: Record<string, string | number> = { limit: 20, page, sort };
      const { data } = await axiosInstance.get<RepliesResponse>(
        `/posts/${postId}/comments/${commentId}/replies`,
        { params }
      );
      return data;
    },
    initialPageParam: 1 as number,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
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
      replyToUser,
    }: {
      postId: string;
      body: string;
      parentCommentId?: string;
      replyToUser?: string;
    }) => {
      const { data } = await axiosInstance.post<Comment>(`/posts/${postId}/comments`, {
        body,
        parentCommentId,
        replyToUser,
      });
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.postId] });
      if (vars.parentCommentId) {
        qc.invalidateQueries({ queryKey: ['replies', vars.postId, vars.parentCommentId] });
      }
      // Bump comment count on the post
      qc.invalidateQueries({ queryKey: ['posts', vars.postId] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (err) => {
      const msg = err instanceof AxiosError ? (err.response?.data as { error?: string })?.error : undefined;
      if (msg) alert(msg);
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
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['comments', vars.postId] });
      await qc.cancelQueries({ queryKey: ['replies'] });

      const commentsSnap = qc.getQueriesData<InfiniteData<CommentsResponse>>({ queryKey: ['comments', vars.postId] });
      const repliesSnap = qc.getQueriesData<InfiniteData<RepliesResponse>>({ queryKey: ['replies'] });

      // Optimistically mark as deleted (hide from UI)
      const markDeleted = (c: Comment) => ({ ...c, isDeleted: true, body: '[deleted]' });

      qc.setQueriesData<InfiniteData<CommentsResponse>>(
        { queryKey: ['comments', vars.postId] },
        (old) => old ? { ...old, pages: patchCommentsPages(old.pages, vars.commentId, markDeleted) } : old,
      );
      qc.setQueriesData<InfiniteData<RepliesResponse>>(
        { queryKey: ['replies'] },
        (old) => old ? { ...old, pages: patchRepliesPages(old.pages, vars.commentId, markDeleted) } : old,
      );

      // Also optimistically decrement post commentCount
      const postSnap = qc.getQueryData<Post>(['posts', vars.postId]);
      if (postSnap) {
        qc.setQueryData<Post>(['posts', vars.postId], { ...postSnap, commentCount: Math.max(0, postSnap.commentCount - 1) });
      }

      return { commentsSnap, repliesSnap, postSnap };
    },
    onError: (err, vars, ctx) => {
      ctx?.commentsSnap?.forEach(([key, data]) => data && qc.setQueryData(key, data));
      ctx?.repliesSnap?.forEach(([key, data]) => data && qc.setQueryData(key, data));
      if (ctx?.postSnap) qc.setQueryData(['posts', vars.postId], ctx.postSnap);
      const msg = err instanceof AxiosError ? (err.response?.data as { error?: string })?.error : undefined;
      if (msg) alert(msg);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.postId] });
      qc.invalidateQueries({ queryKey: ['replies'] });
      qc.invalidateQueries({ queryKey: ['posts', vars.postId] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ─── Toggle comment like ────────────────────────────────────────

export function useToggleCommentLike() {
  const qc = useQueryClient();
  const userId = useAppSelector((s) => s.auth.user?._id);

  return useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      const { data } = await axiosInstance.post<{ liked: boolean; disliked: boolean; likeCount: number }>(
        `/posts/${postId}/comments/${commentId}/like`
      );
      return data;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['comments', vars.postId] });
      await qc.cancelQueries({ queryKey: ['replies'] });

      // Snapshot
      const commentsSnap = qc.getQueriesData<InfiniteData<CommentsResponse>>({ queryKey: ['comments', vars.postId] });
      const repliesSnap = qc.getQueriesData<InfiniteData<RepliesResponse>>({ queryKey: ['replies'] });

      if (userId) {
        const update = (c: Comment) => {
          const alreadyLiked = c.likedBy.includes(userId);
          const newLikedBy = alreadyLiked ? c.likedBy.filter((id) => id !== userId) : [...c.likedBy, userId];
          const newDislikedBy = alreadyLiked ? c.dislikedBy : c.dislikedBy.filter((id) => id !== userId);
          return { ...c, likedBy: newLikedBy, dislikedBy: newDislikedBy, likeCount: newLikedBy.length - newDislikedBy.length };
        };

        qc.setQueriesData<InfiniteData<CommentsResponse>>(
          { queryKey: ['comments', vars.postId] },
          (old) => old ? { ...old, pages: patchCommentsPages(old.pages, vars.commentId, update) } : old,
        );
        qc.setQueriesData<InfiniteData<RepliesResponse>>(
          { queryKey: ['replies'] },
          (old) => old ? { ...old, pages: patchRepliesPages(old.pages, vars.commentId, update) } : old,
        );
      }
      return { commentsSnap, repliesSnap };
    },
    onError: (err, vars, ctx) => {
      // Rollback
      ctx?.commentsSnap?.forEach(([key, data]) => data && qc.setQueryData(key, data));
      ctx?.repliesSnap?.forEach(([key, data]) => data && qc.setQueryData(key, data));
      const msg = err instanceof AxiosError ? (err.response?.data as { error?: string })?.error : undefined;
      if (msg) alert(msg);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.postId] });
      qc.invalidateQueries({ queryKey: ['replies'] });
    },
  });
}

// ─── Toggle comment dislike ─────────────────────────────────────

export function useToggleCommentDislike() {
  const qc = useQueryClient();
  const userId = useAppSelector((s) => s.auth.user?._id);

  return useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      const { data } = await axiosInstance.post<{ liked: boolean; disliked: boolean; likeCount: number }>(
        `/posts/${postId}/comments/${commentId}/dislike`
      );
      return data;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['comments', vars.postId] });
      await qc.cancelQueries({ queryKey: ['replies'] });

      const commentsSnap = qc.getQueriesData<InfiniteData<CommentsResponse>>({ queryKey: ['comments', vars.postId] });
      const repliesSnap = qc.getQueriesData<InfiniteData<RepliesResponse>>({ queryKey: ['replies'] });

      if (userId) {
        const update = (c: Comment) => {
          const alreadyDisliked = c.dislikedBy.includes(userId);
          const newDislikedBy = alreadyDisliked ? c.dislikedBy.filter((id) => id !== userId) : [...c.dislikedBy, userId];
          const newLikedBy = alreadyDisliked ? c.likedBy : c.likedBy.filter((id) => id !== userId);
          return { ...c, likedBy: newLikedBy, dislikedBy: newDislikedBy, likeCount: newLikedBy.length - newDislikedBy.length };
        };

        qc.setQueriesData<InfiniteData<CommentsResponse>>(
          { queryKey: ['comments', vars.postId] },
          (old) => old ? { ...old, pages: patchCommentsPages(old.pages, vars.commentId, update) } : old,
        );
        qc.setQueriesData<InfiniteData<RepliesResponse>>(
          { queryKey: ['replies'] },
          (old) => old ? { ...old, pages: patchRepliesPages(old.pages, vars.commentId, update) } : old,
        );
      }
      return { commentsSnap, repliesSnap };
    },
    onError: (err, vars, ctx) => {
      ctx?.commentsSnap?.forEach(([key, data]) => data && qc.setQueryData(key, data));
      ctx?.repliesSnap?.forEach(([key, data]) => data && qc.setQueryData(key, data));
      const msg = err instanceof AxiosError ? (err.response?.data as { error?: string })?.error : undefined;
      if (msg) alert(msg);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.postId] });
      qc.invalidateQueries({ queryKey: ['replies'] });
    },
  });
}
