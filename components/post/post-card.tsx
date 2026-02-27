'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ThumbsUp,
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
} from 'lucide-react';
import { useToggleLike, useVotePoll, useReportPost, useClosePoll } from '@/lib/api/posts';
import { useAppSelector } from '@/store/hooks';
import type { Post } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
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

interface PostCardProps {
  post: Post;
  onCommentClick?: (postId: string) => void;
}

export function PostCard({ post, onCommentClick }: PostCardProps) {
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;

  const toggleLike = useToggleLike();
  const votePoll = useVotePoll();
  const reportPost = useReportPost();
  const closePoll = useClosePoll();

  const liked = userId ? post.likedBy.includes(userId) : false;
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

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

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.04)]">
      {/* ── Header ── */}
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-white">
              {initials(authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold text-gray-900">{authorName}</span>
              {orgName && (
                <>
                  <span className="text-xs text-gray-400">in</span>
                  <span className="text-[13px] font-medium text-primary">{orgName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">{timeAgo}</span>
              {post.type !== 'post' && (
                <>
                  <span className="text-[10px] text-gray-300">&middot;</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium capitalize text-gray-500">
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
              className="h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
            <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg">
              <Bookmark className="h-4 w-4" /> Save post
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-lg">
              <EyeOff className="h-4 w-4" /> Hide post
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2.5 rounded-lg text-destructive focus:text-destructive"
              onClick={() => reportPost.mutate(post._id)}
            >
              <Flag className="h-4 w-4" /> Report post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Content: Title + Tags + Body ── */}
      <div className="px-4 pb-2 pt-3">
        <h3 className="text-[15px] font-semibold leading-snug text-gray-900">
          {post.title}
        </h3>

        {/* Tags - directly below title with colors */}
        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {post.bodyText && (
          <p className="mt-2 text-[14px] leading-relaxed text-gray-600 line-clamp-4">
            {post.bodyText}
          </p>
        )}
      </div>

      {/* ── Media Gallery (edge-to-edge, no border) ── */}
      {visualUrls.length > 0 && (
        <div className="mt-1">
          <MediaGallery urls={visualUrls} />
        </div>
      )}

      {/* ── Research Paper PDFs (full width, below gallery) ── */}
      {post.type === 'paper_share' && pdfUrls.length > 0 && (
        <div className="mx-4 mt-3 flex flex-col gap-2">
          {pdfUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-3.5 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 transition-colors group-hover:bg-red-100">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {getFileName(url)}
                </p>
                <p className="text-xs text-gray-500">PDF Document</p>
              </div>
              <Download className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-primary" />
            </a>
          ))}
        </div>
      )}

      {/* ── Normal post PDFs ── */}
      {post.type !== 'paper_share' && pdfUrls.length > 0 && (
        <div className="mx-4 mt-3 flex flex-col gap-2">
          {pdfUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5 transition-all hover:border-gray-200 hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700">
                  {getFileName(url)}
                </p>
              </div>
              <Download className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-gray-600" />
            </a>
          ))}
        </div>
      )}

      {/* ── Poll ── */}
      {post.poll && (
        <div className="mx-4 mt-3 rounded-xl border border-gray-200 bg-gray-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <BarChart3 className="h-4 w-4 text-primary" />
              {post.poll.question}
            </div>
            {isPollClosed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                <Lock className="h-3 w-3" />
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
                  onClick={() => toggleOption(opt.optionId)}
                  disabled={!!showResults || !!isPollClosed}
                  className={`relative flex items-center justify-between overflow-hidden rounded-xl border px-3.5 py-2.5 text-sm transition-all ${
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
                  <span className="relative z-10 flex items-center gap-2 font-medium text-gray-800">
                    {votedForThis && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                    {opt.text}
                  </span>
                  {showResults && (
                    <span className="relative z-10 flex items-center gap-2 text-xs">
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
              size="sm"
              className="mt-3 rounded-lg text-xs"
              onClick={handleVote}
              disabled={votePoll.isPending}
            >
              Vote
            </Button>
          )}

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {post.poll.totalVotes} vote
              {post.poll.totalVotes !== 1 ? 's' : ''}
              {post.poll.isMultiple && ' · Multiple answers'}
            </p>
            {isPostAuthor && !isPollClosed && (
              <button
                onClick={() => closePoll.mutate(post._id)}
                disabled={closePoll.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-destructive"
              >
                <Lock className="h-3 w-3" />
                Close Poll
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Engagement stats (Facebook style) ── */}
      {(post.likeCount > 0 || post.commentCount > 0) && (
        <div className="mx-4 mt-3 flex items-center justify-between text-xs text-gray-500">
          {post.likeCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-white">
                <ThumbsUp className="h-2.5 w-2.5 fill-white" />
              </div>
              <span>{post.likeCount}</span>
            </div>
          ) : (
            <div />
          )}
          {post.commentCount > 0 ? (
            <button
              onClick={() => onCommentClick?.(post._id)}
              className="hover:underline"
            >
              {post.commentCount} comment
              {post.commentCount !== 1 ? 's' : ''}
            </button>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="mx-4 mt-2 border-t border-gray-100 py-1 pb-2">
        <div className="flex items-center">
          <button
            onClick={() => userId && toggleLike.mutate(post._id)}
            disabled={!userId || toggleLike.isPending}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              liked
                ? 'text-primary'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ThumbsUp
              className={`h-[18px] w-[18px] ${liked ? 'fill-primary' : ''}`}
            />
            Like
          </button>
          <button
            onClick={() => onCommentClick?.(post._id)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
