'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ThumbsUp, ThumbsDown, Reply, Trash2, Loader2, ChevronDown, ArrowUpDown } from 'lucide-react';
import {
  useComments,
  useReplies,
  useCreateComment,
  useDeleteComment,
  useToggleCommentLike,
  useToggleCommentDislike,
} from '@/lib/api/comments';
import type { CommentSort } from '@/lib/api/comments';
import { useAppSelector } from '@/store/hooks';
import type { Comment } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import { CommentEditor } from './comment-editor';
import DOMPurify from 'dompurify';

/**
 * MAX_DEPTH = 5 means:
 * depth 0 = root comment
 * depth 1 = 1st reply (indented)
 * depth 2 = 2nd reply (more indent)
 * depth 3 = 3rd reply
 * depth 4 = 4th reply
 * depth 5 = 5th reply (deepest indent)
 * depth 6+ = same level as 5 (flat), with @mention to show who is being replied to
 */
const MAX_DEPTH = 5;

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Main comments section ──────────────────────────────────────

export function CommentsSection({ postId, orgAccessRole = 'member' }: { postId: string; orgAccessRole?: 'member' | 'follower' | 'none' }) {
  const [sort, setSort] = useState<CommentSort>('top');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useComments(postId, sort);
  const createComment = useCreateComment();

  const allComments = data?.pages.flatMap((p) => p.comments) ?? [];

  const canComment = orgAccessRole === 'member';
  const canLike = orgAccessRole === 'member' || orgAccessRole === 'follower';

  const handleSubmit = async (html: string) => {
    await createComment.mutateAsync({ postId, body: html });
  };

  return (
    <div className="flex flex-col gap-4 px-6 pb-5">
      <Separator />
      <div className="flex items-center justify-between">
        <h4 className="text-[18px] font-semibold text-foreground">Comments</h4>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CommentSort)}
            className="rounded-md border border-border/60 bg-transparent px-2 py-1 text-[14px] text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="top">Top</option>
            <option value="new">Newest</option>
            <option value="old">Oldest</option>
          </select>
        </div>
      </div>

      {/* New comment form */}
      {canComment ? (
        <CommentEditor
          placeholder="Write a comment…"
          onSubmit={handleSubmit}
          isPending={createComment.isPending}
        />
      ) : (
        <p className="text-[16px] text-muted-foreground italic">
          {orgAccessRole === 'follower'
            ? 'Followers cannot comment on organization posts. Join the organization to comment.'
            : 'You must be a member of this organization to comment.'}
        </p>
      )}

      {/* Comment list */}
      {isLoading && <p className="text-[16px] text-muted-foreground">Loading comments…</p>}

      <div className="flex flex-col gap-4">
        {allComments.map((c) => (
          <CommentItem key={c._id} comment={c} postId={postId} depth={0} canLike={canLike} canComment={canComment} />
        ))}
      </div>

      {hasNextPage && (
        <Button
          variant="ghost"
          size="default"
          className="mx-auto gap-1.5 text-[16px]"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Load more comments
        </Button>
      )}
    </div>
  );
}

// ─── Single comment (with replies) ──────────────────────────────

