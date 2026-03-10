'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { useToggleLike, useTogglePostDislike, useVotePoll, useReportPost, useClosePoll, useDeletePost } from '@/lib/api/posts';
import { useAppSelector } from '@/store/hooks';
import type { Post } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import { MediaGallery } from './media-gallery';

// ─── Tag color system ──────────────────────────────────────────

const TAG_COLORS = [
  'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20',
  'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
  'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-600/20',
  'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-600/20',
  'bg-lime-50 text-lime-700 ring-1 ring-inset ring-lime-600/20',
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

    // Check if all authors fit
    const fullText = authors.join(', ');
    if (ctx.measureText(fullText).width <= containerWidth) {
      setVisibleCount(authors.length);
      return;
    }

    // Find max authors that fit with " et al."
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
    <div ref={containerRef} className="w-full overflow-hidden whitespace-nowrap text-[17px] text-gray-700">
      {visible.map((author, idx) => (
        <span key={idx}>
          <span className="font-medium">{author}</span>
          {idx < visible.length - 1 && <span className="text-gray-400">, </span>}
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
    window.open(url, '_blank');
  }
}

interface PostCardProps {
  post: Post;
  /** User's access level for this post's org. Defaults to 'member' (full access). */
  orgAccessRole?: 'member' | 'follower' | 'none';
}

export function PostCard({ post, orgAccessRole = 'member' }: PostCardProps) {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;

  const toggleLike = useToggleLike();
  const toggleDislike = useTogglePostDislike();
  const votePoll = useVotePoll();
  const reportPost = useReportPost();
  const closePoll = useClosePoll();
  const deletePost = useDeletePost();

  const liked = userId ? post.likedBy.includes(userId) : false;
  const disliked = userId ? post.dislikedBy.includes(userId) : false;

  // Org access restrictions
  const canLike = orgAccessRole === 'member' || orgAccessRole === 'follower';
  const canComment = orgAccessRole === 'member';

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

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

  const handleDownload = (url: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    downloadFile(url, getFileName(url));
  };

  // ─── Research Paper (ResearchGate-style) Card ─────────────────
  if (post.type === 'research_paper') {
    const meta = post.paperMetadata;
    const dateStr = meta?.datePublished
      ? format(new Date(meta.datePublished), 'MMMM yyyy')
      : post.publishedAt
        ? format(new Date(post.publishedAt), 'MMMM yyyy')
        : null;

    return (
      <div
        onClick={handleCardClick}
        className="cursor-pointer overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md"
      >
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500" />

        <div className="px-7 pt-6 pb-3.5">
          {/* Posted by header */}
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={authorAvatar} alt={authorName} />
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-[11px] font-bold text-white">
                  {initials(authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5 text-[16px] text-gray-500">
                <span className="font-medium text-gray-700">{authorName}</span>
                <span>&middot;</span>
                <span>{timeAgo}</span>
                {orgName && (
                  <>
                    <span>&middot;</span>
                    <span className="font-medium text-primary">{orgName}</span>
                  </>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-400 hover:bg-gray-100">
                  <MoreHorizontal className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
                <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg text-[17px]">
                  <Bookmark className="h-5 w-5" /> Save post
                </DropdownMenuItem>
                {isPostAuthor && (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2.5 rounded-lg text-[17px] text-destructive focus:text-destructive"
                    onClick={async () => { await deletePost.mutateAsync(post._id); router.push('/home'); }}
                  >
                    <Trash2 className="h-5 w-5" /> Delete post
                  </DropdownMenuItem>
                )}
                {!isPostAuthor && (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2.5 rounded-lg text-[17px] text-destructive focus:text-destructive"
                    onClick={() => reportPost.mutate(post._id)}
                  >
                    <Flag className="h-5 w-5" /> Report post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges row: Paper Type + Date + DOI + ISBN */}
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-3 py-1.5 text-[15px] font-semibold uppercase tracking-wide text-teal-700">
              <FileText className="h-4 w-4" />
              Research Paper
            </span>
            {dateStr && (
              <span className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-[15px] font-medium text-gray-600">
                {dateStr}
              </span>
            )}
            {meta?.doi && (
              <a
                href={`https://doi.org/${meta.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-[15px] font-medium text-blue-700 hover:underline"
              >
                DOI: {meta.doi}
              </a>
            )}
            {meta?.isbn && (
              <span className="inline-flex items-center rounded-md bg-purple-50 px-3 py-1.5 text-[15px] font-medium text-purple-700">
                ISBN: {meta.isbn}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[25px] font-bold leading-tight text-gray-900">
            {post.title}
          </h3>

          {/* Authors — single line, full width, et al. on overflow */}
          {meta?.authors && meta.authors.length > 0 && (
            <div className="mt-2.5">
              <AuthorsDisplay authors={meta.authors} />
            </div>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center rounded-full px-3.5 py-1 text-[15px] font-medium ${getTagColor(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons row: Download, View, Copy Link */}
          <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-3.5">
            {pdfUrls.length > 0 && (
              <button
                onClick={handleDownload(pdfUrls[0])}
                className="inline-flex items-center gap-2.5 rounded-lg bg-teal-600 px-6 py-3 text-[17px] font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
              >
                <Download className="h-5 w-5" />
                Download PDF
              </button>
            )}
            {pdfUrls.length > 0 && (
              <a
                href={pdfUrls[0]}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-6 py-3 text-[17px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                <Eye className="h-5 w-5" />
                View
              </a>
            )}
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-6 py-3 text-[17px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <Link2 className="h-5 w-5" />
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Abstract */}
          {meta?.abstract && (
            <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50/50 p-5">
              <h4 className="mb-2 text-[15px] font-semibold uppercase tracking-wide text-gray-500">Abstract</h4>
              <p className="text-[17px] leading-relaxed text-gray-700">{meta.abstract}</p>
            </div>
          )}

          {/* Body text (optional additional notes from poster) */}
          {post.bodyText && !meta?.abstract && (
            <p className="mt-3.5 text-[17px] leading-relaxed text-gray-600 line-clamp-4">{post.bodyText}</p>
          )}
        </div>

        {/* Engagement stats */}
        {(post.likeCount !== 0 || post.commentCount > 0) && (
          <div className="mx-7 mt-2.5 flex items-center justify-between text-[16px] text-gray-500">
            {post.likeCount !== 0 ? (
              <div className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${post.likeCount > 0 ? 'bg-primary' : 'bg-red-500'}`}>
                  {post.likeCount > 0 ? (
                    <ThumbsUp className="h-3.5 w-3.5 fill-white" />
                  ) : (
                    <ThumbsDown className="h-3.5 w-3.5 fill-white" />
                  )}
                </div>
                <span className={post.likeCount < 0 ? 'text-red-500' : ''}>{post.likeCount}</span>
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
        <div className="mx-7 mt-2.5 border-t border-gray-100 py-2 pb-3">
          <div className="flex items-center">
            <button
              onClick={(e) => { e.stopPropagation(); userId && canLike && toggleLike.mutate(post._id); }}
              disabled={!userId || !canLike || toggleLike.isPending}
              title={!canLike ? 'You must be a member or follower of this organization' : undefined}
              className={`flex flex-1 items-center justify-center gap-2.5 rounded-lg py-3 text-[17px] font-medium transition-colors ${
                !canLike ? 'cursor-not-allowed opacity-50 text-gray-400' : liked ? 'text-primary' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <ThumbsUp className={`h-6 w-6 ${liked ? 'fill-primary' : ''}`} />
              Like
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); userId && canLike && toggleDislike.mutate(post._id); }}
              disabled={!userId || !canLike || toggleDislike.isPending}
              title={!canLike ? 'You must be a member or follower of this organization' : undefined}
              className={`flex flex-1 items-center justify-center gap-2.5 rounded-lg py-3 text-[17px] font-medium transition-colors ${
                !canLike ? 'cursor-not-allowed opacity-50 text-gray-400' : disliked ? 'text-red-500' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <ThumbsDown className={`h-6 w-6 ${disliked ? 'fill-red-500' : ''}`} />
              Dislike
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (canComment) navigateToPost(); }}
              disabled={!canComment}
              title={!canComment ? (orgAccessRole === 'follower' ? 'Followers cannot comment — join the organization to comment' : 'You must be a member of this organization to comment') : undefined}
              className={`flex flex-1 items-center justify-center gap-2.5 rounded-lg py-3 text-[17px] font-medium transition-colors ${
                !canComment ? 'cursor-not-allowed opacity-50 text-gray-400' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <MessageCircle className="h-6 w-6" />
              Comment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Normal Post Card ────────────────────────────────────────
  return (
    <div
      onClick={handleCardClick}
      className="cursor-pointer overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between px-6 pt-6">
        <div className="flex items-center gap-3.5">
          <Avatar className="h-[50px] w-[50px] ring-2 ring-white shadow-sm">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-[16px] font-bold text-white">
              {initials(authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[19px] font-semibold text-gray-900">{authorName}</span>
              {orgName && (
                <>
                  <span className="text-[16px] text-gray-400">in</span>
                  <span className="text-[17px] font-medium text-primary">{orgName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[16px] text-gray-500">{timeAgo}</span>
              {post.type !== 'post' && (
                <>
                  <span className="text-[14px] text-gray-300">&middot;</span>
                  <span className="rounded-full bg-gray-100 px-3 py-0.5 text-[14px] font-medium capitalize text-gray-500">
                    {post.type.replace('_', ' ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <MoreHorizontal className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
            <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg text-[17px]">
              <Bookmark className="h-5 w-5" /> Save post
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg text-[17px]">
              <EyeOff className="h-5 w-5" /> Hide post
            </DropdownMenuItem>
            {isPostAuthor && (
              <DropdownMenuItem
                className="cursor-pointer gap-2.5 rounded-lg text-[17px] text-destructive focus:text-destructive"
                onClick={async () => { await deletePost.mutateAsync(post._id); router.push('/home'); }}
              >
                <Trash2 className="h-5 w-5" /> Delete post
              </DropdownMenuItem>
            )}
            {!isPostAuthor && (
              <DropdownMenuItem
                className="cursor-pointer gap-2.5 rounded-lg text-[17px] text-destructive focus:text-destructive"
                onClick={() => reportPost.mutate(post._id)}
              >
                <Flag className="h-5 w-5" /> Report post
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Content: Title + Tags + Body ── */}
      <div className="px-6 pb-2.5 pt-3.5">
        <h3 className="text-[21px] font-semibold leading-snug text-gray-900">
          {post.title}
        </h3>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full px-3.5 py-1 text-[15px] font-medium ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {post.bodyText && (
          <p className="mt-2.5 text-[18px] leading-relaxed text-gray-600 line-clamp-4">
            {post.bodyText}
          </p>
        )}
      </div>

      {/* ── Media Gallery (edge-to-edge) ── */}
      {visualUrls.length > 0 && (
        <div className="media-gallery mx-6 mt-1" data-interactive>
          <MediaGallery urls={visualUrls} />
        </div>
      )}

      {/* ── Research Paper PDFs (full width, below gallery) ── */}
      {post.type === 'research_paper' && pdfUrls.length > 0 && (
        <div className="mx-6 mt-3.5 flex flex-col gap-2.5">
          {pdfUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-3.5 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-5 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 transition-colors group-hover:bg-red-100">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-medium text-gray-900">
                  {getFileName(url)}
                </p>
                <p className="text-[15px] text-gray-500">PDF Document</p>
              </div>
              <Download className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-primary" />
            </a>
          ))}
        </div>
      )}

      {/* ── Normal post PDFs (prominent) ── */}
      {post.type !== 'research_paper' && pdfUrls.length > 0 && (
        <div className="mx-6 mt-3.5 flex flex-col gap-2.5">
          {pdfUrls.map((url) => (
            <div
              key={url}
              className="group flex items-center gap-3.5 rounded-xl border-2 border-red-100 bg-gradient-to-r from-red-50/60 to-white p-5 transition-all hover:border-red-200 hover:shadow-sm"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-medium text-gray-900">
                  {getFileName(url)}
                </p>
                <p className="text-[15px] text-gray-500">PDF Document</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[16px] font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <ExternalLink className="h-5 w-5" />
                  View
                </a>
                <button
                  onClick={handleDownload(url)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-[16px] font-medium text-white shadow-sm transition-colors hover:bg-red-700"
                >
                  <Download className="h-5 w-5" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Poll ── */}
      {post.poll && (
        <div className="mx-6 mt-3.5 rounded-xl border border-gray-200 bg-gray-50/40 p-6">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[18px] font-semibold text-gray-900">
              <BarChart3 className="h-6 w-6 text-primary" />
              {post.poll.question}
            </div>
            {isPollClosed && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-[14px] font-medium text-gray-500">
                <Lock className="h-4 w-4" />
                Closed
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
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
                  className={`relative flex items-center justify-between overflow-hidden rounded-xl border px-5 py-3.5 text-[17px] transition-all ${
                    isSelected || votedForThis
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${showResults || isPollClosed ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {showResults && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-xl bg-primary/10 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5 font-medium text-gray-800">
                    {votedForThis && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                    {opt.text}
                  </span>
                  {showResults && (
                    <span className="relative z-10 flex items-center gap-2.5 text-[16px]">
                      <span className="font-semibold text-gray-900">
                        {pct}%
                      </span>
                      <span className="text-gray-500">({opt.voteCount})</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {!showResults && !isPollClosed && selectedOptions.length > 0 && (
            <Button
              size="default"
              className="mt-3.5 rounded-lg text-[16px]"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleVote(); }}
              disabled={votePoll.isPending}
            >
              Vote
            </Button>
          )}

          <div className="mt-3.5 flex items-center justify-between">
            <p className="text-[16px] text-gray-500">
              {post.poll.totalVotes} vote
              {post.poll.totalVotes !== 1 ? 's' : ''}
              {post.poll.isMultiple && ' · Multiple answers'}
            </p>
            {isPostAuthor && !isPollClosed && (
              <button
                onClick={(e) => { e.stopPropagation(); closePoll.mutate(post._id); }}
                disabled={closePoll.isPending}
                className="inline-flex items-center gap-1.5 text-[16px] font-medium text-gray-500 transition-colors hover:text-destructive"
              >
                <Lock className="h-4 w-4" />
                Close Poll
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Engagement stats ── */}
      {(post.likeCount !== 0 || post.commentCount > 0) && (
        <div className="mx-6 mt-3.5 flex items-center justify-between text-[16px] text-gray-500">
          {post.likeCount !== 0 ? (
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${post.likeCount > 0 ? 'bg-primary' : 'bg-red-500'}`}>
                {post.likeCount > 0 ? (
                  <ThumbsUp className="h-3.5 w-3.5 fill-white" />
                ) : (
                  <ThumbsDown className="h-3.5 w-3.5 fill-white" />
                )}
              </div>
              <span className={post.likeCount < 0 ? 'text-red-500' : ''}>{post.likeCount}</span>
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

      {/* ── Action bar ── */}
      <div className="mx-6 mt-2.5 border-t border-gray-100 py-2 pb-3">
        <div className="flex items-center">
          <button
            onClick={(e) => { e.stopPropagation(); userId && canLike && toggleLike.mutate(post._id); }}
            disabled={!userId || !canLike || toggleLike.isPending}
            title={!canLike ? 'You must be a member or follower of this organization' : undefined}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-lg py-3 text-[17px] font-medium transition-colors ${
              !canLike ? 'cursor-not-allowed opacity-50 text-gray-400' : liked
                ? 'text-primary'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ThumbsUp
              className={`h-6 w-6 ${liked ? 'fill-primary' : ''}`}
            />
            Like
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); userId && canLike && toggleDislike.mutate(post._id); }}
            disabled={!userId || !canLike || toggleDislike.isPending}
            title={!canLike ? 'You must be a member or follower of this organization' : undefined}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-lg py-3 text-[17px] font-medium transition-colors ${
              !canLike ? 'cursor-not-allowed opacity-50 text-gray-400' : disliked
                ? 'text-red-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ThumbsDown
              className={`h-6 w-6 ${disliked ? 'fill-red-500' : ''}`}
            />
            Dislike
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (canComment) navigateToPost(); }}
            disabled={!canComment}
            title={!canComment ? (orgAccessRole === 'follower' ? 'Followers cannot comment — join the organization to comment' : 'You must be a member of this organization to comment') : undefined}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-lg py-3 text-[17px] font-medium transition-colors ${
              !canComment ? 'cursor-not-allowed opacity-50 text-gray-400' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <MessageCircle className="h-6 w-6" />
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
