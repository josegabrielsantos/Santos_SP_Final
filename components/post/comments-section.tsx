'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ThumbsUp, Reply, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { useComments, useReplies, useCreateComment, useDeleteComment, useToggleCommentLike } from '@/lib/api/comments';
import { useAppSelector } from '@/store/hooks';
import type { Comment } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Main comments section ──────────────────────────────────────

export function CommentsSection({ postId }: { postId: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useComments(postId);
  const createComment = useCreateComment();
  const [newBody, setNewBody] = useState('');

  const allComments = data?.pages.flatMap((p) => p.comments) ?? [];

  const handleSubmit = async () => {
    if (!newBody.trim()) return;
    await createComment.mutateAsync({ postId, body: newBody.trim() });
    setNewBody('');
  };

  return (
    <div className="flex flex-col gap-3 px-5 pb-4">
      <Separator />
      <h4 className="text-sm font-semibold text-foreground">Comments</h4>

      {/* New comment form */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Write a comment…"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          className="min-h-[60px] flex-1 resize-none text-sm"
        />
        <Button
          size="sm"
          className="self-end"
          onClick={handleSubmit}
          disabled={!newBody.trim() || createComment.isPending}
        >
          {createComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
        </Button>
      </div>

      {/* Comment list */}
      {isLoading && <p className="text-xs text-muted-foreground">Loading comments…</p>}

      <div className="flex flex-col gap-3">
        {allComments.map((c) => (
          <CommentItem key={c._id} comment={c} postId={postId} />
        ))}
      </div>

      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mx-auto gap-1.5 text-xs"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          Load more comments
        </Button>
      )}
    </div>
  );
}

// ─── Single comment (with replies) ──────────────────────────────

function CommentItem({ comment, postId }: { comment: Comment; postId: string }) {
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;
  const toggleLike = useToggleCommentLike();
  const deleteComment = useDeleteComment();
  const createComment = useCreateComment();

  const [showReplies, setShowReplies] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);

  const liked = userId ? comment.likedBy.includes(userId) : false;

  const authorName =
    typeof comment.authorId === 'object' ? comment.authorId.displayName : 'Unknown';
  const authorAvatar =
    typeof comment.authorId === 'object' ? comment.authorId.avatar ?? undefined : undefined;
  const isAuthor = userId && typeof comment.authorId === 'object' && comment.authorId._id === userId;

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    await createComment.mutateAsync({
      postId,
      body: replyBody.trim(),
      parentCommentId: comment._id,
    });
    setReplyBody('');
    setShowReplyForm(false);
    setShowReplies(true);
  };

  return (
    <div className="flex gap-2">
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <AvatarImage src={authorAvatar} alt={authorName} />
        <AvatarFallback className="text-[10px]">{initials(authorName)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <span className="text-xs font-semibold text-foreground">{authorName}</span>
          <p className="text-sm text-foreground/90">{comment.body}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pl-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          <button
            onClick={() => toggleLike.mutate({ postId, commentId: comment._id })}
            disabled={!userId}
            className={`text-[11px] font-medium ${liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {comment.likeCount > 0 ? `${comment.likeCount} ` : ''}Like
          </button>
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            Reply
          </button>
          {isAuthor && (
            <button
              onClick={() => deleteComment.mutate({ postId, commentId: comment._id })}
              className="text-[11px] font-medium text-destructive/70 hover:text-destructive"
            >
              Delete
            </button>
          )}
        </div>

        {/* Reply form */}
        {showReplyForm && (
          <div className="ml-2 mt-1 flex gap-2">
            <Textarea
              placeholder="Write a reply…"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              className="min-h-[40px] flex-1 resize-none text-xs"
            />
            <Button
              size="sm"
              className="self-end text-xs"
              onClick={handleReply}
              disabled={!replyBody.trim() || createComment.isPending}
            >
              Reply
            </Button>
          </div>
        )}

        {/* Replies */}
        {!comment.parentId && (
          <>
            {!showReplies && (
              <button
                onClick={() => setShowReplies(true)}
                className="mt-1 w-fit text-[11px] font-medium text-primary hover:underline"
              >
                View replies
              </button>
            )}
            {showReplies && <RepliesList postId={postId} commentId={comment._id} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Replies for a comment ──────────────────────────────────────

function RepliesList({ postId, commentId }: { postId: string; commentId: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useReplies(
    postId,
    commentId
  );

  const allReplies = data?.pages.flatMap((p) => p.replies) ?? [];

  if (isLoading) return <p className="ml-2 text-[11px] text-muted-foreground">Loading…</p>;
  if (!allReplies.length) return <p className="ml-2 text-[11px] text-muted-foreground">No replies yet.</p>;

  return (
    <div className="ml-2 mt-1 flex flex-col gap-2 border-l-2 border-border/40 pl-3">
      {allReplies.map((r) => (
        <CommentItem key={r._id} comment={r} postId={postId} />
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-fit text-[11px] font-medium text-primary hover:underline"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more replies'}
        </button>
      )}
    </div>
  );
}
