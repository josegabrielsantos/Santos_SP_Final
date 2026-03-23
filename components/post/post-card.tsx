'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  MoreHorizontal,
  EyeOff,
  Flag,
  Bookmark,
  BarChart3,
  Check,
  FileText,
  Lock,
  Download,
  ExternalLink,
  Link2,
  Eye,
  Trash2,
  Share2,
} from 'lucide-react';
import Link from 'next/link';
import { useToggleLike, useTogglePostDislike, useVotePoll, useReportPost, useClosePoll, useDeletePost } from '@/lib/api/posts';
import { useAdminToggleHidePost, useAdminDeletePost } from '@/lib/api/admin';
import { useDownloadPaper } from '@/lib/api/papers';
import { useAppSelector } from '@/store/hooks';
import { useViewTracking } from '@/hooks/useViewTracking';
import type { Post } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import { MediaGallery } from './media-gallery';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ShieldAlert } from 'lucide-react';
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

// ─── Tag color system ──────────────────────────────────────────

const TAG_COLORS = [
  'bg-blue-50 text-blue-700 border border-blue-200/60',
  'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  'bg-violet-50 text-violet-700 border border-violet-200/60',
  'bg-amber-50 text-amber-700 border border-amber-200/60',
  'bg-rose-50 text-rose-700 border border-rose-200/60',
  'bg-cyan-50 text-cyan-700 border border-cyan-200/60',
  'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/60',
  'bg-lime-50 text-lime-700 border border-lime-200/60',
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getFileName(url: string) {
  try {
    const parts = url.split('/');
    const name = decodeURIComponent(parts[parts.length - 1]);
    return name.replace(/^[a-f0-9-]{36}_/i, '');
  } catch {
    return 'document.pdf';
  }
}

// ─── Type badge helper ─────────────────────────────────────────

function PostTypeBadge({ type }: { type: string }) {
  if (type === 'announcement') {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium px-2 py-0">
        Announcement
      </Badge>
    );
  }
  if (type === 'poll') {
    return (
      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium px-2 py-0">
        Poll
      </Badge>
    );
  }
  if (type === 'update') {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium px-2 py-0">
        Update
      </Badge>
    );
  }
  return null;
}

// ─── Authors display (single line, full width, et al. on overflow) ──