function CommentItem({
  comment,
  postId,
  depth,
  canLike = true,
  canComment = true,
}: {
  comment: Comment;
  postId: string;
  depth: number;
  canLike?: boolean;
  canComment?: boolean;
}) {
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;
  const toggleLike = useToggleCommentLike();
  const toggleDislike = useToggleCommentDislike();
  const deleteComment = useDeleteComment();
  const createComment = useCreateComment();

  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const COMMENT_COLLAPSE_THRESHOLD = 300;

  // Detect if body is HTML (from TipTap editor) vs plain text (legacy)
  const isHtml = comment.body.startsWith('<');

  // For collapse: strip tags to get plain-text length  
  const plainText = isHtml ? comment.body.replace(/<[^>]*>/g, '') : comment.body;
  const isLong = plainText.length > COMMENT_COLLAPSE_THRESHOLD;

  const liked = userId ? comment.likedBy.includes(userId) : false;
  const disliked = userId ? comment.dislikedBy.includes(userId) : false;

  const authorName =
    typeof comment.authorId === 'object' ? comment.authorId.displayName : 'Unknown';
  const authorAvatar =
    typeof comment.authorId === 'object' ? comment.authorId.avatar ?? undefined : undefined;
  const isAuthor = userId && typeof comment.authorId === 'object' && comment.authorId._id === userId;

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  const fullDate = format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a');

  // At max depth, include @mention and replyToUser in the reply payload
  const isAtMaxDepth = depth >= MAX_DEPTH;

  const handleReply = async (html: string) => {
    await createComment.mutateAsync({
      postId,
      body: html,
      parentCommentId: comment._id,
      replyToUser: isAtMaxDepth ? authorName : undefined,
    });
    setShowReplyForm(false);
    setShowReplies(true);
  };

  // Like count color: positive = green, negative = red, zero = gray
  const likeCountColor =
    comment.likeCount > 0
      ? 'text-green-600'
      : comment.likeCount < 0
        ? 'text-red-500'
        : 'text-muted-foreground';

  const repliesSection = (
    <>
      {!showReplies && (
        <button
          onClick={() => setShowReplies(true)}
          className="mt-1 w-fit text-[14px] font-medium text-primary hover:underline"
        >
          View replies
        </button>
      )}
      {showReplies && (
        <RepliesList postId={postId} commentId={comment._id} depth={depth} canLike={canLike} canComment={canComment} />
      )}
    </>
  );

  return (
    <div className="flex flex-col">
      <div className="flex gap-2.5">
        <Avatar className="mt-0.5 h-9 w-9 shrink-0">
          <AvatarImage src={authorAvatar} alt={authorName} />
          <AvatarFallback className="text-[12px]">{initials(authorName)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="rounded-lg bg-muted/40 px-3.5 py-2.5 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-foreground">{authorName}</span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[13px] text-muted-foreground cursor-default">
                      {timeAgo}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {fullDate}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="mt-0.5 text-[16px] leading-relaxed text-foreground/90 break-all [overflow-wrap:anywhere]">
              {comment.replyToUser && (
                <span className="mr-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[14px] font-semibold text-primary">
                  @{comment.replyToUser}
                </span>
              )}
              {isHtml ? (
                <div
                  className="comment-body-html"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(
                      isLong && !expanded
                        ? comment.body.slice(0, comment.body.indexOf('>', COMMENT_COLLAPSE_THRESHOLD) + 1 || COMMENT_COLLAPSE_THRESHOLD) + '…'
                        : comment.body,
                      { ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br'] }
                    ),
                  }}
                />
              ) : (
                <p className="whitespace-pre-wrap">
                  {isLong && !expanded
                    ? plainText.slice(0, COMMENT_COLLAPSE_THRESHOLD) + '…'
                    : comment.body}
                </p>
              )}
              {isLong && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-0.5 text-[14px] font-medium text-primary hover:underline"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pl-1">
            {/* Like button */}
            <button
              onClick={() => canLike && toggleLike.mutate({ postId, commentId: comment._id })}
              disabled={!userId || !canLike || toggleLike.isPending}
              title={!canLike ? 'You must be a member or follower of this organization' : undefined}
              className={`flex items-center gap-1 text-[14px] font-medium transition-colors ${
                !canLike ? 'cursor-not-allowed opacity-50 text-gray-400' : liked ? 'text-green-600' : 'text-muted-foreground hover:text-green-600'
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-green-600' : ''}`} />
            </button>

            {/* Like count */}
            <span className={`min-w-[18px] text-center text-[14px] font-semibold ${likeCountColor}`}>
              {comment.likeCount}
            </span>

            {/* Dislike button */}
            <button
              onClick={() => canLike && toggleDislike.mutate({ postId, commentId: comment._id })}
              disabled={!userId || !canLike || toggleDislike.isPending}
              title={!canLike ? 'You must be a member or follower of this organization' : undefined}
              className={`flex items-center gap-1 text-[14px] font-medium transition-colors ${
                !canLike ? 'cursor-not-allowed opacity-50 text-gray-400' : disliked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
              }`}
            >
              <ThumbsDown className={`h-4 w-4 ${disliked ? 'fill-red-500' : ''}`} />
            </button>

            {canComment && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-[14px] font-medium text-muted-foreground hover:text-foreground"
              >
                Reply
              </button>
            )}
            {isAuthor && (
              <button
                onClick={() => deleteComment.mutate({ postId, commentId: comment._id })}
                className="text-[14px] font-medium text-destructive/70 hover:text-destructive"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && canComment && (
            <div className="ml-2 mt-1">
              <CommentEditor
                placeholder={isAtMaxDepth ? `Reply to @${authorName}…` : 'Write a reply…'}
                onSubmit={handleReply}
                isPending={createComment.isPending}
                submitLabel="Reply"
                minHeight="48px"
              />
            </div>
          )}

          {/* Replies — rendered inside when NOT at max depth */}
          {!isAtMaxDepth && repliesSection}
        </div>
      </div>

      {/* Replies — rendered outside (flat) when at max depth */}
      {isAtMaxDepth && repliesSection}
    </div>
  );
}

// ─── Replies for a comment ──────────────────────────────────────

function RepliesList({
  postId,
  commentId,
  depth,
  canLike = true,
  canComment = true,
}: {
  postId: string;
  commentId: string;
  depth: number;
  canLike?: boolean;
  canComment?: boolean;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useReplies(
    postId,
    commentId
  );

  const allReplies = data?.pages.flatMap((p) => p.replies) ?? [];

  if (isLoading) return <p className="ml-2 text-[14px] text-muted-foreground">Loading…</p>;
  if (!allReplies.length) return <p className="ml-2 text-[14px] text-muted-foreground">No replies yet.</p>;

  // If we haven't reached max depth, indent; otherwise, flat (same width as parent)
  const nextDepth = Math.min(depth + 1, MAX_DEPTH);
  const shouldIndent = depth < MAX_DEPTH;

  return (
    <div
      className={
        shouldIndent
          ? 'ml-3 mt-1 flex flex-col gap-3 border-l-2 border-border/40 pl-4'
          : 'mt-1 flex flex-col gap-3'
      }
    >
      {allReplies.map((r) => (
        <CommentItem key={r._id} comment={r} postId={postId} depth={nextDepth} canLike={canLike} canComment={canComment} />
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-fit text-[14px] font-medium text-primary hover:underline"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more replies'}
        </button>
      )}
    </div>
  );
}
