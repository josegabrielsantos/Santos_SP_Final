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
import Link from 'next/link';
import { ThumbsUp, ThumbsDown, Reply, Trash2, Loader2, ChevronDown, ArrowUpDown, EyeOff, Eye, ShieldAlert, Pencil } from 'lucide-react';
import {
  useComments,
  useReplies,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useToggleCommentLike,
  useToggleCommentDislike,
} from '@/lib/api/comments';
import { useAdminToggleHideComment, useAdminDeleteComment } from '@/lib/api/admin';
import type { CommentSort } from '@/lib/api/comments';
import { useAppSelector } from '@/store/hooks';
import { useJoinRoom, useSocketEvent } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import type { Comment } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import { CommentEditor } from './comment-editor';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

export function CommentsSection({ postId, orgAccessRole = 'member', commentCount, isOrgAdmin = false }: { postId: string; orgAccessRole?: 'member' | 'follower' | 'none'; commentCount?: number; isOrgAdmin?: boolean }) {
  const [sort, setSort] = useState<CommentSort>('top');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useComments(postId, sort);
  const createComment = useCreateComment();
  const user = useAppSelector((s) => s.auth.user);

  const queryClient = useQueryClient();

  // Join post room for real-time comment updates
  useJoinRoom(postId ? `post:${postId}` : null);

  // New comment by another user
  useSocketEvent<{ postId: string; commentId: string; parentId: string | null; authorId: string }>(
    'comment:new',
    (ev) => {
      if (ev.postId !== postId || ev.authorId === user?._id) return;
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      if (ev.parentId) queryClient.invalidateQueries({ queryKey: ['replies', postId, ev.parentId] });
      queryClient.invalidateQueries({ queryKey: ['posts', postId] });
    }
  );

  // Comment deleted
  useSocketEvent<{ postId: string }>('comment:deleted', (ev) => {
    if (ev.postId !== postId) return;
    queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    queryClient.invalidateQueries({ queryKey: ['replies', postId] });
    queryClient.invalidateQueries({ queryKey: ['posts', postId] });
  });

  // Comment like/dislike updated
  useSocketEvent<{ postId: string; authorId: string }>('comment:updated', (ev) => {
    if (ev.postId !== postId || ev.authorId === user?._id) return;
    queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    queryClient.invalidateQueries({ queryKey: ['replies', postId] });
  });

  const allComments = data?.pages.flatMap((p) => p.comments) ?? [];

  const canComment = orgAccessRole === 'member';
  const canLike = orgAccessRole === 'member' || orgAccessRole === 'follower';

  const handleSubmit = async (html: string) => {
    await createComment.mutateAsync({ postId, body: html });
  };

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <div className="flex items-center justify-between">
        <h4 className="font-heading text-[15px] font-semibold text-foreground">
          Discussion{commentCount !== undefined ? ` (${commentCount})` : ''}
        </h4>
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
        <div className="flex gap-3">
          <Avatar className="mt-1 h-8 w-8 shrink-0">
            <AvatarImage src={user?.avatar ?? undefined} alt={user?.displayName ?? ''} />
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {user?.displayName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CommentEditor
              placeholder="Write a comment…"
              onSubmit={handleSubmit}
              isPending={createComment.isPending}
            />
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground italic">
          {orgAccessRole === 'follower'
            ? 'Followers cannot comment. Join the organization to participate in discussions.'
            : 'You must be a member of this organization to comment.'}
        </p>
      )}

      {/* Comment list */}
      {isLoading && <p className="text-[13px] text-muted-foreground">Loading comments…</p>}

      <div className="flex flex-col gap-4">
        {allComments.map((c) => (
          <CommentItem key={c._id} comment={c} postId={postId} depth={0} canLike={canLike} canComment={canComment} isOrgAdmin={isOrgAdmin} />
        ))}
      </div>

      {hasNextPage && (
        <Button
          variant="ghost"
          size="default"
          className="mx-auto gap-1.5 text-[13px]"
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
  isOrgAdmin = false,
}: {
  comment: Comment;
  postId: string;
  depth: number;
  canLike?: boolean;
  canComment?: boolean;
  isOrgAdmin?: boolean;
}) {
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;
  const toggleLike = useToggleCommentLike();
  const toggleDislike = useToggleCommentDislike();
  const deleteComment = useDeleteComment();
  const updateComment = useUpdateComment();
  const createComment = useCreateComment();
  const adminHideComment = useAdminToggleHideComment();
  const adminDeleteComment = useAdminDeleteComment();
  const isWebsiteAdmin = user?.role === 'website_admin';
  const canModerate = isWebsiteAdmin || isOrgAdmin;

  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAdminDeleteDialog, setShowAdminDeleteDialog] = useState(false);

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
  const commentAuthorId =
    typeof comment.authorId === 'object' ? comment.authorId._id : null;
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
        <RepliesList postId={postId} commentId={comment._id} depth={depth} canLike={canLike} canComment={canComment} isOrgAdmin={isOrgAdmin} />
      )}
    </>
  );

  return (
    <div className="flex flex-col">
      <div className="flex gap-2.5">
        <Avatar className="mt-0.5 h-8 w-8 shrink-0">
          <AvatarImage src={authorAvatar} alt={authorName} />
          <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">{initials(authorName)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              {commentAuthorId ? (
                <Link href={`/profile/${commentAuthorId}`} className="text-[13px] font-semibold text-foreground hover:underline">
                  {authorName}
                </Link>
              ) : (
                <span className="text-[13px] font-semibold text-foreground">{authorName}</span>
              )}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[12px] text-muted-foreground cursor-default">
                      {timeAgo}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {fullDate}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {comment.isEdited && (
                <span className="text-[11px] text-muted-foreground italic">(edited)</span>
              )}
              {comment.isHidden && canModerate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600 border border-orange-200/60">
                  <EyeOff className="h-3 w-3" /> Hidden
                </span>
              )}
            </div>
            {showEditForm ? (
              <div className="mt-1">
                <CommentEditor
                  placeholder="Edit your comment…"
                  initialContent={comment.body}
                  onSubmit={async (html) => {
                    await updateComment.mutateAsync({ postId, commentId: comment._id, body: html });
                    setShowEditForm(false);
                  }}
                  onCancel={() => setShowEditForm(false)}
                  isPending={updateComment.isPending}
                  submitLabel="Save"
                  minHeight="48px"
                />
              </div>
            ) : (
              <div className="mt-1 text-[14px] leading-relaxed text-foreground/90 break-all [overflow-wrap:anywhere]">
                {comment.replyToUser && (
                  <span className="mr-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[12px] font-semibold text-primary">
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
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pl-0.5">
            {/* Like button */}
            <button
              onClick={() => canLike && toggleLike.mutate({ postId, commentId: comment._id })}
              disabled={!userId || !canLike || toggleLike.isPending}
              title={!canLike ? 'You must be a member or follower of this organization' : undefined}
              className={`flex items-center gap-1 text-[12px] font-medium transition-colors ${
                !canLike ? 'cursor-not-allowed opacity-50 text-gray-400' : liked ? 'text-green-600' : 'text-muted-foreground hover:text-green-600'
              }`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${liked ? 'fill-green-600' : ''}`} />
            </button>

            {/* Like count */}
            <span className={`min-w-[14px] text-center text-[12px] font-semibold ${likeCountColor}`}>
              {comment.likeCount}
            </span>

            {/* Dislike button */}
            <button
              onClick={() => canLike && toggleDislike.mutate({ postId, commentId: comment._id })}
              disabled={!userId || !canLike || toggleDislike.isPending}
              title={!canLike ? 'You must be a member or follower of this organization' : undefined}
              className={`flex items-center gap-1 text-[12px] font-medium transition-colors ${
                !canLike ? 'cursor-not-allowed opacity-50 text-gray-400' : disliked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
              }`}
            >
              <ThumbsDown className={`h-3.5 w-3.5 ${disliked ? 'fill-red-500' : ''}`} />
            </button>

            {canComment && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                Reply
              </button>
            )}
            {isAuthor && !comment.isDeleted && (
              <button
                onClick={() => { setShowEditForm(!showEditForm); setShowReplyForm(false); }}
                className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                Edit
              </button>
            )}
            {isAuthor && (
              <button
                onClick={() => deleteComment.mutate({ postId, commentId: comment._id })}
                className="text-[12px] font-medium text-destructive/70 hover:text-destructive"
              >
                Delete
              </button>
            )}
            {canModerate && !isAuthor && (
              <>
                <button
                  onClick={() => adminHideComment.mutate({ commentId: comment._id })}
                  className="flex items-center gap-1 text-[12px] font-medium text-orange-500/70 hover:text-orange-600"
                  title={comment.isHidden ? 'Unhide this comment' : 'Hide this comment'}
                >
                  {comment.isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {comment.isHidden ? 'Unhide' : 'Hide'}
                </button>
                <button
                  onClick={() => setShowAdminDeleteDialog(true)}
                  className="flex items-center gap-1 text-[12px] font-medium text-destructive/70 hover:text-destructive"
                  title="Delete this comment (Admin)"
                >
                  <ShieldAlert className="h-3 w-3" />
                  Delete
                </button>
              </>
            )}
          </div>

          {/* Admin delete comment dialog */}
          <CommentDeleteDialog
            open={showAdminDeleteDialog}
            onOpenChange={setShowAdminDeleteDialog}
            onConfirm={async (reason) => {
              await adminDeleteComment.mutateAsync({ commentId: comment._id, reason });
            }}
          />

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
  isOrgAdmin = false,
}: {
  postId: string;
  commentId: string;
  depth: number;
  canLike?: boolean;
  canComment?: boolean;
  isOrgAdmin?: boolean;
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
        <CommentItem key={r._id} comment={r} postId={postId} depth={nextDepth} canLike={canLike} canComment={canComment} isOrgAdmin={isOrgAdmin} />
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

// ─── Admin delete comment confirmation dialog ────────────────────

function CommentDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm(reason || undefined);
      onOpenChange(false);
      setReason('');
    } catch {
      // error handled by mutation
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) setReason(''); onOpenChange(v); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This comment will be removed and replaced with &ldquo;[deleted by admin]&rdquo;. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">
            Reason (optional)
          </label>
          <Input
            placeholder="Reason for deletion…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-9 text-[14px] bg-white border-border/60"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Deleting…' : 'Delete Comment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