function AuthorsDisplay({ authors }: { authors: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(authors.length);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container || authors.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const style = getComputedStyle(container);
    ctx.font = `500 ${style.fontSize} ${style.fontFamily}`;

    const containerWidth = container.clientWidth;
    const etAlWidth = ctx.measureText(', et al.').width;

    const fullText = authors.join(', ');
    if (ctx.measureText(fullText).width <= containerWidth) {
      setVisibleCount(authors.length);
      return;
    }

    const availableWidth = containerWidth - etAlWidth - 4;
    let text = '';
    let count = 0;
    for (let i = 0; i < authors.length; i++) {
      const next = i === 0 ? authors[i] : text + ', ' + authors[i];
      if (ctx.measureText(next).width > availableWidth) break;
      text = next;
      count = i + 1;
    }

    setVisibleCount(Math.max(1, count));
  }, [authors]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [measure]);

  if (!authors || authors.length === 0) return null;

  const visible = authors.slice(0, visibleCount);
  const remaining = authors.slice(visibleCount);

  return (
    <div ref={containerRef} className="w-full overflow-hidden whitespace-nowrap text-[14px] text-muted-foreground">
      {visible.map((author, idx) => (
        <span key={idx}>
          <span className="font-medium text-foreground/70">{author}</span>
          {idx < visible.length - 1 && <span>, </span>}
        </span>
      ))}
      {remaining.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-pointer font-medium text-primary hover:underline">
                , et al.
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="flex flex-col gap-0.5 text-sm">
                {remaining.map((author, idx) => (
                  <span key={idx}>{author}</span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ─── Download helper (cross-origin safe) ────────────────────────

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Use an anchor with download attribute as last resort
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

interface PostCardProps {
  post: Post;
  orgAccessRole?: 'member' | 'follower' | 'none';
  isOrgAdmin?: boolean;
}

export function PostCard({ post, orgAccessRole = 'member', isOrgAdmin = false }: PostCardProps) {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;

  const toggleLike = useToggleLike();
  const toggleDislike = useTogglePostDislike();
  const votePoll = useVotePoll();
  const reportPost = useReportPost();
  const closePoll = useClosePoll();
  const deletePost = useDeletePost();
  const downloadPaperMutation = useDownloadPaper();
  const adminHidePost = useAdminToggleHidePost();
  const adminDeletePost = useAdminDeletePost();

  const liked = userId ? post.likedBy.includes(userId) : false;
  const disliked = userId ? post.dislikedBy.includes(userId) : false;

  const canLike = orgAccessRole === 'member' || orgAccessRole === 'follower';
  const canComment = orgAccessRole === 'member';
  const isWebsiteAdmin = user?.role === 'website_admin';
  const canModeratePost = isWebsiteAdmin || isOrgAdmin;

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdminHideConfirm, setShowAdminHideConfirm] = useState(false);
  const [showAdminDeleteConfirm, setShowAdminDeleteConfirm] = useState(false);

  const authorName =
    typeof post.authorId === 'object' ? post.authorId.displayName : 'Unknown';
  const authorAvatar =
    typeof post.authorId === 'object' ? post.authorId.avatar ?? undefined : undefined;
  const authorId =
    typeof post.authorId === 'object' ? post.authorId._id : '';
  const orgName =
    typeof post.organizationId === 'object' && post.organizationId
      ? post.organizationId.name
      : undefined;

  const timeAgo = post.publishedAt
    ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
    : formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  const isPollClosed =
    post.poll?.isClosed ||
    (post.poll?.closesAt ? new Date() > new Date(post.poll.closesAt) : false);
  const showResults =
    isPollClosed ||
    (post.poll && userId
      ? post.poll.options.some((o) => o.voterIds.includes(userId))
      : false);
  const alreadyVoted =
    post.poll && userId
      ? post.poll.options.some((o) => o.voterIds.includes(userId))
      : false;
  const isPostAuthor = userId === authorId;

  const handleVote = () => {
    if (!selectedOptions.length || alreadyVoted || isPollClosed) return;
    votePoll.mutate({ postId: post._id, optionIds: selectedOptions });
  };

  const toggleOption = (oid: string) => {
    if (alreadyVoted || isPollClosed) return;
    if (post.poll?.isMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(oid) ? prev.filter((id) => id !== oid) : [...prev, oid]
      );
    } else {
      setSelectedOptions([oid]);
    }
  };

  const pdfUrls = post.mediaUrls.filter((u) => /\.pdf$/i.test(u));
  const visualUrls = post.mediaUrls.filter((u) => !/\.pdf$/i.test(u));

  const postUrl = `/posts/${post._id}`;

  const viewRef = useViewTracking(post._id, post.tags ?? [], !!userId);

  const navigateToPost = () => router.push(postUrl);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"], [data-interactive], video, .media-gallery')) return;
    navigateToPost();
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${postUrl}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleDownload = (url: string) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Use backend download endpoint when a linked paper exists (avoids CORS issues with CDN)
    const linkedPaperId = post.paperIds?.[0];
    if (linkedPaperId) {
      try {
        await downloadPaperMutation.mutateAsync(linkedPaperId);
        return;
      } catch {
        // Fall through to direct download attempt
      }
    }
    downloadFile(url, getFileName(url));
  };

  // ─── Research Paper Card ─────────────────────────────────────
  if (post.type === 'research_paper') {
    const meta = post.paperMetadata;
    const dateStr = meta?.datePublished
      ? format(new Date(meta.datePublished), 'MMMM yyyy')
      : post.publishedAt
        ? format(new Date(post.publishedAt), 'MMMM yyyy')
        : null;

    // Always show body text if it exists (user's thoughts on the paper)
    const bodyText = post.bodyText || null;
    const bodyIsLong = bodyText && bodyText.length > 300;
    const displayedBody = bodyText
      ? bodyIsLong && !bodyExpanded
        ? bodyText.slice(0, 300) + '…'
        : bodyText
      : null;

    return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        ref={viewRef}
        onClick={handleCardClick}
        className="cursor-pointer overflow-hidden rounded-lg border border-border border-l-4 border-l-primary bg-card transition-colors hover:bg-muted/20"
      >
        {/* ── Post Section: Author's contribution ── */}
        <div className="px-4 pt-3 pb-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={authorAvatar} alt={authorName} />
                <AvatarFallback className="bg-kain-green text-white text-[10px] font-bold">
                  {initials(authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Link
                  href={`/profile/${authorId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-foreground hover:underline"
                >
                  {authorName}
                </Link>
                {orgName && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-primary">{orgName}</span>
                  </>
                )}
                <span>·</span>
                <span>{timeAgo}</span>
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/50">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-lg border border-border">
                  <DropdownMenuItem className="cursor-pointer gap-2 text-[13px]">
                    <Bookmark className="h-4 w-4" /> Save post
                  </DropdownMenuItem>
                  {isPostAuthor && (
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-[13px] text-destructive focus:text-destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete post
                    </DropdownMenuItem>
                  )}
                  {!isPostAuthor && !canModeratePost && (
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-[13px] text-destructive focus:text-destructive"
                      onClick={() => reportPost.mutate(post._id)}
                    >
                      <Flag className="h-4 w-4" /> Report post
                    </DropdownMenuItem>
                  )}
                  {canModeratePost && !isPostAuthor && (
                    <>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 text-[13px] text-orange-600 focus:text-orange-600"
                        onClick={() => setShowAdminHideConfirm(true)}
                      >
                        <EyeOff className="h-4 w-4" />
                        {post.status === 'hidden' ? 'Unhide post' : 'Hide post'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 text-[13px] text-destructive focus:text-destructive"
                        onClick={() => setShowAdminDeleteConfirm(true)}
                      >
                        <ShieldAlert className="h-4 w-4" /> Delete post (Admin)
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Post badge */}
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <FileText className="h-3 w-3" />
              Research Paper
            </span>
          </div>

          {/* Post title */}
          <h3 className="mt-2 text-[18px] font-semibold leading-snug text-foreground">
            {post.title}
          </h3>

          {/* Post body (user's thoughts / discussion) */}
          {displayedBody && (
            <div className="mt-2">
              <p className="text-[15px] leading-relaxed text-foreground/80">
                {displayedBody}
              </p>
              {bodyIsLong && (
                <button
                  onClick={(e) => { e.stopPropagation(); setBodyExpanded((v) => !v); }}
                  className="mt-1 text-[13px] font-medium text-primary hover:underline"
                >
                  {bodyExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${getTagColor(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Paper Section: Research paper details ── */}
        <div className="mx-4 rounded-md border border-border bg-muted/15 p-4 mb-3">
          <div className="flex items-center gap-1.5 mb-3">
            <FileText className="h-3.5 w-3.5 text-primary/60" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Paper Details</span>
          </div>

          {/* Paper research title */}
          {meta?.researchTitle && (
            <h4 className="text-[16px] font-semibold leading-snug text-foreground">
              {meta.researchTitle}
            </h4>
          )}

          {/* Paper authors */}
          {meta?.authors && meta.authors.length > 0 && (
            <div className="mt-1.5">
              <AuthorsDisplay authors={meta.authors} />
            </div>
          )}

          {/* Paper metadata badges row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {meta?.journal && (
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200/60">
                {meta.journal}
              </span>
            )}
            {dateStr && (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {dateStr}
              </span>
            )}
            {meta?.doi && (
              <a
                href={`https://doi.org/${meta.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:underline"
              >
                DOI: {meta.doi}
              </a>
            )}
            {meta?.isbn && (
              <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                ISBN: {meta.isbn}
              </span>
            )}
          </div>

          {/* Abstract */}
          {meta?.abstract && (
            <div className="mt-3 border-t border-border/60 pt-3">
              <h5 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Abstract</h5>
              <p className="text-[14px] leading-relaxed text-foreground/80">{meta.abstract}</p>
            </div>
          )}
        </div>

        {/* Action buttons: Download, View, Copy Link */}
        <div className="mx-4 flex items-center gap-2 border-t border-border pt-3 pb-1">
          {pdfUrls.length > 0 && (
            <button
              onClick={handleDownload(pdfUrls[0])}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
          )}
          {pdfUrls.length > 0 && (
            <a
              href={pdfUrls[0]}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </a>
          )}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <Link2 className="h-3.5 w-3.5" />
            {linkCopied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Engagement stats */}
        {(post.likeCount !== 0 || post.commentCount > 0) && (
          <div className="mx-4 mt-2 flex items-center justify-between border-t border-border pt-2 text-[13px] text-muted-foreground">
            {post.likeCount !== 0 ? (
              <div className="flex items-center gap-1.5">
                {post.likeCount > 0 ? (
                  <ThumbsUp className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className={post.likeCount < 0 ? 'text-destructive' : ''}>{post.likeCount}</span>
              </div>
            ) : (
              <div />
            )}
            {post.commentCount > 0 ? (
              <span className="hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigateToPost(); }}>
                {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
              </span>
            ) : (
              <div />
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="mx-4 mt-1 border-t border-border py-1.5">
          <div className="flex items-center">
            <button
              onClick={(e) => { e.stopPropagation(); userId && canLike && toggleLike.mutate(post._id); }}
              disabled={!userId || !canLike || toggleLike.isPending}
              title={!canLike ? 'You must be a member or follower of this organization' : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition-all duration-150 ${
                !canLike ? 'cursor-not-allowed opacity-50 text-muted-foreground' : liked ? 'text-primary hover:bg-primary/15 hover:shadow-sm' : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground hover:shadow-sm'
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${liked ? 'fill-primary' : ''}`} />
              Like
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); userId && canLike && toggleDislike.mutate(post._id); }}
              disabled={!userId || !canLike || toggleDislike.isPending}
              title={!canLike ? 'You must be a member or follower of this organization' : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition-all duration-150 ${
                !canLike ? 'cursor-not-allowed opacity-50 text-muted-foreground' : disliked ? 'text-destructive hover:bg-destructive/15 hover:shadow-sm' : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground hover:shadow-sm'
              }`}
            >
              <ThumbsDown className={`h-4 w-4 ${disliked ? 'fill-destructive' : ''}`} />
              Dislike
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (canComment) navigateToPost(); }}
              disabled={!canComment}
              title={!canComment ? (orgAccessRole === 'follower' ? 'Followers cannot comment — join the organization to comment' : 'You must be a member of this organization to comment') : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition-all duration-150 ${
                !canComment ? 'cursor-not-allowed opacity-50 text-muted-foreground' : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground hover:shadow-sm'
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              Comment
            </button>
          </div>
        </div>
      </motion.div>

      <DeletePostDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={post.title}
        onConfirm={async () => { await deletePost.mutateAsync(post._id); router.push('/home'); }}
      />
      <AdminModerationDialog
        open={showAdminHideConfirm}
        onOpenChange={setShowAdminHideConfirm}
        title={post.status === 'hidden' ? 'Unhide this post?' : 'Hide this post?'}
        description={post.status === 'hidden'
          ? `This will make "${post.title}" visible to all users again.`
          : `This will hide "${post.title}" from all users. You can unhide it later.`}
        confirmLabel={post.status === 'hidden' ? 'Unhide Post' : 'Hide Post'}
        variant={post.status === 'hidden' ? 'default' : 'warning'}
        showReason={post.status !== 'hidden'}
        onConfirm={async (reason) => { await adminHidePost.mutateAsync({ postId: post._id, reason }); }}
      />
      <AdminModerationDialog
        open={showAdminDeleteConfirm}
        onOpenChange={setShowAdminDeleteConfirm}
        title="Permanently delete this post?"
        description={`This will permanently delete "${post.title}" and all its comments. This action cannot be undone.`}
        confirmLabel="Delete Post"
        variant="destructive"
        showReason
        onConfirm={async (reason) => { await adminDeletePost.mutateAsync({ postId: post._id, reason }); router.push('/home'); }}
      />
    </>
    );
  }

  // ─── Normal Post Card ────────────────────────────────────────
  const isAnnouncement = post.type === 'announcement';

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      ref={viewRef}
      onClick={handleCardClick}
      className={`cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-colors hover:bg-muted/20 ${
        isAnnouncement ? 'border-l-4 border-l-amber-500' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
              {initials(authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profile/${authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[13px] font-semibold text-foreground hover:underline"
              >
                {authorName}
              </Link>
              {orgName && (
                <>
                  <span className="text-[12px] text-muted-foreground">in</span>
                  <span className="text-[13px] font-medium text-primary">{orgName}</span>
                </>
              )}
              <span className="text-[12px] text-muted-foreground">· {timeAgo}</span>
            </div>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/50"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-lg border border-border">
              <DropdownMenuItem className="cursor-pointer gap-2 text-[13px]">
                <Bookmark className="h-4 w-4" /> Save post
              </DropdownMenuItem>
              {isPostAuthor && (
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-[13px] text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete post
                </DropdownMenuItem>
              )}
              {!isPostAuthor && !canModeratePost && (
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-[13px] text-destructive focus:text-destructive"
                  onClick={() => reportPost.mutate(post._id)}
                >
                  <Flag className="h-4 w-4" /> Report post
                </DropdownMenuItem>
              )}
              {canModeratePost && !isPostAuthor && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-[13px] text-orange-600 focus:text-orange-600"
                    onClick={() => setShowAdminHideConfirm(true)}
                  >
                    <EyeOff className="h-4 w-4" />
                    {post.status === 'hidden' ? 'Unhide post' : 'Hide post'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-[13px] text-destructive focus:text-destructive"
                    onClick={() => setShowAdminDeleteConfirm(true)}
                  >
                    <ShieldAlert className="h-4 w-4" /> Delete post (Admin)
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-1 pt-2">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="text-[18px] font-semibold leading-snug text-foreground">
            {post.title}
          </h3>
          <PostTypeBadge type={post.type} />
        </div>

        {post.bodyText && (
          <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/80 line-clamp-3">
            {post.bodyText}
          </p>
        )}
      </div>

      {/* Media Gallery */}
      {visualUrls.length > 0 && (
        <div className="media-gallery mx-4 mt-1.5" data-interactive>
          <MediaGallery urls={visualUrls} />
        </div>
      )}

      {/* PDFs */}
      {pdfUrls.length > 0 && (
        <div className="mx-4 mt-2.5 flex flex-col gap-2">
          {pdfUrls.map((url) => (
            <div
              key={url}
              className="group flex items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-foreground">
                  {getFileName(url)}
                </p>
                <p className="text-[12px] text-muted-foreground">PDF Document</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View
                </a>
                <button
                  onClick={handleDownload(url)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mx-4 mt-2.5 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${getTagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Poll */}
      {post.poll && (
        <div className="mx-4 mt-2.5 rounded-md border border-border bg-muted/10 p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <BarChart3 className="h-5 w-5 text-primary" />
              {post.poll.question}
            </div>
            {isPollClosed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Closed
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {post.poll.options.map((opt) => {
              const pct =
                post.poll!.totalVotes > 0
                  ? Math.round((opt.voteCount / post.poll!.totalVotes) * 100)
                  : 0;
              const isSelected = selectedOptions.includes(opt.optionId);
              const votedForThis = userId
                ? opt.voterIds.includes(userId)
                : false;

              return (
                <button
                  type="button"
                  key={opt.optionId}
                  onClick={(e) => { e.stopPropagation(); toggleOption(opt.optionId); }}
                  disabled={!!showResults || !!isPollClosed}
                  className={`relative flex items-center justify-between overflow-hidden rounded-md border px-4 py-2.5 text-[14px] transition-all ${
                    isSelected || votedForThis
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/30'
                  } ${showResults || isPollClosed ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {showResults && (
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 font-medium text-foreground/80">
                    {votedForThis && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    {opt.text}
                  </span>
                  {showResults && (
                    <span className="relative z-10 flex items-center gap-2 text-[13px]">
                      <span className="font-semibold text-foreground">
                        {pct}%
                      </span>
                      <span className="text-muted-foreground">({opt.voteCount})</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {!showResults && !isPollClosed && selectedOptions.length > 0 && (
            <Button
              size="default"
              className="mt-2.5 rounded-md bg-primary text-[13px] text-primary-foreground hover:bg-primary/90"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleVote(); }}
              disabled={votePoll.isPending}
            >
              Vote
            </Button>
          )}

          <div className="mt-2.5 flex items-center justify-between">
            <p className="text-[13px] text-muted-foreground">
              {post.poll.totalVotes} vote
              {post.poll.totalVotes !== 1 ? 's' : ''}
              {post.poll.isMultiple && ' · Multiple answers'}
            </p>
            {isPostAuthor && !isPollClosed && (
              <button
                onClick={(e) => { e.stopPropagation(); closePoll.mutate(post._id); }}
                disabled={closePoll.isPending}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                <Lock className="h-3.5 w-3.5" />
                Close Poll
              </button>
            )}
          </div>
        </div>
      )}

      {/* Engagement stats */}
      {(post.likeCount !== 0 || post.commentCount > 0) && (
        <div className="mx-4 mt-2 flex items-center justify-between border-t border-border pt-2 text-[13px] text-muted-foreground">
          {post.likeCount !== 0 ? (
            <div className="flex items-center gap-1.5">
              {post.likeCount > 0 ? (
                <ThumbsUp className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className={post.likeCount < 0 ? 'text-destructive' : ''}>{post.likeCount}</span>
            </div>
          ) : (
            <div />
          )}
          {post.commentCount > 0 ? (
            <span
              onClick={(e) => { e.stopPropagation(); navigateToPost(); }}
              className="cursor-pointer hover:underline"
            >
              {post.commentCount} comment
              {post.commentCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="mx-4 mt-1 border-t border-border py-1.5">
        <div className="flex items-center">
          <button
            onClick={(e) => { e.stopPropagation(); userId && canLike && toggleLike.mutate(post._id); }}
            disabled={!userId || !canLike || toggleLike.isPending}
            title={!canLike ? 'You must be a member or follower of this organization' : undefined}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition-all duration-150 ${
              !canLike ? 'cursor-not-allowed opacity-50 text-muted-foreground' : liked
                ? 'text-primary hover:bg-primary/15 hover:shadow-sm'
                : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground hover:shadow-sm'
            }`}
          >
            <ThumbsUp
              className={`h-4 w-4 ${liked ? 'fill-primary' : ''}`}
            />
            Like
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); userId && canLike && toggleDislike.mutate(post._id); }}
            disabled={!userId || !canLike || toggleDislike.isPending}
            title={!canLike ? 'You must be a member or follower of this organization' : undefined}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition-all duration-150 ${
              !canLike ? 'cursor-not-allowed opacity-50 text-muted-foreground' : disliked
                ? 'text-destructive hover:bg-destructive/15 hover:shadow-sm'
                : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground hover:shadow-sm'
            }`}
          >
            <ThumbsDown
              className={`h-4 w-4 ${disliked ? 'fill-destructive' : ''}`}
            />
            Dislike
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (canComment) navigateToPost(); }}
            disabled={!canComment}
            title={!canComment ? (orgAccessRole === 'follower' ? 'Followers cannot comment — join the organization to comment' : 'You must be a member of this organization to comment') : undefined}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition-all duration-150 ${
              !canComment ? 'cursor-not-allowed opacity-50 text-muted-foreground' : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground hover:shadow-sm'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            Comment
          </button>
        </div>
      </div>
    </motion.div>

    <DeletePostDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      title={post.title}
      onConfirm={async () => { await deletePost.mutateAsync(post._id); router.push('/home'); }}
    />
    <AdminModerationDialog
      open={showAdminHideConfirm}
      onOpenChange={setShowAdminHideConfirm}
      title={post.status === 'hidden' ? 'Unhide this post?' : 'Hide this post?'}
      description={post.status === 'hidden'
        ? `This will make "${post.title}" visible to all users again.`
        : `This will hide "${post.title}" from all users. You can unhide it later.`}
      confirmLabel={post.status === 'hidden' ? 'Unhide Post' : 'Hide Post'}
      variant={post.status === 'hidden' ? 'default' : 'warning'}
      showReason={post.status !== 'hidden'}
      onConfirm={async (reason) => { await adminHidePost.mutateAsync({ postId: post._id, reason }); }}
    />
    <AdminModerationDialog
      open={showAdminDeleteConfirm}
      onOpenChange={setShowAdminDeleteConfirm}
      title="Permanently delete this post?"
      description={`This will permanently delete "${post.title}" and all its comments. This action cannot be undone.`}
      confirmLabel="Delete Post"
      variant="destructive"
      showReason
      onConfirm={async (reason) => { await adminDeletePost.mutateAsync({ postId: post._id, reason }); router.push('/home'); }}
    />
    </>
  );
}

// ─── Admin moderation confirmation dialog ─────────────────────────

function AdminModerationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = 'destructive',
  showReason = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'destructive' | 'warning' | 'default';
  showReason?: boolean;
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

  const buttonClass =
    variant === 'destructive'
      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      : variant === 'warning'
        ? 'bg-orange-500 text-white hover:bg-orange-600'
        : 'bg-primary text-primary-foreground hover:bg-primary/90';

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) { setReason(''); } onOpenChange(v); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {showReason && (
          <div className="py-2">
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
              Reason (optional)
            </label>
            <Input
              placeholder="Reason for this action…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-[14px] bg-white border-border/60"
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className={buttonClass}
          >
            {isPending ? 'Processing…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Delete confirmation dialog ──────────────────────────────────

function DeletePostDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this post?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete <strong className="text-foreground">&ldquo;{title}&rdquo;</strong>.
            This will permanently remove the post and all its comments. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Post
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-3.5 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-3.5 w-full mb-1.5" />
      <Skeleton className="h-3.5 w-2/3 mb-3" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-18 rounded-full" />
      </div>
    </div>
  );
}
